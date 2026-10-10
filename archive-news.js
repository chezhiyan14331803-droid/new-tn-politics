import {
  collection,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";


/* =========================================
   ELEMENTS
========================================= */

const archiveGrid =
  document.getElementById("archiveGrid");

const archiveCategory =
  document.getElementById("archiveCategory");

const archiveDistrict =
  document.getElementById("archiveDistrict");

const archiveHeading =
  document.querySelector(".archive-heading h1");

const archiveDescription =
  document.querySelector(
    ".archive-heading > p:last-child"
  );


/* =========================================
   ALL NEWS
========================================= */

let allNews = [];


/* =========================================
   NORMALIZE STRING
========================================= */

function normalizeText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-");
}


/* =========================================
   FORMAT DATE
========================================= */

function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

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
   CATEGORY DISPLAY NAME
========================================= */

function categoryName(category) {
  if (!category) {
    return "News";
  }

  return String(category)
    .split(/[\s_-]+/)
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1)
    )
    .join(" ");
}


/* =========================================
   CATEGORY ICON
========================================= */

function getCategoryIcon(category) {
  const value = String(category || "").toLowerCase();

  if (value.includes("politics")) return "🏛️";
  if (value.includes("sports")) return "🏏";
  if (value.includes("technology")) return "💻";
  if (value.includes("business")) return "💰";
  if (value.includes("education")) return "🎓";
  if (value.includes("world")) return "🌍";
  if (value.includes("india")) return "🇮🇳";
  if (value.includes("tamil")) return "📍";

  return "📰";
}


/* =========================================
   GET URL SEARCH & PARAMS
========================================= */

function getSearchText() {
  return new URLSearchParams(window.location.search)
    .get("search")
    ?.trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "") || "";
}

function getRequestedCategory() {
  return new URLSearchParams(window.location.search).get("category") || "";
}


/* =========================================
   UPDATE PAGE HEADING
========================================= */

function updateArchiveHeading(searchText, selectedCategory, selectedDistrict) {
  if (!archiveHeading || !archiveDescription) return;

  if (searchText) {
    archiveHeading.textContent = "Search Results";
    archiveDescription.textContent = `Showing results for "${searchText}"`;
    return;
  }

  if (selectedDistrict && selectedDistrict !== "all") {
    archiveHeading.textContent = `${selectedDistrict} News`;
    archiveDescription.textContent = `Browse news published from ${selectedDistrict}.`;
    return;
  }

  if (selectedCategory && selectedCategory !== "all") {
    archiveHeading.textContent = `${categoryName(selectedCategory)} News`;
    archiveDescription.textContent = `Browse the latest ${categoryName(selectedCategory).toLowerCase()} news.`;
    return;
  }

  archiveHeading.textContent = "Previous News";
  archiveDescription.textContent = "Browse previously published daily news.";
}


/* =========================================
   RENDER NEWS
========================================= */

