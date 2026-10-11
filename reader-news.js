import {
  collection,
  doc,
  increment,
  onSnapshot,
  limit,
  query,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

/* ================================
   HELPERS & STRICT DATE PARSING
================================ */

function parseArticleDate(article) {
  if (!article) return 0;

  // 1. Read savedAt (Firestore Timestamp)
  if (article.savedAt) {
    if (typeof article.savedAt.toMillis === "function") return article.savedAt.toMillis();
    if (typeof article.savedAt.toDate === "function") return article.savedAt.toDate().getTime();
    if (article.savedAt.seconds) return article.savedAt.seconds * 1000;
    const d = new Date(article.savedAt);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 2. Read updatedAt (Firestore Timestamp)
  if (article.updatedAt) {
    if (typeof article.updatedAt.toMillis === "function") return article.updatedAt.toMillis();
    if (typeof article.updatedAt.toDate === "function") return article.updatedAt.toDate().getTime();
    if (article.updatedAt.seconds) return article.updatedAt.seconds * 1000;
    const d = new Date(article.updatedAt);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 3. Fallback to publishedAt string
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

function createReaderLink(id) {
  return `reader.html?type=automatic&id=${encodeURIComponent(id)}`;
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

/* ================================
   RENDER HOMEPAGE
================================ */

function displayNews(newsItems) {
  const homeNewsTitle = document.getElementById("homeNewsTitle");
  const homeNewsDescription = document.getElementById("homeNewsDescription");
  const breakingNewsText = document.getElementById("breakingNewsText");
  const previousNewsGrid = document.getElementById("previousNewsGrid");
  const homeNewsDate = document.getElementById("homeNewsDate");
  const homeNewsCategory = document.getElementById("homeNewsCategory");
  const heroReadButton = document.getElementById("heroReadButton");
  const homeReadButton = document.getElementById("homeReadButton");

  if (!newsItems || newsItems.length === 0) {
    if (homeNewsTitle) homeNewsTitle.textContent = "No automatic news available.";
    if (previousNewsGrid) previousNewsGrid.innerHTML = "<p>No news available yet.</p>";
    return;
  }

  const latest = newsItems[0];
  const latestReaderLink = createReaderLink(latest.id);

  /* Breaking News Header */
  if (breakingNewsText) {
    breakingNewsText.textContent = latest.title || "Latest news available now";
    breakingNewsText.style.cursor = "pointer";
    breakingNewsText.onclick = () => {
      trackArticleClick(latest.id);
      window.location.href = latestReaderLink;
    };
  }

  /* Featured Hero News */
  if (homeNewsDate) homeNewsDate.textContent = formatDate(latest);
  if (homeNewsCategory) {
    const districtTag = latest.district ? ` • 📍 ${latest.district}` : "";
    homeNewsCategory.textContent = `${getCategoryIcon(latest.category)} ${categoryName(latest.category)}${districtTag}`;
  }
  if (homeNewsTitle) homeNewsTitle.textContent = latest.title || "Latest News";
  if (homeNewsDescription) homeNewsDescription.textContent = latest.description || "Read the latest news.";

  if (heroReadButton) {
    heroReadButton.href = latestReaderLink;
    heroReadButton.onclick = () => trackArticleClick(latest.id);
  }
  if (homeReadButton) {
    homeReadButton.href = latestReaderLink;
    homeReadButton.onclick = () => trackArticleClick(latest.id);
  }

  /* Grid Articles (Homepage Previous News) */
  const previousNews = newsItems.slice(1);
  if (!previousNewsGrid) return;

  if (previousNews.length === 0) {
    previousNewsGrid.innerHTML = "<p>No additional news available.</p>";
    return;
  }

  previousNewsGrid.innerHTML = previousNews
    .map(news => {
      const readerLink = createReaderLink(news.id);
      const districtTag = news.district ? ` • 📍 ${news.district}` : "";

      return `
        <article class="publication-item">
          <div>
            <p class="news-category">
              ${getCategoryIcon(news.category)} ${categoryName(news.category)}${districtTag}
            </p>
            <strong>${news.title || "Latest News"}</strong>
            <p>📅 ${formatDate(news)}</p>
          </div>
          <a class="read-button" href="${readerLink}" onclick="trackArticleClick('${news.id}')">
            Read News
          </a>
        </article>
      `;
    })
    .join("");
}

/* ================================
   TRENDING NEWS
================================ */

function loadTrendingNews() {
  const trendingGrid = document.getElementById("trendingNewsGrid");
  if (!trendingGrid) return;

  const trendingQuery = query(collection(db, "automaticNews"), limit(30));

  onSnapshot(trendingQuery, snapshot => {
    if (snapshot.empty) {
      trendingGrid.innerHTML = "<p>No trending articles available yet.</p>";
      return;
    }

    let trendingItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    trendingItems.sort((a, b) => {
      const viewsA = Number(a.views || 0);
      const viewsB = Number(b.views || 0);
      if (viewsB !== viewsA) return viewsB - viewsA;
      return parseArticleDate(b) - parseArticleDate(a);
    });

    trendingGrid.innerHTML = trendingItems.slice(0, 4).map((news, index) => {
      const districtTag = news.district ? ` • 📍 ${news.district}` : "";
      return `
        <article class="trending-card">
          <div>
            <span class="trending-badge">#${index + 1} Most Read</span>
            <p class="news-category">${getCategoryIcon(news.category)} ${categoryName(news.category)}${districtTag}</p>
            <strong>${news.title || "Trending News"}</strong>
          </div>
          <a class="read-button" href="${createReaderLink(news.id)}" onclick="trackArticleClick('${news.id}')" style="margin-top: 15px;">Read News</a>
        </article>
      `;
    }).join("");
  }, err => {
    console.error("Trending news error:", err);
  });
}

/* ================================
   LOAD HOMEPAGE DATA
================================ */

function loadHomeNews() {
  const homeSectionDate = document.getElementById("homeSectionDate");
  if (homeSectionDate) {
    homeSectionDate.textContent = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  loadTrendingNews();

  const newsQuery = query(collection(db, "automaticNews"), limit(40));

  onSnapshot(newsQuery, snapshot => {
    if (snapshot.empty) {
      displayNews([]);
      return;
    }

    let allFetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort strictly by Firestore timestamp (savedAt / updatedAt) - newest first
    allFetchedItems.sort((a, b) => parseArticleDate(b) - parseArticleDate(a));

    displayNews(allFetchedItems);
  }, err => {
    console.error("Main news query error:", err);
  });
}

loadHomeNews();