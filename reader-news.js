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

    // 1. Title
    if (readerTitle) {
      readerTitle.textContent = data.title || "Untitled Article";
      document.title = `${data.title || "News Article"} | Daily News`;
    }

    // 2. Date & Source Meta
    if (readerDate) {
      const formattedDate = formatDate(data);
      const sourceTag = data.source ? ` • 📰 Source: ${data.source}` : "";
      readerDate.textContent = `📅 ${formattedDate}${sourceTag}`;
    }

    // 3. Render Body Content or PDF Viewer
    if (type === "automatic") {
      // Hide PDF Viewer and PDF Action Buttons for web articles
      if (pdfContainer) pdfContainer.style.display = "none";
      if (readerActions) readerActions.style.display = "none";

      if (readerDescription) {
        readerDescription.style.display = "block";

        const imageHtml = data.imageUrl
          ? `<img src="${data.imageUrl}" alt="${data.title || 'News Image'}" style="width:100%; max-height:450px; object-fit:cover; border-radius:12px; margin-bottom:20px;" onerror="this.style.display='none'" />`
          : "";

        const textContent = data.description || data.content || data.body || "No detailed description available for this headline.";

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
      // PDF News mode
      if (readerDescription) readerDescription.style.display = "none";

      if (pdfContainer) pdfContainer.style.display = "block";
      if (readerActions) readerActions.style.display = "flex";

      if (readerPdf) readerPdf.src = data.pdfUrl || "";
      if (readerDownload) readerDownload.href = data.pdfUrl || "#";
    }

  } catch (error) {
    console.error("Error loading reader article:", error);
    if (readerTitle) readerTitle.textContent = "Error Loading Article";
    if (readerDescription) readerDescription.textContent = "Failed to load article details. Please refresh and try again.";
  }
}

loadArticle();