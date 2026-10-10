import {
  onAuthStateChanged,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { auth } from "./firebase-config.js";
/* =========================================
   SYSTEM HEALTH MONITORING
========================================= */
function initSystemHealth() {
  const healthTotalCount = document.getElementById("healthTotalCount");
  const healthDbConnection = document.getElementById("healthDbConnection");

  if (!healthTotalCount) return;

  const automaticCollection = collection(db, "automaticNews");

  onSnapshot(
    automaticCollection,
    snapshot => {
      // Update article count
      healthTotalCount.textContent = snapshot.size;

      if (healthDbConnection) {
        healthDbConnection.textContent = "Connected";
        healthDbConnection.style.color = "#16a34a";
      }
    },
    error => {
      console.warn("Health check snapshot warning:", error);
      if (healthDbConnection) {
        healthDbConnection.textContent = "Error";
        healthDbConnection.style.color = "#dc2626";
      }
    }
  );
}

// Start Health Monitor
initSystemHealth();

const loginForm = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const loginMessage = document.getElementById("loginMessage");
const loginButton = loginForm.querySelector('button[type="submit"]');

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "dashboard.html";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  loginMessage.textContent = "Signing in...";
  loginMessage.style.color = "";
  loginButton.disabled = true;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "dashboard.html";
  } catch (error) {
    loginMessage.textContent =
      error.code === "auth/invalid-credential"
        ? "Incorrect email or password."
        : "Unable to sign in. Please try again.";

    loginMessage.style.color = "#b91c1c";
    loginButton.disabled = false;
  }
});