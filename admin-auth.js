import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";
/* =========================================
   MANUAL NEWS UPLOAD HANDLER
========================================= */

const manualUploadForm = document.getElementById("manualUploadForm");
const uploadTitle = document.getElementById("uploadTitle");
const uploadCategory = document.getElementById("uploadCategory");
const uploadDescription = document.getElementById("uploadDescription");
const uploadPdfUrl = document.getElementById("uploadPdfUrl");
const uploadStatusMessage = document.getElementById("uploadStatusMessage");
const uploadSubmitBtn = document.getElementById("uploadSubmitBtn");

if (manualUploadForm) {
  manualUploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (uploadStatusMessage) {
      uploadStatusMessage.style.color = "#2563eb";
      uploadStatusMessage.textContent = "Publishing news article to Firestore...";
    }
    if (uploadSubmitBtn) uploadSubmitBtn.disabled = true;

    try {
      const newsData = {
        title: uploadTitle ? uploadTitle.value.trim() : "",
        category: uploadCategory ? uploadCategory.value : "POLITICS",
        description: uploadDescription ? uploadDescription.value.trim() : "",
        pdfUrl: uploadPdfUrl ? uploadPdfUrl.value.trim() : "",
        source: "Manual Upload",
        publishedAt: serverTimestamp(),
        updatedAt: new Date().toISOString()
      };

      // Add to 'news' collection
      const docRef = await addDoc(collection(db, "news"), newsData);

      if (uploadStatusMessage) {
        uploadStatusMessage.style.color = "#16a34a";
        uploadStatusMessage.textContent = `✅ Article published successfully! Document ID: ${docRef.id}`;
      }

      // Reset Form
      manualUploadForm.reset();

    } catch (error) {
      console.error("Failed to publish news:", error);
      if (uploadStatusMessage) {
        uploadStatusMessage.style.color = "#dc2626";
        uploadStatusMessage.textContent = `❌ Upload failed: ${error.message}`;
      }
    } finally {
      if (uploadSubmitBtn) uploadSubmitBtn.disabled = false;
    }
  });
}

/* =========================================
   ELEMENT REFERENCES
========================================= */

const loginSection = document.getElementById("loginSection");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const loginMessage = document.getElementById("loginMessage");

const adminDashboardPanel = document.getElementById("adminDashboardPanel");
const welcomeUserHeading = document.getElementById("welcomeUserHeading");
const logoutBtn = document.getElementById("logoutBtn");

const healthTotalCount = document.getElementById("healthTotalCount");
const healthDbConnection = document.getElementById("healthDbConnection");

let unsubscribeHealth = null;

/* =========================================
   REALTIME SYSTEM METRICS
========================================= */

function loadSystemHealth() {
  try {
    const newsCol = collection(db, "automaticNews");
    unsubscribeHealth = onSnapshot(newsCol, (snapshot) => {
      if (healthTotalCount) {
        healthTotalCount.textContent = snapshot.size;
      }
      if (healthDbConnection) {
        healthDbConnection.textContent = "Connected";
        healthDbConnection.style.color = "#16a34a";
      }
    }, (error) => {
      console.warn("Firestore metrics error:", error);
      if (healthDbConnection) {
        healthDbConnection.textContent = "Error";
        healthDbConnection.style.color = "#dc2626";
      }
    });
  } catch (err) {
    console.error("Health metrics initialization failed:", err);
  }
}

/* =========================================
   AUTH STATE LISTENER
========================================= */

onAuthStateChanged(auth, (user) => {
  if (user) {
    // ADMIN LOGGED IN: Hide login form, show admin panel
    if (loginSection) loginSection.style.display = "none";
    if (adminDashboardPanel) adminDashboardPanel.style.display = "block";
    if (welcomeUserHeading) welcomeUserHeading.textContent = `Welcome, ${user.email}`;

    // Load real-time operational metrics
    loadSystemHealth();

  } else {
    // ADMIN LOGGED OUT: Show login form, hide admin panel
    if (loginSection) loginSection.style.display = "block";
    if (adminDashboardPanel) adminDashboardPanel.style.display = "none";

    // Clean up metrics listener
    if (typeof unsubscribeHealth === "function") {
      unsubscribeHealth();
      unsubscribeHealth = null;
    }
  }
});

/* =========================================
   LOGIN FORM SUBMISSION
========================================= */

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = adminEmail ? adminEmail.value.trim() : "";
    const password = adminPassword ? adminPassword.value : "";

    if (loginMessage) {
      loginMessage.style.color = "#2563eb";
      loginMessage.textContent = "Verifying credentials...";
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (loginMessage) loginMessage.textContent = "";

    } catch (error) {
      console.error("Firebase Auth Error:", error.code, error.message);

      if (loginMessage) {
        loginMessage.style.color = "#dc2626";

        switch (error.code) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
            loginMessage.textContent = "Invalid email address or password.";
            break;
          case "auth/invalid-email":
            loginMessage.textContent = "Please enter a valid email format.";
            break;
          case "auth/unauthorized-domain":
            loginMessage.textContent = "Domain not authorized in Firebase Console -> Auth Settings.";
            break;
          case "auth/too-many-requests":
            loginMessage.textContent = "Too many failed attempts. Try again later.";
            break;
          default:
            loginMessage.textContent = `Login failed: ${error.message}`;
        }
      }
    }
  });
}

/* =========================================
   LOGOUT HANDLER
========================================= */

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  });
}