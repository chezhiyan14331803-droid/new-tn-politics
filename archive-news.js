import {
  collection,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";


/* =========================================
   ELEMENTS
========================================= */

const archiveGrid =
  document.getElementById("archiveGrid");

const archiveCategory =
  document.getElementById("archiveCategory");

const archiveHeading =
  document.querySelector(".archive-heading h1");

const archiveDescription =
  document.querySelector(
    ".archive-heading > p:last-child"
  );


/* =========================================
   ALL NEWS
========================================= */

let allNews = [];


/* =========================================
   NORMALIZE CATEGORY
========================================= */

function normalizeCategory(category) {

  return String(category || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-");
}


/* =========================================
   FORMAT DATE
========================================= */

function formatDate(dateString) {

  if (!dateString) {
    return "";
  }

  const date =
    new Date(dateString);


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


/* =========================================
   CATEGORY DISPLAY NAME
========================================= */

function categoryName(category) {

  if (!category) {
    return "News";
  }


  return String(category)
    .split(/[\s_-]+/)
    .map(word =>
      word.charAt(0).toUpperCase() +
      word.slice(1)
    )
    .join(" ");
}


/* =========================================
   CATEGORY ICON
========================================= */

function getCategoryIcon(category) {

  const value =
    String(category || "")
      .toLowerCase();


  if (value.includes("politics")) {
    return "🏛️";
  }

  if (value.includes("sports")) {
    return "🏏";
  }

  if (value.includes("technology")) {
    return "💻";
  }

  if (value.includes("business")) {
    return "💰";
  }

  if (value.includes("education")) {
    return "🎓";
  }

  if (value.includes("world")) {
    return "🌍";
  }

  if (value.includes("india")) {
    return "🇮🇳";
  }

  if (value.includes("tamil")) {
    return "📍";
  }

  return "📰";
}


/* =========================================
   GET URL SEARCH
========================================= */

function getSearchText() {

  return new URLSearchParams(
    window.location.search
  )
    .get("search")
    ?.trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "") || "";
}


/* =========================================
   GET URL CATEGORY
========================================= */

function getRequestedCategory() {

  return new URLSearchParams(
    window.location.search
  )
    .get("category") || "";
}


/* =========================================
   UPDATE PAGE HEADING
========================================= */

function updateArchiveHeading(
  searchText,
  selectedCategory
) {

  if (!archiveHeading ||
      !archiveDescription) {
    return;
  }


  /* SEARCH */

  if (searchText) {

    archiveHeading.textContent =
      "Search Results";

    archiveDescription.textContent =
      `Showing results for "${searchText}"`;

    return;
  }


  /* CATEGORY */

  if (
    selectedCategory &&
    selectedCategory !== "all" &&
    selectedCategory !== "all-categories"
  ) {

    archiveHeading.textContent =
      `${categoryName(selectedCategory)} News`;

    archiveDescription.textContent =
      `Browse the latest ${categoryName(selectedCategory).toLowerCase()} news.`;

    return;
  }


  /* DEFAULT */

  archiveHeading.textContent =
    "Previous News";

  archiveDescription.textContent =
    "Browse previously published daily news.";
}


/* =========================================
   RENDER NEWS
========================================= */

function renderNews() {

  if (!archiveGrid) {
    return;
  }


  const selectedCategory =
    normalizeCategory(
      archiveCategory
        ? archiveCategory.value
        : "all"
    );


  const searchText =
    getSearchText();


  console.log(
    "Category:",
    selectedCategory
  );

  console.log(
    "Search:",
    searchText
  );


  /* =====================================
     UPDATE HEADING
  ===================================== */

  updateArchiveHeading(
    searchText,
    selectedCategory
  );


  /* =====================================
     CATEGORY FILTER
  ===================================== */

  let newsToShow;


  if (
    selectedCategory === "all" ||
    selectedCategory === "all-categories" ||
    selectedCategory === ""
  ) {

    newsToShow =
      [...allNews];

  } else {

    newsToShow =
      allNews.filter(news => {

        const newsCategory =
          normalizeCategory(
            news.category
          );


        return (
          newsCategory ===
          selectedCategory
        );

      });

  }


  /* =====================================
   SEARCH FILTER
===================================== */

if (searchText) {

  /*
     If the search text is a category name,
     search ONLY inside the category.
  */

  const categorySearches = [
    "tamilnadu",
    "india",
    "world",
    "politics",
    "sports",
    "technology",
    "education",
    "business"
  ];


  if (categorySearches.includes(searchText)) {

    newsToShow =
      newsToShow.filter(news => {

        const newsCategory =
          String(news.category || "")
            .toLowerCase()
            .replace(/[\s_-]+/g, "");

        return newsCategory === searchText;

      });

  }

  /*
     Otherwise, perform normal text search
     across title, category, description and source.
  */

  else {

    newsToShow =
      newsToShow.filter(news => {

        const searchableText = `

          ${news.title || ""}

          ${news.category || ""}

          ${news.description || ""}

          ${news.source || ""}

        `
          .toLowerCase()
          .replace(/[\s_-]+/g, "");


        return searchableText.includes(
          searchText
        );

      });

  }

}
  /* =====================================
     DISPLAY NEWS
  ===================================== */

  archiveGrid.innerHTML =
    newsToShow
      .map(news => {

        let readerLink;


        if (news.type === "automatic") {

          readerLink =
            `reader.html?type=automatic&id=${encodeURIComponent(news.id)}`;

        } else {

          readerLink =
            `reader.html?id=${encodeURIComponent(news.id)}`;

        }


        const buttonText =
          news.type === "automatic"
            ? "Read News"
            : "Read PDF";


        return `

          <article class="publication-item">

            <div>

              <p class="news-category">

                ${getCategoryIcon(news.category)}

                ${categoryName(news.category)}

              </p>


              <strong>
                ${news.title || "Latest News"}
              </strong>


              <div class="news-meta">

                <span>
                  📅 ${formatDate(news.date)}
                </span>


                ${
                  news.source
                    ? `
                      <span>
                        📰 ${news.source}
                      </span>
                    `
                    : ""
                }

              </div>


              ${
                news.description
                  ? `
                    <p>
                      ${news.description}
                    </p>
                  `
                  : ""
              }

            </div>


            <a
              class="read-button"
              href="${readerLink}"
            >
              ${buttonText}
            </a>

          </article>

        `;

      })
      .join("");
}


/* =========================================
   LOAD AUTOMATIC NEWS
========================================= */

async function loadAutomaticNews() {

  const results =
    await getDocs(
      query(
        collection(
          db,
          "automaticNews"
        ),
        orderBy(
          "publishedAt",
          "desc"
        )
      )
    );


  return results.docs.map(
    newsDocument => {

      const data =
        newsDocument.data();


      return {

        id:
          newsDocument.id,

        type:
          "automatic",

        title:
          data.title || "",

        category:
          data.category || "",

        description:
          data.description || "",

        date:
          data.publishedAt || "",

        source:
          data.source || "",

        sourceUrl:
          data.sourceUrl || ""

      };

    }
  );
}


/* =========================================
   LOAD PDF NEWS
========================================= */

async function loadPdfNews() {

  const results =
    await getDocs(
      query(
        collection(
          db,
          "news"
        ),
        orderBy(
          "publicationDate",
          "desc"
        )
      )
    );


  return results.docs.map(
    newsDocument => {

      const data =
        newsDocument.data();


      return {

        id:
          newsDocument.id,

        type:
          "pdf",

        title:
          data.title || "",

        category:
          data.category || "",

        description:
          data.description || "",

        date:
          data.publicationDate || "",

        pdfUrl:
          data.pdfUrl || ""

      };

    }
  );
}


/* =========================================
   LOAD BOTH COLLECTIONS
========================================= */

async function loadArchive() {

  try {

    const [
      automaticNews,
      pdfNews
    ] =
      await Promise.all([
        loadAutomaticNews(),
        loadPdfNews()
      ]);


    allNews = [
      ...automaticNews,
      ...pdfNews
    ];


    /* NEWEST FIRST */

    allNews.sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );


    console.log(
      "Total news:",
      allNews.length
    );


    console.log(
      "Categories found:",
      [
        ...new Set(
          allNews.map(
            news =>
              news.category
          )
        )
      ]
    );


    /* SET CATEGORY FROM URL */

    const requestedCategory =
      getRequestedCategory();


    if (
      requestedCategory &&
      archiveCategory
    ) {

      const requested =
        normalizeCategory(
          requestedCategory
        );


      const matchingOption =
        [
          ...archiveCategory.options
        ].find(option => {

          return (
            normalizeCategory(
              option.value
            ) === requested ||

            normalizeCategory(
              option.textContent
            ) === requested
          );

        });


      if (matchingOption) {

        archiveCategory.value =
          matchingOption.value;

      }

    }


    /* DISPLAY */

    renderNews();


  } catch (error) {

    console.error(
      "Archive error:",
      error
    );


    if (archiveGrid) {

      archiveGrid.innerHTML = `

        <div class="archive-empty">

          <h3>
            Unable to Load News
          </h3>

          <p>
            Please try again later.
          </p>

        </div>

      `;

    }

  }

}


/* =========================================
   CATEGORY CHANGE
========================================= */

if (archiveCategory) {

  archiveCategory.addEventListener(
    "change",
    renderNews
  );

}


/* =========================================
   START
========================================= */

loadArchive();