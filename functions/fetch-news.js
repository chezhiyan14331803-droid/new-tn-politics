const admin = require("firebase-admin");

console.log("🔥 CATEGORY VERSION 6 IS RUNNING 🔥");

// =====================================================
// FIREBASE INITIALIZATION
// =====================================================

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT secret is missing."
  );
}

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


// =====================================================
// CURRENT IST TIME
// =====================================================

const now = new Date();

const indiaTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
}).formatToParts(now);

function getIndiaPart(name) {
  return indiaTime.find(
    part => part.type === name
  )?.value;
}

const currentYear =
  Number(getIndiaPart("year"));

const currentMonth =
  Number(getIndiaPart("month"));

const currentDay =
  Number(getIndiaPart("day"));

const currentHour =
  Number(getIndiaPart("hour"));

const currentMinute =
  Number(getIndiaPart("minute"));


// =====================================================
// DATE HELPERS
// =====================================================

function makeDateString(year, month, day) {

  return (
    `${year}-` +
    `${String(month).padStart(2, "0")}-` +
    `${String(day).padStart(2, "0")}`
  );

}


function getPreviousDate(
  year,
  month,
  day
) {

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  date.setUTCDate(
    date.getUTCDate() - 1
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };

}


// =====================================================
// BATCH DEFINITIONS
// =====================================================

const BATCHES = {

  F1: {
    startHour: 6,
    startMinute: 0,
    endHour: 10,
    endMinute: 0
  },

  F2: {
    startHour: 11,
    startMinute: 0,
    endHour: 17,
    endMinute: 30
  },

  F3: {
    startHour: 18,
    startMinute: 0,
    endHour: 22,
    endMinute: 0
  }

};


// =====================================================
// CONVERT ARTICLE PUBDATE TO IST PARTS
// =====================================================

function getArticleIST(article) {

  if (!article.pubDate) {
    return null;
  }

  const published =
    new Date(article.pubDate);

  if (
    isNaN(
      published.getTime()
    )
  ) {
    return null;
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).formatToParts(published);

  function part(name) {

    return Number(
      parts.find(
        p => p.type === name
      )?.value
    );

  }

  return {

    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute")

  };

}


// =====================================================
// FIND ARTICLE BATCH
// =====================================================

function getArticleBatch(article) {

  const india =
    getArticleIST(article);

  if (!india) {
    return null;
  }

  const minutes =
    india.hour * 60 +
    india.minute;


  // F1
  if (
    minutes >= 6 * 60 &&
    minutes <= 10 * 60
  ) {

    return "F1";

  }


  // F2
  if (
    minutes >= 11 * 60 &&
    minutes <=
      (17 * 60 + 30)
  ) {

    return "F2";

  }


  // F3
  if (
    minutes >= 18 * 60 &&
    minutes <= 22 * 60
  ) {

    return "F3";

  }


  return null;

}


// =====================================================
// FIND NEWS CATEGORY
// =====================================================

