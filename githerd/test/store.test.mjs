import { mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { appendLedger, loadState, readLedger, RUN_HOLD_MS, saveState, STATE_SCHEMA } from "../lib/store.mjs";

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
