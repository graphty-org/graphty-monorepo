import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { cleanupWorktrees, KEEP } from "../lib/worktree-cleanup.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

/** @type {{tmp: string, root: string, remote: string}} */
let repo;
/** @type {any[]} */
let entries;
/** @type {import("node:child_process").ChildProcess[]} */
let children;
/** @type {import("../lib/worktree-cleanup.mjs").Seen} */
let seen;

beforeAll(() => isolateGit());
beforeEach(() => {
    repo = makeRepo();
    entries = [];
    children = [];
    seen = { fp: new Map(), would: "" };
});
afterEach(async () => {
    for (const c of children) {
        if (c.exitCode === null && c.signalCode === null) {
            const exited = once(c, "exit");
            process.kill(-(/** @type {number} */ (c.pid)), "SIGKILL");
            await exited;
        }
        expect(c.signalCode ?? c.exitCode).not.toBeNull();
    }
    rmSync(repo.tmp, { recursive: true, force: true });
});

const dir = (/** @type {string} */ name) => join(repo.root, ".worktrees", name);

/**
 * A worktree on a new branch with one commit, merged into master (a merge commit) and pushed.
 * @param {string} name the branch and directory name
 * @returns {string} the worktree
 */
function mergedTree(name) {
    const d = dir(name);
    git(repo.root, "worktree", "add", "-q", "-b", name, d, "master");
    put(join(d, `${name}.txt`), "work\n");
    commitAll(d, `feat: ${name}`);
    git(repo.root, "merge", "-q", "--no-ff", "--no-edit", name);
    git(repo.root, "push", "-q", "origin", "master");
    return d;
}

/**
 * Two passes, as two polls: the first records each worktree's activity, the second acts.
 * @param {Partial<Parameters<typeof cleanupWorktrees>[0]>} [options] overrides
 * @returns {ReturnType<typeof cleanupWorktrees>} the second pass
 */
async function twoPolls(options = {}) {
    const opts = {
        root: repo.root,
        base: "origin/master",
        acting: true,
        removePerPoll: 25,
        seen,
        ledger: (/** @type {any} */ e) => entries.push(e),
        ...options,
    };
    await cleanupWorktrees(opts);
    return cleanupWorktrees(opts);
}

