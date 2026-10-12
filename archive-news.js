import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
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
let lastVisibleDoc = null;
let isLoading = false;
let currentCategoryFilter = "ALL";

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
   PAGINATED ARCHIVE LOADER
========================================= */

async function loadArchiveNews(isNextBatch = false) {
  if (isLoading) return;

  const archiveGrid = document.getElementById("archiveGrid") || document.getElementById("previousNewsGrid");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  if (!archiveGrid) return;

  isLoading = true;
  if (loadMoreBtn) {
    loadMoreBtn.textContent = "Loading articles...";
    loadMoreBtn.disabled = true;
  }

  try {
    let archiveQuery;

    if (isNextBatch && lastVisibleDoc) {
      archiveQuery = query(
        collection(db, "automaticNews"),
        orderBy("savedAt", "desc"),
        startAfter(lastVisibleDoc),
        limit(PAGE_SIZE)
      );
    } else {
      archiveQuery = query(
        collection(db, "automaticNews"),
        orderBy("savedAt", "desc"),
        limit(PAGE_SIZE)
      );
    }

    const snapshot = await getDocs(archiveQuery);

    if (snapshot.empty) {
      if (!isNextBatch) {
        archiveGrid.innerHTML = `<p style="padding: 20px; color: #64748b;">No archived articles found.</p>`;
      }
      if (loadMoreBtn) {
        loadMoreBtn.style.display = "none";
      }
      isLoading = false;
      return;
    }

    lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

    let newsItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    newsItems.sort((a, b) => parseArticleDate(b) - parseArticleDate(a));

    const htmlCards = newsItems.map(news => {
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

    if (isNextBatch) {
      archiveGrid.insertAdjacentHTML("beforeend", htmlCards);
    } else {
      archiveGrid.innerHTML = htmlCards;
    }

    // Toggle Load More button visibility based on fetched item count
    if (loadMoreBtn) {
      if (snapshot.docs.length < PAGE_SIZE) {
        loadMoreBtn.style.display = "none";
      } else {
        loadMoreBtn.style.display = "inline-block";
        loadMoreBtn.textContent = "Load More News ↓";
        loadMoreBtn.disabled = false;
      }
    }

  } catch (error) {
    console.warn("Archive pagination fallback:", error);
    if (loadMoreBtn) {
      loadMoreBtn.style.display = "none";
    }
  } finally {
    isLoading = false;
  }
}

/* =========================================
   INITIALIZE & EVENT LISTENERS
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadArchiveNews(false);

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      loadArchiveNews(true);
    });
  }
});