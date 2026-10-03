const admin = require("firebase-admin");
const cheerio = require("cheerio");
console.log("🔥 CURRENTS API VERSION 2 IS RUNNING 🔥");

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
  second: "2-digit",
  hour12: false
}).formatToParts(now);

function getIndiaPart(name) {
  return indiaTime.find(
    part => part.type === name
  )?.value;
}

const currentYear = Number(getIndiaPart("year"));
const currentMonth = Number(getIndiaPart("month"));
const currentDay = Number(getIndiaPart("day"));
const currentHour = Number(getIndiaPart("hour"));
const currentMinute = Number(getIndiaPart("minute"));

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
// IST → UTC
// =====================================================

function makeUTCDate(
  year,
  month,
  day,
  hour,
  minute,
  second = 0
) {
  // IST = UTC + 5:30
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour - 5,
      minute - 30,
      second
    )
  ).toISOString();
}

// =====================================================
// ARTICLE PUBLICATION DATE
// =====================================================

function getArticleDate(article) {
  if (!article || !article.published) {
    return null;
  }

  const date = new Date(article.published);

  if (isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  }).formatToParts(date);

  const result = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = Number(part.value);
    }
  }

  return {
    year: result.year,
    month: result.month,
    day: result.day,
    hour: result.hour,
    minute: result.minute,
    second: result.second
  };
}

// =====================================================
// FIND NEWS CATEGORY
// =====================================================

