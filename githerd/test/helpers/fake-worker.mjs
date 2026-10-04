/**
 * Starts fake workers (`fake-screen-claude.mjs`) in windows on a private tmux server, through the
 * real worker command line, and removes everything afterwards.
 */
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

import { identify } from "../../lib/proc.mjs";
import { capturePane, killServer, running, startWorker } from "../../lib/tmux.mjs";

export { killServer };
import { workerArgv } from "../../lib/worker-settings.mjs";

const FAKE = fileURLToPath(new URL("fake-screen-claude.mjs", import.meta.url));

/**
 * Short real waits, so the fake has time to redraw; the code's own waits are capped to these.
 * @param {number} ms the wait the code asked for
 * @returns {Promise<void>} after at most 50 ms
 */
export const sleep = (ms) => delay(Math.min(ms, 50));

/**
 * A private tmux server and directories for fake workers.
 * @returns {{socket: string, dir: string, sessionsDir: string,
 *   start: (job: string, scenario: any) => Promise<any>, keys: (job: string) => any[],
 *   cleanup: () => Promise<void>}} the server, its directories, a starter, a reader of the keys a
 *   fake received, and the cleanup that kills the server and checks no fake is left
 */
export function fakeWorkers() {
    const dir = mkdtempSync(join(tmpdir(), "githerd-tmux-"));
    const socket = `githerd-test-${process.pid}-${Date.now()}`;
    const sessionsDir = join(dir, "sessions");
    const bin = join(dir, "bin");
    mkdirSync(sessionsDir);
    mkdirSync(bin);
    /** @type {{pid: number, startTime: string}[]} */
    const started = [];
    return {
        socket,
        dir,
        sessionsDir,
        async start(job, scenario) {
            const file = join(dir, `${job}.json`);
            writeFileSync(
                file,
                JSON.stringify({
                    log: join(dir, `${job}.keys`),
                    sessionsDir,
                    registry: { status: "idle" },
                    ...scenario,
                }),
            );
            const claude = join(bin, "claude");
            writeFileSync(claude, `#!/bin/sh\nexec '${process.execPath}' '${FAKE}' '${file}' "$@"\n`);
            chmodSync(claude, 0o755);
            const env = { HOME: dir, PATH: `${bin}:/usr/bin:/bin`, GITHERD_JOB: job, GITHERD_NONCE: "n0nce" };
            const argv = workerArgv({ env, model: "claude-opus-5-5", job, jobDir: join(dir, job), prompt: "go" });
            const one = await startWorker({ job, cwd: dir, argv, socket, sessionsDir, sleep });
            started.push({ pid: one.window.pid, startTime: identify(one.window.pid)?.startTime ?? "" });
            // Wait for the first draw, so a capture sees the screen.
            for (let i = 0; one.ok && i < 100 && !capturePane(one.window).includes("\u2500"); i++) await delay(20);
            return one;
        },
        keys(job) {
            const text = readFileSync(join(dir, `${job}.keys`), "utf8");
            return text
                .split("\n")
                .filter(Boolean)
                .map((l) => JSON.parse(l))
                .filter((e) => !e.argv);
        },
        async cleanup() {
            killServer(socket);
            const live = () => started.filter((s) => running(s.pid, s.startTime)).map((s) => s.pid);
            for (let i = 0; i < 100 && live().length; i++) await delay(20);
            const left = live();
            rmSync(dir, { recursive: true, force: true });
            if (left.length) throw new Error(`fake workers left running: ${left.join(", ")}`);
        },
    };
}

/**
 * The text a fake received through typed characters.
 * @param {any[]} keys the fake's key log
 * @returns {string} the typed text
 */
export function typed(keys) {
    return keys
        .filter((k) => k.typed !== undefined)
        .map((k) => k.typed)
        .join("");
}
