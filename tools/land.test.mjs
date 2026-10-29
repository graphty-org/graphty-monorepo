// Tests of tools/land.mjs on throwaway repositories: a bare "origin" and a main checkout with the golden
// worktree, a push that is a plain `git push` (no gate) and a fake GitHub that records its calls.
//
//   node tools/land.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
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
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, it } from "node:test";

import { noteBody } from "./branch-note.mjs";
import { isolatedGitEnv } from "./isolated-git-env.mjs";
import {
    acquireLock,
    context,
    cutFixReason,
    defaultPreview,
    gateSnapshot,
    handOff,
    issueRefs,
    landedBranches,
    lightGate,
    main,
    newestStableCut,
    prBody,
    previewEnv,
    previewSettled,
    readLock,
    sync,
} from "./land.mjs";

const dir = mkdtempSync(join(tmpdir(), "land-"));
// The lock's waits go to a log of this test's own, never the machine's (tools/wait-log.mjs).
process.env.PIPELINE_WAIT_LOG = join(dir, "waits.jsonl");
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
let previewHeads;
let watches; // each [pr, head] a cut's preview watcher waits on, to run auto-ship
let pushResult; // an exit code, or a function of the context that returns one
let pushes;
let checks; // the landing checks: the gate on golden's next commit, without the lock, sending nothing
let verifies; // what each landing asked tools/verify.mjs to verify
const passed = new Set(); // the trees whose check passed: a push of one takes no gate (prepush-inputs.mjs)
let refspecs; // what each push sent
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
    // These tests exercise the golden flow itself; the retirement has its own test below.
    ctx = context(repo, {
        env,
        retired: false,
        gh: (_ctx, args) => {
            gh.push(args);
            const cut = args.includes("golden-cut");
            if (args[1] === "graphql") return graphql(args.find((a) => a.startsWith("query=")));
            if (args[0] === "run") return JSON.stringify([{ conclusion: gh.master ?? "success" }]);
            // What a cut fix's --reason names: an issue, or a workflow run.
            const issue = args[0] === "api" && /\/issues\/(\d+)$/.exec(args[1]);
            if (issue) return JSON.stringify(gh.issueApi?.[issue[1]] ?? {});
            const runOf = args[0] === "api" && /\/actions\/runs\/(\d+)$/.exec(args[1]);
            if (runOf) return JSON.stringify(gh.runs?.[runOf[1]] ?? {});
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
        // The gate of a landing runs in its check; the push of the checked commit finds its pass.
        check: async (c) => {
            checks++;
            const r = await gate(c);
            if (r.code === 0) passed.add(git(c.golden, "rev-parse", "HEAD^{tree}"));
            return r;
        },
        verify: (_c, sha, branch) => verifies.push([branch, sha]),
        push: async (c, cwd = c.golden, refspec = "golden:golden") => {
            pushes++;
            refspecs.push(refspec);
            const known = cwd === c.golden && passed.has(git(cwd, "rev-parse", "HEAD^{tree}"));
            const result = known ? 0 : (await gate(c)).code;
            if (result !== 0) return { code: result, output: "gate failed: tmp/push-gate-logs/x.log" };
            const r = spawnSync("git", ["push", "-q", "origin", refspec], {
                cwd,
                env,
                encoding: "utf8",
            });
            return { code: r.status, output: r.stderr };
        },
        // What the real preview passes as --expect: the HEAD of the worktree it is given.
        preview: (c, pr, cwd = c.golden) => {
            previews.push(pr);
            previewHeads.push(git(cwd, "rev-parse", "HEAD"));
        },
        watchPreview: (_c, pr, sha) => watches.push([pr, sha]),
        addWorktree: (c, base) => git(c.main, "worktree", "add", "-q", "-b", "golden", c.golden, base),
        addCutWorktree: (c, sha) => git(c.main, "worktree", "add", "-q", "-b", "golden-cut", c.cut, sha),
        install: (c) => {
            installed = readFileSync(join(c.golden, "pnpm-lock.yaml"), "utf8");
            installs.push(installed.trim());
        },
        lockOptions: { pollMs: 10 },
    });
});

/**
 * The fake gate: runs `duringPush` once, then answers `pushResult` (a code, or a function of the context).
 * @param c the context of the worktree the gate runs in
 * @returns `{ code, output }`
 */
const gate = async (c) => {
    const during = duringPush;
    duringPush = null;
    during?.();
    const code = typeof pushResult === "function" ? pushResult(c) : pushResult;
    return { code, output: code ? "gate failed: tmp/push-gate-logs/x.log" : "" };
};

beforeEach(() => {
    gh = [];
    checks = 0;
    verifies = [];
    previews = [];
    previewHeads = [];
    watches = [];
    pushResult = 0;
    pushes = 0;
    refspecs = [];
    duringPush = null;
    installs = [];
});

/**
 * The fake GitHub's answer to readIssues' query: each `iN: issue(number: N)` alias from gh.issues.
 * @param query the `query=...` argument
 * @returns the JSON text
 */
const graphql = (query) => {
    const repository = {};
    for (const [, alias, n] of query.matchAll(/(i\d+): issue\(number: (\d+)\)/g)) {
        const issue = gh.issues?.[n];
        repository[alias] = issue
            ? {
                  number: Number(n),
                  title: issue.title ?? "t",
                  state: "OPEN",
                  labels: { nodes: [] },
                  comments: { nodes: issue.comments.map((body, i) => ({ databaseId: i + 1, body })) },
              }
            : null;
    }
    return JSON.stringify({ data: { repository } });
};

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
        // The owner's push came during the check, so the landing checked again on the new golden.
        assert.equal(checks, 2, r.out);
        assert.equal(pushes, 1);
        assert.match(r.out, /golden moved during the check \(try 1 of 3\)/);
        assert.equal(originGolden(), head());
        assert.ok(existsSync(join(golden, "accept.txt")) && existsSync(join(golden, "m.txt")));
    });
});

describe("the short lock", () => {
    // The owner's accept commit, pushed to GitHub's golden from another clone.
    const ownerPush = (name) => {
        git(other, "fetch", "-q", "origin");
        git(other, "checkout", "-q", "-B", "golden", "origin/golden");
        write(other, `${name}.txt`, "ok\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", `chore(visual-review): ${name}`);
        git(other, "push", "-q", "origin", "golden");
        git(other, "checkout", "-q", "master");
    };

    it("checks without the lock, then pushes exactly the checked commit and asks for its verification", async () => {
        branch("short/a", { "sa.txt": "a\n" }, "feat: sa");
        gh.open = true;
        let lockDuringCheck;
        let checkedTree;
        pushResult = (c) => {
            lockDuringCheck = readLock(ctx.lock);
            checkedTree = git(c.golden, "rev-parse", "HEAD^{tree}");
            return 0;
        };
        const r = await run("land", "short/a");
        assert.equal(r.code, 0, r.out);
        assert.equal(lockDuringCheck, null, "nobody held the landing lock while the gate ran");
        assert.equal(checks, 1);
        assert.equal(pushes, 1);
        assert.equal(git(golden, "rev-parse", "HEAD^{tree}"), checkedTree);
        assert.equal(originGolden(), head());
        assert.equal(git(golden, "log", "-1", "--format=%s"), "land: short/a");
        assert.deepEqual(verifies, [["golden", head()]]);
        assert.match(r.out, /short\/a\s+landed/);
    });

    it("checks in the next free slot while another landing checks in the first", async () => {
        branch("short/b", { "sb.txt": "b\n" }, "feat: sb");
        const slot = join(repo, "tmp/golden/check-slot-1");
        mkdirSync(slot, { recursive: true });
        write(slot, "owner.json", JSON.stringify({ pid: process.ppid, host: hostname(), since: "now" }));
        try {
            const r = await run("land", "short/b");
            assert.equal(r.code, 0, r.out);
            assert.match(r.out, /land-check-2, without the landing lock/);
        } finally {
            rmSync(slot, { recursive: true, force: true });
        }
    });

    it("after golden moved during three checks, holds the lock through the fourth", async () => {
        branch("short/c", { "sc.txt": "c\n" }, "feat: sc");
        let gates = 0;
        let lockedGate;
        pushResult = () => {
            gates++;
            if (gates <= 3) ownerPush(`moved${gates}`);
            else lockedGate = readLock(ctx.lock);
            return 0;
        };
        const r = await run("land", "short/c");
        assert.equal(r.code, 0, r.out);
        assert.equal(checks, 3);
        assert.match(r.out, /golden moved during 3 checks; this landing holds the lock through its check/);
        assert.equal(lockedGate?.pid, process.pid, "the fourth gate ran under the landing lock");
        assert.ok(["moved1.txt", "moved2.txt", "moved3.txt", "sc.txt"].every((f) => existsSync(join(golden, f))));
        assert.equal(originGolden(), head());
    });
});

