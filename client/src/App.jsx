import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/Login";
import ProfileSetup from "./components/ProfileSetup";
import Chat from "./components/Chat";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const response = await fetch("https://shadowchat-server.onrender.com/auth/google-login", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: firebaseUser.email, name: firebaseUser.displayName, uid: firebaseUser.uid,
            }),
          });
          const data = await response.json();
          if (data.token) {
            localStorage.setItem('token', data.token);
            setUser(data.user);
          } else { throw new Error(data.error); }
        } catch (error) {
          console.error("Backend login error:", error);
          signOut(auth);
        }
      } else {
        setUser(null);
        localStorage.removeItem('token');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleProfileUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div>;
  }

  if (!user) {
    return <Login />;
  } else if (!user.username || !user.gender) {
    return <ProfileSetup user={user} onSetupComplete={handleProfileUpdate} />;
  } else {
    return <Chat user={user} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />;
  }
}

export default App;