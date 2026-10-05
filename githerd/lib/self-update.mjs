/**
 * Self-update (design section 9.8): the gates a new copy of githerd passes before it runs, and the
 * record of each verdict and of the adoption in flight.
 *
 * A master move that touches the package gives it a new tree hash. The copy archived from it into
 * `versions/` runs three gates, in order, and stops at the first that fails:
 *
 * 1. **replay**: the new copy's replay suite (`test/replay`, the recorded month) in a detached
 *    worktree of the target commit, with the main checkout's `node_modules` for the package (the
 *    suite reads other packages' files, so it runs in a whole tree, not the archived copy).
 * 2. **protocol**: the new daemon, started on a scratch state directory with no polling, serves the
 *    previous copy's client: every tool the previous client offers is still listed, and its
 *    `githerd_status` call, with its tool protocol, is answered while a session that has not yet
 *    called in the new protocol is live, as it is during a real update.
 * 3. **self-test**: the platform self-test (design 11.4) run by the new copy's CLI.
 *
 * Each gate is a child process of its own, bounded by a timeout that kills its process group. The
 * verdicts live in `self-update.json` in the state directory: `gates` by tree hash (`passed`, and
 * for a refusal the gate and the reason), `adopting`, the version `current` was just pointed at
 * with the one it replaced, until that version answers, and `gating`, the gate running now: its
 * hash, the running child's process group and its worktree. A refused hash is never gated again; a
 * new master move brings a new hash.
 *
 * Gating holds `gate.lock` (launcher.mjs), so one process gates at a time. A gater that stops
 * kills its gate (`stopGating`); one that died leaves `gating` behind, and the next holder of the
 * lock, or the daemon at its start, removes what it left (`reapGating`) before it gates again.
 */

