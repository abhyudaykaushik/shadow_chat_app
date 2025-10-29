import express from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

// ✅ Built-in Node.js fetch use kar rahe hain (Node 18+)
router.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    // ✅ Native fetch call to Google API
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const data = await response.json();

    if (data.error_description) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const { sub: uid, email, name } = data;

    // ✅ Check if user exists or create new one
    let userRes = await pool.query("SELECT * FROM users WHERE google_uid = $1", [uid]);
    let user = userRes.rows[0];

    if (!user) {
      const newUser = await pool.query(
        "INSERT INTO users (email, name, google_uid) VALUES ($1, $2, $3) RETURNING *",
        [email, name, uid]
      );
      user = newUser.rows[0];
    }

    const jwtToken = jwt.sign({ id: user.id, uid: user.google_uid }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token: jwtToken, user });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
