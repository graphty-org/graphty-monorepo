import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import {
    branchHolders,
    jobWorktreeDir,
    prepareJobWorktree,
    removeJobWorktree,
    signingProbe,
} from "../lib/worktrees.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

/** @type {{tmp: string, root: string, remote: string}} */
let repo;
/** @type {any[]} */
let entries;
const ledger = (/** @type {any} */ e) => entries.push(e);
/** @type {string} */
let green;

/**
 * A step that appends its name and two environment variables to `steps.log` in the worktree.
 * @param {string} name the step
 * @param {string} [extra] more JavaScript to run after it
 * @returns {string[]} the argument vector
 */
const step = (name, extra = "") => [
    process.execPath,
    "-e",
    `require('fs').appendFileSync('steps.log', JSON.stringify(['${name}', process.env.NX_CACHE_DIRECTORY ?? null, process.env.NX_DAEMON]) + '\\n');${extra}`,
];
const STEPS = { install: step("install"), build: step("build"), smoke: step("smoke") };

beforeAll(() => isolateGit());
beforeEach(() => {
    repo = makeRepo();
    // The steps' log is build output, ignored like node_modules and dist are in the real repository.
    put(join(repo.root, ".gitignore"), "/.worktrees/\nsteps.log\ndist/\n");
    green = commitAll(repo.root, "chore: ignore build output");
    git(repo.root, "push", "-q", "origin", "master");
    entries = [];
});
afterEach(() => rmSync(repo.tmp, { recursive: true, force: true }));

/**
 * The worktrees git knows, with their lock reasons.
 * @returns {Map<string, string | null>} directory to lock reason (null when unlocked)
 */
function worktrees() {
    const out = new Map();
    for (const block of git(repo.root, "worktree", "list", "--porcelain").split("\n\n")) {
        const lines = block.split("\n");
        const locked = lines.find((l) => l.startsWith("locked"));
        out.set(lines[0].slice("worktree ".length), locked ? locked.slice("locked ".length) : null);
    }
    return out;
}

/**
 * Pushes a branch with one commit on top of green, and points the remote's `refs/pull/<n>/head` at it.
 * @param {string} branch the branch
 * @param {number} n the pull request number
 * @returns {string} its head
 */
function pushPr(branch, n) {
    const dir = join(repo.tmp, `pr-${n}`);
    git(repo.root, "worktree", "add", "-q", "-b", branch, dir, green);
    put(join(dir, "fix.txt"), `fix ${n}\n`);
    const sha = commitAll(dir, `fix: ${branch}`);
    git(dir, "push", "-q", "origin", branch);
    git(repo.remote, "update-ref", `refs/pull/${n}/head`, sha);
    git(repo.root, "worktree", "remove", dir);
    git(repo.root, "branch", "-q", "-D", branch);
    return sha;
}

