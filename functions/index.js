const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");
const Parser = require("rss-parser");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

const db = admin.firestore();
const parser = new Parser();

// Official PIB RSS feed
const RSS_URL =
    "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1";

exports.fetchNews = onRequest(async (req, res) => {
    try {
        const feed = await parser.parseURL(RSS_URL);

        let added = 0;

        for (const item of feed.items.slice(0, 10)) {

            if (!item.title || !item.link) {
                continue;
            }

            // Use the RSS item's GUID/link as a stable document ID
            const documentId = Buffer
                .from(item.link)
                .toString("base64")
                .replace(/[^a-zA-Z0-9]/g, "")
                .substring(0, 100);

            const newsData = {
                title: item.title,
                description: item.contentSnippet || "",
                category: "India",
                source: "Press Information Bureau",
                sourceUrl: item.link,
                publishedAt: item.pubDate || new Date().toISOString(),
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await db
                .collection("news")
                .doc(documentId)
                .set(newsData, { merge: true });

            added++;
        }

        res.status(200).json({
            success: true,
            message: `${added} news items processed`
        });

    } catch (error) {
        console.error("News fetch error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

// 1. Endpoint to safely subscribe client tokens to the topic
exports.subscribeToTopic = functions.https.onRequest(async (req, res) => {
  // Enable CORS so your frontend can call this function
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const token = req.body.token;
  if (!token) {
    res.status(400).send({ error: "Missing registration token" });
    return;
  }

  try {
    // Admin SDK handles topic subscription securely under FCM HTTP v1
    await admin.messaging().subscribeToTopic(token, "news_updates");
    console.log("Successfully subscribed token to topic news_updates:", token);
    res.status(200).send({ success: true, message: "Subscribed to news_updates" });
  } catch (error) {
    console.error("Error subscribing token to topic:", error);
    res.status(500).send({ error: error.message });
  }
});
// 2. Automated Trigger: Fires whenever a new document is created in Firestore
exports.sendAutomaticNewsNotification = functions.firestore
  .document("news_cards/{cardId}") // Replace "news_cards" with your exact Firestore collection name
  .onCreate(async (snapshot, context) => {
    const newsData = snapshot.data();

    // Payload formatted for FCM HTTP v1
    const message = {
      notification: {
        title: newsData.title || newsData.headline || "TN Politics - Breaking News",
        body: newsData.summary || newsData.description || "Tap to read the latest updates.",
      },
      topic: "news_updates" // Targets all topic subscribers
    };

    if (newsData.imageUrl || newsData.image) {
      message.notification.image = newsData.imageUrl || newsData.image;
    }

    try {
      const response = await admin.messaging().send(message);
      console.log("Successfully sent automated push notification:", response);
      return response;
    } catch (error) {
      console.error("Error sending automated notification:", error);
    }
  });