function renderNews() {
  if (!archiveGrid) return;

  const selectedCategory = normalizeText(archiveCategory ? archiveCategory.value : "all");
  const selectedDistrict = normalizeText(archiveDistrict ? archiveDistrict.value : "all");
  const searchText = getSearchText();

  updateArchiveHeading(searchText, selectedCategory, selectedDistrict);

  /* FILTER BY CATEGORY & DISTRICT */
  let newsToShow = allNews.filter(news => {
    const newsCategory = normalizeText(news.category);
    const newsDistrict = normalizeText(news.district || "general");

    const categoryMatches = (selectedCategory === "all" || selectedCategory === "" || newsCategory === selectedCategory);
    const districtMatches = (selectedDistrict === "all" || selectedDistrict === "" || newsDistrict === selectedDistrict);

    return categoryMatches && districtMatches;
  });

  /* FILTER BY SEARCH TEXT */
  if (searchText) {
    newsToShow = newsToShow.filter(news => {
      const searchableText = `
        ${news.title || ""}
        ${news.category || ""}
        ${news.district || ""}
        ${news.description || ""}
        ${news.source || ""}
      `
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

      return searchableText.includes(searchText);
    });
  }

  /* RENDER EMPTY STATE */
  if (newsToShow.length === 0) {
    archiveGrid.innerHTML = `
      <div class="archive-empty">
        <h3>No News Found</h3>
        <p>No articles match your selected filters. Try changing your category or district selection.</p>
      </div>
    `;
    return;
  }

  /* DISPLAY NEWS CARDS */
  archiveGrid.innerHTML = newsToShow
    .map(news => {
      const readerLink = news.type === "automatic"
        ? `reader.html?type=automatic&id=${encodeURIComponent(news.id)}`
        : `reader.html?id=${encodeURIComponent(news.id)}`;

      const buttonText = news.type === "automatic" ? "Read News" : "Read PDF";

      return `
        <article class="publication-item">
          <div>
            <p class="news-category">
              ${getCategoryIcon(news.category)}
              ${categoryName(news.category)}
              ${news.district ? ` • 📍 ${news.district}` : ""}
            </p>

            <strong>
              ${news.title || "Latest News"}
            </strong>

            <div class="news-meta">
              <span>
                📅 ${formatDate(news.date)}
              </span>

              ${
                news.source
                  ? `
                    <span>
                      📰 ${news.source}
                    </span>
                  `
                  : ""
              }
            </div>

            ${
              news.description
                ? `
                  <p>
                    ${news.description}
                  </p>
                `
                : ""
            }
          </div>

          <a
            class="read-button"
            href="${readerLink}"
          >
            ${buttonText}
          </a>
        </article>
      `;
    })
    .join("");
}


/* =========================================
   LOAD AUTOMATIC NEWS
========================================= */

async function loadAutomaticNews() {
  const results = await getDocs(
    query(
      collection(db, "automaticNews"),
      orderBy("publishedAt", "desc")
    )
  );

  return results.docs.map(newsDocument => {
    const data = newsDocument.data();

    return {
      id: newsDocument.id,
      type: "automatic",
      title: data.title || "",
      category: data.category || "",
      district: data.district || "General",
      description: data.description || "",
      date: data.publishedAt || "",
      source: data.source || "",
      sourceUrl: data.sourceUrl || ""
    };
  });
}


/* =========================================
   LOAD PDF NEWS
========================================= */

async function loadPdfNews() {
  const results = await getDocs(
    query(
      collection(db, "news"),
      orderBy("publicationDate", "desc")
    )
  );

  return results.docs.map(newsDocument => {
    const data = newsDocument.data();

    return {
      id: newsDocument.id,
      type: "pdf",
      title: data.title || "",
      category: data.category || "",
      district: data.district || "General",
      description: data.description || "",
      date: data.publicationDate || "",
      pdfUrl: data.pdfUrl || ""
    };
  });
}


/* =========================================
   LOAD BOTH COLLECTIONS
========================================= */

async function loadArchive() {
  try {
    const [automaticNews, pdfNews] = await Promise.all([
      loadAutomaticNews(),
      loadPdfNews()
    ]);

    allNews = [...automaticNews, ...pdfNews];

    /* NEWEST FIRST */
    allNews.sort((a, b) => new Date(b.date) - new Date(a.date));

    /* SET CATEGORY FROM URL */
    const requestedCategory = getRequestedCategory();

    if (requestedCategory && archiveCategory) {
      const requested = normalizeText(requestedCategory);
      const matchingOption = [...archiveCategory.options].find(option => {
        return (
          normalizeText(option.value) === requested ||
          normalizeText(option.textContent) === requested
        );
      });

      if (matchingOption) {
        archiveCategory.value = matchingOption.value;
      }
    }

    /* DISPLAY */
    renderNews();

  } catch (error) {
    console.error("Archive error:", error);

    if (archiveGrid) {
      archiveGrid.innerHTML = `
        <div class="archive-empty">
          <h3>Unable to Load News</h3>
          <p>Please try again later.</p>
        </div>
      `;
    }
  }
}


/* =========================================
   LISTENERS
========================================= */

if (archiveCategory) {
  archiveCategory.addEventListener("change", renderNews);
}

if (archiveDistrict) {
  archiveDistrict.addEventListener("change", renderNews);
}


/* =========================================
   START
========================================= */

loadArchive();