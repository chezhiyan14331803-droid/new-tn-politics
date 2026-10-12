import {
  collection,
  query,
  limit,
  getDocs,
  doc,
  increment,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

/* =========================================
   GLOBAL ARCHIVE STATE
========================================= */
const PAGE_SIZE = 12;
let allNewsItems = []; // FIXED: Variable name aligned with applyFilters and fetchArchiveData
let displayedCount = 0;
let filteredArticles = [];

/* =========================================
   DATE PARSING HELPERS
========================================= */

function parseArticleDate(article) {
  if (!article) return 0;

  if (article.updatedAt) {
    if (typeof article.updatedAt.toMillis === "function") return article.updatedAt.toMillis();
    if (typeof article.updatedAt.toDate === "function") return article.updatedAt.toDate().getTime();
    if (article.updatedAt.seconds) return article.updatedAt.seconds * 1000;
    const d = new Date(article.updatedAt);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  if (article.savedAt) {
    if (typeof article.savedAt.toMillis === "function") return article.savedAt.toMillis();
    if (typeof article.savedAt.toDate === "function") return article.savedAt.toDate().getTime();
    if (article.savedAt.seconds) return article.savedAt.seconds * 1000;
    const d = new Date(article.savedAt);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  if (article.publishedAt) {
    const d = new Date(article.publishedAt);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  return 0;
}

function formatDate(article) {
  const timestamp = parseArticleDate(article);
  if (!timestamp) return "";

  const date = new Date(timestamp);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function categoryName(category) {
  if (!category) return "News";
  return String(category)
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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

function createReaderLink(id, type = "automatic") {
  return `reader.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}

async function trackArticleClick(articleId) {
  if (!articleId) return;
  try {
    const articleRef = doc(db, "automaticNews", articleId);
    await updateDoc(articleRef, { views: increment(1) });
  } catch (error) {
    console.warn("View tracking skipped:", error);
  }
}
window.trackArticleClick = trackArticleClick;

/* =========================================
   RENDER ARCHIVE GRID
========================================= */

function renderBatch() {
  const archiveGrid = document.getElementById("archiveGrid");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  if (!archiveGrid) return;

  if (filteredArticles.length === 0) {
    archiveGrid.innerHTML = `<p style="padding: 30px; text-align: center; color: #64748b; grid-column: 1/-1;">No archived articles match your selected filters.</p>`;
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }

  const batch = filteredArticles.slice(displayedCount, displayedCount + PAGE_SIZE);
  
  const htmlCards = batch.map(news => {
    const type = news.type || "automatic";
    const readerLink = createReaderLink(news.id, type);
    const districtTag = news.district ? ` • 📍 ${news.district}` : "";

    return `
      <article class="publication-item">
        <div>
          <p class="news-category">
            ${getCategoryIcon(news.category)} ${categoryName(news.category)}${districtTag}
          </p>
          <strong>${news.title || "Archived News"}</strong>
          <p>📅 ${formatDate(news)}</p>
        </div>
        <a class="read-button" href="${readerLink}" onclick="trackArticleClick('${news.id}')">
          Read News
        </a>
      </article>
    `;
  }).join("");

  if (displayedCount === 0) {
    archiveGrid.innerHTML = htmlCards;
  } else {
    archiveGrid.insertAdjacentHTML("beforeend", htmlCards);
  }

  displayedCount += batch.length;

  if (loadMoreBtn) {
    if (displayedCount < filteredArticles.length) {
      loadMoreBtn.style.display = "inline-block";
      loadMoreBtn.textContent = "Load More News ↓";
    } else {
      loadMoreBtn.style.display = "none";
    }
  }
}

/* =========================================
   APPLY FILTERS (CATEGORY & DISTRICT)
========================================= */

function applyFilters() {
  const categorySelect = document.getElementById("archiveCategory");
  const districtSelect = document.getElementById("archiveDistrict");

  const selectedCategory = categorySelect ? categorySelect.value.toLowerCase() : "all";
  const selectedDistrict = districtSelect ? districtSelect.value.toLowerCase() : "all";

  filteredArticles = allNewsItems.filter(item => {
    const catMatch = selectedCategory === "all" || String(item.category || "").toLowerCase().includes(selectedCategory);
    const distMatch = selectedDistrict === "all" || String(item.district || "").toLowerCase().includes(selectedDistrict);
    return catMatch && distMatch;
  });

  displayedCount = 0;
  renderBatch();
}

/* =========================================
   LOAD ARCHIVE NEWS DATA
========================================= */

async function fetchArchiveData() {
  const archiveGrid = document.getElementById("archiveGrid");

  try {
    const newsQuery = query(collection(db, "automaticNews"), limit(100));
    const snapshot = await getDocs(newsQuery);

    if (snapshot.empty) {
      if (archiveGrid) {
        archiveGrid.innerHTML = `<p style="padding: 30px; text-align: center; color: #64748b; grid-column: 1/-1;">No archived articles found in database.</p>`;
      }
      return;
    }

    allNewsItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // In-memory sort by date descending
    allNewsItems.sort((a, b) => parseArticleDate(b) - parseArticleDate(a));

    applyFilters();

  } catch (error) {
    console.error("Error fetching archive data:", error);
    if (archiveGrid) {
      archiveGrid.innerHTML = `<p style="padding: 30px; text-align: center; color: #e63946; grid-column: 1/-1;">Failed to load archive articles. Please refresh the page.</p>`;
    }
  }
}

/* =========================================
   INITIALIZATION
========================================= */

function initArchive() {
  fetchArchiveData();

  const categorySelect = document.getElementById("archiveCategory");
  const districtSelect = document.getElementById("archiveDistrict");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  if (categorySelect) categorySelect.addEventListener("change", applyFilters);
  if (districtSelect) districtSelect.addEventListener("change", applyFilters);

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      renderBatch();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initArchive);
} else {
  initArchive();
}