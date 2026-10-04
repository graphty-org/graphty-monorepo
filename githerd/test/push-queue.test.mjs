import { spawn } from "node:child_process";
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { createPushQueue } from "../lib/actor/push.mjs";
import { move, newJob } from "../lib/board.mjs";
import { identify } from "../lib/proc.mjs";
import { codeEnv } from "../lib/worker-settings.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

/**
 * The fake pre-push gate, installed as the repository's pre-push hook. It reads what to do from
 * `<tmp>/gate-mode`: pass, fail (the real gate's failure lines), wait (until `<tmp>/go` exists) or
 * hang. It writes its pid to `<tmp>/gate-pid` and the pushed branch to `<tmp>/gate-log`.
 * @param {string} tmp the test's directory
 * @returns {string} the script
 */
const gateScript = (tmp) => `#!/bin/sh
echo $$ > "${tmp}/gate-pid"
env > "${tmp}/gate-env"
while read local_ref local_sha remote_ref remote_sha; do echo "$remote_ref" >> "${tmp}/gate-log"; done
case "$(cat "${tmp}/gate-mode")" in
  fail) printf '\\033[0;31m[FAIL] Lint failed\\033[0m\\n'; echo "Pre-push validation failed"; exit 1;;
  wait) while [ ! -f "${tmp}/go" ]; do sleep 0.05; done;;
  hang) sleep 1000;;
esac
exit 0
`;

/** @type {{tmp: string, root: string, remote: string}} */
let repo;
/** @type {any} */
let state;
/** @type {any[]} */
let entries;
/** @type {{job: string, text: string}[]} */
let rings;
/** @type {string} */
let mode;
/** @type {string | null} */
let blocked;
/** @type {ReturnType<typeof createPushQueue>} */
let queue;
/** @type {number[]} */
let spawned;
const now = new Date("2026-10-04T12:00:00Z");

beforeAll(() => isolateGit());
beforeEach(() => {
    repo = makeRepo();
    put(join(repo.tmp, "hooks/pre-push"), gateScript(repo.tmp));
    chmodSync(join(repo.tmp, "hooks/pre-push"), 0o755);
    git(repo.root, "config", "core.hooksPath", join(repo.tmp, "hooks"));
    gate("pass");
    state = { jobs: {} };
    entries = [];
    rings = [];
    mode = "acting";
    blocked = null;
    spawned = [];
    queue = makeQueue();
});

/**
 * A queue on the test's state, as the daemon makes one.
 * @param {Partial<Parameters<typeof createPushQueue>[0]>} [over] options to change
 * @returns {ReturnType<typeof createPushQueue>} the queue
 */
function makeQueue(over = {}) {
    return createPushQueue({
        root: repo.root,
        state,
        ledger: (e) => entries.push(e),
        mode: () => mode,
        ring: async (job, text) => rings.push({ job: job.id, text }),
        credentialBlocked: () => blocked,
        env: testEnv(),
        hooksPath: join(repo.tmp, "hooks"),
        now: () => now,
        ...over,
    });
}

/**
 * The push's environment as the daemon builds it, plus the test's git isolation.
 * @param {Record<string, string>} [extra] variables in the daemon's own environment
 * @returns {Record<string, string>} the environment
 */
function testEnv(extra = {}) {
    return {
        ...codeEnv({ env: { ...process.env, ...extra }, path: /** @type {string} */ (process.env.PATH), signing: {} }),
        GIT_CONFIG_GLOBAL: /** @type {string} */ (process.env.GIT_CONFIG_GLOBAL),
        GIT_CONFIG_NOSYSTEM: "1",
    };
}
afterEach(async () => {
    queue.stop();
    await queue.drain();
    for (const pid of spawned) kill(pid);
    const gatePid = existsSync(join(repo.tmp, "gate-pid"))
        ? Number(readFileSync(join(repo.tmp, "gate-pid"), "utf8"))
        : 0;
    rmSync(repo.tmp, { recursive: true, force: true });
    for (const pid of [...spawned, gatePid].filter(Boolean)) expect(alive(pid)).toBe(false);
});

