/**
 * The node shard runner: runs the `node` vitest project and, if the run goes silent, says WHERE it is stuck
 * instead of leaving a gap in the log (G4-F14).
 *
 * The default lane's `webgpu-graph-algorithms-node` shard has aborted after every one of its 121 files reported
 * green, with `Unhandled Rejection: Channel closed` and the code ERR_IPC_CHANNEL_CLOSED, which vitest raises when
 * its pool writes to a worker whose channel has gone. In every failing run the abort arrives about 175 seconds
 * after the last test line, with no summary, no JSON report and no coverage file. The same command passes here,
 * at the runner's worker count and pinned to the runner's core count, so the difference is the runner itself.
 *
 * This wrapper spawns vitest, forwarding every argument, and watches its output. After SILENCE_MS with nothing
 * written it takes one snapshot: the process table of every node process with its kernel wait channel and state,
 * and a Node diagnostic report from the runner and each of its children, which carries the JavaScript stack and
 * every libuv handle still holding the loop open. Reports go to the directory below and their essentials are
 * printed. The snapshot is taken at most MAX_SNAPSHOTS times, so a genuinely slow test file cannot flood the log.
 * The wrapper never changes the verdict: it exits with vitest's own code.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Silence, in milliseconds, that counts as a hang worth a snapshot; GRAPHTY_HANG_SILENCE_MS overrides it. */
const SILENCE_MS = Number(process.env.GRAPHTY_HANG_SILENCE_MS ?? "90000");
/** How many snapshots one run may take. */
const MAX_SNAPSHOTS = 3;
/** Where the Node diagnostic reports land, relative to the package root. */
const REPORT_DIR = "tmp/hang-report";

/**
 * Every node process on the machine, with the kernel wait channel that says what it is blocked on.
 * @returns the `ps` output, or the error text when ps is unavailable
 */
export function processTable() {
    const ps = spawnSync("ps", ["-eo", "pid,ppid,stat,wchan:24,etime,rss,args"], { encoding: "utf8" });
    if (ps.error !== undefined || typeof ps.stdout !== "string") {
        return `ps failed: ${String(ps.error)}`;
    }
    const lines = ps.stdout.split("\n").filter((line, index) => index === 0 || line.includes("node"));
    return lines.join("\n");
}

/**
 * The process ids of a process and of every descendant of it.
 * @param {number} root - the process id to start from
 * @returns {number[]} root first, then its descendants
 */
export function descendants(root) {
    const ps = spawnSync("ps", ["-eo", "pid,ppid"], { encoding: "utf8" });
    if (typeof ps.stdout !== "string") {
        return [root];
    }
    const children = new Map();
    for (const line of ps.stdout.split("\n").slice(1)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) {
            continue;
        }
        const pid = Number(parts[0]);
        const ppid = Number(parts[1]);
        if (!Number.isFinite(pid) || !Number.isFinite(ppid)) {
            continue;
        }
        const list = children.get(ppid) ?? [];
        list.push(pid);
        children.set(ppid, list);
    }
    const out = [];
    const queue = [root];
    while (queue.length > 0) {
        const pid = queue.shift();
        if (pid === undefined || out.includes(pid)) {
            continue;
        }
        out.push(pid);
        queue.push(...(children.get(pid) ?? []));
    }
    return out;
}

/**
 * The one line of a Node diagnostic report that matters most: what the main thread is doing, and which handles
 * are still holding the event loop open.
 * @param {string} file - the report path
 * @returns {string} a short digest of the report
 */
export function digestReport(file) {
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
        return `${file}: unreadable (${String(error)})`;
    }
    const header = parsed.header ?? {};
    const stack = Array.isArray(parsed.javascriptStack?.stack) ? parsed.javascriptStack.stack.slice(0, 12) : [];
    const handles = Array.isArray(parsed.libuv)
        ? parsed.libuv
              .filter((handle) => handle.is_active === true)
              .map((handle) => `${String(handle.type)}${handle.is_referenced === true ? " (ref)" : ""}`)
        : [];
    const counts = new Map();
    for (const handle of handles) {
        counts.set(handle, (counts.get(handle) ?? 0) + 1);
    }
    const handleText = [...counts.entries()].map(([name, n]) => `${name} x${String(n)}`).join(", ");
    return [
        `--- ${file}`,
        `    pid ${String(header.processId)}, ${String(header.commandLine?.slice?.(0, 3)?.join(" ") ?? "")}`,
        `    active handles: ${handleText === "" ? "none" : handleText}`,
        `    stack: ${stack.length === 0 ? "(no javascript frames)" : stack.join(" | ")}`,
    ].join("\n");
}

/**
 * Takes one snapshot: the process table, then a diagnostic report from every process in the run.
 * @param {number} pid - the vitest process id
 * @param {number} index - which snapshot this is
 * @returns {Promise<void>} resolves once the reports have been digested
 */
async function snapshot(pid, index) {
    const dir = resolve(packageRoot, REPORT_DIR, String(index));
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    console.log(`\n[hang-report] no output for ${String(SILENCE_MS / 1000)}s; snapshot ${String(index)}`);
    console.log(processTable());
    const pids = descendants(pid);
    console.log(`[hang-report] signalling ${String(pids.length)} process(es): ${pids.join(", ")}`);
    for (const target of pids) {
        try {
            process.kill(target, "SIGUSR2");
        } catch {
            // the process may have exited between listing and signalling; nothing to report for it
        }
    }
    await new Promise((done) => {
        setTimeout(done, 10_000);
    });
    if (!existsSync(dir)) {
        console.log("[hang-report] no report directory was written");
        return;
    }
    const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
    if (files.length === 0) {
        console.log("[hang-report] the processes wrote no diagnostic report (is --report-on-signal set?)");
        return;
    }
    for (const file of files) {
        console.log(digestReport(join(dir, file)));
    }
}

/**
 * Runs the project and exits with vitest's code, taking a snapshot whenever the output goes quiet.
 * @param {readonly string[]} extra - arguments forwarded to vitest
 * @returns {Promise<void>} resolves after process.exit is called
 */
async function main(extra) {
    const dir = resolve(packageRoot, REPORT_DIR, "1");
    mkdirSync(dir, { recursive: true });
    const env = {
        ...process.env,
        NODE_OPTIONS:
            `${process.env.NODE_OPTIONS ?? ""} --report-on-signal --report-signal=SIGUSR2 --report-directory=${dir}`.trim(),
    };
    const child = spawn("pnpm", ["exec", "vitest", "run", "--project=node", ...extra], {
        cwd: packageRoot,
        env,
    });
    let last = Date.now();
    let taken = 0;
    let busy = false;
    const note = (chunk, stream) => {
        last = Date.now();
        stream.write(chunk);
    };
    child.stdout.on("data", (chunk) => note(chunk, process.stdout));
    child.stderr.on("data", (chunk) => note(chunk, process.stderr));
    const timer = setInterval(() => {
        if (busy || taken >= MAX_SNAPSHOTS || Date.now() - last < SILENCE_MS) {
            return;
        }
        busy = true;
        taken += 1;
        void snapshot(child.pid ?? 0, taken).finally(() => {
            last = Date.now();
            busy = false;
        });
    }, 5_000);
    const status = await new Promise((done) => {
        child.on("close", (code) => done(code ?? 1));
    });
    clearInterval(timer);
    console.log(`[hang-report] vitest exited ${String(status)} after ${String(taken)} snapshot(s)`);
    process.exit(status);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    await main(process.argv.slice(2));
}
