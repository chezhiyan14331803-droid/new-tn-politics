import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";

const publishForm = document.getElementById("publishForm");
const publishMessage = document.getElementById("publishMessage");
const publishButton = publishForm.querySelector('button[type="submit"]');

publishForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!auth.currentUser) {
    window.location.replace("admin.html");
    return;
  }

  publishButton.disabled = true;
  publishMessage.textContent = "Publishing news...";

  try {
    await addDoc(collection(db, "news"), {
      title: document.getElementById("newsTitle").value.trim(),
      publicationDate: document.getElementById("newsDate").value,
      category: document.getElementById("newsCategory").value,
      description: document.getElementById("newsDescription").value.trim(),
      pdfUrl: document.getElementById("newsPdfUrl").value.trim(),
      createdAt: serverTimestamp(),
      authorId: auth.currentUser.uid
    });

    publishMessage.textContent = "News published successfully.";
    publishMessage.style.color = "#15803d";
    publishForm.reset();
    document.dispatchEvent(new Event("newsPublished"));
  } catch (error) {
    publishMessage.textContent = "Unable to publish. Please try again.";
    publishMessage.style.color = "#b91c1c";
  } finally {
    publishButton.disabled = false;
  }
});