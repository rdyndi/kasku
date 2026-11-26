import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  localPrisma: PrismaClient | undefined;
};

function ensureSqliteInitialized(
  DatabaseCtor: new (filename: string) => {
    prepare: (sql: string) => { get: () => unknown };
    exec: (sql: string) => void;
    close: () => void;
  },
  dbFilePath: string
) {
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
  const db = new DatabaseCtor(dbFilePath);
  try {
    const existing = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='User'")
      .get();
    if (!existing) {
      const sqlPath = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "prisma/init.sql");
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, "utf8");
        db.exec(sql);
      }
    }
  } finally {
    db.close();
  }
}

export function getLocalPrismaClient(): PrismaClient {
  if (!globalForPrisma.localPrisma) {
    const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
    const sqlitePath = dbUrl.startsWith("file:")
      ? path.resolve(/*turbopackIgnore: true*/ process.cwd(), dbUrl.replace(/^file:/, ""))
      : dbUrl;

    const req = createRequire(path.resolve(/*turbopackIgnore: true*/ process.cwd(), "package.json"));
    const Database = req("better-sqlite3");
    const { PrismaBetterSqlite3 } = req("@prisma/adapter-better-sqlite3");

    ensureSqliteInitialized(Database, sqlitePath);
    const adapter = new PrismaBetterSqlite3({ url: `file:${sqlitePath}` });
    globalForPrisma.localPrisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.localPrisma;
}
