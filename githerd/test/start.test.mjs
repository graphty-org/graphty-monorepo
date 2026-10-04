import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { move, newJob } from "../lib/board.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import { answerHook } from "../lib/hook.mjs";
import { canaryAt, endIdleSessions, fillSlots, resetAt, tidyEndedJobs } from "../lib/start.mjs";

const T0 = new Date("2026-10-04T12:00:00Z");
const GREEN = "g".repeat(40);
const CONFIG = normalizeConfig({ repo: "o/r", lanes: { ci: { workflow: "ci.yml", gating: "required" } } });

/** @type {string} */
let dir;
/** @type {any[]} */
let lines;
/** @type {Date} */
let clock;
/** @type {any[]} every call the fake platform saw */
let calls;

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-start-"));
    lines = [];
    calls = [];
    clock = T0;
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/**
 * A fake platform: a passed self-test on 2.1.290, an idle machine, a signing probe that passes, a
 * worktree that prepares at once and a window whose registry entry appears.
 * @param {any} state the state, to check the holder is set before the window opens
 * @param {any} [over] overrides
 * @returns {any} the platform
 */
function platform(state, over = {}) {
    return {
        claudeVersion: async () => "2.1.290",
        selftest: () => ({ passed: true, claudeVersion: "2.1.290", at: "2026-10-01T00:00:00Z" }),
        resumeVerified: async () => true,
        machine: () => ({ load: 1, cores: 32, memory: 0.5 }),
        loginPath: () => "/usr/bin:/bin",
        signingEnv: () => ({}),
        signing: async () => ({ ok: true }),
        prepare: async (/** @type {any} */ o) => {
            calls.push({ prepare: o.job, sha: o.sha, ref: o.ref ?? null, branch: o.branch ?? null });
            const wt = join(dir, "wt", o.job);
            mkdirSync(wt, { recursive: true });
            return { verdict: "ready", dir: wt, sha: o.sha };
        },
        start: async (/** @type {any} */ o) => {
            const job = state.jobs[o.job];
            calls.push({ start: o.job, holderBefore: job.holder ? { ...job.holder } : null, argv: o.argv });
            return {
                ok: true,
                window: { socket: "githerd", window: "@1", pane: "%1", pid: 4242, name: `githerd-${o.job}` },
                startTime: "99",
                registry: { sessionId: `s-${o.job}` },
            };
        },
        ...over,
    };
}

/**
 * The start context over a state.
 * @param {any} state the state
 * @param {any} [over] overrides of the context
 * @returns {any} the context
 */
function ctxOf(state, over = {}) {
    return {
        state,
        config: CONFIG,
        root: dir,
        stateDir: join(dir, "state"),
        env: { HOME: dir, USER: "owner", PATH: "/bin", PUSHOVER_APP_TOKEN: "never" },
        now: () => clock,
        ledger: (/** @type {any} */ e) => lines.push(e),
        save: async () => {},
        mode: "acting",
        platform: platform(state),
        tasks: new Map(),
        ...over,
    };
}

/**
 * A state with the given queued jobs and a green commit.
 * @param {...any} specs newJob arguments
 * @returns {any} the state
 */
function stateWith(...specs) {
    const jobs = Object.fromEntries(specs.map((s) => newJob(s, T0)).map((j) => [j.id, j]));
    return { trust: { login: "owner" }, master: { greenSha: GREEN }, prs: {}, jobs };
}

/**
 * Waits for every start task in flight.
 * @param {any} ctx the context
 */
async function settle(ctx) {
    while (ctx.tasks.size) await Promise.all([...ctx.tasks.values()]);
}

