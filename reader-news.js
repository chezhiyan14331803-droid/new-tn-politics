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
   ELEMENTS
========================================= */

const readerTitle =
  document.getElementById("readerTitle");

const readerDate =
  document.getElementById("readerDate");

const readerSource =
  document.getElementById("readerSource");

const readerCategory =
  document.getElementById("readerCategory");

const readerDescription =
  document.getElementById("readerDescription");

const readerPdf =
  document.getElementById("readerPdf");

const readerDownload =
  document.getElementById("readerDownload");

const readerImage =
  document.getElementById("readerImage");

const readerImageContainer =
  document.getElementById(
    "readerImageContainer"
  );

const readerStatus =
  document.getElementById("readerStatus");

const pdfContainer =
  document.querySelector(
    ".pdf-container"
  );


/* =========================================
   FORMAT DATE
========================================= */

function formatDate(dateString) {

  if (!dateString) {
    return "";
  }

  const date =
    new Date(dateString);

  if (isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}


/* =========================================
   CATEGORY FORMAT
========================================= */

function formatCategory(category) {

  if (!category) {
    return "News";
  }

  return category
    .split("-")
    .map(word => {

      return (
        word.charAt(0).toUpperCase() +
        word.slice(1)
      );

    })
    .join(" ");
}


/* =========================================
   GOOGLE DRIVE PDF PREVIEW
========================================= */

function getGoogleDrivePreviewUrl(url) {

  if (!url) {
    return "";
  }

  const match =
    url.match(
      /\/d\/([a-zA-Z0-9_-]+)/
    ) ||
    url.match(
      /[?&]id=([a-zA-Z0-9_-]+)/
    );

  if (!match) {
    return url;
  }

  return (
    `https://drive.google.com/file/d/` +
    `${match[1]}/preview`
  );
}


/* =========================================
   RESET READER
========================================= */

function resetReader() {

  if (readerImageContainer) {
    readerImageContainer.style.display =
      "none";
  }

  if (readerImage) {
    readerImage.src = "";
  }

  if (pdfContainer) {
    pdfContainer.style.display =
      "none";
  }

  if (readerPdf) {
    readerPdf.src = "";
    readerPdf.style.display =
      "none";
  }

  if (readerDownload) {
    readerDownload.href = "#";
    readerDownload.style.display =
      "none";
  }

  if (readerSource) {
    readerSource.textContent = "";
  }

  if (readerDescription) {
    readerDescription.textContent =
      "";
  }

  if (readerStatus) {
    readerStatus.textContent =
      "";
  }
}


/* =========================================
   AUTOMATIC NEWS
========================================= */

async function loadAutomaticNews(
  newsId
) {

  const newsDocument =
    await getDoc(
      doc(
        db,
        "automaticNews",
        newsId
      )
    );


  if (!newsDocument.exists()) {

    throw new Error(
      "Automatic news not found"
    );

  }


  const news =
    newsDocument.data();


  /* TITLE */

  readerTitle.textContent =
    news.title ||
    "Latest News";


  /* DATE */

  readerDate.textContent =
    news.publishedAt
      ? formatDate(
          news.publishedAt
        )
      : "Date unavailable";


  /* SOURCE */

  if (readerSource) {

    readerSource.textContent =
      news.source
        ? `Source: ${news.source}`
        : "";

  }


  /* CATEGORY */

  if (readerCategory) {

    readerCategory.textContent =
      formatCategory(
        news.category
      );

  }


  /* IMAGE */

  if (
    news.imageUrl &&
    readerImage &&
    readerImageContainer
  ) {

    readerImage.src =
      news.imageUrl;

    readerImage.alt =
      news.title ||
      "News image";

    readerImageContainer.style.display =
      "block";

  }


  /* DESCRIPTION */

  if (readerDescription) {

    readerDescription.textContent =
      news.description ||
      "Read the latest news from Daily News Updates.";

  }


  /* HIDE PDF */

  if (pdfContainer) {

    pdfContainer.style.display =
      "none";

  }


  if (readerPdf) {

    readerPdf.style.display =
      "none";

    readerPdf.src = "";

  }


  /* ORIGINAL NEWS BUTTON */

  if (
    news.sourceUrl &&
    readerDownload
  ) {

    readerDownload.href =
      news.sourceUrl;

    readerDownload.textContent =
      "↗ Open Original News";

    readerDownload.target =
      "_blank";

    readerDownload.rel =
      "noopener noreferrer";

    readerDownload.style.display =
      "inline-flex";

  }


  if (readerStatus) {

    readerStatus.textContent =
      "You are reading an automatic news update.";

  }
}


/* =========================================
   PDF NEWS
========================================= */

async function loadPdfNews(
  newsId
) {

  let news;


  /* =====================================
     LOAD SPECIFIC PDF
  ===================================== */

  if (newsId) {

    const newsDocument =
      await getDoc(
        doc(
          db,
          "news",
          newsId
        )
      );


    if (!newsDocument.exists()) {

      throw new Error(
        "News not found"
      );

    }


    news =
      newsDocument.data();

  }


  /* =====================================
     LOAD LATEST PDF
  ===================================== */

  else {

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


  /* TITLE */

  readerTitle.textContent =
    news.title ||
    "Latest News";


  /* DATE */

  readerDate.textContent =
    formatDate(
      news.publicationDate
    );


  /* SOURCE */

  if (readerSource) {

    readerSource.textContent =
      "Published News";

  }


  /* CATEGORY */

  if (readerCategory) {

    readerCategory.textContent =
      "Daily News";

  }


  /* DESCRIPTION */

  if (readerDescription) {

    readerDescription.textContent =
      "Read the published news document below.";

  }


  /* HIDE IMAGE */

  if (readerImageContainer) {

    readerImageContainer.style.display =
      "none";

  }


  /* PDF */

  if (
    news.pdfUrl &&
    readerPdf &&
    pdfContainer
  ) {

    readerPdf.src =
      getGoogleDrivePreviewUrl(
        news.pdfUrl
      );

    readerPdf.style.display =
      "block";

    pdfContainer.style.display =
      "block";

  }


  /* DOWNLOAD */

  if (
    news.pdfUrl &&
    readerDownload
  ) {

    readerDownload.href =
      news.pdfUrl;

    readerDownload.textContent =
      "↓ Download PDF";

    readerDownload.target =
      "_blank";

    readerDownload.rel =
      "noopener noreferrer";

    readerDownload.style.display =
      "inline-flex";

  }


  if (readerStatus) {

    readerStatus.textContent =
      "Published PDF news";

  }
}


/* =========================================
   MAIN
========================================= */

async function loadNews() {

  try {

    resetReader();


    const params =
      new URLSearchParams(
        window.location.search
      );


    const newsId =
      params.get("id");


    const type =
      params.get("type");


    /* =====================================
       AUTOMATIC NEWS
    ===================================== */

    if (
      type === "automatic" &&
      newsId
    ) {

      await loadAutomaticNews(
        newsId
      );

    }


    /* =====================================
       PDF NEWS
    ===================================== */

    else {

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


    if (readerCategory) {

      readerCategory.textContent =
        "Error";

    }


    if (readerDescription) {

      readerDescription.textContent =
        "We could not load this news article. Please return to the homepage and try again.";

    }


    if (readerPdf) {

      readerPdf.style.display =
        "none";

    }


    if (pdfContainer) {

      pdfContainer.style.display =
        "none";

    }


    if (readerDownload) {

      readerDownload.style.display =
        "none";

    }


    if (readerStatus) {

      readerStatus.textContent =
        "Something went wrong while loading the news.";

    }

  }
}


/* =========================================
   START
========================================= */

loadNews();