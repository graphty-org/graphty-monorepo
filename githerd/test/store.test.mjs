import { spawn } from "node:child_process";
import { once } from "node:events";
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    utimesSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { identify } from "../lib/proc.mjs";
import {
    appendLedger,
    clearFatal,
    defaultStateDir,
    drainSpool,
    loadState,
    readLedger,
    readLiveness,
    recordStart,
    releaseLock,
    replayLedger,
    RUN_HOLD_MS,
    saveState,
    spoolEvent,
    STATE_SCHEMA,
    takeLock,
    writeAlive,
    writeFatal,
    writeProgress,
} from "../lib/store.mjs";

const STORE = pathToFileURL(fileURLToPath(new URL("../lib/store.mjs", import.meta.url))).href;

const NOW = new Date("2026-10-02T15:00:00Z");
const now = () => NOW;

let dir;
beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-store-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const read = (name) => readFileSync(join(dir, name), "utf8");

describe("state", () => {
    it("round-trips a saved state", async () => {
        const state = { schema: STATE_SCHEMA, master: { verdict: "green" }, spend: { "2026-10-02": 4.18 } };
        await saveState(dir, state);
        expect(await loadState(dir)).toEqual({
            state,
            source: "state",
            readOnly: false,
            errors: [],
            kept: [],
            recovery: null,
        });
    });

    it("starts new, with no recovery flags, when no state was ever written", async () => {
        const r = await loadState(dir);
        expect(r).toMatchObject({ state: { schema: STATE_SCHEMA }, source: "new", errors: [], recovery: null });
    });

    it("keeps the previous state as the backup and leaves no temporary files", async () => {
        await saveState(dir, { schema: STATE_SCHEMA, n: 1 });
        await saveState(dir, { schema: STATE_SCHEMA, n: 2 });
        expect(JSON.parse(read("state.json.bak")).n).toBe(1);
        expect(readdirSync(dir).sort()).toEqual(["state.json", "state.json.bak"]);
    });

    it("falls back to the backup when state.json is torn", async () => {
        await saveState(dir, { schema: STATE_SCHEMA, n: 1 });
        await saveState(dir, { schema: STATE_SCHEMA, n: 2 });
        writeFileSync(join(dir, "state.json"), '{"schema": 1, "n"');
        const r = await loadState(dir, { now });
        expect(r.source).toBe("bak");
        expect(r.state.n).toBe(1);
        expect(r.errors).toHaveLength(1);
        // the torn file is kept aside, so the next save leaves the good backup alone
        expect(r.kept).toEqual([join(dir, "state.json.corrupt-2026-10-02T15-00-00.000Z")]);
        expect(read("state.json.corrupt-2026-10-02T15-00-00.000Z")).toBe('{"schema": 1, "n"');
        await saveState(dir, r.state);
        expect(JSON.parse(read("state.json.bak")).n).toBe(1);
    });

    it("starts empty with recovery flags when both files are corrupt", async () => {
        writeFileSync(join(dir, "state.json"), "{");
        writeFileSync(join(dir, "state.json.bak"), "[1]");
        const r = await loadState(dir, { now });
        expect(r.state).toEqual({ schema: STATE_SCHEMA });
        expect(r.source).toBe("empty");
        expect(r.errors).toHaveLength(2);
        expect(r.recovery).toEqual({
            emptyStart: true,
            at: NOW.toISOString(),
            holdRunsUntil: new Date(NOW.getTime() + RUN_HOLD_MS).toISOString(),
        });
        expect(readdirSync(dir).sort()).toEqual([
            "state.json.bak.corrupt-2026-10-02T15-00-00.000Z",
            "state.json.corrupt-2026-10-02T15-00-00.000Z",
        ]);
    });

    it("leaves a valid file after two concurrent saves, the later one winning", async () => {
        const saves = [];
        for (let n = 0; n < 20; n++) saves.push(saveState(dir, { schema: STATE_SCHEMA, n }));
        await Promise.all(saves);
        expect(JSON.parse(read("state.json")).n).toBe(19);
        expect(JSON.parse(read("state.json.bak")).n).toBe(18);
        expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    });

    it("serves a newer schema read-only and refuses to save it", async () => {
        const newer = { schema: STATE_SCHEMA + 1, future: true };
        writeFileSync(join(dir, "state.json"), JSON.stringify(newer));
        const r = await loadState(dir);
        expect(r).toMatchObject({ state: newer, source: "state", readOnly: true });
        await expect(saveState(dir, r.state)).rejects.toThrow(/refusing to save state with schema 2/);
        expect(JSON.parse(read("state.json"))).toEqual(newer);
    });

    it("migrates an older schema forward after copying the file", async () => {
        const old = { schema: 0, legacy: true };
        writeFileSync(join(dir, "state.json"), JSON.stringify(old));
        const migrations = { 0: (s) => ({ ...s, schema: 1, migrated: true }) };
        const r = await loadState(dir, { migrations });
        expect(r).toMatchObject({
            state: { schema: 1, legacy: true, migrated: true },
            source: "state",
            readOnly: false,
        });
        expect(JSON.parse(read("state.json.pre-migrate-0"))).toEqual(old);
    });

    it("treats an older schema with no migration as unreadable", async () => {
        writeFileSync(join(dir, "state.json"), JSON.stringify({ schema: 0 }));
        const r = await loadState(dir, { now });
        expect(r.source).toBe("empty");
        expect(r.errors[0]).toMatch(/no migration from schema 0/);
    });

    it("refuses to save a state without the current schema", async () => {
        await expect(saveState(dir, /** @type {any} */ ({}))).rejects.toThrow(/schema undefined/);
    });

    it("reports a save that cannot write and keeps the chain usable", async () => {
        await expect(saveState(join(dir, "missing"), { schema: STATE_SCHEMA })).rejects.toThrow(/ENOENT/);
        await saveState(dir, { schema: STATE_SCHEMA, ok: true });
        expect((await loadState(dir)).state.ok).toBe(true);
    });
});

