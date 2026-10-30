import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Load .env if present and process.env.DATABASE_URL is not set yet
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath) && !process.env.DATABASE_URL) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const dbUrl = process.env.DATABASE_URL || "";
const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

const schemaFile = isPostgres 
  ? "prisma/schema.postgresql.prisma" 
  : "prisma/schema.prisma";

console.log(`[prepare-prisma] Detected database: ${isPostgres ? "PostgreSQL / Supabase" : "SQLite"}`);
console.log(`[prepare-prisma] Using schema: ${schemaFile}`);

try {
  execSync(`npx prisma generate --schema=${schemaFile}`, {
    stdio: "inherit",
    env: process.env,
  });
  console.log(`[prepare-prisma] Prisma Client successfully generated.`);
} catch (error) {
  console.error(`[prepare-prisma] Error generating Prisma Client:`, error);
  process.exit(1);
}
