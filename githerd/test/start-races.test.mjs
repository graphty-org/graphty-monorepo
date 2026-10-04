// The worker start wiring (start.mjs and its callers) under races and odd exits. Each test states the
// behavior the design asks for.
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { tickJobs } from "../lib/advance.mjs";
import { claimJob, move, newJob } from "../lib/board.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import { fillSlots, tidyEndedJobs } from "../lib/start.mjs";

const T0 = new Date("2026-10-04T12:00:00Z");
const GREEN = "g".repeat(40);
const CONFIG = normalizeConfig({ repo: "o/r", lanes: { ci: { workflow: "ci.yml", gating: "required" } } });

/** @type {string} */
let dir;
/** @type {Date} */
let clock;
/** @type {any[]} */
let calls;

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-start-races-"));
    clock = T0;
    calls = [];
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const WINDOW = { socket: "githerd", window: "@1", pane: "%1", pid: 4242, name: "githerd-w" };

/**
 * A fake platform: a passed self-test, an idle machine, a passing signing probe, a worktree that
 * prepares at once and a window whose registry entry appears.
 * @param {any} [over] overrides
 * @returns {any} the platform
 */
function platform(over = {}) {
    return {
        claudeVersion: async () => "2.1.290",
        selftest: () => ({ passed: true, claudeVersion: "2.1.290", at: "2026-10-01T00:00:00Z" }),
        resumeVerified: async () => true,
        machine: () => ({ load: 1, cores: 32, memory: 0.5 }),
        loginPath: () => "/usr/bin:/bin",
        signingEnv: () => ({}),
        signing: async () => ({ ok: true }),
        prepare: async (/** @type {any} */ o) => {
            calls.push({ prepare: o.job });
            const wt = join(dir, "wt", o.job);
            mkdirSync(wt, { recursive: true });
            return { verdict: "ready", dir: wt, sha: o.sha };
        },
        start: async (/** @type {any} */ o) => {
            calls.push({ start: o.job });
            return { ok: true, window: WINDOW, startTime: "99", registry: { sessionId: `s-${o.job}` } };
        },
        ...over,
    };
}

/**
 * A start context over a state.
 * @param {any} state the state
 * @param {any} [over] overrides of the context
 * @returns {any} the start context
 */
function ctxOf(state, over = {}) {
    return {
        state,
        config: CONFIG,
        root: dir,
        stateDir: join(dir, "state"),
        env: { HOME: dir, USER: "owner", PATH: "/bin" },
        now: () => clock,
        ledger: () => {},
        save: async () => {},
        mode: "acting",
        platform: platform(),
        tasks: new Map(),
        ...over,
    };
}

/**
 * A state with queued jobs.
 * @param {...any} specs newJob arguments
 * @returns {any} a state with those queued jobs and a green commit
 */
function stateWith(...specs) {
    const jobs = Object.fromEntries(specs.map((s) => newJob(s, T0)).map((j) => [j.id, j]));
    return { trust: { login: "owner" }, master: { greenSha: GREEN }, prs: {}, jobs };
}

/**
 * Waits until every start task ended.
 * @param {any} ctx the context
 */
async function settle(ctx) {
    while (ctx.tasks.size) await Promise.all([...ctx.tasks.values()]);
}

/**
 * Waits until a condition holds.
 * @param {() => boolean} cond the condition
 */
async function until(cond) {
    for (let i = 0; i < 1000 && !cond(); i++) await new Promise((r) => setImmediate(r));
    if (!cond()) throw new Error("condition never held");
}

/**
 * A start whose registry entry appears only when the test says so.
 * @returns {{start: any, release: () => void}} the platform's start and its release
 */
function slowStart() {
    /** Opens the gate. @type {() => void} */
    let release = () => {};
    const gate = new Promise((r) => (release = () => r(undefined)));
    return {
        release,
        start: async (/** @type {any} */ o) => {
            calls.push({ start: o.job });
            await gate;
            return { ok: true, window: WINDOW, startTime: "99", registry: { sessionId: `s-${o.job}` } };
        },
    };
}

