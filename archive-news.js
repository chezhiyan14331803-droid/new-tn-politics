import {
  collection,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

const archiveGrid = document.getElementById("archiveGrid");
const archiveCategory = document.getElementById("archiveCategory");

let allNews = [];

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
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function renderNews() {

  const selectedCategory =
    archiveCategory.value
      .toLowerCase()
      .replace(/\s+/g, "-");

  let newsToShow =
    selectedCategory === "all"
      ? allNews
      : allNews.filter(
          (news) =>
            news.category === selectedCategory
        );

  const searchText =
    new URLSearchParams(window.location.search)
      .get("search")
      ?.trim()
      .toLowerCase() || "";

  if (searchText) {

    newsToShow = newsToShow.filter((news) =>
      `${news.title} ${news.category} ${
        news.description || ""
      }`
        .toLowerCase()
        .includes(searchText)
    );
  }

  if (newsToShow.length === 0) {

    archiveGrid.innerHTML =
      "<p>No automatic news found.</p>";

    return;
  }

  archiveGrid.innerHTML =
    newsToShow
      .map(
        (news) => `

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

              <p>
                ${news.description || ""}
              </p>

              <small>
                Source:
                ${news.source || "Unknown"}
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

        `
      )
      .join("");
}

async function loadArchive() {

  try {

    const results = await getDocs(
      query(
        collection(db, "automaticNews"),
        orderBy("publishedAt", "desc")
      )
    );

    allNews = results.docs.map(
      (newsDocument) => ({
        id: newsDocument.id,
        ...newsDocument.data()
      })
    );

    renderNews();

  } catch (error) {

    console.error(
      "Archive error:",
      error
    );

    archiveGrid.innerHTML =
      "<p>Unable to load automatic news. Please try again later.</p>";
  }
}

archiveCategory.addEventListener(
  "change",
  renderNews
);

const requestedCategory =
  new URLSearchParams(
    window.location.search
  ).get("category");

if (requestedCategory) {

  const matchingOption =
    [...archiveCategory.options].find(
      (option) =>
        option.value
          .toLowerCase()
          .replace(/\s+/g, "-") ===
        requestedCategory
    );

  if (matchingOption) {
    archiveCategory.value =
      matchingOption.value;
  }
}

loadArchive();