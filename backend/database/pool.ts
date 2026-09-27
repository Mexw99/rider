import * as dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("ไม่พบ DATABASE_URL ในไฟล์ .env");
}

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("error", (error) => {
  console.error("เกิดข้อผิดพลาดในการเชื่อมต่อ PostgreSQL:", error);
});
