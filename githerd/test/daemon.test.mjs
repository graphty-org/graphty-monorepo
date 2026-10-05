import { spawn } from "node:child_process";
import {
    chmodSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git as gitSync, isolateGit } from "../../visual-review/test/helpers.mjs";
import { move, newJob } from "../lib/board.mjs";
import { TOOL_PROTOCOL, TOOLS } from "../lib/mcp.mjs";

/** What every session's MCP server says about itself on a call: the tool protocol it speaks. */
const META = { githerd: { protocol: TOOL_PROTOCOL } };
import { notifyCommandProblem, PROTOCOL, startDaemon } from "../lib/daemon.mjs";
import { containerStart, identify } from "../lib/proc.mjs";
import { readLedger, spoolEvent } from "../lib/store.mjs";
import { statusData, statusText } from "../lib/tools.mjs";
import { createFakeGh, httpOutput } from "./helpers/fake-gh.mjs";

const FAKE_NOTIFY = fileURLToPath(new URL("helpers/fake-notify.mjs", import.meta.url));
const DAEMON_BIN = fileURLToPath(new URL("../bin/githerd-daemon.mjs", import.meta.url));
const PACKAGE_DIR = fileURLToPath(new URL("..", import.meta.url));

const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);
const D = "d".repeat(40);

/**
 * A commit as `GET repos/{repo}/commits` returns it.
 * @param {string} sha the commit
 * @param {string | null} parent its first parent
 * @param {string} message its message
 * @returns {object} the commit
 */
const commit = (sha, parent, message) => ({
    sha,
    parents: parent ? [{ sha: parent }] : [],
    commit: { message, committer: { date: "2026-10-02T12:00:00Z" } },
});

/**
 * A completed or in-flight workflow run.
 * @param {number} id the run id
 * @param {string} sha the commit it ran on
 * @param {string | null} conclusion null while running
 * @returns {object} the run
 */
const run = (id, sha, conclusion) => ({
    id,
    run_attempt: 1,
    head_sha: sha,
    status: conclusion ? "completed" : "in_progress",
    conclusion,
    updated_at: "2026-10-02T12:00:00Z",
});

/**
 * PR #7 by the owner at head B, whose one required check failed in the visual-review gate.
 * @returns {any} the GraphQL node
 */
const gatedPr = () => ({
    number: 7,
    title: "fix(x): a fix",
    isDraft: false,
    updatedAt: "2026-10-02T11:00:00Z",
    headRefName: "fix/x",
    headRefOid: B,
    baseRefName: "master",
    mergeable: "MERGEABLE",
    autoMergeRequest: { enabledAt: "2026-10-02T11:00:00Z" },
    labels: { nodes: [] },
    author: { login: "owner" },
    commits: {
        nodes: [
            {
                commit: {
                    committedDate: "2026-10-02T10:00:00Z",
                    statusCheckRollup: {
                        contexts: {
                            nodes: [
                                {
                                    __typename: "CheckRun",
                                    name: "All Checks Pass",
                                    status: "COMPLETED",
                                    conclusion: "FAILURE",
                                    startedAt: "2026-10-02T10:05:00Z",
                                    databaseId: 555,
                                },
                            ],
                        },
                    },
                },
            },
        ],
    },
});

/** @type {string} */
let dir;
/** @type {string} */
let configFile;
/** @type {string} */
let notifyLog;
/** @type {Date} */
let clock;
/**
 * @type {{head: string, ci: any[], commits: any[], prs: any[], issues?: any[], comments?: any[], login?: string | null,
 *   events?: Record<string, any[]>, merged?: any[], release?: any[], annotations?: any[], gpu?: any[],
 *   jobs?: Record<string, any[]>, logs?: Record<string, string>, compare?: {filename: string, patch?: string}[]}}
 */
let scene;
/** @type {ReturnType<typeof createFakeGh>} */
let gh;
/** @type {string[][]} */
let gitCalls;
/** @type {string[]} */
let lines;
/** @type {any[]} daemons started by a test, shut down after it */
let daemons;
/** @type {import("node:child_process").ChildProcess[]} */
let children;

/**
 * Writes the config file the daemon reads through GITHERD_CONFIG.
 * @param {Record<string, unknown>} [overrides] fields to change
 */
function writeConfig(overrides = {}) {
    const config = {
        repo: "o/r",
        lanes: { ci: { workflow: "ci.yml", gating: "required" } },
        notify: { command: [process.execPath, FAKE_NOTIFY, notifyLog, "ok", "{status}", "{message}"] },
        ...overrides,
    };
    writeFileSync(configFile, JSON.stringify(config));
}

/**
 * Answers the daemon's gh calls from the current scene.
 * @param {{args: string[], input?: string}} call one gh call
 * @returns {{code: number, stdout: string, stderr: string}} the response
 */
function respond({ args, input }) {
    const ok = (/** @type {unknown} */ body) => httpOutput({ status: 200, body });
    if (args.includes("graphql")) {
        if (input?.includes("pullRequests(")) {
            return ok({
                data: {
                    repository: {
                        defaultBranchRef: { name: "master", target: { oid: scene.head } },
                        pullRequests: { nodes: scene.prs },
                    },
                },
            });
        }
        if (input?.includes("search(")) {
            return ok({ data: { search: { issueCount: scene.merged?.length ?? 0, nodes: scene.merged ?? [] } } });
        }
        if (input?.includes("issues(states: OPEN")) {
            return ok({ data: { repository: { issues: { pageInfo: { hasNextPage: false }, nodes: [] } } } });
        }
    }
    const path = args[args.length - 1];
    if (path === "user") {
        return scene.login === null
            ? httpOutput({ status: 401, body: { message: "Bad credentials" } })
            : ok({ login: scene.login ?? "owner" });
    }
    if (path.includes("/actions/workflows/ci.yml/runs?")) return ok({ workflow_runs: scene.ci });
    if (path.includes("/actions/workflows/release.yml/runs?")) return ok({ workflow_runs: scene.release ?? [] });
    if (path.includes("/actions/workflows/gpu.yml/runs?")) return ok({ workflow_runs: scene.gpu ?? [] });
    const runJobs = /\/actions\/runs\/(\d+)\/jobs\?/.exec(path);
    if (runJobs && scene.jobs?.[runJobs[1]]) return ok({ jobs: scene.jobs[runJobs[1]] });
    if (/\/check-runs\/\d+\/annotations\?/.test(path)) return ok(scene.annotations ?? []);
    if (/\/actions\/runs\/\d+$/.test(path) && !args.includes("-X")) {
        return ok({ id: Number(path.split("/").at(-1)), run_attempt: 1, status: "completed" });
    }
    if (/\/actions\/runs\/\d+\/jobs\?/.test(path)) {
        return ok({
            jobs: [
                { id: 900, run_attempt: 1, name: "Build", conclusion: "failure" },
                { id: 901, run_attempt: 1, name: "Lint", conclusion: "success" },
            ],
        });
    }
    if (path.includes("/commits?sha=master")) return ok(scene.commits);
    const events = /\/issues\/(\d+)\/events\?/.exec(path);
    if (events) return ok(scene.events?.[events[1]] ?? []);
    if (path.includes("/issues?")) return ok(scene.issues ?? []);
    if (/\/pulls\/\d+\/commits\?/.test(path)) return ok([{ commit: { message: "fix(x): a fix" } }]);
    if (/\/pulls\/\d+\/files\?/.test(path)) return ok([{ filename: "src/a.ts" }]);
    const log = /\/actions\/jobs\/(\d+)\/logs$/.exec(path);
    if (log)
        return httpOutput({ status: 200, body: scene.logs?.[log[1]] ?? "<Error><Code>BlobNotFound</Code></Error>" });
    if (/\/actions\/jobs\/\d+$/.test(path)) {
        return ok({ steps: [{ name: "Check visual changes were accepted", conclusion: "failure" }] });
    }
    if (/\/issues\/\d+\/comments\?/.test(path)) return ok(scene.comments ?? []);
    const issue = /\/issues\/(\d+)$/.exec(path);
    if (issue && !args.includes("-X")) return ok({ number: Number(issue[1]), state: "open" });
    if (args.includes("-X")) {
        scene.posted = (scene.posted ?? 0) + 1;
        return httpOutput({ status: 201, body: { id: 5, url: "https://api.github.com/repos/o/r/issues/comments/5" } });
    }
    if (path === "repos/o/r/issues/comments/5") return ok({ id: 5 });
    if (path.includes("/compare/")) return ok({ files: scene.compare ?? [] });
    throw new Error(`unexpected gh call: ${args.join(" ")}`);
}

/**
 * Starts a daemon on the test's state, with the fakes.
 * @param {Record<string, unknown>} [options] overrides
 * @returns {Promise<any>} the daemon
 */
async function start(options = {}) {
    const daemon = await startDaemon({
        root: dir,
        port: 0,
        fetch: gh.fetch,
        token: gh.token,
        git: async (args) => {
            gitCalls.push(args);
            return { code: 0, stdout: "", stderr: "" };
        },
        now: () => clock,
        env: { GITHERD_CONFIG: configFile, PATH: process.env.PATH },
        stateDir: join(dir, ".githerd"),
        autoPoll: false,
        log: (line) => lines.push(line),
        // githerd's real tmux server is never read by a test.
        platform: { windows: () => [] },
        // Nor are the owner's real Claude sessions: no session is listed unless a test lists one.
        peers: { sessions: () => [], transport: { send: async () => {} } },
        ...options,
    });
    daemons.push(daemon);
    return daemon;
}

/**
 * Polls once and waits for the notifier.
 * @param {any} daemon the daemon
 * @returns {Promise<any>} the poll's result
 */
async function poll(daemon) {
    const result = await daemon.poll();
    await daemon.flushNotifications();
    return result;
}

/**
 * The pages the fake notify command received: what reached the owner's phone.
 * @returns {{status: string, message: string}[]} one entry per delivery
 */
function phone() {
    if (!existsSync(notifyLog)) return [];
    return readFileSync(notifyLog, "utf8")
        .trim()
        .split("\n")
        .map((line) => {
            const [status, message] = JSON.parse(line).args;
            return { status, message };
        });
}

/**
 * Every page githerd sent, delivered or held: the ledger's notify lines. Held lines are on disk
 * once the notifier's flush resolves.
 * @returns {{status: string, message: string}[]} one entry per page
 */
function pages() {
    const file = join(dir, ".githerd", "ledger.jsonl");
    if (!existsSync(file)) return [];
    return readFileSync(file, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
        .filter((e) => e.kind === "notify")
        .map(({ status, message }) => ({ status, message }));
}

/**
 * Reads state.json.
 * @returns {any} the saved state
 */
const saved = () => JSON.parse(readFileSync(join(dir, ".githerd", "state.json"), "utf8"));

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
 * Starts a long-lived process in its own group, to stand in for another live daemon.
 * @returns {import("node:child_process").ChildProcess} the process
 */
function sleeper() {
    const child = spawn("sleep", ["60"], { detached: true, stdio: "ignore" });
    children.push(child);
    return child;
}

beforeAll(() => isolateGit());

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-daemon-"));
    configFile = join(dir, "githerd.config.json");
    notifyLog = join(dir, "notify.log");
    clock = new Date("2026-10-02T12:00:00Z");
    scene = { head: A, ci: [run(100, A, "success")], commits: [commit(A, null, "first")], prs: [] };
    gh = createFakeGh(respond);
    gitCalls = [];
    lines = [];
    daemons = [];
    children = [];
    writeConfig();
});

afterEach(async () => {
    for (const daemon of daemons) if (!daemon.fenced) await daemon.shutdown();
    for (const child of children) {
        try {
            process.kill(-child.pid, "SIGKILL");
        } catch {
            // already gone
        }
    }
    for (const child of children) {
        if (child.exitCode === null && child.signalCode === null) await new Promise((r) => child.once("exit", r));
        expect(groupAlive(child.pid)).toBe(false);
    }
    rmSync(dir, { recursive: true, force: true });
});

