import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB8W7CWNejEIS1ApYk6_Wu7oqtBuIENSLM",
  authDomain: "chat-app-123bc.firebaseapp.com",
  projectId: "chat-app-123bc",
  storageBucket: "chat-app-123bc.appspot.com",
  messagingSenderId: "568603173097",
  appId: "1:568603173097:web:4ce2e608b7538f33a01078",
  measurementId: "G-548FQCSKKB"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ✅ Backend URL (Render)
const BACKEND_URL = "https://chat-server-abhyuday.onrender.com";

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // ✅ Send user data to backend
    const response = await fetch(`${BACKEND_URL}/auth/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: user.uid,
        name: user.displayName,
        email: user.email,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to login via backend");

    console.log("✅ Backend synced user:", data);
    return data.user;

  } catch (error) {
    console.error("❌ Google login failed:", error);
    throw error;
  }
};
