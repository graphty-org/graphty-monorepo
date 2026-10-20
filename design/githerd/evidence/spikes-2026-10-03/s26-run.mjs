// S26: pm2 (the version servherd uses) with autorestart and exp_backoff_restart_delay: does a
// SIGKILLed process come back, how fast, and does a second kill back off? Runs a PRIVATE pm2
// daemon (PM2_HOME under this directory), never the shared servherd one, and kills it at the end.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
process.env.PM2_HOME = join(here, "pm2-home");
rmSync(process.env.PM2_HOME, { recursive: true, force: true });
mkdirSync(process.env.PM2_HOME, { recursive: true });
const pm2 = createRequire("/home/apowers/Projects/servherd/package.json")("pm2");
const p = (fn, ...a) => new Promise((ok, no) => pm2[fn](...a, (e, r) => (e ? no(e) : ok(r))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const info = async (name) => {
  const [d] = await p("describe", name);
  return { pid: d?.pid, status: d?.pm2_env?.status, restarts: d?.pm2_env?.restart_time };
};
const t0 = Date.now();
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

async function trial(name, opts) {
  await p("start", { name, script: join(here, "s26-idle.mjs"), cwd: here, ...opts });
  await sleep(1000);
  console.log(`[${name}] options ${JSON.stringify(opts)}`);
  for (let kill = 1; kill <= 3; kill++) {
    const before = await info(name);
    if (!before.pid) { console.log(`  ${stamp()} no live pid before kill ${kill}: ${JSON.stringify(before)}`); break; }
    process.kill(before.pid, "SIGKILL");
    const killedAt = Date.now();
    let after = before;
    while (Date.now() - killedAt < 8000) {
      await sleep(50);
      after = await info(name);
      if (after.pid && after.pid !== before.pid) break;
    }
    const back = after.pid && after.pid !== before.pid;
    console.log(`  kill ${kill}: pid ${before.pid} -> ${back ? `${after.pid} after ${Date.now() - killedAt} ms` : "not back within 8 s"} (status ${after.status}, restarts ${after.restarts})`);
    if (!back) break;
  }
  await p("delete", name);
}

try {
  await p("connect");
  await trial("s26-off", { autorestart: false });
  await trial("s26-on", { autorestart: true, exp_backoff_restart_delay: 100 });
} finally {
  await p("killDaemon").catch(() => {});
  pm2.disconnect();
  await sleep(500);
  const left = execFileSync("bash", ["-c", `pgrep -af "${process.env.PM2_HOME}|s26-idle.mjs" | grep -v pgrep || true`]).toString();
  console.log(`leftovers: ${left.trim() || "none"}`);
  process.exit(0); // pm2 keeps a handle open after disconnect
}