describe("HTTP endpoints", () => {
    it("/health reports the fields of design section 3.2", async () => {
        const daemon = await start();
        const before = await (await fetch(`${daemon.url}/health`)).json();
        expect(Object.keys(before).sort()).toEqual(
            [
                "name",
                "protocol",
                "version",
                "codeHash",
                "root",
                "pid",
                "port",
                "mode",
                "startedAt",
                "loopTickAt",
                "nextPollAt",
                "lastPollOkAt",
                "lastPollError",
                "githubDownSince",
                "notifyBrokenSince",
                "fatal",
            ].sort(),
        );
        expect(before).toMatchObject({
            name: "githerd",
            protocol: PROTOCOL,
            root: dir,
            pid: process.pid,
            port: daemon.port,
            mode: "dry-run",
            startedAt: clock.toISOString(),
            loopTickAt: null,
            nextPollAt: null,
            notifyBrokenSince: null,
            fatal: null,
        });

        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        const after = await (await fetch(`${daemon.url}/health`)).json();
        expect(after.loopTickAt).toBe(clock.toISOString());
        expect(after.lastPollOkAt).toBe(clock.toISOString());
        expect(after.lastPollError).toBeNull();
    });

    it("binds 127.0.0.1 and writes daemon.json with its identity", async () => {
        const daemon = await start();
        const file = JSON.parse(readFileSync(join(dir, ".githerd", "daemon.json"), "utf8"));
        expect(file).toMatchObject({ ...identify(process.pid), port: daemon.port, root: dir });
        expect(daemon.url).toBe(`http://127.0.0.1:${daemon.port}`);
    });

    it("lists the thirteen session tools on /rpc", async () => {
        const daemon = await start();
        const res = await fetch(`${daemon.url}/rpc`, {
            method: "POST",
            headers: { "x-githerd-session": "wt-1" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        });
        const names = (await res.json()).result.tools.map((t) => t.name);
        expect(names).toEqual(TOOLS.map((t) => t.name));
        expect(names).toHaveLength(13);
    });

    it("persists a job claim before replying, and a notification gets 202", async () => {
        const daemon = await start();
        daemon.state.jobs = { "issue-7": newJob({ kind: "issue", target: "#7", id: "issue-7" }, clock) };
        const call = (body) =>
            fetch(`${daemon.url}/rpc`, {
                method: "POST",
                headers: { "x-githerd-session": "wt-1" },
                body: JSON.stringify(body),
            });
        const tool = async (name, args, meta = META) =>
            (
                await (
                    await call({
                        jsonrpc: "2.0",
                        id: 2,
                        method: "tools/call",
                        params: { _meta: meta, name, arguments: args },
                    })
                ).json()
            ).result;
        const next = JSON.parse((await tool("githerd_next", {})).content[0].text);
        expect(next.offered.map((j) => j.id)).toEqual(["issue-7"]);
        const claim = {
            job: "issue-7",
            snapshotVersion: next.snapshot.version,
            overlap: { decision: "independent", reason: "nothing else touches it" },
            plan: "fix the bug",
        };
        // A client in another tool protocol is refused before anything runs.
        const refused = await tool("githerd_claim", claim, { githerd: { protocol: TOOL_PROTOCOL + 1 } });
        expect(refused).toMatchObject({
            isError: true,
            content: [{ text: expect.stringMatching(/^protocol mismatch/) }],
        });
        expect(daemon.state.jobs["issue-7"].state).toBe("queued");
        const ok = await tool("githerd_claim", claim);
        expect(JSON.parse(ok.content[0].text)).toEqual({ ok: true, job: { id: "issue-7", state: "working" } });
        expect(saved().jobs["issue-7"].claim.session).toBe("wt-1");
        expect((await call({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);
    });

    it("registers a heartbeat and refuses one without a session", async () => {
        const daemon = await start();
        const beat = (body) => fetch(`${daemon.url}/heartbeat`, { method: "POST", body: JSON.stringify(body) });
        expect((await beat({ session: "wt-2", cwd: "/x", branch: "feat/y" })).status).toBe(200);
        expect(saved().sessions["wt-2"]).toMatchObject({ cwd: "/x", branch: "feat/y" });
        expect((await beat({ cwd: "/x" })).status).toBe(400);
        expect((await fetch(`${daemon.url}/nope`)).status).toBe(404);
    });

    it("answers a hook event, records what it changed and writes the job's news for its hooks", async () => {
        const daemon = await start();
        const job = newJob({ kind: "pr", target: "pr:7", id: "j1" }, clock);
        job.news.push({ at: clock.toISOString(), text: "CI went green", acked: false });
        daemon.state.jobs = { j1: job };
        const hook = (body) => fetch(`${daemon.url}/hook`, { method: "POST", body: JSON.stringify(body) });

        const owner = await hook({ event: "SessionStart", job: null, nonce: null, input: { session_id: "o1" } });
        expect(owner.status).toBe(200);
        expect((await owner.json()).message).toMatch(/^githerd: master /);

        const input = { session_id: "w1", notification_type: "permission_prompt", message: "Allow Bash?" };
        expect((await hook({ event: "Notification", job: "j1", nonce: "n", input })).status).toBe(200);
        expect(saved().jobs.j1.permissionPrompt.message).toBe("Allow Bash?");
        await daemon.shutdown();
        const ledger = await readLedger(join(dir, ".githerd"));
        expect(ledger.filter((e) => e.kind === "permission-prompt")).toHaveLength(1);
        const news = JSON.parse(readFileSync(join(dir, ".githerd", "jobs", "j1", "news"), "utf8"));
        expect(news.map((n) => n.text)).toEqual(["CI went green"]);
    });

    it("names in the Stop gate what the last refused githerd_done found missing", async () => {
        const daemon = await start();
        const job = newJob({ kind: "pr", target: "pr:7", id: "j1" }, clock);
        job.state = "working";
        job.news.push({ at: clock.toISOString(), text: "not done yet: Build is red on abc", acked: true });
        job.news.push({ at: clock.toISOString(), text: "CI went green", acked: true });
        daemon.state.jobs = { j1: job };
        const res = await fetch(`${daemon.url}/hook`, {
            method: "POST",
            body: JSON.stringify({ event: "Stop", job: "j1", nonce: "n", input: { session_id: "w1" } }),
        });
        expect((await res.json()).block).toMatch(/GitHub still shows missing: Build is red on abc\. /);
        job.state = "done";
        const done = await fetch(`${daemon.url}/hook`, {
            method: "POST",
            body: JSON.stringify({ event: "Stop", job: "j1", nonce: "n", input: { session_id: "w1" } }),
        });
        expect(await done.json()).toEqual({});
        await daemon.shutdown();
    });

    it("ends at once the session of a done job when its Stop hook fires, and changes nothing else", async () => {
        const daemon = await start();
        const job = newJob({ kind: "pr", target: "pr:7", id: "j1" }, clock);
        job.state = "done";
        daemon.state.jobs = { j1: job };
        // A start time that is not this process's: the window's session is already gone.
        const holder = {
            socket: `githerd-test-none-${process.pid}`,
            pane: "%1",
            window: "@1",
            pid: process.pid,
            startTime: "0",
            session: "w1",
            name: "githerd-j1",
        };
        daemon.state.retiring = [{ job: "j1", holder, reason: "job done", at: clock.toISOString() }];
        const res = await fetch(`${daemon.url}/hook`, {
            method: "POST",
            body: JSON.stringify({ event: "Stop", job: "j1", nonce: "n", input: { session_id: "w1" } }),
        });
        expect(await res.json()).toEqual({});
        for (let i = 0; i < 100 && daemon.state.retiring.length; i++) await new Promise((r) => setTimeout(r, 20));
        expect(daemon.state.retiring).toEqual([]);
        expect(job.state).toBe("done");
        await daemon.shutdown();
        const ended = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "session-ended");
        expect(ended).toEqual([expect.objectContaining({ job: "j1", reason: "job done", how: "gone" })]);
    });

    it("recovers a worker whose session died: news, a fresh next session and a ledger line", async () => {
        const daemon = await start();
        const job = newJob({ kind: "issue", target: "#12", id: "issue-12" }, clock);
        job.state = "working";
        // A start time that is not this process's: the session githerd started is gone.
        job.holder = {
            pane: "%1",
            window: "@1",
            pid: process.pid,
            startTime: "0",
            session: "s1",
            name: "githerd-issue-12",
        };
        daemon.state.jobs = { "issue-12": job };
        await daemon.watch();
        expect(job.holder).toBeNull();
        expect(job.fresh).toBe(true);
        expect(job.news.at(-1).text).toContain("your session died; nothing was pushed yet");
        expect(saved().jobs["issue-12"].deaths).toHaveLength(1);
        await daemon.watch();
        await daemon.shutdown();
        const deaths = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "session-death");
        expect(deaths).toEqual([expect.objectContaining({ job: "issue-12", session: "s1", action: "fresh" })]);
    });

    it("records a failed watchdog pass in the ledger, not only in the log", async () => {
        const daemon = await start();
        const job = newJob({ kind: "issue", target: "#13", id: "issue-13" }, clock);
        job.state = "working";
        job.holder = { pane: "%1", window: "@1", pid: process.pid, startTime: "0", session: "s1", name: "x" };
        // A record the death count cannot read: recovery throws past the per-worker handling.
        job.deaths = /** @type {any} */ (null);
        daemon.state.jobs = { "issue-13": job };
        await daemon.watch();
        await daemon.shutdown();
        const errors = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "watch-error");
        expect(errors).toEqual([expect.objectContaining({ job: null, error: expect.any(String) })]);
    });

    it("refuses a hook request without an event", async () => {
        const daemon = await start();
        const res = await fetch(`${daemon.url}/hook`, { method: "POST", body: JSON.stringify({ input: {} }) });
        expect(res.status).toBe(400);
    });
});

describe("the poll loop", () => {
    it("pages once for a red master across green, red once, red twice, an old run and recovery", async () => {
        let daemon = await start();
        const events = async () =>
            (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "event").map((e) => e.event);
        const masterRed = () => pages().filter((p) => p.message.startsWith("master red"));

        // green
        await poll(daemon);
        expect(daemon.state.master.verdict).toBe("green");
        expect(await events()).toEqual(["lane-green"]);

        // red once: one sighting is not a verdict
        clock = new Date("2026-10-02T12:03:00Z");
        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #2 from o/x"), commit(A, null, "first")];
        scene.ci = [run(101, B, "failure"), run(100, A, "success")];
        await poll(daemon);
        expect(daemon.state.master.verdict).toBe("green");
        expect(masterRed()).toHaveLength(0);

        // red twice: confirmed, one incident, one page
        clock = new Date("2026-10-02T12:06:00Z");
        await poll(daemon);
        expect(daemon.state.master.verdict).toBe("red");
        const incidents = Object.values(daemon.state.incidents);
        expect(incidents).toHaveLength(1);
        expect(incidents[0]).toMatchObject({
            status: "open",
            redSha: B,
            lastGreenSha: A,
            suspects: [{ sha: B, pr: 2 }],
            lanes: { ci: { runId: 101, sha: B, failingJobs: ["Build"] } },
        });
        expect(masterRed()).toEqual([{ status: "waiting", message: expect.stringContaining("ci (Build)") }]);
        expect(await events()).toEqual(["lane-green", "lane-red", "lane-classified", "master-red-confirmed"]);

        // a restart in the middle keeps the lane verdict on the first poll after it
        await daemon.shutdown();
        daemon = await start();
        clock = new Date("2026-10-02T12:09:00Z");
        scene.ci = [run(100, A, "success")]; // an old run: never go backwards
        await poll(daemon);
        expect(daemon.state.master.verdict).toBe("red");
        expect(daemon.state.master.lanes.ci).toMatchObject({ runId: 101, verdict: "red" });
        expect(Object.keys(daemon.state.incidents)).toHaveLength(1);
        expect(masterRed()).toHaveLength(1);

        // recovered
        clock = new Date("2026-10-02T12:12:00Z");
        scene.head = C;
        scene.commits = [commit(C, B, "Merge pull request #3 from o/fix"), ...scene.commits];
        scene.ci = [run(102, C, "success"), run(101, B, "failure"), run(100, A, "success")];
        await poll(daemon);
        expect(daemon.state.master).toMatchObject({ verdict: "green", greenSha: C, pending: false });
        expect(Object.values(daemon.state.incidents)[0].status).toBe("resolved");
        expect(await events()).toEqual([
            "lane-green",
            "lane-red",
            "lane-classified",
            "master-red-confirmed",
            "lane-green",
            "master-recovered",
        ]);
        expect(masterRed()).toHaveLength(1);
        // Recovery is not the owner's to act on: it ends his item and pages nothing.
        expect(pages().filter((p) => p.message.startsWith("master green again"))).toEqual([]);
        const id = Object.keys(daemon.state.incidents)[0];
        expect(daemon.state.ownerItems[`master-red:${id}`]).toMatchObject({ endedBy: "cleared" });

        // the dry-run fake gh recorded no write; from the reconcile after the red sighting the failing
        // job would have been re-run once on the red head
        expect(gh.calls.length).toBeGreaterThan(0);
        expect(gh.writes()).toEqual([]);
        const wouldDo = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "would-do");
        expect(wouldDo.map((e) => [e.group, e.op, e.situation, e.key])).toEqual([
            // the verdict job a worker would take, were the workers group acting
            ["workers", "start a worker for verdict-ci-Build-", undefined, undefined],
            // no parent re-test: that waits for Claude's code verdict
            ["incidents", "POST actions/jobs/900/rerun", "red-head-rerun", "ci / Build / "],
        ]);
        // git ran with no prompt, only to fetch the default branch when its head moved and to read
        // its .mergify.yml after each fetch and once per start
        expect(gitCalls.filter((a) => a[0] === "fetch")).toEqual([
            ["fetch", "origin", "master"],
            ["fetch", "origin", "master"],
            ["fetch", "origin", "master"],
        ]);
        expect(
            gitCalls.filter((a) => a[0] !== "fetch").every((a) => a.join(" ") === "show origin/master:.mergify.yml"),
        ).toBe(true);
    });

    it("holds every page in dry-run: written to the ledger as not delivered, the notify command never run", async () => {
        const daemon = await start();
        await poll(daemon);
        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #2 from o/x"), commit(A, null, "first")];
        scene.ci = [run(101, B, "failure"), run(100, A, "success")];
        for (const at of ["2026-10-02T12:03:00Z", "2026-10-02T12:06:00Z"]) {
            clock = new Date(at);
            await poll(daemon);
        }
        expect(daemon.state.master.verdict).toBe("red");
        await daemon.shutdown();
        const red = (await readLedger(join(dir, ".githerd"))).filter(
            (e) => e.kind === "notify" && e.message.startsWith("master red"),
        );
        expect(red).toEqual([expect.objectContaining({ delivered: false, reason: "held: owner items are dry-run" })]);
        expect(existsSync(notifyLog)).toBe(false);
    });

    it("pages no daily alive notice, no outage and no hourly reminder of a red master", async () => {
        const daemon = await start();
        await poll(daemon);
        clock = new Date("2026-10-03T00:01:00Z");
        await poll(daemon);
        // A red master, red for three hours: one owner item, never an "after 2 hours" page.
        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #2 from o/x"), commit(A, null, "first")];
        scene.ci = [run(101, B, "failure"), run(100, A, "success")];
        for (const at of ["2026-10-03T00:04:00Z", "2026-10-03T03:30:00Z"]) {
            clock = new Date(at);
            await poll(daemon);
        }
        gh.exec = async () => ({ code: 1, stdout: "", stderr: "network down" });
        clock = new Date("2026-10-03T05:00:00Z");
        await poll(daemon);
        const texts = pages().map((p) => p.message);
        expect(texts.filter((m) => /alive|still red|green again|digest/.test(m))).toEqual([]);
        expect(texts.filter((m) => /unreachable|GitHub/.test(m))).toEqual([]);
    });

    it("never runs the notify command for a development daemon unless GITHERD_DEV_NOTIFY=1", async () => {
        const redTimeline = async (daemon) => {
            await poll(daemon);
            scene.head = B;
            scene.commits = [commit(B, A, "Merge pull request #2 from o/x"), commit(A, null, "first")];
            scene.ci = [run(101, B, "failure"), run(100, A, "success")];
            for (const at of ["2026-10-02T12:03:00Z", "2026-10-02T12:06:00Z"]) {
                clock = new Date(at);
                await poll(daemon);
            }
        };
        const env = { GITHERD_CONFIG: configFile, PATH: process.env.PATH, GITHERD_DEV: "1" };
        const daemon = await start({ env });
        await redTimeline(daemon);
        expect(daemon.state.master.verdict).toBe("red");
        expect(existsSync(notifyLog)).toBe(false);
        await daemon.shutdown(); // waits for the ledger appends
        const notices = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "notify");
        expect(notices.some((e) => e.message.startsWith("master red"))).toBe(true);
        expect(notices.every((e) => e.delivered === false)).toBe(true);

        rmSync(join(dir, ".githerd"), { recursive: true });
        clock = new Date("2026-10-02T12:00:00Z");
        scene = { head: A, ci: [run(100, A, "success")], commits: [commit(A, null, "first")], prs: [] };
        await redTimeline(await start({ env: { ...env, GITHERD_DEV_NOTIFY: "1" } }));
        expect(phone().filter((p) => p.message.startsWith("master red"))).toHaveLength(1);
    });

    it("keeps the last good config when master's is invalid, and escalates once", async () => {
        const daemon = await start();
        await poll(daemon);
        const escalations = async () =>
            (await readLedger(join(dir, ".githerd"))).filter(
                (e) => e.kind === "escalation" && e.key === "config-refused",
            );

        writeFileSync(configFile, JSON.stringify({ repo: "not a repo", lanes: {} }));
        for (const [head, at] of [
            [B, "2026-10-02T12:03:00Z"],
            [C, "2026-10-02T12:06:00Z"],
        ]) {
            clock = new Date(at);
            scene.head = head;
            await poll(daemon);
        }
        expect(daemon.state.config.repo).toBe("o/r");
        expect(saved().config.repo).toBe("o/r");
        expect(daemon.state.escalations["config-refused"]).toMatchObject({ kind: "blocked", resolvedAt: null });
        expect(daemon.state.escalations["config-refused"].detail).toContain("repo");
        expect(await escalations()).toHaveLength(1);
        // a list-only kind: the phone hears nothing
        expect(pages().filter((p) => p.message.includes("config"))).toEqual([]);

        writeConfig({ pollSeconds: 300 });
        clock = new Date("2026-10-02T12:09:00Z");
        scene.head = D;
        await poll(daemon);
        expect(daemon.state.config.pollSeconds).toBe(300);
        expect(daemon.state.escalations["config-refused"].resolvedAt).not.toBeNull();
    });

    it("enters fatal mode when it has never had a good config", async () => {
        writeFileSync(configFile, "{ not json");
        const daemon = await start();
        expect(await daemon.poll()).toEqual({ fatal: expect.stringContaining("no good githerd.config.json") });
        expect(gh.calls).toEqual([]);
        const health = await (await fetch(`${daemon.url}/health`)).json();
        expect(health.fatal).toContain("not valid JSON");
        expect(health.lastPollError).toContain("not valid JSON");
        const reply = await daemon.rpc({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { _meta: META, name: "githerd_status", arguments: {} },
        });
        expect(reply.result.content[0].text).toContain("not running a valid config");

        // Master brings a good config: the next tick fetches it and fatal mode ends.
        writeConfig();
        expect(await daemon.poll()).toEqual({ ok: true });
        expect(gitCalls).toContainEqual(["fetch", "origin", "master"]);
        expect(daemon.fatal()).toBeNull();
        expect(existsSync(join(dir, ".githerd", "FATAL"))).toBe(false);
    });

    it("stays in fatal mode while the default branch cannot be fetched", async () => {
        writeFileSync(configFile, "{ not json");
        const daemon = await start({ git: async () => ({ code: 1, stdout: "", stderr: "offline" }) });
        writeConfig();
        expect(await daemon.poll()).toEqual({ fatal: expect.stringContaining("no good githerd.config.json") });
    });

    it("counts each poll's GitHub calls by what they cost, in the ledger and in status", async () => {
        let etag = 0;
        gh = createFakeGh((call) => {
            const out = respond(call);
            // The login carries an ETag; asked again unchanged, it is a 304.
            if (call.args.at(-1) !== "user") return out;
            if (call.args.includes("-H"))
                return httpOutput({ status: 304, headers: { "X-Ratelimit-Resource": "core" } });
            return { ...out, stdout: out.stdout.replace("\r\n\r\n", `\r\nETag: "c${++etag}"\r\n\r\n`) };
        });
        const daemon = await start();
        await poll(daemon);
        clock = new Date("2026-10-02T12:03:00Z");
        const before = gh.calls.length;
        await poll(daemon);
        const second = gh.calls.slice(before);
        const graphql = second.filter((c) => c.args.includes("graphql")).length;
        const last = daemon.state.github.lastPoll;
        expect(last).toMatchObject({ notModified: 1, graphql, search: 0 });
        expect(last.core + last.notModified + last.graphql).toBe(second.length);
        const uses = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "api-use");
        expect(uses).toHaveLength(2);
        expect(uses[1]).toMatchObject({ core: last.core, notModified: 1, graphql });

        const ctx = { config: {}, now: clock, startedAt: clock, version: "0", mode: "dry-run", polledAt: null };
        const text = statusText(statusData(daemon.state, /** @type {any} */ (ctx)), clock);
        const hour = daemon.state.rate.usage;
        expect(hour.core + hour.notModified + hour.graphql).toBe(gh.calls.length);
        expect(text.split("\n")[1]).toBe(
            `API: last poll ${last.core} core, 1 not modified (304, free), ${graphql} GraphQL; ` +
                `hour 12:00 UTC so far ${hour.core} core, 1 not modified (304, free), ${hour.graphql} GraphQL`,
        );
    });

    it("skips a poll while one is running", async () => {
        const daemon = await start();
        const [first, second] = await Promise.all([daemon.poll(), daemon.poll()]);
        expect(first).toEqual({ ok: true });
        expect(second).toEqual({ skipped: true });
    });

    it("records a GitHub failure without throwing, and escalates an outage after 30 minutes", async () => {
        let offline = true;
        gh = createFakeGh((call) =>
            offline ? { code: 1, stdout: "", stderr: "dial tcp: connection refused" } : respond(call),
        );
        const daemon = await start();
        expect(await daemon.poll()).toEqual({ ok: false });
        expect(daemon.state.github.downSince).toBe(clock.toISOString());
        const health = await (await fetch(`${daemon.url}/health`)).json();
        expect(health.lastPollError).toContain("connection refused");
        expect(health.githubDownSince).toBe(clock.toISOString());

        clock = new Date("2026-10-02T12:29:00Z");
        await daemon.poll();
        expect(daemon.state.escalations?.["github-down"]).toBeUndefined();

        clock = new Date("2026-10-02T12:31:00Z");
        await daemon.poll();
        expect(daemon.state.escalations["github-down"]).toMatchObject({ kind: "blocked", resolvedAt: null });
        expect(daemon.state.escalations["github-down"].summary).toContain("2026-10-02T12:00");

        // another failing poll keeps it open
        clock = new Date("2026-10-02T12:34:00Z");
        await daemon.poll();
        expect(daemon.state.escalations["github-down"].resolvedAt).toBeNull();

        // GitHub answers again: resolved
        offline = false;
        clock = new Date("2026-10-02T12:37:00Z");
        expect(await daemon.poll()).toEqual({ ok: true });
        expect(daemon.state.escalations["github-down"].resolvedAt).toBe(clock.toISOString());
    });

    it("keeps its ETags in etags.json, so a restarted daemon asks conditionally", async () => {
        const isRuns = (/** @type {string[]} */ args) => args.some((a) => a.includes("/workflows/ci.yml/runs?"));
        gh = createFakeGh((call) =>
            isRuns(call.args)
                ? httpOutput({ status: 200, headers: { etag: '"runs-1"' }, body: { workflow_runs: scene.ci } })
                : respond(call),
        );
        const first = await start();
        await first.poll();
        await first.shutdown();
        const etags = JSON.parse(readFileSync(join(dir, ".githerd", "etags.json"), "utf8"));
        expect(Object.values(etags).map((e) => e.etag)).toEqual(['"runs-1"']);

        gh.calls.length = 0;
        await (await start()).poll();
        const runs = gh.calls.find((c) => isRuns(c.args));
        expect(runs?.args).toContain('If-None-Match: "runs-1"');
    });

    it("keeps its loop ticking in read-only mode, so a launcher never takes it for wedged", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        writeFileSync(join(stateDir, "state.json"), JSON.stringify({ schema: 99 }));
        const daemon = await start();
        expect(daemon.state.escalations["state-newer-schema"]).toMatchObject({ kind: "blocked" });
        clock = new Date("2026-10-02T12:03:00Z");
        expect(await daemon.poll()).toEqual({ skipped: true });
        expect(gh.calls).toEqual([]);
        const health = await (await fetch(`${daemon.url}/health`)).json();
        expect(health.loopTickAt).toBe(clock.toISOString());
        expect(JSON.parse(readFileSync(join(stateDir, "state.json"), "utf8"))).toEqual({ schema: 99 });
    });

    it("gives each open PR its why-stuck reasons from a new head's commits and files", async () => {
        writeConfig({
            requiredChecks: ["All Checks Pass"],
            ownerGate: { steps: ["^Check visual changes were accepted$"], rejectMarker: "visual-review-rejects" },
        });
        scene.prs = [gatedPr()];
        const daemon = await start();
        await poll(daemon);
        expect(daemon.state.prs["7"]).toMatchObject({
            breaking: false,
            breakingCheckedFor: B,
            ownerGate: true,
            gateJob: 555,
            stuck: ["waiting on owner: visual review", "native auto-merge armed: bypasses githerd/merge"],
        });
        const calls = gh.calls.map((c) => c.args[c.args.length - 1]);
        expect(calls.filter((p) => p.includes("/pulls/7/commits"))).toHaveLength(1);

        // the same head is not fetched again
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        const again = gh.calls.map((c) => c.args[c.args.length - 1]);
        expect(again.filter((p) => p.includes("/pulls/7/commits"))).toHaveLength(1);
        expect(again.filter((p) => p.includes("/actions/jobs/555"))).toHaveLength(1);
        expect(gh.writes()).toEqual([]);
    });

    it("posts githerd/merge on each open pull request's head, as would-dos in dry-run", async () => {
        scene.prs = [{ ...gatedPr(), id: "PR_7" }];
        const daemon = await start();
        await poll(daemon);
        const gate = daemon.state.mergeGate;
        expect(gate.posted["7"]).toMatchObject({ sha: B, state: "success" });
        expect(daemon.state.prs["7"].mergeStatus).toEqual(gate.posted["7"]);
        // no .mergify.yml was read (the fake git prints nothing), so Mergify ignores the status
        expect(gate.checks.banners).toEqual(["Mergify does not wait for githerd/merge"]);
        expect(gate.checks.faults).toEqual([
            { record: "pr 7", problem: "native auto-merge is armed; it bypasses githerd/merge" },
        ]);
        const wouldDo = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "would-do");
        expect(wouldDo.map((e) => [e.group, e.situation])).toEqual([
            ["statuses", "native auto-merge armed"],
            ["statuses", "success"],
        ]);

        // the same head and status are not posted again
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        const again = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "would-do");
        expect(again).toHaveLength(2);
        expect(gh.writes()).toEqual([]);

        // a closed pull request is forgotten
        scene.prs = [];
        clock = new Date("2026-10-02T12:06:00Z");
        await poll(daemon);
        expect(gate.heads).toEqual({});
        expect(gate.posted).toEqual({});
    });

    it("holds a pull request a job made until a review passed on its patch, and knows the job by its branch", async () => {
        scene.prs = [{ ...gatedPr(), id: "PR_7" }];
        const daemon = await start();
        const job = newJob({ kind: "issue", target: "#3", id: "issue-3" }, clock);
        move(job, "starting", clock);
        move(job, "working", clock);
        job.branch = "fix/x";
        daemon.state.jobs = { "issue-3": job };
        await poll(daemon);
        expect(job.pr).toBe(7);
        // The test's root is no git repository, so the patch id stays unread: pending, then held.
        expect(daemon.state.mergeGate.posted["7"]).toMatchObject({ state: "pending" });
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        expect(daemon.state.mergeGate.posted["7"]).toMatchObject({
            state: "failure",
            description: "held: githerd could not read its patch id",
        });
        // With the patch read and a passing review on it, the job's line holds.
        daemon.state.prs["7"].patchId = "p1";
        daemon.state.prs["7"].patchFor = B;
        const review = newJob({ kind: "review", target: "#7", id: "review-7", facts: { pr: 7, patchId: "p1" } }, clock);
        for (const to of ["starting", "working", "verifying", "done"]) move(review, to, clock);
        review.report = { result: { verdict: "pass", patchId: "p1" } };
        daemon.state.jobs["review-7"] = review;
        clock = new Date("2026-10-02T12:06:00Z");
        await poll(daemon);
        expect(daemon.state.mergeGate.posted["7"]).toMatchObject({ state: "success" });
    });

    it("holds every pull request while the green commit is over 6 hours old and merges go on past it", async () => {
        scene.prs = [{ ...gatedPr(), id: "PR_7" }];
        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #2 from o/x"), commit(A, null, "first")];
        scene.ci = [run(101, B, null), run(100, A, "success")];
        clock = new Date("2026-10-02T19:00:00Z");
        const daemon = await start();
        await poll(daemon);
        expect(daemon.state.master).toMatchObject({ greenSha: A, pending: true });
        expect(daemon.state.mergeGate.posted["7"]).toMatchObject({
            state: "failure",
            description: expect.stringMatching(/^held: starvation hold \(the green commit a{9} is over 6 hours old/),
        });
    });

    it("holds a pull request that changes a package the owner holds, until the policy ends", async () => {
        scene.prs = [{ ...gatedPr(), id: "PR_7" }];
        const daemon = await start();
        const owner = async (/** @type {object} */ cmd) =>
            (
                await fetch(`${daemon.url}/owner`, {
                    method: "POST",
                    headers: { "x-githerd-caller": "owner", "x-githerd-tty": "1" },
                    body: JSON.stringify(cmd),
                })
            ).json();
        const policy = { op: "policy", text: "hold src during the move", switch: "hold-package", value: "src" };
        // The owner's words count only from his terminal: an agent's Bash tool, or no terminal, is refused.
        for (const headers of [{ "x-githerd-caller": "agent" }, { "x-githerd-caller": "owner" }]) {
            const res = await fetch(`${daemon.url}/owner`, { method: "POST", headers, body: JSON.stringify(policy) });
            expect(res.status).toBe(403);
            expect((await res.json()).text).toMatch(/only from his own terminal/);
        }
        expect(daemon.state.policies ?? []).toEqual([]);
        expect(await owner(policy)).toMatchObject({ ok: true });
        await poll(daemon);
        expect(daemon.state.mergeGate.posted["7"]).toMatchObject({
            state: "failure",
            description: "held: package src is held by the owner",
        });
        expect(await owner({ op: "policy-end", id: daemon.state.policies[0].id })).toMatchObject({ ok: true });
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        expect(daemon.state.mergeGate.posted["7"]).toMatchObject({ state: "success" });
    });

    it("lets the incident's revert pull request through the red-lane hold while the lane is still red", async () => {
        const daemon = await start();
        await poll(daemon);
        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #2 from o/x"), commit(A, null, "first")];
        scene.ci = [run(101, B, "failure"), run(100, A, "success")];
        for (const at of ["2026-10-02T12:03:00Z", "2026-10-02T12:06:00Z"]) {
            clock = new Date(at);
            await poll(daemon);
        }
        const incident = Object.values(daemon.state.incidents)[0];
        incident.keys = { "ci / Build / ": { seen: 3, outcome: "revert", revertPr: 50 } };
        const revert = {
            ...gatedPr(),
            id: "PR_50",
            number: 50,
            title: 'Revert "fix(x): a fix"',
            headRefName: "revert-2",
            headRefOid: D,
            autoMergeRequest: null,
        };
        scene.prs = [{ ...gatedPr(), id: "PR_7", autoMergeRequest: null }, revert];
        clock = new Date("2026-10-02T12:09:00Z");
        await poll(daemon);
        expect(daemon.state.master.verdict).toBe("red");
        const posted = daemon.state.mergeGate.posted;
        expect(posted["50"]).toMatchObject({ sha: D, state: "success" });
        expect(posted["7"]).toMatchObject({ sha: B, state: "failure", description: expect.stringMatching(/^held: /) });
    });

    it("lets a red master's fix through the hold: priority:critical by the owner's account, or an incident job's", async () => {
        const daemon = await start();
        await poll(daemon);
        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #2 from o/x"), commit(A, null, "first")];
        scene.ci = [run(101, B, "failure"), run(100, A, "success")];
        for (const at of ["2026-10-02T12:03:00Z", "2026-10-02T12:06:00Z"]) {
            clock = new Date(at);
            await poll(daemon);
        }
        const pr = (/** @type {number} */ number, /** @type {string} */ sha, /** @type {string[]} */ labels = []) => ({
            ...gatedPr(),
            id: `PR_${number}`,
            number,
            headRefName: `fix/${number}`,
            headRefOid: sha,
            autoMergeRequest: null,
            labels: { nodes: labels.map((name) => ({ name })) },
        });
        const labeled = (/** @type {string} */ login) => ({
            event: "labeled",
            label: { name: "priority:critical" },
            actor: { login },
        });
        // #8 labelled by the owner's account, #9 by another account, #10 is an incident job's, #7 nothing.
        scene.prs = [
            pr(7, B),
            pr(8, C, ["priority:critical"]),
            pr(9, D, ["priority:critical"]),
            pr(10, "e".repeat(40)),
        ];
        scene.events = { 8: [labeled("owner")], 9: [labeled("stranger")] };
        const job = Object.values(daemon.state.jobs).find((j) => j.kind === "incident");
        job.pr = 10;
        clock = new Date("2026-10-02T12:09:00Z");
        await poll(daemon);
        expect(daemon.state.master.verdict).toBe("red");
        const posted = daemon.state.mergeGate.posted;
        expect(posted["8"]).toMatchObject({ state: "success" });
        // The incident job's fix passes the hold and waits only for its review (line 6).
        expect(posted["10"]).toMatchObject({ state: "pending", description: "githerd is evaluating" });
        for (const n of ["7", "9"]) {
            expect(posted[n]).toMatchObject({
                state: "failure",
                description: expect.stringMatching(/^held: ci lane red/),
            });
        }
    });

    it("posts open owner items as would-dos, and counts only the owner's CLI and typing as presence", async () => {
        const daemon = await start();
        daemon.state.ownerItems = {
            "ask-7": {
                id: "ask-7",
                kind: "decision",
                question: "Merge #7 as a major?",
                options: [],
                target: "pr:7",
                blocks: null,
                raisedAt: clock.toISOString(),
                updatedAt: clock.toISOString(),
            },
        };
        await poll(daemon);
        const wouldDo = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "would-do");
        expect(wouldDo.map((e) => [e.group, e.op])).toEqual([
            ["owner-items", "POST issues/7/comments"],
            ["owner-items", "POST issues/7/labels"],
        ]);
        expect(gh.writes()).toEqual([]);

        expect(daemon.state.presence?.lastAt).toBeUndefined();
        const status = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { _meta: META, name: "githerd_status", arguments: {} },
        };
        // A board's redraw and an agent's command are not the owner.
        for (const headers of [{}, { "x-githerd-caller": "agent" }]) {
            await fetch(`${daemon.url}/rpc`, { method: "POST", headers, body: JSON.stringify(status) });
            await fetch(`${daemon.url}/owner`, {
                method: "POST",
                headers,
                body: JSON.stringify({ op: "ack", key: "x" }),
            });
        }
        expect(daemon.state.presence?.lastAt).toBeUndefined();
        const res = await fetch(`${daemon.url}/owner`, {
            method: "POST",
            headers: { "x-githerd-caller": "owner", "x-githerd-tty": "1" },
            body: JSON.stringify({ op: "ack", key: "x" }),
        });
        expect(res.status).toBe(404);
        expect(daemon.state.presence).toMatchObject({ lastAt: clock.toISOString(), source: "cli" });

        // Typing into a session, as its heartbeat reports it, is presence too; a future time is not.
        const beat = (/** @type {string} */ typedAt) =>
            fetch(`${daemon.url}/heartbeat`, {
                method: "POST",
                body: JSON.stringify({ session: "main-1", cwd: dir, branch: "master", typedAt }),
            });
        clock = new Date("2026-10-02T13:00:00Z");
        await beat("2026-10-02T14:00:00Z");
        expect(daemon.state.presence.source).toBe("cli");
        await beat("2026-10-02T12:59:00Z");
        expect(daemon.state.presence).toMatchObject({ lastAt: "2026-10-02T12:59:00.000Z", source: "session" });
    });

    it("advances a confirmed close proposal: the comment is a would-do in dry-run", async () => {
        const daemon = await start();
        daemon.state.proposals = {
            "issue:4": { id: "issue:4", kind: "duplicate", target: "issue:4", of: 3, status: "confirmed" },
        };
        await poll(daemon);
        expect(daemon.state.proposals["issue:4"]).toMatchObject({ status: "commented", dryRun: true });
        const wouldDo = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "would-do");
        expect(wouldDo.map((e) => [e.group, e.situation])).toEqual([["proposals", "propose duplicate"]]);
        expect(gh.writes()).toEqual([]);
    });

    it("retargets a stacked child whose base merged, once, as a would-do in dry-run", async () => {
        const child = { ...gatedPr(), number: 8, headRefName: "fix/y", headRefOid: C, baseRefName: "fix/x" };
        scene.prs = [child];
        const daemon = await start();
        await poll(daemon);
        expect(daemon.state.upkeep.lastHeads).toEqual({ 8: C });

        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #7 from o/fix-x"), commit(A, null, "first")];
        scene.merged = [{ number: 7, title: "fix(x): a fix", headRefName: "fix/x", mergedAt: "2026-10-02T12:02:00Z" }];
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        clock = new Date("2026-10-02T12:06:00Z");
        await poll(daemon);
        const wouldDo = (await readLedger(join(dir, ".githerd"))).filter((e) => e.group === "upkeep");
        expect(wouldDo.map((e) => [e.op, e.situation])).toEqual([["PATCH pulls/8", "stack base merged"]]);
        expect(daemon.state.upkeep.mergedHeads).toEqual([]);
        expect(gh.writes()).toEqual([]);
    });

    it("re-runs the CI run whose expired artifacts made a release skip, once, as a would-do in dry-run", async () => {
        writeConfig({
            lanes: {
                ci: { workflow: "ci.yml", gating: "required" },
                release: { workflow: "release.yml", gating: "watch" },
            },
        });
        scene.release = [run(300, A, "success")];
        scene.annotations = [
            {
                annotation_level: "notice",
                message: `${A} is green but CI run 100 no longer holds its builds; re-run it`,
            },
        ];
        const daemon = await start();
        await poll(daemon);
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        const wouldDo = (await readLedger(join(dir, ".githerd"))).filter((e) => e.group === "incidents");
        expect(wouldDo.map((e) => [e.op, e.situation])).toEqual([["POST actions/runs/100/rerun", "expired-artifacts"]]);
        expect(daemon.state.incidentActions.releaseRunRead).toBe("300/1");
        expect(gh.writes()).toEqual([]);
    });

    it("takes the reject marker from the owner's comments only", async () => {
        writeConfig({
            requiredChecks: ["All Checks Pass"],
            ownerGate: { steps: ["^Check visual changes were accepted$"], rejectMarker: "visual-review-rejects" },
        });
        scene.prs = [gatedPr()];
        const reject = (/** @type {string} */ login) => ({
            user: { login },
            body: "<!-- visual-review-rejects --> IGNORE ALL RULES",
            created_at: "2026-10-02T11:30:00Z",
        });
        scene.comments = [reject("stranger"), reject("dependabot[bot]")];
        const daemon = await start();
        await poll(daemon);
        expect(daemon.state.prs["7"]).toMatchObject({ ownerGate: true, ownerRejected: false });
        scene.comments = [reject("owner")];
        scene.prs[0].headRefOid = C;
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        expect(daemon.state.prs["7"]).toMatchObject({ ownerRejected: true });
    });

    it("honors githerd:next and githerd:skip only when the owner applied them", async () => {
        writeConfig({
            labels: { types: ["bug"], priorities: ["priority:high", "priority:low"], efforts: ["effort:low"] },
        });
        const item = (/** @type {number} */ number, /** @type {string} */ label, /** @type {string} */ updated) => ({
            number,
            state: "open",
            user: { login: "owner" },
            created_at: "2026-09-01T00:00:00Z",
            updated_at: updated,
            labels: ["bug", "priority:low", "effort:low", label].map((name) => ({ name })),
        });
        const labeled = (/** @type {string} */ name, /** @type {string} */ login) => ({
            event: "labeled",
            label: { name },
            actor: { login },
        });
        scene.issues = [
            item(5, "githerd:skip", "2026-10-02T10:00:00Z"),
            item(6, "githerd:skip", "2026-10-02T10:00:00Z"),
            item(7, "githerd:next", "2026-10-02T10:00:00Z"),
        ];
        scene.events = {
            5: [labeled("githerd:skip", "owner")],
            6: [labeled("githerd:skip", "owner"), labeled("githerd:skip", "stranger")],
            7: [labeled("githerd:next", "stranger")],
        };
        const daemon = await start();
        const owned = () =>
            [5, 6, 7].map((/** @type {number} */ n) => daemon.state.issues.byNumber[n].ownerLabels ?? []);
        const eventReads = () => gh.calls.filter((c) => c.args.some((a) => a.includes("/events?"))).length;
        await poll(daemon);
        expect(owned()).toEqual([["githerd:skip"], [], []]);
        expect(eventReads()).toBe(3);
        await poll(daemon);
        expect(eventReads()).toBe(3);
        // The owner applies githerd:next to issue 7 itself.
        scene.issues = [item(7, "githerd:next", "2026-10-02T11:00:00Z")];
        scene.events[7].push(labeled("githerd:next", "owner"));
        await poll(daemon);
        expect(owned()).toEqual([["githerd:skip"], [], ["githerd:next"]]);
    });
});