import {
    existsSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    readlinkSync,
    renameSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

import { writeLastGood } from "./config-adopt.mjs";
import { resolveConfig } from "./config.mjs";
import { identify, sameProcess } from "./proc.mjs";
import { reapSelftest } from "./selftest.mjs";
import { run } from "./worktrees.mjs";

const FILE = "self-update.json";
/** Gate verdicts kept, newest first. */
const KEEP_GATES = 20;
/** Each gate's bound. */
const GATE_MS = { replay: 10 * 60_000, protocol: 2 * 60_000, selftest: 30 * 60_000, worktree: 5 * 60_000 };
/** How much of a failing gate's output its verdict keeps. */
const DETAIL_LINES = 5;

/**
 * A gate's verdict on one version.
 * @typedef {{passed: boolean, at: string, version?: string, gate?: string, detail?: string}} GateRecord
 * @typedef {{hash: string, pgid: number | null, leader?: import("./proc.mjs").ProcessIdentity | null,
 *   tree: string | null}} Gating the gate running now: its hash, its running child's process group
 *   and that child's identity, and its worktree
 * @typedef {{gates: Record<string, GateRecord>, adopting: {hash: string, previous: string, at: string} | null,
 *   gating?: Gating | null}} SelfUpdate
 * @typedef {{ok: boolean, detail: string}} GateResult
 * @typedef {{name: string, run: (c: {dir: string, previous: string | null, commit: string,
 *   onSpawn?: (pgid: number) => void}) => Promise<GateResult>}} Gate a gate; `onSpawn` is told each
 *   child's process group
 */

/**
 * Reads `self-update.json`.
 * @param {string} stateDir the state directory
 * @returns {SelfUpdate} the record; empty when missing or unreadable
 */
export function readSelfUpdate(stateDir) {
    try {
        const record = JSON.parse(readFileSync(join(stateDir, FILE), "utf8"));
        return { gates: record.gates ?? {}, adopting: record.adopting ?? null, gating: record.gating ?? null };
    } catch {
        return { gates: {}, adopting: null, gating: null };
    }
}

/**
 * Writes `self-update.json` whole (temporary file, then rename), keeping the newest verdicts.
 * @param {string} stateDir the state directory
 * @param {SelfUpdate} record the record
 */
export function writeSelfUpdate(stateDir, record) {
    const gates = Object.fromEntries(
        Object.entries(record.gates)
            .sort(([, a], [, b]) => b.at.localeCompare(a.at))
            .slice(0, KEEP_GATES),
    );
    const file = join(stateDir, FILE);
    const tmp = `${file}.${process.pid}.tmp`;
    const whole = { gates, adopting: record.adopting, gating: record.gating ?? null };
    writeFileSync(tmp, `${JSON.stringify(whole, null, 2)}\n`);
    renameSync(tmp, file);
}

/**
 * The version directory `current` points at.
 * @param {string} stateDir the state directory
 * @returns {string | null} `<stateDir>/versions/<name>`, or null when there is no `current`
 */
export function currentDir(stateDir) {
    try {
        return join(stateDir, "versions", basename(readlinkSync(join(stateDir, "current"))));
    } catch {
        return null;
    }
}

/**
 * The tree hash of the version `current` points at.
 * @param {string} stateDir the state directory
 * @returns {string | null} the hash, or null when there is no `current` or no version.json
 */
export function currentHash(stateDir) {
    const dir = currentDir(stateDir);
    if (!dir) return null;
    try {
        return JSON.parse(readFileSync(join(dir, "version.json"), "utf8")).codeHash ?? null;
    } catch {
        return null;
    }
}

/**
 * Where a version stands: `passed` when its gates passed or it is already `current` (the owner's
 * `githerd install`, or an adoption), `refused` when a gate or its start failed, `pending` before
 * its gates ran.
 * @param {string} stateDir the state directory
 * @param {string} hash the version's tree hash
 * @returns {"passed" | "refused" | "pending"} the verdict
 */
export function updateGate(stateDir, hash) {
    if (currentHash(stateDir) === hash) return "passed";
    const gate = readSelfUpdate(stateDir).gates[hash];
    if (!gate) return "pending";
    return gate.passed ? "passed" : "refused";
}

/**
 * The last lines of a child's output, stdout after stderr, in plain ASCII (the gates turn color
 * off).
 * @param {{stdout: string, stderr: string}} r the output
 * @returns {string} up to five lines joined with ` | `
 */
export function tail(r) {
    // stdout last: a test runner's summary ends it.
    return `${r.stderr}\n${r.stdout}`
        .replaceAll(/[^\x20-\x7e\n]/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(-DETAIL_LINES)
        .join(" | ");
}

/**
 * A bounded child's exit as a gate result.
 * @param {import("./worktrees.mjs").RunResult} r the child's result
 * @param {number} ms its bound
 * @returns {GateResult} ok on exit 0
 */
function verdict(r, ms) {
    if (r.timedOut) return { ok: false, detail: `timed out after ${ms / 60_000} min` };
    return { ok: r.code === 0, detail: tail(r) || `exit ${r.code}` };
}

/**
 * Removes the replay gate's worktree: its `node_modules` link first, so `git worktree remove` finds
 * it clean and needs no `--force`.
 * @param {string} root the main checkout
 * @param {string} tree the worktree
 * @param {string} link its `node_modules` link
 * @returns {Promise<string | null>} why it could not be removed, or null
 */
async function dropTree(root, tree, link) {
    rmSync(link, { force: true });
    let why = null;
    if (existsSync(tree)) {
        const r = await run("git", ["worktree", "remove", tree], { cwd: root });
        if (r.code !== 0) why = (r.stderr || r.stdout).trim();
    }
    await run("git", ["worktree", "prune"], { cwd: root });
    return why;
}

/**
 * The replay gate: the target commit's replay suite, in a detached worktree of that commit.
 * @param {{root: string, pkgDir: string, stateDir: string, env: Record<string, string | undefined>,
 *   commit: string, onSpawn?: (pgid: number) => void}} options the main checkout, the package's
 *   path in it, the state directory, the environment, the target commit, and who is told each
 *   child's process group
 * @returns {Promise<GateResult>} the result
 */
export async function replayGate({ root, pkgDir, stateDir, env, commit, onSpawn }) {
    const modules = join(root, pkgDir, "node_modules");
    const vitest = join(modules, "vitest", "vitest.mjs");
    if (!existsSync(vitest)) return { ok: false, detail: `no ${vitest}: run pnpm install in the main checkout` };
    const tree = gateTree(stateDir, commit);
    const link = join(tree, pkgDir, "node_modules");
    const left = await dropTree(root, tree, link);
    if (left) return { ok: false, detail: `an earlier gate's worktree ${tree} is in the way: ${left}` };
    const add = await run("git", ["worktree", "add", "--detach", tree, commit], {
        cwd: root,
        env: { ...env, GIT_LFS_SKIP_SMUDGE: "1" },
        timeoutMs: GATE_MS.worktree,
        onSpawn,
    });
    if (add.code !== 0) return { ok: false, detail: `git worktree add: ${tail(add)}` };
    try {
        symlinkSync(modules, link);
        const r = await run(process.execPath, [vitest, "run", "test/replay"], {
            cwd: join(tree, pkgDir),
            env: { ...env, NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" },
            timeoutMs: GATE_MS.replay,
            onSpawn,
        });
        return verdict(r, GATE_MS.replay);
    } finally {
        await dropTree(root, tree, link);
    }
}

/**
 * The protocol gate: the new copy's `bin/githerd-protocol-test.mjs` against the previous copy.
 * @param {{root: string, env: Record<string, string | undefined>, dir: string,
 *   previous: string | null, onSpawn?: (pgid: number) => void}} options the main checkout, the
 *   environment, the new copy, the previous one, and who is told the child's process group
 * @returns {Promise<GateResult>} the result; passes when there is no previous copy
 */
export async function protocolGate({ root, env, dir, previous, onSpawn }) {
    if (!previous) return { ok: true, detail: "no previous version" };
    const r = await run(process.execPath, [join(dir, "bin", "githerd-protocol-test.mjs"), previous], {
        cwd: root,
        env,
        timeoutMs: GATE_MS.protocol,
        onSpawn,
    });
    return verdict(r, GATE_MS.protocol);
}

/**
 * The self-test gate: `githerd selftest` from the new copy (design 11.4).
 * @param {{root: string, env: Record<string, string | undefined>, dir: string,
 *   onSpawn?: (pgid: number) => void}} options the main checkout, the environment, the new copy,
 *   and who is told the child's process group
 * @returns {Promise<GateResult>} the result
 */
export async function selftestGate({ root, env, dir, onSpawn }) {
    const r = await run(process.execPath, [join(dir, "bin", "githerd.mjs"), "selftest"], {
        cwd: root,
        env,
        timeoutMs: GATE_MS.selftest,
        onSpawn,
    });
    return verdict(r, GATE_MS.selftest);
}

/**
 * The three gates, in order.
 * @param {{root: string, pkgDir: string, stateDir: string,
 *   env: Record<string, string | undefined>}} options the main checkout, the package's path in it,
 *   the state directory and the environment
 * @returns {Gate[]} replay, protocol, self-test
 */
export function realGates({ root, pkgDir, stateDir, env }) {
    return [
        {
            name: "replay",
            run: ({ commit, onSpawn }) => replayGate({ root, pkgDir, stateDir, env, commit, onSpawn }),
        },
        { name: "protocol", run: ({ dir, previous, onSpawn }) => protocolGate({ root, env, dir, previous, onSpawn }) },
        { name: "self-test", run: ({ dir, onSpawn }) => selftestGate({ root, env, dir, onSpawn }) },
    ];
}

/**
 * The worktree a gate of this commit runs in.
 * @param {string} stateDir the state directory
 * @param {string} commit the target commit
 * @returns {string} `<stateDir>/gate-trees/<first 12 of the commit>`
 */
export function gateTree(stateDir, commit) {
    return join(stateDir, "gate-trees", commit.slice(0, 12));
}

/**
 * Records the gate running now in `self-update.json` (null when none), keeping the rest.
 * @param {string} stateDir the state directory
 * @param {Gating | null} gating the gate
 */
export function writeGating(stateDir, gating) {
    writeSelfUpdate(stateDir, { ...readSelfUpdate(stateDir), gating });
}

/**
 * Kills the recorded gate's process group, if it is still that group: its leader is the recorded
 * process, or no process has its id (Linux gives no new process the id of a live group, so the
 * group's other members, if any, are the gate's).
 * @param {Gating | null | undefined} gating the record
 */
function killGroup(gating) {
    const pgid = gating?.pgid;
    if (!pgid) return;
    if (!(gating.leader && sameProcess(gating.leader)) && identify(pgid) !== null) return;
    try {
        process.kill(-pgid, "SIGKILL");
    } catch {
        // gone already
    }
}

/**
 * Removes what a gate that did not finish left (design 9.8): its process group, every worktree
 * under `gate-trees/` (a superseded commit's too), and the self-test's tmux server and worktree.
 * Called holding `gate.lock`, so no gate of this state directory runs meanwhile.
 * @param {{root: string, stateDir: string, pkgDir: string, env: Record<string, string | undefined>,
 *   selftest?: (root: string, env: Record<string, string | undefined>) => Promise<string | null>}} options
 *   the main checkout, the state directory, the package's path, the environment, and the
 *   self-test's cleanup (for tests)
 * @returns {Promise<string[]>} what could not be removed
 */
export async function reapGating({ root, stateDir, pkgDir, env, selftest = reapSelftest }) {
    killGroup(readSelfUpdate(stateDir).gating);
    const left = [];
    const trees = join(stateDir, "gate-trees");
    for (const name of existsSync(trees) ? readdirSync(trees) : []) {
        const tree = join(trees, name);
        const why = await dropTree(root, tree, join(tree, pkgDir, "node_modules"));
        if (why) left.push(`${tree}: ${why}`);
    }
    await run("git", ["worktree", "prune"], { cwd: root, env });
    const why = await selftest(root, env);
    if (why) left.push(`self-test worktree: ${why}`);
    writeGating(stateDir, null);
    return left;
}

/**
 * Stops the gate this process runs (a daemon's shutdown): the gating is aborted, so it records no
 * verdict; its running child's group is killed; and once it returned, what it left is removed.
 * @param {{root: string, stateDir: string, pkgDir: string, env: Record<string, string | undefined>,
 *   abort: AbortController, running: Promise<unknown>,
 *   selftest?: (root: string, env: Record<string, string | undefined>) => Promise<string | null>}} options
 *   where it runs, its abort, and its promise
 * @returns {Promise<string[]>} what could not be removed
 */
export async function stopGating({ abort, running, ...where }) {
    abort.abort();
    killGroup(readSelfUpdate(where.stateDir).gating);
    await running.catch(() => {});
    return reapGating(where);
}

/**
 * Records the default branch's config as the last good one in a scratch state directory. An
 * invalid or missing config is left for the daemon to report.
 * @param {string} root the main checkout
 * @param {Record<string, string | undefined>} env the environment
 * @param {string} stateDir the scratch state directory
 */
function seedLastGood(root, env, stateDir) {
    try {
        const r = resolveConfig(root, env);
        if (r.configured)
            writeLastGood(stateDir, { config: r.config, source: r.source, adoptedAt: new Date().toISOString() });
    } catch {
        // invalid: the daemon reports it
    }
}

/**
 * The protocol test itself, run inside the new copy: its daemon on a scratch state directory with
 * no polling, asked by the previous copy's client (its tool list and `forwardingTools`, with its
 * tool protocol).
 * @param {{root: string, previous: string, env: Record<string, string | undefined>,
 *   startDaemon: typeof import("./daemon.mjs").startDaemon}} options the main checkout, the previous
 *   copy, the environment and the new copy's daemon
 * @returns {Promise<GateResult>} the result
 */
export async function protocolCheck({ root, previous, env, startDaemon }) {
    const prev = await import(pathToFileURL(join(previous, "lib", "mcp.mjs")).href);
    const stateDir = mkdtempSync(join(tmpdir(), "githerd-protocol-"));
    // The scratch directory has no ledger, so the config gate (design 9.7) would refuse a config
    // with an acting group and boot the daemon fatal; the protocol is the question here, not the config.
    seedLastGood(root, env, stateDir);
    const daemon = await startDaemon({
        root,
        port: 0,
        env,
        stateDir,
        autoPoll: false,
        workers: false,
        quiet: true,
        log: () => {},
    });
    try {
        /**
         * Posts one JSON-RPC message to the new daemon.
         * @param {object} msg the request
         * @returns {Promise<any>} the reply
         */
        const send = async (msg) => {
            const res = await fetch(`${daemon.url}/rpc`, {
                method: "POST",
                headers: { "content-type": "application/json", "x-githerd-session": "protocol-test" },
                body: JSON.stringify(msg),
            });
            return res.json();
        };
        const listed = await send({ jsonrpc: "2.0", id: 0, method: "tools/list" });
        const served = new Set((listed.result?.tools ?? []).map((/** @type {{name: string}} */ t) => t.name));
        const missing = prev.TOOLS.map((/** @type {{name: string}} */ t) => t.name).filter((n) => !served.has(n));
        if (missing.length)
            return { ok: false, detail: `the new daemon lacks the previous client's ${missing.join(", ")}` };
        // In production the previous client's sessions are live before they call the new daemon,
        // and a live session that has not called in the new protocol is what makes the daemon serve
        // the previous one. The scratch daemon has no session yet, so this one registers first.
        await fetch(`${daemon.url}/heartbeat`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ session: "protocol-test", cwd: root }),
        });
        const status = prev
            .forwardingTools(send, () => ({ protocol: prev.TOOL_PROTOCOL }))
            .find((/** @type {{name: string}} */ t) => t.name === "githerd_status");
        const reply = await status.handler({});
        if (reply.isError)
            return { ok: false, detail: `githerd_status from the previous client: ${reply.text.split("\n")[0]}` };
        return { ok: true, detail: `the previous client (tool protocol ${prev.TOOL_PROTOCOL}) is served` };
    } finally {
        await daemon.shutdown?.();
        rmSync(stateDir, { recursive: true, force: true });
    }
}