describe("a newer landing of the same work", () => {
    /**
     * Two landings in this process: the first's gate is a real process in its own group that runs until it is
     * killed; the second starts once that gate runs. One console capture for both (run() swaps console.log).
     * @param first the first landing's branches
     * @param second the second landing's branches
     * @param [between] runs once the first gate runs, before the second landing starts
     * @returns `{ a, b, out, gate }`: both exit codes, what they printed, the first gate's exit signal
     */
    const overlap = async (first, second, between = () => {}) => {
        let gateRunning;
        const running = new Promise((r) => (gateRunning = r));
        let gateSignal;
        let gates = 0;
        const c = {
            ...ctx,
            check: async (k) => {
                checks++;
                if (++gates > 1) return gate(k);
                const child = spawn(process.execPath, ["-e", "process.stdin.resume()"], {
                    detached: true,
                    stdio: ["pipe", "ignore", "ignore"],
                });
                k.child = child;
                const closed = new Promise((r) => child.on("close", (_code, signal) => r(signal)));
                gateRunning();
                gateSignal = await closed;
                return { code: 1, output: "Terminated" };
            },
        };
        const out = [];
        const log = console.log;
        const err = console.error;
        console.log = (...a) => out.push(a.join(" "));
        console.error = (...a) => out.push(a.join(" "));
        try {
            const a = main(["land", ...first], c);
            await running;
            between();
            const b = await main(["land", ...second], c);
            return { a: await a, b, out: out.join("\n"), gate: gateSignal };
        } finally {
            console.log = log;
            console.error = err;
        }
    };

    it("cancels the earlier check of a branch landed again, which stops and lands nothing", async () => {
        const wt = branch("again/a", { "ag.txt": "1\n" }, "feat: again");
        const r = await overlap(["again/a"], ["again/a"], () => {
            write(wt, "ag.txt", "2\n");
            git(wt, "commit", "-qam", "fix: again");
        });
        assert.equal(r.gate, "SIGTERM", "the first check's gate was stopped by its process group");
        assert.equal(r.a, 1, r.out);
        assert.match(r.out, /cancelled the check of again\/a/);
        assert.match(r.out, /this check was cancelled by a newer landing of again\/a/);
        assert.equal(r.b, 0, r.out);
        assert.equal(readFileSync(join(golden, "ag.txt"), "utf8"), "2\n", "the newer landing's commit landed");
        assert.equal(originGolden(), head());
        assert.deepEqual(
            readdirSync(join(repo, "tmp/golden")).filter((f) => f.startsWith("check-slot-")),
            [],
            "every slot freed",
        );
    });

    it("cancels the check of a branch folded into a branch of the new landing", async () => {
        branch("fold/a", { "fa.txt": "a\n" }, "feat: fa");
        branch("fold/b", { "fb.txt": "b\n" }, "feat: fb", "fold/a");
        const r = await overlap(["fold/a"], ["fold/b"]);
        assert.equal(r.gate, "SIGTERM");
        assert.equal(r.a, 1, r.out);
        assert.match(r.out, /cancelled the check of fold\/a/);
        assert.equal(r.b, 0, r.out);
        assert.ok(["fa.txt", "fb.txt"].every((f) => existsSync(join(golden, f))));
    });

    it("leaves the check of an unrelated branch alone", async () => {
        branch("apart/a", { "pa.txt": "a\n" }, "feat: pa");
        branch("apart/b", { "pb.txt": "b\n" }, "feat: pb");
        let gateRunning;
        const running = new Promise((r) => (gateRunning = r));
        let finish;
        const c = {
            ...ctx,
            check: async (k) => {
                if (!finish) {
                    const held = new Promise((r) => (finish = r));
                    gateRunning();
                    await held;
                }
                return gate(k);
            },
        };
        const out = [];
        const log = console.log;
        console.log = (...a) => out.push(a.join(" "));
        try {
            const a = main(["land", "apart/a"], c);
            await running;
            const b = await main(["land", "apart/b"], c);
            finish();
            assert.equal(b, 0, out.join("\n"));
            assert.equal(await a, 0, out.join("\n"));
            assert.doesNotMatch(out.join("\n"), /cancelled/);
        } finally {
            console.log = log;
        }
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
        // Checked without the lock: d e f refused; d e refused; d passes; e refused; f passes. One push.
        assert.equal(checks, 5);
        assert.equal(pushes, 1);
        assert.ok(existsSync(join(golden, "md.txt")) && existsSync(join(golden, "mf.txt")));
        assert.ok(!existsSync(join(golden, "bad.txt")));
        assert.deepEqual(landSubjects(2), ["land: multi/f", "land: multi/d"]);
        assert.equal(originGolden(), head());
        assert.match(r.out, /multi\/e\s+gate failure, log: tmp\/push-gate-logs\/x\.log/);
        assert.match(r.out, /the gate refused multi\/d, multi\/e, multi\/f together \(its log names the last/);
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
        // The check worktree: lock1 | the whole batch (2); n and o (back to 1); p (2). Golden: lock1 | 2.
        assert.deepEqual(installs, ["1", "1", "2", "1", "2", "2"]);
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

    it("reports branches of the batch that conflict with each other before merging, and lands the rest", async () => {
        branch("sib/one", { "sib.txt": "one\n" }, "feat: sib one", "origin/golden");
        branch("sib/two", { "sib.txt": "two\n" }, "feat: sib two", "origin/golden");
        branch("sib/three", { "sib3.txt": "three\n" }, "feat: sib three", "origin/golden");
        gh.open = true;
        const r = await run("land", "sib/one", "sib/two", "sib/three");
        assert.equal(r.code, 2, r.out);
        assert.match(
            r.out,
            /these branches of the batch conflict with each other:\n {2}sib\/one and sib\/two: sib\.txt\n/,
        );
        assert.ok(
            r.out.indexOf("conflict with each other") < r.out.indexOf("land: sib/two conflicts with golden"),
            "reported before merging",
        );
        assert.match(
            r.out,
            /sib\/one\s+landed\n\s+sib\/two\s+conflict with sib\/one, merged before it in this batch\n\s+sib\/three\s+landed/,
        );
        assert.match(r.out, /merge the earlier branch into the later/);
        assert.deepEqual(landSubjects(2), ["land: sib/three", "land: sib/one"]);
        assert.equal(originGolden(), head());
    });

    it("exits 5 when a conflict and a gate failure each keep a branch out, golden as it was", async () => {
        branch("multi/g", { "mc.txt": "conflict\n" }, "feat: g");
        branch("multi/h", { "bad.txt": "h\n" }, "feat: h");
        pushResult = badGate;
        const before = head();
        const r = await run("land", "multi/g", "multi/h");
        assert.equal(r.code, 5, r.out);
        assert.equal(checks, 1);
        assert.equal(pushes, 0);
        assert.equal(head(), before);
        assert.match(r.out, /multi\/g\s+conflict\n\s+multi\/h\s+gate failure/);
        assert.equal(gh.length, 0);
    });
});

describe("copies", () => {
    it("refuses a branch holding a cherry-picked copy of a golden commit, naming it, golden untouched", async () => {
        const wt = branch("copy/c", { "cp.txt": "own\n" }, "feat: own work");
        git(wt, "cherry-pick", git(repo, "rev-parse", "multi/c"));
        const before = head();
        const r = await run("land", "copy/c");
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /copy\/c holds copies of commits golden already has/);
        assert.match(r.out, /\n {2}[0-9a-f]{10} feat: mc\n/);
        assert.match(r.out, /Never copy, always merge/);
        assert.equal(head(), before);
        assert.equal(pushes, 0);
    });

    it("refuses the copy in a landing of several and lands the rest", async () => {
        branch("copy/ok", { "cpok.txt": "ok\n" }, "feat: fine");
        gh.open = true;
        const r = await run("land", "copy/c", "copy/ok");
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /copy\/c\s+refused \(copies of golden commits\)\n\s+copy\/ok\s+landed/);
        assert.equal(pushes, 1);
        assert.ok(existsSync(join(golden, "cpok.txt")) && !existsSync(join(golden, "cp.txt")));
    });

    it("--allow-copies refuses an unlisted copy and a listed sha that is not a copy, golden untouched", async () => {
        const wt = branch("copy/allow", { "cpa.txt": "own\n" }, "feat: own allowed work");
        git(wt, "cherry-pick", git(repo, "rev-parse", "multi/c"));
        const copy = git(wt, "rev-parse", "HEAD");
        const own = git(wt, "rev-parse", "HEAD~1");
        const before = head();
        let r = await run("land", "copy/allow", "--allow-copies", own.slice(0, 7));
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /not copies of golden commits on copy\/allow: [0-9a-f]{7}/);
        r = await run("land", "copy/allow", "--allow-copies", "abc");
        assert.equal(r.code, 1, r.out);
        r = await run("land", "copy/allow");
        assert.match(r.out, /--allow-copies/);
        assert.match(r.out, new RegExp(copy.slice(0, 10)));
        assert.equal(head(), before);
        assert.equal(pushes, 0);
    });

    it("--allow-copies lands the listed copy and names it in the land commit", async () => {
        const copy = git(repo, "rev-parse", "copy/allow");
        gh.open = true;
        const r = await run("land", `--allow-copies=${copy.slice(0, 7)}`, "copy/allow");
        assert.equal(r.code, 0, r.out);
        assert.equal(pushes, 1);
        const msg = git(golden, "log", "-1", "--format=%B", "--first-parent", "HEAD");
        assert.match(msg, /^land: copy\/allow\n/);
        assert.match(msg, new RegExp(`--allow-copies\\):\\n${copy.slice(0, 10)} feat: mc$`, "m"));
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

    // Verification passed up to `sha`: golden-verified on GitHub.
    const verifiedAt = (sha) => git(repo, "push", "-q", "-f", "origin", `${sha}:refs/heads/golden-verified`);

    it("refuses when no golden commit has a stable preview and no commit is given", async () => {
        const r = await run("cut");
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /no verified golden commit since master has a finished screenshot preview/);
        assert.equal(pushes, 0);
    });

    it("refuses a commit that is not on origin/golden", async () => {
        const r = await run("cut", git(repo, "rev-parse", "multi/x"));
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /is not on origin\/golden/);
        assert.equal(pushes, 0);
        assert.equal(gh.filter((a) => a[1] !== "list").length, 0);
    });

    it("cuts only a verified commit: a stable preview newer than golden-verified is not taken", async () => {
        const line = firstParents();
        preview("103", line[0], ["unchanged"]);
        verifiedAt(line[1]);
        const r = await run("cut");
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /no verified golden commit/);
        assert.equal(pushes, 0);
        rmSync(join(repo, "tmp/visual-review/local/103"), { recursive: true });
    });

    it("while CI verifies golden, takes only a commit whose CI captures verification found clean", () => {
        const line = firstParents();
        verifiedAt(line[0]);
        preview("104", line[0], ["unchanged"]);
        preview("105", line[1], ["unchanged"]);
        const state = join(repo, "tmp/golden/verify.json");
        mkdirSync(join(repo, "tmp/golden"), { recursive: true });
        try {
            assert.equal(newestStableCut(ctx), line[0], "local verification: the preview alone decides");
            const captures = { [line[0]]: { clean: false, problems: ["graphty: unstable a.png"] } };
            writeFileSync(state, JSON.stringify({ backend: { name: "ci" }, captures }));
            assert.equal(newestStableCut(ctx), null, "not clean, and line[1] has no CI verdict: nothing to cut");
            captures[line[1]] = { clean: true, problems: [] };
            writeFileSync(state, JSON.stringify({ backend: { name: "ci" }, captures }));
            assert.equal(newestStableCut(ctx), line[1]);
        } finally {
            rmSync(state, { force: true });
            for (const k of ["104", "105"]) rmSync(join(repo, "tmp/visual-review/local", k), { recursive: true });
        }
    });

    it("cuts the newest golden commit whose preview has no unstable or failed images, and opens its pull request", async () => {
        const line = firstParents();
        verifiedAt(line[0]);
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
        assert.deepEqual(watches, [[9, line[1]]], "auto-ship runs once that preview ends");
        assert.deepEqual(verifies, [["golden-cut", line[1]]], "ship waits for the cut's verification");
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

    it("keeps the cut frozen while its pull request awaits the owner's Finish, and moves it after", async () => {
        const held = remote("refs/heads/golden-cut");
        preview("9", held, ["changed"]);
        gh.open = true;
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: held };
        branch("frozen/next", { "fz.txt": "z\n" }, "feat: after the cut", "origin/golden");
        assert.equal((await run("land", "frozen/next")).code, 0);
        const next = git(golden, "rev-parse", "HEAD");
        verifiedAt(next);
        preview("110", next, ["unchanged"]);
        pushes = 0;
        const frozen = await run("cut");
        assert.equal(frozen.code, 1, frozen.out);
        assert.match(
            frozen.out,
            /#9 awaits the owner's review: its preview of [0-9a-f]{10} is done and it has no Finish yet/,
        );
        assert.equal(remote("refs/heads/golden-cut"), held);
        assert.equal(pushes, 0);

        // The owner's Finish: an accept commit, then the signed approval of the baselines tree it made.
        git(other, "fetch", "-q", "origin");
        git(other, "checkout", "-q", "-B", "finish-side", "origin/golden-cut");
        mkdirSync(join(other, "visual-baselines/p"), { recursive: true });
        write(other, "visual-baselines/p/frozen.png", "png\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "test(workspace): accept visual baselines for #9");
        const tree = git(other, "rev-parse", "HEAD:visual-baselines");
        mkdirSync(join(other, "visual-review-approvals"), { recursive: true });
        write(other, `visual-review-approvals/${tree}.json`, "{}\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "test(workspace): approve the visual baselines of #9");
        git(other, "push", "-q", "origin", "finish-side");
        gh.cut = { ...gh.cut, headRefOid: git(other, "rev-parse", "HEAD") };
        git(other, "checkout", "-q", "master");
        const moved = await run("cut");
        assert.equal(moved.code, 0, moved.out);
        assert.equal(remote("refs/heads/golden-cut"), next);
        rmSync(join(repo, "tmp/visual-review/local/110"), { recursive: true });
    });

    it("keeps a shipped cut frozen even with no accept commits, and freezes cut-fix with it", async () => {
        const held = remote("refs/heads/golden-cut");
        gh.open = true;
        gh.issueApi = { 500: { state: "open", title: "CI red on master", labels: [{ name: "priority:critical" }] } };
        branch("frozen/shipped", { "fs.txt": "s\n" }, "feat: after the shipped cut", "origin/golden");
        assert.equal((await run("land", "frozen/shipped")).code, 0);
        const next = git(golden, "rev-parse", "HEAD");
        verifiedAt(next);
        preview("110", next, ["unchanged"]);
        branch("frozen/cutfix", { "fc.txt": "c\n" }, "fix: the cut", "origin/golden-cut");
        pushes = 0;
        // Shipped: ready, its CI running. Nothing on golden-cut that the newer golden commit lacks.
        gh.cut = { number: 9, isDraft: false, url: "u/pull/9", headRefOid: held };
        const shipped = await run("cut");
        assert.equal(shipped.code, 1, shipped.out);
        assert.match(
            shipped.out,
            /#9 is shipped \(ready, its CI running or about to merge\), so golden-cut stays frozen/,
        );
        const fixShipped = await run("cut-fix", "frozen/cutfix", "--reason", "500");
        assert.equal(fixShipped.code, 1, fixShipped.out);
        assert.match(fixShipped.out, /frozen\/cutfix cannot go into the cut now: #9 is shipped/);
        // In review: a draft whose preview of its head is done, with no Finish.
        preview("9", held, ["changed"]);
        gh.cut = { ...gh.cut, isDraft: true };
        const fixReview = await run("cut-fix", "frozen/cutfix", "--reason", "500");
        assert.equal(fixReview.code, 1, fixReview.out);
        assert.match(fixReview.out, /frozen\/cutfix cannot go into the cut now: #9 awaits the owner's review/);
        assert.equal(remote("refs/heads/golden-cut"), held);
        assert.equal(pushes, 0);
        rmSync(join(repo, "tmp/visual-review/local/110"), { recursive: true });
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
        // The Finish test above left a commit on the cut that is not a Finish's: verified here by golden-cut's run.
        write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: head }));
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
            rmSync(join(repo, "tmp/golden/verify-golden-cut.json"));
            rmSync(ctx.lock, { recursive: true, force: true });
            rmSync(ctx.cutLock, { recursive: true, force: true });
        }
    });

    it("ship takes the verification and preview of a commit the head differs from only in the review's directories", async () => {
        const previewed = remote("refs/heads/golden-cut");
        write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: previewed }));
        preview("9", previewed, ["changed"]);
        // An update of the baselines from master: a merge commit (two parents) that changes only visual-baselines/.
        git(other, "fetch", "-q", "origin");
        git(other, "checkout", "-q", "-B", "baselines-side", "origin/master");
        mkdirSync(join(other, "visual-baselines/p"), { recursive: true });
        write(other, "visual-baselines/p/from-master.png", "png\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "test(workspace): a baseline from master");
        git(other, "checkout", "-q", "-B", "update", "origin/golden-cut");
        git(other, "merge", "-q", "--no-ff", "-m", "Merge master's baselines", "baselines-side");
        git(other, "push", "-q", "origin", "update:golden-cut");
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: git(other, "rev-parse", "HEAD") };
        git(other, "checkout", "-q", "master");
        try {
            const r = await run("ship");
            assert.equal(r.code, 0, r.out);
            assert.ok(gh.some((a) => a[1] === "ready"));
        } finally {
            rmSync(join(repo, "tmp/golden/verify-golden-cut.json"));
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

    it("tells the gate's capture which branch it pushes to, so it captures for that branch's pull request", () => {
        assert.deepEqual(previewEnv("golden"), { VISUAL_PREVIEW_BRANCH: "golden" });
        assert.deepEqual(previewEnv("golden-cut"), { VISUAL_PREVIEW_BRANCH: "golden-cut" });
    });

    it("after the push makes the gate's capture of the pushed head the preview, and starts none", async () => {
        const fake = join(dir, "fake-preview-staged");
        mkdirSync(join(fake, "tools"), { recursive: true });
        const called = join(fake, "called");
        writeFileSync(join(fake, "tools/visual-preview.sh"), `#!/bin/sh\necho "$@" > ${called}\n`, { mode: 0o755 });
        git(dir, "init", "-q", fake);
        git(fake, "commit", "-q", "--allow-empty", "-m", "x");
        const sha = git(fake, "rev-parse", "HEAD");
        const local = join(repo, "tmp/visual-review/local");
        const stage = (name, status) => {
            mkdirSync(join(local, name, "p"), { recursive: true });
            writeFileSync(join(local, name, "status.json"), JSON.stringify(status));
            writeFileSync(join(local, name, "p/results.json"), "{}");
        };
        try {
            // The preview of the head GitHub listed before, and the gate's capture of the pushed head.
            stage("42", { state: "done", pr: 42, head: "0".repeat(40) });
            stage(`.pending-${sha}`, { state: "done", pr: 42, head: sha });
            defaultPreview(ctx, 42, fake);
            assert.equal(JSON.parse(readFileSync(join(local, "42/status.json"), "utf8")).head, sha);
            assert.ok(existsSync(join(local, "42/p/results.json")));
            assert.ok(!existsSync(join(local, `.pending-${sha}`)));
            assert.ok(!existsSync(join(local, "42.old")));
            assert.ok(!existsSync(called), "no second capture of the same commit");

            // A capture for another pull request, or one that failed, is never taken: a fresh preview starts.
            rmSync(join(local, "42"), { recursive: true });
            stage(`.pending-${sha}`, { state: "done", pr: 43, head: sha });
            defaultPreview(ctx, 42, fake);
            while (!existsSync(called)) await new Promise((r) => setImmediate(r));
            assert.ok(existsSync(join(local, `.pending-${sha}`)));
            rmSync(called);
            stage(`.pending-${sha}`, { state: "failed", pr: 42, head: sha });
            defaultPreview(ctx, 42, fake);
            while (!existsSync(called)) await new Promise((r) => setImmediate(r));
        } finally {
            rmSync(local, { recursive: true, force: true });
        }
    });

    it("ship refuses a cut head that is not verified, and ships it once golden-cut's verification passed it", async () => {
        const wt = branch("cut/unverified", { "uv.txt": "u\n" }, "fix: unverified", "origin/golden-cut");
        git(wt, "push", "-q", "origin", "HEAD:golden-cut");
        const head = git(wt, "rev-parse", "HEAD");
        preview("9", head, ["changed"]);
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: head };
        const r = await run("ship");
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /#9 is not verified yet at [0-9a-f]{10}/);
        assert.equal(gh.filter((a) => a[1] !== "list").length, 0);

        write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: head }));
        const shipped = await run("ship");
        assert.equal(shipped.code, 0, shipped.out);
        rmSync(join(repo, "tmp/golden/verify-golden-cut.json"));
    });

    it("ship takes a cut head CI cannot verify (ciCannotRun): its pull request's CI is the verification", async () => {
        const wt = branch("cut/ci-cannot-run", { "ccr.txt": "c\n" }, "fix: ci cannot run", "origin/golden-cut");
        git(wt, "push", "-q", "origin", "HEAD:golden-cut");
        const head = git(wt, "rev-parse", "HEAD");
        preview("9", head, ["changed"]);
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: head };
        const state = { last: { status: "ciCannotRun", commit: head, reason: "CI cannot run" } };
        write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify(state));
        try {
            const r = await run("ship");
            assert.equal(r.code, 0, r.out);
            assert.match(
                r.out,
                /verification: the cut pull request's CI is the verification \(its tree predates golden-verify\.yml\)/,
            );
            assert.ok(gh.some((a) => a[1] === "ready"));
        } finally {
            rmSync(join(repo, "tmp/golden/verify-golden-cut.json"));
        }
    });

    it("ship prints CI's changed and flaky screenshots and refuses a changed one the owner has not approved", async () => {
        const wt = branch("cut/ci-drawn", { "cd.txt": "c\n" }, "fix: ci draws it otherwise", "origin/golden-cut");
        git(wt, "push", "-q", "origin", "HEAD:golden-cut");
        const head = git(wt, "rev-parse", "HEAD");
        preview("9", head, ["unchanged"]);
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: head };
        const fresh = {
            project: "graphty",
            file: "a.dark.png",
            status: "new",
            baseline: null,
            capture: "c".repeat(64),
        };
        const flaky = { project: "graphty", file: "b.light.png", status: "unchanged", baseline: "b", capture: "b" };
        const captures = { [head]: { clean: true, run: "https://r/1", changed: [fresh], flaky: [flaky] } };
        write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: head, captures }));
        try {
            const r = await run("ship");
            assert.equal(r.code, 1, r.out);
            assert.match(r.out, /CI screenshot changed: graphty\/a\.dark\.png new/);
            assert.match(r.out, /CI screenshot flaky: graphty\/b\.light\.png unchanged/);
            assert.match(r.out, /#9 draws 1 screenshot\(s\) differently in CI \(https:\/\/r\/1\) from the approved/);
            assert.equal(gh.filter((a) => a[1] !== "list").length, 0);

            // The owner approves CI's picture: the baseline at the head is now exactly that capture.
            mkdirSync(join(wt, "visual-baselines/graphty"), { recursive: true });
            write(wt, "visual-baselines/graphty/a.dark.png", `version x\noid sha256:${fresh.capture}\nsize 1\n`);
            git(wt, "add", ".");
            git(wt, "commit", "-q", "-m", "test(workspace): accept a.dark.png");
            const accepted = git(wt, "rev-parse", "HEAD");
            gh.cut = { ...gh.cut, headRefOid: accepted };
            const shipped = await run("ship");
            assert.equal(shipped.code, 0, shipped.out);
            assert.match(shipped.out, /CI screenshot changed, approved again since: graphty\/a\.dark\.png new/);
        } finally {
            rmSync(join(repo, "tmp/golden/verify-golden-cut.json"));
        }
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

    describe("auto-ship", () => {
        const shipped = () => gh.filter((a) => a[1] !== "list");
        // A cut head off master (never pushed: the cut pull request's head is all auto-ship reads), verified.
        const cutHead = (name, files, verified = true) => {
            const sha = git(branch(name, files, `fix: ${name}`), "rev-parse", "HEAD");
            const v = join(repo, "tmp/golden/verify-golden-cut.json");
            if (verified) write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: sha }));
            else rmSync(v, { force: true });
            gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: sha };
            return sha;
        };

        it("ships a verified cut whose preview of its head changes no image, once", async () => {
            const sha = cutHead("auto/clean", { "clean.txt": "c\n" });
            preview("9", sha, ["unchanged", "excluded", "unchanged"]);
            const r = await run("auto-ship");
            assert.equal(r.code, 0, r.out);
            assert.deepEqual(shipped(), [
                ["pr", "ready", "9"],
                ["pr", "merge", "9", "--auto", "--merge"],
            ]);
            assert.match(readFileSync(join(repo, "tmp/golden/auto-ship.log"), "utf8"), /shipped #9 at/);

            // The second event (the verification after the preview) finds it shipped and does nothing.
            gh.cut = { ...gh.cut, isDraft: false };
            gh.length = 0;
            const again = await run("auto-ship");
            assert.equal(again.code, 0, again.out);
            assert.deepEqual(shipped(), []);
        });

        it("waits for the owner when any image changed, or the cut changes a baseline", async () => {
            const sha = cutHead("auto/changed", { "changed.txt": "c\n" });
            preview("9", sha, ["unchanged", "changed"]);
            const r = await run("auto-ship");
            assert.equal(r.code, 0, r.out);
            assert.match(r.out, /waiting: #9 waits for the owner: 1 changed \(graphty\/s1.png changed\)/);
            assert.deepEqual(shipped(), []);

            for (const status of ["new", "removed", "unseeded", "unstable", "moved"]) {
                preview("9", sha, ["unchanged", status]);
                await run("auto-ship");
                assert.deepEqual(shipped(), [], status);
            }

            cutHead("auto/baseline", { "b.txt": "b\n" });
            const wt = join(dir, "wt-auto-baseline");
            mkdirSync(join(wt, "visual-baselines/p"), { recursive: true });
            write(wt, "visual-baselines/p/s.png", "png\n");
            git(wt, "add", ".");
            git(wt, "commit", "-q", "-m", "test: a baseline");
            const based = git(wt, "rev-parse", "HEAD");
            write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: based }));
            gh.cut = { ...gh.cut, headRefOid: based };
            preview("9", based, ["unchanged"]);
            const b = await run("auto-ship");
            assert.match(b.out, /baselines: visual-baselines\/ differs from the base \(tree [0-9a-f]+\), and no/);
            assert.deepEqual(shipped(), []);

            const red = cutHead("auto/red", { "red.txt": "r\n" });
            preview("9", red, ["unchanged"]);
            gh.master = "failure";
            const m = await run("auto-ship");
            delete gh.master;
            assert.match(m.out, /waits: master's last build is failure/);
            assert.deepEqual(shipped(), []);

            const bang = git(branch("auto/bang", { "bang.txt": "b\n" }, "feat(x)!: drop y"), "rev-parse", "HEAD");
            write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: bang }));
            gh.cut = { ...gh.cut, headRefOid: bang };
            preview("9", bang, ["unchanged"]);
            const k = await run("auto-ship");
            assert.match(k.out, /owner's go on a breaking commit: feat\(x\)!: drop y/);
            assert.deepEqual(shipped(), []);
        });

        it("waits while CI's own capture of the verified cut changed an image", async () => {
            const sha = cutHead("auto/ci-changed", { "acc.txt": "c\n" }, false);
            const item = { project: "graphty", file: "n.dark.png", status: "new", baseline: null, capture: "d" };
            const captures = { [sha]: { clean: true, run: "https://r/2", changed: [item], flaky: [] } };
            write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: sha, captures }));
            preview("9", sha, ["unchanged"]);
            const r = await run("auto-ship");
            assert.equal(r.code, 0, r.out);
            assert.match(r.out, /waiting: #9 draws 1 screenshot\(s\) differently in CI/);
            assert.deepEqual(shipped(), []);
        });

        it("ships a cut whose verification is its own pull request's CI (ciCannotRun)", async () => {
            const sha = cutHead("auto/ci-cannot-run", { "accr.txt": "c\n" }, false);
            const state = { last: { status: "ciCannotRun", commit: sha, reason: "CI cannot run" } };
            write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify(state));
            preview("9", sha, ["unchanged"]);
            const r = await run("auto-ship");
            assert.equal(r.code, 0, r.out);
            assert.match(r.out, /verification: the cut pull request's CI is the verification/);
            assert.deepEqual(shipped(), [
                ["pr", "ready", "9"],
                ["pr", "merge", "9", "--auto", "--merge"],
            ]);
        });

        it("ships a cut whose changed baselines tree carries the owner's approval of exactly that tree", async () => {
            cutHead("auto/approved", { "approved.txt": "a\n" });
            const wt = join(dir, "wt-auto-approved");
            mkdirSync(join(wt, "visual-baselines/p"), { recursive: true });
            write(wt, "visual-baselines/p/a.png", "png\n");
            git(wt, "add", ".");
            git(wt, "commit", "-q", "-m", "test(workspace): accept visual baselines for #9");
            const accepted = git(wt, "rev-parse", "HEAD");
            const tree = git(wt, "rev-parse", "HEAD:visual-baselines");
            const statement = { version: 1, baselines: "visual-baselines", tree, commit: accepted };
            mkdirSync(join(wt, "visual-review-approvals"), { recursive: true });
            write(wt, `visual-review-approvals/${tree}.json`, JSON.stringify(statement));
            git(wt, "add", ".");
            git(wt, "commit", "-q", "-m", "test(workspace): approve the visual baselines of #9");
            const sha = git(wt, "rev-parse", "HEAD");
            write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: sha }));
            gh.cut = { ...gh.cut, headRefOid: sha };
            preview("9", sha, ["unchanged"]);
            const r = await run("auto-ship");
            assert.equal(r.code, 0, r.out);
            assert.deepEqual(shipped(), [
                ["pr", "ready", "9"],
                ["pr", "merge", "9", "--auto", "--merge"],
            ]);

            // The same approval no longer covers a tree changed after it.
            write(wt, "visual-baselines/p/b.png", "png\n");
            git(wt, "add", ".");
            git(wt, "commit", "-q", "-m", "test(workspace): accept visual baselines for #9");
            const later = git(wt, "rev-parse", "HEAD");
            write(join(repo, "tmp/golden"), "verify-golden-cut.json", JSON.stringify({ verified: later }));
            gh.cut = { ...gh.cut, headRefOid: later };
            gh.length = 0;
            preview("9", later, ["unchanged"]);
            const stale = await run("auto-ship");
            assert.match(stale.out, /waits for the owner: 1 changed \(baselines: .*no visual-review-approvals\//);
            assert.deepEqual(shipped(), []);
        });

        it("waits for verification, and for a preview of exactly the head", async () => {
            const sha = cutHead("auto/unverified", { "uv2.txt": "u\n" }, false);
            preview("9", sha, ["unchanged"]);
            const r = await run("auto-ship");
            assert.match(r.out, /waiting: #9 is not verified yet/);
            assert.deepEqual(shipped(), []);
            assert.match(readFileSync(join(repo, "tmp/golden/auto-ship.log"), "utf8"), /not verified yet/);

            const other = cutHead("auto/other", { "o.txt": "o\n" });
            preview("9", sha, ["unchanged"]);
            const moved = await run("auto-ship");
            assert.match(moved.out, /waiting: #9 (moved|has no finished screenshot preview)/);
            assert.deepEqual(shipped(), []);
            preview("9", other, ["unchanged"], "running");
            await run("auto-ship");
            assert.deepEqual(shipped(), []);
        });

        it("runs after the preview of the cut's head ends, past an older head's status, not after a newer one", async () => {
            const older = cutHead("auto/older", { "older.txt": "o\n" });
            const wt = join(dir, "wt-auto-older");
            write(wt, "newer.txt", "n\n");
            git(wt, "add", ".");
            git(wt, "commit", "-q", "-m", "fix: newer");
            const sha = git(wt, "rev-parse", "HEAD");
            preview("9", older, ["unchanged"]);
            // Resolving on the older head's status would answer false.
            const waiting = previewSettled(ctx, 9, sha);
            preview("9", sha, ["unchanged"], "running");
            preview("9", sha, ["unchanged"]);
            assert.equal(await waiting, true);

            const replaced = previewSettled(ctx, 9, older);
            assert.equal(await replaced, false, "a newer head's preview replaced it");
        });

        it("never ships while a cut is pushing golden-cut", async () => {
            const sha = cutHead("auto/cutting", { "cutting.txt": "c\n" });
            preview("9", sha, ["unchanged"]);
            mkdirSync(ctx.cutLock, { recursive: true });
            write(ctx.cutLock, "owner.json", JSON.stringify({ pid: process.pid, host: hostname(), since: "now" }));
            try {
                const r = await run("auto-ship");
                assert.equal(r.code, 0, r.out);
                assert.match(r.out, /waiting: a cut is pushing golden-cut now/);
                assert.equal(gh.length, 0);
            } finally {
                rmSync(ctx.cutLock, { recursive: true, force: true });
            }
            rmSync(join(repo, "tmp/golden/verify-golden-cut.json"), { force: true });
        });
    });
});

