// server/db.js
import 'dotenv/config';
import pkg from "pg";
const { Pool } = pkg;

const isProd = process.env.NODE_ENV === "production";

// Local default as a safe fallback (only used if .env missing)
// NOTE: If your password has special chars like #, encode it as %23 in URL.
const DEFAULT_LOCAL_URL = "postgres://postgres:postgres@localhost:5432/chatapp";

const connectionString =
  (isProd
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL || DEFAULT_LOCAL_URL);

export const pool = new Pool(
  isProd
    ? { connectionString, ssl: { rejectUnauthorized: false } } // Neon/Render needs SSL
    : { connectionString }
);
