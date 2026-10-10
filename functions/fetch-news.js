const admin = require("firebase-admin");

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT secret is missing.");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Known Tamil Nadu Districts for Auto-Tagging
const DISTRICTS = [
  "Chennai", "Coimbatore", "Madurai", "Salem", "Trichy", "Tiruchirappalli",
  "Tiruppur", "Erode", "Tirunelveli", "Vellore", "Thanjavur", "Dindigul",
  "Kanchipuram", "Cuddalore", "Karur", "Nagercoil", "Kanyakumari", "Tuticorin",
  "Thoothukudi", "Villupuram", "Dharmapuri", "Krishnagiri", "Namakkal"
];

function detectDistrict(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  for (const district of DISTRICTS) {
    if (text.includes(district.toLowerCase())) {
      return district === "Tiruchirappalli" ? "Trichy" : district;
    }
  }
  return "General";
}

function cleanTitle(title) {
  return title.trim().replace(/\s+/g, " ");
}

async function fetchNews() {
  const apiKey = process.env.NEWSDATA_API_KEY;

  if (!apiKey) {
    throw new Error("NEWSDATA_API_KEY secret is missing.");
  }

  const url =
    `https://newsdata.io/api/1/latest` +
    `?apikey=${encodeURIComponent(apiKey)}` +
    `&q=Tamil%20Nadu` +
    `&country=in` +
    `&language=en`;

  console.log("Fetching latest Tamil Nadu news...");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`News API request failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    console.log("No news articles found.");
    return;
  }

  console.log(`Fetched ${data.results.length} raw articles.`);

  const batch = db.batch();
  const seenTitles = new Set();
  let savedCount = 0;

  for (const article of data.results) {
    if (!article.title) continue;

    const normalizedTitle = cleanTitle(article.title).toLowerCase();

    // Skip duplicates within the current API batch
    if (seenTitles.has(normalizedTitle)) {
      console.log(`Skipping batch duplicate: ${article.title}`);
      continue;
    }
    seenTitles.add(normalizedTitle);

    const articleId =
      article.article_id ||
      Buffer.from(article.link || article.title)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 50);

    const newsRef = db.collection("automaticNews").doc(articleId);

    const district = detectDistrict(article.title, article.description || "");

    batch.set(
      newsRef,
      {
        title: cleanTitle(article.title),
        description: article.description || "",
        source: article.source_name || "News Source",
        sourceUrl: article.link || "",
        publishedAt: article.pubDate || new Date().toISOString(),
        category: "Tamil Nadu",
        district: district,
        views: 0,
        imageUrl: article.image_url || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    savedCount++;
    if (savedCount >= 10) break; // Limit batch size
  }

  await batch.commit();

  console.log(`Successfully processed & saved ${savedCount} smart articles to automaticNews.`);
}

fetchNews().catch((error) => {
  console.error("Fetch Execution Error:", error);
  process.exit(1);
});