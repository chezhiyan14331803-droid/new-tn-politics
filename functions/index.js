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