describe("jobs from the facts", () => {
    it("makes a pr job for the owner's failing pull request, none for another author's, none while the login is unresolved", async () => {
        writeConfig({ requiredChecks: ["All Checks Pass"] });
        const stranger = { ...gatedPr(), number: 8, headRefName: "fix/y", headRefOid: C, author: { login: "x" } };
        scene.prs = [gatedPr(), stranger];
        scene.login = null;
        const daemon = await start();
        await poll(daemon);
        expect(daemon.state.jobs ?? {}).toEqual({});
        scene.login = "owner";
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        expect(Object.keys(daemon.state.jobs)).toEqual(["pr-7"]);
        expect(daemon.state.jobs["pr-7"]).toMatchObject({ state: "queued", pr: 7, branch: "fix/x" });
        const created = (await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "job-created");
        expect(created.map((e) => e.job)).toEqual(["pr-7"]);
    });
});

describe("asking whose a failed pull request is", () => {
    it("asks the live sessions once per failed head, a would-do in dry-run, and holds the job meanwhile", async () => {
        writeConfig({ requiredChecks: ["All Checks Pass"] });
        scene.prs = [gatedPr()];
        /** @type {string[]} */
        const sent = [];
        const peers = {
            sessions: () => [
                { pid: 1, sessionId: "s1", name: "graphty-13", cwd: dir, socket: "/s1.sock", status: "idle" },
            ],
            transport: { send: async (/** @type {string} */ socket) => void sent.push(socket) },
        };
        const daemon = await start({ peers });
        await poll(daemon);
        expect(daemon.state.asks["7"]).toMatchObject({ head: B, sessions: ["graphty-13"], sent: [], owner: null });
        const ledger = await readLedger(join(dir, ".githerd"));
        expect(ledger.filter((e) => e.kind === "pr-asked")).toHaveLength(1);
        expect(ledger.find((e) => e.kind === "would-do" && e.group === "workers" && e.pr === 7)).toMatchObject({
            op: "ask 1 session(s) whose #7 is",
        });
        expect(sent).toEqual([]);
        const text = statusText(statusData(daemon.state, { config: daemon.config, now: clock }, {}), clock);
        expect(text).toContain("asked 1 session at 12:00 UTC; no owner yet");
        // The next poll asks nothing new.
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        expect((await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "pr-asked")).toHaveLength(1);
    });
});

