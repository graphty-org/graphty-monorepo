import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { askStep } from "../lib/asks.mjs";
import { newJob } from "../lib/board.mjs";
import { inferOwners, parseWorktrees, pushedBranches, readPushLog, scanTranscripts } from "../lib/owners.mjs";
import { identify } from "../lib/proc.mjs";
import { prInUse } from "../lib/queue.mjs";
import { makeRepo } from "./helpers/git-repo.mjs";

const NOW = new Date("2026-10-05T22:00:00Z");
const ROOT = "/r";
const SHA = "5f3a2b1" + "0".repeat(33);
const ALICE = { pid: 100, sessionId: "sa", name: "graphty-a" };
const BOB = { pid: 200, sessionId: "sb", name: "graphty-b" };
const WORKTREES = [
    { dir: ROOT, branch: "master" },
    { dir: `${ROOT}/.worktrees/x`, branch: "feat/x" },
];

/**
 * Facts for `inferOwners`, with nothing in them unless a test adds it.
 * @param {Partial<Parameters<typeof inferOwners>[1]>} [over] what to change
 * @returns {Parameters<typeof inferOwners>[1]} the facts
 */
const facts = (over = {}) => ({
    root: ROOT,
    pushLog: [],
    sessions: [ALICE, BOB],
    procs: [],
    worktrees: WORKTREES,
    ...over,
});

/** One open pull request, #710 on feat/x, with failed CI on a head someone else pushed. */
const PRS = {
    710: {
        headSha: SHA,
        headRef: "feat/x",
        headCommitter: "owner@example.com",
        required: { "All Checks Pass": "FAILURE" },
    },
};

/**
 * A push log line.
 * @param {any} session the session that pushed, or null
 * @param {Record<string, unknown>} [over] fields to change
 * @returns {any} the line
 */
const push = (session, over = {}) => ({
    at: "2026-10-05T21:40:12Z",
    branch: "feat/x",
    sha: SHA,
    exit: 0,
    sessionId: session?.sessionId ?? null,
    name: session?.name ?? null,
    ...over,
});