/**
 * Sets what the fake gate does.
 * @param {string} what pass, fail, wait or hang
 */
function gate(what) {
    writeFileSync(join(repo.tmp, "gate-mode"), what);
}

/**
 * Whether a process exists.
 * @param {number} pid the process
 * @returns {boolean} true when it does
 */
function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

/**
 * Kills a process, ignoring one that is gone.
 * @param {number} pid the process
 */
function kill(pid) {
    try {
        process.kill(pid, "SIGKILL");
    } catch {
        // Gone.
    }
}

/**
 * Waits until a condition holds, checking every 20 ms.
 * @param {() => boolean} cond the condition
 */
async function until(cond) {
    while (!cond()) await new Promise((r) => setTimeout(r, 20));
}

/**
 * A working job held by session `s-<name>`, with a detached worktree at master and one signed
 * commit in it.
 * @param {string} name the job's name, also its worktree's
 * @param {{kind?: string, pr?: number, sign?: boolean}} [o] the job's kind and pull request, and
 *   whether the commit is signed
 * @returns {{job: any, head: string, dir: string}} the job, its worktree's HEAD and the worktree
 */
function workingJob(name, { kind = "issue", pr, sign = true } = {}) {
    const dir = join(repo.root, ".worktrees", name);
    git(repo.root, "worktree", "add", "-q", "--detach", dir, "master");
    put(join(dir, `${name}.txt`), `${name}\n`);
    const head = commitAll(dir, `feat: ${name}`, { sign });
    const job = newJob({ kind, target: `issue:${name}`, id: name }, now);
    move(job, "starting", now, { holder: { session: `s-${name}` } });
    move(job, "working", now);
    job.claim = { session: `s-${name}` };
    job.worktree = dir;
    if (pr) job.pr = pr;
    state.jobs[name] = job;
    return { job, head, dir };
}

/**
 * The remote's head of a branch, or null.
 * @param {string} branch the branch
 * @returns {string | null} its commit
 */
function remoteHead(branch) {
    try {
        return git(repo.remote, "rev-parse", "--verify", "-q", `refs/heads/${branch}`);
    } catch {
        return null;
    }
}