describe("ledger", () => {
    it("appends entries with a timestamp, in order, as plain ASCII", async () => {
        await Promise.all([
            appendLedger(dir, { kind: "event", event: "master-red-confirmed" }, { now }),
            appendLedger(dir, { kind: "would-do", op: "POST statuses/abc", note: "caf\u00e9" }, { now }),
        ]);
        expect(read("ledger.jsonl")).toMatch(/^[\x20-\x7e\n]*$/);
        expect(await readLedger(dir)).toEqual([
            { ts: NOW.toISOString(), kind: "event", event: "master-red-confirmed" },
            { ts: NOW.toISOString(), kind: "would-do", op: "POST statuses/abc", note: "caf\u00e9" },
        ]);
    });

    it("skips a torn last line", async () => {
        await appendLedger(dir, { kind: "event", event: "a" }, { now });
        writeFileSync(join(dir, "ledger.jsonl"), `${read("ledger.jsonl")}{"ts":"2026-10`, { flag: "w" });
        expect((await readLedger(dir)).map((e) => e.event)).toEqual(["a"]);
    });

    it("reads nothing from a directory with no ledger", async () => {
        expect(await readLedger(join(dir, "none"))).toEqual([]);
        expect(await readLedger(join(dir, "none"), { since: NOW })).toEqual([]);
    });

    it("rotates the file at a month change and reads across months with since", async () => {
        await appendLedger(dir, { kind: "event", event: "september", ts: "2026-09-30T23:00:00Z" });
        const sept = new Date("2026-09-30T23:00:00Z");
        utimesSync(join(dir, "ledger.jsonl"), sept, sept);
        await appendLedger(dir, { kind: "event", event: "october" }, { now });

        expect(readdirSync(dir).sort()).toEqual(["ledger-2026-09.jsonl", "ledger.jsonl"]);
        expect((await readLedger(dir)).map((e) => e.event)).toEqual(["october"]);
        expect((await readLedger(dir, { since: new Date("2026-09-01T00:00:00Z") })).map((e) => e.event)).toEqual([
            "september",
            "october",
        ]);
        expect((await readLedger(dir, { since: new Date("2026-10-01T00:00:00Z") })).map((e) => e.event)).toEqual([
            "october",
        ]);
    });

    it("appends to an existing rotated file instead of replacing it", async () => {
        writeFileSync(
            join(dir, "ledger-2026-09.jsonl"),
            `${JSON.stringify({ ts: "2026-09-01T00:00:00Z", kind: "event", event: "first" })}\n`,
        );
        await appendLedger(dir, { kind: "event", event: "second", ts: "2026-09-30T00:00:00Z" });
        const sept = new Date("2026-09-30T00:00:00Z");
        utimesSync(join(dir, "ledger.jsonl"), sept, sept);
        await appendLedger(dir, { kind: "event", event: "third" }, { now });
        const events = (await readLedger(dir, { since: new Date("2026-09-01T00:00:00Z") })).map((e) => e.event);
        expect(events).toEqual(["first", "second", "third"]);
    });
});

