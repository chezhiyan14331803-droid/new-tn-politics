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
   BUTTON ACTIONS & EVENT LISTENERS
========================================= */

// 1. Share Functionality
function setupSharing() {
  const articleUrl = window.location.href;

  // Global Share Function (for inline onclick="shareNews()")
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

  // WhatsApp Button
  if (whatsappShareBtn) {
    whatsappShareBtn.addEventListener("click", () => {
      const message = encodeURIComponent(`📰 *${currentArticleTitle}*\n\nRead more here: ${articleUrl}`);
      window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank");
    });
  }

  // Native Share Button
  if (nativeShareBtn) {
    nativeShareBtn.addEventListener("click", () => {
      window.shareNews();
    });
  }
}

// 2. Text-to-Speech (Audio)
function setupAudioPlayer() {
  if (!audioNewsBtn) return;

  if (!("speechSynthesis" in window)) {
    audioNewsBtn.style.display = "none";
    return;
  }

  audioNewsBtn.addEventListener("click", () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      audioNewsBtn.innerHTML = "🔊 Listen to News";
      return;
    }

    const textToRead = `${currentArticleTitle}. ${currentArticleText}`;
    if (!textToRead.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "en-IN";
    utterance.rate = 1.0;

    utterance.onend = () => {
      isSpeaking = false;
      audioNewsBtn.innerHTML = "🔊 Listen to News";
    };

    utterance.onerror = () => {
      isSpeaking = false;
      audioNewsBtn.innerHTML = "🔊 Listen to News";
    };

    window.speechSynthesis.cancel(); // Stop any ongoing speech
    window.speechSynthesis.speak(utterance);
    isSpeaking = true;
    audioNewsBtn.innerHTML = "⏹️ Stop Listening";
  });
}

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
    currentArticleTitle = data.title || "Untitled Article";
    currentArticleText = data.description || data.content || data.body || "";

    // 1. Title
    if (readerTitle) {
      readerTitle.textContent = currentArticleTitle;
      document.title = `${currentArticleTitle} | Daily News`;
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

    // Initialize button listeners after loading content
    setupSharing();
    setupAudioPlayer();

  } catch (error) {
    console.error("Error loading reader article:", error);
    if (readerTitle) readerTitle.textContent = "Error Loading Article";
    if (readerDescription) readerDescription.textContent = "Failed to load article details. Please refresh and try again.";
  }
}

loadArticle();