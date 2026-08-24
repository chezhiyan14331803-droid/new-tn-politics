import {
  collection,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { db } from "./firebase-config.js";

const publishedNewsCount = document.getElementById("publishedNewsCount");
const pdfCount = document.getElementById("pdfCount");
const currentYear = document.getElementById("currentYear");

async function loadDashboardStats() {
  try {
    const snapshot = await getCountFromServer(collection(db, "news"));
    const count = snapshot.data().count;

    publishedNewsCount.textContent = count;
    pdfCount.textContent = count;
    currentYear.textContent = new Date().getFullYear();
  } catch (error) {
    publishedNewsCount.textContent = "—";
    pdfCount.textContent = "—";
  }
}

loadDashboardStats();

document.addEventListener("newsPublished", loadDashboardStats);