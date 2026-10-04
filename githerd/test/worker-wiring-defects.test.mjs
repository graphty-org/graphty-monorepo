// Defects in the worker wiring (queue item -> job record -> start -> death and recovery -> done),
// each written as the behavior the design asks for. These fail until the defect is fixed.
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { move, newJob } from "../lib/board.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import { answerHook } from "../lib/hook.mjs";
import { createMcpServer, TOOL_PROTOCOL } from "../lib/mcp.mjs";
import { sessionToolSet } from "../lib/session-tools.mjs";
import { fillSlots, tidyEndedJobs } from "../lib/start.mjs";

const T0 = new Date("2026-10-04T12:00:00Z");
const GREEN = "g".repeat(40);
const CONFIG = normalizeConfig({ repo: "o/r", lanes: { ci: { workflow: "ci.yml", gating: "required" } } });
const WINDOW = { socket: "githerd", window: "@1", pane: "%1", pid: 4242, name: "githerd-w" };

/** @type {string} */
let dir;
/** @type {any[]} */
let calls;

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-wiring-"));
    calls = [];
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/**
 * A fake platform that starts workers at once.
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
 * @param {any} [over] overrides
 * @returns {any} the context
 */
function ctxOf(state, over = {}) {
    return {
        state,
        config: CONFIG,
        root: dir,
        stateDir: join(dir, "state"),
        env: { HOME: dir, USER: "owner", PATH: "/bin" },
        now: () => T0,
        ledger: () => {},
        save: async () => {},
        mode: "acting",
        platform: platform(),
        tasks: new Map(),
        ...over,
    };
}

/**
 * A state with queued jobs and a green commit.
 * @param {...any} specs newJob arguments
 * @returns {any} the state
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
    while (ctx.tasks.size) await Promise.allSettled([...ctx.tasks.values()]);
}

/**
 * Waits until a condition holds.
 * @param {() => boolean} cond the condition
 */
async function until(cond) {
    for (let i = 0; i < 1000 && !cond(); i++) await new Promise((r) => setImmediate(r));
    if (!cond()) throw new Error("condition never held");
}

describe("a job cancelled while its worktree is being prepared", () => {
    it("still has the prepared worktree recorded, so tidyEndedJobs removes it", async () => {
        const state = stateWith({ kind: "issue", target: "#7", id: "issue-7" });
        /** Opens the gate. @type {() => void} */
        let release = () => {};
        const gate = new Promise((r) => (release = () => r(undefined)));
        const ctx = ctxOf(state, {
            platform: platform({
                prepare: async (/** @type {any} */ o) => {
                    calls.push({ prepare: o.job });
                    await gate;
                    const wt = join(dir, "wt", o.job);
                    mkdirSync(wt, { recursive: true });
                    return { verdict: "ready", dir: wt, sha: o.sha };
                },
            }),
        });
        await fillSlots(ctx);
        await until(() => calls.some((c) => c.prepare));
        // The issue closes meanwhile (jobs.mjs cancels the job).
        move(state.jobs["issue-7"], "cancelled", T0, { reason: "target closed" });
        release();
        await settle(ctx);
        /** @type {string[]} */
        const removed = [];
        await tidyEndedJobs({
            ...ctx,
            servers: async () => [],
            stopServer: async () => {},
            remove: async (/** @type {any} */ o) => {
                removed.push(o.dir);
                return { ok: true, salvage: null };
            },
        });
        // Design 7.8: a cancelled job's worktree is removed. A locked, installed and built worktree
        // that no record names is never removed by anything.
        expect(removed).toEqual([join(dir, "wt", "issue-7")]);
    });
});

describe("a working job whose new window cannot be opened", () => {
    it("is not left holding a slot with a holder that has no window", async () => {
        const state = stateWith({ kind: "issue", target: "#1", id: "issue-1" });
        const job = state.jobs["issue-1"];
        move(job, "starting", T0);
        move(job, "working", T0);
        job.worktree = join(dir, "wt", "issue-1");
        job.base = GREEN;
        mkdirSync(job.worktree, { recursive: true });
        const ctx = ctxOf(state, {
            platform: platform({
                // startWorker runs tmux with execFileSync: a tmux failure throws.
                start: async () => {
                    throw new Error("tmux: server exited unexpectedly");
                },
            }),
        });
        expect((await fillSlots(ctx)).admitted).toEqual(["issue-1"]);
        await settle(ctx);
        // The holder {nonce, session: null} with no pane is never watched (watchPass skips it),
        // never recovered (fillSlots wants !holder) and counts as a held slot until the 4-hour
        // working clock ends an attempt.
        expect(job.holder).toBeNull();
    });
});

describe("a worker session whose job was requeued without it", () => {
    it("cannot claim the queued job as if it were an owner session", async () => {
        // A window githerd opened, then lost (the daemon restarted during startWorker and requeued
        // the job, dropping the holder): the session still runs the launch prompt with its nonce.
        const job = newJob({ kind: "issue", target: "#7", id: "issue-7" }, T0);
        const state = { jobs: { "issue-7": job } };
        const ctx = {
            state,
            config: { repo: "o/r" },
            now: T0,
            status: { config: {}, now: T0, startedAt: T0, version: "0.1.0", mode: "dry-run" },
            push: { request: async () => ({}) },
            github: { get: async () => ({ body: {} }), write: async () => ({ performed: false }) },
            snapshotFacts: () => ({ ownerSessions: [] }),
            commit: async () => {},
            uid: 1000,
        };
        const server = createMcpServer({
            serverInfo: { name: "githerd", version: "0.1.0" },
            protocols: [TOOL_PROTOCOL],
            tools: () => sessionToolSet(/** @type {any} */ (ctx)),
        });
        const meta = { protocol: TOOL_PROTOCOL, session: "orphan", job: "issue-7", nonce: "old-nonce" };
        const call = async (/** @type {string} */ name, /** @type {any} */ args) => {
            const res = await server.handle(
                { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args, _meta: { githerd: meta } } },
                { session: "orphan" },
            );
            const result = /** @type {any} */ (res?.result);
            return { text: result.content[0].text, isError: Boolean(result.isError) };
        };
        const next = JSON.parse((await call("githerd_next", {})).text);
        const claim = await call("githerd_claim", {
            job: "issue-7",
            snapshotVersion: next.snapshot.version,
            plan: "p",
            overlap: { decision: "independent", reason: "alone" },
        });
        // Today the orphan becomes the job's holder as startedBy "owner": no pane, so never watched
        // or ended, and the job no longer starts a real worker.
        expect(claim.isError).toBe(true);
        expect(job.state).toBe("queued");
    });
});

describe("SessionStart from a session started with another nonce", () => {
    it("does not take over the current holder's session", () => {
        const job = newJob({ kind: "issue", target: "#7", id: "issue-7" }, T0);
        move(job, "starting", T0);
        job.holder = { nonce: "new", socket: "githerd", startedBy: "githerd", session: null };
        const state = { jobs: { "issue-7": job }, trust: { login: "owner" } };
        answerHook(
            state,
            {
                id: "r1",
                event: "SessionStart",
                job: "issue-7",
                nonce: "old",
                input: { session_id: "stale-session", source: "startup", cwd: "/w", model: "claude-opus-5-5" },
            },
            /** @type {any} */ ({ status: {}, models: ["claude-opus-5-5"] }),
            T0,
        );
        // openSession takes job.holder.session over the registry's sessionId, so the new window
        // would be recorded as the stale session, and every heldJob check of the real worker fails.
        expect(job.holder.session).toBeNull();
    });
});
