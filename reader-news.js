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

const readerTitle =
  document.getElementById("readerTitle");

const readerDate =
  document.getElementById("readerDate");

const readerPdf =
  document.getElementById("readerPdf");

const readerDownload =
  document.getElementById("readerDownload");

const readerHeading =
  document.querySelector(".reader-heading");

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
   AUTOMATIC NEWS
========================================= */

async function loadAutomaticNews(newsId) {

  const newsDocument =
    await getDoc(
      doc(db, "automaticNews", newsId)
    );

  if (!newsDocument.exists()) {
    throw new Error("Automatic news not found");
  }

  const news = newsDocument.data();

  readerTitle.textContent =
    news.title || "Latest News";

  readerDate.textContent =
    formatDate(news.publishedAt);

  /*
     Hide PDF viewer because automatic
     news is an online article.
  */

  readerPdf.style.display = "none";

const pdfContainer =
  document.querySelector(".pdf-container");

if (pdfContainer) {
  pdfContainer.style.setProperty(
    "display",
    "none",
    "important"
  );
}

  readerDownload.textContent =
    "↗ Open Original News";

  readerDownload.href =
    news.sourceUrl || "#";

  readerDownload.target = "_blank";

  readerDownload.style.display =
    news.sourceUrl ? "inline-flex" : "none";


  /*
     Add article description.
  */

  let description =
    document.getElementById("readerDescription");

  if (!description) {

    description =
      document.createElement("div");

    description.id =
      "readerDescription";

    description.className =
      "reader-description";

    readerHeading.appendChild(
      description
    );
  }

  description.textContent =
    news.description ||
    "Read the latest news from Daily News Updates.";


  /*
     Add category.
  */

  let category =
    document.getElementById("readerCategory");

  if (!category) {

    category =
      document.createElement("p");

    category.id =
      "readerCategory";

    category.className =
      "reader-category";

    readerHeading.insertBefore(
      category,
      readerTitle
    );
  }

  category.textContent =
    news.category
      ? news.category
          .split("-")
          .map(
            word =>
              word.charAt(0).toUpperCase() +
              word.slice(1)
          )
          .join(" ")
      : "News";
}


/* =========================================
   PDF NEWS
========================================= */

async function loadPdfNews(newsId) {

  let news;

  if (newsId) {

    const newsDocument =
      await getDoc(
        doc(db, "news", newsId)
      );

    if (!newsDocument.exists()) {
      throw new Error("News not found");
    }

    news =
      newsDocument.data();

  } else {

    const latestNews =
      await getDocs(
        query(
          collection(db, "news"),
          orderBy(
            "publicationDate",
            "desc"
          ),
          limit(1)
        )
      );

    if (latestNews.empty) {
      throw new Error(
        "No news published yet"
      );
    }

    news =
      latestNews.docs[0].data();
  }


  readerTitle.textContent =
    news.title;

  readerDate.textContent =
    formatDate(
      news.publicationDate
    );


  readerPdf.src =
    getGoogleDrivePreviewUrl(
      news.pdfUrl
    );

  readerPdf.style.display =
    "block";


  // Show PDF container for PDF news
  const pdfContainer =
    document.querySelector(".pdf-container");

  if (pdfContainer) {
    pdfContainer.style.display = "block";
  }


  readerDownload.href =
    news.pdfUrl;

  readerDownload.textContent =
    "↓ Download PDF";

  readerDownload.target =
    "_blank";

  readerDownload.style.display =
    "inline-flex";
}

/* =========================================
   MAIN
========================================= */

async function loadNews() {

  try {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const newsId =
      params.get("id");

    const type =
      params.get("type");


    if (type === "automatic" && newsId) {

      await loadAutomaticNews(
        newsId
      );

    } else {

      await loadPdfNews(
        newsId
      );

    }

  } catch (error) {

    console.error(
      "Reader error:",
      error
    );

    readerTitle.textContent =
      "News is not available";

    readerDate.textContent =
      "Please return later.";

    readerPdf.style.display =
      "none";

const pdfContainer =
  document.querySelector(".pdf-container");

if (pdfContainer) {
  pdfContainer.style.display = "none";
}

    readerDownload.style.display =
      "none";
  }
}

loadNews();