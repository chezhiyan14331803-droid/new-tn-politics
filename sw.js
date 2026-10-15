/* =========================================
   PWA SERVICE WORKER & PUSH NOTIFICATIONS
========================================= */

const CACHE_NAME = "tn-news-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/archive.html",
  "/reader.html",
  "/style.css",
  "/home-news.js",
  "/archive-news.js",
  "/reader-news.js",
  "/script.js",
  "/firebase-config.js"
];

// 1. Install Event: Cache Static Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean Old Caches & Claim Clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Network First, Fallback to Cache
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests for same-origin static assets
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 4. Push Event: Show Breaking News Notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Breaking News Alert";
  const options = {
    body: data.body || "Click to read the latest update on Daily News Updates.",
    icon: "/logo.png",
    badge: "/logo.png",
    data: {
      url: data.url || "/"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Event: Focus or Open Target URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data ? event.notification.data.url : "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
/* =========================================
   PWA PUSH NOTIFICATION HANDLERS
========================================= */

// 1. Listen for background Push events (from FCM / server)
self.addEventListener("push", (event) => {
  let data = { title: "Daily News Update", body: "Check out the latest breaking headlines from Tamil Nadu!" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || "New breaking story published.",
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/index.html" },
    actions: [
      { action: "open", title: "📰 Read News" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "DAILY NEWS UPDATE", options)
  );
});

// 2. Handle Notification Click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});