describe("refusals", () => {
    const cases =
        /** @type {[string, ((j: any) => void) | null, Partial<{branch: string, session: string, head: string}>, RegExp][]} */ ([
            [
                "no claim",
                (j) => {
                    j.claim = null;
                },
                {},
                /no claim/,
            ],
            ["another session", null, { session: "s-other" }, /no claim/],
            [
                "a job not working",
                (j) => move(j, "parked", now, { waitingFor: { owner: "x" } }),
                {},
                /parked, not working/,
            ],
            [
                "unacknowledged news",
                (j) => {
                    j.news.push({ at: "", text: "issue edited", acked: false });
                },
                {},
                /unacknowledged news/,
            ],
            ["the default branch", null, { branch: "master" }, /default branch/],
            ["a new branch outside githerd/", null, { branch: "feature/x" }, /githerd\/<name>/],
            [
                "another branch than the job's",
                (j) => {
                    j.branch = "githerd/a";
                },
                { branch: "githerd/b" },
                /pushes githerd\/a/,
            ],
            ["a stale expectHead", null, { head: "0".repeat(40) }, /is not the worktree's HEAD/],
            [
                "no worktree",
                (j) => {
                    j.worktree = null;
                },
                {},
                /no worktree/,
            ],
        ]);
    for (const [what, setup, over, reason] of cases) {
        it(`refuses ${what}, with no effect`, async () => {
            const { job, head } = workingJob("a");
            setup?.(job);
            const before = job.state;
            const r = await queue.request(
                { job: "a", branch: over.branch ?? "githerd/a", expectHead: over.head ?? head },
                over.session ?? "s-a",
            );
            expect(r).toEqual({ ok: false, reason: expect.stringMatching(reason) });
            expect(state.pushQueue.entries).toEqual([]);
            expect(job.state).toBe(before);
            expect(entries).toEqual([]);
        });
    }

    it("refuses an unknown job, a blocked credential and a second push of one job", async () => {
        expect(await queue.request({ job: "nope", branch: "githerd/a", expectHead: "a".repeat(40) }, "s")).toEqual({
            ok: false,
            reason: "no job nope",
        });
        const { head } = workingJob("a");
        blocked = "the gh token is refused";
        expect((await queue.request({ job: "a", branch: "githerd/a", expectHead: head }, "s-a")).reason).toBe(
            "credential blocked: the gh token is refused",
        );
        blocked = null;
        gate("wait");
        expect(await queue.request({ job: "a", branch: "githerd/a", expectHead: head }, "s-a")).toMatchObject({
            queued: true,
        });
        state.jobs.a.state = "working";
        expect((await queue.request({ job: "a", branch: "githerd/a", expectHead: head }, "s-a")).reason).toMatch(
            /already has a push queued/,
        );
        writeFileSync(join(repo.tmp, "go"), "");
    });
});

describe("a push", () => {
    it("runs the gate as a hook, pushes the head and delivers the result as news", async () => {
        const { job, head } = workingJob("a");
        const r = await queue.request({ job: "a", branch: "githerd/a", expectHead: head }, "s-a");
        expect(r).toEqual({ queued: true, position: 1, estimateMinutes: 30 });
        expect(job.state).toBe("waiting");
        expect(job.waitingFor).toEqual({ push: "push-1" });
        await queue.drain();
        expect(remoteHead("githerd/a")).toBe(head);
        expect(readFileSync(join(repo.tmp, "gate-log"), "utf8")).toBe("refs/heads/githerd/a\n");
        expect(job.state).toBe("working");
        expect(job.branch).toBe("githerd/a");
        expect(job.pushedHead).toBe(head);
        expect(job.news.at(-1)).toMatchObject({ text: `pushed ${head} to githerd/a`, acked: false });
        expect(rings).toEqual([{ job: "a", text: `pushed ${head} to githerd/a` }]);
        expect(entries.map((e) => e.kind)).toEqual(["push-queued", "action"]);
        expect(state.pushQueue.entries).toEqual([]);
        expect(state.pushQueue.gateRuns).toHaveLength(1);
    });

    it("pushes nothing in dry-run and says so", async () => {
        mode = "dry-run";
        const { job, head } = workingJob("a");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: head }, "s-a");
        await queue.drain();
        expect(remoteHead("githerd/a")).toBeNull();
        expect(existsSync(join(repo.tmp, "gate-log"))).toBe(false);
        expect(entries.at(-1)).toMatchObject({ kind: "would-do", op: `push ${head} to origin githerd/a` });
        expect(job.news.at(-1).text).toMatch(/dry-run\): nothing was pushed/);
        expect(job.state).toBe("working");
    });

    it("refuses an unsigned commit without running the gate", async () => {
        const { job, head } = workingJob("a", { sign: false });
        await queue.request({ job: "a", branch: "githerd/a", expectHead: head }, "s-a");
        await queue.drain();
        expect(remoteHead("githerd/a")).toBeNull();
        expect(job.news.at(-1).text).toMatch(/^push refused: commit \w{9} is not signed/);
        expect(entries.at(-1).kind).toBe("push-refused");
    });

    it("refuses when the worktree's HEAD moved after the push was queued", async () => {
        gate("wait");
        const first = workingJob("a");
        const second = workingJob("b");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: first.head }, "s-a");
        await queue.request({ job: "b", branch: "githerd/b", expectHead: second.head }, "s-b");
        put(join(second.dir, "more.txt"), "more\n");
        commitAll(second.dir, "feat: more");
        writeFileSync(join(repo.tmp, "go"), "");
        await queue.drain();
        expect(remoteHead("githerd/b")).toBeNull();
        expect(second.job.news.at(-1).text).toMatch(/HEAD moved/);
    });

    it("pushes nothing for a job cancelled while its push waited", async () => {
        gate("wait");
        const first = workingJob("a");
        const second = workingJob("b");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: first.head }, "s-a");
        await queue.request({ job: "b", branch: "githerd/b", expectHead: second.head }, "s-b");
        move(second.job, "faulted", now);
        move(second.job, "failed", now);
        writeFileSync(join(repo.tmp, "go"), "");
        await queue.drain();
        expect(remoteHead("githerd/b")).toBeNull();
        expect(second.job.news.at(-1).text).toBe("b is failed; nothing was pushed");
    });
});