function getCategory(article) {

  const text = `
    ${article.title || ""}
    ${article.description || ""}
    ${article.content || ""}
    ${
      Array.isArray(article.category)
        ? article.category.join(" ")
        : article.category || ""
    }
  `.toLowerCase();


  // POLITICS

  if (
    text.includes("politic") ||
    text.includes("election") ||
    text.includes("minister") ||
    text.includes("chief minister") ||
    text.includes("mla") ||
    text.includes(" mp ") ||
    text.includes("government") ||
    text.includes("assembly") ||
    text.includes("party") ||
    text.includes("bjp") ||
    text.includes("congress") ||
    text.includes("dmk") ||
    text.includes("aiadmk") ||
    text.includes("tvk")
  ) {

    return "Politics";

  }


  // SPORTS

  if (
    text.includes("cricket") ||
    text.includes("football") ||
    text.includes("tennis") ||
    text.includes("sport") ||
    text.includes("match") ||
    text.includes("player") ||
    text.includes("tournament") ||
    text.includes("ipl") ||
    text.includes("world cup")
  ) {

    return "Sports";

  }


  // TECHNOLOGY

  if (
    text.includes("technology") ||
    text.includes("tech") ||
    text.includes("artificial intelligence") ||
    text.includes("ai ") ||
    text.includes("software") ||
    text.includes("smartphone") ||
    text.includes("computer") ||
    text.includes("internet") ||
    text.includes("cyber") ||
    text.includes("startup")
  ) {

    return "Technology";

  }


  // BUSINESS

  if (
    text.includes("business") ||
    text.includes("economy") ||
    text.includes("market") ||
    text.includes("stock") ||
    text.includes("bank") ||
    text.includes("company") ||
    text.includes("investment") ||
    text.includes("finance") ||
    text.includes("rupee") ||
    text.includes("trade")
  ) {

    return "Business";

  }


  // EDUCATION

  if (
    text.includes("education") ||
    text.includes("school") ||
    text.includes("college") ||
    text.includes("university") ||
    text.includes("student") ||
    text.includes("exam") ||
    text.includes("neet") ||
    text.includes("academic") ||
    text.includes("teacher")
  ) {

    return "Education";

  }


  // TAMIL NADU

  if (
    text.includes("tamil nadu") ||
    text.includes("chennai") ||
    text.includes("madurai") ||
    text.includes("coimbatore") ||
    text.includes("salem") ||
    text.includes("trichy") ||
    text.includes("tiruchirappalli") ||
    text.includes("tiruppur") ||
    text.includes("erode") ||
    text.includes("vellore") ||
    text.includes("thoothukudi") ||
    text.includes("tirunelveli")
  ) {

    return "Tamil Nadu";

  }


  // INDIA

  if (
    text.includes("india") ||
    text.includes("delhi") ||
    text.includes("mumbai") ||
    text.includes("kerala") ||
    text.includes("karnataka") ||
    text.includes("andhra pradesh") ||
    text.includes("telangana") ||
    text.includes("uttar pradesh") ||
    text.includes("maharashtra")
  ) {

    return "India";

  }


  // WORLD

  if (
    text.includes("usa") ||
    text.includes("united states") ||
    text.includes("america") ||
    text.includes("uk") ||
    text.includes("united kingdom") ||
    text.includes("china") ||
    text.includes("russia") ||
    text.includes("pakistan") ||
    text.includes("israel") ||
    text.includes("iran") ||
    text.includes("europe") ||
    text.includes("world") ||
    text.includes("international")
  ) {

    return "World";

  }


  return "Tamil Nadu";

}


// =====================================================
// DELETE AUTOMATIC NEWS OLDER THAN 20 DAYS
// =====================================================

async function deleteOldNews() {

  console.log(
    "🧹 Checking automaticNews for articles older than 20 days..."
  );

  const cutoffDate =
    new Date();

  cutoffDate.setDate(
    cutoffDate.getDate() - 20
  );

  const snapshot =
    await db
      .collection("automaticNews")
      .get();

  if (snapshot.empty) {

    console.log(
      "✅ No automatic news found."
    );

    return;

  }

  const docsToDelete = [];


  for (
    const doc of snapshot.docs
  ) {

    const data =
      doc.data();

    let savedDate = null;


    if (data.savedAt) {

      if (
        typeof data.savedAt.toDate ===
        "function"
      ) {

        savedDate =
          data.savedAt.toDate();

      }

      else if (
        data.savedAt instanceof Date
      ) {

        savedDate =
          data.savedAt;

      }

    }


    if (
      !savedDate &&
      data.publishedAt
    ) {

      const publishedDate =
        new Date(
          data.publishedAt
        );

      if (
        !isNaN(
          publishedDate.getTime()
        )
      ) {

        savedDate =
          publishedDate;

      }

    }


    if (
      savedDate &&
      savedDate < cutoffDate
    ) {

      docsToDelete.push(
        doc
      );

    }

  }


  if (
    docsToDelete.length === 0
  ) {

    console.log(
      "✅ No automatic news older than 20 days found."
    );

    return;

  }


  for (
    let i = 0;
    i < docsToDelete.length;
    i += 500
  ) {

    const batch =
      db.batch();

    const chunk =
      docsToDelete.slice(
        i,
        i + 500
      );

    chunk.forEach(
      doc => {
        batch.delete(
          doc.ref
        );
      }
    );

    await batch.commit();

  }


  console.log(
    `🗑️ Deleted ${docsToDelete.length} automatic news article(s) older than 20 days.`
  );

}


// =====================================================
// FETCH NEWSDATA PAGE
// =====================================================

