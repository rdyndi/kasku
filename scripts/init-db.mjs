import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbUrl = process.env.DATABASE_URL || "file:/data/kasku.db";
const dbPath = dbUrl.startsWith("file:")
  ? path.resolve(process.cwd(), dbUrl.replace(/^file:/, ""))
  : dbUrl;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
const existing = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='User'")
  .get();

if (!existing) {
  const sqlPath = path.resolve(process.cwd(), "prisma/init.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  db.exec(sql);
  console.log("Initialized SQLite schema at", dbPath);
} else {
  console.log("SQLite schema already initialized at", dbPath);
}

db.close();
