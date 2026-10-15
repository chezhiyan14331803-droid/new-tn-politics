import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

/* =========================================
   ELEMENTS
========================================= */

const readerTitle = document.getElementById("readerTitle");
const readerDate = document.getElementById("readerDate");
const readerDescription = document.getElementById("readerDescription");
const readerPdf = document.getElementById("readerPdf");
const pdfContainer = document.querySelector(".pdf-container");
const readerActions = document.querySelector(".reader-actions");
const readerDownload = document.getElementById("readerDownload");

// Engagement buttons
const whatsappShareBtn = document.getElementById("whatsappShareBtn");
const nativeShareBtn = document.getElementById("nativeShareBtn");
const audioNewsBtn = document.getElementById("audioNewsBtn");

let currentArticleTitle = "";
let currentArticleText = "";
let isSpeaking = false;

/* =========================================
   HELPERS & DATE PARSING
========================================= */

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get("id"),
    type: params.get("type") || "pdf"
  };
}

function parseArticleDate(data) {
  if (!data) return "";

  const rawDate = data.updatedAt || data.savedAt || data.publishedAt || data.publicationDate;
  if (!rawDate) return "";

  if (typeof rawDate.toMillis === "function") return new Date(rawDate.toMillis());
  if (typeof rawDate.toDate === "function") return rawDate.toDate();
  if (rawDate.seconds) return new Date(rawDate.seconds * 1000);

  const parsed = new Date(rawDate);
  return isNaN(parsed.getTime()) ? String(rawDate) : parsed;
}

function formatDate(data) {
  try {
    const date = parseArticleDate(data);
    if (!date) return "";
    if (typeof date === "string") return date;

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch (e) {
    return "";
  }
}

/* =========================================
   DYNAMIC OPEN GRAPH META TAG UPDATER
========================================= */

function updateSocialMetaTags(title, description, imageUrl, articleUrl) {
  // Page Title
  document.title = `${title} | Daily News Updates`;

  // OpenGraph Meta Elements
  const ogTitle = document.getElementById("ogTitle") || document.querySelector('meta[property="og:title"]');
  const ogDesc = document.getElementById("ogDescription") || document.querySelector('meta[property="og:description"]');
  const ogImg = document.getElementById("ogImage") || document.querySelector('meta[property="og:image"]');
  const ogUrl = document.getElementById("ogUrl") || document.querySelector('meta[property="og:url"]');

  if (ogTitle) ogTitle.setAttribute("content", title);
  if (ogDesc) ogDesc.setAttribute("content", description || "Read the latest news update.");
  if (ogImg && imageUrl) ogImg.setAttribute("content", imageUrl);
  if (ogUrl) ogUrl.setAttribute("content", articleUrl);

  // Twitter Meta Elements
  const twTitle = document.getElementById("twTitle") || document.querySelector('meta[name="twitter:title"]');
  const twDesc = document.getElementById("twDescription") || document.querySelector('meta[name="twitter:description"]');
  const twImg = document.getElementById("twImage") || document.querySelector('meta[name="twitter:image"]');

  if (twTitle) twTitle.setAttribute("content", title);
  if (twDesc) twDesc.setAttribute("content", description || "Read the latest news update.");
  if (twImg && imageUrl) twImg.setAttribute("content", imageUrl);
}

/* =========================================
   BUTTON ACTIONS & EVENT LISTENERS
========================================= */

// Share Functionality
function setupSharing() {
  const articleUrl = window.location.href;

  window.shareNews = function () {
    if (navigator.share) {
      navigator.share({
        title: currentArticleTitle || document.title,
        text: currentArticleTitle,
        url: articleUrl
      }).catch(err => console.log("Share canceled:", err));
    } else {
      navigator.clipboard.writeText(articleUrl).then(() => {
        alert("Article link copied to clipboard!");
      });
    }
  };

  if (whatsappShareBtn) {
    whatsappShareBtn.addEventListener("click", () => {
      const message = encodeURIComponent(`📰 *${currentArticleTitle}*\n\nRead more here: ${articleUrl}`);
      window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank");
    });
  }

  if (nativeShareBtn) {
    nativeShareBtn.addEventListener("click", () => {
      window.shareNews();
    });
  }
}

/* =========================================
   VOICE NEWS (TEXT-TO-SPEECH) CONTROLLER
========================================= */

let synth = window.speechSynthesis;
let utterance = null;
let currentSpeed = 1.0;
const speeds = [1.0, 1.25, 1.5, 0.8];
let speedIndex = 0;

function updateTTSUI(isPlayingState, statusMessage) {
  const playBtn = document.getElementById("ttsPlayBtn");
  const statusText = document.getElementById("ttsStatus");

  if (playBtn) {
    playBtn.textContent = isPlayingState ? "⏹️" : "▶️";
  }

  if (statusText) {
    statusText.textContent = statusMessage;
  }
}

function getBestVoice(langCode) {
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) return null;

  let matchedVoice = voices.find(v => v.lang === langCode || v.lang.replace('_', '-').startsWith(langCode.slice(0, 2)));
  return matchedVoice || voices[0];
}

if (typeof speechSynthesis !== "undefined" && speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => {
    if (synth) synth.getVoices();
  };
}

