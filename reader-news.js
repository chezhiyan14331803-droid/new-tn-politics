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

const readerTitle = document.getElementById("readerTitle");
const readerDate = document.getElementById("readerDate");
const readerPdf = document.getElementById("readerPdf");
const readerDownload = document.getElementById("readerDownload");

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" }
  );
}

function getGoogleDrivePreviewUrl(url) {
  const match =
    url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (!match) return url;

  return `https://drive.google.com/file/d/${match[1]}/preview`;
}

async function loadNews() {
  try {
    const newsId = new URLSearchParams(window.location.search).get("id");
    let news;

    if (newsId) {
      const newsDocument = await getDoc(doc(db, "news", newsId));

      if (!newsDocument.exists()) {
        throw new Error("News not found");
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
        throw new Error("No news published yet");
      }

      news = latestNews.docs[0].data();
    }

    readerTitle.textContent = news.title;
    readerDate.textContent = formatDate(news.publicationDate);
    readerPdf.src = getGoogleDrivePreviewUrl(news.pdfUrl);
    readerDownload.href = news.pdfUrl;
  } catch (error) {
    readerTitle.textContent = "News is not available";
    readerDate.textContent = "Please return later.";
    readerPdf.style.display = "none";
    readerDownload.style.display = "none";
  }
}

loadNews();