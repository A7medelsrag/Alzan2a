import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const storeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(storeRoot, "apps", "api");
const pgBin = process.env.PG_BIN || "C:\\Program Files\\PostgreSQL\\18\\bin";
const pgDump = path.join(pgBin, "pg_dump.exe");
const pgRestore = path.join(pgBin, "pg_restore.exe");
const psql = path.join(pgBin, "psql.exe");

for (const executable of [pgDump, pgRestore, psql]) {
  if (!fs.existsSync(executable)) throw new Error(`PostgreSQL utility not found: ${executable}`);
}

const apiEnvFile = path.join(apiRoot, ".env");
const workspaceEnvFile = path.join(storeRoot, ".env");
if (fs.existsSync(apiEnvFile)) process.loadEnvFile(apiEnvFile);
if (fs.existsSync(workspaceEnvFile)) process.loadEnvFile(workspaceEnvFile);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for the backup rehearsal");

const sourceUrl = new URL(process.env.DATABASE_URL);
if (sourceUrl.protocol !== "postgresql:" && sourceUrl.protocol !== "postgres:") {
  throw new Error("DATABASE_URL must use PostgreSQL");
}
const sourceDb = decodeURIComponent(sourceUrl.pathname.slice(1));
if (!/^[A-Za-z0-9_]+$/.test(sourceDb)) throw new Error("Unsupported database name in DATABASE_URL");

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const rehearsalDb = `${sourceDb.slice(0, 30)}_rehearsal_${stamp}_${randomBytes(2).toString("hex")}`;
const backupDir = path.join(storeRoot, "backups");
fs.mkdirSync(backupDir, { recursive: true });
const dumpFile = path.join(backupDir, `${sourceDb}_${stamp}.dump`);
const pgEnv: NodeJS.ProcessEnv = {
  ...process.env,
  PGHOST: decodeURIComponent(sourceUrl.hostname),
  PGPORT: sourceUrl.port || "5432",
  PGUSER: decodeURIComponent(sourceUrl.username),
  PGPASSWORD: decodeURIComponent(sourceUrl.password),
};
const sslMode = sourceUrl.searchParams.get("sslmode");
if (sslMode) pgEnv.PGSSLMODE = sslMode;

function run(executable: string, args: string[], env = pgEnv): string {
  return execFileSync(executable, args, { cwd: storeRoot, env, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}

console.log(`Backing up the configured database to ${path.relative(storeRoot, dumpFile)}.`);
run(pgDump, ["--format=custom", "--no-owner", "--no-acl", "--file", dumpFile], { ...pgEnv, PGDATABASE: sourceDb });
const existing = run(psql, ["--dbname", "postgres", "--tuples-only", "--no-align", "--command", `SELECT 1 FROM pg_database WHERE datname = '${rehearsalDb}'`]).trim();
if (existing) throw new Error("Generated rehearsal database name already exists; refusing to reuse it");
run(psql, ["--dbname", "postgres", "--set", "ON_ERROR_STOP=1", "--command", `CREATE DATABASE "${rehearsalDb}"`]);

try {
  console.log(`Restoring into isolated database ${rehearsalDb}.`);
  run(pgRestore, ["--exit-on-error", "--no-owner", "--no-acl", "--dbname", rehearsalDb, dumpFile]);
  const tableCount = Number(run(psql, ["--dbname", rehearsalDb, "--tuples-only", "--no-align", "--command", "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"]).trim());
  if (!Number.isInteger(tableCount) || tableCount < 10) throw new Error("Restore validation failed: expected application tables were not found");

  const rehearsalUrl = new URL(sourceUrl);
  rehearsalUrl.pathname = `/${rehearsalDb}`;
  const env = { ...process.env, DATABASE_URL: rehearsalUrl.toString() };
  console.log("Applying the checked-in Prisma migrations to the restored database.");
  const prismaCli = path.join(apiRoot, "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: apiRoot, env, stdio: "inherit" });
  execFileSync(process.execPath, [prismaCli, "migrate", "status"], { cwd: apiRoot, env, stdio: "inherit" });

  const validatedTables = Number(run(psql, ["--dbname", rehearsalDb, "--tuples-only", "--no-align", "--command", "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"] , { ...pgEnv, PGDATABASE: rehearsalDb }).trim());
  console.log(`Backup/restore rehearsal passed (${tableCount} restored application tables; ${validatedTables} after migrations).`);
  console.log(`Rehearsal database retained for inspection: ${rehearsalDb}`);
} catch (error) {
  console.error(`Rehearsal failed. The isolated database is retained for inspection: ${rehearsalDb}`);
  throw error;
}
