import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAkydhw6zWTzXAmF8BNjiAz1TdkJIe1Yg",
  authDomain: "new-tn-politics.firebaseapp.com",
  projectId: "new-tn-politics",
  storageBucket: "new-tn-politics.firebasestorage.app",
  messagingSenderId: "660588395392",
  appId: "1:660588395392:web:e361f8ad0ca23210645f65",
  measurementId: "G-X98LBT8684"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await setPersistence(auth, browserLocalPersistence);

export { auth, db };