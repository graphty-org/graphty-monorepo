import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { git as gitSync, isolateGit } from "../../visual-review/test/helpers.mjs";
import { notifyCommandProblem, PROTOCOL, startDaemon } from "../lib/daemon.mjs";
import { identify } from "../lib/proc.mjs";
import { readLedger } from "../lib/store.mjs";
import { createFakeGh, httpOutput } from "./helpers/fake-gh.mjs";

const FAKE_NOTIFY = fileURLToPath(new URL("helpers/fake-notify.mjs", import.meta.url));
const DAEMON_BIN = fileURLToPath(new URL("../bin/githerd-daemon.mjs", import.meta.url));

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

/** @type {string} */
let dir;
/** @type {string} */
let configFile;
/** @type {string} */
let notifyLog;
/** @type {Date} */
let clock;
/** @type {{head: string, ci: any[], commits: any[], prs: any[]}} */
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
        trustedAuthors: ["owner"],
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
        if (input?.includes("search(")) return ok({ data: { search: { issueCount: 0, nodes: [] } } });
    }
    const path = args[args.length - 1];
    if (path.includes("/actions/workflows/ci.yml/runs?")) return ok({ workflow_runs: scene.ci });
    if (/\/actions\/runs\/\d+\/jobs\?/.test(path)) {
        return ok({
            jobs: [
                { name: "Build", conclusion: "failure" },
                { name: "Lint", conclusion: "success" },
            ],
        });
    }
    if (path.includes("/commits?sha=master")) return ok(scene.commits);
    if (path.includes("/issues?")) return ok([]);
    if (/\/pulls\/\d+\/commits\?/.test(path)) return ok([{ commit: { message: "fix(x): a fix" } }]);
    if (/\/pulls\/\d+\/files\?/.test(path)) return ok([{ filename: "src/a.ts" }]);
    if (/\/actions\/jobs\/\d+$/.test(path)) {
        return ok({ steps: [{ name: "Check visual changes were accepted", conclusion: "failure" }] });
    }
    if (/\/issues\/\d+\/comments\?/.test(path)) return ok([]);
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
        exec: gh.exec,
        git: async (args) => {
            gitCalls.push(args);
            return { code: 0, stdout: "", stderr: "" };
        },
        now: () => clock,
        env: { GITHERD_CONFIG: configFile, PATH: process.env.PATH },
        autoPoll: false,
        log: (line) => lines.push(line),
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
 * The pages the fake notify command received.
 * @returns {{status: string, message: string}[]} one entry per delivery
 */