describe("prepareJobWorktree", () => {
    it("adds a detached, locked worktree at the green commit and runs install, build and smoke in order", async () => {
        const env = { ...process.env, NX_CACHE_DIRECTORY: "/elsewhere" };
        const r = await prepareJobWorktree({
            root: repo.root,
            job: "issue-643",
            sha: green,
            steps: STEPS,
            env,
            ledger,
        });
        const dir = join(repo.root, ".worktrees", "githerd-issue-643");
        expect(r).toEqual({ verdict: "ready", dir, sha: green });
        expect(jobWorktreeDir(repo.root, "issue-643")).toBe(dir);
        expect(git(dir, "rev-parse", "HEAD")).toBe(green);
        expect(git(dir, "branch", "--show-current")).toBe("");
        expect(worktrees().get(dir)).toBe("githerd job issue-643");
        const log = readFileSync(join(dir, "steps.log"), "utf8")
            .trim()
            .split("\n")
            .map((l) => JSON.parse(l));
        expect(log).toEqual([
            ["install", null, "false"],
            ["build", null, "false"],
            ["smoke", null, "false"],
        ]);
        expect(entries).toEqual([{ kind: "job-worktree-ready", job: "issue-643", dir, sha: green }]);
    });

    it("fetches a pull request's head by its ref and detaches there", async () => {
        const head = pushPr("feat/x", 7);
        const r = await prepareJobWorktree({
            root: repo.root,
            job: "pr-7",
            sha: head,
            ref: "refs/pull/7/head",
            branch: "feat/x",
            steps: STEPS,
            ledger,
        });
        expect(r).toMatchObject({ verdict: "ready", sha: head });
        expect(git(jobWorktreeDir(repo.root, "pr-7"), "rev-parse", "HEAD")).toBe(head);
    });

    it("does not start a pr job whose branch a worktree holds with uncommitted or unpushed work", async () => {
        const head = pushPr("feat/y", 8);
        const owner = join(repo.tmp, "owner");
        git(repo.root, "fetch", "-q", "origin", "feat/y:refs/remotes/origin/feat/y");
        git(repo.root, "worktree", "add", "-q", "-b", "feat/y", owner, head);
        const prepare = () =>
            prepareJobWorktree({ root: repo.root, job: "pr-8", sha: head, branch: "feat/y", steps: STEPS, ledger });

        // Clean and pushed: no holder.
        expect(await branchHolders({ root: repo.root, branch: "feat/y" })).toEqual([]);

        put(join(owner, "wip.txt"), "wip\n");
        expect(await prepare()).toEqual({ verdict: "held", holders: [{ dir: owner, dirty: true, unpushed: 0 }] });

        commitAll(owner, "wip: more");
        expect(await prepare()).toEqual({ verdict: "held", holders: [{ dir: owner, dirty: false, unpushed: 1 }] });
        expect(existsSync(jobWorktreeDir(repo.root, "pr-8"))).toBe(false);
        expect(entries.filter((e) => e.kind === "job-worktree-held")).toHaveLength(2);
    });

    it("is a fault, and leaves no worktree, when the smoke test fails", async () => {
        const steps = { ...STEPS, smoke: [process.execPath, "-e", "console.error('smoke broke'); process.exit(3)"] };
        const r = await prepareJobWorktree({ root: repo.root, job: "issue-1", sha: green, steps, ledger });
        expect(r).toMatchObject({ verdict: "faulted", step: "smoke", dir: null });
        expect(r.verdict === "faulted" && r.reason).toMatch(/^smoke exited 3: .*smoke broke/s);
        expect(existsSync(jobWorktreeDir(repo.root, "issue-1"))).toBe(false);
        expect(worktrees().size).toBe(1);
        expect(entries.map((e) => e.kind)).toEqual(["job-worktree-removed", "job-worktree-faulted"]);
    });

    it("is a fault when the build leaves a built package without dist", async () => {
        put(join(repo.root, "pkg", "package.json"), JSON.stringify({ scripts: { build: "x" } }));
        green = commitAll(repo.root, "feat: a package");
        const r = await prepareJobWorktree({ root: repo.root, job: "issue-2", sha: green, steps: STEPS, ledger });
        expect(r).toMatchObject({ verdict: "faulted", step: "build", reason: "build left no dist in pkg" });

        const steps = { ...STEPS, build: step("build", "require('fs').mkdirSync('pkg/dist')") };
        expect(await prepareJobWorktree({ root: repo.root, job: "issue-2", sha: green, steps, ledger })).toMatchObject({
            verdict: "ready",
        });
    });

    it("is a fault when the commit cannot be fetched or the directory exists", async () => {
        const missing = "0123456789abcdef0123456789abcdef01234567";
        expect(
            await prepareJobWorktree({ root: repo.root, job: "j", sha: missing, steps: STEPS, ledger }),
        ).toMatchObject({ verdict: "faulted", step: "fetch", dir: null });
        mkdirSync(jobWorktreeDir(repo.root, "j"), { recursive: true });
        expect(await prepareJobWorktree({ root: repo.root, job: "j", sha: green, steps: STEPS, ledger })).toMatchObject(
            {
                verdict: "faulted",
                step: "worktree add",
                dir: jobWorktreeDir(repo.root, "j"),
            },
        );
    });

    it("names the worktree it could not remove after a failed step", async () => {
        const steps = {
            ...STEPS,
            smoke: [process.execPath, "-e", "require('fs').writeFileSync('stray', ''); process.exit(1)"],
        };
        const r = await prepareJobWorktree({ root: repo.root, job: "issue-3", sha: green, steps, ledger });
        const dir = jobWorktreeDir(repo.root, "issue-3");
        expect(r).toMatchObject({ verdict: "faulted", step: "smoke", dir });
        expect(r.verdict === "faulted" && r.reason).toMatch(/not removed: .*untracked/);
        expect(worktrees().get(dir)).toBe("githerd job issue-3");
    });
});

