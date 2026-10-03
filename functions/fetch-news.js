const admin = require("firebase-admin");

console.log("🔥 CATEGORY VERSION 3 IS RUNNING 🔥");

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
    // that were created before savedAt was added
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
    console.log("✅ No automatic news older than 20 days found.");
    return;
  }

  // Firestore batch limit is 500 operations.
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


  // =====================================================
  // POLITICS
  // =====================================================

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


  // =====================================================
  // SPORTS
  // =====================================================

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


  // =====================================================
  // TECHNOLOGY
  // =====================================================

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


  // =====================================================
  // BUSINESS
  // =====================================================

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


  // =====================================================
  // EDUCATION
  // =====================================================

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


  // =====================================================
  // TAMIL NADU
  // =====================================================

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


  // =====================================================
  // INDIA
  // =====================================================

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


  // =====================================================
  // WORLD
  // =====================================================

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


  // =====================================================
  // DEFAULT
  // =====================================================

  return "Tamil Nadu";
}


// =====================================================
// TODAY'S DATE + FETCH WINDOW
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

const getPart = (name) =>
  indiaTime.find(
    part => part.type === name
  )?.value;

const year = Number(getPart("year"));
const month = Number(getPart("month"));
const day = Number(getPart("day"));
const hour = Number(getPart("hour"));
const minute = Number(getPart("minute"));

let today =
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

let fetchBatch = process.env.NEWS_BATCH || "";

let startHour = 0;
let startMinute = 0;

let endHour = 0;
let endMinute = 0;


// =====================================================
// SCHEDULED BATCH
// =====================================================

if (fetchBatch === "F1") {

  // News published between 6:00 AM and 10:00 AM
  startHour = 6;
  startMinute = 0;

  endHour = 10;
  endMinute = 0;

}

else if (fetchBatch === "F2") {

  // News published between 11:00 AM and 5:30 PM
  startHour = 11;
  startMinute = 0;

  endHour = 17;
  endMinute = 30;

}

else if (fetchBatch === "F3") {

  // News published between 6:00 PM and 10:00 PM
  startHour = 18;
  startMinute = 0;

  endHour = 22;
  endMinute = 0;


  // ---------------------------------------------------
  // IMPORTANT:
  // If GitHub delays the F3 workflow until after
  // midnight, the F3 batch belongs to yesterday.
  // ---------------------------------------------------

  if (hour < 6) {

    const previousDay = new Date(
      year,
      month - 1,
      day
    );

    previousDay.setDate(
      previousDay.getDate() - 1
    );

    today =
      `${previousDay.getFullYear()}-${String(
        previousDay.getMonth() + 1
      ).padStart(2, "0")}-${String(
        previousDay.getDate()
      ).padStart(2, "0")}`;

    console.log(
      "🌙 F3 workflow was delayed past midnight."
    );

    console.log(
      "📅 Using previous day's date for F3:",
      today
    );
  }

}


// =====================================================
// MANUAL RUN FALLBACK
// =====================================================

// If NEWS_BATCH is empty, this is most likely a
// manual workflow run.
//
// Keep the old time-based behaviour for manual testing.

if (!fetchBatch) {

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

  else if (
    hour >= 22
  ) {

    fetchBatch = "F3";

    startHour = 18;
    startMinute = 0;

    endHour = 22;
    endMinute = 0;

  }

}


console.log("=================================");
console.log("TODAY / TARGET DATE:", today);
console.log("BATCH:", fetchBatch);
console.log("CURRENT IST HOUR:", hour);
console.log("CURRENT IST MINUTE:", minute);
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

    // Still perform cleanup
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


  // =====================================================
  // KEEP ONLY TODAY'S ARTICLES IN CURRENT BATCH
  // =====================================================

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


      const getPublishedPart =
        (name) =>
          indiaPublished.find(
            part => part.type === name
          )?.value;


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


      // ===============================================
      // NEVER ACCEPT PREVIOUS-DAY NEWS
      // ===============================================

      if (
        publishedDate !== today
      ) {
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
        publishedMinutes >=
          startMinutes &&
        publishedMinutes <=
          endMinutes
      );
    });


  console.log(
    `Articles received: ${articles.length}`
  );


  console.log(
    `Articles matching ${fetchBatch}: ${filteredArticles.length}`
  );


  // =====================================================
  // DELETE OLD NEWS
  // =====================================================

  await deleteOldNews();


  // =====================================================
  // NO MATCHING NEWS
  // =====================================================

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


  // =====================================================
  // FIRESTORE BATCH
  // =====================================================

  const batch =
    db.batch();


  // =====================================================
  // SAVE ONLY FILTERED ARTICLES
  // =====================================================

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
        .collection(
          "automaticNews"
        )
        .doc(articleId);


    const category =
      getCategory(article);


    console.log(
      `${article.title} → ${category}`
    );


    // =================================================
    // CHECK WHETHER THIS IS A NEW ARTICLE
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


  // =====================================================
  // COMMIT
  // =====================================================

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