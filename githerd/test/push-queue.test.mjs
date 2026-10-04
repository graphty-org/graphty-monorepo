import { spawn } from "node:child_process";
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { createPushQueue } from "../lib/actor/push.mjs";
import { move, newJob } from "../lib/board.mjs";
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
    queue = createPushQueue({
        root: repo.root,
        state,
        ledger: (e) => entries.push(e),
        mode: () => mode,
        ring: async (job, text) => rings.push({ job: job.id, text }),
        credentialBlocked: () => blocked,
        now: () => now,
    });
});
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
        expect(state.pushQueue.gateMs).toBe(5 * 60_000);
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
        state.pushQueue.gateMs = 100;
        const a = workingJob("a");
        await queue.request({ job: "a", branch: "githerd/a", expectHead: a.head }, "s-a");
        await queue.drain();
        expect(a.job.news.at(-1).text).toMatch(/^push failed \(outside: timed out after 0 minutes\)/);
        expect(alive(Number(readFileSync(join(repo.tmp, "gate-pid"), "utf8")))).toBe(false);
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
