import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const schemaPath = path.join(root, "prisma/schema.prisma");
const cfSchemaPath = path.join(root, "prisma/schema.cloudflare.prisma");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, NODE_ENV: "production" },
  });
}

const originalSchema = fs.readFileSync(schemaPath, "utf8");
const cfSchema = originalSchema.replace(
  /generator client\s*\{[\s\S]*?\}/,
  `generator client {\n  provider = "prisma-client"\n  output   = "../src/generated/prisma"\n  runtime  = "cloudflare"\n}`
);

fs.writeFileSync(cfSchemaPath, cfSchema, "utf8");

try {
  run("npx prisma generate --schema prisma/schema.cloudflare.prisma");
  run("npx next build");
  run("npx opennextjs-cloudflare build --skipNextBuild");
} finally {
  if (fs.existsSync(cfSchemaPath)) {
    fs.unlinkSync(cfSchemaPath);
  }
  run("npx prisma generate --config prisma7.config.ts");
}
