import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import { auth } from "./firebase-config.js";

const logoutButton = document.getElementById("logoutButton");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("admin.html");
  }
});

logoutButton.addEventListener("click", async (event) => {
  event.preventDefault();

  await signOut(auth);
  window.location.replace("admin.html");
});