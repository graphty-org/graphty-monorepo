#!/usr/bin/env node
/**
 * The githerd daemon process, started through servherd under `env -i` with `PORT`,
 * `GITHERD_ROOT` and `GITHERD_STATE_DIR` set (design section 9.4). The rest of its environment
 * comes from `daemon-env.json` in the state directory, never from pm2.
 *
 * Environment: `PORT` (required), `GITHERD_ROOT` (the repository; else the working directory's),
 * `GITHERD_CONFIG` (a config file instead of the default
 * branch's), `GITHERD_STATE_DIR` (instead of `~/.githerd/<repository>`), `GITHERD_DEV` (the development
 * daemon: never above dry-run, pages to the ledger only), `GITHERD_DEV_NOTIFY=1` (deliver the
 * development daemon's pages anyway).
 *
 * `--once` runs one poll, prints the status text and exits: a check against the real repository
 * that touches nothing but its state directory, never pages, and starts no judgment run.
 *
 * An uncaught exception or rejection puts the long-running daemon in fatal mode instead of ending
 * the process (design section 9.6).
 */

import { repoRoot } from "../lib/config.mjs";
import { startDaemon } from "../lib/daemon.mjs";
import { loadDaemonEnv } from "../lib/launcher.mjs";
import { TOOL_PROTOCOL } from "../lib/mcp.mjs";

if (process.env.GITHERD_STATE_DIR) loadDaemonEnv(process.env.GITHERD_STATE_DIR, process.env);

/** pm2 kills at 1.6 s; the state flush must be done before then. */
const EXIT_WITHIN_MS = 1400;

const once = process.argv.includes("--once");
const port = once ? 0 : Number(process.env.PORT);
if (!Number.isInteger(port) || port < 0 || port > 65535 || (!once && !process.env.PORT)) {
    console.error("githerd-daemon: PORT must be set to a port number (servherd sets it)");
    process.exit(2);
}

let root;
try {
    root = repoRoot(process.env.GITHERD_ROOT || process.cwd());
} catch (err) {
    console.error(`githerd-daemon: ${err.message}`);
    process.exit(2);
}

const daemon = await startDaemon({
    root,
    port,
    autoPoll: !once,
    ...(once ? { quiet: true, runs: false } : { fatalOnUncaught: true }),
    ...(process.env.GITHERD_STATE_DIR ? { stateDir: process.env.GITHERD_STATE_DIR } : {}),
});
if (daemon.fenced) process.exit(1);

if (once) {
    await daemon.poll();
    const reply = await daemon.rpc({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "githerd_status", arguments: {}, _meta: { githerd: { protocol: TOOL_PROTOCOL } } },
    });
    console.log(reply.result?.content?.[0]?.text ?? JSON.stringify(reply));
    await daemon.shutdown();
    process.exit(0);
}

for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
        setTimeout(() => process.exit(0), EXIT_WITHIN_MS).unref();
        daemon.shutdown().then(
            () => process.exit(0),
            (err) => {
                console.error(`githerd-daemon: shutdown: ${err.message}`);
                process.exit(1);
            },
        );
    });
}
const { reason } = await daemon.done;
process.exit(reason === "fenced" ? 1 : 0);
