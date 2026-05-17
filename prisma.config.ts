import { defineConfig } from "prisma/config";

const isSqliteDev = process.env.PRISMA_SCHEMA_PROFILE === "sqlite";

export default defineConfig({
  migrations: {
    path: isSqliteDev ? "prisma/dev/migrations" : "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  }
});
