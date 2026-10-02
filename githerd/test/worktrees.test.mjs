import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { createWorktree, removeWorktree, slug } from "../lib/worktrees.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

const LIB = fileURLToPath(new URL("../lib/", import.meta.url));

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
 * Pushes a pull request branch to the remote from a scratch worktree, then removes it.
 * @param {string} name the branch
 * @param {Record<string, string>} files repository-relative path to contents
 * @returns {string} the branch head
 */
function pushPrBranch(name, files) {
    const dir = join(repo.tmp, `pr-${slug(name)}`);
    git(repo.root, "worktree", "add", "-q", "-b", name, dir, green);
    for (const [p, data] of Object.entries(files)) put(join(dir, p), data);
    const sha = commitAll(dir, `fix: ${name}`);
    git(dir, "push", "-q", "origin", name);
    git(repo.root, "worktree", "remove", dir);
    git(repo.root, "branch", "-q", "-D", name);
    return sha;
}

describe("createWorktree", () => {
    it("creates a githerd branch from the green SHA, records it and runs the setup command", async () => {
        const state = {};
        const setup = [process.execPath, "-e", "require('fs').writeFileSync('setup-ran', process.cwd())"];
        const r = await createWorktree({ root: repo.root, state, target: "issue:643", greenSha: green, setup, ledger });
        expect(r).toMatchObject({
            ok: true,
            branch: "githerd/issue-643-1",
            pushBranch: "githerd/issue-643-1",
            base: green,
        });
        const dir = join(repo.root, ".worktrees", "githerd-issue-643");
        expect(r.ok && r.dir).toBe(dir);
        expect(readFileSync(join(dir, "setup-ran"), "utf8")).toBe(dir);
        expect(state.worktrees[dir]).toMatchObject({ createdBy: "githerd", for: "issue:643", base: green });
        expect(entries.map((e) => e.kind)).toEqual(["worktree-created"]);
    });

    it("numbers the branch past ones that already exist and refuses a directory already in use", async () => {
        git(repo.root, "branch", "githerd/master-1", green);
        const state = {};
        const r = await createWorktree({ root: repo.root, state, target: "master", greenSha: green, ledger });
        expect(r.ok && r.branch).toBe("githerd/master-2");
        const again = await createWorktree({ root: repo.root, state, target: "master", greenSha: green, ledger });
        expect(again).toMatchObject({ ok: false, dir: null });
    });

    it("reports a failing setup command and keeps the worktree recorded for removal", async () => {
        const state = {};
        const setup = [process.execPath, "-e", "console.error('lockfile mismatch'); process.exit(3)"];
        const r = await createWorktree({ root: repo.root, state, target: "pr:9", greenSha: green, setup, ledger });
        expect(r.ok).toBe(false);
        expect(!r.ok && r.reason).toMatch(/exited 3: lockfile mismatch/);
        expect(Object.keys(state.worktrees)).toHaveLength(1);
        expect(entries.at(-1).kind).toBe("worktree-failed");
    });

    it("checks out a pull request branch, with its head as the base", async () => {
        const head = pushPrBranch("feat/x", { "src/a.txt": "a\n" });
        const state = {};
        const r = await createWorktree({
            root: repo.root,
            state,
            target: "pr:704",
            greenSha: green,
            prBranch: "feat/x",
            ledger,
        });
        expect(r).toMatchObject({ ok: true, branch: "githerd/pr-704-1", pushBranch: "feat/x", base: head });
    });

    it("gives no run to a pull request that changed .claude/, a CLAUDE.md or .mcp.json, and skips setup", async () => {
        for (const [name, file] of [
            ["feat/claude-dir", ".claude/settings.json"],
            ["feat/nested-claude-md", "pkg/CLAUDE.md"],
            ["feat/root-claude-md", "CLAUDE.md"],
            ["feat/mcp", ".mcp.json"],
        ]) {
            pushPrBranch(name, { [file]: "steer\n" });
            const state = {};
            const setup = [process.execPath, "-e", "require('fs').writeFileSync('setup-ran', '')"];
            const r = await createWorktree({
                root: repo.root,
                state,
                target: `pr:${name}`,
                greenSha: green,
                prBranch: name,
                setup,
                ledger,
            });
            expect(r.ok, name).toBe(false);
            expect(!r.ok && r.reason).toContain(file);
            expect(existsSync(join(r.dir, "setup-ran"))).toBe(false);
        }
    });

    it("does not blame a pull request for steering files master changed after it branched", async () => {
        pushPrBranch("feat/old", { "src/a.txt": "a\n" });
        put(join(repo.root, "CLAUDE.md"), "new rules\n");
        const newGreen = commitAll(repo.root, "docs: rules");
        git(repo.root, "push", "-q", "origin", "master");
        const r = await createWorktree({
            root: repo.root,
            state: {},
            target: "pr:1",
            greenSha: newGreen,
            prBranch: "feat/old",
            ledger,
        });
        expect(r.ok).toBe(true);
    });

    it("fails without recording anything when the pull request branch does not exist", async () => {
        const state = {};
        const r = await createWorktree({
            root: repo.root,
            state,
            target: "pr:2",
            greenSha: green,
            prBranch: "gone",
            ledger,
        });
        expect(r).toMatchObject({ ok: false, dir: null });
        expect(state).toEqual({ worktrees: {} });
    });
});

