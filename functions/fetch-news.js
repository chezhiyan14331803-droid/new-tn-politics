const admin = require("firebase-admin");

console.log("🔥 CATEGORY VERSION 5 IS RUNNING 🔥");

// =====================================================
// FIREBASE INITIALIZATION
// =====================================================

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT secret is missing.");
}

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// =====================================================
// DELETE AUTOMATIC NEWS OLDER THAN 20 DAYS
// =====================================================

async function deleteOldNews() {
  console.log("🧹 Checking for automatic news older than 20 days...");

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 20);

  const snapshot = await db
    .collection("automaticNews")
    .get();

  if (snapshot.empty) {
    console.log("✅ No automatic news found.");
    return;
  }

  const docsToDelete = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    let savedDate = null;

    if (data.savedAt) {
      if (typeof data.savedAt.toDate === "function") {
        savedDate = data.savedAt.toDate();
      } else if (data.savedAt instanceof Date) {
        savedDate = data.savedAt;
      }
    }

    if (!savedDate && data.publishedAt) {
      const publishedDate = new Date(data.publishedAt);

      if (!isNaN(publishedDate.getTime())) {
        savedDate = publishedDate;
      }
    }

    if (savedDate && savedDate < cutoffDate) {
      docsToDelete.push(doc);
    }
  }

  if (docsToDelete.length === 0) {
    console.log(
      "✅ No automatic news older than 20 days found."
    );
    return;
  }

  for (let i = 0; i < docsToDelete.length; i += 500) {
    const batch = db.batch();

    const chunk = docsToDelete.slice(
      i,
      i + 500
    );

    chunk.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  console.log(
    `🗑️ Deleted ${docsToDelete.length} automatic news article(s) older than 20 days.`
  );
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
    text.includes("mp") ||
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
// CURRENT IST DATE AND TIME
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

function getPart(name) {
  return indiaTime.find(
    part => part.type === name
  )?.value;
}

const year = Number(getPart("year"));
const month = Number(getPart("month"));
const day = Number(getPart("day"));
const hour = Number(getPart("hour"));
const minute = Number(getPart("minute"));

// =====================================================
// PREVIOUS DATE
// =====================================================

function getPreviousDate(year, month, day) {

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
// TARGET DATE
// =====================================================

let targetYear = year;
let targetMonth = month;
let targetDay = day;

let today =
  `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;

// =====================================================
// BATCH SETTINGS
// =====================================================

let fetchBatch = process.env.NEWS_BATCH || "";

let startHour = 0;
let startMinute = 0;

let endHour = 0;
let endMinute = 0;

// =====================================================
// F1
// 06:00 AM - 10:00 AM
// =====================================================

if (fetchBatch === "F1") {

  startHour = 6;
  startMinute = 0;

  endHour = 10;
  endMinute = 0;
}

// =====================================================
// F2
// 11:00 AM - 05:30 PM
// =====================================================

else if (fetchBatch === "F2") {

  startHour = 11;
  startMinute = 0;

  endHour = 17;
  endMinute = 30;
}

// =====================================================
// F3
// 06:00 PM - 10:00 PM
// =====================================================

else if (fetchBatch === "F3") {

  startHour = 18;
  startMinute = 0;

  endHour = 22;
  endMinute = 0;

  // Delayed F3 after midnight
  if (hour < 6) {

    const previousDate =
      getPreviousDate(
        year,
        month,
        day
      );

    targetYear = previousDate.year;
    targetMonth = previousDate.month;
    targetDay = previousDate.day;

    today =
      `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;

    console.log(
      "⚠️ F3 workflow was delayed past midnight."
    );

    console.log(
      "Fetching previous day's F3 news:",
      today
    );
  }
}

// =====================================================
// MANUAL RUN FALLBACK
// =====================================================

