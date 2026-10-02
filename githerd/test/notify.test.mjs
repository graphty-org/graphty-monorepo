import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BROKEN_AFTER, createNotifier, MAX_MESSAGE, MAX_TRIES, TIMEOUT_MS } from "../lib/notify.mjs";

const FAKE = fileURLToPath(new URL("helpers/fake-notify.mjs", import.meta.url));

/** @type {string} */
let dir;
/** @type {string} */
let log;
/** @type {"ok" | "fail" | "hang"} */
let behavior;
/** @type {any[]} */
let ledger;
let clock;

/**
 * Reads the fake command's log.
 * @returns {{pid: number, args: string[]}[]} one entry per run of the fake command
 */
function calls() {
    if (!existsSync(log)) return [];
    return readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
}

/**
 * Whether a process group is alive.
 * @param {number} pgid the group id
 * @returns {boolean} true if any process in it is alive
 */
function groupAlive(pgid) {
    try {
        process.kill(-pgid, 0);
        return true;
    } catch {
        return false;
    }
}

/**
 * A notifier over a fresh state, running the fake command.
 * @param {{maxPerHour?: number, command?: string[] | null, timeoutMs?: number, state?: any}} [options] overrides
 * @returns {{notifier: ReturnType<typeof createNotifier>, state: any}} the notifier and its state
 */
function make({ maxPerHour = 6, command, timeoutMs, state = { schema: 1 } } = {}) {
    const notifier = createNotifier({
        notify: () => ({
            command:
                command === undefined
                    ? [process.execPath, FAKE, log, behavior, "{status}", "[repo] {message}"]
                    : command,
            maxPerHour,
        }),
        state,
        ledger: (entry) => ledger.push(entry),
        now: () => new Date(clock),
        timeoutMs,
    });
    return { notifier, state };
}

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-notify-"));
    log = join(dir, "calls.jsonl");
    behavior = "ok";
    ledger = [];
    clock = Date.parse("2026-10-02T15:00:00Z");
});

afterEach(() => {
    for (const { pid } of calls()) {
        if (groupAlive(pid)) process.kill(-pid, "SIGKILL");
        expect(groupAlive(pid)).toBe(false);
    }
    rmSync(dir, { recursive: true, force: true });
});

