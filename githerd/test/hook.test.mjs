import { execFileSync, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    realpathSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { move, newJob } from "../lib/board.mjs";
import {
    answerHook,
    asksOwner,
    hookOutput,
    jobRecordText,
    LAUNCH_PROMPT,
    newsOutput,
    restartIfDown,
    runHook,
    statusLine,
    taskOutputPath,
    UNCHECKED_STOPS,
    writeNews,
} from "../lib/hook.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const HOOK = fileURLToPath(new URL("../bin/githerd-hook.mjs", import.meta.url));

/** Hook inputs Claude Code recorded in the platform spikes. */
const REC = JSON.parse(readFileSync(new URL("fixtures/hook-inputs.json", import.meta.url), "utf8"));

const T0 = new Date("2026-10-03T12:00:00Z");

/** @type {string} */
let dir;
/** @type {string} a git repository with no daemon of its own */
let repo;
/** @type {import("node:http").Server | null} */
let server;

const STATUS = {
    banner: "PHONE ALERTS BROKEN since 10-03 10:00: exit 1",
    githerd: { mode: "dry-run" },
    master: { verdict: "red", since: "2026-10-03T09:00:00Z" },
    owner: [{ key: "a" }, { key: "b" }],
    prs: [{ number: 1 }],
};

/**
 * What the daemon knows, with nothing unusual.
 * @param {Partial<import("../lib/hook.mjs").HookFacts>} [over] overrides
 * @returns {import("../lib/hook.mjs").HookFacts} the facts
 */
const facts = (over = {}) => ({
    status: STATUS,
    models: ["claude-opus-5-5", "claude-fable-5"],
    githubUnknownSince: null,
    doneHolds: () => false,
    missing: () => "a green check run on the head",
    uid: 1000,
    ...over,
});

/**
 * A state with job `pr-7` working, held by session `s-0`.
 * @returns {any} the state
 */
function workingState() {
    const job = newJob({ kind: "pr", target: "7" }, T0);
    move(job, "starting", T0, { phase: "worktree", holder: { session: "s-0" } });
    move(job, "working", T0);
    return { jobs: { [job.id]: job } };
}

/**
 * A hook request from job `pr-7`'s worker.
 * @param {any} input the recorded input
 * @param {Record<string, unknown>} [over] input fields to change
 * @returns {import("../lib/hook.mjs").HookRequest} the request
 */
const worker = (input, over = {}) => ({
    event: input.hook_event_name,
    job: "pr-7",
    nonce: "n0nce-77",
    input: { ...input, ...over },
});

/**
 * Starts a fake daemon whose `/hook` answers through `answerHook` over `state`, and writes its
 * `daemon.json` into `stateDir`.
 * @param {string} stateDir the state directory
 * @param {any} state the daemon state
 * @param {(body: any) => [number, unknown] | null} [override] a reply that replaces the real one
 * @returns {Promise<any[]>} the requests, filled as they arrive
 */
async function fakeDaemon(stateDir, state, override = () => null) {
    /** @type {any[]} */
    const requests = [];
    server = createServer((req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            const parsed = JSON.parse(body);
            requests.push({ url: req.url, session: req.headers["x-githerd-session"], body: parsed });
            const [status, reply] = override(parsed) ?? [200, answerHook(state, parsed, facts(), T0).answer];
            res.writeHead(status, { "content-type": "application/json" });
            res.end(typeof reply === "string" ? reply : JSON.stringify(reply));
        });
    });
    await new Promise((done) => server?.listen(0, "127.0.0.1", () => done(undefined)));
    mkdirSync(stateDir, { recursive: true });
    const port = /** @type {import("node:net").AddressInfo} */ (server.address()).port;
    writeFileSync(join(stateDir, "daemon.json"), JSON.stringify({ port }));
    return requests;
}