describe("fillSlots", () => {
    it("in dry-run starts nothing and records one would-do per job", async () => {
        const state = stateWith({ kind: "issue", target: "#7", id: "issue-7" });
        const ctx = ctxOf(state, { mode: "dry-run" });
        expect(await fillSlots(ctx)).toEqual({ blocked: "workers are dry-run", admitted: [] });
        await fillSlots(ctx);
        expect(lines).toEqual([
            { kind: "would-do", group: "workers", op: "start a worker for issue-7", job: "issue-7" },
        ]);
        expect(state.jobs["issue-7"].state).toBe("queued");
        expect(calls).toEqual([]);
    });

    it("starts a worker: worktree, files, then the window, with the holder set before it opens", async () => {
        const state = stateWith({ kind: "pr", target: "#12", id: "pr-12" });
        state.jobs["pr-12"].pr = 12;
        state.prs[12] = { headSha: "h".repeat(40), headRef: "fix/x" };
        const ctx = ctxOf(state);
        expect(await fillSlots(ctx)).toEqual({ blocked: null, admitted: ["pr-12"] });
        expect(state.jobs["pr-12"]).toMatchObject({ state: "starting", phase: "worktree" });
        await settle(ctx);
        const job = state.jobs["pr-12"];
        expect(calls[0]).toEqual({ prepare: "pr-12", sha: "h".repeat(40), ref: "refs/pull/12/head", branch: "fix/x" });
        // The SessionStart hook links the session to the holder, so it exists before the window.
        expect(calls[1].holderBefore).toMatchObject({ socket: "githerd", startedBy: "githerd", session: null });
        expect(calls[1].holderBefore.nonce).toMatch(/^[0-9a-f]{12}$/);
        const argv = calls[1].argv.join(" ");
        expect(argv).toContain(`GITHERD_JOB=pr-12 GITHERD_NONCE=${calls[1].holderBefore.nonce}`);
        expect(argv).toContain("claude --model claude-opus-5-5 -n githerd-pr-12");
        expect(argv).not.toContain("PUSHOVER");
        expect(argv).not.toContain("--resume");
        expect(job).toMatchObject({
            state: "starting",
            phase: "first-call",
            worktree: join(dir, "wt", "pr-12"),
            holder: { pane: "%1", pid: 4242, startTime: "99", session: "s-pr-12" },
            sessions: ["s-pr-12"],
        });
        const jobDir = join(dir, "state", "jobs", "pr-12");
        expect(JSON.parse(readFileSync(join(jobDir, "guard.json"), "utf8"))).toEqual({
            root: join(dir, "wt", "pr-12"),
            repo: "o/r",
            ownerItems: [],
            subagents: 2,
            browsers: 4,
            incident: false,
        });
        expect(JSON.parse(readFileSync(join(jobDir, "settings.json"), "utf8")).permissions.deny).toContain("Workflow");
        expect(lines.map((l) => l.kind)).toEqual(["job-admitted", "session-started"]);
    });

    it("names why no worker starts: the self-test, its version, a credential stop, an owner item", async () => {
        const state = stateWith({ kind: "issue", target: "#7", id: "issue-7" });
        /**
         * Why no worker starts with this platform, after `change`.
         * @param {any} over platform overrides
         * @param {() => void} [change] a change to the state first
         * @returns {Promise<string | null>} the reason
         */
        const blocked = async (over, change = () => {}) => {
            const ctx = ctxOf(state, { platform: platform(state, over) });
            change();
            return (await fillSlots(ctx)).blocked;
        };
        expect(await blocked({ selftest: () => null })).toMatch(/self-test has not passed/);
        expect(await blocked({ claudeVersion: async () => "2.1.291" })).toBe(
            "the self-test ran on Claude Code 2.1.290, not 2.1.291",
        );
        expect(await blocked({}, () => (state.apiStop = { kind: "credential", error: "billing_error" }))).toBe(
            "credential stop: billing_error",
        );
        state.apiStop = null;
        state.ownerItems = { x: { id: "x", blocks: "workers" } };
        expect(await blocked({})).toBe("owner item x blocks every worker start");
        expect(state.jobs["issue-7"].state).toBe("queued");
    });

    it("keeps 3 routine slots and 1 urgent, and over the machine limits starts only one urgent", async () => {
        const specs = [1, 2, 3, 4].map((n) => ({ kind: "issue", target: `#${n}`, id: `issue-${n}` }));
        const incident = { kind: "incident", target: "ci / Build / ", id: "incident-a", facts: { scope: "master" } };
        let state = stateWith(...specs, incident);
        let ctx = ctxOf(state);
        expect((await fillSlots(ctx)).admitted).toEqual(["incident-a", "issue-1", "issue-2", "issue-3"]);
        await settle(ctx);
        state = stateWith(...specs, incident);
        ctx = ctxOf(state, { platform: platform(state, { machine: () => ({ load: 30, cores: 32, memory: 0.5 }) }) });
        expect((await fillSlots(ctx)).admitted).toEqual(["incident-a"]);
        await settle(ctx);
    });

    it("stops starting after two failed starts, until a newer self-test passes", async () => {
        const state = stateWith(
            { kind: "issue", target: "#1", id: "issue-1" },
            { kind: "issue", target: "#2", id: "issue-2" },
        );
        const fail = async () => ({ ok: false, window: {}, capture: "Do you trust this folder?" });
        let ctx = ctxOf(state, { platform: platform(state, { start: fail }) });
        await fillSlots(ctx);
        await settle(ctx);
        expect(state.jobs["issue-1"]).toMatchObject({ state: "queued", reason: "session start failed", holder: null });
        expect(state.startsStopped.reason).toBe("2 worker starts failed in a row after a passed self-test");
        expect(state.ownerItems["worker-start-failed"]).toBeDefined();
        expect((await fillSlots(ctx)).blocked).toBe(state.startsStopped.reason);
        const newer = () => ({ passed: true, claudeVersion: "2.1.290", at: "2026-10-05T00:00:00Z" });
        ctx = ctxOf(state, { platform: platform(state, { selftest: newer }) });
        expect((await fillSlots(ctx)).blocked).toBeNull();
        expect(state.ownerItems["worker-start-failed"].endedAt).toBeDefined();
        await settle(ctx);
    });

    it("continues a working job whose session is gone in its worktree, by resume unless it must start fresh", async () => {
        const state = stateWith({ kind: "issue", target: "#1", id: "issue-1" });
        const job = state.jobs["issue-1"];
        move(job, "starting", T0);
        move(job, "working", T0);
        job.worktree = dir;
        job.sessions = ["s-old"];
        const ctx = ctxOf(state);
        expect((await fillSlots(ctx)).admitted).toEqual(["issue-1"]);
        await settle(ctx);
        expect(calls.some((c) => c.prepare)).toBe(false);
        expect(calls[0].argv).toContain("--resume");
        expect(job).toMatchObject({ state: "working", holder: { pane: "%1" } });
    });

    it("puts a faulted job back in the queue after 30 minutes", async () => {
        const state = stateWith({ kind: "issue", target: "#1", id: "issue-1" });
        const job = state.jobs["issue-1"];
        move(job, "starting", T0);
        move(job, "faulted", T0, { reason: "install exited 1" });
        clock = new Date(T0.getTime() + 29 * 60_000);
        await fillSlots(ctxOf(state, { mode: "dry-run" }));
        expect(job.state).toBe("faulted");
        clock = new Date(T0.getTime() + 30 * 60_000);
        await fillSlots(ctxOf(state, { mode: "dry-run" }));
        expect(job).toMatchObject({ state: "queued", reason: "retry after: install exited 1" });
    });

    it("lifts a usage stop with one canary after the reset, and only the canary's next stop ends it", async () => {
        const state = stateWith(
            { kind: "issue", target: "#1", id: "issue-1" },
            { kind: "issue", target: "#2", id: "issue-2" },
        );
        state.apiStop = { kind: "usage", error: "usage-limit screen", at: T0.toISOString(), resets: null };
        expect(canaryAt(state.apiStop, 0).toISOString()).toBe("2026-10-04T13:00:00.000Z");
        let ctx = ctxOf(state);
        expect((await fillSlots(ctx)).blocked).toMatch(/^usage stop; a canary starts at 2026-10-04T13:00/);
        clock = new Date("2026-10-04T13:00:00Z");
        ctx = ctxOf(state);
        expect((await fillSlots(ctx)).admitted).toEqual(["issue-1"]);
        await settle(ctx);
        expect(state.apiStop).toMatchObject({ canary: "issue-1", probes: 1 });
        expect((await fillSlots(ctx)).blocked).toMatch(/^usage stop/);
        // Another session's stop lifts nothing; the canary's does.
        const stop = (/** @type {string} */ job) =>
            answerHook(
                state,
                { event: "Stop", job, nonce: null, input: { session_id: `s-${job}` } },
                { status: {} },
                clock,
            );
        stop("issue-2");
        expect(state.apiStop?.kind).toBe("usage");
        stop("issue-1");
        expect(state.apiStop).toBeNull();
    });
});

