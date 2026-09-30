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


/* =========================================
   FIND NEWS CATEGORY
========================================= */

function getCategory(article) {

  const text = `
    ${article.title || ""}
    ${article.description || ""}
    ${article.content || ""}
    ${Array.isArray(article.category)
      ? article.category.join(" ")
      : article.category || ""}
  `.toLowerCase();


  /* POLITICS */

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


  /* SPORTS */

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


  /* TECHNOLOGY */

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


  /* BUSINESS */

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


  /* EDUCATION */

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


  /* TAMIL NADU */

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


  /* INDIA */

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


  /* WORLD */

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


  /* DEFAULT */

  return "Tamil Nadu";
}


/* =========================================
   FETCH NEWS
========================================= */

async function fetchNews() {

  const apiKey =
    process.env.NEWSDATA_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEWSDATA_API_KEY secret is missing."
    );
  }


  const url =
    `https://newsdata.io/api/1/latest` +
    `?apikey=${encodeURIComponent(apiKey)}` +
    `&q=Tamil%20Nadu` +
    `&country=in` +
    `&language=en`;


  console.log(
    "Fetching latest news..."
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


  if (
    !data.results ||
    data.results.length === 0
  ) {

    console.log(
      "No news articles found."
    );

    return;
  }


  console.log(
    `Found ${data.results.length} articles.`
  );


  const batch =
    db.batch();


  for (
    const article of
    data.results.slice(0, 10)
  ) {

    const articleId =
      article.article_id ||
      Buffer.from(
        article.link ||
        article.title
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
    "News successfully saved to automaticNews."
  );
}


fetchNews().catch(
  error => {

    console.error(error);

    process.exit(1);
  }
);