describe("cut fixes", () => {
    const onBoth = (sha) =>
        ["origin/golden-cut", "origin/golden"].every(
            (b) => spawnSync("git", ["merge-base", "--is-ancestor", sha, b], { cwd: repo, env }).status === 0,
        );
    // A red master's alarm: an open priority:critical issue.
    beforeEach(() => {
        gh.issueApi = { 500: { state: "open", title: "CI red on master", labels: [{ name: "priority:critical" }] } };
    });

    it("refuses a fix that names no red master, failed deploy or release hold, and pushes nothing", async () => {
        branch("cutfix/why", { "why.txt": "w\n" }, "fix: why", "origin/golden-cut");
        gh.issueApi[501] = { state: "open", title: "a feature", labels: [{ name: "priority:high" }] };
        gh.issueApi[502] = { state: "closed", title: "CI red on master", labels: [{ name: "priority:critical" }] };
        gh.runs = { 77: { path: ".github/workflows/ci.yml", conclusion: "failure", head_branch: "golden-cut" } };
        for (const reason of [
            [],
            ["--reason", "501"],
            ["--reason", "502"],
            ["--reason", "run:77"],
            ["--reason=soon"],
        ]) {
            const r = await run("cut-fix", "cutfix/why", ...reason);
            assert.equal(r.code, 1, r.out);
            assert.match(
                r.out,
                /cutfix\/why is not a cut fix: .*only for a red master, a failed deploy or a release hold/,
            );
            assert.match(r.out, /Every other fix lands on golden: node tools\/land\.mjs land <branch>/);
        }
        assert.equal(pushes, 0);
    });

    it("takes a failed release or deploy run, or a release hold issue, as the reason", async () => {
        gh.issueApi[503] = { state: "open", title: "Release held: T4 GPU failed on abc", labels: [{ name: "bug" }] };
        gh.runs = {
            78: { path: ".github/workflows/release.yml", conclusion: "failure", head_branch: "master" },
            79: { path: ".github/workflows/deploy-pages.yml", conclusion: "timed_out", head_branch: "master" },
            80: { path: ".github/workflows/ci.yml", conclusion: "failure", head_branch: "master" },
        };
        for (const reason of ["#503", "run:78", "run:79", "run:80", "500"])
            assert.ok(cutFixReason(ctx, reason).ok, reason);
        gh.runs[78].conclusion = "success";
        assert.match(cutFixReason(ctx, "run:78").error, /is not a failed release, deploy or master run/);
    });

    it("refuses a branch that would bring golden commits the cut lacks, and says how to start one", async () => {
        branch("cutfix/advance", { "adv.txt": "a\n" }, "feat: after the cut");
        gh.open = true;
        assert.equal((await run("land", "cutfix/advance")).code, 0);
        branch("cutfix/from-golden", { "fg.txt": "x\n" }, "fix: from golden", "origin/golden");
        const r = await run("cut-fix", "cutfix/from-golden", "--reason", "500");
        assert.equal(r.code, 1, r.out);
        assert.match(
            r.out,
            /cutfix\/from-golden cannot go into the cut: it was not started from origin\/golden-cut: it would bring 4 commits of golden or master/,
        );
        assert.match(r.out, /\n {2}[0-9a-f]{10} land: cutfix\/advance\n {2}[0-9a-f]{10} feat: after the cut\n/);
        assert.match(r.out, /Any other fix lands on golden: node tools\/land\.mjs land <branch>/);
        assert.match(r.out, /\.\/tools\/worktree-new\.sh <branch> origin\/golden-cut/);
        assert.deepEqual(refspecs, ["golden:golden"], "nothing pushed to golden-cut");
    });

    it("merges the fix into golden-cut, pushes it, starts its preview, then lands the same commits on golden", async () => {
        const wt = branch("cutfix/ok", { "cf.txt": "fix\n" }, "fix: the cut\n\nRefs #44", "origin/golden-cut");
        const tip = git(wt, "rev-parse", "HEAD");
        gh.open = true;
        gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: "x" };
        const r = await run("cut-fix", "cutfix/ok", "--reason", "500");
        assert.equal(r.code, 0, r.out);
        assert.deepEqual(refspecs, ["HEAD:refs/heads/golden-cut", "golden:golden"]);
        git(repo, "fetch", "-q", "origin");
        assert.ok(onBoth(tip), "one commit id on both");
        assert.equal(git(repo, "log", "-1", "--format=%s", "origin/golden-cut"), "land: cutfix/ok");
        assert.equal(git(repo, "log", "-1", "--format=%s", "origin/golden"), "land: cutfix/ok");
        assert.ok(!existsSync(join(ctx.cut, "adv.txt")), "the cut did not take golden's newer landing");
        assert.deepEqual(previews, [9, 7]);
        assert.equal(previewHeads[0], git(repo, "rev-parse", "origin/golden-cut"), "--expect the pushed cut head");
        assert.deepEqual(
            verifies,
            [
                ["golden-cut", git(repo, "rev-parse", "origin/golden-cut")],
                ["golden", git(repo, "rev-parse", "origin/golden")],
            ],
            "both pushes are verified",
        );
    });

    it("run again, finds the fix on both and pushes nothing", async () => {
        const r = await run("cut-fix", "cutfix/ok", "--reason", "500");
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /already on golden-cut/);
        assert.match(r.out, /already on golden/);
        assert.equal(pushes, 0);
    });

    describe("while golden is being flushed", () => {
        const flush = () => join(repo, "tmp/golden/flush");
        beforeEach(() => {
            mkdirSync(join(repo, "tmp/golden"), { recursive: true });
            writeFileSync(flush(), "");
        });
        after(() => rmSync(flush(), { force: true }));

        it("refuses land and sync, naming the flush, and pushes nothing", async () => {
            branch("flush/feature", { "ff.txt": "f\n" }, "feat: during the flush");
            for (const argv of [["land", "flush/feature", "--dry-run"], ["land", "flush/feature"], ["sync"]]) {
                const r = await run(...argv);
                assert.equal(r.code, 1, r.out);
                assert.match(r.out, /golden is being flushed to master \(.*tmp\/golden\/flush exists\)/);
            }
            assert.equal(pushes, 0);
        });

        it("still runs a cut fix, its dry run pushing nothing and its run landing on both", async () => {
            const wt = branch("flush/cutfix", { "fc.txt": "fix\n" }, "fix: the cut in a flush", "origin/golden-cut");
            const tip = git(wt, "rev-parse", "HEAD");
            gh.open = true;
            gh.cut = { number: 9, isDraft: true, url: "u/pull/9", headRefOid: "x" };
            const dry = await run("cut-fix", "flush/cutfix", "--reason", "500", "--dry-run");
            assert.equal(dry.code, 0, dry.out);
            assert.match(dry.out, /dry run: flush\/cutfix merges into golden-cut; nothing pushed/);
            assert.equal(pushes, 0);
            const r = await run("cut-fix", "flush/cutfix", "--reason", "500");
            assert.equal(r.code, 0, r.out);
            assert.deepEqual(refspecs, ["HEAD:refs/heads/golden-cut", "golden:golden"]);
            git(repo, "fetch", "-q", "origin");
            assert.ok(onBoth(tip), "on golden-cut and golden");
        });
    });
});