describe("removeWorktree", () => {
    it("removes a recorded worktree and forgets it", async () => {
        const state = {};
        const r = await createWorktree({ root: repo.root, state, target: "pr:5", greenSha: green, ledger });
        const dir = r.ok ? r.dir : "";
        expect(await removeWorktree({ root: repo.root, state, dir, ledger })).toEqual({ ok: true });
        expect(existsSync(dir)).toBe(false);
        expect(state.worktrees).toEqual({});
    });

    it("never touches a worktree githerd did not create", async () => {
        const dir = join(repo.tmp, "mine");
        git(repo.root, "worktree", "add", "-q", "-b", "mine", dir, green);
        const r = await removeWorktree({ root: repo.root, state: {}, dir, ledger });
        expect(r.ok).toBe(false);
        expect(existsSync(dir)).toBe(true);
        expect(entries).toEqual([]);
    });

    it("does not force a dirty worktree, logs the failure once and does not retry", async () => {
        const state = {};
        const r = await createWorktree({ root: repo.root, state, target: "pr:6", greenSha: green, ledger });
        const dir = r.ok ? r.dir : "";
        put(join(dir, "README.md"), "edited\n");
        entries = [];
        expect((await removeWorktree({ root: repo.root, state, dir, ledger })).ok).toBe(false);
        expect((await removeWorktree({ root: repo.root, state, dir, ledger })).ok).toBe(false);
        expect(entries.map((e) => e.kind)).toEqual(["worktree-remove-failed"]);
        expect(readFileSync(join(dir, "README.md"), "utf8")).toBe("edited\n");
        expect(state.worktrees[dir].removeFailed.reason).toBeTruthy();
    });
});

describe("source scan", () => {
    it("no library code runs git stash, reset, checkout, clean or rebase, or forces a removal or push", () => {
        /** @type {string[]} */
        const files = [];
        const walk = (/** @type {string} */ d) => {
            for (const name of readdirSync(d)) {
                const p = join(d, name);
                if (statSync(p).isDirectory()) walk(p);
                else if (p.endsWith(".mjs")) files.push(p);
            }
        };
        walk(LIB);
        const banned = /["'](stash|reset|checkout|clean|rebase|--force|--force-with-lease)["']/;
        const hits = files.flatMap((f) =>
            readFileSync(f, "utf8")
                .split("\n")
                .map((line, i) => [f, i + 1, line])
                .filter(([, , line]) => banned.test(String(line))),
        );
        expect(hits).toEqual([]);
        expect(files.some((f) => f.endsWith("worktrees.mjs"))).toBe(true);
        expect(files.some((f) => f.endsWith(join("actor", "push.mjs")))).toBe(true);
    });
});