describe("a start still in flight when its registry deadline fires", () => {
    // The registry deadline (60 s) outlasts startWorker's own 30 s poll, but a start can still be
    // slower than it (a slow tmux, a stalled save), so the deadline can fire (job -> queued, holder
    // null) while startWorker is still waiting for a registry entry that then appears.
    it("is not admitted a second time while its first start task runs", async () => {
        const state = stateWith({ kind: "issue", target: "#7", id: "issue-7" });
        const slow = slowStart();
        const ctx = ctxOf(state, { platform: platform({ start: slow.start }) });
        expect((await fillSlots(ctx)).admitted).toEqual(["issue-7"]);
        await until(() => calls.some((c) => c.start));
        clock = new Date(T0.getTime() + 61_000);
        tickJobs(state, clock, {});
        expect(state.jobs["issue-7"].state).toBe("queued");
        expect(ctx.tasks.has("issue-7")).toBe(true);
        // The job is queued again while its first start task still runs: it must not be admitted.
        const second = await fillSlots(ctx);
        slow.release();
        await settle(ctx);
        expect(second.admitted).toEqual([]);
        expect(calls.filter((c) => c.start)).toHaveLength(1);
    });

    it("ends the window that opened after the job left it, instead of leaving it running", async () => {
        const state = stateWith({ kind: "issue", target: "#7", id: "issue-7" });
        const slow = slowStart();
        const ctx = ctxOf(state, { platform: platform({ start: slow.start }) });
        await fillSlots(ctx);
        await until(() => calls.some((c) => c.start));
        clock = new Date(T0.getTime() + 61_000);
        tickJobs(state, clock, {});
        slow.release();
        await settle(ctx);
        // The job left the start: the live claude in %1 must be put on state.retiring.
        expect(state.jobs["issue-7"].holder).toBeNull();
        expect((state.retiring ?? []).some((/** @type {any} */ r) => r.holder?.pane === "%1")).toBe(true);
    });
});

describe("a session on a disallowed model", () => {
    it("has its window ended once the start returns, and counts as a failed start", async () => {
        const state = stateWith({ kind: "issue", target: "#7", id: "issue-7" });
        const slow = slowStart();
        const ctx = ctxOf(state, { platform: platform({ start: slow.start }) });
        await fillSlots(ctx);
        await until(() => calls.some((c) => c.start));
        // SessionStart reported Haiku before startWorker returned (hook.mjs marks the holder).
        state.jobs["issue-7"].holder.wrongModel = "claude-haiku-4-5";
        slow.release();
        await settle(ctx);
        expect(state.jobs["issue-7"]).toMatchObject({ state: "queued", holder: null });
        expect(state.retiring).toMatchObject([{ job: "issue-7", holder: { pane: "%1" } }]);
        expect(state.startFailures).toBe(1);
    });
});

describe("the usage-stop canary", () => {
    it("is released when its start never opens a session (a faulted worktree)", async () => {
        const state = stateWith({ kind: "issue", target: "#7", id: "issue-7" });
        state.apiStop = { kind: "usage", at: new Date(T0.getTime() - 2 * 3_600_000).toISOString(), probes: 0 };
        const ctx = ctxOf(state, {
            platform: platform({
                prepare: async () => ({ verdict: "faulted", step: "install", dir: null, reason: "pnpm failed" }),
            }),
        });
        expect((await fillSlots(ctx)).admitted).toEqual(["issue-7"]);
        await settle(ctx);
        expect(state.jobs["issue-7"].state).toBe("faulted");
        // No session ever ran, so no turn can complete: a canary left set would refuse every start
        // with "usage stop; a canary starts at ..." for good.
        expect(state.apiStop.canary).toBeUndefined();
    });
});