describe("createNotifier", () => {
    it("sends one alert per key, with status and message substituted and no shell", async () => {
        const { notifier, state } = make();
        const page = {
            key: "master-red:inc-1",
            status: "waiting",
            message: "master red; $(touch x) `id`",
            bypass: true,
        };
        expect(notifier.send(page)).toBe(true);
        expect(notifier.send(page)).toBe(false);
        await notifier.flush();
        expect(notifier.send(page)).toBe(false);
        await notifier.flush();
        expect(calls().map((c) => c.args)).toEqual([["waiting", "[repo] master red; $(touch x) `id`"]]);
        expect(state.notified["master-red:inc-1"]).toBe("2026-10-02T15:00:00.000Z");
        expect(state.notify.pending).toEqual({});
        expect(ledger).toEqual([
            expect.objectContaining({ kind: "notify", keys: ["master-red:inc-1"], delivered: true }),
        ]);
    });

    it("expands ~ and cleans the message to printable ASCII of bounded length", async () => {
        const { notifier } = make({ command: [process.execPath, FAKE, log, "ok", "~/notify.sh", "{message}"] });
        notifier.send({ key: "k", status: "info", message: `caf\u00e9\nline ${"x".repeat(300)}` });
        await notifier.flush();
        const [args] = calls().map((c) => c.args);
        expect(args[0]).toBe(join(homedir(), "notify.sh"));
        expect(args[1].startsWith("caf? line x")).toBe(true);
        expect(args[1]).toHaveLength(MAX_MESSAGE);
    });

    it("kills a hanging command's process group at the timeout and retries it on the next flush", async () => {
        expect(TIMEOUT_MS).toBe(15_000);
        const { notifier, state } = make({ timeoutMs: 300 });
        behavior = "hang";
        notifier.send({ key: "k", status: "waiting", message: "m" });
        await notifier.flush();
        const [hung] = calls();
        expect(groupAlive(hung.pid)).toBe(false);
        expect(state.notify.pending.k.tries).toBe(1);
        expect(state.notify.lastError).toBe("timed out after 0.3 s");
        expect(state.notified.k).toBeUndefined();

        behavior = "ok";
        await notifier.flush();
        expect(calls()).toHaveLength(2);
        expect(state.notified.k).toBeDefined();
        expect(state.notify.lastError).toBeNull();
    });

    it("sets brokenSince on the third failure in a row, gives a key up after its last try, and clears on success", async () => {
        expect(BROKEN_AFTER).toBe(3);
        const { notifier, state } = make();
        behavior = "fail";
        notifier.send({ key: "a", status: "waiting", message: "m" });
        await notifier.flush();
        await notifier.flush();
        expect(state.notify.brokenSince).toBeNull();
        clock += 1000;
        await notifier.flush();
        expect(state.notify.brokenSince).toBe("2026-10-02T15:00:01.000Z");
        expect(state.notify.lastError).toBe("pushover: invalid user key");
        for (let i = 3; i < MAX_TRIES; i++) await notifier.flush();
        expect(calls()).toHaveLength(MAX_TRIES);
        expect(state.notify.pending).toEqual({});
        expect(state.notify.failed.a).toBeDefined();
        expect(ledger.at(-1).gaveUp).toEqual(["a"]);
        expect(notifier.send({ key: "a", status: "waiting", message: "m" })).toBe(false);
        await notifier.flush();
        expect(calls()).toHaveLength(MAX_TRIES);

        behavior = "ok";
        notifier.send({ key: "b", status: "info", message: "m" });
        await notifier.flush();
        expect(state.notify.brokenSince).toBeNull();
        expect(state.notify.failures).toBe(0);
    });

    it("records a command that cannot start as a failure", async () => {
        const { notifier, state } = make({ command: [join(dir, "missing-notify")] });
        notifier.send({ key: "k", status: "error", message: "m" });
        await notifier.flush();
        expect(state.notify.lastError).toMatch(/ENOENT/);
        expect(state.notify.pending.k.tries).toBe(1);
    });

    it("folds capped escalation pages into one message but never folds master-red", async () => {
        const { notifier, state } = make({ maxPerHour: 1 });
        for (const n of [1, 2, 3]) {
            notifier.send({
                key: `escalation:e${n}`,
                status: n === 2 ? "error" : "waiting",
                message: `escalation ${n}`,
            });
        }
        notifier.send({ key: "master-red:inc-1", status: "waiting", message: "master red", bypass: true });
        await notifier.flush();
        expect(calls().map((c) => c.args)).toEqual([
            ["waiting", "[repo] master red"],
            ["error", "[repo] escalation 1 (and 2 more in githerd status)"],
        ]);
        expect(Object.keys(state.notified).sort()).toEqual([
            "escalation:e1",
            "escalation:e2",
            "escalation:e3",
            "master-red:inc-1",
        ]);

        notifier.send({ key: "escalation:e4", status: "waiting", message: "escalation 4" });
        await notifier.flush();
        expect(calls()).toHaveLength(2);
        expect(state.notify.pending["escalation:e4"].tries).toBe(0);

        clock += 61 * 60 * 1000;
        await notifier.flush();
        expect(calls().at(-1).args).toEqual(["waiting", "[repo] escalation 4"]);
    });

    it("only logs when the command is null", async () => {
        const { notifier, state } = make({ command: null });
        notifier.send({ key: "k", status: "waiting", message: "m" });
        await notifier.flush();
        expect(calls()).toEqual([]);
        expect(state.notified.k).toBeDefined();
        expect(ledger).toEqual([
            expect.objectContaining({
                kind: "notify",
                keys: ["k"],
                delivered: false,
                reason: "notify.command is null",
            }),
        ]);
    });

    it("runs one flush at a time and keeps the queue in the state across a restart", async () => {
        const state = { schema: 1 };
        const first = make({ state }).notifier;
        first.send({ key: "k", status: "info", message: "m" });
        const second = make({ state: JSON.parse(JSON.stringify(state)) });
        expect(second.state.notify.pending.k).toBeDefined();
        const a = second.notifier.flush();
        expect(second.notifier.flush()).toBe(a);
        await a;
        expect(calls()).toHaveLength(1);
    });
});