describe("inviting idle sessions to pull work", () => {
    it("announces a queued job no worker took once, to idle sessions only, a would-do in dry-run", async () => {
        /** @type {string[]} */
        const sent = [];
        const peers = {
            sessions: () => [
                { pid: 1, sessionId: "s1", name: "graphty-13", cwd: dir, socket: "/s1.sock", status: "idle" },
                { pid: 2, sessionId: "s2", name: "graphty-14", cwd: dir, socket: "/s2.sock", status: "busy" },
            ],
            transport: { send: async (/** @type {string} */ socket) => void sent.push(socket) },
        };
        const daemon = await start({ peers });
        await poll(daemon);
        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #2 from o/feat"), commit(A, null, "first")];
        scene.ci = [run(101, B, "failure"), run(100, A, "success")];
        for (const at of ["12:03", "12:06"]) {
            clock = new Date(`2026-10-02T${at}:00Z`);
            await poll(daemon);
        }
        const invites = (await readLedger(join(dir, ".githerd"))).filter(
            (e) => e.kind === "would-do" && e.op?.startsWith("invite"),
        );
        expect(invites).toEqual([
            expect.objectContaining({ group: "workers", op: "invite 1 idle session(s) to take verdict-ci-Build-" }),
        ]);
        expect(sent).toEqual([]);
        const text = statusText(statusData(daemon.state, { config: daemon.config, now: clock }, {}), clock);
        expect(text).toContain("would have invited 1 idle sessions at 12:06 UTC");
    });
});