describe("cleanupWorktrees", () => {
    it("removes a clean merged worktree on the poll after it was first seen, and deletes its merged branch", async () => {
        const d = mergedTree("done");
        const first = await cleanupWorktrees({
            root: repo.root,
            base: "origin/master",
            acting: true,
            removePerPoll: 25,
            seen,
            ledger: (e) => entries.push(e),
        });
        expect(first.removed).toEqual([]);
        expect(first.kept).toEqual({ [KEEP.changed]: 1 });
        const r = await cleanupWorktrees({
            root: repo.root,
            base: "origin/master",
            acting: true,
            removePerPoll: 25,
            seen,
            ledger: (e) => entries.push(e),
        });
        expect(r.removed.map((x) => x.dir)).toEqual([d]);
        expect(existsSync(d)).toBe(false);
        expect(git(repo.root, "branch", "--list", "done")).toBe("");
        expect(entries).toContainEqual(
            expect.objectContaining({ kind: "worktree-removed", dir: d, branchDeleted: true }),
        );
        expect(r.text).toContain("removed 1");
    });

    it("removes a detached worktree at a commit already in master", async () => {
        const d = dir("scratch");
        git(repo.root, "worktree", "add", "-q", "--detach", d, "master");
        const r = await twoPolls();
        expect(r.removed.map((x) => x.dir)).toEqual([d]);
        expect(existsSync(d)).toBe(false);
    });

    it("leaves alone a worktree whose branch is neither merged nor gone", async () => {
        const d = dir("open");
        git(repo.root, "worktree", "add", "-q", "-b", "open", d, "master");
        put(join(d, "x.txt"), "x\n");
        commitAll(d, "feat: open");
        git(d, "push", "-q", "origin", "open");
        const r = await twoPolls();
        expect(r.removed).toEqual([]);
        expect(r.kept).toEqual({});
        expect(existsSync(d)).toBe(true);
    });

    it("keeps a merged worktree with untracked files", async () => {
        const d = mergedTree("dirty");
        put(join(d, "notes.txt"), "mine\n");
        const r = await twoPolls();
        expect(r.removed).toEqual([]);
        expect(r.kept).toEqual({ [KEEP.dirty]: 1 });
        expect(existsSync(join(d, "notes.txt"))).toBe(true);
    });

    it("keeps a worktree whose branch is gone from origin but has a commit no remote has", async () => {
        const d = dir("gone");
        git(repo.root, "worktree", "add", "-q", "-b", "gone", d, "master");
        put(join(d, "a.txt"), "a\n");
        commitAll(d, "feat: pushed");
        git(d, "push", "-q", "-u", "origin", "gone");
        put(join(d, "b.txt"), "b\n");
        commitAll(d, "feat: never pushed");
        git(repo.root, "push", "-q", "origin", "--delete", "gone");
        const r = await twoPolls();
        expect(r.kept).toEqual({ [KEEP.unpushed]: 1 });
        expect(existsSync(d)).toBe(true);
    });

    it("keeps a worktree a live process has its cwd in", async () => {
        const d = mergedTree("busy");
        const child = spawn("sleep", ["600"], { cwd: d, detached: true, stdio: "ignore" });
        children.push(child);
        const r = await twoPolls();
        expect(r.kept).toEqual({ [KEEP.process]: 1 });
        expect(existsSync(d)).toBe(true);
    });

    it("keeps a worktree a job names by directory or branch", async () => {
        const a = mergedTree("job-dir");
        const b = mergedTree("job-branch");
        const r = await twoPolls({ holds: { dirs: [a], branches: ["job-branch"] } });
        expect(r.kept).toEqual({ [KEEP.held]: 2 });
        expect(existsSync(a) && existsSync(b)).toBe(true);
    });

    it("keeps a live tool's worktree and a locked one", async () => {
        const tool = mergedTree("tool");
        const locked = mergedTree("locked");
        git(repo.root, "worktree", "lock", locked);
        put(join(repo.root, "tools", "live-tools.json"), JSON.stringify({ t: { worktree: ".worktrees/tool" } }));
        const r = await twoPolls();
        expect(r.kept).toEqual({ [KEEP.tool]: 1, [KEEP.locked]: 1 });
        expect(existsSync(tool) && existsSync(locked)).toBe(true);
    });

    it("keeps a worktree that changed between the two polls", async () => {
        const d = mergedTree("moving");
        const opts = {
            root: repo.root,
            base: "origin/master",
            acting: true,
            removePerPoll: 25,
            seen,
            ledger: (/** @type {any} */ e) => entries.push(e),
        };
        await cleanupWorktrees(opts);
        git(d, "switch", "-q", "--detach", "HEAD~1");
        const r = await cleanupWorktrees(opts);
        expect(r.kept).toEqual({ [KEEP.changed]: 1 });
        expect(existsSync(d)).toBe(true);
    });

    it("removes at most removePerPoll a poll and leaves the rest for the next", async () => {
        const dirs = ["c1", "c2", "c3"].map(mergedTree);
        const r = await twoPolls({ removePerPoll: 2 });
        expect(r.removed.map((x) => x.dir)).toEqual(dirs.slice(0, 2));
        expect(r.unchecked).toBe(1);
        expect(existsSync(dirs[2])).toBe(true);
        expect(r.text).toContain("1 more wait for the next polls");
    });

    it("in dry-run removes nothing and writes the batch as would-do lines once", async () => {
        const dirs = ["d1", "d2"].map(mergedTree);
        const r = await twoPolls({ acting: false });
        await twoPolls({ acting: false });
        expect(r.removed).toEqual([]);
        expect(r.would).toEqual(dirs);
        expect(dirs.every((d) => existsSync(d))).toBe(true);
        expect(entries.filter((e) => e.kind === "would-do")).toHaveLength(2);
        expect(entries.some((e) => e.kind === "worktree-removed")).toBe(false);
        expect(git(repo.root, "branch", "--list", "d1")).not.toBe("");
        expect(r.text).toContain("would remove 2 (dry-run)");
    });
});
