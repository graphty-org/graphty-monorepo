// Tests of tools/land.mjs on throwaway repositories: a bare "origin" and a main checkout with the golden
// worktree, a push that is a plain `git push` (no gate) and a fake GitHub that records its calls.
//
//   node tools/land.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import { acquireLock, context, issueRefs, landedBranches, main, prBody, readLock, sync } from "./land.mjs";

const dir = mkdtempSync(join(tmpdir(), "land-"));
const repo = join(dir, "main");
const other = join(dir, "other");
const env = isolatedGitEnv();
after(() => rmSync(dir, { recursive: true, force: true }));

const git = (cwd, ...args) => {
    const r = spawnSync("git", args, { cwd, env, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
};
const write = (cwd, file, text) => writeFileSync(join(cwd, file), text);
// A local branch in the main repository, one commit off `base`, as an agent's worktree leaves it.
const branch = (name, files, message, base = "origin/master") => {
    const wt = join(dir, `wt-${name.replace(/\//g, "-")}`);
    git(repo, "worktree", "add", "-q", "-b", name, wt, base);
    for (const [f, text] of Object.entries(files)) write(wt, f, text);
    git(wt, "add", ".");
    git(wt, "commit", "-q", "-m", message);
    return wt;
};

let gh;
let previews;
let pushResult;
let ctx;
const golden = join(repo, ".worktrees/golden-local");
const run = async (...argv) => {
    const out = [];
    const log = console.log;
    const err = console.error;
    console.log = (...a) => out.push(a.join(" "));
    console.error = (...a) => out.push(a.join(" "));
    try {
        return { code: await main(argv, ctx), out: out.join("\n") };
    } finally {
        console.log = log;
        console.error = err;
    }
};
const head = () => git(golden, "rev-parse", "HEAD");
const originGolden = () =>
    spawnSync("git", ["rev-parse", "-q", "--verify", "refs/heads/golden"], {
        cwd: join(dir, "origin.git"),
        env,
        encoding: "utf8",
    }).stdout.trim();

before(() => {
    git(dir, "init", "-q", "--bare", "-b", "master", "origin.git");
    git(dir, "clone", "-q", join(dir, "origin.git"), "main");
    write(repo, ".gitignore", ".worktrees/\ntmp/\n");
    write(repo, "a.txt", "one\n");
    git(repo, "add", ".");
    git(repo, "commit", "-q", "-m", "base");
    git(repo, "push", "-q", "origin", "master");
    git(dir, "clone", "-q", join(dir, "origin.git"), "other");
    ctx = context(repo, {
        env,
        gh: (_ctx, args) => {
            gh.push(args);
            if (args[1] === "list")
                return JSON.stringify(gh.open ? [{ number: 7, isDraft: true, url: "u/pull/7" }] : []);
            if (args[1] === "create") {
                gh.body = readFileSync(args[args.indexOf("--body-file") + 1], "utf8");
                return "https://github.com/o/r/pull/7";
            }
            if (args[1] === "edit") gh.body = readFileSync(args[args.indexOf("--body-file") + 1], "utf8");
            return "";
        },
        push: async (c) => {
            if (pushResult !== 0) return { code: pushResult, output: "gate failed: tmp/push-gate-logs/x.log" };
            const r = spawnSync("git", ["push", "-q", "origin", "golden:golden"], {
                cwd: c.golden,
                env,
                encoding: "utf8",
            });
            return { code: r.status, output: r.stderr };
        },
        preview: (_ctx, pr) => previews.push(pr),
        addWorktree: (c, base) => git(c.main, "worktree", "add", "-q", "-b", "golden", c.golden, base),
        lockOptions: { pollMs: 10 },
    });
});

beforeEach(() => {
    gh = [];
    previews = [];
    pushResult = 0;
});

describe("the lock", () => {
    const lock = join(dir, "locks/lock");

    it("is taken, released, and waited for while another live process holds it", async () => {
        const release = await acquireLock(lock, { command: "land", branch: "a" });
        assert.equal(readLock(lock).pid, process.pid);
        release();
        assert.equal(readLock(lock), null);

        mkdirSync(lock, { recursive: true });
        write(lock, "owner.json", JSON.stringify({ pid: process.ppid, host: (await import("node:os")).hostname() }));
        const waited = [];
        let told;
        const telling = new Promise((r) => (told = r));
        const onWait = (o) => waited.push(o.pid) && told();
        const taking = acquireLock(lock, { command: "land" }, { pollMs: 5, onWait });
        await telling;
        assert.equal(readLock(lock).pid, process.ppid, "still the other holder's");
        rmSync(lock, { recursive: true });
        (await taking)();
        assert.deepEqual(waited, [process.ppid], "told once who held it");
    });

    it("takes over a lock whose holder is gone", async () => {
        mkdirSync(lock, { recursive: true });
        write(lock, "owner.json", JSON.stringify({ pid: 2 ** 22 + 1, host: (await import("node:os")).hostname() }));
        const release = await acquireLock(
            lock,
            { command: "land" },
            { pollMs: 5, onWait: () => assert.fail("waited") },
        );
        assert.equal(readLock(lock).pid, process.pid);
        release();
    });
});

describe("landing", () => {
    it("--dry-run makes the golden worktree, merges, reports, and leaves golden and GitHub untouched", async () => {
        branch("feat/a", { "a.txt": "two\n" }, "feat: a\n\nFixes #12");
        const r = await run("land", "feat/a", "--dry-run");
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /dry run -- feat\/a merges cleanly/);
        assert.match(r.out, /land: feat\/a/);
        assert.equal(head(), git(repo, "rev-parse", "origin/master"));
        assert.equal(gh.length, 0);
        assert.equal(originGolden(), "");
        assert.equal(readLock(ctx.lock), null, "the lock is released");
    });

    it("merges, pushes, opens the draft pull request with the issue references, and starts the preview", async () => {
        const r = await run("land", "feat/a");
        assert.equal(r.code, 0, r.out);
        assert.equal(git(golden, "log", "-1", "--format=%s"), "land: feat/a");
        assert.equal(originGolden(), head());
        const create = gh.find((a) => a[1] === "create");
        assert.ok(create.includes("--draft") && create.includes("chore: land golden into master"));
        assert.match(gh.body, /### feat\/a\n\n- feat: a\n/);
        assert.match(gh.body, /\nFixes #12\n/);
        assert.doesNotMatch(gh.body, /No issue/);
        assert.deepEqual(previews, [7]);
    });

    it("syncs master's new commits into golden before landing", async () => {
        write(other, "b.txt", "master\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "chore: on master");
        git(other, "push", "-q", "origin", "master");
        assert.equal(sync(ctx), null);
        assert.ok(existsSync(join(golden, "b.txt")));
    });

    it("refuses a conflicting branch with exit 2, golden unchanged, and says what to do", async () => {
        branch("feat/b", { "a.txt": "three\n" }, "feat: b");
        const before = head();
        const r = await run("land", "feat/b");
        assert.equal(r.code, 2, r.out);
        assert.equal(head(), before);
        assert.match(r.out, /a\.txt/);
        assert.match(r.out, /git merge golden/);
        assert.match(r.out, /node tools\/land\.mjs land feat\/b/);
        assert.equal(gh.length, 0);
    });

    it("puts golden back and exits 3 when the gate refuses the push", async () => {
        branch("feat/c", { "c.txt": "c\n" }, "feat: c");
        gh.open = true;
        const before = head();
        pushResult = 1;
        const r = await run("land", "feat/c");
        assert.equal(r.code, 3, r.out);
        assert.equal(head(), before);
        assert.match(r.out, /gate log: tmp\/push-gate-logs\/x\.log/);
        assert.equal(gh.length, 0);
    });
});

describe("revert", () => {
    it("reverts the branch's land merge, pushes, and drops its issues from the description", async () => {
        gh.open = true;
        const r = await run("revert", "feat/a");
        assert.equal(r.code, 0, r.out);
        assert.equal(git(golden, "log", "-1", "--format=%s"), 'Revert "land: feat/a"');
        assert.equal(readFileSync(join(golden, "a.txt"), "utf8"), "one\n");
        assert.equal(originGolden(), head());
        assert.ok(gh.some((a) => a[1] === "edit"));
        assert.match(gh.body, /Reverted from golden: `feat\/a`/);
        assert.match(gh.body, /\nNo issue\n/);
        assert.deepEqual(previews, [7]);
    });

    it("lands the same branch again with its earlier commits back, not only its new ones", async () => {
        const wt = join(dir, "wt-feat-a");
        write(wt, "d.txt", "fix\n");
        git(wt, "add", ".");
        git(wt, "commit", "-q", "-m", "fix: a again");
        gh.open = true;
        const r = await run("land", "feat/a");
        assert.equal(r.code, 0, r.out);
        assert.equal(readFileSync(join(golden, "a.txt"), "utf8"), "two\n");
        assert.ok(existsSync(join(golden, "d.txt")));
        const landed = landedBranches(ctx, golden).filter((e) => !e.reverted);
        assert.deepEqual(
            landed.map((e) => e.branch),
            ["feat/a", "feat/a"],
        );
        assert.match(gh.body, /\nFixes #12\n/);
    });

    it("refuses a branch that is not landed", async () => {
        const r = await run("revert", "feat/nothing");
        assert.equal(r.code, 1);
        assert.match(r.out, /no landing of feat\/nothing/);
    });
});

describe("the pull request description", () => {
    it("lists each landed branch with its commits and every issue reference once", () => {
        const body = prBody([
            { branch: "x", reverted: null, subjects: ["feat: x"], refs: ["Fixes #1", "Refs #2"] },
            { branch: "y", reverted: null, subjects: ["fix: y"], refs: ["Fixes #1"] },
            { branch: "z", reverted: "abc", subjects: ["feat: z"], refs: ["Closes #9"] },
        ]);
        assert.match(body, /### x\n\n- feat: x\n/);
        assert.match(body, /### y\n\n- fix: y\n/);
        assert.match(body, /Reverted from golden: `z`/);
        assert.equal(body.match(/Fixes #1/g).length, 1);
        assert.doesNotMatch(body, /#9|No issue/);
    });

    it('says "No issue" when no landed commit names one', () => {
        assert.match(prBody([{ branch: "x", reverted: null, subjects: ["chore: x"], refs: [] }]), /\nNo issue\n/);
    });

    it("reads the closing and the referencing keywords from commit messages", () => {
        assert.deepEqual(
            issueRefs("fix: a\n\nfixes #3, Closes: #4\nResolved owner/repo#5\nRefs #6\nPart of #7\nsee #8"),
            ["Fixes #3", "Closes #4", "Resolves owner/repo#5", "Refs #6", "Part of #7"],
        );
    });
});

describe("ship", () => {
    it("marks the golden pull request ready with auto-merge when GitHub has what golden has", async () => {
        gh.open = true;
        const r = await run("ship");
        assert.equal(r.code, 0, r.out);
        assert.deepEqual(
            gh.filter((a) => a[1] !== "list"),
            [
                ["pr", "ready", "7"],
                ["pr", "merge", "7", "--auto", "--merge"],
            ],
        );
    });

    it("refuses while local golden has commits GitHub does not", async () => {
        write(golden, "e.txt", "local\n");
        git(golden, "add", ".");
        git(golden, "commit", "-q", "-m", "chore: local only");
        gh.open = true;
        const r = await run("ship");
        assert.equal(r.code, 1);
        assert.match(r.out, /differ/);
        assert.equal(gh.length, 0);
    });
});
