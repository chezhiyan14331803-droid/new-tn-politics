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
   HOMEPAGE ELEMENTS
================================ */

const homeSectionDate = document.getElementById("homeSectionDate");
const homeNewsDate = document.getElementById("homeNewsDate");
const homeNewsCategory = document.getElementById("homeNewsCategory");
const homeNewsTitle = document.getElementById("homeNewsTitle");
const homeNewsDescription = document.getElementById("homeNewsDescription");
const heroReadButton = document.getElementById("heroReadButton");
const homeReadButton = document.getElementById("homeReadButton");
const previousNewsGrid = document.getElementById("previousNewsGrid");
const breakingNewsText = document.getElementById("breakingNewsText");

/* ================================
   HELPERS
================================ */

function parseArticleDate(article) {
  if (!article) return 0;
  
  // 1. Check savedAt Firestore Timestamp
  if (article.savedAt) {
    if (typeof article.savedAt.toMillis === "function") {
      return article.savedAt.toMillis();
    }
    if (typeof article.savedAt.toDate === "function") {
      return article.savedAt.toDate().getTime();
    }
    const date = new Date(article.savedAt);
    if (!isNaN(date.getTime())) return date.getTime();
  }

  // 2. Check publishedAt string
  if (article.publishedAt) {
    const date = new Date(article.publishedAt);
    if (!isNaN(date.getTime())) return date.getTime();
  }

  return 0;
}

function formatDate(dateValue) {
  if (!dateValue) return "";

  let date;
  if (dateValue && typeof dateValue.toDate === "function") {
    date = dateValue.toDate();
  } else {
    date = new Date(dateValue);
  }

  if (isNaN(date.getTime())) return String(dateValue);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function categoryName(category) {
  if (!category) return "News";
  return category
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
   DISPLAY NEWS
================================ */

function displayNews(newsItems) {
  if (!newsItems || newsItems.length === 0) {
    if (homeNewsTitle) homeNewsTitle.textContent = "No automatic news available.";
    if (homeNewsDescription) homeNewsDescription.textContent = "Please check back later.";
    if (breakingNewsText) breakingNewsText.textContent = "No latest news available.";
    if (previousNewsGrid) previousNewsGrid.innerHTML = "<p>No automatic news available yet.</p>";
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

  /* Main Featured Article */
  if (homeNewsDate) homeNewsDate.textContent = formatDate(latest.savedAt || latest.publishedAt);
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

  /* Grid Articles (Previous News) */
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
            <p>📅 ${formatDate(news.savedAt || news.publishedAt)}</p>
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
   LOAD TRENDING NEWS
================================ */

function loadTrendingNews() {
  const trendingGrid = document.getElementById("trendingNewsGrid");
  if (!trendingGrid) return;

  // Query database with explicit descending order by savedAt to get the newest batch first
  const trendingQuery = query(
    collection(db, "automaticNews"),
    orderBy("savedAt", "desc"),
    limit(30)
  );

  onSnapshot(
    trendingQuery,
    snapshot => {
      if (snapshot.empty) {
        trendingGrid.innerHTML = "<p>No trending articles available yet.</p>";
        return;
      }

      let trendingItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by views first. Fallback to newest publication/saved time if views are equal
      trendingItems.sort((a, b) => {
        const viewsA = a.views || 0;
        const viewsB = b.views || 0;

        if (viewsB !== viewsA) {
          return viewsB - viewsA;
        }

        return parseArticleDate(b) - parseArticleDate(a);
      });

      trendingItems = trendingItems.slice(0, 4);

      trendingGrid.innerHTML = trendingItems
        .map((news, index) => {
          const readerLink = createReaderLink(news.id);
          const districtTag = news.district ? ` • 📍 ${news.district}` : "";

          return `
            <article class="trending-card">
              <div>
                <span class="trending-badge">#${index + 1} Most Read</span>
                <p class="news-category">
                  ${getCategoryIcon(news.category)} ${categoryName(news.category)}${districtTag}
                </p>
                <strong>${news.title || "Trending News"}</strong>
              </div>
              <a
                class="read-button"
                href="${readerLink}"
                onclick="trackArticleClick('${news.id}')"
                style="margin-top: 15px;"
              >
                Read News
              </a>
            </article>
          `;
        })
        .join("");
    },
    error => {
      console.warn("Trending news load fallback error:", error);
      // Fallback query if Firestore index is building
      const fallbackQuery = query(collection(db, "automaticNews"), limit(30));
      onSnapshot(fallbackQuery, fallbackSnap => {
        let trendingItems = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        trendingItems.sort((a, b) => (b.views || 0) - (a.views || 0) || (parseArticleDate(b) - parseArticleDate(a)));
        trendingGrid.innerHTML = trendingItems.slice(0, 4).map((news, index) => `
          <article class="trending-card">
            <div>
              <span class="trending-badge">#${index + 1} Most Read</span>
              <strong>${news.title || "Trending News"}</strong>
            </div>
            <a class="read-button" href="${createReaderLink(news.id)}" onclick="trackArticleClick('${news.id}')" style="margin-top: 15px;">Read News</a>
          </article>
        `).join("");
      });
    }
  );
}

/* ================================
   SETUP CATEGORY BUTTONS
================================ */

function setupCategoryButtons() {
  const categoryButtons = document.querySelectorAll(".category-grid button");

  categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
      const category = button.textContent
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

      window.location.href = `archive.html?category=${encodeURIComponent(category)}`;
    });
  });
}

/* ================================
   MAIN LOAD FUNCTION
================================ */

function loadHomeNews() {
  if (homeSectionDate) {
    homeSectionDate.textContent = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  setupCategoryButtons();
  loadTrendingNews();

  // Query database ordered by newest saved date
  const newsQuery = query(
    collection(db, "automaticNews"),
    orderBy("savedAt", "desc"),
    limit(30)
  );

  onSnapshot(
    newsQuery,
    snapshot => {
      if (snapshot.empty) {
        if (homeNewsTitle) homeNewsTitle.textContent = "No automatic news available.";
        if (homeNewsDescription) homeNewsDescription.textContent = "Please check back later.";
        if (previousNewsGrid) previousNewsGrid.innerHTML = "<p>No automatic news found in Firestore.</p>";
        return;
      }

      let newsItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort explicitly in memory to ensure October 11 news is on top
      newsItems.sort((a, b) => parseArticleDate(b) - parseArticleDate(a));

      displayNews(newsItems);
    },
    error => {
      console.warn("Main news query fallback triggered:", error);
      
      // Fallback query if index is initializing
      const fallbackNewsQuery = query(collection(db, "automaticNews"), limit(30));
      onSnapshot(fallbackNewsQuery, snap => {
        let newsItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        newsItems.sort((a, b) => parseArticleDate(b) - parseArticleDate(a));
        displayNews(newsItems);
      });
    }
  );
}

loadHomeNews();