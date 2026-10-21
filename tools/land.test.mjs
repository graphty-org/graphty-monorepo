// Tests of tools/land.mjs on throwaway repositories: a bare "origin" and a main checkout with the golden
// worktree, a push that is a plain `git push` (no gate) and a fake GitHub that records its calls.
//
//   node tools/land.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";
import {
    acquireLock,
    context,
    defaultPreview,
    handOff,
    issueRefs,
    landedBranches,
    main,
    prBody,
    readLock,
    sync,
} from "./land.mjs";

const dir = mkdtempSync(join(tmpdir(), "land-"));
const repo = join(dir, "main");
const other = join(dir, "other");
const env = isolatedGitEnv();
// A landing runs this file through its own hand-off to the live copy, which marks the environment;
// the tests' land.mjs must not inherit that mark, or it never hands off itself.
delete env.LAND_LIVE;
delete env.LAND_LIVE_COPY;
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
let pushResult; // an exit code, or a function of the context that returns one
let pushes;
let duringPush; // runs once inside the next push, as if the gate were running
let installed = null; // the lockfile golden's node_modules were last installed from
let installs = [];
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
            const cut = args.includes("golden-cut");
            if (args[1] === "list") {
                const pr = cut ? gh.cut : gh.open && { number: 7, isDraft: true, url: "u/pull/7" };
                return JSON.stringify(pr ? [pr] : []);
            }
            if (args[1] === "create") {
                gh.body = readFileSync(args[args.indexOf("--body-file") + 1], "utf8");
                return `https://github.com/o/r/pull/${cut ? 9 : 7}`;
            }
            if (isEdit(args)) gh.body = readFileSync(args.find((a) => a.startsWith("body=@")).slice(6), "utf8");
            return "";
        },
        push: async (c, cwd = c.golden, refspec = "golden:golden") => {
            pushes++;
            const during = duringPush;
            duringPush = null;
            during?.();
            const result = typeof pushResult === "function" ? pushResult(c) : pushResult;
            if (result !== 0) return { code: result, output: "gate failed: tmp/push-gate-logs/x.log" };
            const r = spawnSync("git", ["push", "-q", "origin", refspec], {
                cwd,
                env,
                encoding: "utf8",
            });
            return { code: r.status, output: r.stderr };
        },
        preview: (_ctx, pr) => previews.push(pr),
        addWorktree: (c, base) => git(c.main, "worktree", "add", "-q", "-b", "golden", c.golden, base),
        addCutWorktree: (c, sha) => git(c.main, "worktree", "add", "-q", "-b", "golden-cut", c.cut, sha),
        install: (c) => {
            installed = readFileSync(join(c.golden, "pnpm-lock.yaml"), "utf8");
            installs.push(installed.trim());
        },
        lockOptions: { pollMs: 10 },
    });
});

beforeEach(() => {
    gh = [];
    previews = [];
    pushResult = 0;
    pushes = 0;
    duringPush = null;
    installs = [];
});

/**
 * Whether a fake gh call is the description update (a REST PATCH of the pull request).
 * @param args the gh arguments
 * @returns true for the update
 */