describe("golden retired (#3418)", () => {
    let saved;
    before(() => {
        saved = ctx;
        ctx = { ...ctx, retired: true };
    });
    after(() => {
        ctx = saved;
    });

    it("is the default", () => {
        assert.equal(context(repo, { env }).retired, true);
    });

    it("refuses land, cut, cut-fix, ship, auto-ship and sync, pointing to pr-open.sh, and pushes nothing", async () => {
        const before = pushes;
        for (const argv of [
            ["land", "any/branch"],
            ["land", "any/branch", "--dry-run"],
            ["cut"],
            ["cut-fix", "any/branch", "--reason", "500"],
            ["ship"],
            ["auto-ship"],
            ["sync"],
        ]) {
            const r = await run(...argv);
            assert.equal(r.code, 1, argv.join(" "));
            assert.match(
                r.out,
                new RegExp(`${argv[0]} is retired: golden no longer reaches master .*tools/pr-open\\.sh`),
            );
        }
        assert.equal(pushes, before);
    });

    it("still runs status", async () => {
        const r = await run("status");
        assert.doesNotMatch(r.out, /is retired/);
    });

    it("still brings the main checkout to GitHub's master when it refuses", async () => {
        write(other, "retired-main.txt", "m\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "chore: master moves");
        git(other, "pull", "-q", "--no-rebase", "origin", "master");
        git(other, "push", "-q", "origin", "master");
        const to = git(other, "rev-parse", "HEAD");
        const r = await run("land", "any/branch");
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /moved the main checkout's master from [0-9a-f]{10} to /);
        assert.equal(git(repo, "rev-parse", "HEAD"), to);
    });
});

describe("open work", () => {
    it("lists each branch on GitHub that golden lacks: issue, owner, date, ready, worktree, from one query", async () => {
        const wt = branch("feat/321-open", { "o.txt": "o\n" }, "feat: open");
        git(wt, "push", "-q", "origin", "feat/321-open");
        const tip = git(wt, "rev-parse", "HEAD");
        const wt2 = branch("chore/no-number", { "n.txt": "n\n" }, "chore: n");
        git(wt2, "push", "-q", "origin", "chore/no-number");
        git(repo, "config", "branch.chore/no-number.issue", "55");
        gh.issues = {
            321: {
                comments: [
                    noteBody("feat/321-open", { owner: "session abc" }),
                    `pipeline-round: ready feat/321-open ${tip}`,
                ],
            },
            55: { comments: [] },
        };
        const r = await run("status");
        assert.equal(r.code, 0, r.out);
        assert.equal(gh.filter((a) => a[1] === "graphql").length, 1);
        assert.match(r.out, /open work \(branches on GitHub that golden does not have\):/);
        assert.match(r.out, /branch\s+issue\s+owner\s+last commit\s+ready\s+worktree/);
        assert.match(r.out, new RegExp(`feat/321-open\\s+#321\\s+session abc\\s+\\d{4}-\\d\\d-\\d\\d\\s+yes\\s+${wt}`));
        assert.match(r.out, new RegExp(`chore/no-number\\s+#55\\s+-\\s+\\S+\\s+no\\s+${wt2}`));
    });
});

describe("pruning branches", () => {
    const remote = (b) =>
        spawnSync("git", ["rev-parse", "-q", "--verify", `refs/heads/${b}`], {
            cwd: join(dir, "origin.git"),
            env,
            encoding: "utf8",
        }).stdout.trim();
    const local = (b) =>
        spawnSync("git", ["rev-parse", "-q", "--verify", `refs/heads/${b}`], { cwd: repo, env }).status === 0;

    it("a landing deletes nothing: the landed branch stays on GitHub and here", async () => {
        const wt = branch("prune/me", { "pm.txt": "p\n" }, "feat: pm");
        git(wt, "push", "-q", "origin", "prune/me");
        gh.open = true;
        const r = await run("land", "prune/me");
        assert.equal(r.code, 0, r.out);
        assert.ok(remote("prune/me"));
        assert.ok(existsSync(wt) && local("prune/me"));
    });

    it("by default only lists what --yes would delete", async () => {
        git(repo, "fetch", "-q", "origin");
        const tips = ["origin/golden:refs/heads/fresh/gone", "origin/golden:refs/heads/revert/x"];
        git(repo, "push", "-q", "origin", "multi/d", "copy/c", ...tips);
        git(repo, "worktree", "add", "-q", "-b", "fresh/kept", join(dir, "wt-fresh-kept"), "origin/golden");
        git(repo, "push", "-q", "origin", "fresh/kept");
        const r = await run("prune-branches");
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /dry run -- would delete from GitHub/);
        for (const b of ["multi/d", "prune/me", "fresh/gone"]) {
            assert.match(r.out, new RegExp(`\\n  ${b} [0-9a-f]{10}`));
            assert.ok(remote(b), `${b} still on GitHub`);
        }
        assert.doesNotMatch(r.out, /copy\/c|fresh\/kept|revert\/x/);
        assert.ok(!existsSync(join(repo, "tmp/pruned-branches.log")));
    });

    it("with --yes deletes them on GitHub only, logging each name and tip first", async () => {
        const tip = git(repo, "rev-parse", "origin/multi/d");
        const r = await run("prune-branches", "--yes");
        assert.equal(r.code, 0, r.out);
        for (const b of ["multi/d", "prune/me", "fresh/gone"]) assert.equal(remote(b), "", `${b} deleted on GitHub`);
        for (const b of ["copy/c", "fresh/kept", "revert/x", "golden", "golden-cut", "master"]) assert.ok(remote(b), b);
        assert.match(readFileSync(join(repo, "tmp/pruned-branches.log"), "utf8"), new RegExp(`Z multi/d ${tip}\\n`));
        assert.ok(existsSync(join(dir, "wt-multi-d")) && local("multi/d"), "worktree and local branch kept");
    });
});