function pages() {
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
                "lastPollOkAt",
                "lastPollError",
                "githubDownSince",
                "runsInFlight",
                "notifyBrokenSince",
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
            runsInFlight: 0,
            notifyBrokenSince: null,
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

    it("lists the six session tools on /rpc", async () => {
        const daemon = await start();
        const res = await fetch(`${daemon.url}/rpc`, {
            method: "POST",
            headers: { "x-githerd-session": "wt-1" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        });
        const names = (await res.json()).result.tools.map((t) => t.name);
        expect(names).toEqual([
            "githerd_status",
            "githerd_claim",
            "githerd_release",
            "githerd_report",
            "githerd_escalate",
            "githerd_resolve",
        ]);
    });

    it("persists a claim before replying, and a notification gets 202", async () => {
        const daemon = await start();
        const call = (body) =>
            fetch(`${daemon.url}/rpc`, {
                method: "POST",
                headers: { "x-githerd-session": "wt-1" },
                body: JSON.stringify(body),
            });
        const res = await call({
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: { name: "githerd_claim", arguments: { target: "pr:7", purpose: "fix it" } },
        });
        expect(JSON.parse((await res.json()).result.content[0].text).ok).toBe(true);
        expect(saved().claims["pr:7"].holder).toBe("wt-1");
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
        expect(await events()).toEqual(["lane-green", "lane-red", "master-red-confirmed"]);

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
            "master-red-confirmed",
            "lane-green",
            "master-recovered",
        ]);
        expect(masterRed()).toHaveLength(1);
        expect(pages().filter((p) => p.message.startsWith("master green again"))).toEqual([
            { status: "info", message: expect.stringContaining(Object.keys(daemon.state.incidents)[0]) },
        ]);

        // the dry-run fake gh recorded no write, and nothing would have been written
        expect(gh.calls.length).toBeGreaterThan(0);
        expect(gh.writes()).toEqual([]);
        expect((await readLedger(join(dir, ".githerd"))).filter((e) => e.kind === "would-do")).toEqual([]);
        // git ran with no prompt, only to fetch the default branch when its head moved
        expect(gitCalls).toEqual([
            ["fetch", "origin", "master"],
            ["fetch", "origin", "master"],
            ["fetch", "origin", "master"],
        ]);
    });

    it("sends the daily alive notice once a day", async () => {
        const daemon = await start();
        await poll(daemon);
        clock = new Date("2026-10-02T12:03:00Z");
        await poll(daemon);
        clock = new Date("2026-10-03T00:01:00Z");
        await poll(daemon);
        expect(pages().filter((p) => p.message.startsWith("githerd alive"))).toEqual([
            { status: "info", message: "githerd alive: master green, 0 open escalations" },
            { status: "info", message: "githerd alive: master green, 0 open escalations" },
        ]);
    });

    it("keeps the last valid config when master's is invalid, and escalates once", async () => {
        const daemon = await start();
        await poll(daemon);
        const escalations = async () =>
            (await readLedger(join(dir, ".githerd"))).filter(
                (e) => e.kind === "escalation" && e.key === "config-invalid",
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
        expect(daemon.state.escalations["config-invalid"]).toMatchObject({ kind: "blocked", resolvedAt: null });
        expect(daemon.state.escalations["config-invalid"].detail).toContain("repo");
        expect(await escalations()).toHaveLength(1);
        // a list-only kind: the phone hears nothing
        expect(pages().filter((p) => p.message.includes("config"))).toEqual([]);

        writeConfig({ staleDays: 30 });
        clock = new Date("2026-10-02T12:09:00Z");
        scene.head = D;
        await poll(daemon);
        expect(daemon.state.config.staleDays).toBe(30);
        expect(daemon.state.escalations["config-invalid"].resolvedAt).not.toBeNull();
    });

    it("serves status only when it has never had a valid config", async () => {
        writeFileSync(configFile, "{ not json");
        const daemon = await start();
        expect(await daemon.poll()).toEqual({ ok: false });
        expect(gh.calls).toEqual([]);
        const reply = await daemon.rpc({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "githerd_status", arguments: {} },
        });
        expect(reply.result.content[0].text).toContain("not running a valid config");
        const health = await (await fetch(`${daemon.url}/health`)).json();
        expect(health.lastPollError).toContain("not valid JSON");
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

    it("gives each open PR its why-stuck reasons from a new head's commits and files", async () => {
        writeConfig({
            requiredChecks: ["All Checks Pass"],
            ownerGate: { steps: ["^Check visual changes were accepted$"], rejectMarker: "visual-review-rejects" },
        });
        scene.prs = [
            {
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
            },
        ];
        const daemon = await start();
        await poll(daemon);
        expect(daemon.state.prs["7"]).toMatchObject({
            breaking: false,
            breakingCheckedFor: B,
            ownerGate: true,
            gateJob: 555,
            stuck: ["waiting on owner: visual review"],
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
});

describe("fencing", () => {
    it("exits without writing when daemon.json names another live daemon at startup", async () => {
        const other = sleeper();
        await new Promise((r) => other.once("spawn", r));
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        const record = `${JSON.stringify({ ...identify(other.pid), port: 1, root: dir })}\n`;
        writeFileSync(join(stateDir, "daemon.json"), record);

        const daemon = await start();
        expect(daemon.fenced).toBe(true);
        expect(await daemon.done).toEqual({ reason: "fenced" });
        expect(readFileSync(join(stateDir, "daemon.json"), "utf8")).toBe(record);
        expect(existsSync(join(stateDir, "state.json"))).toBe(false);
        expect(existsSync(join(stateDir, "ledger.jsonl"))).toBe(false);
        expect(gh.calls).toEqual([]);
    });

    it("stops before the next poll when another live daemon takes daemon.json", async () => {
        const daemon = await start();
        await poll(daemon);
        const stateDir = join(dir, ".githerd");
        const before = readFileSync(join(stateDir, "state.json"), "utf8");
        const calls = gh.calls.length;

        const other = sleeper();
        await new Promise((r) => other.once("spawn", r));
        writeFileSync(join(stateDir, "daemon.json"), JSON.stringify({ ...identify(other.pid), port: 1 }));
        clock = new Date("2026-10-02T12:03:00Z");
        expect(await daemon.poll()).toEqual({ fenced: true });
        expect(await daemon.done).toEqual({ reason: "fenced" });
        expect(gh.calls).toHaveLength(calls);
        expect(readFileSync(join(stateDir, "state.json"), "utf8")).toBe(before);
        await expect(fetch(`${daemon.url}/health`)).rejects.toThrow();
    });

    it("ignores a daemon.json whose process is gone", async () => {
        const stateDir = join(dir, ".githerd");
        mkdirSync(stateDir);
        writeFileSync(
            join(stateDir, "daemon.json"),
            JSON.stringify({ pid: process.pid, startTime: "1", bootId: "gone", port: 1 }),
        );
        const daemon = await start();
        expect(daemon.fenced).toBe(false);
        expect(JSON.parse(readFileSync(join(stateDir, "daemon.json"), "utf8")).port).toBe(daemon.port);
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
            params: { name: "githerd_status", arguments: {} },
        });
        expect(reply.result.content[0].text).toMatch(/^PHONE ALERTS BROKEN since/);
    });
});

describe("the daemon process", () => {
    it("leaves a valid state file on SIGTERM", async () => {
        isolateGit();
        const root = join(dir, "repo");
        mkdirSync(root);
        gitSync(root, "init", "-q");
        // A gh that is never reached: every call fails as a network error.
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
        const stateFile = join(root, ".githerd", "state.json");
        // The daemon saves once it is listening, and again after its first poll.
        await new Promise((resolve, reject) => {
            child.stdout.on("data", () => {
                if (out.includes("poll: gh failed")) resolve(undefined);
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