beforeEach(() => {
    dir = realpathSync(mkdtempSync(join(tmpdir(), "githerd-hook-")));
    repo = join(dir, "work", "repo");
    mkdirSync(repo, { recursive: true });
    execFileSync("git", ["init", "-q", repo], { env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" } });
    server = null;
});

afterEach(async () => {
    if (server) await new Promise((done) => server?.close(() => done(undefined)));
    rmSync(dir, { recursive: true, force: true });
});

describe("statusLine", () => {
    it("puts the banner first, then master, the owner's list, pull requests and the mode", () => {
        expect(statusLine(STATUS)).toBe(
            "githerd: PHONE ALERTS BROKEN since 10-03 10:00: exit 1; master red since 2026-10-03T09:00:00Z; " +
                "2 waiting on the owner; 1 open pull requests; mode dry-run",
        );
    });

    it("says unknown for what the daemon did not report", () => {
        expect(statusLine({})).toBe(
            "githerd: master unknown; 0 waiting on the owner; 0 open pull requests; mode unknown",
        );
    });
});

describe("hookOutput", () => {
    it("blocks only a Stop, gives context only at SessionStart, and prints nothing for nothing", () => {
        expect(JSON.parse(/** @type {string} */ (hookOutput("Stop", { block: "why" })))).toEqual({
            decision: "block",
            reason: "why",
        });
        expect(hookOutput("UserPromptSubmit", { block: "why", context: "c" })).toBeNull();
        expect(JSON.parse(/** @type {string} */ (hookOutput("SessionStart", { message: "m", context: "c" })))).toEqual({
            systemMessage: "m",
            hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "c" },
        });
        expect(JSON.parse(/** @type {string} */ (hookOutput("Stop", { message: "m" })))).toEqual({
            systemMessage: "m",
        });
        expect(hookOutput("StopFailure", {})).toBeNull();
    });
});

describe("answerHook: SessionStart", () => {
    it("gives an owner session the status line and registers it", () => {
        const state = {};
        const r = answerHook(
            state,
            { event: "SessionStart", job: null, nonce: null, input: REC.startStartup },
            facts(),
            T0,
        );
        expect(r.answer).toEqual({ message: statusLine(STATUS), context: statusLine(STATUS) });
        expect(/** @type {any} */ (state).sessions[REC.startStartup.session_id].lastSeen).toBe(T0.toISOString());
    });

    it("links a worker's session to its job and says when the model is not allowed", () => {
        const state = workingState();
        const job = state.jobs["pr-7"];
        const ok = answerHook(state, worker(REC.startStartup, { model: "claude-opus-5-5" }), facts(), T0);
        expect(ok.answer.context).toBe(statusLine(STATUS));
        expect(job.holder.session).toBe(REC.startStartup.session_id);
        expect(job.sessions).toEqual([REC.startStartup.session_id]);
        // The recorded probe ran Haiku, which no worker may.
        const wrong = answerHook(state, worker(REC.startStartup), facts(), T0);
        expect(wrong.answer.message).toMatch(
            /^githerd: this worker runs claude-haiku-4-5-20251001; workers run only claude-opus-5-5 or claude-fable-5; githerd: PHONE ALERTS BROKEN/,
        );
        expect(wrong.ledger.map((e) => e.kind)).toEqual(["hook-session", "wrong-model"]);
        expect(job.sessions).toHaveLength(1);
    });

    it("gives the news at resume and the job record after compaction", () => {
        const state = workingState();
        const job = state.jobs["pr-7"];
        expect(answerHook(state, worker(REC.startResume), facts(), T0).answer).toEqual({});
        job.news.push({ at: T0.toISOString(), text: "PR #7 exists, remote head abc", acked: false });
        job.news.push({ at: T0.toISOString(), text: "seen already", acked: true });
        expect(answerHook(state, worker(REC.startResume), facts(), T0).answer).toEqual({
            context: "githerd news for job pr-7:\n- PR #7 exists, remote head abc",
        });
        job.claim = { plan: "fix the flaky test" };
        job.branch = "fix/pr-7";
        job.pr = 7;
        const r = answerHook(state, worker(REC.startCompact), facts(), T0);
        expect(r.answer.context).toBe(jobRecordText(job));
        expect(r.answer.context).toBe(
            "githerd job record (re-injected after compaction): job pr-7, pr 7, state working.\n" +
                "Your plan: fix the flaky test\nBranch: fix/pr-7\nPull request: #7\nNews: PR #7 exists, remote head abc",
        );
        expect(job.compactions).toBe(1);
    });
});

describe("answerHook: UserPromptSubmit", () => {
    it("records a doorbell by its nonce and ignores the launch prompt and task notices", () => {
        const state = workingState();
        const job = state.jobs["pr-7"];
        const bell = answerHook(state, worker(REC.promptDoorbell), facts(), T0);
        expect(bell).toEqual({
            answer: {},
            ledger: [{ kind: "doorbell-delivered", job: "pr-7", session: REC.promptDoorbell.session_id }],
        });
        expect(job.doorbellDeliveredAt).toBe(T0.toISOString());
        for (const prompt of [LAUNCH_PROMPT, REC.promptTaskNotification.prompt]) {
            expect(answerHook(state, worker(REC.promptLaunch, { prompt }), facts(), T0)).toEqual({
                answer: {},
                ledger: [],
            });
        }
        expect(job.steeredAt).toBeNull();
    });

    it("marks the job steered for anything else, once, and does nothing in an owner session", () => {
        const state = workingState();
        const steer = answerHook(state, worker(REC.promptOwner), facts(), T0);
        expect(steer.ledger).toEqual([{ kind: "steered", job: "pr-7", session: REC.promptOwner.session_id }]);
        expect(state.jobs["pr-7"].steeredAt).toBe(T0.toISOString());
        expect(answerHook(state, worker(REC.promptLaunch), facts(), T0).ledger).toEqual([]);
        // A worker without its nonce is steered by a doorbell for another session.
        expect(answerHook(state, { ...worker(REC.promptDoorbell), nonce: null }, facts(), T0).ledger).toEqual([]);
        const owner = answerHook(state, { ...worker(REC.promptOwner), job: null }, facts(), T0);
        expect(owner).toEqual({ answer: {}, ledger: [] });
    });
});

describe("answerHook: the Stop gate", () => {
    it("blocks a stop with what is missing and the four ways forward, but never twice in a turn", () => {
        const state = workingState();
        const r = answerHook(state, worker(REC.stopFirst), facts(), T0);
        expect(r.answer.block).toBe(
            "githerd: job pr-7 is not done; GitHub still shows missing: a green check run on the head. Continue " +
                "the work, or call githerd_wait for a condition, githerd_ask_owner for what only the owner can do, " +
                "or githerd_done with outcome failed and your findings.",
        );
        expect(answerHook(state, worker(REC.stopAgain), facts(), T0).answer).toEqual({});
        expect(answerHook(state, worker(REC.stopFirst), facts({ missing: () => "" }), T0).answer.block).toMatch(
            /missing: the job's done-condition\./,
        );
    });

    it("blocks a last message that asks the owner", () => {
        const state = workingState();
        for (const text of ["Should I merge it?", "Done.\nACTION NEEDED: approve the build"]) {
            const r = answerHook(state, worker(REC.stopFirst, { last_assistant_message: text }), facts(), T0);
            expect(r.answer.block).toMatch(
                /^githerd: your last message asks the owner something\. Decide this yourself/,
            );
        }
        expect(asksOwner(undefined)).toBe(false);
    });

    it("allows a steered, done, waiting or parked job, and a claim that waits", () => {
        let state = workingState();
        state.jobs["pr-7"].steeredAt = T0.toISOString();
        expect(answerHook(state, worker(REC.stopFirst), facts(), T0).ledger[0].allow).toBe("steered");
        state = workingState();
        const done = answerHook(state, worker(REC.stopFirst), facts({ doneHolds: () => true }), T0);
        expect(done).toMatchObject({ answer: {}, end: true });
        state.jobs["pr-7"].claim = { overlap: { decision: "wait" } };
        expect(answerHook(state, worker(REC.stopFirst), facts(), T0).answer).toEqual({});
        state = workingState();
        move(state.jobs["pr-7"], "parked", T0, { waitingFor: { owner: "item-1" } });
        expect(answerHook(state, worker(REC.stopFirst), facts(), T0).ledger[0].allow).toBe("waiting");
    });

    it("allows with a note when GitHub is unknown, and the job waits on GitHub", () => {
        const state = workingState();
        const r = answerHook(state, worker(REC.stopFirst), facts({ githubUnknownSince: "2026-10-03T11:00:00Z" }), T0);
        expect(r.answer).toEqual({
            message:
                "githerd: GitHub unreachable since 2026-10-03T11:00:00Z; githerd will ring you; do not retry or work around it",
        });
        expect(state.jobs["pr-7"]).toMatchObject({ state: "waiting", waitingFor: { github: "2026-10-03T11:00:00Z" } });
    });

    it("lets a stop with a background task through and waits on the task's output file", () => {
        const state = workingState();
        const r = answerHook(state, worker(REC.stopBackground), facts(), T0);
        expect(r.answer).toEqual({});
        const job = state.jobs["pr-7"];
        expect(job.state).toBe("waiting");
        // The path is the one the task's completion notice named.
        const named = /<output-file>(.*)<\/output-file>/.exec(REC.promptTaskNotification.prompt)?.[1];
        expect(job.waitingFor).toEqual({ local: "b9rvlj71o", output: named });
        expect(taskOutputPath(1000, REC.stopBackground.cwd, REC.stopBackground.session_id, "b9rvlj71o")).toBe(named);
    });

    it("allows an owner session's stop, and an unknown job's", () => {
        expect(answerHook({}, { ...worker(REC.stopFirst), job: null }, facts(), T0)).toEqual({
            answer: {},
            ledger: [],
        });
        expect(answerHook({}, worker(REC.stopFirst), facts(), T0)).toEqual({ answer: {}, ledger: [] });
    });
});

describe("answerHook: StopFailure", () => {
    /**
     * The recorded StopFailure input for an error.
     * @param {string} error the error
     * @returns {any} the input
     */
    const failure = (error) => REC.failures.find((/** @type {any} */ f) => f.error === error);

    it("stops every start at a usage limit", () => {
        const state = /** @type {any} */ (workingState());
        const r = answerHook(state, worker(failure("rate_limit")), facts(), T0);
        expect(r.answer).toEqual({});
        expect(state.apiStop).toMatchObject({ kind: "usage", error: "rate_limit" });
        // A normal stop does not lift a usage stop.
        answerHook(state, worker(REC.stopFirst), facts(), T0);
        expect(state.apiStop.kind).toBe("usage");
    });

    it("raises one owner item for a credential failure, lifted by the next normal stop", () => {
        for (const error of ["authentication_failed", "billing_error"]) {
            const state = /** @type {any} */ (workingState());
            answerHook(state, worker(failure(error)), facts(), T0);
            expect(state.apiStop).toMatchObject({ kind: "credential", error });
            expect(Object.keys(state.ownerItems)).toEqual(["api-credential"]);
            expect(state.ownerItems["api-credential"].question).toMatch(/^[\x20-\x7e]+$/);
            const next = answerHook(state, { ...worker(REC.stopFirst), job: null }, facts(), T0);
            expect(next.ledger).toEqual([{ kind: "api-stop-lifted", error, session: REC.stopFirst.session_id }]);
            expect(state.apiStop).toBeNull();
        }
        const terms = /** @type {any} */ ({});
        answerHook(
            terms,
            worker(failure("server_error"), { last_assistant_message: "Accept the Consumer Terms" }),
            facts(),
            T0,
        );
        expect(terms.apiStop.kind).toBe("credential");
    });

    it("retries a server error after 2 minutes, then 5, and ends the attempt on the third", () => {
        const state = workingState();
        const job = state.jobs["pr-7"];
        const err = worker(failure("server_error"));
        answerHook(state, err, facts(), T0);
        expect(job.apiErrors).toEqual({ count: 1, at: T0.toISOString(), retryAt: "2026-10-03T12:02:00.000Z" });
        answerHook(state, err, facts(), T0);
        expect(job.apiErrors.retryAt).toBe("2026-10-03T12:05:00.000Z");
        const third = answerHook(state, err, facts(), T0);
        expect(third.ledger[1]).toMatchObject({ kind: "attempt-ended", action: "requeue", job: "pr-7" });
        expect(job.state).toBe("queued");
        expect(job.attempts[0].outcome).toBe("API server_error three times in a row");
        // Another reason, or an owner session, is only recorded.
        expect(answerHook({}, { ...err, job: null }, facts(), T0).ledger).toHaveLength(1);
        expect(
            answerHook(state, worker(failure("server_error"), { error: "max_output_tokens" }), facts(), T0).ledger[0]
                .error,
        ).toBe("max_output_tokens");
    });
});

describe("answerHook: Notification and other events", () => {
    it("records a worker's permission prompt for the watchdog to confirm", () => {
        const state = workingState();
        const input = {
            session_id: "s",
            hook_event_name: "Notification",
            notification_type: "permission_prompt",
            message: "Claude needs your permission to use Bash",
        };
        const r = answerHook(state, worker(input), facts(), T0);
        expect(r.ledger).toEqual([{ kind: "permission-prompt", job: "pr-7", session: "s" }]);
        expect(state.jobs["pr-7"].permissionPrompt).toEqual({ at: T0.toISOString(), message: input.message });
        expect(answerHook(state, worker({ ...input, notification_type: "idle_prompt" }), facts(), T0).ledger).toEqual(
            [],
        );
        expect(
            answerHook(state, { event: "PreCompact", job: null, nonce: null, input: undefined }, facts(), T0),
        ).toEqual({
            answer: {},
            ledger: [],
        });
    });
});

describe("newsOutput", () => {
    it("gives unacknowledged news once, in the format the session relayed", () => {
        const jobDir = join(dir, "jobs", "pr-7");
        expect(newsOutput(jobDir, "pr-7")).toBeNull();
        writeNews(jobDir, [
            { at: "2026-10-03T12:00:00.000Z", text: "old", acked: true },
            { at: "2026-10-03T12:01:00.000Z", text: "the owner edited issue #12", acked: false },
        ]);
        expect(JSON.parse(/** @type {string} */ (newsOutput(jobDir, "pr-7")))).toEqual({
            hookSpecificOutput: {
                hookEventName: "PostToolUse",
                additionalContext:
                    "githerd news for job pr-7:\n- the owner edited issue #12\nCall githerd_next to acknowledge it.",
            },
        });
        expect(newsOutput(jobDir, "pr-7")).toBeNull();
        writeNews(jobDir, [
            { at: "2026-10-03T12:01:00.000Z", text: "the owner edited issue #12", acked: false },
            { at: "2026-10-03T12:02:00.000Z", text: "pushed abc", acked: false },
        ]);
        expect(newsOutput(jobDir, "pr-7")).toMatch(/- pushed abc\\n/);
        writeFileSync(join(jobDir, "news"), "not json");
        expect(newsOutput(jobDir, "pr-7")).toBeNull();
        expect(readdirSync(jobDir).sort()).toEqual(["news", "news.seen"]);
    });
});

describe("runHook", () => {
    /** @type {any[]} */
    let restarts;
    /** @type {string[]} */
    let urls;
    /** @type {any} */
    let options;
    /** @type {string} */
    let stateDir;

    beforeEach(() => {
        restarts = [];
        urls = [];
        stateDir = join(dir, "state");
        options = {
            cwd: dir,
            env: { HOME: dir, GITHERD_STATE_DIR: stateDir },
            restart: (/** @type {any} */ where) => restarts.push(where) && false,
            fetch: (/** @type {string} */ url, /** @type {any} */ init) => {
                urls.push(url);
                return fetch(url, init);
            },
        };
    });

    it("asks the daemon as the session and prints its answer", async () => {
        const requests = await fakeDaemon(stateDir, {});
        const out = await runHook("SessionStart", JSON.stringify({ ...REC.startStartup, cwd: repo }), options);
        expect(JSON.parse(/** @type {string} */ (out))).toEqual({
            systemMessage: statusLine(STATUS),
            hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: statusLine(STATUS) },
        });
        expect(requests).toEqual([
            {
                url: "/hook",
                session: REC.startStartup.session_id,
                body: { event: "SessionStart", job: null, nonce: null, input: { ...REC.startStartup, cwd: repo } },
            },
        ]);
        expect(restarts).toEqual([]);
    });

    it("blocks a worker's stop with the daemon's reason", async () => {
        const state = workingState();
        const requests = await fakeDaemon(stateDir, state);
        options.env = { ...options.env, GITHERD_JOB: "pr-7", GITHERD_NONCE: "n0nce-77" };
        const out = await runHook("Stop", JSON.stringify({ ...REC.stopFirst, cwd: repo }), options);
        expect(JSON.parse(/** @type {string} */ (out))).toMatchObject({ decision: "block" });
        expect(requests[0].body).toMatchObject({ job: "pr-7", nonce: "n0nce-77" });
        expect(
            await runHook("UserPromptSubmit", JSON.stringify({ ...REC.promptOwner, cwd: repo }), options),
        ).toBeNull();
        expect(state.jobs["pr-7"].steeredAt).toBe(T0.toISOString());
    });

    it("spools, restarts, and counts a worker's unchecked stops when no daemon answers", async () => {
        options.env = { ...options.env, GITHERD_JOB: "pr-7" };
        const input = JSON.stringify({ ...REC.stopFirst, cwd: repo });
        for (const n of [1, 2]) {
            const out = JSON.parse(/** @type {string} */ (await runHook("Stop", input, options)));
            expect(out).toEqual({
                systemMessage: `githerd: Stop gate unreachable: ${n} stops allowed unchecked (no daemon.json)`,
            });
        }
        expect(readFileSync(join(stateDir, UNCHECKED_STOPS), "utf8").split("\n")[0]).toMatch(
            new RegExp(`^\\S+ pr-7 ${REC.stopFirst.session_id} no daemon.json$`),
        );
        const spooled = readdirSync(join(stateDir, "spool")).map((n) =>
            JSON.parse(readFileSync(join(stateDir, "spool", n), "utf8")),
        );
        expect(spooled).toHaveLength(2);
        expect(spooled[0]).toMatchObject({
            event: "Stop",
            job: "pr-7",
            input: { session_id: REC.stopFirst.session_id },
        });
        expect(restarts).toEqual([
            { cwd: repo, env: options.env, stateDir },
            { cwd: repo, env: options.env, stateDir },
        ]);
        expect(urls).toEqual([]);
    });

    it("says in one line when the daemon refuses or breaks off, and does not count an owner's stop", async () => {
        /** @type {[number, unknown]} */
        let reply = [503, { error: "githerd is DOWN: boom" }];
        await fakeDaemon(stateDir, {}, () => reply);
        const input = JSON.stringify({ ...REC.stopFirst, cwd: repo });
        expect(JSON.parse(/** @type {string} */ (await runHook("Stop", input, options)))).toEqual({
            systemMessage:
                "githerd: daemon not reachable (daemon answered 503: githerd is DOWN: boom); the event was kept for it",
        });
        reply = [200, "not json"];
        expect(await runHook("UserPromptSubmit", input, options)).toMatch(/daemon not reachable \(/);
        expect(readdirSync(join(stateDir, "spool"))).toHaveLength(2);
        expect(readdirSync(stateDir)).not.toContain(UNCHECKED_STOPS);
    });

    it("answers PostToolUse from the job's news file without asking the daemon", async () => {
        options.env = { ...options.env, GITHERD_JOB: "pr-7" };
        writeNews(join(stateDir, "jobs", "pr-7"), [{ at: T0.toISOString(), text: "pushed abc", acked: false }]);
        const input = JSON.stringify({ ...REC.postToolUse, cwd: repo });
        expect(await runHook("PostToolUse", input, options)).toMatch(/pushed abc/);
        expect(await runHook("PostToolUse", input, options)).toBeNull();
        options.env = { HOME: dir, GITHERD_STATE_DIR: stateDir };
        expect(await runHook("PostToolUse", input, options)).toBeNull();
        expect(urls).toEqual([]);
        expect(restarts).toEqual([]);
    });

    it("never calls anything but the local daemon", async () => {
        const state = workingState();
        await fakeDaemon(stateDir, state);
        options.env = { ...options.env, GITHERD_JOB: "pr-7", GITHERD_NONCE: "n0nce-77" };
        const inputs = [REC.startStartup, REC.promptDoorbell, REC.stopFirst, REC.failures[0], REC.postToolUse];
        for (const input of inputs)
            await runHook(input.hook_event_name, JSON.stringify({ ...input, cwd: repo }), options);
        expect(urls.length).toBe(4);
        for (const url of urls) expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/hook$/);
    });

    it("is silent outside a git repository and uses its own directory without input", async () => {
        expect(await runHook("SessionStart", JSON.stringify({ cwd: dir }), options)).toBeNull();
        expect(await runHook("SessionStart", "", options)).toBeNull();
        expect(urls).toEqual([]);
    });
});

