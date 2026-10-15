import {
  collection,
  doc,
  increment,
  onSnapshot,
  limit,
  query,
  orderBy,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

/* ================================
   GLOBAL STATE FOR CATEGORY FILTERING
================================ */
let allNewsItems = [];
let activeCategory = "ALL";

/* ================================
   LOCAL PWA NOTIFICATION TRIGGER
================================ */

function triggerLocalNewsNotification(headlineTitle) {
  if (!headlineTitle) return;

  // Prevent duplicate alerts on every page reload/re-render
  const lastNotified = localStorage.getItem("lastNotifiedHeadline");
  if (lastNotified === headlineTitle) return;

  if ("serviceWorker" in navigator && Notification.permission === "granted") {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification("⚡ Breaking News Update", {
        body: headlineTitle,
        icon: "/logo.png",
        badge: "/logo.png",
        vibrate: [200, 100, 200],
        data: { url: "/index.html" },
        tag: "breaking-news-notification" // Replaces existing alert to avoid tray clutter
      });
      localStorage.setItem("lastNotifiedHeadline", headlineTitle);
    });
  }
}

/* ================================
   STRICT DATE PARSING FIX
================================ */

function parseArticleDate(article) {
  if (!article) return 0;

  // 1. Prioritize updatedAt (holds runner fetch time)
  if (article.updatedAt) {
    if (typeof article.updatedAt.toMillis === "function") return article.updatedAt.toMillis();
    if (typeof article.updatedAt.toDate === "function") return article.updatedAt.toDate().getTime();
    if (article.updatedAt.seconds) return article.updatedAt.seconds * 1000;
    const d = new Date(article.updatedAt);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 2. Secondary check: savedAt
  if (article.savedAt) {
    if (typeof article.savedAt.toMillis === "function") return article.savedAt.toMillis();
    if (typeof article.savedAt.toDate === "function") return article.savedAt.toDate().getTime();
    if (article.savedAt.seconds) return article.savedAt.seconds * 1000;
    const d = new Date(article.savedAt);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 3. Fallback to API publishedAt string only if runner timestamps are missing
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

/* ================================
   CATEGORY FILTER SETUP & RENDER
================================ */

function renderNewsGrid() {
  const previousNewsGrid = document.getElementById("previousNewsGrid");
  if (!previousNewsGrid) return;

  // Filter items (skip index 0 which is reserved for Today's Card)
  let itemsToDisplay = allNewsItems.slice(1);

  if (activeCategory !== "ALL") {
    itemsToDisplay = itemsToDisplay.filter(news => {
      const cat = String(news.category || "").toUpperCase();
      return cat.includes(activeCategory);
    });
  }

  if (itemsToDisplay.length === 0) {
    previousNewsGrid.innerHTML = `<p style="padding: 20px; color: #64748b; grid-column: 1/-1;">No articles found for <strong>${activeCategory}</strong> category.</p>`;
    return;
  }

  previousNewsGrid.innerHTML = itemsToDisplay
    .map(news => {
      const type = news.type || "automatic";
      const readerLink = createReaderLink(news.id, type);
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

function setupCategoryFilters() {
  const categoryGrid = document.querySelector(".category-grid");
  if (!categoryGrid) return;

  const buttons = categoryGrid.querySelectorAll("button");
  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const selectedCat = button.textContent.trim().toUpperCase();

      buttons.forEach(btn => {
        btn.style.background = "";
        btn.style.color = "";
      });

      if (activeCategory === selectedCat) {
        activeCategory = "ALL"; // Reset on second click
      } else {
        activeCategory = selectedCat;
        button.style.background = "#e63946";
        button.style.color = "#ffffff";
      }

      renderNewsGrid();
    });
  });
}

/* ================================
   RENDER HOMEPAGE
================================ */

function displayNews(newsItems) {
  allNewsItems = newsItems || [];

  const homeNewsTitle = document.getElementById("homeNewsTitle");
  const homeNewsDescription = document.getElementById("homeNewsDescription");
  const breakingNewsText = document.getElementById("breakingNewsText");
  const previousNewsGrid = document.getElementById("previousNewsGrid");
  const homeNewsDate = document.getElementById("homeNewsDate");
  const homeNewsCategory = document.getElementById("homeNewsCategory");
  const heroReadButton = document.getElementById("heroReadButton");
  const homeReadButton = document.getElementById("homeReadButton");

  // DOM elements for PDF badge & download button on Today's Card
  const todayPdfIcon = document.querySelector(".today-card .pdf-icon");
  const todayDownloadBtn = document.querySelector(".today-card .download-button");

  if (!newsItems || newsItems.length === 0) {
    if (homeNewsTitle) homeNewsTitle.textContent = "No news available.";
    if (previousNewsGrid) previousNewsGrid.innerHTML = "<p>No news available yet.</p>";
    return;
  }

  const latest = newsItems[0];
  const articleType = latest.type || "automatic";
  const latestReaderLink = createReaderLink(latest.id, articleType);
  const hasPdf = Boolean(latest.pdfUrl && articleType !== "automatic");

  // Trigger system push notification if new headline is detected 🔔
  if (latest.title) {
    triggerLocalNewsNotification(latest.title);
  }

  /* Handle PDF element visibility on Today's Card */
  if (todayPdfIcon) {
    todayPdfIcon.style.display = hasPdf ? "flex" : "none";
  }
  if (todayDownloadBtn) {
    if (hasPdf) {
      todayDownloadBtn.style.display = "inline-block";
      todayDownloadBtn.onclick = () => window.open(latest.pdfUrl, "_blank");
    } else {
      todayDownloadBtn.style.display = "none";
    }
  }

  /* Hero Section */
  if (breakingNewsText) {
    breakingNewsText.textContent = latest.title || "Latest news available now";
    breakingNewsText.style.cursor = "pointer";
    breakingNewsText.onclick = () => {
      trackArticleClick(latest.id);
      window.location.href = latestReaderLink;
    };
  }

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

  /* Render Grid Items */
  renderNewsGrid();
}

/* ================================
   TRENDING NEWS
================================ */

function loadTrendingNews() {
  const trendingGrid = document.getElementById("trendingNewsGrid");
  if (!trendingGrid) return;

  const trendingQuery = query(collection(db, "automaticNews"), limit(50));

  onSnapshot(trendingQuery, snapshot => {
    if (snapshot.empty) return;

    let trendingItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    trendingItems.sort((a, b) => {
      const viewsA = Number(a.views || 0);
      const viewsB = Number(b.views || 0);
      if (viewsB !== viewsA) return viewsB - viewsA;
      return parseArticleDate(b) - parseArticleDate(a);
    });

    trendingGrid.innerHTML = trendingItems.slice(0, 4).map((news, index) => {
      const type = news.type || "automatic";
      const districtTag = news.district ? ` • 📍 ${news.district}` : "";
      return `
        <article class="trending-card">
          <div>
            <span class="trending-badge">#${index + 1} Most Read</span>
            <p class="news-category">${getCategoryIcon(news.category)} ${categoryName(news.category)}${districtTag}</p>
            <strong>${news.title || "Trending News"}</strong>
          </div>
          <a class="read-button" href="${createReaderLink(news.id, type)}" onclick="trackArticleClick('${news.id}')" style="margin-top: 15px;">Read News</a>
        </article>
      `;
    }).join("");
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

  setupCategoryFilters();
  loadTrendingNews();

  // QUERY FIRESTORE ORDERED BY SAVEDAT DESCENDING DIRECTLY
  const newsQuery = query(
    collection(db, "automaticNews"),
    orderBy("savedAt", "desc"),
    limit(20)
  );

  onSnapshot(
    newsQuery,
    snapshot => {
      if (snapshot.empty) {
        displayNews([]);
        return;
      }

      let newsItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Explicit in-memory sort fallback
      newsItems.sort((a, b) => parseArticleDate(b) - parseArticleDate(a));

      displayNews(newsItems);
    },
    error => {
      console.warn("Firestore index error fallback:", error);

      // Fallback query if Firestore index is still generating
      const fallbackQuery = query(collection(db, "automaticNews"), limit(50));
      onSnapshot(fallbackQuery, fallbackSnap => {
        let fallbackItems = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fallbackItems.sort((a, b) => parseArticleDate(b) - parseArticleDate(a));
        displayNews(fallbackItems);
      });
    }
  );
}

loadHomeNews();