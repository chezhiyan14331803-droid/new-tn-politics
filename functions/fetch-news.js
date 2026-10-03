const admin = require("firebase-admin");

console.log("🔥 CATEGORY VERSION 4 IS RUNNING 🔥");

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

    // New documents use savedAt
    if (data.savedAt) {
      if (typeof data.savedAt.toDate === "function") {
        savedDate = data.savedAt.toDate();
      } else if (data.savedAt instanceof Date) {
        savedDate = data.savedAt;
      }
    }

    // Fallback for old documents
    if (!savedDate && data.publishedAt) {
      const publishedDate = new Date(data.publishedAt);

      if (!isNaN(publishedDate.getTime())) {
        savedDate = publishedDate;
      }
    }

    if (
      savedDate &&
      savedDate < cutoffDate
    ) {
      docsToDelete.push(doc);
    }
  }

  if (docsToDelete.length === 0) {
    console.log(
      "✅ No automatic news older than 20 days found."
    );
    return;
  }

  // Firestore batch limit is 500 operations
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

  // ===================================================
  // POLITICS
  // ===================================================

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

  // ===================================================
  // SPORTS
  // ===================================================

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

  // ===================================================
  // TECHNOLOGY
  // ===================================================

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

  // ===================================================
  // BUSINESS
  // ===================================================

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

  // ===================================================
  // EDUCATION
  // ===================================================

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

  // ===================================================
  // TAMIL NADU
  // ===================================================

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

  // ===================================================
  // INDIA
  // ===================================================

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

  // ===================================================
  // WORLD
  // ===================================================

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

  // ===================================================
  // DEFAULT
  // ===================================================

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
// PREVIOUS DATE HELPER
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
//
// News:
// 6:00 AM - 10:00 AM IST
//
// Workflow:
// 10:30 AM IST
// =====================================================

if (fetchBatch === "F1") {

  startHour = 6;
  startMinute = 0;

  endHour = 10;
  endMinute = 0;

}

// =====================================================
// F2
//
// News:
// 11:00 AM - 5:30 PM IST
//
// Workflow:
// 6:30 PM IST
// =====================================================

else if (fetchBatch === "F2") {

  startHour = 11;
  startMinute = 0;

  endHour = 17;
  endMinute = 30;

}

// =====================================================
// F3
//
// News:
// 6:00 PM - 10:00 PM IST
//
// Workflow:
// 10:30 PM IST
//
// If GitHub delays this run until after midnight,
// fetch the previous day's F3 news.
// =====================================================

else if (fetchBatch === "F3") {

  startHour = 18;
  startMinute = 0;

  endHour = 22;
  endMinute = 0;

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
// MANUAL RUN
//
// If workflow_dispatch is used,
// NEWS_BATCH will be empty.
//
// Determine batch using current IST time.
// =====================================================

else {

  console.log(
    "⚠️ NEWS_BATCH was not provided."
  );

  console.log(
    "Using current IST time for manual run."
  );

  // ---------------------------------------------------
  // F1
  // ---------------------------------------------------

  if (
    hour >= 10 &&
    hour < 12
  ) {

    fetchBatch = "F1";

    startHour = 6;
    startMinute = 0;

    endHour = 10;
    endMinute = 0;
  }

  // ---------------------------------------------------
  // F2
  // ---------------------------------------------------

  else if (
    hour >= 18 &&
    hour < 20
  ) {

    fetchBatch = "F2";

    startHour = 11;
    startMinute = 0;

    endHour = 17;
    endMinute = 30;
  }

  // ---------------------------------------------------
  // F3
  // ---------------------------------------------------

  else if (hour >= 22) {

    fetchBatch = "F3";

    startHour = 18;
    startMinute = 0;

    endHour = 22;
    endMinute = 0;
  }

  // ---------------------------------------------------
  // F3 delayed past midnight
  // ---------------------------------------------------

  else if (hour < 6) {

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
// FETCH NEWS
// =====================================================

async function fetchNews() {

  // ===================================================
  // SAFETY CHECK
  // ===================================================

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

  // ===================================================
  // NEWS DATA API KEY
  // ===================================================

  const apiKey =
    process.env.NEWSDATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEWSDATA_API_KEY secret is missing."
    );
  }

  // ===================================================
  // NEWS DATA API
  // ===================================================

  const url =
    `https://newsdata.io/api/1/latest?q=Tamil%20Nadu&country=in&language=en&timezone=Asia/Kolkata&size=10&apikey=${apiKey}`;

  console.log(
    `📰 Fetching news for ${fetchBatch}...`
  );

  const response =
    await fetch(url);

  if (!response.ok) {

    throw new Error(
      `News API request failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  const articles =
    data.results || [];

  // ===================================================
  // FILTER ARTICLES
  // ===================================================

  const filteredArticles =
    articles.filter(article => {

      if (!article.pubDate) {
        return false;
      }

      const published =
        new Date(article.pubDate);

      if (
        isNaN(
          published.getTime()
        )
      ) {
        return false;
      }

      // -----------------------------------------------
      // Convert publication time to IST
      // -----------------------------------------------

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
        Number(
          getPublishedPart("year")
        );

      const publishedMonth =
        Number(
          getPublishedPart("month")
        );

      const publishedDay =
        Number(
          getPublishedPart("day")
        );

      const publishedHour =
        Number(
          getPublishedPart("hour")
        );

      const publishedMinute =
        Number(
          getPublishedPart("minute")
        );

      const publishedDate =
        `${publishedYear}-${String(publishedMonth).padStart(2, "0")}-${String(publishedDay).padStart(2, "0")}`;

      // -----------------------------------------------
      // Only target date
      // -----------------------------------------------

      if (
        publishedDate !== today
      ) {
        return false;
      }

      // -----------------------------------------------
      // Check batch time
      // -----------------------------------------------

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
    });

  // ===================================================
  // LOG RESULTS
  // ===================================================

  console.log(
    `Articles received: ${articles.length}`
  );

  console.log(
    `Articles matching ${fetchBatch}: ${filteredArticles.length}`
  );

  // ===================================================
  // DELETE OLD NEWS
  // ===================================================

  await deleteOldNews();

  // ===================================================
  // NO MATCHING NEWS
  // ===================================================

  if (
    filteredArticles.length === 0
  ) {

    console.log(
      `ℹ️ No articles found for ${fetchBatch}.`
    );

    return;
  }

  console.log(
    `✅ Saving ${filteredArticles.length} article(s) from ${fetchBatch}.`
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
    const article of filteredArticles.slice(0, 10)
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

    // =================================================
    // CHECK EXISTING ARTICLE
    // =================================================

    const existingDoc =
      await newsRef.get();

    let savedAt;

    if (
      existingDoc.exists &&
      existingDoc.data().savedAt
    ) {

      // Preserve original saved time
      savedAt =
        existingDoc.data().savedAt;

    } else {

      // New article
      savedAt =
        admin.firestore.FieldValue
          .serverTimestamp();
    }

    // =================================================
    // SAVE ARTICLE
    // =================================================

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

  // ===================================================
  // COMMIT TO FIRESTORE
  // ===================================================

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