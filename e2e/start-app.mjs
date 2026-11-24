// Starts the standalone production build, mirroring the Dockerfile.
// server.js only serves public/ and .next/static when they are copied alongside it.
import { cpSync, existsSync } from "node:fs";

if (!existsSync(".next/standalone/server.js")) {
  console.error("No production build found. Run `npm run build` first.");
  process.exit(1);
}

cpSync("public", ".next/standalone/public", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });

await import("../.next/standalone/server.js");
