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
 * The wrapper spawns vitest, forwarding every argument (and adding --project=node --project=node-gpu-alone, the main
 * suite, when the caller named no project),
 * and watches its output. It takes a snapshot -- the process table of every node process with its kernel wait channel
 * and state, plus a Node diagnostic report from the runner and each of its children, which carries the JavaScript
 * stack and every libuv handle still holding the loop open -- after SILENCE_MS with nothing written, at most
 * MAX_SNAPSHOTS times, and once more when vitest exits non-zero, so a fast crash gets the same treatment as a hang.
 * Reports go to the directory below and their essentials are printed. A run still silent after the last snapshot is
 * killed: it fails as hung either way, and waiting longer only spends the job's time limit.
 *
 * The verdict fails closed (issue #2111) and is the repository's shard rule, tools/shard-verdict.mjs: a run passes only
 * when vitest exited 0, its output holds the vitest summary, and the --outputFile the caller named was written by this
 * run. Anything else fails with a named cause on a line marked [shard-verdict], as does a run the watcher killed; a
 * non-zero vitest exit keeps its code. A snapshot alone is not a failure (issue #2181): a test may legitimately be
 * silent past the threshold, and a run that then finishes with its summary and report passed. A run whose tests were
 * killed must never look green because some process between the wrapper and vitest reported 0, and the summary and
 * report checks are what catch that.
 *
 * Only Node processes are signalled: Node is the only program in the tree whose SIGUSR2 writes a report
 * (--report-on-signal, set below) instead of killing it. The tree also holds `pnpm` (a packaged binary that does not
 * read NODE_OPTIONS), on a developer machine pnpm's version-switch shell script, and esbuild's service; SIGUSR2 kills
 * each of them. Killing the version-switch script made the outer pnpm exit 0 -- pnpm 10.0.0 exits 0 whenever the
 * pnpm it switched to dies by a signal -- and took vitest down with it: that is how two hung runs passed.
 *
 * The machine-wide test slot (tools/test-slots.mjs) is taken here, before vitest starts, and handed down as
 * GRAPHTY_TEST_SLOT_HELD, so time queued for a slot is never silence the hang watcher counts.
 *
 * The signalling half of a snapshot is POSIX only: Windows has neither --report-on-signal nor a SIGUSR2 that leaves
 * its target alive, so there the wrapper prints the process table and the missing files and signals nothing.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

import { shardVerdict } from "../../tools/shard-verdict.mjs";
import { acquire, HELD, off } from "../../tools/test-slots.mjs";

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
/** The fixed marker on the line that names why a run vitest reported as passing still failed. */
const VERDICT_MARKER = "[shard-verdict]";
/** How long a snapshot waits at most for the signalled processes to write their reports. */
const REPORT_WAIT_MS = 10_000;
/** The runner the arguments are appended to; main()'s `command` option replaces it in tests. */
const VITEST_COMMAND = ["pnpm", "exec", "vitest", "run"];
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
        const line = stripVTControlCharacters(raw);
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
 * The processes among `pids` that are Node itself, the only ones whose SIGUSR2 writes a report instead of killing them.
 * @param {readonly number[]} pids - candidate process ids
 * @returns {number[]} the Node processes among them, in the same order
 */
function nodeProcesses(pids) {
    const ps = spawnSync("ps", ["-o", "pid=,comm=", "-p", pids.join(",")], { encoding: "utf8" });
    if (typeof ps.stdout !== "string") {
        return [];
    }
    const node = new Set();
    for (const line of ps.stdout.split("\n")) {
        const [pid, ...name] = line.trim().split(/\s+/);
        // A vitest worker renames itself (`node (vitest 2)`), which Linux reports as its command name.
        if (name.length > 0 && basename(name.join(" ")).split(" ")[0] === "node") {
            node.add(Number(pid));
        }
    }
    return pids.filter((pid) => node.has(pid));
}

/**
 * The --outputFile a vitest command line names (`--outputFile=x`, `--outputFile x` or the `.json` form), if any.
 * @param {readonly string[]} argv - the arguments forwarded to vitest
 * @returns {string | undefined} the path as given
 */
function outputFileOf(argv) {
    for (let i = 0; i < argv.length; i += 1) {
        const match = /^--outputFile(?:\.json)?(?:=(.*))?$/.exec(argv[i]);
        if (match !== null) {
            return match[1] ?? argv[i + 1];
        }
    }
    return undefined;
}

/**
 * The wrapper's exit code and its cause. A run the watcher killed fails as hung (with vitest's own code when that is
 * non-zero); otherwise tools/shard-verdict.mjs decides, and a failure keeps vitest's non-zero code. Snapshots taken
 * along the way do not change the verdict.
 * @param {{status: number, killed?: boolean, silenceMs: number, output: string, outputFile?: string,
 *     outputWritten?: boolean}} run - what the run did
 * @returns {{exitCode: number, cause: string}} the exit code and a one-line cause
 */
export function verdict(run) {
    if (run.killed === true) {
        return {
            exitCode: run.status === 0 ? 1 : run.status,
            cause: `hung: still no output ${String(run.silenceMs / 1000)}s after the last snapshot, killed`,
        };
    }
    const missingReports =
        run.outputFile !== undefined && run.outputWritten !== true
            ? [`${run.outputFile} (missing, stale or not whole JSON)`]
            : [];
    const decision = shardVerdict({ code: run.status, log: run.output, missingReports });
    if (decision.pass) {
        return { exitCode: 0, cause: "vitest exited 0" };
    }
    return { exitCode: run.status === 0 ? 1 : run.status, cause: decision.cause };
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
 * Whether every process in `pids` has either written its whole report into `dir` or exited.
 * @param {string} dir - the report directory
 * @param {readonly number[]} pids - the signalled processes
 * @param {ReadonlySet<string>} before - the files already in `dir` before they were signalled
 * @returns {boolean} true once nothing more is coming
 */
function reportsSettled(dir, pids, before) {
    const names = readdirSync(dir).filter((name) => !before.has(name) && name.endsWith(".json"));
    // A report file appears before Node has finished writing it, so it counts once it parses.
    const complete = (name) => {
        try {
            JSON.parse(readFileSync(join(dir, name), "utf8"));
            return true;
        } catch {
            return false;
        }
    };
    return pids.every((pid) => {
        if (names.some((name) => name.includes(`.${String(pid)}.`) && complete(name))) {
            return true;
        }
        try {
            process.kill(pid, 0);
            return false;
        } catch {
            return true;
        }
    });
}

/**
 * Takes one snapshot: the process table, then a diagnostic report from every Node process still alive in the run.
 * @param {string} dir - the report directory the run's processes write to
 * @param {number} pid - the runner's process id
 * @param {number} index - which snapshot this is
 * @param {string} reason - why the snapshot is being taken, printed with it
 * @returns {Promise<number>} how many processes were signalled
 */
async function snapshot(dir, pid, index, reason) {
    console.log(`\n[hang-report] ${reason}; snapshot ${String(index)}`);
    console.log(processTable());
    if (!CAN_SIGNAL) {
        console.log("[hang-report] no diagnostic reports: this platform has no report-on-signal");
        return 0;
    }
    const pids = descendants(pid);
    const targets = nodeProcesses(pids);
    const before = new Set(readdirSync(dir));
    const signalled = [];
    for (const target of targets) {
        try {
            process.kill(target, "SIGUSR2");
            signalled.push(target);
        } catch {
            // the process may have exited between listing and signalling; nothing to report for it
        }
    }
    console.log(
        `[hang-report] signalled ${String(signalled.length)} of ${String(pids.length)} process(es) (the Node ones): ` +
            `${signalled.join(", ")}; left alone: ${pids.filter((p) => !targets.includes(p)).join(", ")}`,
    );
    if (signalled.length === 0) {
        console.log("[hang-report] nothing was left alive to report on");
        return 0;
    }
    const deadline = Date.now() + REPORT_WAIT_MS;
    while (Date.now() < deadline && !reportsSettled(dir, signalled, before)) {
        await new Promise((done) => {
            setTimeout(done, 100);
        });
    }
    const files = readdirSync(dir).filter((name) => name.endsWith(".json") && !before.has(name));
    if (files.length === 0) {
        console.log("[hang-report] the processes wrote no diagnostic report (is --report-on-signal set?)");
    }
    for (const file of files) {
        console.log(digestReport(join(dir, file)));
    }
    return signalled.length;
}

/**
 * Kills a run that stayed silent after every snapshot: the runner and everything under it.
 * @param {number} pid - the runner's process id
 * @param {number} taken - how many snapshots were taken, for the log line
 */
function killTree(pid, taken) {
    const pids = descendants(pid);
    console.log(`\n[hang-report] still silent after ${String(taken)} snapshot(s); killing ${pids.join(", ")}`);
    for (const target of pids) {
        try {
            process.kill(target, "SIGKILL");
        } catch {
            // already gone
        }
    }
}

/**
 * Whether a JSON report exists, was written at or after a moment (so a stale report never stands in for this run's)
 * and parses whole (so a report cut off mid-write does not count).
 * @param {string | undefined} path - the file, or undefined when none was named
 * @param {number} since - the moment, in milliseconds since the epoch
 * @returns {boolean} true when this run wrote a complete report there
 */
function reportComplete(path, since) {
    if (path === undefined || !existsSync(path) || statSync(path).mtimeMs < since) {
        return false;
    }
    try {
        JSON.parse(readFileSync(path, "utf8"));
        return true;
    } catch {
        return false;
    }
}

/**
 * Runs the projects and returns the exit code, taking a snapshot whenever the output goes quiet and once more when
 * the run fails.
 * @param {readonly string[]} argv - the wrapper's arguments, forwarded to vitest unchanged
 * @param {{command?: readonly string[], silenceMs?: number, reportDir?: string}} [options] - the runner the
 *     arguments are appended to (default `pnpm exec vitest run`), the silence that counts as a hang (default
 *     SILENCE_MS) and where reports go (default REPORT_DIR under the package); the tests set all three
 * @returns {Promise<number>} the exit code
 */
export async function main(argv, options = {}) {
    const { command = VITEST_COMMAND, silenceMs = SILENCE_MS, reportDir = REPORT_DIR } = options;
    // Every process writes its reports here, under names that carry its pid and a sequence number; each snapshot
    // digests the files that appeared after its own signals.
    const dir = resolve(packageRoot, reportDir);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    // No project named means the node project: every caller of this wrapper runs a node project, and letting vitest
    // default to all of them would silently pull in the browser project.
    const named = argv.some((arg) => arg === "--project" || arg.startsWith("--project="));
    const extra = named ? [...argv] : ["--project=node", ...argv];
    const outputFile = outputFileOf(extra);
    const release = off() ? () => {} : await acquire({ label: "webgpu-graph-algorithms: run-node-shard.js" });
    const env = { ...process.env, [HELD]: String(process.pid) };
    if (CAN_SIGNAL) {
        env.NODE_OPTIONS =
            `${process.env.NODE_OPTIONS ?? ""} --report-on-signal --report-signal=SIGUSR2 --report-directory=${dir}`.trim();
    }
    // A stale report from an earlier run must not stand in for this one's: its age is checked against this.
    const started = Date.now();
    // On a POSIX host the run goes through a shell so `ulimit -c 0` applies, and a worker that crashes writes no
    // core dump. The limit alone was not enough on CI: CI run 35788215777 (2026-09-22) caught `node (vitest 2)` in
    // the kernel's `vfs_coredump` with about 2 GB resident, which is where the run's long silent gap came from.
    // The runner's kernel.core_pattern pipes cores to a program, and core(5) says "The RLIMIT_CORE limit is not
    // enforced for core dumps that are piped to a program". The workflows that run this wrapper (ci.yml's
    // webgpu-graph-algorithms-node shard and gpu.yml) therefore set `kernel.core_pattern=core` first, a plain file
    // pattern, under which this limit binds. The crash that produced those dumps was dawn-node polling a freed
    // Dawn instance, fixed in PR #451. Windows has no such shell and no such dump, and `sh` may not resolve there
    // at all, so that host spawns the runner directly -- going through a shell it might not have would fail the
    // step before a single test ran.
    const quoted = [...command, ...extra].map((a) => `'${a}'`).join(" ");
    const child = CAN_SIGNAL
        ? spawn("sh", ["-c", `ulimit -c 0; exec ${quoted}`], { cwd: packageRoot, env }) // NOSONAR(S4721): runs the caller's own test command line, as the caller could itself
        : spawn(command[0], [...command.slice(1), ...extra], { cwd: packageRoot, env, shell: true }); // NOSONAR(S4721): the same command line, on Windows
    const transcript = [];
    let last = Date.now();
    let taken = 0;
    let signalled = 0;
    let killed = false;
    let busy = false;
    // The silence snapshot in flight, awaited before the verdict: the run can close while it still waits on reports.
    let inFlight = Promise.resolve();
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
    const timer = setInterval(
        () => {
            if (busy || Date.now() - last < silenceMs) {
                return;
            }
            if (taken >= MAX_SNAPSHOTS) {
                // Still silent after every snapshot: the run already fails as hung, so end it rather than leave it
                // to the job's time limit.
                killTree(child.pid ?? 0, taken);
                killed = true;
                clearInterval(timer);
                return;
            }
            busy = true;
            taken += 1;
            inFlight = snapshot(dir, child.pid ?? 0, taken, `no output for ${String(silenceMs / 1000)}s`)
                .then((count) => {
                    signalled += count;
                })
                .finally(() => {
                    last = Date.now();
                    busy = false;
                });
        },
        Math.min(5_000, silenceMs),
    );
    let status;
    try {
        status = await new Promise((done) => {
            child.on("close", (code) => done(code ?? 1));
        });
    } finally {
        clearInterval(timer);
        release();
    }
    await inFlight;
    const output = transcript.join("");
    if (status !== 0) {
        // First, before the process table and before anything else in the failure: which file never reported.
        console.log(`\n${formatMissingFiles(missingTestFiles(output))}`);
        taken += 1;
        await snapshot(dir, child.pid ?? 0, taken, `vitest exited ${String(status)}`);
    }
    console.log(`[hang-report] vitest exited ${String(status)} after ${String(taken)} snapshot(s)`);
    const outputPath = outputFile === undefined ? undefined : resolve(packageRoot, outputFile);
    const decision = verdict({
        status,
        killed,
        silenceMs,
        output,
        outputFile,
        outputWritten: reportComplete(outputPath, started),
    });
    printVerdict(decision, { status, output, signalled, silenceMs });
    return decision.exitCode;
}

/**
 * Prints the wrapper's verdict line: FAIL with its cause (after the missing files, when vitest itself exited 0), or a
 * PASS note when the run was signalled for a snapshot along the way; nothing for a quiet pass.
 * @param {{ exitCode: number, cause: string }} decision - verdict()'s decision
 * @param {{ status: number, output: string, signalled: number, silenceMs: number }} run - vitest's exit status, its
 *     transcript, the processes signalled for a snapshot and the silence that counted as a hang
 */
function printVerdict(decision, { status, output, signalled, silenceMs }) {
    if (decision.exitCode !== 0) {
        if (status === 0) {
            console.log(`\n${formatMissingFiles(missingTestFiles(output))}`);
        }
        console.log(`${VERDICT_MARKER} FAIL ${decision.cause}`);
    } else if (signalled > 0) {
        console.log(
            `${VERDICT_MARKER} PASS (note: the run went ${String(silenceMs / 1000)}s silent and ${String(signalled)} ` +
                `process(es) were signalled for a snapshot; it then finished with its summary and report)`,
        );
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    process.exit(await main(process.argv.slice(2)));
}
