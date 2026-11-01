const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

// 1. Load service account credentials
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = require("./serviceAccountKey.json");
  }
} catch (err) {
  console.error("❌ Error loading serviceAccountKey.json:", err.message);
  process.exit(1);
}

// 2. Initialize Firebase Admin App
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

// PASTE YOUR TOKEN EXACTLY BETWEEN THE QUOTES
const YOUR_DEVICE_TOKEN = "fvnAGEUmsYYQiAlbWqOsnR:APA91bEig4zFNYWMVSLapzUE3wQIWyyh9IZkCS8CoBkHpmuHTaM5pndlTK6ZCpyuE4P6e-ZzcC9Zoyg0q5yPNmaU4KZkEiNTM-eMkKoo8TlCZSC8N0BvTOk";

async function sendTestPush() {
  console.log("Sending push notification to token:", YOUR_DEVICE_TOKEN.substring(0, 15) + "...");

  const message = {
    notification: {
      title: "⚡ Background Test Alert",
      body: "This is a direct push test. Your app is closed!",
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
      }
    },
    webpush: {
      headers: {
        Urgency: "high"
      },
      notification: {
        requireInteraction: true,
        icon: "/logo.png"
      }
    },
    token: YOUR_DEVICE_TOKEN
  };

  try {
    const response = await getMessaging().send(message);
    console.log("✅ Success! Push notification sent successfully. Message ID:", response);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

sendTestPush();