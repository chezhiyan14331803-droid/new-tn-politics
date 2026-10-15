import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

const reelsContainer = document.getElementById("reelsContainer");

async function loadSnippets() {
  try {
    const newsRef = collection(db, "automaticNews");
    const q = query(newsRef, orderBy("publishedAt", "desc"), limit(15));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      reelsContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
          <p>No news snippets available right now.</p>
        </div>`;
      return;
    }

    let slidesHtml = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const articleId = docSnap.id;
      const title = data.title || "Latest Headline";
      const description = data.description || data.content || "Tap below to read the complete article details.";
      const category = data.category || "BREAKING";
      const bgImage = data.imageUrl || "logo.png";
      const readerUrl = `reader.html?id=${articleId}&type=automatic`;

      slidesHtml += `
        <div class="snippet-card" style="background-image: url('${bgImage}');">
          <div class="snippet-overlay"></div>
          <div class="snippet-content">
            <span class="snippet-badge">${category}</span>
            <h2 class="snippet-title">${title}</h2>
            <p class="snippet-description">${description}</p>

            <div class="snippet-actions">
              <a href="${readerUrl}" class="read-full-btn">
                Read Full Story ➔
              </a>
              <button class="share-icon-btn" onclick="shareSnippet('${title.replace(/'/g, "\\'")}', '${readerUrl}')">
                📤
              </button>
            </div>
          </div>
        </div>
      `;
    });

    reelsContainer.innerHTML = slidesHtml;

  } catch (error) {
    console.error("Error loading news snippets:", error);
    reelsContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
        <p>Failed to load snippets. Please try again later.</p>
      </div>`;
  }
}

window.shareSnippet = function (title, url) {
  const fullUrl = window.location.origin + "/" + url;
  if (navigator.share) {
    navigator.share({ title: title, url: fullUrl });
  } else {
    navigator.clipboard.writeText(fullUrl);
    alert("Link copied to clipboard!");
  }
};

loadSnippets();