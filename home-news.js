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
  if (!dateString) return "Date unavailable";

  return new Date(dateString).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function categoryName(category) {
  if (!category) return "News";

  return category
    .split("-")
    .map(
      word => word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

async function loadHomeNews() {

  // Show today's date
  homeSectionDate.textContent = new Date().toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );

  // Category buttons
  document
    .querySelectorAll(".category-grid button")
    .forEach(button => {

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

    // Get latest automatic news
    const results = await getDocs(
      query(
        collection(db, "automaticNews"),
        orderBy("publishedAt", "desc"),
        limit(5)
      )
    );

    const newsItems = results.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // No news
    if (newsItems.length === 0) {

      homeNewsTitle.textContent =
        "No automatic news available.";

      homeNewsDescription.textContent =
        "Please check back later.";

      return;
    }

    // Latest news
    const latest = newsItems[0];

    homeNewsDate.textContent =
      formatDate(latest.publishedAt);

    homeNewsCategory.textContent =
      categoryName(latest.category);

    homeNewsTitle.textContent =
      latest.title;

    homeNewsDescription.textContent =
      latest.description || "";

    // Open original news article
    if (latest.sourceUrl) {

      heroReadButton.href = latest.sourceUrl;
      heroReadButton.target = "_blank";

      homeReadButton.href = latest.sourceUrl;
      homeReadButton.target = "_blank";
    }

    // Previous automatic news
    const previousNews = newsItems.slice(1);

    if (previousNews.length > 0) {

      previousNewsGrid.innerHTML =
        previousNews
          .map(news => `

            <article class="publication-item">

              <div>

                <p class="news-category">
                  ${categoryName(news.category)}
                </p>

                <strong>
                  ${news.title}
                </strong>

                <p>
                  ${formatDate(news.publishedAt)}
                </p>

                <small>
                  Source: ${news.source || "Unknown"}
                </small>

              </div>

              <a
                class="read-button"
                href="${news.sourceUrl || "#"}"
                target="_blank"
              >
                Read News
              </a>

            </article>

          `)
          .join("");

    } else {

      previousNewsGrid.innerHTML =
        "<p>No previous automatic news yet.</p>";

    }

  } catch (error) {

    console.error("Automatic news error:", error);

    homeNewsTitle.textContent =
      "Unable to load automatic news.";

    homeNewsDescription.textContent =
      "Please refresh and try again.";

  }
}

loadHomeNews();