const isEdit = (args) => args[0] === "api" && args.includes("PATCH");

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

    const queue = `${lock}.queue`;
    const quiet = { pollMs: 5, onWait: () => {}, onQueue: () => {} };

    it("grants it to waiters in the order they asked for it", async () => {
        mkdirSync(lock, { recursive: true });
        write(lock, "owner.json", JSON.stringify({ pid: process.ppid, host: (await import("node:os")).hostname() }));
        const order = [];
        const places = [];
        // The last to ask looks most often, so plain polling would let it in first.
        const waiter = (name, pollMs, onQueue = () => {}) =>
            acquireLock(lock, { command: "land", branch: name }, { ...quiet, pollMs, onQueue }).then((release) => {
                order.push(name);
                release();
            });
        const all = [waiter("a", 30), waiter("b", 10), waiter("c", 1, (n) => places.push(n))];
        rmSync(lock, { recursive: true });
        await Promise.all(all);
        assert.deepEqual(order, ["a", "b", "c"]);
        assert.equal(places[0], 3, "the last to ask starts third in line");
        assert.deepEqual(readdirSync(queue), []);
    });

    it("lets priority waiters in first, each lane in its own arrival order, never ahead of the holder", async () => {
        mkdirSync(lock, { recursive: true });
        write(lock, "owner.json", JSON.stringify({ pid: process.ppid, host: (await import("node:os")).hostname() }));
        const order = [];
        const waiter = (name, priority) =>
            acquireLock(lock, { command: "land", branch: name }, { ...quiet, priority }).then((release) => {
                order.push(name);
                release();
            });
        const all = [waiter("a", false), waiter("p1", true), waiter("b", false), waiter("p2", true)];
        assert.equal(readLock(lock).pid, process.ppid, "the holder keeps the lock");
        rmSync(lock, { recursive: true });
        await Promise.all(all);
        assert.deepEqual(order, ["p1", "p2", "a", "b"]);
    });

    it("--priority puts a landing's ticket in the priority lane", async () => {
        mkdirSync(lock, { recursive: true });
        write(lock, "owner.json", JSON.stringify({ pid: process.ppid, host: (await import("node:os")).hostname() }));
        const taking = acquireLock(lock, { command: "land" }, { ...quiet, priority: true });
        const seen = readdirSync(queue);
        rmSync(lock, { recursive: true });
        (await taking)();
        assert.equal(seen.length, 1);
        assert.match(seen[0], /^0-\d{20}-\d+\.json$/);
    });

    it("skips and removes the ticket of a waiter that is gone", async () => {
        mkdirSync(queue, { recursive: true });
        const dead = join(queue, `${"1".padStart(20, "0")}-${2 ** 22 + 1}.json`);
        write(queue, dead.slice(queue.length + 1), "{}\n");
        const release = await acquireLock(lock, { command: "land" }, quiet);
        assert.equal(readLock(lock).pid, process.pid);
        assert.ok(!existsSync(dead));
        release();
    });

    it("removes a waiter's ticket once it holds the lock", async () => {
        const release = await acquireLock(lock, { command: "land" }, quiet);
        const tickets = readdirSync(queue);
        release();
        assert.deepEqual(tickets, []);
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

    it("refuses a conflicting branch with exit 2, golden unchanged (no sync merge left), and says what to do", async () => {
        branch("feat/b", { "a.txt": "three\n" }, "feat: b");
        write(other, "b2.txt", "master again\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "chore: on master again");
        git(other, "push", "-q", "origin", "master");
        const before = head();
        const r = await run("land", "feat/b");
        assert.equal(r.code, 2, r.out);
        assert.equal(head(), before);
        assert.match(r.out, /a\.txt/);
        assert.match(r.out, /git merge origin\/golden/);
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

    it("says what git said, with exit 1, when a commit-msg hook refuses the land merge", async () => {
        branch("feat/h", { "h.txt": "h\n" }, "feat: h");
        mkdirSync(join(golden, ".husky"), { recursive: true });
        writeFileSync(
            join(golden, ".husky/commit-msg"),
            "#!/bin/sh\ngrep -q '^land:' \"$1\" || exit 0\necho 'subject refused' >&2\nexit 1\n",
            {
                mode: 0o755,
            },
        );
        const before = head();
        try {
            const r = await run("land", "feat/h");
            assert.equal(r.code, 1, r.out);
            assert.match(r.out, /not a conflict/);
            assert.match(r.out, /subject refused/);
            assert.equal(head(), before);
        } finally {
            rmSync(join(golden, ".husky"), { recursive: true, force: true });
        }
    });

    it("merges and pushes again when the owner pushed to golden on GitHub during the gate", async () => {
        branch("feat/m", { "m.txt": "m\n" }, "feat: m");
        gh.open = true;
        duringPush = () => {
            git(other, "fetch", "-q", "origin");
            git(other, "checkout", "-q", "-B", "golden", "origin/golden");
            write(other, "accept.txt", "ok\n");
            git(other, "add", ".");
            git(other, "commit", "-q", "-m", "chore(visual-review): accept");
            git(other, "push", "-q", "origin", "golden");
            git(other, "checkout", "-q", "master");
        };
        const r = await run("land", "feat/m");
        assert.equal(r.code, 0, r.out);
        assert.equal(pushes, 2);
        assert.match(r.out, /golden moved on GitHub/);
        assert.equal(originGolden(), head());
        assert.ok(existsSync(join(golden, "accept.txt")) && existsSync(join(golden, "m.txt")));
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
        assert.ok(gh.some((a) => isEdit(a)));
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
        const landed = landedBranches(ctx, golden).filter((e) => !e.reverted && e.branch === "feat/a");
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

describe("landing several branches", () => {
    const landSubjects = (n) => git(golden, "log", "--first-parent", `-${n}`, "--format=%s").split("\n");
    // The gate refuses any golden that holds bad.txt.
    const badGate = (c) => (existsSync(join(c.golden, "bad.txt")) ? 1 : 0);

    it("merges each in order with its own land merge and pushes once", async () => {
        branch("multi/a", { "ma.txt": "a\n" }, "feat: ma\n\nFixes #21");
        branch("multi/b", { "mb.txt": "b\n" }, "feat: mb");
        gh.open = true;
        const r = await run("land", "multi/a", "multi/b");
        assert.equal(r.code, 0, r.out);
        assert.equal(pushes, 1);
        assert.deepEqual(landSubjects(2), ["land: multi/b", "land: multi/a"]);
        assert.equal(originGolden(), head());
        assert.match(r.out, /multi\/a\s+landed\n\s+multi\/b\s+landed/);
        assert.equal(gh.filter((a) => isEdit(a)).length, 1, "the description is refreshed once");
        assert.match(gh.body, /### multi\/a\n/);
        assert.match(gh.body, /\nFixes #21\n/);
        assert.deepEqual(previews, [7]);
    });

    it("skips a conflicting branch and one already on golden, lands the rest, and exits 2", async () => {
        branch("multi/x", { "ma.txt": "conflict\n" }, "feat: x");
        branch("multi/c", { "mc.txt": "c\n" }, "feat: mc");
        gh.open = true;
        const r = await run("land", "multi/x", "multi/c", "multi/a");
        assert.equal(r.code, 2, r.out);
        assert.equal(pushes, 1);
        assert.equal(landSubjects(1)[0], "land: multi/c");
        assert.equal(readFileSync(join(golden, "ma.txt"), "utf8"), "a\n");
        assert.equal(originGolden(), head());
        assert.match(r.out, /multi\/x\s+conflict/);
        assert.match(r.out, /multi\/a\s+already on golden/);
        assert.match(r.out, /git merge origin\/golden/);
        assert.deepEqual(previews, [7]);
    });

    it("halves to the branch the gate refuses, lands the rest, and exits 3", async () => {
        branch("multi/d", { "md.txt": "d\n" }, "feat: md");
        branch("multi/e", { "bad.txt": "e\n" }, "feat: me");
        branch("multi/f", { "mf.txt": "f\n" }, "feat: mf");
        gh.open = true;
        pushResult = badGate;
        const r = await run("land", "multi/d", "multi/e", "multi/f");
        assert.equal(r.code, 3, r.out);
        // d e f refused; d e refused; d lands; e refused; f lands.
        assert.equal(pushes, 5);
        assert.ok(existsSync(join(golden, "md.txt")) && existsSync(join(golden, "mf.txt")));
        assert.ok(!existsSync(join(golden, "bad.txt")));
        assert.deepEqual(landSubjects(2), ["land: multi/f", "land: multi/d"]);
        assert.equal(originGolden(), head());
        assert.match(r.out, /multi\/e\s+gate failure, log: tmp\/push-gate-logs\/x\.log/);
        assert.equal(gh.filter((a) => isEdit(a)).length, 1);
        assert.deepEqual(previews, [7]);
    });

    it("installs each half's own lockfile, so a half without the lockfile change is not blamed", async () => {
        branch("multi/lock1", { "pnpm-lock.yaml": "1\n" }, "chore: lock 1");
        assert.equal((await run("land", "multi/lock1")).code, 0);
        branch("multi/n", { "mn.txt": "n\n" }, "feat: mn", "origin/golden");
        branch("multi/o", { "bad.txt": "o\n" }, "feat: mo", "origin/golden");
        branch("multi/p", { "pnpm-lock.yaml": "2\n" }, "chore: lock 2", "origin/golden");
        // As the gate's first check: node_modules must match the checkout's lockfile.
        const lockGate = (c) => (readFileSync(join(c.golden, "pnpm-lock.yaml"), "utf8") !== installed ? 1 : badGate(c));
        pushResult = lockGate;
        const r = await run("land", "multi/n", "multi/o", "multi/p");
        assert.equal(r.code, 3, r.out);
        assert.match(r.out, /multi\/n\s+landed\n\s+multi\/o\s+gate failure.*\n\s+multi\/p\s+landed/);
        // lock1; the whole batch (2); n and o (back to 1); p (2).
        assert.deepEqual(installs, ["1", "2", "1", "2"]);
    });

    it("skips a first branch that is already on golden and lands the ones after it", async () => {
        branch("multi/q", { "mq.txt": "q\n" }, "feat: mq");
        gh.open = true;
        const r = await run("land", "multi/a", "multi/q");
        assert.equal(r.code, 0, r.out);
        assert.equal(landSubjects(1)[0], "land: multi/q");
        assert.equal(originGolden(), head());
        assert.match(r.out, /multi\/a\s+already on golden\n\s+multi\/q\s+landed/);
    });

    it("exits 5 when a conflict and a gate failure each keep a branch out, golden as it was", async () => {
        branch("multi/g", { "mc.txt": "conflict\n" }, "feat: g");
        branch("multi/h", { "bad.txt": "h\n" }, "feat: h");
        pushResult = badGate;
        const before = head();
        const r = await run("land", "multi/g", "multi/h");
        assert.equal(r.code, 5, r.out);
        assert.equal(pushes, 1);
        assert.equal(head(), before);
        assert.match(r.out, /multi\/g\s+conflict\n\s+multi\/h\s+gate failure/);
        assert.equal(gh.length, 0);
    });
});

describe("cuts", () => {
    const remote = (ref) =>
        spawnSync("git", ["rev-parse", "-q", "--verify", ref], {
            cwd: join(dir, "origin.git"),
            env,
            encoding: "utf8",
        }).stdout.trim();
    const firstParents = () => {
        git(repo, "fetch", "-q", "origin");
        return git(repo, "rev-list", "--first-parent", "origin/master..origin/golden").split("\n");
    };
    // A finished local preview of `head` under tmp/visual-review/local/<key>, one project with these statuses.
    const preview = (key, head, statuses, state = "done") => {
        const d = join(repo, "tmp/visual-review/local", String(key));
        mkdirSync(join(d, "graphty"), { recursive: true });
        write(d, "status.json", JSON.stringify({ state, head, projects: ["graphty"] }));
        const items = statuses.map((status, i) => ({ file: `s${i}.png`, status }));
        write(join(d, "graphty"), "results.json", JSON.stringify({ complete: true, items }));
    };

    it("refuses when no golden commit has a stable preview and no commit is given", async () => {
        const r = await run("cut");
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /no golden commit since master has a finished screenshot preview/);
        assert.equal(pushes, 0);
    });

    it("refuses a commit that is not on origin/golden", async () => {
        const r = await run("cut", git(repo, "rev-parse", "multi/x"));
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /is not on origin\/golden/);
        assert.equal(pushes, 0);
        assert.equal(gh.length, 0);
    });

    it("cuts the newest golden commit whose preview has no unstable or failed images, and opens its pull request", async () => {
        const line = firstParents();
        preview("101", line[0], ["changed", "unstable"]);
        preview("commit-x", line[1], ["unchanged", "changed"]);
        preview("102", line[2], ["unchanged"]);
        const r = await run("cut");
        assert.equal(r.code, 0, r.out);
        assert.equal(remote("refs/heads/golden-cut"), line[1]);
        assert.equal(git(ctx.cut, "rev-parse", "HEAD"), line[1]);
        const create = gh.find((a) => a[1] === "create");
        assert.ok(create.includes("--draft") && create.includes("chore: ship a golden cut into master"));
        assert.match(gh.body, /A cut of `golden` at .*Approvals that ship are made here/);
        assert.deepEqual(previews, [9]);
    });

    it("moves the cut worktree to a newer stable commit and refreshes the open pull request", async () => {
        const line = firstParents();
        preview("101", line[0], ["unchanged"]);
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: line[1] };
        const r = await run("cut");
        assert.equal(r.code, 0, r.out);
        assert.equal(remote("refs/heads/golden-cut"), line[0]);
        const edit = gh.find((a) => isEdit(a));
        assert.ok(edit.includes("title=chore: ship a golden cut into master"));
        assert.deepEqual(previews, [9]);
    });

    it("ship marks the cut pull request ready with auto-merge when its preview is of its head", async () => {
        const head = remote("refs/heads/golden-cut");
        preview("9", head, ["changed"]);
        gh.open = true;
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: head };
        const r = await run("ship");
        assert.equal(r.code, 0, r.out);
        assert.deepEqual(
            gh.filter((a) => a[1] !== "list"),
            [
                ["pr", "ready", "9"],
                ["pr", "merge", "9", "--auto", "--merge"],
            ],
        );
    });

    it("ship counts a preview as current across a Finish's own commits, and only those", async () => {
        const previewed = remote("refs/heads/golden-cut");
        preview("9", previewed, ["changed"]);
        // The owner's Finish on the cut: an accept commit and an approval commit.
        git(other, "fetch", "-q", "origin");
        git(other, "checkout", "-q", "-B", "finish", "origin/golden-cut");
        mkdirSync(join(other, "visual-baselines/p"), { recursive: true });
        write(other, "visual-baselines/p/s0.png", "png\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "test(workspace): accept visual baselines for #9");
        mkdirSync(join(other, "visual-review-approvals"), { recursive: true });
        write(other, "visual-review-approvals/t.json", "{}\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "test(workspace): approve the visual baselines of #9");
        git(other, "push", "-q", "origin", "finish:golden-cut");
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: git(other, "rev-parse", "HEAD") };
        const r = await run("ship");
        assert.equal(r.code, 0, r.out);
        assert.ok(gh.some((a) => a[1] === "ready"));

        // A commit that changes anything else needs a new preview.
        write(other, "visual-baselines/p/s1.png", "png\n");
        write(other, "code.txt", "x\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "test(workspace): accept visual baselines for #9");
        git(other, "push", "-q", "origin", "finish:golden-cut");
        gh.cut = { ...gh.cut, headRefOid: git(other, "rev-parse", "HEAD") };
        gh.length = 0;
        const moved = await run("ship");
        assert.equal(moved.code, 1, moved.out);
        assert.match(moved.out, /#9 moved since its preview/);
        git(other, "checkout", "-q", "master");
    });

    it("ship never waits behind a landing's lock, and refuses while a cut is pushing", async () => {
        const head = remote("refs/heads/golden-cut");
        preview("9", head, ["changed"]);
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: head };
        const hold = (dir) => {
            mkdirSync(dir, { recursive: true });
            write(dir, "owner.json", JSON.stringify({ pid: process.pid, host: hostname(), since: "now" }));
        };
        hold(ctx.lock);
        const saved = ctx.lockOptions;
        ctx.lockOptions = {
            pollMs: 10,
            onWait: () => {
                throw new Error("ship waited for the landing lock");
            },
        };
        try {
            const r = await run("ship");
            assert.equal(r.code, 0, r.out);
            hold(ctx.cutLock);
            gh.length = 0;
            const cutting = await run("ship");
            assert.equal(cutting.code, 1, cutting.out);
            assert.match(cutting.out, /a cut is pushing golden-cut now/);
            assert.equal(gh.length, 0);
        } finally {
            ctx.lockOptions = saved;
            rmSync(ctx.lock, { recursive: true, force: true });
            rmSync(ctx.cutLock, { recursive: true, force: true });
        }
    });

    it("the preview it starts waits for GitHub to list the pushed commit as the head", async () => {
        const fake = join(dir, "fake-preview");
        mkdirSync(join(fake, "tools"), { recursive: true });
        const called = join(fake, "called");
        writeFileSync(
            join(fake, "tools/visual-preview.sh"),
            `#!/bin/sh\necho "$@" > ${called}.tmp\nmv ${called}.tmp ${called}\n`,
            {
                mode: 0o755,
            },
        );
        git(dir, "init", "-q", fake);
        git(fake, "commit", "-q", "--allow-empty", "-m", "x");
        defaultPreview(ctx, 42, fake);
        const sha = git(fake, "rev-parse", "HEAD");
        while (!existsSync(called)) await new Promise((r) => setImmediate(r));
        assert.equal(readFileSync(called, "utf8"), `42 --expect ${sha}\n`);
    });

    it("ship refuses when the cut pull request moved since its preview", async () => {
        const line = firstParents();
        preview("9", line[1], ["changed"]);
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: line[0] };
        const r = await run("ship");
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /#9 moved since its preview/);
        assert.equal(gh.filter((a) => a[1] !== "list").length, 0);
    });
});

describe("the main checkout", () => {
    // A new commit on GitHub's master, made from the other clone.
    const advanceMaster = (name) => {
        write(other, `${name}.txt`, `${name}\n`);
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", `chore: ${name}`);
        git(other, "pull", "-q", "--no-rebase", "origin", "master");
        git(other, "push", "-q", "origin", "master");
        return git(other, "rev-parse", "HEAD");
    };

    it("fast-forwards its master to origin/master when it is behind and clean", async () => {
        const from = git(repo, "rev-parse", "HEAD");
        const to = advanceMaster("main-ff");
        const r = await run("status");
        assert.equal(r.code, 0, r.out);
        assert.equal(git(repo, "rev-parse", "HEAD"), to);
        assert.match(
            r.out,
            new RegExp(`moved the main checkout's master from ${from.slice(0, 10)} to ${to.slice(0, 10)}`),
        );
    });

    it("says nothing when it is already current", async () => {
        const r = await run("status");
        assert.doesNotMatch(r.out, /main checkout/);
    });

    it("leaves it alone with a warning when it is on another branch", async () => {
        git(repo, "checkout", "-q", "-b", "side");
        try {
            advanceMaster("main-side");
            const before = git(repo, "rev-parse", "master");
            const r = await run("status");
            assert.equal(git(repo, "rev-parse", "master"), before);
            assert.match(r.out, /left the main checkout .* alone: it is on side, not master/);
        } finally {
            git(repo, "checkout", "-q", "master");
        }
    });

    it("leaves it alone with a warning when it has uncommitted changes", async () => {
        write(repo, "a.txt", "dirty\n");
        try {
            advanceMaster("main-dirty");
            const before = git(repo, "rev-parse", "HEAD");
            const r = await run("status");
            assert.equal(git(repo, "rev-parse", "HEAD"), before);
            assert.match(r.out, /left the main checkout .* alone: it has uncommitted changes/);
        } finally {
            git(repo, "checkout", "--", "a.txt");
        }
    });
});

describe("the live copy", () => {
    const tool = fileURLToPath(new URL("./land.mjs", import.meta.url));
    const live = join(dir, "live");
    const record = join(dir, "live-record.json");
    // Runs this checkout's land.mjs as a session would, with LAND_LIVE naming the live worktree.
    const cli = (liveDir, ...args) =>
        spawnSync(process.execPath, [tool, ...args], {
            cwd: repo,
            env: { ...env, LAND_LIVE: liveDir, LAND_TEST_SEEN: "yes" },
            encoding: "utf8",
        });

    it("runs the live copy with the same arguments, directory and environment, and passes its exit code through", () => {
        mkdirSync(join(live, "tools"), { recursive: true });
        write(
            join(live, "tools"),
            "land.mjs",
            "import { writeFileSync } from 'node:fs';\n" +
                `writeFileSync(${JSON.stringify(record)}, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd(), ` +
                "seen: process.env.LAND_TEST_SEEN, mark: process.env.LAND_LIVE_COPY }));\nprocess.exit(7);\n",
        );
        const r = cli(live, "land", "feat/x", "--priority");
        assert.equal(r.status, 7, r.stderr);
        const seen = JSON.parse(readFileSync(record, "utf8"));
        assert.deepEqual(seen.argv, ["land", "feat/x", "--priority"]);
        assert.equal(seen.cwd, repo);
        assert.equal(seen.seen, "yes");
        assert.equal(seen.mark, join(live, "tools/land.mjs"));
    });

    it("runs itself with one warning line when there is no live copy", () => {
        const r = cli(join(dir, "no-live-here"), "nonsense");
        assert.equal(r.status, 1, r.stderr);
        const lines = r.stderr.trim().split("\n");
        assert.match(lines[0], /^land: no live copy at .*no-live-here.*; running .*land\.mjs instead$/);
        assert.match(lines[1], /usage: node tools\/land\.mjs/);
        assert.equal(lines.length, 2);
    });

    it("the live copy runs itself and drops the hand-off mark, so the gate it pushes through starts clean", async () => {
        const handed = { ...env, LAND_LIVE: live, LAND_LIVE_COPY: join(live, "tools/land.mjs") };
        assert.equal(await handOff(["status"], handed), null);
        assert.equal("LAND_LIVE_COPY" in handed, false);
    });

    it("never loops: a live copy that is this tool itself runs once", () => {
        const copy = join(dir, "live-real");
        mkdirSync(join(copy, "tools"), { recursive: true });
        writeFileSync(join(copy, "tools/land.mjs"), readFileSync(tool));
        // The copy would hand off to LAND_LIVE, i.e. to itself, if the hand-off mark did not stop it.
        const r = cli(copy, "nonsense");
        assert.equal(r.status, 1, r.stderr);
        assert.equal(r.stderr.match(/usage:/g).length, 1, r.stderr);
        assert.doesNotMatch(r.stderr, /no live copy/);
    });
});
