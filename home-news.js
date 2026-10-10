import {
  collection,
  doc,
  increment,
  onSnapshot,
  limit,
  orderBy,
  query,
  updateDoc
} from "[https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js](https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js)";

import { db } from "./firebase-config.js";


/* ================================
   HOMEPAGE ELEMENTS
================================ */

const homeSectionDate =
  document.getElementById("homeSectionDate");

const homeNewsDate =
  document.getElementById("homeNewsDate");

const homeNewsCategory =
  document.getElementById("homeNewsCategory");

const homeNewsTitle =
  document.getElementById("homeNewsTitle");

const homeNewsDescription =
  document.getElementById("homeNewsDescription");

const heroReadButton =
  document.getElementById("heroReadButton");

const homeReadButton =
  document.getElementById("homeReadButton");

const previousNewsGrid =
  document.getElementById("previousNewsGrid");

const breakingNewsText =
  document.getElementById("breakingNewsText");


/* ================================
   DATE FORMAT
================================ */

function formatDate(dateString) {
  if (!dateString) return "";

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


/* ================================
   CATEGORY NAME
================================ */

function categoryName(category) {
  if (!category) {
    return "News";
  }

  return category
    .split("-")
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1)
    )
    .join(" ");
}


/* ================================
   READER LINK & VIEW TRACKER
================================ */

function createReaderLink(id) {
  return `reader.html?type=automatic&id=${encodeURIComponent(id)}`;
}

async function trackArticleClick(articleId) {
  if (!articleId) return;
  try {
    const articleRef = doc(db, "automaticNews", articleId);
    await updateDoc(articleRef, {
      views: increment(1)
    });
  } catch (error) {
    console.warn("View tracking update skipped:", error);
  }
}


/* ================================
   CATEGORY ICON
================================ */

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


/* ================================
   DISPLAY NEWS
================================ */

function displayNews(newsItems) {

  /* ---------- NO NEWS ---------- */

  if (newsItems.length === 0) {
    if (homeNewsTitle) homeNewsTitle.textContent = "No automatic news available.";
    if (homeNewsDescription) homeNewsDescription.textContent = "Please check back later.";
    if (breakingNewsText) breakingNewsText.textContent = "No latest news available.";
    return;
  }


  /* ---------- LATEST NEWS ---------- */

  const latest = newsItems[0];
  const latestReaderLink = createReaderLink(latest.id);


  /* ---------- BREAKING NEWS ---------- */

  if (breakingNewsText) {
    breakingNewsText.textContent = latest.title || "Latest news available now";
    breakingNewsText.style.cursor = "pointer";

    breakingNewsText.onclick = () => {
      trackArticleClick(latest.id);
      window.location.href = latestReaderLink;
    };
  }


  /* ---------- TODAY'S NEWS CARD ---------- */

  if (homeNewsDate) homeNewsDate.textContent = formatDate(latest.publishedAt || latest.savedAt);

  if (homeNewsCategory) {
    const districtTag = latest.district ? ` • 📍 ${latest.district}` : "";
    homeNewsCategory.textContent = `${getCategoryIcon(latest.category)} ${categoryName(latest.category)}${districtTag}`;
  }

  if (homeNewsTitle) homeNewsTitle.textContent = latest.title || "Latest News";
  if (homeNewsDescription) homeNewsDescription.textContent = latest.description || "Read the latest news.";


  /* ---------- READER BUTTONS ---------- */

  if (heroReadButton) {
    heroReadButton.href = latestReaderLink;
    heroReadButton.removeAttribute("target");
    heroReadButton.onclick = () => trackArticleClick(latest.id);
  }

  if (homeReadButton) {
    homeReadButton.href = latestReaderLink;
    homeReadButton.removeAttribute("target");
    homeReadButton.onclick = () => trackArticleClick(latest.id);
  }


  /* ---------- PREVIOUS NEWS ---------- */

  const previousNews = newsItems.slice(1);

  if (!previousNewsGrid) return;

  if (previousNews.length === 0) {
    previousNewsGrid.innerHTML = "<p>No previous automatic news yet.</p>";
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
              ${getCategoryIcon(news.category)}
              ${categoryName(news.category)}
              ${districtTag}
            </p>

            <strong>
              ${news.title || "Latest News"}
            </strong>

            <p>
              📅 ${formatDate(news.publishedAt || news.savedAt)}
            </p>
          </div>

          <a
            class="read-button"
            href="${readerLink}"
            onclick="trackArticleClick('${news.id}')"
          >
            Read News
          </a>
        </article>
      `;
    })
    .join("");
}


/* ================================
   CATEGORY BUTTONS
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
   LOAD HOME NEWS
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

  // Make trackArticleClick globally accessible for inline onclick handlers
  window.trackArticleClick = trackArticleClick;

  const newsQuery = query(
    collection(db, "automaticNews"),
    orderBy("publishedAt", "desc"),
    limit(20)
  );

  onSnapshot(
    newsQuery,
    snapshot => {
      console.log("Automatic news updated!");
      const newsItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      displayNews(newsItems);
    },
    error => {
      console.error("Realtime news error:", error);

      if (homeNewsTitle) homeNewsTitle.textContent = "Unable to load automatic news.";
      if (homeNewsDescription) homeNewsDescription.textContent = "Please try again later.";
      if (breakingNewsText) breakingNewsText.textContent = "Unable to load latest news.";
    }
  );
}


/* ================================
   START
================================ */

loadHomeNews();