import { chmodSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { pushRunBranch } from "../lib/actor/push.mjs";
import { createWorktree } from "../lib/worktrees.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

const PROTECTED = [
    "visual-baselines/",
    "githerd.config.json",
    ".claude/",
    "CLAUDE.md",
    ".mcp.json",
    ".github/",
    "githerd/",
];

/**
 * Writes one file and commits it.
 * @param {string} dir the worktree
 * @param {string} path the file, relative to the worktree
 * @param {string} data its contents
 * @param {string} message the commit message
 * @param {{sign?: boolean}} [o] signing
 * @returns {string} the commit
 */
function edit(dir, path, data, message, o) {
    put(join(dir, path), data);
    return commitAll(dir, message, o);
}

/** @type {{tmp: string, root: string, remote: string}} */
let repo;
/** @type {any[]} */
let entries;
const ledger = (/** @type {any} */ e) => entries.push(e);
/** @type {string} */
let green;

beforeAll(() => isolateGit());
beforeEach(() => {
    repo = makeRepo();
    entries = [];
    green = git(repo.root, "rev-parse", "HEAD");
});
afterEach(() => rmSync(repo.tmp, { recursive: true, force: true }));

/**
 * The remote's head of a branch, or null when the remote has no such branch.
 * @param {string} branch the branch
 * @returns {string | null} its SHA
 */
function remoteHead(branch) {
    try {
        return git(repo.remote, "rev-parse", "--verify", "-q", `refs/heads/${branch}`);
    } catch {
        return null;
    }
}

/**
 * A worktree for a run on a new githerd branch from the green SHA.
 * @param {string} target the run's target
 * @returns {Promise<{dir: string, root: string, localBranch: string, branch: string, base: string}>} the
 *   worktree
 */
async function newBranchWorktree(target) {
    const r = await createWorktree({ root: repo.root, state: {}, target, greenSha: green, ledger });
    if (!r.ok) throw new Error(r.reason);
    return { dir: r.dir, root: repo.root, localBranch: r.branch, branch: r.pushBranch, base: r.base };
}

/**
 * The options of a push in acting mode with master green, for the given worktree.
 * @param {{dir: string, root: string, localBranch: string, branch: string, base: string}} wt the worktree
 * @param {Record<string, unknown>} [over] fields to replace
 * @returns {any} the options
 */
function opts(wt, over = {}) {
    return {
        ...wt,
        defaultBranch: "master",
        greenSha: green,
        run: { id: "run-1", kind: "backlog", target: "issue:643" },
        state: { master: { verdict: "green" } },
        protectedPaths: PROTECTED,
        env: {},
        mode: "acting",
        runWrites: true,
        ledger,
        ...over,
    };
}

describe("pushRunBranch on a new branch", () => {
    it("pushes a signed clean commit, records the head and logs the action", async () => {
        const wt = await newBranchWorktree("issue:643");
        put(join(wt.dir, "src/fix.txt"), "fixed\n");
        const head = commitAll(wt.dir, "fix: the thing");
        const o = opts(wt);
        const r = await pushRunBranch(o);
        expect(r).toEqual({ pushed: true, head, reasons: [] });
        expect(remoteHead(wt.branch)).toBe(head);
        expect(o.state.pushedByGitherd).toEqual({ [head]: "issue:643" });
        expect(entries.at(-1)).toMatchObject({ kind: "action", run: "run-1" });
    });

    it("pushes nothing in dry-run or with runWrites off, and records would-do", async () => {
        const wt = await newBranchWorktree("issue:643");
        put(join(wt.dir, "src/fix.txt"), "fixed\n");
        commitAll(wt.dir, "fix: the thing");
        for (const over of [{ mode: "dry-run" }, { mode: "paused" }, { runWrites: false }]) {
            const o = opts(wt, over);
            const r = await pushRunBranch(o);
            expect(r).toMatchObject({ pushed: false, wouldDo: true, reasons: [] });
            expect(o.state.pushedByGitherd).toBeUndefined();
            expect(entries.at(-1).kind).toBe("would-do");
        }
        expect(remoteHead(wt.branch)).toBeNull();
    });

    it("skips a branch with no new commits", async () => {
        const wt = await newBranchWorktree("issue:643");
        const r = await pushRunBranch(opts(wt));
        expect(r).toMatchObject({ pushed: false, reasons: [] });
        expect(entries.at(-1).kind).toBe("push-skipped");
    });

    /** Each case: what the run did wrong, the file and commit message that do it, and the reason. */
    const refusals = [
        ["an unsigned commit", "a.txt", "a\n", "fix: a", /not signed/, false],
        [
            "a Co-Authored-By line",
            "a.txt",
            "a\n",
            "fix: a\n\nCo-Authored-By: Bot <bot@example.com>",
            /message contains a Co-Authored-By line/,
        ],
        ["a Claude-Session line", "a.txt", "a\n", "fix: a\n\nClaude-Session: x", /Claude-Session/],
        ["a Generated with line", "a.txt", "a\n", "fix: a\n\nGenerated with a tool", /Generated with/],
        [
            "a change to githerd.config.json",
            "githerd.config.json",
            "{}\n",
            "fix: a",
            /protected path githerd.config.json/,
        ],
        ["a change under .claude/", ".claude/settings.json", "{}\n", "fix: a", /protected path .claude\/settings.json/],
        [
            "a new visual baseline",
            "visual-baselines/b.png",
            "new\n",
            "fix: a",
            /protected path visual-baselines\/b.png/,
        ],
        [
            "a token in the diff",
            "a.txt",
            "token = ghp_abcdefghijklmnop\n",
            "fix: a",
            /the diff contains a GitHub personal access token/,
        ],
    ];
    for (const [name, path, data, message, reason, sign = true] of refusals) {
        it(`refuses ${name}, raises a denied escalation and pushes nothing`, async () => {
            const wt = await newBranchWorktree("issue:643");
            edit(wt.dir, String(path), String(data), String(message), { sign: Boolean(sign) });
            const o = opts(wt);
            const r = await pushRunBranch(o);
            expect(r.pushed).toBe(false);
            expect(r.reasons.join("\n")).toMatch(reason);
            expect(remoteHead(wt.branch)).toBeNull();
            expect(o.state.escalations["push-denied:run-1"]).toMatchObject({ kind: "denied", target: "issue:643" });
            expect(entries.at(-1).kind).toBe("push-refused");
        });
    }

    it("refuses a secret value from the daemon's environment", async () => {
        const wt = await newBranchWorktree("issue:643");
        put(join(wt.dir, "a.txt"), "x=s3cretvalue123\n");
        commitAll(wt.dir, "fix: a");
        const r = await pushRunBranch(opts(wt, { env: { NPM_TOKEN: "s3cretvalue123" } }));
        expect(r.reasons).toEqual(["the diff contains the value of environment variable NPM_TOKEN"]);
    });

    it("does not scan lines the run removed", async () => {
        put(join(repo.root, "old.txt"), "-----BEGIN fixture\n");
        green = commitAll(repo.root, "test: fixture");
        const wt = await newBranchWorktree("issue:643");
        rmSync(join(wt.dir, "old.txt"));
        commitAll(wt.dir, "test: drop fixture");
        expect((await pushRunBranch(opts(wt))).pushed).toBe(true);
    });

    it("refuses the default branch, a foreign branch and a base other than the green SHA", async () => {
        const wt = await newBranchWorktree("issue:643");
        put(join(wt.dir, "a.txt"), "a\n");
        commitAll(wt.dir, "fix: a");
        expect((await pushRunBranch(opts(wt, { branch: "master" }))).reasons).toContain(
            "the branch is the default branch master",
        );
        expect((await pushRunBranch(opts(wt, { branch: "feat/other" }))).reasons.join()).toMatch(/neither githerd/);
        put(join(repo.root, "b.txt"), "b\n");
        const newer = commitAll(repo.root, "chore: b");
        expect((await pushRunBranch(opts(wt, { greenSha: newer }))).reasons.join()).toMatch(
            /must start at the green SHA/,
        );
        expect(remoteHead("master")).toBe(green);
    });

    it("refuses while master is red unless this is the open incident's master-red run", async () => {
        const wt = await newBranchWorktree("master");
        put(join(wt.dir, "a.txt"), "a\n");
        commitAll(wt.dir, "fix: master");
        const red = { verdict: "red" };
        const refused = await pushRunBranch(opts(wt, { state: { master: red } }));
        expect(refused.reasons.join()).toMatch(/master is red/);
        const incident = { status: "open", runs: [{ run: "run-9" }] };
        const run = { id: "run-9", kind: "master-red", target: "master" };
        const ok = await pushRunBranch(opts(wt, { run, state: { master: red, incidents: { i: incident } } }));
        expect(ok.pushed).toBe(true);
    });

    it("refuses a branch whose history no longer contains its base", async () => {
        const wt = await newBranchWorktree("issue:643");
        const r = await pushRunBranch(opts(wt, { base: "0".repeat(40) }));
        expect(r.reasons.join()).toMatch(/no longer contains its base/);
    });

    it("never runs what the run put in its worktree's .git file or hook directory", async () => {
        git(repo.root, "config", "core.hooksPath", ".husky/_");
        const wt = await newBranchWorktree("issue:643");
        put(join(wt.dir, "a.txt"), "a\n");
        const head = commitAll(wt.dir, "fix: a");
        const marker = join(repo.tmp, "ran");
        const script = join(repo.tmp, "evil.sh");
        put(script, `#!/bin/sh\ntouch ${marker}\n`);
        chmodSync(script, 0o755);
        for (const hook of ["reference-transaction", "pre-push", "post-checkout"]) {
            put(join(wt.dir, ".husky/_", hook), `#!/bin/sh\ntouch ${marker}\n`);
            chmodSync(join(wt.dir, ".husky/_", hook), 0o755);
            put(join(repo.root, ".husky/_", hook), `#!/bin/sh\ntouch ${marker}\n`);
            chmodSync(join(repo.root, ".husky/_", hook), 0o755);
        }
        const fake = join(wt.dir, "x");
        put(join(fake, "HEAD"), "ref: refs/heads/master\n");
        put(join(fake, "config"), `[core]\n\tfsmonitor = ${script}\n[gpg]\n\tprogram = ${script}\n`);
        writeFileSync(join(wt.dir, ".git"), `gitdir: ${fake}\n`);

        const r = await pushRunBranch(opts(wt));
        expect(r).toEqual({ pushed: true, head, reasons: [] });
        expect(remoteHead(wt.branch)).toBe(head);
        expect(existsSync(marker)).toBe(false);
    });

    it("turns a rejected push into a denied escalation", async () => {
        const wt = await newBranchWorktree("issue:643");
        put(join(wt.dir, "a.txt"), "a\n");
        commitAll(wt.dir, "fix: a");
        const r = await pushRunBranch(opts(wt, { remote: join(repo.tmp, "missing.git") }));
        expect(r.pushed).toBe(false);
        expect(r.reasons[0]).toMatch(/git push failed/);
    });
});

describe("pushRunBranch on a pull request branch", () => {
    /**
     * Puts a pull request branch that changed a visual baseline on the remote, moves master on by
     * changing the same baseline, and opens a githerd worktree on the pull request.
     * @param {string} kind the run's kind
     * @returns {Promise<any>} the push options and the old green SHA
     */
    async function prSetup(kind) {
        const old = green;
        git(repo.root, "branch", "feat/pr", green);
        const scratch = join(repo.tmp, "scratch");
        git(repo.root, "worktree", "add", "-q", scratch, "feat/pr");
        put(join(scratch, "visual-baselines/a.png"), "pr-version\n");
        commitAll(scratch, "feat: new look");
        git(scratch, "push", "-q", "origin", "feat/pr");
        git(repo.root, "worktree", "remove", scratch);
        put(join(repo.root, "visual-baselines/a.png"), "master-version\n");
        green = commitAll(repo.root, "chore: accept");
        const r = await createWorktree({
            root: repo.root,
            state: {},
            target: "pr:704",
            greenSha: green,
            prBranch: "feat/pr",
            ledger,
        });
        if (!r.ok) throw new Error(r.reason);
        const o = opts(
            { dir: r.dir, root: repo.root, localBranch: r.branch, branch: r.pushBranch, base: r.base },
            { prBranch: "feat/pr", run: { id: "run-2", kind, target: "pr:704" } },
        );
        return { o, old };
    }

    it("passes a merge of the green SHA that takes master's bytes for the visual baseline", async () => {
        const { o } = await prSetup("pr-conflict");
        expect(() => git(o.dir, "merge", "-q", green)).toThrow();
        put(join(o.dir, "visual-baselines/a.png"), "master-version\n");
        git(o.dir, "add", "-A");
        git(o.dir, "commit", "-S", "-q", "--no-edit");
        const r = await pushRunBranch(o);
        expect(r.reasons).toEqual([]);
        expect(r.pushed).toBe(true);
        expect(remoteHead("feat/pr")).toBe(r.head);
    });

    it("refuses a merge that writes a baseline matching neither side's bytes", async () => {
        const { o } = await prSetup("pr-conflict");
        expect(() => git(o.dir, "merge", "-q", green)).toThrow();
        put(join(o.dir, "visual-baselines/a.png"), "run-version\n");
        git(o.dir, "add", "-A");
        git(o.dir, "commit", "-S", "-q", "--no-edit");
        expect((await pushRunBranch(o)).reasons.join()).toMatch(/protected path visual-baselines\/a.png/);
    });

    it("refuses a merge whose parent is not the given green SHA", async () => {
        const { o } = await prSetup("pr-conflict");
        put(join(repo.root, "c.txt"), "c\n");
        const other = commitAll(repo.root, "chore: c");
        expect(() => git(o.dir, "merge", "-q", other)).toThrow();
        put(join(o.dir, "visual-baselines/a.png"), "master-version\n");
        git(o.dir, "add", "-A");
        git(o.dir, "commit", "-S", "-q", "--no-edit");
        const r = await pushRunBranch(o);
        expect(r.reasons.join()).toMatch(/not the green SHA/);
        expect(r.reasons.join()).toMatch(/must merge the green SHA/);
        expect(remoteHead("feat/pr")).not.toBe(r.head);
    });

    it("lets a pr-fix run restore a baseline to the green SHA's bytes", async () => {
        const { o } = await prSetup("pr-fix");
        put(join(o.dir, "visual-baselines/a.png"), "master-version\n");
        commitAll(o.dir, "fix: take master's baseline");
        const r = await pushRunBranch(o);
        expect(r).toMatchObject({ pushed: true, reasons: [] });
    });
});
