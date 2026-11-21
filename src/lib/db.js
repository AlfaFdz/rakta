import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Peringatan jika koneksi database belum diset di .env.local
  console.warn("PERINGATAN: DATABASE_URL belum diatur di .env.local");
}

const globalForPg = globalThis;

export const pool =
  globalForPg.pgPool ||
  new Pool({
    connectionString: connectionString || "",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

// Helper untuk mengeksekusi raw SQL query dengan mudah
export async function query(text, params) {
  return await pool.query(text, params);
}

export default pool;