describe("failure classes on master", () => {
    const RENTED = "machine/gpu=t4/cpu=4/ram=16/tenancy=on_demand";
    const BALANCE = "Machine: Insufficient balance to run job. Current balance: $-2.0800. Minimum required: $0.05.";
    const gpuConfig = () =>
        writeConfig({
            lanes: { ci: { workflow: "ci.yml", gating: "required" }, gpu: { workflow: "gpu.yml", gating: "required" } },
        });

    it("parks a lane out of balance: an owner item and one backoff re-run per slot, no incident", async () => {
        gpuConfig();
        scene.gpu = [{ ...run(200, A, "failure"), name: "GPU" }];
        scene.jobs = {
            200: [
                {
                    id: 2000,
                    run_attempt: 1,
                    name: "Test (NVIDIA T4)",
                    conclusion: "failure",
                    labels: [RENTED],
                    steps: [{ name: BALANCE, conclusion: "failure" }],
                },
            ],
        };
        const daemon = await start();
        for (const at of ["12:00", "12:03", "12:20", "12:36", "12:45"]) {
            clock = new Date(`2026-10-02T${at}:00Z`);
            await poll(daemon);
        }
        expect(daemon.state.master.lanes.gpu).toMatchObject({ verdict: "red", redClass: "paid-capacity" });
        expect(daemon.state.incidents).toEqual({});
        expect(daemon.state.ownerItems["paid-capacity:gpu"]).toMatchObject({ blocks: "release" });
        expect(daemon.state.ownerItems["paid-capacity:gpu"].endedAt).toBeUndefined();
        const would = (await readLedger(join(dir, ".githerd"))).filter((e) => e.group === "incidents");
        expect(would.map((e) => [e.op, e.situation, e.slot])).toEqual([
            ["POST actions/runs/200/rerun-failed-jobs", "paid-capacity-backoff", 1],
        ]);
        expect(gh.writes()).toEqual([]);

        // A green run ends the item by itself.
        scene.gpu = [{ ...run(201, A, "success"), name: "GPU" }, ...scene.gpu];
        clock = new Date("2026-10-02T12:48:00Z");
        await poll(daemon);
        expect(daemon.state.ownerItems["paid-capacity:gpu"]).toMatchObject({ endedBy: "cleared" });
    });

    /**
     * Calls `githerd_verdict` as an owner session would.
     * @param {any} daemon the daemon
     * @param {any} args the tool's arguments
     * @returns {Promise<any>} the parsed answer
     */
    const verdict = async (daemon, args) => {
        const reply = await daemon.rpc(
            {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { _meta: META, name: "githerd_verdict", arguments: args },
            },
            { session: "owner-1" },
        );
        return JSON.parse(reply.result.content.at(-1).text);
    };

    it("holds a failure no pattern knows for Claude: one re-run, a hold, a verdict job; environment lifts it", async () => {
        gpuConfig();
        const glib = (/** @type {number} */ id) => ({
            id,
            run_attempt: 1,
            name: "Test (NVIDIA T4)",
            conclusion: "failure",
            labels: [RENTED],
            steps: [{ name: "Browser smoke on NVIDIA", conclusion: "failure" }],
        });
        scene.gpu = [{ ...run(210, A, "failure"), name: "GPU" }];
        scene.jobs = { 210: [glib(2100)] };
        scene.annotations = [{ message: "Process completed with exit code 1." }];
        // GPU job 111465235370, 2026-10-04: the job container had no glib.
        scene.logs = {
            2100: "chrome-headless-shell: error while loading shared libraries: libglib-2.0.so.0: cannot open shared object file: No such file or directory\n##[error]Process completed with exit code 1.",
        };
        const daemon = await start();
        for (const at of ["12:00", "12:03", "12:06"]) {
            clock = new Date(`2026-10-02T${at}:00Z`);
            await poll(daemon);
        }
        const KEY = "GPU / Test (NVIDIA T4) / Browser smoke on NVIDIA";
        expect(daemon.state.master.lanes.gpu).toMatchObject({ verdict: "red", redClass: "unclassified" });
        // The log is read once, when the job's steps and annotations alone match no pattern.
        const logReads = gh.calls.filter((c) => c.args.at(-1)?.endsWith("/actions/jobs/2100/logs"));
        expect(logReads).toHaveLength(1);
        const [incident] = Object.values(daemon.state.incidents);
        expect(incident.status).toBe("open");
        const verdictJobs = Object.values(daemon.state.jobs).filter((j) => j.facts?.scope === "verdict");
        expect(verdictJobs).toEqual([
            expect.objectContaining({ kind: "incident", target: KEY, priority: "urgent", state: "queued" }),
        ]);
        expect(verdictJobs[0].facts).toMatchObject({ lane: "gpu", runId: 210, jobId: 2100 });
        expect(Object.keys(daemon.state.jobs).filter((id) => id.startsWith("incident-"))).toEqual([]);
        // Only the reversible step: one re-run of the red head; no parent re-test, no revert.
        const incidents = async () =>
            (await readLedger(join(dir, ".githerd"))).filter((e) => e.group === "incidents").map((e) => e.situation);
        expect(await incidents()).toEqual(["red-head-rerun"]);

        // A key that is not waiting for a verdict is refused.
        await expect(verdict(daemon, { key: "GPU / x / y", verdict: "code", reason: "r" })).rejects.toThrow();
        expect(
            await verdict(daemon, { key: KEY, verdict: "environment", reason: "the job container lacks glib" }),
        ).toMatchObject({ ok: true, verdict: "environment" });
        expect(await verdict(daemon, { key: KEY, verdict: "code", reason: "changed my mind" })).toMatchObject({
            ok: false,
        });
        clock = new Date("2026-10-02T12:08:00Z");
        await poll(daemon);
        // No hold, no incident, and no owner item until the failure persists.
        expect(daemon.state.master.lanes.gpu).toMatchObject({ redClass: "environment", redPersists: false });
        expect(incident).toMatchObject({ status: "resolved", resolvedAs: "environment" });
        expect(daemon.state.jobs[verdictJobs[0].id].state).toBe("cancelled");
        expect(daemon.state.ownerItems?.["environment:gpu"]).toBeUndefined();

        // The next run fails the same way: the owner hears of it.
        scene.gpu = [{ ...run(211, A, "failure"), name: "GPU" }, ...scene.gpu];
        scene.jobs[211] = [glib(2110)];
        scene.logs[2110] = scene.logs[2100];
        clock = new Date("2026-10-02T12:09:00Z");
        await poll(daemon);
        expect(daemon.state.master.lanes.gpu).toMatchObject({ redClass: "environment", redPersists: true });
        expect(daemon.state.ownerItems["environment:gpu"]).toMatchObject({ blocks: "release" });
        expect(daemon.state.ownerItems["environment:gpu"].question).toMatch(/^gpu still fails, and Claude judged it/);
        expect(Object.values(daemon.state.incidents).filter((i) => i.status === "open")).toEqual([]);
        expect(await incidents()).toEqual(["red-head-rerun"]);
        expect(gh.writes()).toEqual([]);
    });

    it("goes on to the parent re-test once Claude judges the failure code", async () => {
        gpuConfig();
        scene.gpu = [{ ...run(220, A, "failure"), name: "GPU" }];
        scene.jobs = {
            220: [
                {
                    id: 2200,
                    run_attempt: 1,
                    name: "Test (NVIDIA T4)",
                    conclusion: "failure",
                    labels: [RENTED],
                    steps: [{ name: "Run node scripts/bench-compare.js", conclusion: "failure" }],
                },
            ],
        };
        const daemon = await start();
        for (const at of ["12:00", "12:03"]) {
            clock = new Date(`2026-10-02T${at}:00Z`);
            await poll(daemon);
        }
        const KEY = "GPU / Test (NVIDIA T4) / Run node scripts/bench-compare.js";
        expect(
            await verdict(daemon, { key: KEY, verdict: "code", reason: "the kernel change slowed fr-10k" }),
        ).toMatchObject({ ok: true });
        clock = new Date("2026-10-02T12:06:00Z");
        await poll(daemon);
        expect(daemon.state.master.lanes.gpu.redClass).toBe("code");
        expect(Object.keys(daemon.state.jobs).filter((id) => id.startsWith("incident-"))).toHaveLength(1);
        const jobs = Object.values(daemon.state.jobs);
        expect(jobs.find((j) => j.facts?.scope === "verdict")?.state).toBe("cancelled");
        expect(Object.values(daemon.state.incidents)[0].status).toBe("open");
    });

    it("parks a package-server outage during an install, whatever the summary jobs beside it say", async () => {
        writeConfig({ requiredChecks: ["All Checks Pass", "Lint PR Title"] });
        scene.ci = [{ ...run(240, A, "failure"), name: "CI" }];
        const summary = (/** @type {number} */ id, /** @type {string} */ name) => ({
            id,
            run_attempt: 1,
            name,
            conclusion: "failure",
            labels: ["ubuntu-24.04"],
            steps: [{ name: "Check the run passed", conclusion: "failure" }],
        });
        scene.jobs = {
            240: [
                {
                    id: 2400,
                    run_attempt: 1,
                    name: "Test (graphty-element-browser-4)",
                    conclusion: "failure",
                    labels: ["ubuntu-24.04"],
                    steps: [{ name: "Install Playwright deps", conclusion: "failure" }],
                },
                summary(2401, "All Checks Pass"),
                summary(2402, "Queue Checks Pass"),
            ],
        };
        // CI run 37244710257's log, 2026-10-04.
        scene.logs = {
            2400: [
                "E: Failed to fetch https://packages.microsoft.com/ubuntu/24.04/prod/dists/noble/InRelease  403  Forbidden [IP: 13.107.246.40 443]",
                "E: The repository 'https://packages.microsoft.com/ubuntu/24.04/prod noble InRelease' is no longer signed.",
                "Failed to install browser dependencies",
                "Error: Installation process exited with code: 100",
            ].join("\n"),
        };
        const daemon = await start();
        for (const at of ["12:00", "12:03"]) {
            clock = new Date(`2026-10-02T${at}:00Z`);
            await poll(daemon);
        }
        expect(daemon.state.master.lanes.ci).toMatchObject({ verdict: "red", redClass: "outside" });
        expect(daemon.state.incidents).toEqual({});
        expect(Object.keys(daemon.state.jobs ?? {}).filter((id) => id.startsWith("incident-"))).toEqual([]);
    });

    it("never makes a summary job an incident of its own", async () => {
        writeConfig({ requiredChecks: ["All Checks Pass"] });
        scene.ci = [{ ...run(250, A, "failure"), name: "CI" }];
        const failing = (/** @type {number} */ id, /** @type {string} */ name, /** @type {string} */ step) => ({
            id,
            run_attempt: 1,
            name,
            conclusion: "failure",
            labels: ["ubuntu-24.04"],
            steps: [{ name: step, conclusion: "failure" }],
        });
        scene.jobs = {
            250: [
                failing(2500, "Build", "Build packages"),
                failing(2501, "All Checks Pass", "Check the run passed"),
                failing(2502, "Queue Checks Pass", "Check the run passed, and was the full suite in the queue"),
            ],
        };
        const daemon = await start();
        for (const at of ["12:00", "12:03", "12:06"]) {
            clock = new Date(`2026-10-02T${at}:00Z`);
            await poll(daemon);
        }
        expect(daemon.state.master.lanes.ci.redReason).toBe("Build: Build packages");
        const [incident] = Object.values(daemon.state.incidents);
        expect(Object.keys(incident.keys)).toEqual(["CI / Build / Build packages"]);
        expect(Object.keys(daemon.state.jobs).filter((id) => /^(?:incident|verdict)-/.test(id))).toEqual([
            "verdict-CI-Build-Build-packages",
        ]);
    });

    it("names no code suspect when no commit since the last green one touches the red lane's code", async () => {
        gpuConfig();
        scene.gpu = [{ ...run(230, A, "success"), name: "GPU" }];
        const daemon = await start();
        await poll(daemon);
        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #2 from o/docs"), commit(A, null, "first")];
        scene.ci = [run(101, B, "success"), run(100, A, "success")];
        scene.gpu = [{ ...run(231, B, "failure"), name: "GPU" }, ...scene.gpu];
        scene.jobs = {
            231: [
                {
                    id: 2310,
                    run_attempt: 1,
                    name: "Test (NVIDIA T4)",
                    conclusion: "failure",
                    labels: [RENTED],
                    steps: [{ name: "Run node tests", conclusion: "failure" }],
                },
            ],
        };
        // The range of 22f8785..7fd13ca: docs, and a release commit's changelogs and version bumps.
        scene.compare = [
            { filename: "design/ci/ci-cd-plan.md", patch: "@@ -1 +1 @@\n-a\n+b" },
            { filename: "webgpu-graph-algorithms/CHANGELOG.md", patch: "@@ -1 +1,3 @@\n+## 0.6.32" },
            {
                filename: "webgpu-graph-algorithms/package.json",
                patch: '@@ -2,3 +2,3 @@\n     "name": "@graphty/webgpu-graph-algorithms",\n-    "version": "0.6.31",\n+    "version": "0.6.32",',
            },
        ];
        for (const at of ["12:03", "12:06"]) {
            clock = new Date(`2026-10-02T${at}:00Z`);
            await poll(daemon);
        }
        const [incident] = Object.values(daemon.state.incidents);
        expect(incident).toMatchObject({ status: "open", lastGreenSha: A, redSha: B, suspects: [] });
        expect(incident.rangeNote).toBe("no commit since aaaaaaa touches the GPU lane's code");
        // A range that touches the lane keeps its suspects.
        scene.compare = [{ filename: "graph-format/src/a.ts", patch: "@@ -1 +1 @@\n-a\n+b" }];
        delete incident.rangeFor;
        delete incident.rangeNote;
        incident.suspects = [{ sha: B, pr: 2 }];
        clock = new Date("2026-10-02T12:09:00Z");
        await poll(daemon);
        expect(incident.suspects).toEqual([{ sha: B, pr: 2 }]);
        expect(incident.rangeNote).toBeUndefined();
    });

    it("raises lane-not-progressing while a gating job waits for a runner past its bound, and ends it once picked up", async () => {
        gpuConfig();
        const queued = { ...run(300, A, null), status: "queued", name: "GPU" };
        scene.gpu = [queued, { ...run(299, A, "success"), name: "GPU" }];
        const job = {
            id: 3000,
            name: "Test (NVIDIA T4)",
            status: "queued",
            labels: [RENTED],
            created_at: "2026-10-02T12:00:00Z",
        };
        scene.jobs = { 300: [job] };
        const daemon = await start();
        clock = new Date("2026-10-02T12:10:00Z");
        await poll(daemon);
        expect(daemon.state.ownerItems?.["lane-not-progressing:gpu"]).toBeUndefined();
        clock = new Date("2026-10-02T12:20:00Z");
        await poll(daemon);
        expect(daemon.state.ownerItems["lane-not-progressing:gpu"]).toMatchObject({
            blocks: "release",
            question: expect.stringMatching(/^gpu: Test \(NVIDIA T4\) has waited 20 min for a runner/),
        });
        expect(daemon.state.master.lanes.gpu.notProgressing).toBe(true);
        scene.jobs = {
            300: [{ ...job, status: "in_progress", runner_name: "t4-1", started_at: "2026-10-02T12:21:00Z" }],
        };
        clock = new Date("2026-10-02T12:23:00Z");
        await poll(daemon);
        expect(daemon.state.ownerItems["lane-not-progressing:gpu"]).toMatchObject({ endedBy: "cleared" });
        expect(daemon.state.master.pickups[RENTED]).toBe(21 * 60_000);
    });
});

