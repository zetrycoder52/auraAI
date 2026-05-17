const { spawn, spawnSync } = require("child_process");
const path = require("path");
const { loadEnvConfig } = require("@next/env");

const root = path.resolve(__dirname, "..");
loadEnvConfig(root, true);

const devDbPath = path.join(root, "prisma", "dev.db").replace(/\\/g, "/");
const devDatabaseUrl = `file:${devDbPath}`;

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

const bootstrap = spawnSync(process.execPath, [path.join(root, "scripts", "dev-bootstrap.cjs")], {
  cwd: root,
  env: devEnv,
  stdio: "inherit",
  shell: false
});

if (bootstrap.error) {
  console.error(bootstrap.error);
}

if (bootstrap.status !== 0) {
  process.exit(bootstrap.status || 1);
}

const server = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root,
  env: devEnv,
  stdio: "inherit",
  shell: false
});

function shutdown(signal) {
  if (!server.killed) {
    server.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