describe("the main checkout", () => {
    // A new commit on GitHub's master, made from the other clone, and verification passing it.
    const advanceMaster = (name) => {
        write(other, `${name}.txt`, `${name}\n`);
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", `chore: ${name}`);
        git(other, "pull", "-q", "--no-rebase", "origin", "master");
        git(other, "push", "-q", "origin", "master");
        git(other, "push", "-q", "-f", "origin", "HEAD:golden-verified");
        return git(other, "rev-parse", "HEAD");
    };
    const branch = () => git(repo, "symbolic-ref", "--short", "HEAD");
    // A main checkout left on golden-verified by the old rule.
    before(() => git(repo, "checkout", "-q", "-B", "golden-verified", "master"));
    after(() => git(repo, "checkout", "-q", "master"));

    it("switches from golden-verified to master, keeping untracked files and golden-verified", async () => {
        const from = git(repo, "rev-parse", "HEAD");
        write(repo, "keep-untracked.txt", "mine\n");
        const to = advanceMaster("main-switch");
        const r = await run("status");
        assert.equal(r.code, 0, r.out);
        assert.equal(branch(), "master", r.out);
        assert.equal(git(repo, "rev-parse", "HEAD"), to);
        assert.equal(git(repo, "rev-parse", "golden-verified"), from, "golden-verified is left where it was");
        assert.equal(readFileSync(join(repo, "keep-untracked.txt"), "utf8"), "mine\n");
        assert.match(
            r.out,
            new RegExp(`switched the main checkout from golden-verified \\(${from.slice(0, 10)}\\) to master`),
        );
    });

    it("fast-forwards master when GitHub's master moves", async () => {
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
            const before = git(repo, "rev-parse", "HEAD");
            const r = await run("status");
            assert.equal(branch(), "side");
            assert.equal(git(repo, "rev-parse", "HEAD"), before);
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

    it("leaves it alone with a warning when its branch has commits GitHub's lacks", async () => {
        git(repo, "checkout", "-q", "golden-verified");
        git(repo, "commit", "-q", "--allow-empty", "-m", "chore: local only");
        const before = git(repo, "rev-parse", "HEAD");
        advanceMaster("main-ahead");
        const r = await run("status");
        assert.equal(git(repo, "rev-parse", "HEAD"), before);
        assert.match(r.out, /alone: its golden-verified has commits origin\/golden-verified does not/);
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

    it("loads verify.mjs from the command line: status reaches its verification line", () => {
        // A top-level await around main left land.mjs loading, so verify.mjs's import of it never settled.
        const bin = join(dir, "no-gh-bin");
        mkdirSync(bin, { recursive: true });
        write(bin, "gh", "#!/bin/sh\nexit 1\n");
        chmodSync(join(bin, "gh"), 0o755);
        const r = spawnSync(process.execPath, [tool, "status"], {
            cwd: repo,
            env: { ...env, LAND_LIVE: join(dir, "no-live-here"), PATH: `${bin}:${env.PATH ?? process.env.PATH}` },
            encoding: "utf8",
        });
        assert.match(r.stdout, /verification of golden/, r.stderr);
        assert.doesNotMatch(r.stderr, /unsettled top-level await/);
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
        writeFileSync(join(copy, "tools/branch-note.mjs"), readFileSync(new URL("./branch-note.mjs", import.meta.url)));
        writeFileSync(join(copy, "tools/wait-log.mjs"), readFileSync(new URL("./wait-log.mjs", import.meta.url)));
        writeFileSync(join(copy, "tools/ship-risks.mjs"), readFileSync(new URL("./ship-risks.mjs", import.meta.url)));
        // The copy would hand off to LAND_LIVE, i.e. to itself, if the hand-off mark did not stop it.
        const r = cli(copy, "nonsense");
        assert.equal(r.status, 1, r.stderr);
        assert.equal(r.stderr.match(/usage:/g).length, 1, r.stderr);
        assert.doesNotMatch(r.stderr, /no live copy/);
    });
});

describe("the light gate", () => {
    it("is on only while CI verifies golden, and status says which gate pushes run", async () => {
        const state = join(repo, "tmp/golden/verify.json");
        assert.equal(existsSync(state), false);
        assert.equal(lightGate(ctx), "0", "no verification state: the local backend, the full gate");
        assert.match((await run("status")).out, /^gate: full /m);
        mkdirSync(join(repo, "tmp/golden"), { recursive: true });
        try {
            writeFileSync(state, JSON.stringify({ backend: { name: "local", reason: "r", at: "t" } }));
            assert.equal(lightGate(ctx), "0");
            writeFileSync(state, JSON.stringify({ backend: { name: "ci", reason: null, at: "t" } }));
            assert.equal(lightGate(ctx), "1");
            assert.match((await run("status")).out, /^gate: light /m);
        } finally {
            rmSync(state);
        }
    });
});

describe("the gate snapshot of a landing", () => {
    it("takes one held snapshot at the first push and gives every later push of the run the same one", async () => {
        const live = join(dir, "snap-live");
        mkdirSync(join(live, "tools"), { recursive: true });
        const calls = join(dir, "snap-calls");
        // A stand-in for tools/gate-snapshot.sh --hold: names its snapshot, then holds it until stdin closes.
        const script = `#!/bin/sh\necho "$*" >>'${calls}'\necho '${live}-snap'\ncat >/dev/null\n`;
        writeFileSync(join(live, "tools/gate-snapshot.sh"), script, { mode: 0o755 });
        const c = { main: dir, env: { ...env, PUSH_QUEUE_GATE: live } };
        assert.equal(await gateSnapshot(c), `${live}-snap`);
        assert.equal(await gateSnapshot(c), `${live}-snap`, "the check and the push share it");
        assert.equal(readFileSync(calls, "utf8"), `--hold ${live}\n`, "taken once, and held");
        // A snapshot given as the live gate is used as it is.
        writeFileSync(join(live, ".gate-snapshot"), "sha\n");
        assert.equal(await gateSnapshot({ main: dir, env: { ...env, PUSH_QUEUE_GATE: live } }), live);
    });
});