else {

  console.log(
    "⚠️ NEWS_BATCH was not provided."
  );

  console.log(
    "Using current IST time for manual run."
  );

  if (hour >= 10 && hour < 12) {

    fetchBatch = "F1";

    startHour = 6;
    startMinute = 0;

    endHour = 10;
    endMinute = 0;

  } else if (hour >= 18 && hour < 20) {

    fetchBatch = "F2";

    startHour = 11;
    startMinute = 0;

    endHour = 17;
    endMinute = 30;

  } else if (hour >= 22) {

    fetchBatch = "F3";

    startHour = 18;
    startMinute = 0;

    endHour = 22;
    endMinute = 0;

  } else if (hour < 6) {

    fetchBatch = "F3";

    startHour = 18;
    startMinute = 0;

    endHour = 22;
    endMinute = 0;

    const previousDate =
      getPreviousDate(
        year,
        month,
        day
      );

    targetYear = previousDate.year;
    targetMonth = previousDate.month;
    targetDay = previousDate.day;

    today =
      `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;

    console.log(
      "⚠️ Manual F3 run detected after midnight."
    );

    console.log(
      "Fetching previous day's F3 news:",
      today
    );
  }
}

// =====================================================
// FINAL BATCH LOG
// =====================================================

console.log("=================================");
console.log("TARGET DATE:", today);
console.log("BATCH:", fetchBatch);
console.log("CURRENT IST HOUR:", hour);
console.log("CURRENT IST MINUTE:", minute);

console.log(
  "FETCH WINDOW:",
  `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`,
  "to",
  `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`
);

console.log("=================================");

// =====================================================
// CHECK WHETHER ARTICLE MATCHES BATCH
// =====================================================

function articleMatchesBatch(article) {

  if (!article.pubDate) {
    return false;
  }

  const published =
    new Date(article.pubDate);

  if (isNaN(published.getTime())) {
    return false;
  }

  const indiaPublished =
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(published);

  function getPublishedPart(name) {
    return indiaPublished.find(
      part => part.type === name
    )?.value;
  }

  const publishedYear =
    Number(getPublishedPart("year"));

  const publishedMonth =
    Number(getPublishedPart("month"));

  const publishedDay =
    Number(getPublishedPart("day"));

  const publishedHour =
    Number(getPublishedPart("hour"));

  const publishedMinute =
    Number(getPublishedPart("minute"));

  const publishedDate =
    `${publishedYear}-${String(publishedMonth).padStart(2, "0")}-${String(publishedDay).padStart(2, "0")}`;

  if (publishedDate !== today) {
    return false;
  }

  const publishedMinutes =
    publishedHour * 60 +
    publishedMinute;

  const startMinutes =
    startHour * 60 +
    startMinute;

  const endMinutes =
    endHour * 60 +
    endMinute;

  return (
    publishedMinutes >= startMinutes &&
    publishedMinutes <= endMinutes
  );
}

// =====================================================
// FETCH ONE PAGE
// =====================================================

async function fetchPage(apiKey, page) {

  let url =
    `https://newsdata.io/api/1/latest?q=Tamil%20Nadu&country=in&language=en&timezone=Asia/Kolkata&size=10&apikey=${apiKey}`;

  if (page) {
    url += `&page=${encodeURIComponent(page)}`;
  }

  const response =
    await fetch(url);

  if (!response.ok) {

    throw new Error(
      `News API request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  if (data.status === "error") {

    throw new Error(
      data.message ||
      "NewsData API returned an error."
    );
  }

  return data;
}

// =====================================================
// FETCH NEWS WITH PAGINATION
// =====================================================

async function getMatchingArticles(apiKey) {

  const matchingArticles = [];

  let page = null;

  // Maximum pages per workflow run.
  // This prevents excessive API credit usage.
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

     articles.forEach((article, index) => {
  console.log(
    `PAGE ${pageNumber} - ${index + 1}: ${article.pubDate} | ${article.title}`
  );
});
    for (const article of articles) {

      if (
        articleMatchesBatch(article)
      ) {

        matchingArticles.push(article);

        console.log(
          `✅ MATCH: ${article.pubDate} | ${article.title}`
        );
      }
    }

    // We only need 10 saved articles.
    if (
      matchingArticles.length >= 10
    ) {
      break;
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

  return matchingArticles;
}

// =====================================================
// FETCH NEWS
// =====================================================

async function fetchNews() {

  if (!fetchBatch) {

    console.log(
      "⏭️ Current time is outside the scheduled fetch windows."
    );

    console.log(
      "No news will be saved."
    );

    await deleteOldNews();

    return;
  }

  const apiKey =
    process.env.NEWSDATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEWSDATA_API_KEY secret is missing."
    );
  }

  console.log(
    `📰 Fetching news for ${fetchBatch}...`
  );

  const matchingArticles =
    await getMatchingArticles(
      apiKey
    );

  console.log(
    `Articles matching ${fetchBatch}: ${matchingArticles.length}`
  );

  await deleteOldNews();

  if (
    matchingArticles.length === 0
  ) {

    console.log(
      `ℹ️ No articles found for ${fetchBatch}.`
    );

    return;
  }

  // ===================================================
  // REMOVE DUPLICATES
  // ===================================================

  const uniqueArticles = [];

  const seenIds =
    new Set();

  for (
    const article of matchingArticles
  ) {

    const id =
      article.article_id ||
      article.link ||
      article.title;

    if (!seenIds.has(id)) {

      seenIds.add(id);

      uniqueArticles.push(
        article
      );
    }

    if (
      uniqueArticles.length >= 10
    ) {
      break;
    }
  }

  console.log(
    `✅ Saving ${uniqueArticles.length} article(s) from ${fetchBatch}.`
  );

  // ===================================================
  // FIRESTORE BATCH
  // ===================================================

  const batch =
    db.batch();

  // ===================================================
  // SAVE ARTICLES
  // ===================================================

  for (
    const article of uniqueArticles
  ) {

    const articleId =
      article.article_id ||
      Buffer.from(
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

    const newsRef =
      db
        .collection("automaticNews")
        .doc(articleId);

    const category =
      getCategory(article);

    console.log(
      `${article.title} → ${category}`
    );

    const existingDoc =
      await newsRef.get();

    let savedAt;

    if (
      existingDoc.exists &&
      existingDoc.data().savedAt
    ) {

      savedAt =
        existingDoc.data().savedAt;

    } else {

      savedAt =
        admin.firestore.FieldValue
          .serverTimestamp();
    }

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
          admin.firestore.FieldValue
            .serverTimestamp()

      },
      {
        merge: true
      }
    );
  }

  await batch.commit();

  console.log(
    "✅ News successfully saved to automaticNews."
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