describe("ledger replay", () => {
    const record = (collection, id, rec) => ({ kind: "record", collection, id, record: rec });

    it("rebuilds the last record per collection and id, across months, dropping removed ones", async () => {
        writeFileSync(
            join(dir, "ledger-2026-09.jsonl"),
            `${JSON.stringify({ ts: "2026-09-30T00:00:00Z", ...record("jobs", "j1", { state: "queued" }) })}\n`,
        );
        await appendLedger(dir, record("jobs", "j1", { state: "working" }), { now });
        await appendLedger(dir, record("jobs", "j2", { state: "queued" }), { now });
        await appendLedger(dir, record("jobs", "j2", null), { now });
        await appendLedger(dir, record("orders", "o1", { issues: [3] }), { now });
        await appendLedger(dir, { kind: "event", event: "noise" }, { now });
        expect(await replayLedger(dir)).toEqual({
            schema: STATE_SCHEMA,
            jobs: { j1: { state: "working" } },
            orders: { o1: { issues: [3] } },
        });
    });

    it("is used when both state files are unreadable", async () => {
        writeFileSync(join(dir, "state.json"), "{");
        await appendLedger(dir, record("jobs", "j1", { state: "waiting" }), { now });
        const r = await loadState(dir, { now });
        expect(r).toMatchObject({ source: "ledger", state: { jobs: { j1: { state: "waiting" } } }, recovery: null });
        expect(r.kept).toEqual([join(dir, "state.json.corrupt-2026-10-02T15-00-00.000Z")]);
    });

    it("finds nothing in a ledger without record lines", async () => {
        await appendLedger(dir, { kind: "event", event: "a" }, { now });
        expect(await replayLedger(dir)).toBeNull();
    });
});

describe("the state directory", () => {
    it("lives under the home directory, named for the checkout", () => {
        expect(defaultStateDir("/work/graphty-monorepo", "/home/me")).toBe("/home/me/.githerd/graphty-monorepo");
    });

    it("removes the temporary files a killed save left", async () => {
        writeFileSync(join(dir, "state.json.4242.0a1b2c.tmp"), "{");
        await loadState(dir);
        expect(readdirSync(dir)).toEqual([]);
    });
});