describe("removeJobWorktree", () => {
    /**
     * Prepares a job's worktree and returns its directory.
     * @param {string} job the job id
     * @returns {Promise<string>} the worktree
     */
    async function prepared(job) {
        const r = await prepareJobWorktree({ root: repo.root, job, sha: green, steps: STEPS, ledger });
        if (r.verdict !== "ready") throw new Error(JSON.stringify(r));
        return r.dir;
    }

    it("unlocks and removes a clean worktree with nothing unpushed", async () => {
        const dir = await prepared("issue-4");
        expect(await removeJobWorktree({ root: repo.root, job: "issue-4", base: green, ledger })).toEqual({
            ok: true,
            salvage: null,
        });
        expect(existsSync(dir)).toBe(false);
        expect(await removeJobWorktree({ root: repo.root, job: "issue-4", base: green, ledger })).toEqual({
            ok: true,
            salvage: null,
        });
    });

    it("refuses unpushed commits unless salvaging, then keeps them on a salvage branch", async () => {
        const dir = await prepared("issue-5");
        put(join(dir, "work.txt"), "work\n");
        const work = commitAll(dir, "feat: work");

        const refused = await removeJobWorktree({ root: repo.root, job: "issue-5", base: green, ledger });
        expect(refused).toEqual({ ok: false, reason: "1 unpushed commits on its head" });
        expect(worktrees().get(dir)).toBe("githerd job issue-5");

        git(repo.root, "branch", "githerd/issue-5-salvage", green);
        const r = await removeJobWorktree({ root: repo.root, job: "issue-5", base: green, salvage: true, ledger });
        expect(r).toEqual({ ok: true, salvage: "githerd/issue-5-salvage-2" });
        expect(git(repo.root, "rev-parse", "githerd/issue-5-salvage-2")).toBe(work);
        expect(existsSync(dir)).toBe(false);
    });

    it("never forces: a worktree with uncommitted changes stays, locked again", async () => {
        const dir = await prepared("issue-6");
        writeFileSync(join(dir, "README.md"), "changed\n");
        const r = await removeJobWorktree({ root: repo.root, job: "issue-6", base: green, ledger });
        expect(r.ok).toBe(false);
        expect(existsSync(join(dir, "README.md"))).toBe(true);
        expect(worktrees().get(dir)).toBe("githerd job issue-6");
        expect(entries.at(-1)).toMatchObject({ kind: "job-worktree-remove-failed", job: "issue-6" });
    });

    it("refuses when it cannot tell what is unpushed", async () => {
        await prepared("issue-9");
        const r = await removeJobWorktree({ root: repo.root, job: "issue-9", base: "nonexistent", ledger });
        expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("rev-list") });
    });
});

describe("signingProbe", () => {
    /**
     * A worker-like environment: a home with an identity, PATH, and the signing variables.
     * @param {Record<string, string>} signing the GIT_CONFIG_* variables
     * @returns {Record<string, string>} the environment
     */
    function workerLikeEnv(signing) {
        const home = join(repo.tmp, "home");
        put(join(home, ".gitconfig"), "[user]\n\tname = Worker\n\temail = test@example.com\n");
        return { HOME: home, PATH: /** @type {string} */ (process.env.PATH), ...signing };
    }

    it("passes with the SSH signing variables", async () => {
        const env = workerLikeEnv({
            GIT_CONFIG_COUNT: "2",
            GIT_CONFIG_KEY_0: "gpg.format",
            GIT_CONFIG_VALUE_0: "ssh",
            GIT_CONFIG_KEY_1: "user.signingkey",
            GIT_CONFIG_VALUE_1: join(repo.tmp, "key"),
        });
        expect(await signingProbe({ env })).toEqual({ ok: true });
    });

    it("fails, and says why, when the key cannot sign", async () => {
        const env = workerLikeEnv({
            GIT_CONFIG_COUNT: "2",
            GIT_CONFIG_KEY_0: "gpg.format",
            GIT_CONFIG_VALUE_0: "ssh",
            GIT_CONFIG_KEY_1: "user.signingkey",
            GIT_CONFIG_VALUE_1: join(repo.tmp, "no-such-key"),
        });
        const r = await signingProbe({ env });
        expect(r).toMatchObject({ ok: false, reason: expect.stringMatching(/^git commit-tree -S failed: /) });
    });

    it("fails when git is not on the PATH", async () => {
        expect(await signingProbe({ env: { PATH: "/nonexistent" } })).toMatchObject({ ok: false });
    });
});
