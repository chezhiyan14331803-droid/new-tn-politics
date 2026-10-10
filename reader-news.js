import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

/* =========================================
   ELEMENT SELECTORS
========================================= */
const readerTitle = document.getElementById("readerTitle");
const readerDate = document.getElementById("readerDate");
const readerPdf = document.getElementById("readerPdf");
const readerDownload = document.getElementById("readerDownload");
const readerHeading = document.querySelector(".reader-heading");

/* =========================================
   UTILITY FUNCTIONS
========================================= */
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getGoogleDrivePreviewUrl(url) {
  if (!url) return "";
  const match =
    url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (!match) return url;
  return `https://drive.google.com/file/d/${match[1]}/preview`;
}

/* =========================================
   WHATSAPP & WEB SHARE INTEGRATION
========================================= */
function setupSharing(title, description) {
  const whatsappBtn = document.getElementById("whatsappShareBtn");
  const nativeBtn = document.getElementById("nativeShareBtn");

  const currentUrl = window.location.href;
  const shareText = `*${title}*\n\n${description ? description.slice(0, 100) + '...' : ''}\n\nRead more on New TN Politics: ${currentUrl}`;

  if (whatsappBtn) {
    whatsappBtn.onclick = () => {
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, "_blank");
    };
  }

  if (nativeBtn) {
    nativeBtn.onclick = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: description,
            url: currentUrl
          });
        } catch (err) {
          console.warn("Share cancelled or failed:", err);
        }
      } else {
        navigator.clipboard.writeText(currentUrl);
        alert("Article link copied to clipboard!");
      }
    };
  }
}

/* =========================================
   TEXT-TO-SPEECH (AUDIO READER)
========================================= */
let speechInstance = null;

function setupAudioReader(title, description) {
  const audioBtn = document.getElementById("audioNewsBtn");
  if (!audioBtn) return;

  if (!("speechSynthesis" in window)) {
    audioBtn.style.display = "none";
    return;
  }

  audioBtn.onclick = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      audioBtn.textContent = "🔊 Listen to News";
      audioBtn.classList.remove("speaking");
      return;
    }

    const textToRead = `${title}. ${description || ''}`;
    speechInstance = new SpeechSynthesisUtterance(textToRead);
    speechInstance.lang = "en-IN";
    speechInstance.rate = 0.95;

    speechInstance.onend = () => {
      audioBtn.textContent = "🔊 Listen to News";
      audioBtn.classList.remove("speaking");
    };

    speechInstance.onerror = () => {
      audioBtn.textContent = "🔊 Listen to News";
      audioBtn.classList.remove("speaking");
    };

    window.speechSynthesis.speak(speechInstance);
    audioBtn.textContent = "⏹ Stop Listening";
    audioBtn.classList.add("speaking");
  };
}

/* =========================================
   AUTOMATIC NEWS LOADER
========================================= */
async function loadAutomaticNews(newsId) {
  const newsDocument = await getDoc(doc(db, "automaticNews", newsId));

  if (!newsDocument.exists()) {
    throw new Error("Automatic news item not found");
  }

  const news = newsDocument.data();

  if (readerTitle) readerTitle.textContent = news.title || "Latest News";
  if (readerDate) readerDate.textContent = formatDate(news.publishedAt || news.savedAt);

  if (readerPdf && readerPdf.parentElement) {
    readerPdf.parentElement.style.display = "none";
  }

  if (readerDownload) {
    readerDownload.textContent = "↗ Open Original Source";
    readerDownload.href = news.sourceUrl || "#";
    readerDownload.target = "_blank";
    readerDownload.style.display = news.sourceUrl ? "inline-flex" : "none";
  }

  let description = document.getElementById("readerDescription");
  if (!description && readerHeading) {
    description = document.createElement("div");
    description.id = "readerDescription";
    description.className = "reader-description";
    readerHeading.appendChild(description);
  }
  if (description) {
    description.textContent = news.description || "Read the latest update from New TN Politics.";
  }

  setupSharing(news.title || "Latest News", news.description || "");
  setupAudioReader(news.title || "Latest News", news.description || "");
}

/* =========================================
   PDF NEWS LOADER
========================================= */
async function loadPdfNews(newsId) {
  let news;

  if (newsId) {
    const newsDocument = await getDoc(doc(db, "news", newsId));
    if (!newsDocument.exists()) {
      throw new Error("PDF News not found");
    }
    news = newsDocument.data();
  } else {
    const latestNews = await getDocs(
      query(
        collection(db, "news"),
        orderBy("publicationDate", "desc"),
        limit(1)
      )
    );

    if (latestNews.empty) {
      throw new Error("No PDF news published yet");
    }
    news = latestNews.docs[0].data();
  }

  if (readerTitle) readerTitle.textContent = news.title || "Daily News PDF";
  if (readerDate) readerDate.textContent = formatDate(news.publicationDate);

  if (readerPdf) {
    if (readerPdf.parentElement) readerPdf.parentElement.style.display = "block";
    readerPdf.style.display = "block";
    readerPdf.src = getGoogleDrivePreviewUrl(news.pdfUrl);
  }

  if (readerDownload) {
    readerDownload.textContent = "↓ Download PDF";
    readerDownload.href = news.pdfUrl || "#";
    readerDownload.target = "_blank";
    readerDownload.style.display = news.pdfUrl ? "inline-flex" : "none";
  }

  setupSharing(news.title || "Daily News PDF", news.description || "");
  setupAudioReader(news.title || "Daily News PDF", news.description || "");
}

/* =========================================
   MAIN ROUTER
========================================= */
async function loadNews() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = urlParams.get("id");
    const newsType = urlParams.get("type");

    if (newsType === "automatic" && newsId) {
      await loadAutomaticNews(newsId);
    } else {
      await loadPdfNews(newsId);
    }
  } catch (error) {
    console.error("Reader Error:", error);
    if (readerTitle) readerTitle.textContent = "News article is unavailable";
    if (readerDate) readerDate.textContent = "Please return to the homepage or try again later.";

    if (readerPdf && readerPdf.parentElement) {
      readerPdf.parentElement.style.display = "none";
    }
    if (readerDownload) {
      readerDownload.style.display = "none";
    }
  }
}

loadNews();