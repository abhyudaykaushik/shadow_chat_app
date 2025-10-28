import React from "react";
import { signInWithGoogle } from "../firebase";
import Logo from '../assets/shadow_app.png';

export default function Login() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);
      alert("Google login failed. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <img src={Logo} alt="Brand Logo" />
        <h2>Welcome to ShadowChat</h2>
        <p>Chat with random strangers anonymously</p>
        <button onClick={handleGoogleLogin} className="google">
          Sign in with Google to Continue
        </button>
      </div>
    </div>
  );
}