describe("over the machine limits", () => {
    it("still starts one urgent incident when a routine job waits ahead of it for a new session", async () => {
        const state = stateWith(
            { kind: "issue", target: "#1", id: "issue-1" },
            { kind: "incident", target: "ci/build", id: "incident-build", facts: { scope: "master" } },
        );
        const routine = state.jobs["issue-1"];
        move(routine, "starting", T0);
        move(routine, "working", T0);
        routine.worktree = join(dir, "wt", "issue-1");
        mkdirSync(routine.worktree, { recursive: true });
        routine.base = GREEN;
        const ctx = ctxOf(state, {
            platform: platform({ machine: () => ({ load: 30, cores: 32, memory: 0.5 }) }),
        });
        const r = await fillSlots(ctx);
        await settle(ctx);
        // Design 8.1: over the machine limits no worker starts, but one urgent may when none runs.
        expect(r.admitted).toEqual(["incident-build"]);
    });
});

describe("a worker that joins its job into another", () => {
    it("has its session ended, not orphaned", () => {
        const state = stateWith(
            { kind: "issue", target: "#1", id: "issue-1" },
            { kind: "issue", target: "#2", id: "issue-2" },
        );
        const job = state.jobs["issue-1"];
        move(job, "starting", T0);
        job.holder = { nonce: "n", socket: "githerd", startedBy: "githerd", session: "s1", ...WINDOW };
        const other = state.jobs["issue-2"];
        move(other, "starting", T0);
        move(other, "working", T0);
        const result = claimJob(
            state,
            {
                job: "issue-1",
                snapshotVersion: 1,
                plan: "p",
                overlap: { decision: "join", with: "issue-2", reason: "same" },
            },
            { session: "s1" },
            { version: 1 },
            T0,
        );
        expect(result.ok).toBe(true);
        expect(job.state).toBe("cancelled");
        // Design 8.2: on join "its session ends": the holder (with the pane) goes on state.retiring.
        expect((state.retiring ?? []).some((/** @type {any} */ r) => r.holder?.pane === "%1")).toBe(true);
    });
});

describe("tidyEndedJobs", () => {
    /**
     * A tidy context whose removal records what it was asked.
     * @param {any} state the state
     * @param {any[]} did what the fakes were asked
     * @returns {any} the tidy context
     */
    const tidyCtx = (state, did) => ({
        ...ctxOf(state),
        servers: async () => [],
        stopServer: async () => {},
        remove: async (/** @type {any} */ o) => {
            did.push(o.dir);
            return { ok: true, salvage: null };
        },
    });

    it("does not remove a worktree whose session is still being ended", async () => {
        const state = stateWith({ kind: "issue", target: "#1", id: "issue-1" });
        const job = state.jobs["issue-1"];
        Object.assign(job, { worktree: "/w/issue-1", base: GREEN });
        move(job, "cancelled", T0);
        // Design 7.8: end the session, kill what it left, then remove. The retiring entry is ended
        // by retire() on a setImmediate in the same workerPass that runs tidyEndedJobs.
        state.retiring = [{ job: "issue-1", holder: { ...WINDOW }, reason: "job cancelled", at: T0.toISOString() }];
        /** @type {any[]} */
        const did = [];
        expect(await tidyEndedJobs(tidyCtx(state, did))).toEqual([]);
        expect(did).toEqual([]);
    });

    it("keeps a done issue job's worktree while its pull request is open", async () => {
        const state = stateWith({ kind: "issue", target: "#1", id: "issue-1" });
        const job = state.jobs["issue-1"];
        Object.assign(job, { worktree: "/w/issue-1", base: GREEN });
        move(job, "starting", T0);
        move(job, "working", T0);
        move(job, "verifying", T0);
        move(job, "done", T0);
        // githerd_done records the issue's pull request in job.report.pr; job.pr stays unset.
        job.report = { outcome: "done", pr: 9 };
        state.prs[9] = { headSha: "x" };
        /** @type {any[]} */
        const did = [];
        // The pull request is read from job.report.pr when job.pr is unset.
        expect(await tidyEndedJobs(tidyCtx(state, did))).toEqual([]);
    });
});
