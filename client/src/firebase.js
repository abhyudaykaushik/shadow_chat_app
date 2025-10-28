import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB8W7CWNejEIS1ApYk6_Wu7oqtBuIENSLM", // <-- APNI CONFIG DAALEIN
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

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};