describe("the lock", () => {
    const self = identify(process.pid);

    it("is taken when free, refused while a live process holds it, and released only by its holder", () => {
        expect(takeLock(dir, self, "/fixed")).toEqual({ ok: true, stale: null });
        expect(JSON.parse(readFileSync(join(dir, "lock"), "utf8"))).toEqual({ ...self, cwd: "/fixed" });
        const other = { ...self, startTime: "1" };
        // another identity sees this live process as the holder
        expect(takeLock(dir, other)).toEqual({ ok: false, holder: { ...self, cwd: "/fixed" } });
        releaseLock(dir, other);
        expect(existsSync(join(dir, "lock"))).toBe(true);
        // its holder may take it again
        expect(takeLock(dir, self, "/fixed").ok).toBe(true);
        releaseLock(dir, self);
        expect(existsSync(join(dir, "lock"))).toBe(false);
        releaseLock(dir, self);
    });

    it("takes a stale lock: a dead pid, a reused pid, or a torn file", () => {
        const dead = { pid: process.pid, startTime: "1", bootId: self.bootId };
        writeFileSync(join(dir, "lock"), JSON.stringify(dead));
        expect(takeLock(dir, self)).toEqual({ ok: true, stale: dead });
        // A torn file is a start caught mid-write until it is older than a write could take.
        writeFileSync(join(dir, "lock"), '{"pid": 4');
        const old = new Date(Date.now() - 60_000);
        utimesSync(join(dir, "lock"), old, old);
        expect(takeLock(dir, self)).toEqual({ ok: true, stale: { unreadable: true } });
    });

    it("lets exactly one of several starters take one stale lock", async () => {
        const script = `import { takeLock } from ${JSON.stringify(STORE)};
import { identify } from ${JSON.stringify(STORE.replace(/store\.mjs$/, "proc.mjs"))};
const go = Date.now() + 300;
while (Date.now() < go);
const r = takeLock(${JSON.stringify(dir)}, identify(process.pid));
process.stdout.write(JSON.stringify({ ok: r.ok }) + "\\n");
process.stdin.resume();
`;
        for (let round = 0; round < 6; round++) {
            writeFileSync(join(dir, "lock"), JSON.stringify({ pid: process.pid, startTime: "1", bootId: self.bootId }));
            const children = Array.from({ length: 6 }, () =>
                spawn(process.execPath, ["--input-type=module", "-e", script], {
                    detached: true,
                    stdio: ["pipe", "pipe", "inherit"],
                }),
            );
            try {
                const answers = await Promise.all(
                    children.map(
                        (c) =>
                            new Promise((resolve, reject) => {
                                let out = "";
                                c.stdout.on("data", (d) => {
                                    out += d;
                                    if (out.endsWith("\n")) resolve(JSON.parse(out));
                                });
                                c.once("exit", (code) => reject(new Error(`starter exited with ${code}`)));
                            }),
                    ),
                );
                expect(answers.filter((a) => a.ok)).toHaveLength(1);
            } finally {
                for (const c of children) {
                    const exited = once(c, "exit");
                    process.kill(-c.pid, "SIGKILL");
                    await exited;
                }
            }
            for (const c of children) expect(() => process.kill(-c.pid, 0)).toThrow();
            expect(existsSync(join(dir, "lock.steal"))).toBe(false);
        }
    });

    it("reports a directory it cannot write", () => {
        expect(() => takeLock(join(dir, "missing"), self)).toThrow(/ENOENT/);
    });
});

describe("starts, liveness and FATAL", () => {
    it("records the last 10 starts and calls the third within 10 minutes a crash loop", () => {
        const at = (m) => new Date(Date.UTC(2026, 9, 2, 12, m));
        expect(recordStart(dir, at(0)).crashLoop).toBe(false);
        expect(recordStart(dir, at(9)).crashLoop).toBe(false);
        expect(recordStart(dir, at(11)).crashLoop).toBe(false);
        expect(recordStart(dir, at(15)).crashLoop).toBe(true);
        for (let m = 30; m < 300; m += 30) recordStart(dir, at(m));
        const r = recordStart(dir, at(300));
        expect(r.starts).toHaveLength(10);
        expect(r.starts.at(-1)).toBe(at(300).toISOString());
        writeFileSync(join(dir, "starts"), "not json");
        expect(recordStart(dir, at(400)).starts).toEqual([at(400).toISOString()]);
    });

    it("reads back alive, progress, FATAL and the lock, and nulls for missing files", () => {
        expect(readLiveness(dir)).toEqual({ alive: null, progress: null, fatal: null, lock: null });
        const alive = { pid: 1, startTime: "2", version: "0.1.0", pid1Start: "3", at: NOW.toISOString() };
        writeAlive(dir, alive);
        writeProgress(dir, "poll", NOW.toISOString());
        writeFatal(dir, "crash loop\nstack");
        takeLock(dir, identify(process.pid), "/c");
        const r = readLiveness(dir);
        expect(r).toMatchObject({
            alive,
            progress: { step: "poll", since: NOW.toISOString() },
            fatal: "crash loop\nstack",
        });
        expect(r.lock.cwd).toBe("/c");
        clearFatal(dir);
        clearFatal(dir);
        expect(readLiveness(dir).fatal).toBeNull();
        expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
    });
});