async function fetchPage(
  apiKey,
  page
) {

  let url =
    `https://newsdata.io/api/1/latest?q=Tamil%20Nadu&country=in&language=en&timezone=Asia/Kolkata&size=10&apikey=${apiKey}`;

  if (page) {

    url +=
      `&page=${encodeURIComponent(page)}`;

  }


  const response =
    await fetch(url);


  if (!response.ok) {

    throw new Error(
      `NewsData API request failed: ${response.status}`
    );

  }


  const data =
    await response.json();


  if (
    data.status === "error"
  ) {

    throw new Error(
      data.message ||
      "NewsData API returned an error."
    );

  }


  return data;

}


// =====================================================
// FETCH AVAILABLE ARTICLES
// =====================================================

async function getAvailableArticles(
  apiKey
) {

  const allArticles = [];

  const seenIds =
    new Set();

  let page = null;

  const MAX_PAGES = 5;


  for (
    let pageNumber = 1;
    pageNumber <= MAX_PAGES;
    pageNumber++
  ) {

    console.log(
      `📄 Fetching NewsData page ${pageNumber}...`
    );


    const data =
      await fetchPage(
        apiKey,
        page
      );


    const articles =
      data.results || [];


    console.log(
      `Page ${pageNumber}: ${articles.length} article(s)`
    );


    for (
      const article of articles
    ) {

      const id =
        article.article_id ||
        article.link ||
        article.title;


      if (
        !seenIds.has(id)
      ) {

        seenIds.add(id);

        allArticles.push(
          article
        );

        console.log(
          `${article.pubDate} | ${article.title}`
        );

      }

    }


    page =
      data.nextPage || null;


    if (!page) {

      console.log(
        "ℹ️ No more NewsData pages available."
      );

      break;

    }

  }


  return allArticles;

}


// =====================================================
// GET FIRESTORE DOCUMENT ID
// =====================================================

function getArticleId(article) {

  if (
    article.article_id
  ) {

    return article.article_id;

  }


  return Buffer.from(
    article.link ||
    article.title ||
    Date.now().toString()
  )
    .toString("base64")
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .slice(0, 50);

}


// =====================================================
// SAVE ARTICLES
// =====================================================

async function saveArticles(
  articles,
  batchName
) {

  if (
    articles.length === 0
  ) {

    console.log(
      `ℹ️ No ${batchName} articles to save.`
    );

    return 0;

  }


  const uniqueArticles = [];

  const seenIds =
    new Set();


  for (
    const article of articles
  ) {

    const id =
      getArticleId(article);


    if (
      seenIds.has(id)
    ) {

      continue;

    }


    seenIds.add(id);

    uniqueArticles.push(
      article
    );


    if (
      uniqueArticles.length >= 10
    ) {

      break;

    }

  }


  console.log(
    `💾 Processing ${uniqueArticles.length} ${batchName} article(s)...`
  );


  const batch =
    db.batch();


  let saveCount = 0;


  for (
    const article of uniqueArticles
  ) {

    const articleId =
      getArticleId(article);


    const newsRef =
      db
        .collection("automaticNews")
        .doc(articleId);


    const existingDoc =
      await newsRef.get();


    let savedAt;


    if (
      existingDoc.exists &&
      existingDoc.data().savedAt
    ) {

      savedAt =
        existingDoc.data().savedAt;

    }

    else {

      savedAt =
        admin.firestore
          .FieldValue
          .serverTimestamp();

    }


    const category =
      getCategory(article);


    console.log(
      `✅ ${batchName}: ${article.title}`
    );


    batch.set(
      newsRef,
      {

        title:
          article.title ||
          "Untitled",

        description:
          article.description ||
          "",

        source:
          article.source_name ||
          "Unknown source",

        sourceUrl:
          article.link ||
          "",

        publishedAt:
          article.pubDate ||
          "",

        savedAt:

          savedAt,

        category:

          category,

        imageUrl:
          article.image_url ||
          "",

        updatedAt:
          admin.firestore
            .FieldValue
            .serverTimestamp()

      },
      {
        merge: true
      }
    );


    saveCount++;

  }


  await batch.commit();


  console.log(
    `✅ ${saveCount} ${batchName} article(s) saved to automaticNews.`
  );


  return saveCount;

}


// =====================================================
// AUTO MODE
// =====================================================

