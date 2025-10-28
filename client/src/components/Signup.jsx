import React, { useState } from "react";

export default function Signup({ setToken }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSignup = async () => {
    const res = await fetch("http://localhost:4000/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (data.user) {
      alert("Signup successful! Please login.");
    } else {
      alert(data.error || "Signup failed");
    }
  };

  return (
    <div className="chat-container">
      <h2>Signup</h2>
      <input type="text" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
      <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button onClick={handleSignup}>Signup</button>
    </div>
  );
}