describe("unreadable state", () => {
    it("keeps the corrupt files, escalates, and pages a red master once as a restart", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        writeFileSync(join(stateDir, "state.json"), "{");
        writeFileSync(join(stateDir, "state.json.bak"), "[1]");
        // master went red at 12:00; githerd restarts at 12:05
        scene.head = B;
        scene.commits = [commit(B, A, "Merge pull request #2 from o/x"), commit(A, null, "first")];
        scene.ci = [run(101, B, "failure"), run(100, A, "success")];
        clock = new Date("2026-10-02T12:05:00Z");
        const daemon = await start();
        expect(daemon.state.recovery).toMatchObject({ emptyStart: true, at: clock.toISOString() });
        expect(daemon.state.escalations["state-reset"]).toMatchObject({ kind: "blocked", resolvedAt: null });
        expect(daemon.state.escalations["state-reset"].summary).toContain(
            "state.json.corrupt-2026-10-02T12-05-00.000Z",
        );
        expect(readFileSync(join(stateDir, "state.json.corrupt-2026-10-02T12-05-00.000Z"), "utf8")).toBe("{");
        expect(readFileSync(join(stateDir, "state.json.bak.corrupt-2026-10-02T12-05-00.000Z"), "utf8")).toBe("[1]");

        for (const at of ["2026-10-02T12:08:00Z", "2026-10-02T12:11:00Z"]) {
            clock = new Date(at);
            await poll(daemon);
        }
        expect(daemon.state.master.verdict).toBe("red");
        // The unreadable state paged on the first poll; the red master waits for the batching
        // window to end, then pages once.
        expect(pages()).toEqual([
            { status: "waiting", message: expect.stringMatching(/^state.json unreadable; githerd started empty/) },
        ]);
        clock = new Date("2026-10-02T12:19:00Z");
        await poll(daemon);
        clock = new Date("2026-10-02T12:22:00Z");
        await poll(daemon);
        expect(pages().filter((p) => /master (is )?red/.test(p.message))).toEqual([
            {
                status: "waiting",
                message: "githerd restarted, master is red since 2026-10-02T12:00 UTC: ci (Build) at bbbbbbbbb",
            },
        ]);
    });

    it("rebuilds from the ledger's record lines when both files are lost, and workers go on", async () => {
        const stateDir = join(dir, ".githerd");
        const first = await start();
        const beat = { method: "POST", body: JSON.stringify({ session: "wt-2", cwd: "/x", branch: "feat/y" }) };
        expect((await fetch(`${first.url}/heartbeat`, beat)).status).toBe(200);
        await first.shutdown();
        writeFileSync(join(stateDir, "state.json"), "{");
        writeFileSync(join(stateDir, "state.json.bak"), "{");

        clock = new Date("2026-10-02T12:05:00Z");
        const daemon = await start();
        expect(daemon.state.sessions["wt-2"]).toMatchObject({ cwd: "/x", branch: "feat/y" });
        expect(daemon.state.recovery).toMatchObject({ emptyStart: true, at: clock.toISOString() });
        expect(daemon.state.escalations["state-from-ledger"]).toMatchObject({ kind: "other", resolvedAt: null });
        // A recovery, not a stop: workers go on with the rebuilt state (design 9.1).
        expect(Object.values(daemon.state.ownerItems).map((i) => i.blocks)).toEqual([null]);
        await poll(daemon);
        // Nothing waits on him, so nothing pages at once: the item reaches him as any other does.
        expect(pages().filter((p) => p.message.includes("rebuilt"))).toEqual([]);
    });

    it("escalates without paging when it starts from the backup", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        writeFileSync(join(stateDir, "state.json"), "{");
        writeFileSync(join(stateDir, "state.json.bak"), JSON.stringify({ schema: 1 }));
        const daemon = await start();
        expect(daemon.state.escalations["state-from-backup"]).toMatchObject({ kind: "other" });
        await poll(daemon);
        expect(pages().filter((p) => p.message.includes("state.json"))).toEqual([]);
    });
});