describe("gate failures", () => {
    it("classifies a gate failure under its local key, own the first time and shared the second", async () => {
        gate("fail");
        const a = workingJob("a");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
        await queue.drain();
        expect(remoteHead("githerd/a")).toBeNull();
        expect(a.job.news.at(-1).text).toBe("gate failed local / gate / Lint failed (own: no other class matched)");
        expect(a.job.state).toBe("working");

        const b = workingJob("b");
        await queue.request({ job: "b", branch: "githerd/b", expectHead: b.head }, "s-b");
        await queue.drain();
        expect(b.job.news.at(-1).text).toMatch(/^gate failed local \/ gate \/ Lint failed \(shared: the same key on 1/);
        expect(entries.filter((e) => e.kind === "push-failed").map((e) => e.class)).toEqual(["own", "shared"]);
    });

    it("calls a gate failure shared when the same step fails on the green commit", async () => {
        gate("fail");
        state.reference = { gate: { verdict: "fail", sha: "x", steps: ["Lint failed"] } };
        const a = workingJob("a");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
        await queue.drain();
        expect(a.job.news.at(-1).text).toMatch(/\(shared: the local gate key also fails on the green commit\)/);
    });

    it("classifies a rejected push that never reached the gate", async () => {
        const a = workingJob("a");
        writeFileSync(
            join(repo.remote, "hooks", "pre-receive"),
            "#!/bin/sh\necho 'Permission denied (publickey).'\nexit 1\n",
        );
        chmodSync(join(repo.remote, "hooks", "pre-receive"), 0o755);
        await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
        await queue.drain();
        expect(a.job.news.at(-1).text).toMatch(/^push failed \(credential: ssh key refused\)/);
    });

    it("kills a push that runs past twice the gate's duration, gate included", async () => {
        gate("hang");
        queue = makeQueue({ defaultGateMs: 50 });
        state.pushQueue.gateRuns = [10];
        const a = workingJob("a");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
        await queue.drain();
        expect(a.job.news.at(-1).text).toMatch(/^push failed \(outside: timed out after 0 minutes\)/);
        expect(alive(Number(readFileSync(join(repo.tmp, "gate-pid"), "utf8")))).toBe(false);
    });
});

describe("the gate runs as for a person", () => {
    it("refuses a new commit that changes a path the gate runs, without running the gate", async () => {
        const { job, dir } = workingJob("a");
        put(join(dir, "tools", "prepush.sh"), "exit 0\n");
        const head = commitAll(dir, "fix: skip the flaky step");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: head }, "s-a");
        await queue.drain();
        expect(remoteHead("githerd/a")).toBeNull();
        expect(existsSync(join(repo.tmp, "gate-log"))).toBe(false);
        expect(job.news.at(-1).text).toMatch(/^push refused: .*it changes tools\/prepush\.sh/);
    });

    it("refuses a config-protected path and uncommitted changes to the gate's files", async () => {
        queue = makeQueue({ protectedPaths: () => ["visual-baselines/"] });
        const a = workingJob("a");
        put(join(a.dir, "visual-baselines", "x.png"), "x");
        const head = commitAll(a.dir, "test: new baseline");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: head }, "s-a");
        await queue.drain();
        expect(a.job.news.at(-1).text).toMatch(/it changes visual-baselines\/x\.png/);

        const b = workingJob("b");
        put(join(b.dir, ".husky", "pre-push"), "exit 0\n");
        await queue.request({ job: "b", branch: "githerd/b", expectHead: b.head }, "s-b");
        await queue.drain();
        expect(b.job.news.at(-1).text).toMatch(/uncommitted changes to gate paths: \?\? \.husky\//);
        expect(existsSync(join(repo.tmp, "gate-log"))).toBe(false);
    });

    it("allows a merge of the default branch that brought a gate change in", async () => {
        const { job, dir } = workingJob("a");
        put(join(repo.root, "tools", "prepush.sh"), "echo new gate\n");
        commitAll(repo.root, "chore: new gate");
        git(repo.root, "push", "-q", "origin", "master");
        git(repo.root, "fetch", "-q", "origin");
        git(dir, "merge", "-q", "-S", "--no-edit", "origin/master");
        const head = git(dir, "rev-parse", "HEAD");
        expect(git(dir, "rev-list", "--parents", "-n", "1", "HEAD").split(" ")).toHaveLength(3);
        await queue.request({ job: "a", branch: "githerd/a", expectHead: head }, "s-a");
        await queue.drain();
        expect(job.news.at(-1).text).toBe(`pushed ${head} to githerd/a`);
    });

    it("runs the main checkout's hooks, whatever the repository's config names", async () => {
        const evil = join(repo.tmp, "evil");
        put(join(evil, "pre-push"), `#!/bin/sh\ntouch "${repo.tmp}/evil-ran"\nexit 0\n`);
        chmodSync(join(evil, "pre-push"), 0o755);
        git(repo.root, "config", "core.hooksPath", evil);
        const a = workingJob("a");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
        await queue.drain();
        expect(existsSync(join(repo.tmp, "evil-ran"))).toBe(false);
        expect(readFileSync(join(repo.tmp, "gate-log"), "utf8")).toBe("refs/heads/githerd/a\n");

        queue = makeQueue({ hooksPath: join(repo.tmp, "none") });
        const b = workingJob("b");
        await queue.request({ job: "b", branch: "githerd/b", expectHead: b.head }, "s-b");
        await queue.drain();
        expect(b.job.news.at(-1).text).toMatch(/no pre-push hook in/);
    });

    it("never hands the daemon's own environment to the gate", async () => {
        process.env.PUSHOVER_TEST = "daemon-only";
        try {
            queue = makeQueue({ env: testEnv({ PUSHOVER_TEST: "daemon-only" }) });
            const a = workingJob("a");
            await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
            await queue.drain();
        } finally {
            delete process.env.PUSHOVER_TEST;
        }
        const env = readFileSync(join(repo.tmp, "gate-env"), "utf8");
        expect(env).toContain("PATH=");
        expect(env).not.toContain("PUSHOVER_TEST");
        expect(() => makeQueue({ env: /** @type {any} */ (undefined) })).toThrow(/allow-listed environment/);
    });

    it("bounds a push at twice the longest recent gate, never below twice the default", async () => {
        gate("wait");
        state.pushQueue.gateRuns = [60_000];
        const a = workingJob("a");
        const r = await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
        expect(r).toMatchObject({ estimateMinutes: 30 });
        expect(a.job.clock.budgetMs).toBe(2 * 30 * 60_000);
        state.pushQueue.gateRuns = [60_000, 50 * 60_000, 60_000];
        const b = workingJob("b");
        expect(await queue.request({ job: "b", branch: "githerd/b", expectHead: b.head }, "s-b")).toMatchObject({
            estimateMinutes: 100,
        });
        writeFileSync(join(repo.tmp, "go"), "");
    });
});

