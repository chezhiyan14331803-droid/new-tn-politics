import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

const homeSectionDate = document.getElementById("homeSectionDate");
const homeNewsDate = document.getElementById("homeNewsDate");
const homeNewsCategory = document.getElementById("homeNewsCategory");
const homeNewsTitle = document.getElementById("homeNewsTitle");
const homeNewsDescription = document.getElementById("homeNewsDescription");
const heroReadButton = document.getElementById("heroReadButton");
const homeReadButton = document.getElementById("homeReadButton");
const previousNewsGrid = document.getElementById("previousNewsGrid");

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" }
  );
}

function categoryName(category) {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function loadHomeNews() {
  homeSectionDate.textContent = new Date().toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" }
  );
  document.querySelectorAll(".category-grid button").forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.textContent
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    window.location.href =
      `archive.html?category=${encodeURIComponent(category)}`;
  });
});

  try {
    const results = await getDocs(
      query(
        collection(db, "news"),
        orderBy("publicationDate", "desc"),
        limit(4)
      )
    );

    const newsItems = results.docs.map((newsDocument) => ({
      id: newsDocument.id,
      ...newsDocument.data()
    }));

    if (newsItems.length === 0) {
      homeNewsTitle.textContent = "No news published yet.";
      homeNewsDescription.textContent = "Please check back later.";
      return;
    }

    const latest = newsItems[0];
    const readerLink = `reader.html?id=${latest.id}`;

    homeNewsDate.textContent = formatDate(latest.publicationDate);
    homeNewsCategory.textContent = categoryName(latest.category);
    homeNewsTitle.textContent = latest.title;
    homeNewsDescription.textContent = latest.description || "";

    heroReadButton.href = readerLink;
    homeReadButton.href = readerLink;

    const previousNews = newsItems.slice(1);

    previousNewsGrid.innerHTML = previousNews.length
      ? previousNews.map((news) => `
          <article class="publication-item">
            <div>
              <p class="news-category">${categoryName(news.category)}</p>
              <strong>${news.title}</strong>
              <p>${formatDate(news.publicationDate)}</p>
            </div>

            <a class="read-button" href="reader.html?id=${news.id}">
              Read News
            </a>
          </article>
        `).join("")
      : "<p>No previous news yet.</p>";
  } catch (error) {
    homeNewsTitle.textContent = "Unable to load news.";
    homeNewsDescription.textContent = "Please refresh and try again.";
  }
}

loadHomeNews();