async function processAuto(
  articles
) {

  const today =
    makeDateString(
      currentYear,
      currentMonth,
      currentDay
    );


  const previous =
    getPreviousDate(
      currentYear,
      currentMonth,
      currentDay
    );


  const previousDate =
    makeDateString(
      previous.year,
      previous.month,
      previous.day
    );


  const f1 = [];
  const f2 = [];
  const f3 = [];


  for (
    const article of articles
  ) {

    const india =
      getArticleIST(article);


    if (!india) {

      continue;

    }


    const articleDate =
      makeDateString(
        india.year,
        india.month,
        india.day
      );


    const articleBatch =
      getArticleBatch(
        article
      );


    if (!articleBatch) {

      continue;

    }


    // Normal current-day articles
    if (
      articleDate === today
    ) {

      if (
        articleBatch === "F1"
      ) {

        f1.push(article);

      }

      else if (
        articleBatch === "F2"
      ) {

        f2.push(article);

      }

      else if (
        articleBatch === "F3"
      ) {

        f3.push(article);

      }

    }


    // ONLY F3 from previous day may be
    // accepted after midnight.
    else if (
      articleDate === previousDate &&
      articleBatch === "F3" &&
      currentHour < 6
    ) {

      f3.push(article);

    }

  }


  console.log(
    `📊 AUTO F1 matches: ${f1.length}`
  );

  console.log(
    `📊 AUTO F2 matches: ${f2.length}`
  );

  console.log(
    `📊 AUTO F3 matches: ${f3.length}`
  );


  await saveArticles(
    f1,
    "F1"
  );

  await saveArticles(
    f2,
    "F2"
  );

  await saveArticles(
    f3,
    "F3"
  );

}


// =====================================================
// MANUAL MODE
// =====================================================

async function processManual(
  articles,
  batchName
) {

  if (
    !BATCHES[batchName]
  ) {

    console.log(
      "❌ Invalid manual batch."
    );

    return;

  }


  const batch =
    BATCHES[batchName];


  const targetDate =
    makeDateString(
      currentYear,
      currentMonth,
      currentDay
    );


  let actualTargetDate =
    targetDate;


  // Delayed F3 after midnight
  if (
    batchName === "F3" &&
    currentHour < 6
  ) {

    const previous =
      getPreviousDate(
        currentYear,
        currentMonth,
        currentDay
      );


    actualTargetDate =
      makeDateString(
        previous.year,
        previous.month,
        previous.day
      );


    console.log(
      "⚠️ Manual F3 run after midnight."
    );

  }


  const matches =
    articles.filter(
      article => {

        const india =
          getArticleIST(
            article
          );


        if (!india) {

          return false;

        }


        const articleDate =
          makeDateString(
            india.year,
            india.month,
            india.day
          );


        return (
          articleDate ===
          actualTargetDate &&
          getArticleBatch(
            article
          ) === batchName
        );

      }
    );


  console.log(
    `📊 Manual ${batchName} matches: ${matches.length}`
  );


  await saveArticles(
    matches,
    batchName
  );

}


// =====================================================
// MAIN FETCH
// =====================================================

async function fetchNews() {

  const apiKey =
    process.env.NEWSDATA_API_KEY;


  if (!apiKey) {

    throw new Error(
      "NEWSDATA_API_KEY secret is missing."
    );

  }


  const requestedBatch =
    process.env.NEWS_BATCH ||
    "AUTO";


  console.log(
    "================================="
  );

  console.log(
    "TARGET DATE:",
    makeDateString(
      currentYear,
      currentMonth,
      currentDay
    )
  );

  console.log(
    "CURRENT IST:",
    `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`
  );

  console.log(
    "NEWS BATCH:",
    requestedBatch
  );

  console.log(
    "================================="
  );


  // Always perform cleanup.
  await deleteOldNews();


  console.log(
    "📰 Fetching currently available NewsData articles..."
  );


  const articles =
    await getAvailableArticles(
      apiKey
    );


  console.log(
    `📰 Total unique articles received: ${articles.length}`
  );


  if (
    requestedBatch === "AUTO"
  ) {

    await processAuto(
      articles
    );

  }

  else {

    await processManual(
      articles,
      requestedBatch
    );

  }


  console.log(
    "================================="
  );

  console.log(
    "✅ FETCH COMPLETED"
  );

  console.log(
    "================================="
  );

}


// =====================================================
// START
// =====================================================

fetchNews().catch(
  error => {

    console.error(
      "❌ Fetch failed:",
      error
    );

    process.exit(1);

  }
);