describe("resetAt", () => {
    it("reads the limit screen's reset in its time zone, the next time it comes", () => {
        const at = new Date("2026-10-04T12:00:00Z"); // 05:00 in Los Angeles (PDT, UTC-7)
        expect(resetAt("3pm (America/Los_Angeles)", at)?.toISOString()).toBe("2026-10-04T22:00:00.000Z");
        expect(resetAt("4am (America/Los_Angeles)", at)?.toISOString()).toBe("2026-10-05T11:00:00.000Z");
        expect(resetAt("1:30pm", at)?.toISOString()).toBe("2026-10-04T13:30:00.000Z");
        expect(resetAt("soon", at)).toBeNull();
    });
});

describe("endIdleSessions", () => {
    it("ends the oldest waiting sessions past the cap and a parked job's, but not a permission prompt's", () => {
        const specs = Array.from({ length: 8 }, (_, i) => ({ kind: "issue", target: `#${i}`, id: `issue-${i}` }));
        const state = stateWith(...specs);
        for (const [i, job] of Object.values(state.jobs).entries()) {
            move(job, "starting", T0);
            move(job, "working", T0);
            job.holder = { pane: `%${i}`, session: `s${i}` };
            if (i < 6) move(job, "waiting", new Date(T0.getTime() + i * 1000), { waitingFor: { checks: "x" } });
        }
        // 7 waiting sessions with a cap of 6, after one more waits; two parked
        move(state.jobs["issue-6"], "waiting", new Date(T0.getTime() + 6000), { waitingFor: { checks: "x" } });
        move(state.jobs["issue-7"], "parked", T0, { waitingFor: { owner: "ask-1" } });
        const ctx = ctxOf(state);
        expect(endIdleSessions(ctx)).toEqual(["issue-7", "issue-0"]);
        expect(state.retiring.map((r) => [r.job, r.reason])).toEqual([
            ["issue-7", "parked on an owner item"],
            ["issue-0", "more than 6 sessions waiting"],
        ]);
        expect(state.jobs["issue-0"]).toMatchObject({ state: "waiting", holder: null });
        const permission = stateWith({ kind: "issue", target: "#9", id: "issue-9" });
        const job = permission.jobs["issue-9"];
        move(job, "starting", T0);
        move(job, "working", T0);
        job.holder = { pane: "%9" };
        move(job, "parked", T0, { waitingFor: { owner: "permission-issue-9" } });
        expect(endIdleSessions(ctxOf(permission))).toEqual([]);
    });
});