describe("the spool", () => {
    it("hands events over oldest first and removes each once handled", async () => {
        let t = NOW.getTime();
        const clock = () => new Date(t++);
        await spoolEvent(dir, { kind: "a" }, { now: clock });
        await spoolEvent(dir, { kind: "b", note: "caf\u00e9" }, { now: clock });
        writeFileSync(join(dir, "spool", "9999999999999-1-00.json.tmp"), "{");
        const seen = [];
        expect(await drainSpool(dir, (e) => seen.push(e.kind))).toEqual({ handled: 2, bad: [] });
        expect(seen).toEqual(["a", "b"]);
        expect(readdirSync(join(dir, "spool"))).toEqual(["9999999999999-1-00.json.tmp"]);
    });

    it("stops at a handler that throws and keeps that event and the rest", async () => {
        await spoolEvent(dir, { kind: "a" }, { now });
        await expect(
            drainSpool(dir, () => {
                throw new Error("no");
            }),
        ).rejects.toThrow("no");
        expect(readdirSync(join(dir, "spool"))).toHaveLength(1);
    });

    it("skips an event another drainer removed meanwhile, instead of throwing or calling it bad", async () => {
        let t = NOW.getTime();
        const clock = () => new Date(t++);
        const first = await spoolEvent(dir, { kind: "a" }, { now: clock });
        const second = await spoolEvent(dir, { kind: "b" }, { now: clock });
        const seen = [];
        const drained = await drainSpool(dir, (e) => {
            seen.push(e.kind);
            // a second daemon drains both files while this one handles the first
            rmSync(join(dir, "spool", first), { force: true });
            rmSync(join(dir, "spool", second), { force: true });
        });
        expect(drained).toEqual({ handled: 1, bad: [] });
        expect(seen).toEqual(["a"]);
    });

    it("removes and reports an event that does not parse, and finds nothing without a spool", async () => {
        expect(await drainSpool(dir, () => {})).toEqual({ handled: 0, bad: [] });
        mkdirSync(join(dir, "spool"));
        writeFileSync(join(dir, "spool", "1-1-00.json"), "{");
        expect(await drainSpool(dir, () => {})).toEqual({ handled: 0, bad: ["1-1-00.json"] });
        expect(readdirSync(join(dir, "spool"))).toEqual([]);
    });
});

describe("a process killed mid-write", () => {
    it("leaves a state that loads and a ledger that reads", async () => {
        const script = `import { appendLedger, saveState } from ${JSON.stringify(STORE)};
const dir = ${JSON.stringify(dir)};
for (let n = 0; ; n++) {
    await saveState(dir, { schema: 1, n, pad: "x".repeat(65536) });
    await appendLedger(dir, { kind: "event", n, pad: "y".repeat(4096) });
    if (n === 20) process.stdout.write("writing\\n");
}
`;
        const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
            detached: true,
            stdio: ["ignore", "pipe", "inherit"],
        });
        try {
            await new Promise((resolve, reject) => {
                child.stdout.once("data", resolve);
                child.once("exit", (code) => reject(new Error(`writer exited with ${code}`)));
            });
        } finally {
            const exited = once(child, "exit");
            process.kill(-child.pid, "SIGKILL");
            await exited;
        }
        expect(() => process.kill(-child.pid, 0)).toThrow();

        const r = await loadState(dir);
        expect(r.source).toBe("state");
        expect(r.state.n).toBeGreaterThanOrEqual(20);
        expect(r.state.pad).toHaveLength(65536);
        expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
        const ns = (await readLedger(dir)).map((e) => e.n);
        expect(ns).toEqual(ns.map((_, i) => i));
        expect(ns.length).toBeGreaterThanOrEqual(r.state.n);
    });
});
