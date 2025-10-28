import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import fetch from "node-fetch"; // Firebase token verify karne ke liye

const router = express.Router();
const JWT_SECRET = "your-super-secret-key-that-is-long-and-secure";

// 🔹 Route 1: Google se login karne aur user data get/create karne ke liye
router.post("/google-login", async (req, res) => {
  const { idToken } = req.body; // frontend se aane wala token

  if (!idToken) {
    return res.status(400).json({ error: "Missing Firebase ID token" });
  }

  try {
    // Google API se Firebase token verify karte hain
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`);
    const userInfo = await response.json();

    if (userInfo.error_description) {
      return res.status(401).json({ error: "Invalid Firebase ID token" });
    }

    const { email, name, sub: uid } = userInfo; // "sub" = Firebase UID

    // Database me user check karo
    let userRes = await pool.query("SELECT * FROM users WHERE google_uid = $1", [uid]);
    let user = userRes.rows[0];

    // Agar user nahi hai to create karo
    if (!user) {
      const newUser = await pool.query(
        "INSERT INTO users (email, name, google_uid) VALUES ($1, $2, $3) RETURNING *",
        [email, name, uid]
      );
      user = newUser.rows[0];
    }

    // JWT generate karo (apni app ke liye)
    const token = jwt.sign({ id: user.id, uid: user.google_uid }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err) {
    console.error("Google login server error:", err);
    res.status(500).json({ error: "Server error during Google login." });
  }
});

// 🔹 Route 2: User ki profile (username/gender) pehli baar update karne ke liye
router.post("/update-profile", async (req, res) => {
  const { username, gender, uid } = req.body;
  if (!username || !gender || !uid) {
    return res.status(400).json({ error: "Username, gender, and UID are required." });
  }

  try {
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND google_uid != $2",
      [username, uid]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Username already taken. Please choose another one." });
    }

    const updatedUserRes = await pool.query(
      "UPDATE users SET username = $1, gender = $2 WHERE google_uid = $3 RETURNING *",
      [username, gender, uid]
    );

    if (updatedUserRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ success: true, user: updatedUserRes.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username already taken. Please choose another one." });
    }
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Server error during profile update." });
  }
});

// 🔹 Route 3: Sirf username edit karne ke liye
router.post("/edit-username", async (req, res) => {
  const { newUsername, uid } = req.body;
  if (!newUsername || !uid) {
    return res.status(400).json({ error: "New username and UID are required." });
  }

  try {
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND google_uid != $2",
      [newUsername, uid]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "This username is already taken." });
    }

    const updatedUserRes = await pool.query(
      "UPDATE users SET username = $1 WHERE google_uid = $2 RETURNING *",
      [newUsername, uid]
    );

    if (updatedUserRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ success: true, user: updatedUserRes.rows[0] });
  } catch (err) {
    console.error("Username edit error:", err);
    res.status(500).json({ error: "Server error while updating username." });
  }
});

// 🔹 Route 4: Sirf gender edit karne ke liye
router.post("/edit-gender", async (req, res) => {
  const { newGender, uid } = req.body;
  if (!newGender || !uid) {
    return res.status(400).json({ error: "New gender and UID are required." });
  }

  try {
    const updatedUserRes = await pool.query(
      "UPDATE users SET gender = $1 WHERE google_uid = $2 RETURNING *",
      [newGender, uid]
    );

    if (updatedUserRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ success: true, user: updatedUserRes.rows[0] });
  } catch (err) {
    console.error("Gender edit error:", err);
    res.status(500).json({ error: "Server error while updating gender." });
  }
});

export default router;