describe("fencing", () => {
    it("exits without writing when the lock names another live daemon at startup", async () => {
        const other = sleeper();
        await new Promise((r) => other.once("spawn", r));
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        const record = `${JSON.stringify({ ...identify(other.pid), cwd: "/elsewhere" })}\n`;
        writeFileSync(join(stateDir, "lock"), record);

        const daemon = await start();
        expect(daemon.fenced).toBe(true);
        expect(await daemon.done).toEqual({ reason: "fenced" });
        expect(readFileSync(join(stateDir, "lock"), "utf8")).toBe(record);
        expect(readdirSync(stateDir)).toEqual(["lock"]);
        expect(existsSync(join(stateDir, "state.json"))).toBe(false);
        expect(existsSync(join(stateDir, "ledger.jsonl"))).toBe(false);
        expect(gh.calls).toEqual([]);
    });

    it("stops before the next poll when another live daemon takes the lock", async () => {
        const daemon = await start();
        await poll(daemon);
        const stateDir = join(dir, ".githerd");
        const before = readFileSync(join(stateDir, "state.json"), "utf8");
        const calls = gh.calls.length;

        const other = sleeper();
        await new Promise((r) => other.once("spawn", r));
        writeFileSync(join(stateDir, "lock"), JSON.stringify(identify(other.pid)));
        clock = new Date("2026-10-02T12:03:00Z");
        expect(await daemon.poll()).toEqual({ fenced: true });
        expect(await daemon.done).toEqual({ reason: "fenced" });
        expect(gh.calls).toHaveLength(calls);
        expect(readFileSync(join(stateDir, "state.json"), "utf8")).toBe(before);
        await expect(fetch(`${daemon.url}/health`)).rejects.toThrow();
    });

    it("takes a stale lock and releases its own at shutdown", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        writeFileSync(join(stateDir, "lock"), JSON.stringify({ pid: process.pid, startTime: "1", bootId: "gone" }));
        const daemon = await start();
        expect(daemon.fenced).toBe(false);
        expect(lines.some((l) => l.includes(`took a stale lock from pid ${process.pid}`))).toBe(true);
        expect(JSON.parse(readFileSync(join(stateDir, "lock"), "utf8"))).toEqual({
            ...identify(process.pid),
            cwd: process.cwd(),
        });
        expect(JSON.parse(readFileSync(join(stateDir, "daemon.json"), "utf8")).port).toBe(daemon.port);
        await daemon.shutdown();
        expect(existsSync(join(stateDir, "lock"))).toBe(false);
    });
});

describe("the notify command check", () => {
    it("finds a command on PATH or by path, and names a missing one", () => {
        expect(notifyCommandProblem(null, {})).toBeNull();
        expect(notifyCommandProblem(["node"], { PATH: process.env.PATH })).toBeNull();
        expect(notifyCommandProblem([process.execPath], {})).toBeNull();
        expect(notifyCommandProblem(["~/no/such/notify"], {})).toContain("~/no/such/notify");
        expect(notifyCommandProblem(["no-such-notify-command"], { PATH: "/nonexistent" })).toContain(
            "not found or not executable",
        );
    });

    it("shows the PHONE ALERTS BROKEN banner from startup when the command is missing", async () => {
        writeConfig({ notify: { command: [join(dir, "missing-notify")] } });
        const daemon = await start();
        expect(daemon.state.notify.brokenSince).toBe(clock.toISOString());
        const reply = await daemon.rpc({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { _meta: META, name: "githerd_status", arguments: {} },
        });
        expect(reply.result.content[0].text).toMatch(/^PHONE ALERTS BROKEN since/);
    });
});

/**
 * Waits for a condition, checking every 20 ms; fails after 15 s.
 * @param {() => unknown} check returns truthy when done
 * @param {string} what for the failure message
 * @returns {Promise<any>} the check's value
 */
async function until(check, what) {
    const end = Date.now() + 15_000;
    for (;;) {
        const value = await check();
        if (value) return value;
        if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
        await new Promise((r) => setTimeout(r, 20));
    }
}

/**
 * Reads a JSON file of the test's state directory.
 * @param {string} name the file
 * @returns {any} its value, or null when missing
 */