function getCategory(article) {
  const text = `
    ${article.title || ""}
    ${article.description || ""}
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
    text.includes("tamilnadu") ||
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
    text.includes("tirunelveli") ||
    text.includes("dindigul") ||
    text.includes("thanjavur") ||
    text.includes("kanchipuram") ||
    text.includes("cuddalore") ||
    text.includes("namakkal") ||
    text.includes("karur") ||
    text.includes("sivaganga") ||
    text.includes("virudhunagar") ||
    text.includes("ramanathapuram")
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
// SOURCE NAME
// =====================================================

function getSourceName(article) {
  if (
    article.source &&
    typeof article.source === "string"
  ) {
    return article.source;
  }

  if (!article.url) {
    return "Unknown source";
  }

  try {
    return new URL(article.url)
      .hostname
      .replace(/^www\./, "");
  } catch {
    return "Unknown source";
  }
}

// =====================================================
// DELETE AUTOMATIC NEWS OLDER THAN 20 DAYS
// =====================================================

async function deleteOldNews() {
  console.log(
    "🧹 Checking automaticNews for articles older than 20 days..."
  );

  const cutoffDate = new Date();

  cutoffDate.setDate(
    cutoffDate.getDate() - 20
  );

  const snapshot = await db
    .collection("automaticNews")
    .get();

  if (snapshot.empty) {
    console.log(
      "✅ No automatic news found."
    );
    return;
  }

  const docsToDelete = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    let savedDate = null;

    if (data.savedAt) {
      if (
        typeof data.savedAt.toDate === "function"
      ) {
        savedDate = data.savedAt.toDate();
      } else if (
        data.savedAt instanceof Date
      ) {
        savedDate = data.savedAt;
      }
    }

    if (
      !savedDate &&
      data.publishedAt
    ) {
      const publishedDate =
        new Date(data.publishedAt);

      if (
        !isNaN(publishedDate.getTime())
      ) {
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

  for (
    let i = 0;
    i < docsToDelete.length;
    i += 500
  ) {
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
// FETCH CURRENTS SEARCH
// =====================================================

async function fetchCurrents(
  apiKey,
  startDate,
  endDate
) {
  const params = new URLSearchParams({
    keywords:
      "\"Tamil Nadu\" OR Chennai OR Coimbatore OR Madurai OR Salem OR Tiruppur OR Trichy OR Tamilnadu",

    country: "IN",

    language: "en",

    start_date: startDate,

    end_date: endDate,

    page_number: "1",

    page_size: "20",

    apiKey: apiKey
  });

  const url =
    `https://api.currentsapi.services/v1/search?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(
      `Currents API request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.status === "error") {
    throw new Error(
      data.message ||
      data.msg ||
      "Currents API returned an error."
    );
  }

  return Array.isArray(data.news)
    ? data.news
    : [];
}

// =====================================================
// GET ARTICLES FOR ONE TIME WINDOW
// =====================================================
// =====================================================
// FETCH FULL ARTICLE DESCRIPTION
// =====================================================

async function fetchFullArticleDescription(url) {
  if (!url) {
    return "";
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });

    if (!response.ok) {
      console.log(
        `⚠️ Article page returned ${response.status}: ${url}`
      );
      return "";
    }

    const html = await response.text();

    const $ = cheerio.load(html);

    // Remove elements that are not article content
    $(
      "script, style, noscript, iframe, nav, header, footer, aside, form"
    ).remove();

    let paragraphs = [];

    // First try common article containers
    const selectors = [
      "article p",
      "[itemprop='articleBody'] p",
      ".article-body p",
      ".article-content p",
      ".story-body p",
      ".story-content p",
      ".post-content p",
      ".entry-content p",
      "main p"
    ];

    for (const selector of selectors) {
      const found = [];

      $(selector).each((index, element) => {
        const text = $(element)
          .text()
          .replace(/\s+/g, " ")
          .trim();

        if (text.length >= 40) {
          found.push(text);
        }
      });

      if (found.length >= 2) {
        paragraphs = found;
        break;
      }
    }

    // Fallback: collect useful paragraphs from the page
    if (paragraphs.length === 0) {
      $("p").each((index, element) => {
        const text = $(element)
          .text()
          .replace(/\s+/g, " ")
          .trim();

        if (text.length >= 40) {
          paragraphs.push(text);
        }
      });
    }

    if (paragraphs.length === 0) {
      return "";
    }

    // Remove duplicate paragraphs
    paragraphs = [...new Set(paragraphs)];

    // Keep the first useful article paragraphs.
    // This prevents menus, comments and unrelated page text
    // from becoming the news description.
    const description = paragraphs
      .slice(0, 8)
      .join(" ")
      .trim();

    // Limit extremely long pages
    return description.slice(0, 5000);

  } catch (error) {
    console.log(
      `⚠️ Could not fetch article content: ${url}`
    );

    return "";
  }
}
async function getArticlesForWindow(
  apiKey,
  dateInfo,
  batchName
) {
  const batch = BATCHES[batchName];

  if (!batch) {
    throw new Error(
      `Unknown batch: ${batchName}`
    );
  }

  const startDate = makeUTCDate(
    dateInfo.year,
    dateInfo.month,
    dateInfo.day,
    batch.startHour,
    batch.startMinute,
    0
  );

  // One minute after the end boundary
  const endDate = makeUTCDate(
    dateInfo.year,
    dateInfo.month,
    dateInfo.day,
    batch.endHour,
    batch.endMinute + 1,
    0
  );

  console.log(
    `🔎 Searching Currents for ${batchName}`
  );

  console.log(
    `   IST window: ${makeDateString(
      dateInfo.year,
      dateInfo.month,
      dateInfo.day
    )} ${String(batch.startHour).padStart(2, "0")}:${String(batch.startMinute).padStart(2, "0")} - ${String(batch.endHour).padStart(2, "0")}:${String(batch.endMinute).padStart(2, "0")}`
  );

  console.log(
    `   UTC search: ${startDate} → ${endDate}`
  );

  const articles = await fetchCurrents(
    apiKey,
    startDate,
    endDate
  );

  console.log(
    `   Currents returned: ${articles.length}`
  );

  return articles;
}

// =====================================================
// EXACT ARTICLE MATCH
// =====================================================

function articleMatches(
  article,
  targetDate,
  batchName
) {
  const india = getArticleDate(article);

  if (!india) {
    return false;
  }

  // -----------------------------------------------
  // 1. Check calendar date in IST
  // -----------------------------------------------

  const articleDate = makeDateString(
    india.year,
    india.month,
    india.day
  );

  if (articleDate !== targetDate) {
    return false;
  }

  // -----------------------------------------------
  // 2. Convert article time to minutes
  // -----------------------------------------------

  const articleMinutes =
    india.hour * 60 + india.minute;

  // -----------------------------------------------
  // 3. Get selected batch
  // -----------------------------------------------

  const batch = BATCHES[batchName];

  if (!batch) {
    return false;
  }

  const startMinutes =
    batch.startHour * 60 +
    batch.startMinute;

  const endMinutes =
    batch.endHour * 60 +
    batch.endMinute;

  // -----------------------------------------------
  // 4. Exact batch time
  // -----------------------------------------------

  return (
    articleMinutes >= startMinutes &&
    articleMinutes <= endMinutes
  );
}

// =====================================================
// SAVE ARTICLES
// =====================================================

async function saveArticles(
  articles,
  batchName
) {
  if (articles.length === 0) {
    console.log(
      `ℹ️ No ${batchName} articles to save.`
    );

    return 0;
  }

  const uniqueArticles = [];
  const seenIds = new Set();

  for (const article of articles) {
    const id =
      article.id ||
      article.url ||
      article.title;

    if (!id) {
      continue;
    }

    if (seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    uniqueArticles.push(article);

    // Maximum 10 per fetch
    if (uniqueArticles.length >= 10) {
      break;
    }
  }

  console.log(
    `💾 Processing ${uniqueArticles.length} ${batchName} article(s)...`
  );

  if (uniqueArticles.length === 0) {
    return 0;
  }

  const batch = db.batch();

  let saveCount = 0;

  for (const article of uniqueArticles) {
    const articleId = (
      article.id ||
      Buffer.from(
        article.url ||
        article.title ||
        Date.now().toString()
      )
        .toString("base64")
        .replace(
          /[^a-zA-Z0-9]/g,
          ""
        )
        .slice(0, 50)
    );

    const newsRef = db
      .collection("automaticNews")
      .doc(articleId);

    const existingDoc =
      await newsRef.get();

    let savedAt;

    if (
      existingDoc.exists &&
      existingDoc.data().savedAt
    ) {
      // Preserve original savedAt
      savedAt =
        existingDoc.data().savedAt;
    } else {
      // New article
      savedAt =
        admin.firestore.FieldValue.serverTimestamp();
    }

    const category =
  getCategory(article);

console.log(
  `📰 Fetching full article content: ${article.title}`
);

const fullDescription =
  await fetchFullArticleDescription(
    article.url
  );

const finalDescription =
  fullDescription ||
  article.description ||
  "";

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
          finalDescription,

        source:
          getSourceName(article),

        sourceUrl:
          article.url ||
          "",

        publishedAt:
          article.published ||
          "",

        savedAt,

        category,

        imageUrl:
          article.image ||
          "",

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp()
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
// PROCESS ONE BATCH
// =====================================================

async function processBatch(
  apiKey,
  dateInfo,
  batchName
) {
  const targetDate =
    makeDateString(
      dateInfo.year,
      dateInfo.month,
      dateInfo.day
    );

  const articles =
    await getArticlesForWindow(
      apiKey,
      dateInfo,
      batchName
    );

  const matches =
    articles.filter(article =>
      articleMatches(
        article,
        targetDate,
        batchName
      )
    );

  console.log(
    `📊 ${batchName} exact matches: ${matches.length}`
  );

  return saveArticles(
    matches,
    batchName
  );
}

// =====================================================
// AUTO MODE
// =====================================================

async function processAuto(apiKey) {
  const today = {
    year: currentYear,
    month: currentMonth,
    day: currentDay
  };

  const previous =
    getPreviousDate(
      currentYear,
      currentMonth,
      currentDay
    );

  console.log(
    "🤖 AUTO MODE: checking today's F1, F2 and F3 windows..."
  );

  // Today's F1
  await processBatch(
    apiKey,
    today,
    "F1"
  );

  // Today's F2
  await processBatch(
    apiKey,
    today,
    "F2"
  );

  // Today's F3
  await processBatch(
    apiKey,
    today,
    "F3"
  );

  // ---------------------------------------------------
  // ONLY previous-day F3 is allowed after midnight.
  // ---------------------------------------------------

  if (currentHour < 6) {
    console.log(
      "🌙 Before 6 AM IST: checking previous day's F3..."
    );

    await processBatch(
      apiKey,
      previous,
      "F3"
    );
  }
}

// =====================================================
// MANUAL MODE
// =====================================================

async function processManual(
  apiKey,
  batchName
) {
  if (!BATCHES[batchName]) {
    console.log(
      "❌ Invalid manual batch."
    );

    return;
  }

  let target = {
    year: currentYear,
    month: currentMonth,
    day: currentDay
  };

  // F3 after midnight belongs to
  // previous calendar day.
  if (
    batchName === "F3" &&
    currentHour < 6
  ) {
    target =
      getPreviousDate(
        currentYear,
        currentMonth,
        currentDay
      );

    console.log(
      "⚠️ Manual F3 after midnight: using previous day."
    );
  }

  await processBatch(
    apiKey,
    target,
    batchName
  );
}

// =====================================================
// MAIN FETCH
// =====================================================

async function fetchNews() {
  const apiKey =
    process.env.CURRENTS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "CURRENTS_API_KEY secret is missing."
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

  // Cleanup ONLY automaticNews
  await deleteOldNews();

  if (
    requestedBatch === "AUTO"
  ) {
    await processAuto(apiKey);
  } else {
    await processManual(
      apiKey,
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

fetchNews().catch(error => {
  console.error(
    "❌ Fetch failed:",
    error
  );

  process.exit(1);
});