describe("restartIfDown", () => {
    it("starts nothing outside a repository or in one githerd is not configured for", () => {
        expect(restartIfDown({ cwd: dir, env: { HOME: dir }, stateDir: join(dir, "state") })).toBe(false);
        expect(restartIfDown({ cwd: repo, env: { HOME: dir }, stateDir: join(dir, "state") })).toBe(false);
    });
});

describe("bin/githerd-hook.mjs", () => {
    it("prints one line and exits 0 when no daemon answers, and nothing outside a repository", () => {
        const run = (/** @type {string} */ event, /** @type {string} */ cwd) =>
            spawnSync(process.execPath, [HOOK, event], {
                cwd,
                input: JSON.stringify({ cwd }),
                encoding: "utf8",
                env: { PATH: process.env.PATH, HOME: dir },
            });
        const start = run("SessionStart", repo);
        expect(start.status).toBe(0);
        expect(JSON.parse(start.stdout).systemMessage).toMatch(/^githerd: daemon not reachable \(no daemon.json\)/);
        expect(run("Stop", dir)).toMatchObject({ status: 0, stdout: "" });
    });
});

describe("the committed project settings", () => {
    const settings = JSON.parse(readFileSync(join(REPO, ".claude", "settings.json"), "utf8"));
    const [entry] = settings.hooks.SessionStart;
    const command = entry.hooks[0].command;

    /**
     * Runs the registered SessionStart command as Claude Code does, with `home` as HOME. It runs
     * asynchronously, so a fake daemon in this process can answer it.
     * @param {string} home the home directory
     * @returns {Promise<{status: number | null, stdout: string, stderr: string}>} the result
     */
    async function runCommand(home) {
        const child = spawn("sh", ["-c", command], { cwd: repo, env: { PATH: process.env.PATH, HOME: home } });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (c) => (stdout += c));
        child.stderr.on("data", (c) => (stderr += c));
        child.stdin.end(JSON.stringify({ cwd: repo, session_id: "s", source: "startup" }));
        const [status] = await once(child, "exit");
        return { status, stdout, stderr };
    }

    it("registers the SessionStart hook for new sessions only", () => {
        expect(entry.matcher).toBe("startup");
        expect(command).toContain("$HOME/.githerd/graphty-monorepo/current/bin/githerd-hook.mjs");
    });

    it("prints the status line when githerd is installed", async () => {
        mkdirSync(join(dir, ".githerd", "graphty-monorepo"), { recursive: true });
        symlinkSync(PKG, join(dir, ".githerd", "graphty-monorepo", "current"));
        await fakeDaemon(join(dir, ".githerd", "repo"), {});
        const r = await runCommand(dir);
        expect(r.status).toBe(0);
        expect(JSON.parse(r.stdout).systemMessage).toBe(statusLine(STATUS));
    });

    it("does nothing, and exits 0, when githerd is not installed", async () => {
        const r = await runCommand(dir);
        expect(r).toMatchObject({ status: 0, stdout: "", stderr: "" });
    });

    it("starts the MCP server from the installed copy", () => {
        const mcp = JSON.parse(readFileSync(join(REPO, ".mcp.json"), "utf8"));
        expect(mcp.mcpServers.githerd).toEqual({
            command: "node",
            args: ["${HOME}/.githerd/graphty-monorepo/current/bin/githerd-mcp.mjs"],
        });
    });
});
