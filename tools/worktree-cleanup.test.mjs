// Tests of tools/worktree-cleanup.mjs on throwaway repositories: a bare "origin" and a main checkout
// whose finished worktrees are removed or kept.
//
//   node tools/worktree-cleanup.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, describe, it } from "node:test";

import { isolateGit } from "./isolated-git-env.mjs";
import { cleanup, KEEP } from "./worktree-cleanup.mjs";

isolateGit();

let tmp;
let root;
let home;
const children = [];

function git(cwd, ...args) {
    const r = spawnSync("git", args, { cwd, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
}

function put(path, data) {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, data);
}

beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "worktree-cleanup-"));
    root = join(tmp, "root");
    home = join(tmp, "home");
    mkdirSync(home);
    git(tmp, "init", "-q", "--bare", "-b", "master", "remote.git");
    git(tmp, "clone", "-q", join(tmp, "remote.git"), "root");
    put(join(root, "README"), "r\n");
    put(join(root, ".gitignore"), "node_modules/\ntmp/\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "init");
    git(root, "push", "-q", "origin", "master");
});

after(() => {
    for (const c of children) process.kill(-c.pid, "SIGKILL");
    rmSync(tmp, { recursive: true, force: true });
});

const dir = (name) => join(root, ".worktrees", name);

/**
 * A worktree on a new branch with one commit, merged into master with a merge commit and pushed.
 * @param name the branch and directory name
 * @returns the worktree
 */
function mergedTree(name) {
    const d = dir(name);
    git(root, "worktree", "add", "-q", "-b", name, d, "master");
    put(join(d, `${name}.txt`), "work\n");
    git(d, "add", "-A");
    git(d, "commit", "-q", "-m", `feat: ${name}`);
    git(root, "merge", "-q", "--no-ff", "--no-edit", name);
    git(root, "push", "-q", "origin", "master");
    return d;
}

const pass = (o = {}) => cleanup({ root, apply: true, max: 50, recentHours: 0, home, log: () => {}, ...o });

describe("worktree-cleanup", () => {
    it("removes a clean merged worktree, keeps its ignored tmp/ and deletes its merged branch", () => {
        const d = mergedTree("done");
        put(join(d, "node_modules/x.js"), "rebuildable\n");
        put(join(d, "tmp/notes.txt"), "scratch\n");
        const r = pass();
        assert.deepEqual(r.removed, [d]);
        assert.equal(existsSync(d), false);
        assert.equal(git(root, "branch", "--list", "done"), "");
        assert.equal(readFileSync(join(root, "tmp/worktree-tmp/done/notes.txt"), "utf8"), "scratch\n");
        assert.match(readFileSync(join(root, "tmp/worktree-cleanup/log.jsonl"), "utf8"), /"worktree-removed"/);
    });

    it("removes a detached worktree at a commit already in master", () => {
        const d = dir("scratch");
        git(root, "worktree", "add", "-q", "--detach", d, "master");
        assert.deepEqual(pass().removed, [d]);
    });

    it("leaves alone a branch that is neither merged nor gone, and a fresh branch with no commits", () => {
        const open = dir("open");
        git(root, "worktree", "add", "-q", "-b", "open", open, "master");
        put(join(open, "x.txt"), "x\n");
        git(open, "add", "-A");
        git(open, "commit", "-q", "-m", "feat: open");
        git(open, "push", "-q", "origin", "open");
        git(root, "worktree", "add", "-q", "-b", "fresh", dir("fresh"), "master");
        const r = pass();
        assert.deepEqual(r.removed, []);
        assert.deepEqual(r.kept, {});
        assert.match(r.text, /2 not finished/);
    });

    it("keeps a merged worktree with untracked files", () => {
        const d = mergedTree("dirty");
        put(join(d, "notes.txt"), "mine\n");
        assert.deepEqual(pass().kept, { [KEEP.dirty]: 1 });
        assert.equal(existsSync(join(d, "notes.txt")), true);
    });

    it("keeps a worktree whose branch is gone from origin but has a commit no remote has", () => {
        const d = dir("gone");
        git(root, "worktree", "add", "-q", "-b", "gone", d, "master");
        put(join(d, "a.txt"), "a\n");
        git(d, "add", "-A");
        git(d, "commit", "-q", "-m", "feat: pushed");
        git(d, "push", "-q", "-u", "origin", "gone");
        put(join(d, "b.txt"), "b\n");
        git(d, "add", "-A");
        git(d, "commit", "-q", "-m", "feat: never pushed");
        git(root, "push", "-q", "origin", "--delete", "gone");
        assert.deepEqual(pass().kept, { [KEEP.unpushed]: 1 });
        assert.equal(existsSync(d), true);
    });

    it("keeps a worktree a live process has its cwd in", () => {
        const d = mergedTree("busy");
        children.push(spawn("sleep", ["600"], { cwd: d, detached: true, stdio: "ignore" }));
        assert.deepEqual(pass().kept, { [KEEP.process]: 1 });
    });

    it("keeps a live tool's worktree, a servherd server's cwd, a locked one and a taken branch", () => {
        mergedTree("tool");
        const served = mergedTree("served");
        const locked = mergedTree("locked");
        mergedTree("taken");
        git(root, "worktree", "lock", locked);
        put(join(root, "tools/live-tools.json"), JSON.stringify({ t: { worktree: ".worktrees/tool" } }));
        put(join(home, ".servherd/registry.json"), JSON.stringify({ servers: [{ cwd: join(served, "pkg") }] }));
        put(join(root, "tmp/pipeline-round/state.json"), '{"m":"taken branch taken, session x"}');
        const r = pass();
        assert.deepEqual(r.removed, []);
        assert.deepEqual(r.kept, { [KEEP.tool]: 2, [KEEP.locked]: 1, [KEEP.held]: 1 });
    });

    it("keeps a worktree with recent git activity", () => {
        mergedTree("recent");
        assert.deepEqual(pass({ recentHours: 3 }).kept, { [KEEP.recent]: 1 });
    });

    it("removes at most max a run and in a dry run removes nothing", () => {
        const dirs = ["c1", "c2", "c3"].map(mergedTree);
        const dry = pass({ apply: false });
        assert.deepEqual(dry.would, dirs);
        assert.equal(
            dirs.every((d) => existsSync(d)),
            true,
        );
        const r = pass({ max: 2 });
        assert.deepEqual(r.removed, dirs.slice(0, 2));
        assert.equal(r.waiting, 1);
        assert.match(r.text, /1 more wait for the next run/);
    });
});
