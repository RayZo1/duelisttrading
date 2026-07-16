import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// TODO: Replace this with your Web Configuration from Firebase Console
// The service account key you provided is for backend access. 
// For a frontend website, you need the "Web App" configuration snippet.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "duelist-values.firebaseapp.com",
  projectId: "duelist-values",
  storageBucket: "duelist-values.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