describe("tidyEndedJobs", () => {
    it("stops the servers inside an ended job's worktree, then removes it, salvaging a cancelled one", async () => {
        const state = stateWith(
            { kind: "issue", target: "#1", id: "issue-1" },
            { kind: "pr", target: "#5", id: "pr-5" },
        );
        const cancelled = state.jobs["issue-1"];
        Object.assign(cancelled, { worktree: "/w/issue-1", base: GREEN });
        move(cancelled, "cancelled", T0);
        const done = state.jobs["pr-5"];
        Object.assign(done, { worktree: "/w/pr-5", base: GREEN, pr: 5 });
        move(done, "starting", T0);
        move(done, "working", T0);
        move(done, "verifying", T0);
        move(done, "done", T0);
        state.prs[5] = { headSha: "x" }; // still open: kept
        /** @type {any[]} */
        const did = [];
        const ctx = {
            ...ctxOf(state),
            servers: async () => [
                { name: "sb", cwd: "/w/issue-1/graphty" },
                { name: "other", cwd: "/w/issue-10" },
            ],
            stopServer: async (/** @type {string} */ name) => void did.push(["stop", name]),
            remove: async (/** @type {any} */ o) => {
                did.push(["remove", o.dir, o.salvage]);
                return { ok: true, salvage: "githerd/issue-1-salvage" };
            },
        };
        expect(await tidyEndedJobs(ctx)).toEqual(["issue-1"]);
        expect(did).toEqual([
            ["stop", "sb"],
            ["remove", "/w/issue-1", true],
        ]);
        expect(cancelled).toMatchObject({ worktree: null, salvage: ["githerd/issue-1-salvage"] });
        delete state.prs[5];
        expect(await tidyEndedJobs(ctx)).toEqual(["pr-5"]);
    });
});