describe("inferOwners", () => {
    it("gives a pull request to the session that last pushed its branch", () => {
        const log = [push(BOB), push(ALICE), push(BOB, { branch: "feat/other" })];
        expect(inferOwners(PRS, facts({ pushLog: log }))).toEqual({
            710: { session: "sa", name: "graphty-a", evidence: "pushed 5f3a2b1 at 21:40 UTC" },
        });
    });

    it("frees it when the last pusher's session is gone, or the last push had no session", () => {
        expect(inferOwners(PRS, facts({ pushLog: [push(ALICE)], sessions: [BOB] }))).toEqual({});
        expect(inferOwners(PRS, facts({ pushLog: [push(ALICE), push(null)] }))).toEqual({});
    });

    it("gives an unpushed pull request to a live session working in its worktree, through a child process", () => {
        const procs = [
            { pid: 100, ppid: 1, cwd: ROOT },
            { pid: 200, ppid: 1, cwd: ROOT },
            { pid: 201, ppid: 200, cwd: null },
            { pid: 202, ppid: 201, cwd: `${ROOT}/.worktrees/x/githerd` },
            { pid: 300, ppid: 1, cwd: `${ROOT}/.worktrees/x` },
        ];
        expect(inferOwners(PRS, facts({ procs }))).toEqual({
            710: { session: "sb", name: "graphty-b", evidence: "working in .worktrees/x" },
        });
        // The main checkout is everyone's: a session there owns nothing, whatever is checked out.
        const onMain = { 710: { ...PRS[710], headRef: "master" } };
        expect(inferOwners(onMain, facts({ procs }))).toEqual({});
        // A worktree whose name merely starts like the branch's is not inside it.
        expect(inferOwners(PRS, facts({ procs: [{ pid: 100, ppid: 1, cwd: `${ROOT}/.worktrees/xy` }] }))).toEqual({});
    });

    it("parses git's worktree list and reads a push log with a torn line", () => {
        const porcelain = `worktree ${ROOT}\nHEAD ${SHA}\nbranch refs/heads/master\n\nworktree ${ROOT}/.worktrees/d\nHEAD ${SHA}\ndetached\n\nworktree ${ROOT}/.worktrees/x\nHEAD ${SHA}\nbranch refs/heads/feat/x\n`;
        expect(parseWorktrees(porcelain)).toEqual(WORKTREES);
        const dir = mkdtempSync(join(tmpdir(), "githerd-owners-"));
        try {
            writeFileSync(join(dir, "log"), `${JSON.stringify(push(ALICE))}\n{"torn\n`);
            expect(readPushLog(join(dir, "log"))).toEqual([push(ALICE)]);
            expect(readPushLog(join(dir, "missing"))).toEqual([]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe("pushes found in Claude Code transcripts", () => {
    /** @type {string[]} */
    const dirs = [];
    afterEach(() => {
        for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
    });

    /**
     * One transcript line: an assistant message running `command` through Bash at `at`.
     * @param {string} command the command
     * @param {string} at the time
     * @returns {string} the line
     */
    const bash = (command, at) =>
        JSON.stringify({
            type: "assistant",
            timestamp: at,
            message: { content: [{ type: "tool_use", name: "Bash", input: { command } }] },
        }) + "\n";

    /**
     * A projects directory holding Alice's transcript (cwd /r/a) and Bob's subagent transcript.
     * @returns {{projects: string, alice: string, bob: string}} the directory and the two files
     */
    function projectsDir() {
        const projects = mkdtempSync(join(tmpdir(), "githerd-transcripts-"));
        dirs.push(projects);
        mkdirSync(join(projects, "-r-a"), { recursive: true });
        mkdirSync(join(projects, "-r", "sb", "subagents", "workflows", "w"), { recursive: true });
        const alice = join(projects, "-r-a", "sa.jsonl");
        const bob = join(projects, "-r", "sb", "subagents", "workflows", "w", "agent-1.jsonl");
        writeFileSync(alice, bash("tmp/push-queue.sh git push -q origin HEAD:feat/x 2>&1", "2026-10-05T10:00:00Z"));
        writeFileSync(join(projects, "-r", "sb.jsonl"), '{"type":"user","message":"git push origin feat/x"}\n');
        writeFileSync(bob, bash("git push origin feat/y", "2026-10-05T11:00:00Z"));
        return { projects, alice, bob };
    }
    const sessions = [
        { ...ALICE, cwd: "/r/a" },
        { ...BOB, cwd: ROOT },
    ];

    it("reads the branch a push names, and nothing else", () => {
        expect(pushedBranches("cd w && git push -u origin HEAD:feat/a 2>&1 | tail -3")).toEqual(["feat/a"]);
        expect(pushedBranches("git -C w push origin +x:refs/heads/feat/b feat/c")).toEqual(["feat/b", "feat/c"]);
        expect(pushedBranches("gh pr create --head feat/d --title t")).toEqual(["feat/d"]);
        expect(pushedBranches("git push origin --delete feat/e; git push origin HEAD; git push")).toEqual([]);
    });

    it("gives a pull request to a live session whose transcript pushed its branch, and not to a dead one", async () => {
        const { projects } = projectsDir();
        const scans = {};
        await scanTranscripts(scans, sessions, { root: ROOT, projectsDir: projects });
        expect(scans).toMatchObject({
            sa: { pushes: { "feat/x": "2026-10-05T10:00:00Z" } },
            sb: { pushes: { "feat/y": "2026-10-05T11:00:00Z" } },
        });
        expect(inferOwners(PRS, facts({ transcripts: scans }))).toEqual({
            710: { session: "sa", name: "graphty-a", evidence: "pushed feat/x (transcript, 2026-10-05 10:00 UTC)" },
        });
        // Alice's session ends: her scan is forgotten and the pull request is free.
        await scanTranscripts(scans, [sessions[1]], { root: ROOT, projectsDir: projects });
        expect(Object.keys(scans)).toEqual(["sb"]);
        expect(inferOwners(PRS, facts({ sessions: [BOB], transcripts: scans }))).toEqual({});
        // githerd's own workers are never scanned.
        const worker = { ...ALICE, cwd: `${ROOT}/.worktrees/githerd-pr-710` };
        await scanTranscripts(scans, [worker], { root: ROOT, projectsDir: projects });
        expect(scans).toEqual({});
    });

    it("lets the push log win over a transcript, and a later logged push free it", () => {
        const transcripts = { sb: { files: {}, pushes: { "feat/x": "2026-10-05T21:50:00Z" } } };
        expect(inferOwners(PRS, facts({ pushLog: [push(ALICE)], transcripts }))["710"].session).toBe("sa");
        const later = { sb: { files: {}, pushes: { "feat/x": "2026-10-05T21:00:00Z" } } };
        expect(inferOwners(PRS, facts({ pushLog: [push(null)], transcripts: later }))).toEqual({});
    });

    it("reads on from where it stopped, within the budget, and finds a push appended later", async () => {
        const { projects, alice } = projectsDir();
        const scans = /** @type {Record<string, any>} */ ({});
        // A budget of one byte reads no whole line, so nothing is found and nothing is consumed.
        await scanTranscripts(scans, sessions, { root: ROOT, projectsDir: projects, budget: 1 });
        expect([scans.sa.pushes, scans.sb.pushes]).toEqual([{}, {}]);
        expect(Object.values({ ...scans.sa.files, ...scans.sb.files }).every((n) => n === 0)).toBe(true);
        await scanTranscripts(scans, sessions, { root: ROOT, projectsDir: projects });
        const size = readFileSync(alice).length;
        expect(scans.sa.files[""]).toBe(size);
        // Replacing what was read with junk of the same length shows it is not read again.
        writeFileSync(alice, "x".repeat(size - 1) + "\n");
        appendFileSync(alice, bash("git push origin HEAD:feat/z", "2026-10-05T12:00:00Z"));
        await scanTranscripts(scans, sessions, { root: ROOT, projectsDir: projects });
        expect(scans.sa.pushes).toEqual({ "feat/x": "2026-10-05T10:00:00Z", "feat/z": "2026-10-05T12:00:00Z" });
        expect(scans.sa.files[""]).toBe(readFileSync(alice).length);
    });
});

describe("an inferred owner in the queue", () => {
    /**
     * A state with a queued pr job on #710 and its inferred owners.
     * @param {Parameters<typeof inferOwners>[1]} f the facts
     * @returns {any} the state
     */
    function stateWith(f) {
        const job = Object.assign(newJob({ kind: "pr", target: "#710", id: "pr-710" }, NOW), { pr: 710 });
        const state = { jobs: { "pr-710": job }, prs: structuredClone(PRS) };
        return { ...state, prInferred: inferOwners(state.prs, f) };
    }

    it("keeps the pull request in use, with the evidence, and the owner reads it as its own", () => {
        const state = stateWith(facts({ pushLog: [push(ALICE)] }));
        expect(prInUse(state, 710, { now: NOW })).toBe("session graphty-a owns it (pushed 5f3a2b1 at 21:40 UTC)");
        expect(prInUse(state, 710, { now: NOW, session: "sa" })).toBe("yours: pushed 5f3a2b1 at 21:40 UTC");
    });

    it("yields to an explicit githerd_mine record", () => {
        const state = stateWith(facts({ pushLog: [push(ALICE)] }));
        state.prOwners = { 710: { session: "sb", name: "graphty-b", at: NOW.toISOString(), by: "tool" } };
        expect(prInUse(state, 710, { now: NOW })).toBe("session graphty-b owns it (it said so)");
    });

    it("sends no whose-is-this question for an inferred-owned pull request, and does for a free one", async () => {
        const sent = [];
        const opts = {
            now: NOW,
            acting: true,
            sessions: () => [
                { pid: 1, sessionId: "sa", name: "graphty-a", cwd: ROOT, socket: "/a.sock", status: "idle" },
            ],
            transport: { send: async (/** @type {string} */ s) => void sent.push(s) },
            sessionGone: () => false,
        };
        const owned = stateWith(facts({ pushLog: [push(ALICE)] }));
        expect(await askStep(owned, opts)).toEqual([]);
        expect(sent).toEqual([]);
        const free = stateWith(facts({ pushLog: [push(ALICE)], sessions: [BOB] }));
        await askStep(free, opts);
        expect(sent).toEqual(["/a.sock"]);
    });
});

describe("the push log of tools/push-queue.sh", () => {
    const script = join(import.meta.dirname, "..", "..", "tools", "push-queue.sh");
    /** @type {string[]} */
    const dirs = [];
    beforeAll(() => isolateGit());
    afterEach(() => {
        for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
    });

    /**
     * Pushes HEAD to feat/x through the queue script, with a registry entry for this test's own
     * process (an ancestor of the script) whose procStart is `procStart`.
     * @param {string} procStart the entry's procStart
     * @returns {{line: any, head: string}} the log's one line and the pushed commit
     */
    function pushWithEntry(procStart) {
        const repo = makeRepo();
        dirs.push(repo.tmp);
        const sessions = join(repo.tmp, "home", ".claude", "sessions");
        mkdirSync(sessions, { recursive: true });
        const entry = { pid: process.pid, sessionId: "s-test", name: "graphty-t", procStart };
        writeFileSync(join(sessions, `${process.pid}.json`), JSON.stringify(entry));
        execFileSync("bash", [script, "git", "push", "-q", "origin", "HEAD:feat/x"], {
            cwd: repo.root,
            env: { ...process.env, HOME: join(repo.tmp, "home"), PUSH_QUEUE_DIR: join(repo.tmp, "q") },
        });
        const lines = readFileSync(join(repo.tmp, "push-log.jsonl"), "utf8").trim().split("\n");
        expect(lines).toHaveLength(1);
        return { line: JSON.parse(lines[0]), head: git(repo.root, "rev-parse", "HEAD") };
    }

    it("names the branch, the commit and the session found up the process chain", () => {
        const { line, head } = pushWithEntry(String(identify(process.pid)?.startTime));
        expect(line).toMatchObject({ branch: "feat/x", sha: head, exit: 0, sessionId: "s-test", name: "graphty-t" });
    });

    it("names no session for a registry entry whose process start differs (a reused pid)", () => {
        const { line } = pushWithEntry("1");
        expect(line).toMatchObject({ branch: "feat/x", exit: 0, sessionId: null, name: null });
    });
});
