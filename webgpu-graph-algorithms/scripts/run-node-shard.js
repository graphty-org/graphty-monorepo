/**
 * The node test-project wrapper: runs one or more vitest projects and, when the run fails or goes quiet, names the
 * test file that never finished instead of leaving a gap in the log (G4-F14).
 *
 * A forked vitest worker that dies takes its file's result with it. The pool's next write to it raises
 * `Unhandled Rejection: Channel closed` with the code ERR_IPC_CHANNEL_CLOSED, and the run aborts with no summary, no
 * JSON report and no coverage file -- the same one line whether the worker crashed in a graphics driver, was killed
 * for memory, or hung in teardown. The one thing that does tell those apart is already in the log: the test files the
 * reporter announced output for, minus the files it printed a result for. That difference is this wrapper's FIRST
 * line on any non-zero exit, under the fixed marker [missing-files].
 *
 * The wrapper spawns vitest, forwarding every argument (and adding --project=node when the caller named no project),
 * and watches its output. It takes a snapshot -- the process table of every node process with its kernel wait channel
 * and state, plus a Node diagnostic report from the runner and each of its children, which carries the JavaScript
 * stack and every libuv handle still holding the loop open -- after SILENCE_MS with nothing written, at most
 * MAX_SNAPSHOTS times, and once more when vitest exits non-zero, so a fast crash gets the same treatment as a hang.
 * Reports go to the directory below and their essentials are printed. The wrapper never changes the verdict: it exits
 * with vitest's own code.
 *
 * The signalling half of a snapshot is POSIX only: Windows has neither --report-on-signal nor a SIGUSR2 that leaves
 * its target alive, so there the wrapper prints the process table and the missing files and signals nothing.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Silence, in milliseconds, that counts as a hang worth a snapshot; GRAPHTY_HANG_SILENCE_MS overrides it. */
const SILENCE_MS = Number(process.env.GRAPHTY_HANG_SILENCE_MS ?? "90000");
/** How many silence snapshots one run may take; the exit-code snapshot is taken on top of these. */
const MAX_SNAPSHOTS = 3;
/** Where the Node diagnostic reports land, relative to the package root. */
const REPORT_DIR = "tmp/hang-report";
/** Whether this platform has a SIGUSR2 that dumps a diagnostic report instead of killing its target. */
const CAN_SIGNAL = process.platform !== "win32";
/** The fixed marker on every missing-file line, so a log can be grepped for one string. */
const MISSING_MARKER = "[missing-files]";