function playSpeech() {
  const title = currentArticleTitle || readerTitle?.innerText || "";
  const body = currentArticleText || readerDescription?.innerText || "";
  const fullText = `${title}. ${body}`.trim();

  if (!fullText) {
    updateTTSUI(false, "No article text available to read");
    return;
  }

  // Always cancel any existing playback before starting new utterance
  synth.cancel();

  utterance = new SpeechSynthesisUtterance(fullText);

  // Set speed directly on the new Utterance instance
  utterance.rate = currentSpeed;

  // Auto-detect language (Tamil vs English)
  const containsTamil = /[\u0B80-\u0BFF]/.test(fullText);
  const targetLang = containsTamil ? "ta-IN" : "en-IN";
  utterance.lang = targetLang;

  const voice = getBestVoice(targetLang);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => {
    updateTTSUI(true, `Reading news aloud (${currentSpeed}x)...`);
  };

  utterance.onend = () => {
    updateTTSUI(false, "Finished listening");
  };

  utterance.onerror = (event) => {
    if (event.error === "interrupted" || event.error === "canceled") {
      return;
    }
    console.warn("Speech synthesis error:", event);
    updateTTSUI(false, "Audio unavailable for this article");
  };

  synth.speak(utterance);
}

function toggleVoiceNews() {
  if (!("speechSynthesis" in window)) {
    alert("Text-to-Speech is not supported in your browser.");
    return;
  }

  if (synth.speaking || synth.pending) {
    synth.cancel();
    updateTTSUI(false, "Stopped. Tap play to listen");
    return;
  }

  playSpeech();
}
window.toggleVoiceNews = toggleVoiceNews;

function changeSpeed() {
  speedIndex = (speedIndex + 1) % speeds.length;
  currentSpeed = speeds[speedIndex];

  const speedBtn = document.getElementById("ttsSpeedBtn");
  if (speedBtn) {
    speedBtn.textContent = `${currentSpeed}x`;
  }

  // If currently playing, restart playback immediately with the new speed
  if (synth && (synth.speaking || synth.pending)) {
    synth.cancel();
    setTimeout(() => {
      playSpeech();
    }, 150);
  }
}
window.changeSpeed = changeSpeed;

window.addEventListener("beforeunload", () => {
  if (synth) synth.cancel();
});
/* =========================================
   LOAD ARTICLE
========================================= */

async function loadArticle() {
  const { id, type } = getUrlParams();

  if (!id) {
    if (readerTitle) readerTitle.textContent = "Article Not Found";
    if (readerDescription) readerDescription.textContent = "No article ID provided in URL.";
    return;
  }

  try {
    const collectionName = type === "automatic" ? "automaticNews" : "news";
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      if (readerTitle) readerTitle.textContent = "Article Not Found";
      if (readerDescription) readerDescription.textContent = "The requested article could not be found in Firestore.";
      return;
    }

    const data = docSnap.data();

    // Assign module-scoped variables
    currentArticleTitle = data.title || "Untitled Article";
    currentArticleText = data.description || data.content || data.body || "";
    const currentImageUrl = data.imageUrl || "https://new-tn-politics.web.app/logo.png";
    const currentArticleUrl = window.location.href;

    // Update Social OpenGraph & Twitter Meta Tags
    updateSocialMetaTags(currentArticleTitle, currentArticleText, currentImageUrl, currentArticleUrl);

    // 1. Title
    if (readerTitle) {
      readerTitle.textContent = currentArticleTitle;
    }

    // 2. Date & Source Meta
    if (readerDate) {
      const formattedDate = formatDate(data);
      const sourceTag = data.source ? ` • 📰 Source: ${data.source}` : "";
      readerDate.textContent = `📅 ${formattedDate}${sourceTag}`;
    }

    // 3. Render Content Body or PDF Viewer
    if (type === "automatic") {
      if (pdfContainer) pdfContainer.style.display = "none";
      if (readerActions) readerActions.style.display = "none";

      if (readerDescription) {
        readerDescription.style.display = "block";

        const imageHtml = data.imageUrl
          ? `<img src="${data.imageUrl}" alt="${currentArticleTitle}" style="width:100%; max-height:450px; object-fit:cover; border-radius:12px; margin-bottom:20px;" onerror="this.style.display='none'" />`
          : "";

        const textContent = currentArticleText || "No detailed description available for this headline.";

        const sourceBtn = data.sourceUrl
          ? `<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee;">
               <a href="${data.sourceUrl}" target="_blank" rel="noopener" style="display:inline-block; padding:12px 20px; background:#e63946; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">
                 Read Full Article on ${data.source || 'Publisher Webpage'} ↗
               </a>
             </div>`
          : "";

        readerDescription.innerHTML = `
          ${imageHtml}
          <div style="font-size: 1.15rem; line-height: 1.8; color: #2b2b2b;">
            <p>${textContent}</p>
          </div>
          ${sourceBtn}
        `;
      }
    } else {
      // PDF mode
      if (readerDescription) readerDescription.style.display = "none";

      if (pdfContainer) pdfContainer.style.display = "block";
      if (readerActions) readerActions.style.display = "flex";

      if (readerPdf) readerPdf.src = data.pdfUrl || "";
      if (readerDownload) readerDownload.href = data.pdfUrl || "#";
    }

    // Initialize sharing after loading content
    setupSharing();

  } catch (error) {
    console.error("Error loading reader article:", error);
    if (readerTitle) readerTitle.textContent = "Error Loading Article";
    if (readerDescription) readerDescription.textContent = "Failed to load article details. Please refresh and try again.";
  }
}

loadArticle();