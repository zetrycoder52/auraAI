const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { loadEnvConfig } = require("@next/env");

const root = path.resolve(__dirname, "..");
loadEnvConfig(root, true);

const sourceSchemaPath = path.join(root, "prisma", "schema.prisma");
const devDir = path.join(root, "prisma", "dev");
const devSchemaPath = path.join(devDir, "schema.prisma");
const devDbPath = path.join(root, "prisma", "dev.db");
const devDatabaseUrl = `file:${devDbPath.replace(/\\/g, "/")}`;
const nodeBin = process.execPath;
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const skipSeed = process.argv.includes("--skip-seed");
const reset = process.argv.includes("--reset");

const devEnv = {
  ...process.env,
  NODE_ENV: "development",
  PRISMA_SCHEMA_PROFILE: "sqlite",
  DATABASE_URL: devDatabaseUrl,
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET || "auraai_dev_access_secret_32_chars_min",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || "auraai_dev_refresh_secret_32_chars_min",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  DEFAULT_NEW_USER_TOKENS: process.env.DEFAULT_NEW_USER_TOKENS || "100000"
};

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: devEnv,
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    console.error(result.error);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function runCaptured(command, args, input, echo = true) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: devEnv,
    input,
    encoding: "utf8",
    stdio: input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    shell: false
  });

  if (echo && result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (echo && result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    console.error(result.error);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  return result.stdout || "";
}

function createSqliteSchema() {
  const source = fs.readFileSync(sourceSchemaPath, "utf8").replace(/^\uFEFF/, "");
  const sqliteSchema = source
    .replace('provider = "postgresql"', 'provider = "sqlite"')
    .replace(/\s+@db\.Decimal\(10, 4\)/g, "");

  fs.mkdirSync(devDir, { recursive: true });

  if (fs.existsSync(devSchemaPath)) {
    const current = fs.readFileSync(devSchemaPath, "utf8");
    if (current === sqliteSchema) {
      return;
    }
  }

  fs.writeFileSync(devSchemaPath, sqliteSchema, "utf8");
}

createSqliteSchema();

console.log("[AuraAI dev] Preparing SQLite Prisma client and database...");
run(nodeBin, [prismaCli, "generate", "--schema", devSchemaPath]);

if (reset && fs.existsSync(devDbPath)) {
  fs.rmSync(devDbPath, { force: true });
}

if (!fs.existsSync(devDbPath)) {
  const sqlOutput = runCaptured(nodeBin, [
    prismaCli,
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    devSchemaPath,
    "--script"
  ], undefined, false);
  const sql = sqlOutput
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("Loaded Prisma config") && !line.startsWith("Prisma config detected"))
    .join("\n")
    .trim();

  if (!sql) {
    throw new Error("Failed to generate SQLite schema SQL");
  }

  runCaptured(nodeBin, [prismaCli, "db", "execute", "--url", devDatabaseUrl, "--stdin"], sql, false);
}

if (!skipSeed) {
  run(nodeBin, [tsxCli, "prisma/seed.ts"]);
}

console.log("[AuraAI dev] SQLite dev database is ready.");
