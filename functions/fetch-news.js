const admin = require("firebase-admin");

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

  console.log("Fetching latest news...");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `News API request failed: ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    console.log("No news articles found.");
    return;
  }

  console.log(`Found ${data.results.length} articles.`);

  const batch = db.batch();

  for (const article of data.results.slice(0, 10)) {
    const articleId =
      article.article_id ||
      Buffer.from(article.link || article.title)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 50);

    const newsRef = db
      .collection("automaticNews")
      .doc(articleId);

    batch.set(
      newsRef,
      {
        title: article.title || "Untitled",
        description: article.description || "",
        source: article.source_name || "Unknown source",
        sourceUrl: article.link || "",
        publishedAt: article.pubDate || "",
        category: "Tamil Nadu",
        imageUrl: article.image_url || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  }

  await batch.commit();

  console.log("News successfully saved to automaticNews.");
}

fetchNews().catch((error) => {
  console.error(error);
  process.exit(1);
});