describe("a githerd restart", () => {
    it("ends a push the old daemon was running and starts the queued ones", async () => {
        const a = workingJob("a");
        const b = workingJob("b");
        const old = spawn("sleep", ["1000"], { stdio: "ignore", detached: true });
        spawned.push(/** @type {number} */ (old.pid));
        await until(() => identify(/** @type {number} */ (old.pid)) !== null);
        const dead = spawn("true");
        await new Promise((r) => dead.on("close", r));
        const saved = (/** @type {any} */ job, /** @type {string} */ id, /** @type {any} */ over) => {
            move(job.job, "waiting", now, { waitingFor: { push: id } });
            return {
                id,
                job: job.job.id,
                branch: `githerd/${job.job.id}`,
                head: job.head,
                worktree: job.dir,
                rank: 2,
                queuedAt: now.toISOString(),
                ...over,
            };
        };
        const c = workingJob("c");
        state.pushQueue.entries = [
            saved(a, "push-1", { status: "running", pid: dead.pid, startTime: "1" }),
            saved(b, "push-2", { status: "queued", pid: null, startTime: null }),
            saved(c, "push-3", {
                status: "running",
                pid: old.pid,
                startTime: identify(/** @type {number} */ (old.pid))?.startTime,
            }),
        ];
        state.pushQueue.next = 4;
        queue = makeQueue();
        await queue.drain();
        expect(a.job.state).toBe("working");
        expect(a.job.news.at(-1).text).toMatch(
            /interrupted by a githerd restart; check the remote head and push again/,
        );
        expect(c.job.state).toBe("working");
        await until(() => old.exitCode !== null || old.signalCode !== null);
        expect(b.job.state).toBe("working");
        expect(remoteHead("githerd/b")).toBe(b.head);
        expect(state.pushQueue.entries).toEqual([]);
        expect(entries.filter((e) => e.kind === "push-interrupted").map((e) => e.job)).toEqual(["a", "c"]);
        // A later push of an interrupted job is accepted.
        a.job.news.forEach((/** @type {any} */ n) => (n.acked = true));
        expect(await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a")).toMatchObject({
            queued: true,
        });
        await queue.drain();
    });
});