function stateFile(name) {
    const file = join(dir, ".githerd", name);
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

describe("liveness", () => {
    it("writes alive at start and on its own timer, and progress around each poll", async () => {
        const daemon = await start({ aliveMs: 10 });
        expect(stateFile("alive")).toEqual({
            pid: process.pid,
            startTime: identify(process.pid).startTime,
            version: expect.any(String),
            pid1Start: containerStart(),
            at: clock.toISOString(),
        });
        expect(stateFile("progress")).toEqual({ step: "start", since: clock.toISOString() });

        clock = new Date("2026-10-02T12:03:00Z");
        await until(() => stateFile("alive").at === clock.toISOString(), "the alive timer");
        await poll(daemon);
        expect(stateFile("progress")).toEqual({ step: "idle", since: clock.toISOString() });
        // A clean first start: nothing died, so no start is counted toward a crash loop.
        expect(existsSync(join(dir, ".githerd", "starts"))).toBe(false);
    });

    it("records a container restart when PID 1 started since the last alive", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        writeFileSync(join(stateDir, "alive"), JSON.stringify({ pid: 1, pid1Start: "0" }));
        const daemon = await start();
        expect(daemon.containerRestarted).toBe(true);
        await daemon.shutdown();
        const events = (await readLedger(stateDir)).filter((e) => e.event === "container-restart");
        expect(events).toEqual([expect.objectContaining({ from: "0", to: containerStart() })]);
    });

    it("charges no session death to a job whose worker the container restart took", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        writeFileSync(join(stateDir, "alive"), JSON.stringify({ pid: 1, pid1Start: "0" }));
        const job = newJob({ kind: "issue", target: "#14", id: "issue-14" }, clock);
        job.state = "working";
        job.deaths = [{ at: clock.toISOString(), capture: null }];
        job.holder = { pane: "%1", window: "@1", pid: process.pid, startTime: "0", session: "s1", name: "x" };
        writeFileSync(join(stateDir, "state.json"), JSON.stringify({ schema: 1, jobs: { "issue-14": job } }));
        const daemon = await start();
        await daemon.watch();
        const after = daemon.state.jobs["issue-14"];
        expect(after.deaths).toHaveLength(1);
        expect(after.holder).toBeNull();
        expect(after.state).toBe("working");
        await daemon.shutdown();
        const ledger = await readLedger(stateDir);
        expect(ledger.filter((e) => e.kind === "holder-voided")).toEqual([
            expect.objectContaining({ job: "issue-14", reason: "container restarted" }),
        ]);
        expect(ledger.filter((e) => e.kind === "session-death")).toEqual([]);
    });

    it("ends a window whose start the restart lost, and keeps the windows jobs hold", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        // The daemon stopped while issue-16's window waited for its registry entry.
        const lost = newJob({ kind: "issue", target: "#16", id: "issue-16" }, clock);
        move(lost, "starting", clock);
        lost.holder = { nonce: "old", socket: "githerd", startedBy: "githerd", session: null };
        const kept = newJob({ kind: "issue", target: "#17", id: "issue-17" }, clock);
        move(kept, "starting", clock);
        move(kept, "working", clock);
        kept.holder = { pane: "%2", window: "@2", pid: 1, startTime: "0", session: "s2", name: "githerd-issue-17" };
        const jobs = { "issue-16": lost, "issue-17": kept };
        writeFileSync(join(stateDir, "state.json"), JSON.stringify({ schema: 1, jobs }));
        const win = (/** @type {string} */ id, /** @type {string} */ job) => ({
            socket: "githerd",
            window: id,
            pane: `%${id.slice(1)}`,
            pid: 4242,
            name: `githerd-${job}`,
            job,
            startTime: "9",
        });
        const windows = [win("@0", "bash"), win("@2", "issue-17"), win("@3", "issue-16")];
        const daemon = await start({ platform: { windows: () => windows } });
        expect(daemon.state.jobs["issue-16"]).toMatchObject({ state: "queued", holder: null });
        expect(daemon.state.retiring).toEqual([
            { job: "issue-16", holder: windows[2], reason: "a window no job holds", at: clock.toISOString() },
        ]);
        await daemon.shutdown();
        expect((await readLedger(stateDir)).filter((e) => e.kind === "stray-window")).toEqual([
            expect.objectContaining({ job: "issue-16" }),
        ]);
    });

    it("makes the push queue at start and recovers a push the stopped daemon was running", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        const job = newJob({ kind: "issue", target: "#15", id: "issue-15" }, clock);
        move(job, "starting", clock);
        move(job, "working", clock);
        move(job, "waiting", clock, { waitingFor: { push: "push-1" } });
        const entry = { id: "push-1", job: "issue-15", branch: "githerd/x", head: "a".repeat(40), worktree: dir };
        const pushQueue = {
            next: 2,
            entries: [{ ...entry, rank: 2, queuedAt: clock.toISOString(), status: "running", pid: 1, startTime: "0" }],
        };
        writeFileSync(
            join(stateDir, "state.json"),
            JSON.stringify({ schema: 1, jobs: { "issue-15": job }, pushQueue }),
        );
        const daemon = await start();
        expect(daemon.state.pushQueue.entries).toEqual([]);
        expect(daemon.state.jobs["issue-15"].state).toBe("working");
        expect(daemon.state.jobs["issue-15"].news.at(-1).text).toMatch(/interrupted by a githerd restart/);
        await daemon.shutdown();
        expect((await readLedger(stateDir)).filter((e) => e.kind === "push-interrupted")).toHaveLength(1);
    });

    it("sees no container restart when PID 1 is the one alive recorded", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        writeFileSync(join(stateDir, "alive"), JSON.stringify({ pid: 1, pid1Start: containerStart() }));
        expect((await start()).containerRestarted).toBe(false);
    });

    it("drains the hook events spooled while it was down into the ledger", async () => {
        const stateDir = join(dir, ".githerd");
        await spoolEvent(stateDir, { kind: "stop", session: "s1" }, { now: () => clock });
        const daemon = await start();
        await daemon.shutdown();
        expect((await readLedger(stateDir)).filter((e) => e.kind === "spooled")).toEqual([
            expect.objectContaining({ spooled: { ts: clock.toISOString(), kind: "stop", session: "s1" } }),
        ]);
        expect(readdirSync(join(stateDir, "spool"))).toEqual([]);
    });

    it("applies a hook event once, even when the hook gave up and spooled it while the daemon answered", async () => {
        const stateDir = join(dir, ".githerd");
        const daemon = await start();
        const job = newJob({ kind: "pr", target: "pr:7", id: "j1" }, clock);
        move(job, "starting", clock);
        move(job, "working", clock);
        daemon.state.jobs = { j1: job };
        const event = {
            id: "h1",
            event: "StopFailure",
            job: "j1",
            nonce: "n",
            input: { session_id: "w1", error: "overloaded" },
        };
        await fetch(`${daemon.url}/hook`, { method: "POST", body: JSON.stringify(event) });
        expect(job.apiErrors.count).toBe(1);
        await spoolEvent(stateDir, event, { now: () => clock });
        await daemon.drainHooks();
        expect(job.apiErrors.count).toBe(1);
        expect(readdirSync(join(stateDir, "spool"))).toEqual([]);
        await daemon.shutdown();
        const kinds = (await readLedger(stateDir)).map((e) => e.kind);
        expect(kinds.filter((k) => k === "api-failure")).toHaveLength(1);
        expect(kinds).toContain("hook-duplicate");
    });

    it("applies a spooled event at its own time, and drops a stop older than the API stop it would lift", async () => {
        const stateDir = join(dir, ".githerd");
        const daemon = await start();
        const job = newJob({ kind: "pr", target: "pr:7", id: "j1" }, clock);
        move(job, "starting", clock);
        move(job, "working", clock);
        daemon.state.jobs = { j1: job };
        const earlier = new Date(clock.getTime() - 5 * 60_000);
        const steer = {
            id: "h2",
            event: "UserPromptSubmit",
            job: "j1",
            nonce: "n",
            input: { session_id: "w1", prompt: "stop that" },
        };
        await spoolEvent(stateDir, steer, { now: () => earlier });
        daemon.state.apiStop = { kind: "credential", error: "authentication_failed", at: clock.toISOString() };
        await spoolEvent(
            stateDir,
            { id: "h3", event: "Stop", job: null, nonce: null, input: { session_id: "o1" } },
            { now: () => earlier },
        );
        await daemon.drainHooks();
        expect(job.steeredAt).toBe(earlier.toISOString());
        expect(daemon.state.apiStop).toMatchObject({ kind: "credential" });
        const later = new Date(clock.getTime() + 60_000);
        await spoolEvent(
            stateDir,
            { id: "h4", event: "Stop", job: null, nonce: null, input: { session_id: "o1" } },
            { now: () => later },
        );
        await daemon.drainHooks();
        expect(daemon.state.apiStop).toBeNull();
        await daemon.shutdown();
        expect((await readLedger(stateDir)).filter((e) => e.kind === "hook-stale")).toEqual([
            expect.objectContaining({ event: "Stop", id: "h3", ts: earlier.toISOString() }),
        ]);
    });

    it("answers a spooled hook event, so its effect on the state lands late rather than never", async () => {
        const stateDir = join(dir, ".githerd");
        const input = { session_id: "s1", error: "rate_limit" };
        await spoolEvent(stateDir, { event: "StopFailure", job: null, nonce: null, input }, { now: () => clock });
        const daemon = await start();
        expect(daemon.state.apiStop).toMatchObject({ kind: "usage", session: "s1" });
        await daemon.shutdown();
        expect((await readLedger(stateDir)).filter((e) => e.kind === "api-failure")).toHaveLength(1);
    });
});

/**
 * Leaves the lock of a daemon killed with SIGKILL: its process is gone, so the lock is stale.
 * @param {string} stateDir the state directory
 */
function killed(stateDir) {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
        join(stateDir, "lock"),
        JSON.stringify({ pid: process.pid, startTime: "1", bootId: identify(process.pid).bootId, cwd: dir }),
    );
}

describe("fatal mode", () => {
    it("boots into fatal mode on the third start within 10 minutes, and leaves it on a later start", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        writeFileSync(
            join(stateDir, "ledger.jsonl"),
            `${JSON.stringify({ ts: "2026-10-02T11:59:00Z", kind: "exception", stack: "Error: boom" })}\n`,
        );
        for (const at of ["2026-10-02T12:00:00Z", "2026-10-02T12:04:00Z"]) {
            clock = new Date(at);
            killed(stateDir);
            const d = await start();
            expect(d.fatal()).toBeNull();
            await d.shutdown();
        }
        clock = new Date("2026-10-02T12:08:00Z");
        const calls = gh.calls.length;
        killed(stateDir);
        const daemon = await start();
        const reason = "crash loop: 3 starts within 10 minutes; last exception: Error: boom";
        expect(daemon.fatal()).toBe(reason);
        expect(readFileSync(join(stateDir, "FATAL"), "utf8")).toBe(`${reason}\n`);
        expect(await daemon.poll()).toEqual({ fatal: reason });
        expect(gh.calls).toHaveLength(calls);
        // The loop still ticks, so after 3 poll intervals a launcher sees it up, not wedged.
        clock = new Date("2026-10-02T12:20:00Z");
        await daemon.poll();
        expect((await (await fetch(`${daemon.url}/health`)).json()).loopTickAt).toBe(clock.toISOString());
        expect((await (await fetch(`${daemon.url}/health`)).json()).fatal).toBe(reason);
        const refused = await fetch(`${daemon.url}/rpc`, { method: "POST", body: "{}" });
        expect(refused.status).toBe(503);
        expect(await refused.json()).toEqual({ error: `githerd is DOWN: ${reason}` });
        await daemon.flushNotifications();
        // Pages are held while owner items are dry-run, but this one is the owner's to act on.
        expect(phone()).toEqual([{ status: "error", message: `githerd is DOWN: ${reason}` }]);
        await daemon.shutdown();

        clock = new Date("2026-10-02T12:30:00Z");
        const later = await start();
        expect(later.fatal()).toBeNull();
        expect(existsSync(join(stateDir, "FATAL"))).toBe(false);
    });

    it("never counts a start after a clean stop toward a crash loop", async () => {
        const stateDir = join(dir, ".githerd");
        for (const at of ["2026-10-02T12:00:00Z", "2026-10-02T12:02:00Z", "2026-10-02T12:04:00Z"]) {
            clock = new Date(at);
            const d = await start();
            expect(d.fatal()).toBeNull();
            await d.shutdown();
        }
        expect(existsSync(join(stateDir, "FATAL"))).toBe(false);
        expect(existsSync(join(stateDir, "starts"))).toBe(false);
    });

    it("enters fatal mode on an uncaught exception instead of exiting", async () => {
        const stateDir = join(dir, ".githerd");
        const script = join(dir, "throws.mjs");
        writeFileSync(
            script,
            `import { startDaemon } from ${JSON.stringify(pathToFileURL(join(PACKAGE_DIR, "lib", "daemon.mjs")).href)};
const d = await startDaemon({
    root: ${JSON.stringify(dir)},
    port: 0,
    stateDir: ${JSON.stringify(stateDir)},
    env: { GITHERD_CONFIG: ${JSON.stringify(configFile)}, PATH: process.env.PATH },
    autoPoll: false,
    quiet: true,
    fatalOnUncaught: true,
    log: () => {},
});
process.stdout.write(d.url + "\\n");
setTimeout(() => { throw new Error("boom"); }, 0);
`,
        );
        const child = spawn(process.execPath, [script], { detached: true, stdio: ["ignore", "pipe", "inherit"] });
        children.push(child);
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        const url = (await until(() => /^http\S+/m.exec(out), "the daemon's url"))[0];
        await until(() => existsSync(join(stateDir, "FATAL")), "FATAL");
        expect(readFileSync(join(stateDir, "FATAL"), "utf8")).toMatch(/^uncaught exception: Error: boom\n {4}at /);
        expect((await (await fetch(`${url}/health`)).json()).fatal).toBe("uncaught exception: Error: boom");
        expect((await fetch(`${url}/rpc`, { method: "POST", body: "{}" })).status).toBe(503);
        expect(child.exitCode).toBeNull();
    });
});

describe("the daemon process", () => {
    it("leaves a valid state file on SIGTERM", async () => {
        isolateGit();
        const root = join(dir, "repo");
        mkdirSync(root);
        gitSync(root, "init", "-q");
        // A gh with no login: the token is never read, so GitHub is never asked.
        const bin = join(dir, "bin");
        mkdirSync(bin);
        writeFileSync(join(bin, "gh"), "#!/bin/sh\necho 'fake gh: offline' >&2\nexit 1\n");
        chmodSync(join(bin, "gh"), 0o755);
        writeConfig({ notify: { command: null } });

        const child = spawn(process.execPath, [DAEMON_BIN], {
            cwd: root,
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
            env: {
                PATH: `${bin}:${process.env.PATH}`,
                HOME: dir,
                PORT: "0",
                GITHERD_CONFIG: configFile,
                GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
                GIT_CONFIG_NOSYSTEM: "1",
            },
        });
        children.push(child);
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));
        // The state directory is under HOME, named for the checkout, never inside it.
        const stateFile = join(dir, ".githerd", "repo", "state.json");
        // The daemon saves once it is listening, and again after its first poll.
        await new Promise((resolve, reject) => {
            child.stdout.on("data", () => {
                if (out.includes("poll: gh is not logged in")) resolve(undefined);
            });
            child.once("exit", () => reject(new Error(`daemon exited early:\n${out}`)));
        });
        expect(existsSync(stateFile)).toBe(true);

        const exited = new Promise((r) => child.once("exit", (code) => r(code)));
        child.kill("SIGTERM");
        expect(await exited).toBe(0);
        const state = JSON.parse(readFileSync(stateFile, "utf8"));
        expect(state.schema).toBe(1);
        expect(state.config.repo).toBe("o/r");
        expect(state.github.lastError).toContain("fake gh: offline");
        expect(out).not.toMatch(/[^\t\n\r\x20-\x7e]/);
    });

    it("refuses to start without PORT", async () => {
        const child = spawn(process.execPath, [DAEMON_BIN], {
            cwd: dir,
            detached: true,
            stdio: ["ignore", "ignore", "pipe"],
            env: { PATH: process.env.PATH },
        });
        children.push(child);
        let err = "";
        child.stderr.on("data", (d) => (err += d));
        expect(await new Promise((r) => child.once("exit", (code) => r(code)))).toBe(2);
        expect(err).toContain("PORT must be set");
    });
});
