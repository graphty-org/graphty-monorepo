/**
 * The daemon's state file and ledger in `<root>/.githerd/` (design sections 5.1, 5.7 and 5.8).
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
import { appendFile, copyFile, open, readdir, readFile, rename, stat, unlink } from "node:fs/promises";
import { join } from "node:path";

/** The state schema this code reads and writes. */
export const STATE_SCHEMA = 1;

/** How long new runs are held after an empty-state start, so sessions can re-claim. */
export const RUN_HOLD_MS = 10 * 60 * 1000;

const STATE = "state.json";
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
 * @property {"state" | "bak" | "new" | "empty"} source where it came from: "new" when no state
 *   file has ever been written, "empty" when files existed but none could be read
 * @property {boolean} readOnly true when the file has a newer schema than this code: serve status
 *   from it, never save it, and escalate
 * @property {string[]} errors why each unreadable file was rejected
 * @property {{emptyStart: true, at: string, holdRunsUntil: string} | null} recovery set on an
 *   empty-state start after a failure: open incidents and pending proposals are unknown, a red
 *   master gets a "githerd restarted" page instead of an incident page, proposals wait for a fresh
 *   veto query and a new grace period, and new runs wait until `holdRunsUntil`
 */

/**
 * Loads state.json, then state.json.bak, then starts empty. An older schema is migrated forward
 * after copying the file to state.json.pre-migrate-<schema>.
 * @param {string} dir the .githerd directory
 * @param {{now?: () => Date, migrations?: Record<number, (state: object) => object>}} [options] the clock and the
 *   migrations to apply
 * @returns {Promise<LoadResult>} the state and how it was obtained
 */
export async function loadState(dir, { now = () => new Date(), migrations = MIGRATIONS } = {}) {
    const errors = [];
    let missing = 0;
    for (const [name, source] of /** @type {const} */ ([
        [STATE, "state"],
        [`${STATE}.bak`, "bak"],
    ])) {
        const file = join(dir, name);
        const read = await readStateFile(file);
        if ("missing" in read) {
            missing++;
            continue;
        }
        if ("error" in read) {
            errors.push(read.error);
            continue;
        }
        let { state } = read;
        if (state.schema > STATE_SCHEMA) return { state, source, readOnly: true, errors, recovery: null };
        if (state.schema < STATE_SCHEMA) {
            try {
                await copyFile(file, join(dir, `${STATE}.pre-migrate-${state.schema}`));
                while (state.schema < STATE_SCHEMA) {
                    const step = migrations[state.schema];
                    if (!step) throw new Error(`no migration from schema ${state.schema}`);
                    state = step(state);
                }
            } catch (err) {
                errors.push(`${file}: ${err.message}`);
                continue;
            }
        }
        return { state, source, readOnly: false, errors, recovery: null };
    }
    const state = { schema: STATE_SCHEMA };
    if (missing === 2) return { state, source: "new", readOnly: false, errors, recovery: null };
    const at = now();
    return {
        state,
        source: "empty",
        readOnly: false,
        errors,
        recovery: {
            emptyStart: true,
            at: at.toISOString(),
            holdRunsUntil: new Date(at.getTime() + RUN_HOLD_MS).toISOString(),
        },
    };
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
    return JSON.stringify(value).replace(
        /[\u007f-\uffff]/g,
        (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
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
                .sort();
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
