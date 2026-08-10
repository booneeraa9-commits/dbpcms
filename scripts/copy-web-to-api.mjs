// Copies the built React frontend (apps/web/dist) into the API's public folder
// (apps/api/public) so that, in production, the single API process can serve the
// whole app. Pure Node — no extra dependencies, works on Windows/Linux/Mac.
//
// Run automatically by `pnpm build:prod`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "apps", "web", "dist");
const dest = path.join(root, "apps", "api", "public");

if (!fs.existsSync(src)) {
  console.error(
    `[copy-web-to-api] Frontend build not found at ${src}.\n` +
      `Run the web build first (pnpm --filter @dbpcms/web build).`,
  );
  process.exit(1);
}

// Start clean so old assets never linger.
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

// Node 16.7+ has fs.cpSync for recursive copies.
fs.cpSync(src, dest, { recursive: true });

console.log(`[copy-web-to-api] Copied frontend -> ${path.relative(root, dest)}`);
