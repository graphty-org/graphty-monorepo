/**
 * The daemon's state directory, `~/.githerd/<repository>/` (design section 9.1): state.json, the
 * ledger, the liveness files, the lock, the start counter, the spool and FATAL.
 *
 * state.json is rewritten whole on every change: a uniquely named temporary file is written and
 * fsynced, the old file is copied to state.json.bak, and the temporary file is renamed over it. A
 * crash leaves the old or the new file, never a torn one. All saves to one directory run through
 * one promise chain, so two saves never interleave.
 *
 * ledger.jsonl is append-only, one JSON object per line. When the month changes, the file is
 * renamed to ledger-YYYY-MM.jsonl for the month it was last written in.
 */

import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { appendFile, copyFile, mkdir, open, readdir, readFile, rename, stat, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

import { sameProcess } from "./proc.mjs";

/** The state schema this code reads and writes. */
export const STATE_SCHEMA = 1;

/** How long new runs are held after an empty-state start, so sessions can re-claim. */
export const RUN_HOLD_MS = 10 * 60 * 1000;

/** Three starts after an unclean exit within this window boot straight into fatal mode (design 9.2). */
export const CRASH_LOOP = { starts: 3, withinMs: 10 * 60 * 1000 };

const STATE = "state.json";
const LOCK = "lock";
const STARTS = "starts";
const ALIVE = "alive";
const PROGRESS = "progress";
const FATAL = "FATAL";
const SPOOL = "spool";
const STALE_TMP = /^state\.json\.\d+\.[0-9a-f]+\.tmp$/;
const LEDGER = "ledger.jsonl";
const ROTATED = /^ledger-(\d{4}-\d{2})\.jsonl$/;

/**
 * Migrations from one schema to the next, keyed by the schema they read. Each returns the state at
 * schema + 1.
 * @type {Record<number, (state: object) => object>}
 */
const MIGRATIONS = {};

/** @type {Map<string, Promise<unknown>>} the tail of each file's write chain */
const chains = new Map();

/**
 * Runs `fn` after every earlier call queued under the same key, whether those failed or not.
 * @template T
 * @param {string} key the file the chain protects
 * @param {() => Promise<T>} fn the work
 * @returns {Promise<T>} the work's result
 */
function serialize(key, fn) {
    const run = (chains.get(key) ?? Promise.resolve()).then(fn, fn);
    const tail = run.catch(() => {});
    chains.set(key, tail);
    void tail.then(() => {
        if (chains.get(key) === tail) chains.delete(key);
    });
    return run;
}

/**
 * Reads and parses one state file.
 * @param {string} file the path
 * @returns {Promise<{state: any} | {missing: true} | {error: string}>} the state, or why not
 */
async function readStateFile(file) {
    let text;
    try {
        text = await readFile(file, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") return { missing: true };
        return { error: `${file}: ${err.message}` };
    }
    try {
        const state = JSON.parse(text);
        if (state === null || typeof state !== "object" || !Number.isInteger(state.schema)) {
            return { error: `${file}: not a state object with an integer schema` };
        }
        return { state };
    } catch (err) {
        return { error: `${file}: ${err.message}` };
    }
}

/**
 * @typedef {object} LoadResult
 * @property {any} state the state to run with
 * @property {"state" | "bak" | "ledger" | "new" | "empty"} source where it came from: "ledger"
 *   when neither file could be read and the ledger's record lines rebuilt it, "new" when nothing
 *   was ever written, "empty" when files existed but nothing could be read or rebuilt
 * @property {boolean} readOnly true when the file has a newer schema than this code: serve status
 *   from it, never save it, and escalate
 * @property {string[]} errors why each unreadable file was rejected
 * @property {string[]} kept where each unreadable file was moved (`<name>.corrupt-<time>`), so the
 *   next save cannot overwrite it
 * @property {{emptyStart: true, at: string, holdRunsUntil: string} | null} recovery set on an
 *   empty-state or ledger-rebuilt start after a failure: open incidents and pending proposals are unknown, a red
 *   master gets a "githerd restarted" page instead of an incident page, proposals wait for a fresh
 *   veto query and a new grace period, and new runs wait until `holdRunsUntil`
 */

/**
 * Loads state.json, then state.json.bak, then the ledger's record lines (`replayLedger`), then
 * starts empty. An older schema is migrated forward after copying the file to
 * state.json.pre-migrate-<schema>. A file that could not be read is renamed to
 * `<name>.corrupt-<time>` once another source is chosen. Temporary files a killed save left behind
 * are removed: only the lock holder loads, so none of them is being written.
 * @param {string} dir the .githerd directory
 * @param {{now?: () => Date, migrations?: Record<number, (state: object) => object>}} [options] the clock and the
 *   migrations to apply
 * @returns {Promise<LoadResult>} the state and how it was obtained
 */
export async function loadState(dir, { now = () => new Date(), migrations = MIGRATIONS } = {}) {
    await removeStaleTemps(dir);
    /** @type {string[]} */
    const errors = [];
    /** @type {string[]} the unreadable files */
    const bad = [];
    let missing = 0;
    const keep = () => keepAside(bad, now(), errors);
    for (const [name, source] of /** @type {const} */ ([
        [STATE, "state"],
        [`${STATE}.bak`, "bak"],
    ])) {
        const file = join(dir, name);
        const read = await readCurrent(dir, file, migrations);
        if ("missing" in read) missing++;
        else if ("error" in read) {
            errors.push(read.error);
            bad.push(file);
        } else if (read.state.schema > STATE_SCHEMA) {
            return { state: read.state, source, readOnly: true, errors, kept: [], recovery: null };
        } else return { state: read.state, source, readOnly: false, errors, kept: await keep(), recovery: null };
    }
    const at = now();
    // Partial either way: a rebuilt state has no incidents, proposals or rate data.
    const recovery = {
        emptyStart: /** @type {const} */ (true),
        at: at.toISOString(),
        holdRunsUntil: new Date(at.getTime() + RUN_HOLD_MS).toISOString(),
    };
    const rebuilt = await replayLedger(dir);
    if (rebuilt) return { state: rebuilt, source: "ledger", readOnly: false, errors, kept: await keep(), recovery };
    const state = { schema: STATE_SCHEMA };
    if (missing === 2) return { state, source: "new", readOnly: false, errors, kept: [], recovery: null };
    return { state, source: "empty", readOnly: false, errors, kept: await keep(), recovery };
}

/**
 * Removes the temporary files a killed save left behind.
 * @param {string} dir the .githerd directory
 * @returns {Promise<void>}
 */
async function removeStaleTemps(dir) {
    try {
        for (const name of await readdir(dir)) if (STALE_TMP.test(name)) await unlink(join(dir, name));
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }
}

/**
 * Reads one state file and migrates an older schema forward, after copying the file to
 * state.json.pre-migrate-<schema>. A newer schema is returned as it is.
 * @param {string} dir the .githerd directory
 * @param {string} file the state file
 * @param {Record<number, (state: object) => object>} migrations the migrations
 * @returns {Promise<{state: any} | {missing: true} | {error: string}>} the state, or why not
 */
async function readCurrent(dir, file, migrations) {
    const read = await readStateFile(file);
    if (!("state" in read) || read.state.schema >= STATE_SCHEMA) return read;
    let { state } = read;
    try {
        await copyFile(file, join(dir, `${STATE}.pre-migrate-${state.schema}`));
        while (state.schema < STATE_SCHEMA) {
            const step = migrations[state.schema];
            if (!step) throw new Error(`no migration from schema ${state.schema}`);
            state = step(state);
        }
    } catch (err) {
        return { error: `${file}: ${err.message}` };
    }
    return { state };
}

/**
 * Moves unreadable state files aside as `<name>.corrupt-<time>`, so the next save cannot
 * overwrite them.
 * @param {string[]} bad the files
 * @param {Date} at the time in their new names
 * @param {string[]} errors gets a line for each file that could not be moved
 * @returns {Promise<string[]>} their new paths
 */
async function keepAside(bad, at, errors) {
    const stamp = at.toISOString().replaceAll(":", "-");
    const kept = [];
    for (const file of bad) {
        const to = `${file}.corrupt-${stamp}`;
        try {
            await rename(file, to);
            kept.push(to);
        } catch (err) {
            errors.push(`${file}: could not be kept aside: ${err.message}`);
        }
    }
    return kept;
}

/**
 * Saves the state atomically. Refuses a state of another schema, so a file from newer code is never
 * overwritten with its fields dropped.
 * @param {string} dir the .githerd directory
 * @param {{schema: number}} state the state
 * @returns {Promise<void>} resolves once the new file is in place
 */
export function saveState(dir, state) {
    if (state?.schema !== STATE_SCHEMA) {
        return Promise.reject(
            new Error(`refusing to save state with schema ${state?.schema}; this code writes ${STATE_SCHEMA}`),
        );
    }
    const text = `${JSON.stringify(state, null, 2)}\n`;
    const file = join(dir, STATE);
    return serialize(file, async () => {
        const tmp = join(dir, `${STATE}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`);
        try {
            const handle = await open(tmp, "wx");
            try {
                await handle.writeFile(text);
                await handle.sync();
            } finally {
                await handle.close();
            }
            try {
                await copyFile(file, `${file}.bak`);
            } catch (err) {
                if (err.code !== "ENOENT") throw err;
            }
            await rename(tmp, file);
        } catch (err) {
            await unlink(tmp).catch(() => {});
            throw err;
        }
    });
}

/**
 * Serializes a value as one line of plain ASCII JSON.
 * @param {unknown} value the value
 * @returns {string} the line, without its newline
 */
function asciiJson(value) {
    return JSON.stringify(value).replaceAll(
        /[\u007f-\uffff]/g,
        (c) => String.raw`\u${(c.codePointAt(0) ?? 0).toString(16).padStart(4, "0")}`,
    );
}

/**
 * Appends one entry to the ledger, rotating the file first when it was last written in an earlier
 * month. `ts` is filled in when the entry has none.
 * @param {string} dir the .githerd directory
 * @param {{kind: string, ts?: string} & Record<string, unknown>} entry the entry
 * @param {{now?: () => Date}} [options] the clock
 * @returns {Promise<void>} resolves once the line is appended
 */
export function appendLedger(dir, entry, { now = () => new Date() } = {}) {
    const file = join(dir, LEDGER);
    return serialize(file, async () => {
        const at = now();
        const month = at.toISOString().slice(0, 7);
        let lastWritten = null;
        try {
            lastWritten = (await stat(file)).mtime.toISOString().slice(0, 7);
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
        if (lastWritten !== null && lastWritten < month) await rotate(dir, lastWritten);
        await appendFile(file, `${asciiJson({ ts: at.toISOString(), ...entry })}\n`);
    });
}

/**
 * Moves ledger.jsonl to ledger-<month>.jsonl, appending when that file already exists.
 * @param {string} dir the .githerd directory
 * @param {string} month YYYY-MM
 * @returns {Promise<void>}
 */
async function rotate(dir, month) {
    const from = join(dir, LEDGER);
    const to = join(dir, `ledger-${month}.jsonl`);
    try {
        await stat(to);
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
        await rename(from, to);
        return;
    }
    await appendFile(to, await readFile(from));
    await unlink(from);
}

/**
 * Parses ledger lines, skipping a torn (unparseable) line.
 * @param {string} text the file's contents
 * @returns {any[]} the entries
 */
function parseLines(text) {
    const entries = [];
    for (const line of text.split("\n")) {
        if (!line) continue;
        try {
            entries.push(JSON.parse(line));
        } catch {
            // A crash mid-append leaves a torn last line; it carries nothing recoverable.
        }
    }
    return entries;
}

/**
 * Reads ledger entries, oldest first. Without `since`, only the current month's file is read; with
 * it, the rotated files from that month on are read too and older entries are dropped.
 * @param {string} dir the .githerd directory
 * @param {{since?: Date}} [options] the oldest entry to return
 * @returns {Promise<any[]>} the entries
 */
export async function readLedger(dir, { since } = {}) {
    let names = [];
    if (since) {
        const fromMonth = since.toISOString().slice(0, 7);
        try {
            names = (await readdir(dir))
                .map((n) => ROTATED.exec(n))
                .filter((m) => m && m[1] >= fromMonth)
                .map((m) => m[0])
                .sort((a, b) => a.localeCompare(b));
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }
    names.push(LEDGER);
    const entries = [];
    for (const name of names) {
        try {
            entries.push(...parseLines(await readFile(join(dir, name), "utf8")));
        } catch (err) {
            if (err.code !== "ENOENT") throw err;
        }
    }
    if (!since) return entries;
    const from = since.toISOString();
    return entries.filter((e) => typeof e.ts === "string" && e.ts >= from);
}

/** The record id of a collection recorded whole (a list). */
export const WHOLE = "*";

/** The collections every save records in the ledger, so state can be rebuilt from it (9.1). */
export const RECORDED = ["jobs", "claims", "sessions", "orders", "policies", "vetoes", "settings"];

/**
 * The record lines for what changed in the recorded collections since `last`, which it updates:
 * one per changed or removed id, or one for a whole list that changed.
 * @param {Record<string, any>} state the state about to be saved
 * @param {Record<string, Map<string, string>>} last each collection's records as last recorded,
 *   serialized; updated in place
 * @returns {{kind: "record", collection: string, id: string, record: unknown}[]} the lines
 */
export function recordLines(state, last) {
    const lines = [];
    for (const collection of RECORDED) {
        const value = state[collection];
        /** @type {[string, unknown][]} */
        const entries = Array.isArray(value) ? [[WHOLE, value]] : Object.entries(value ?? {});
        const now = new Map(entries.map(([id, rec]) => [id, JSON.stringify(rec)]));
        const before = last[collection] ?? new Map();
        for (const [id, text] of now) {
            if (before.get(id) !== text) lines.push({ kind: "record", collection, id, record: JSON.parse(text) });
        }
        for (const id of before.keys()) {
            if (!now.has(id)) lines.push({ kind: "record", collection, id, record: null });
        }
        last[collection] = now;
    }
    return /** @type {any} */ (lines);
}

/**
 * Rebuilds state from the ledger's record lines, every month of them. A line
 * `{kind: "record", collection, id, record}` is the whole record after a change; `record: null`
 * removes it. A collection kept as a list (orders, policies) is recorded whole under the id `*`. Whoever changes a job, claim, session, order, policy, veto or setting appends one, so
 * the last line per (collection, id) is the record as it was last saved.
 * @param {string} dir the state directory
 * @returns {Promise<{schema: number} & Record<string, any> | null>} the state, or null when the
 *   ledger has no record lines
 */
export async function replayLedger(dir) {
    /** @type {{schema: number} & Record<string, any>} */
    const state = { schema: STATE_SCHEMA };
    let found = false;
    for (const e of await readLedger(dir, { since: new Date(0) })) {
        if (e.kind !== "record" || typeof e.collection !== "string" || typeof e.id !== "string") continue;
        found = true;
        if (e.id === WHOLE) {
            state[e.collection] = e.record;
            continue;
        }
        const records = (state[e.collection] ??= {});
        if (e.record === null) delete records[e.id];
        else records[e.id] = e.record;
    }
    return found ? state : null;
}

/**
 * The state directory of a repository whose main checkout is `root`: `~/.githerd/<its name>/`,
 * outside every checkout, so a daemon started from any worktree finds the same lock.
 * @param {string} root the main checkout
 * @param {string} [home] the home directory
 * @returns {string} the directory
 */
export function defaultStateDir(root, home = homedir()) {
    return join(home, ".githerd", basename(root));
}

/**
 * Replaces a small file whole: written beside it, then renamed over it.
 * @param {string} file the path
 * @param {string} text the contents
 */
function replaceFile(file, text) {
    const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
    writeFileSync(tmp, text);
    renameSync(tmp, file);
}

/**
 * Reads a small JSON file.
 * @param {string} file the path
 * @returns {any} its value, or null when it is missing or unreadable
 */
function readJson(file) {
    try {
        return JSON.parse(readFileSync(file, "utf8"));
    } catch {
        return null;
    }
}

/**
 * @typedef {{pid: number, startTime: string, bootId: string}} Identity
 */

/**
 * Whether a lock record names this process.
 * @param {any} rec the record
 * @param {Identity} self this process
 * @returns {boolean} true when pid, start time and boot id match
 */
const isSelf = (rec, self) => rec.pid === self.pid && rec.startTime === self.startTime && rec.bootId === self.bootId;

/**
 * The live process the lock names, other than `self`.
 * @param {string} dir the state directory
 * @param {Identity} self this process
 * @returns {any} the holder's record, or null when the lock is free, stale or ours
 */
export function otherHolder(dir, self) {
    const rec = readJson(join(dir, LOCK));
    if (!rec || !Number.isInteger(rec.pid) || isSelf(rec, self)) return null;
    return sameProcess(rec) ? rec : null;
}

/** A lock file that does not parse is a start caught mid-write until it is this old. */
const TORN_LOCK_MS = 10_000;
/** A steal marker this old was left by a starter killed while stealing. */
const STEAL_STALE_MS = 60_000;

/**
 * The modification time of a path, or 0 when it is gone.
 * @param {string} path the path
 * @returns {number} milliseconds since the epoch
 */
function mtimeOf(path) {
    try {
        return statSync(path).mtimeMs;
    } catch {
        return 0;
    }
}

/**
 * Whether the lock may be removed: it exists and names no live process other than `self` (a dead
 * process, a reused pid, or this process itself), or it does not parse and is older than a write.
 * @param {string} dir the state directory
 * @param {Identity} self this process
 * @returns {boolean} true when stale
 */
function lockStale(dir, self) {
    const file = join(dir, LOCK);
    const rec = readJson(file);
    if (rec && Number.isInteger(rec.pid)) return !otherHolder(dir, self);
    const mtime = mtimeOf(file);
    return mtime > 0 && Date.now() - mtime > TORN_LOCK_MS;
}

/**
 * Waits a little without giving up the thread: the lock is taken before the event loop matters.
 * @param {number} ms how long
 */
function pause(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Takes the daemon lock: `lock` holds this process's identity and its cwd. A lock whose process is
 * dead, or is another process under a reused pid, is stale and taken. Only the holder of
 * `lock.steal` (a directory, so `mkdir` decides who holds it) removes a stale lock, and it judges
 * the lock again first: two starters that both judged it stale a moment ago would otherwise both
 * remove it, the second removing the lock the first had just written, and both would start.
 * @param {string} dir the state directory
 * @param {Identity} self this process
 * @param {string} [cwd] recorded so a daemon started from the wrong directory can be named
 * @returns {{ok: true, stale: any} | {ok: false, holder: any}} taken (with the stale record it
 *   replaced, if any), or the live holder
 */
export function takeLock(dir, self, cwd = process.cwd()) {
    const file = join(dir, LOCK);
    const text = `${JSON.stringify({ ...self, cwd })}\n`;
    let stale = null;
    for (;;) {
        if (createOnly(file, text)) return { ok: true, stale };
        const holder = otherHolder(dir, self);
        if (holder) return { ok: false, holder };
        stale = stealStale(dir, self) ?? stale;
    }
}

/**
 * Creates a file only if it does not exist.
 * @param {string} file the path
 * @param {string} text the contents
 * @returns {boolean} false when it already existed
 */
function createOnly(file, text) {
    try {
        writeFileSync(file, text, { flag: "wx" });
        return true;
    } catch (err) {
        if (err.code === "EEXIST") return false;
        throw err;
    }
}

/**
 * Removes the lock if it is stale, holding `lock.steal` while it judges and removes it.
 * @param {string} dir the state directory
 * @param {Identity} self this process
 * @returns {any} the stale record it removed, or null when it removed nothing (another starter is
 *   stealing, a start is mid-write, or the lock is gone)
 */
function stealStale(dir, self) {
    const file = join(dir, LOCK);
    const steal = `${file}.steal`;
    try {
        mkdirSync(steal);
    } catch (err) {
        if (err.code !== "EEXIST") throw err;
        if (Date.now() - mtimeOf(steal) > STEAL_STALE_MS) rmSync(steal, { recursive: true, force: true });
        pause(10);
        return null;
    }
    try {
        if (!lockStale(dir, self)) {
            pause(10);
            return null;
        }
        const rec = readJson(file) ?? { unreadable: true };
        rmSync(file, { force: true });
        return rec;
    } finally {
        rmSync(steal, { recursive: true, force: true });
    }
}

/**
 * Removes the lock if it still names this process.
 * @param {string} dir the state directory
 * @param {Identity} self this process
 */
export function releaseLock(dir, self) {
    const rec = readJson(join(dir, LOCK));
    if (rec && isSelf(rec, self)) unlinkSync(join(dir, LOCK));
}

/**
 * Records a start after an unclean exit in `starts` (the last 10 such start times) and says whether
 * it completes a crash loop.
 * @param {string} dir the state directory
 * @param {Date} at the start time
 * @returns {{starts: string[], crashLoop: boolean}} the recorded starts, and whether `CRASH_LOOP`
 *   of them (this one included) fall within its window
 */
export function recordStart(dir, at) {
    const file = join(dir, STARTS);
    const before = readJson(file);
    const starts = [
        ...(Array.isArray(before) ? before.filter((s) => typeof s === "string") : []),
        at.toISOString(),
    ].slice(-10);
    replaceFile(file, `${JSON.stringify(starts)}\n`);
    const from = at.getTime() - CRASH_LOOP.withinMs;
    return { starts, crashLoop: starts.filter((s) => Date.parse(s) > from).length >= CRASH_LOOP.starts };
}

/**
 * Writes `alive`: who is running, written every 10 s by a timer independent of the reconcile.
 * @param {string} dir the state directory
 * @param {{pid: number, startTime: string, version: string, pid1Start: string | null, at: string}} rec
 *   the record
 */
export function writeAlive(dir, rec) {
    replaceFile(join(dir, ALIVE), `${JSON.stringify(rec)}\n`);
}

/**
 * Writes `progress`: the step the daemon is in and when it began.
 * @param {string} dir the state directory
 * @param {string} step the step
 * @param {string} since when it began
 */
export function writeProgress(dir, step, since) {
    replaceFile(join(dir, PROGRESS), `${JSON.stringify({ step, since })}\n`);
}

/**
 * Writes `FATAL` with the reason.
 * @param {string} dir the state directory
 * @param {string} reason why githerd cannot go on
 */
export function writeFatal(dir, reason) {
    replaceFile(join(dir, FATAL), `${reason}\n`);
}

/**
 * Removes `FATAL`.
 * @param {string} dir the state directory
 */
export function clearFatal(dir) {
    try {
        unlinkSync(join(dir, FATAL));
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }
}

/**
 * What the liveness files say, for restarters, the CLI and the next start.
 * @param {string} dir the state directory
 * @returns {{alive: any, progress: any, fatal: string | null, lock: any}} each file's contents, null
 *   when missing
 */
export function readLiveness(dir) {
    let fatal = null;
    try {
        fatal = readFileSync(join(dir, FATAL), "utf8").trimEnd();
    } catch {
        // no FATAL
    }
    return {
        alive: readJson(join(dir, ALIVE)),
        progress: readJson(join(dir, PROGRESS)),
        fatal,
        lock: readJson(join(dir, LOCK)),
    };
}

/**
 * Leaves a hook event for the daemon while it is down: one file per event in `spool/`, written
 * beside its final name and renamed, so the drain never reads half an event.
 * @param {string} dir the state directory
 * @param {Record<string, unknown>} event the event
 * @param {{now?: () => Date}} [options] the clock
 * @returns {Promise<string>} the file's name
 */
export async function spoolEvent(dir, event, { now = () => new Date() } = {}) {
    const spool = join(dir, SPOOL);
    await mkdir(spool, { recursive: true });
    const name = `${now().getTime()}-${process.pid}-${randomBytes(4).toString("hex")}.json`;
    const tmp = join(spool, `${name}.tmp`);
    await appendFile(tmp, asciiJson({ ts: now().toISOString(), ...event }));
    await rename(tmp, join(spool, name));
    return name;
}

/**
 * Removes a file, already gone counting as removed.
 * @param {string} file the path
 * @returns {Promise<void>}
 */
async function unlinkGone(file) {
    try {
        await unlink(file);
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }
}

/**
 * Hands every spooled event to `handle`, oldest first, removing each once handled. A handler that
 * throws stops the drain and leaves that event and the rest for the next one. An event that does not
 * parse is removed and reported. An event file that vanishes meanwhile was handled by someone else
 * and is skipped.
 * @param {string} dir the state directory
 * @param {(event: any) => unknown} handle what to do with one event
 * @returns {Promise<{handled: number, bad: string[]}>} how many were handled, and the unparseable
 *   files' names
 */
export async function drainSpool(dir, handle) {
    const spool = join(dir, SPOOL);
    let names;
    try {
        names = (await readdir(spool))
            .filter((n) => n.endsWith(".json"))
            .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    } catch (err) {
        if (err.code === "ENOENT") return { handled: 0, bad: [] };
        throw err;
    }
    let handled = 0;
    const bad = [];
    for (const name of names) {
        const file = join(spool, name);
        let text;
        try {
            text = await readFile(file, "utf8");
        } catch (err) {
            if (err.code === "ENOENT") continue; // drained by someone else meanwhile
            throw err;
        }
        let event;
        try {
            event = JSON.parse(text);
        } catch {
            bad.push(name);
            await unlinkGone(file);
            continue;
        }
        await handle(event);
        await unlinkGone(file);
        handled++;
    }
    return { handled, bad };
}
