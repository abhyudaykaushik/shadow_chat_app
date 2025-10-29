// firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// ✅ Your Firebase config (keep this as-is)
const firebaseConfig = {
  apiKey: "AIzaSyB8W7CWNejEIS1ApYk6_Wu7oqtBuIENSLM",
  authDomain: "chat-app-123bc.firebaseapp.com",
  projectId: "chat-app-123bc",
  storageBucket: "chat-app-123bc.firebasestorage.app",
  messagingSenderId: "568603173097",
  appId: "1:568603173097:web:4ce2e608b7538f33a01078",
  measurementId: "G-548FQCSKKB",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ Backend API base URL
const API_BASE = "https://shadowchat-server.onrender.com"; // 👈 replace with your Render backend URL

// ✅ Function to handle Google Sign-In + backend login
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken(); // get Google ID token

    // 🔥 Send token to backend for verification + JWT creation
    const response = await fetch(`${API_BASE}/auth/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Login failed");

    // ✅ Save backend JWT + user info
    localStorage.setItem("jwtToken", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    return data.user;
  } catch (error) {
    console.error("Google Sign-In error:", error);
    throw error;
  }
};

export { auth, provider, app };
