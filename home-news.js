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
  
  // Try publishedAt standard date string
  if (article.publishedAt) {
    const date = new Date(article.publishedAt);
    if (!isNaN(date.getTime())) return date.getTime();
  }

  // Fallback to savedAt Firestore Timestamp or Date
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

  return 0;
}

function formatDate(dateStringOrTimestamp) {
  if (!dateStringOrTimestamp) return "";

  let date;
  if (typeof dateStringOrTimestamp.toDate === "function") {
    date = dateStringOrTimestamp.toDate();
  } else {
    date = new Date(dateStringOrTimestamp);
  }

  if (isNaN(date.getTime())) return String(dateStringOrTimestamp);

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
  if (homeNewsDate) homeNewsDate.textContent = formatDate(latest.publishedAt || latest.savedAt);
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

  /* Grid Articles */
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
            <p>📅 ${formatDate(news.publishedAt || news.savedAt)}</p>
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

  const trendingQuery = query(
    collection(db, "automaticNews"),
    limit(20)
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

      // SORTING LOGIC:
      // 1. Highest views first
      // 2. If views are equal (e.g. 0 views), sort by newest published/saved date
      trendingItems.sort((a, b) => {
        const viewsA = a.views || 0;
        const viewsB = b.views || 0;

        if (viewsB !== viewsA) {
          return viewsB - viewsA;
        }

        const dateA = parseArticleDate(a);
        const dateB = parseArticleDate(b);
        return dateB - dateA;
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
      console.warn("Trending news load error:", error);
      trendingGrid.innerHTML = "<p>Trending stories will appear as views build up!</p>";
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

  const newsQuery = query(
    collection(db, "automaticNews"),
    limit(20)
  );

  onSnapshot(
    newsQuery,
    snapshot => {
      console.log("Automatic news loaded! Count:", snapshot.size);

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

      newsItems.sort((a, b) => {
        const dateA = parseArticleDate(a);
        const dateB = parseArticleDate(b);
        return dateB - dateA;
      });

      displayNews(newsItems);
    },
    error => {
      console.error("Realtime news error:", error);

      if (homeNewsTitle) homeNewsTitle.textContent = "Unable to load automatic news.";
      if (homeNewsDescription) homeNewsDescription.textContent = "Please try again later.";
      if (breakingNewsText) breakingNewsText.textContent = "Unable to load latest news.";
      if (previousNewsGrid) previousNewsGrid.innerHTML = "<p>Error loading news. Check browser console.</p>";
    }
  );
}

loadHomeNews();