describe("order", () => {
    it("runs one push at a time: incident fixes, then pull request updates, then the rest", async () => {
        gate("wait");
        const jobs = [
            workingJob("first"),
            workingJob("other"),
            workingJob("update", { kind: "pr", pr: 7 }),
            workingJob("fix", { kind: "incident" }),
        ];
        const answers = [];
        for (const { job, head } of jobs) {
            answers.push(
                await queue.request({ job: job.id, branch: `githerd/${job.id}`, expectHead: head }, `s-${job.id}`),
            );
        }
        expect(answers.map((a) => /** @type {any} */ (a).position)).toEqual([1, 2, 2, 2]);
        expect(queue.depth()).toBe(3);
        await until(() => existsSync(join(repo.tmp, "gate-log")));
        writeFileSync(join(repo.tmp, "go"), "");
        await queue.drain();
        expect(readFileSync(join(repo.tmp, "gate-log"), "utf8").trim().split("\n")).toEqual([
            "refs/heads/githerd/first",
            "refs/heads/githerd/fix",
            "refs/heads/githerd/update",
            "refs/heads/githerd/other",
        ]);
        expect(queue.depth()).toBe(0);
    });
});

describe("a worker's death", () => {
    it("does not stop its push, and the result waits as news for the next session", async () => {
        gate("wait");
        const a = workingJob("a");
        const worker = spawn("sleep", ["1000"], { stdio: "ignore" });
        spawned.push(/** @type {number} */ (worker.pid));
        a.job.holder.pid = worker.pid;
        await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
        await until(() => existsSync(join(repo.tmp, "gate-log")));
        worker.kill("SIGKILL");
        await until(() => !alive(/** @type {number} */ (worker.pid)));
        writeFileSync(join(repo.tmp, "go"), "");
        await queue.drain();
        expect(remoteHead("githerd/a")).toBe(a.head);
        expect(a.job.news.at(-1)).toMatchObject({ text: `pushed ${a.head} to githerd/a`, acked: false });
    });
});

describe("stop", () => {
    it("kills a running push's process group", async () => {
        gate("hang");
        const a = workingJob("a");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
        await until(() => existsSync(join(repo.tmp, "gate-pid")));
        queue.stop();
        await queue.drain();
        expect(remoteHead("githerd/a")).toBeNull();
        expect(a.job.news.at(-1).text).toMatch(/^push failed/);
    });
});