/** The colour escapes the reporters write around every glyph and path. */
const ANSI = /\u001B\[[0-9;]*m/g;
/** The head of a per-file or per-test result line: one of the reporters' status glyphs and its ASCII fallbacks. */
const RESULT_HEAD = /^\s*[\u2713\u221A\u00D7\u2717\u276F\u203A\u2193]\s/;
/** The `stdout | <file>` / `stderr | <file>` line vitest prints above output a test file wrote. */
const OUTPUT_HEAD = /^\s*(?:stdout|stderr)\s*\|\s*(\S+)/;
/** A test file path as the reporters print it, relative to the package root. */
const TEST_FILE = /(?:[\w.@-]+\/)*[\w.@-]+\.test\.[cm]?tsx?/;

/**
 * The test files a vitest run started but never reported a result for, derived from the run's own output.
 *
 * A file is STARTED once the reporter has named it -- above the output it wrote (`stderr | test/x.test.ts`, which
 * every file of the node project produces from its GPU setup) or on a result line. It has REPORTED once a result line
 * names it: one of the status glyphs, then the path. The difference is what a dead worker swallowed. Equal sets mean
 * no file went missing and the death is elsewhere.
 *
 * @param {string} output - everything the run wrote to stdout and stderr, in order
 * @returns {{started: string[], reported: string[], missing: string[]}} the two sets and their difference, sorted
 */
export function missingTestFiles(output) {
    const started = new Set();
    const reported = new Set();
    for (const raw of String(output).split("\n")) {
        const line = raw.replace(ANSI, "");
        const announced = OUTPUT_HEAD.exec(line);
        if (announced !== null) {
            const named = TEST_FILE.exec(announced[1]);
            if (named !== null) {
                started.add(named[0]);
            }
            continue;
        }
        if (!RESULT_HEAD.test(line)) {
            continue;
        }
        const named = TEST_FILE.exec(line);
        if (named !== null) {
            started.add(named[0]);
            reported.add(named[0]);
        }
    }
    const missing = [...started].filter((file) => !reported.has(file)).sort();
    return { started: [...started].sort(), reported: [...reported].sort(), missing };
}

/**
 * The missing-file block, greppable by its fixed marker: the counts, then one line per file that never reported.
 * @param {{started: string[], reported: string[], missing: string[]}} sets - the output of missingTestFiles
 * @returns {string} the block, without a trailing newline
 */
export function formatMissingFiles(sets) {
    const counts = `${MISSING_MARKER} started ${String(sets.started.length)}, reported ${String(sets.reported.length)}, missing ${String(sets.missing.length)}`;
    if (sets.missing.length === 0) {
        return `${counts} -- every file that started also reported, so nothing was swallowed and the death is elsewhere`;
    }
    return [counts, ...sets.missing.map((file) => `${MISSING_MARKER} no result for ${file}`)].join("\n");
}

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
 * Takes one snapshot: the process table, then a diagnostic report from every process still alive in the run.
 * @param {number} pid - the vitest process id
 * @param {number} index - which snapshot this is
 * @param {string} reason - why the snapshot is being taken, printed with it
 * @returns {Promise<void>} resolves once the reports have been digested
 */
async function snapshot(pid, index, reason) {
    const dir = resolve(packageRoot, REPORT_DIR, String(index));
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    console.log(`\n[hang-report] ${reason}; snapshot ${String(index)}`);
    console.log(processTable());
    if (!CAN_SIGNAL) {
        console.log("[hang-report] no diagnostic reports: this platform has no report-on-signal");
        return;
    }
    const pids = descendants(pid);
    let signalled = 0;
    for (const target of pids) {
        try {
            process.kill(target, "SIGUSR2");
            signalled += 1;
        } catch {
            // the process may have exited between listing and signalling; nothing to report for it
        }
    }
    console.log(
        `[hang-report] signalled ${String(signalled)} of ${String(pids.length)} process(es): ${pids.join(", ")}`,
    );
    if (signalled === 0) {
        console.log("[hang-report] nothing was left alive to report on");
        return;
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
 * Runs the projects and exits with vitest's code, taking a snapshot whenever the output goes quiet and once more
 * when the run fails.
 * @param {readonly string[]} argv - the wrapper's arguments, forwarded to vitest unchanged
 * @returns {Promise<void>} resolves after process.exit is called
 */
async function main(argv) {
    const dir = resolve(packageRoot, REPORT_DIR, "1");
    mkdirSync(dir, { recursive: true });
    // No project named means the node project: every caller of this wrapper runs a node project, and letting vitest
    // default to all of them would silently pull in the browser project.
    const named = argv.some((arg) => arg === "--project" || arg.startsWith("--project="));
    const extra = named ? [...argv] : ["--project=node", ...argv];
    const env = { ...process.env };
    if (CAN_SIGNAL) {
        env.NODE_OPTIONS =
            `${process.env.NODE_OPTIONS ?? ""} --report-on-signal --report-signal=SIGUSR2 --report-directory=${dir}`.trim();
    }
    // On a POSIX host the run goes through a shell so `ulimit -c 0` applies. It does NOT make a crash free, which
    // is what it was added for: on the first run that carried it (CI run 35788215777, 2026-09-22) the dump happened
    // anyway -- this wrapper's own snapshot caught `node (vitest 2)` in the kernel's `vfs_coredump` with 2,003,660
    // KB resident, 90 s into the silence this wrapper watches for. That write is what the run's silent gap is made
    // of (170-179 s on the runs of G4-F14), and it ends with the pool writing to the channel the dying worker had
    // already closed (the crashing file is named in G4-F18 and now walks a short ladder on a software rasteriser).
    // core(5) has the explanation that fits: "The RLIMIT_CORE limit is not enforced for core dumps that are piped
    // to a program", which is what a /proc/sys/kernel/core_pattern beginning with a pipe asks the kernel to do.
    // That runner's pattern was not captured, so the pipe is inferred; the limit failing to stop the dump is not.
    // The limit stays because it does bind on a host whose pattern writes a file. Windows has no such shell and no
    // such dump, and `sh` may not resolve there at all, so that host spawns the runner directly -- going through a
    // shell it might not have would fail the step before a single test ran.
    const child = CAN_SIGNAL
        ? spawn(
              "sh",
              ["-c", ["ulimit -c 0", `exec pnpm exec vitest run ${extra.map((a) => `'${a}'`).join(" ")}`].join("; ")],
              {
                  cwd: packageRoot,
                  env,
              },
          )
        : spawn("pnpm", ["exec", "vitest", "run", ...extra], { cwd: packageRoot, env, shell: true });
    const transcript = [];
    let last = Date.now();
    let taken = 0;
    let busy = false;
    // The bytes are forwarded untouched; the transcript is decoded through a StringDecoder because a chunk boundary
    // can fall inside one of the reporter's multi-byte glyphs, and half a glyph would hide a file from the parser.
    const note = (chunk, stream, decoder) => {
        last = Date.now();
        transcript.push(decoder.write(chunk));
        stream.write(chunk);
    };
    const outDecoder = new StringDecoder("utf8");
    const errDecoder = new StringDecoder("utf8");
    child.stdout.on("data", (chunk) => note(chunk, process.stdout, outDecoder));
    child.stderr.on("data", (chunk) => note(chunk, process.stderr, errDecoder));
    // Without this the shell failing to start (no `sh` on PATH) would be a silent exit 1 instead of a named cause.
    child.on("error", (error) => {
        console.error(`[hang-report] could not start the runner: ${String(error)}`);
    });
    const timer = setInterval(() => {
        if (busy || taken >= MAX_SNAPSHOTS || Date.now() - last < SILENCE_MS) {
            return;
        }
        busy = true;
        taken += 1;
        void snapshot(child.pid ?? 0, taken, `no output for ${String(SILENCE_MS / 1000)}s`).finally(() => {
            last = Date.now();
            busy = false;
        });
    }, 5_000);
    const status = await new Promise((done) => {
        child.on("close", (code) => done(code ?? 1));
    });
    clearInterval(timer);
    if (status !== 0) {
        // First, before the process table and before anything else in the failure: which file never reported.
        console.log(`\n${formatMissingFiles(missingTestFiles(transcript.join("")))}`);
        taken += 1;
        await snapshot(child.pid ?? 0, taken, `vitest exited ${String(status)}`);
    }
    console.log(`[hang-report] vitest exited ${String(status)} after ${String(taken)} snapshot(s)`);
    process.exit(status);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    await main(process.argv.slice(2));
}
