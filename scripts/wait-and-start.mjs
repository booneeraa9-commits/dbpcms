// Production startup for Render (and any host).
//
// On a fresh deploy the database can take a little while to become reachable.
// If we run `prisma migrate deploy` immediately it may fail with P1001
// ("Can't reach database server"). So this script:
//   1. waits until the database actually accepts connections (with retries),
//   2. runs migrations,
//   3. seeds baseline data (idempotent),
//   4. starts the API.
//
// Pure Node — no extra dependencies. Invoked by `pnpm start:prod`.

import { execSync } from "node:child_process";
import net from "node:net";

const API_DIR = "apps/api";

function run(cmd) {
  console.log(`\n[start] $ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

// Pull host + port out of DATABASE_URL so we can probe the TCP socket directly.
function parseHostPort(url) {
  try {
    // postgresql://user:pass@host:port/db?...  (strip any query first)
    const u = new URL(url);
    return { host: u.hostname, port: Number(u.port || 5432) };
  } catch {
    return null;
  }
}

function probe(host, port, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function waitForDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[start] DATABASE_URL is not set. Cannot start.");
    process.exit(1);
  }
  const target = parseHostPort(url);
  if (!target) {
    console.warn("[start] Could not parse DATABASE_URL host/port; skipping TCP probe.");
    return;
  }

  const maxAttempts = 30; // ~ up to 2.5 minutes
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ok = await probe(target.host, target.port);
    if (ok) {
      console.log(`[start] Database reachable at ${target.host}:${target.port} (attempt ${attempt}).`);
      return;
    }
    console.log(
      `[start] Waiting for database ${target.host}:${target.port}... (attempt ${attempt}/${maxAttempts})`,
    );
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.error("[start] Database did not become reachable in time. Exiting so the host can retry.");
  process.exit(1);
}

async function main() {
  await waitForDb();
  run(`pnpm --filter @dbpcms/api db:migrate:deploy`);
  run(`pnpm --filter @dbpcms/api db:seed`);
  run(`node ${API_DIR}/dist/main.js`);
}

main().catch((err) => {
  console.error("[start] Startup failed:", err?.message ?? err);
  process.exit(1);
});
