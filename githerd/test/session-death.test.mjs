import { spawn } from "node:child_process";
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { createPushQueue } from "../lib/actor/push.mjs";
import { codeEnv } from "../lib/worker-settings.mjs";
import { move, newJob } from "../lib/board.mjs";
import { recoverDeath, sweepWorktree, worktreeProcesses } from "../lib/session-death.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

/**
 * The fake pre-push gate: waits until `<tmp>/go` exists, writing its pid to `<tmp>/gate-pid` first.
 * @param {string} tmp the test's directory
 * @returns {string} the script
 */
const gateScript = (tmp) => `#!/bin/sh
echo $$ > "${tmp}/gate-pid"
cat > /dev/null
while [ ! -f "${tmp}/go" ]; do sleep 0.05; done
exit 0
`;

/** A process that runs until killed. */
const FOREVER = "setInterval(() => {}, 1000)";
/**
 * A process that ignores SIGTERM and runs until SIGKILL; it creates `ready` once it ignores it.
 * @param {string} ready the file it creates
 * @returns {string} its code
 */
const stubbornCode = (ready) =>
    `process.on("SIGTERM", () => {}); require("node:fs").writeFileSync(${JSON.stringify(ready)}, ""); ${FOREVER}`;

/** @type {{tmp: string, root: string, remote: string}} */
let repo;
/** @type {any} */
let state;
/** @type {any[]} */
let entries;
/** @type {number[]} */
let spawned;
/** @type {ReturnType<typeof createPushQueue>} */
let queue;
/** @type {string[]} */
let calls;
const t0 = new Date("2026-10-04T12:00:00Z");
const REPO = "graphty-org/graphty-monorepo";

beforeAll(() => isolateGit());
beforeEach(() => {
    repo = makeRepo();
    put(join(repo.tmp, "hooks/pre-push"), gateScript(repo.tmp));
    chmodSync(join(repo.tmp, "hooks/pre-push"), 0o755);
    git(repo.root, "config", "core.hooksPath", join(repo.tmp, "hooks"));
    state = { jobs: {} };
    entries = [];
    spawned = [];
    calls = [];
    queue = createPushQueue({
        root: repo.root,
        state,
        ledger: (e) => entries.push(e),
        mode: () => "acting",
        env: {
            ...codeEnv({ env: process.env, path: /** @type {string} */ (process.env.PATH), signing: {} }),
            GIT_CONFIG_GLOBAL: /** @type {string} */ (process.env.GIT_CONFIG_GLOBAL),
            GIT_CONFIG_NOSYSTEM: "1",
        },
        hooksPath: join(repo.tmp, "hooks"),
        now: () => t0,
    });
});
afterEach(async () => {
    writeFileSync(join(repo.tmp, "go"), "");
    queue.stop();
    await queue.drain();
    for (const pid of spawned) kill(pid);
    const gatePid = existsSync(join(repo.tmp, "gate-pid"))
        ? Number(readFileSync(join(repo.tmp, "gate-pid"), "utf8"))
        : 0;
    await until(() => [...spawned, gatePid].filter(Boolean).every((p) => !alive(p)));
    rmSync(repo.tmp, { recursive: true, force: true });
});

/**
 * Whether a process runs (a zombie does not).
 * @param {number} pid the process
 * @returns {boolean} true when it runs
 */
function alive(pid) {
    try {
        return !/^\S+ \(.*\) Z /.test(readFileSync(`/proc/${pid}/stat`, "utf8"));
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
 * Starts a node process in a directory, in its own process group, as a session or its leftovers.
 * @param {string} cwd where it runs
 * @param {string} code what it runs
 * @returns {number} its pid
 */
function start(cwd, code = FOREVER) {
    const child = spawn(process.execPath, ["-e", code], { cwd, detached: true, stdio: "ignore" });
    child.unref();
    spawned.push(/** @type {number} */ (child.pid));
    return /** @type {number} */ (child.pid);
}

/**
 * A working job held by session `s-<name>`, with a detached worktree at master and one signed
 * commit in it.
 * @param {string} name the job and its worktree
 * @returns {{job: any, head: string, dir: string}} the job, its HEAD and its worktree
 */
function workingJob(name) {
    const dir = join(repo.root, ".worktrees", name);
    git(repo.root, "worktree", "add", "-q", "--detach", dir, "master");
    put(join(dir, `${name}.txt`), `${name}\n`);
    const head = commitAll(dir, `feat: ${name}`);
    const job = newJob({ kind: "issue", target: `issue:${name}`, id: name }, t0);
    move(job, "starting", t0, { holder: { session: `s-${name}` } });
    move(job, "working", t0);
    job.claim = { session: `s-${name}` };
    job.sessions = [`s-${name}`];
    job.worktree = dir;
    state.jobs[name] = job;
    return { job, head, dir };
}

/**
 * A fake GitHub client answering the branch ref and the pull request list.
 * @param {{head?: string | null, prs?: any[], fail?: boolean}} answers the remote head (null for
 *   a 404), the pull requests, or a failure on every call
 * @returns {{get: (path: string) => Promise<{body: any}>}} the client
 */
function fakeGitHub({ head = null, prs = [], fail = false } = {}) {
    return {
        async get(path) {
            calls.push(path);
            if (fail) throw new Error("network down");
            if (path.includes("/git/ref/heads/")) {
                if (!head) throw Object.assign(new Error("Not Found"), { status: 404 });
                return { body: { object: { sha: head } } };
            }
            return { body: prs };
        },
    };
}

/**
 * Recovers a job's death with the defaults the tests share.
 * @param {any} job the job
 * @param {Partial<Parameters<typeof recoverDeath>[0]>} [over] options to override
 * @returns {ReturnType<typeof recoverDeath>} the result
 */
function recover(job, over = {}) {
    return recoverDeath({
        job,
        state,
        repo: REPO,
        github: fakeGitHub(),
        ledger: (e) => entries.push(e),
        resumeVerified: true,
        now: () => t0,
        graceMs: 1000,
        sleep: () => new Promise((r) => setTimeout(r, 20)),
        ...over,
    });
}

describe("a worker killed mid-push", () => {
    it("ends the session's leftovers, keeps the push running, and the job continues with correct news", async () => {
        const { job, head, dir } = workingJob("mid-push");
        const worker = start(dir);
        const orphan = start(dir);
        expect(
            await queue.request({ job: "mid-push", branch: "githerd/mid-push", expectHead: head }, "s-mid-push"),
        ).toMatchObject({
            queued: true,
        });
        await until(() => existsSync(join(repo.tmp, "gate-pid")));
        const gatePid = Number(readFileSync(join(repo.tmp, "gate-pid"), "utf8"));
        // The gate's git runs in the worktree too; a stale index.lock waits until nothing uses it.
        const lock = git(dir, "rev-parse", "--path-format=absolute", "--git-path", "index.lock");
        writeFileSync(lock, "");

        kill(worker); // the session dies; its orphan stays behind
        await until(() => !alive(worker));
        const github = fakeGitHub({ head: "a".repeat(40), prs: [{ number: 12, state: "open" }] });
        const r = await recover(job, { github, capture: "last screen" });

        expect(r).toMatchObject({ action: "resume", session: "s-mid-push", indexLock: false });
        await until(() => !alive(orphan));
        expect(alive(gatePid)).toBe(true);
        expect(existsSync(lock)).toBe(true);
        expect(job.state).toBe("waiting");
        expect(job.holder).toBeNull();
        expect(job.pr).toBe(12);
        expect(job.deaths).toEqual([{ at: t0.toISOString(), capture: "last screen" }]);
        const news = job.news.at(-1).text;
        expect(news).toContain(`PR #12 (open) exists for githerd/mid-push, remote head ${"a".repeat(40)}`);
        expect(news).toContain(`your push of ${head} to githerd/mid-push is still running`);
        expect(entries.at(-1)).toMatchObject({ kind: "session-death", job: "mid-push", action: "resume" });

        writeFileSync(join(repo.tmp, "go"), "");
        await queue.drain();
        expect(git(repo.remote, "rev-parse", "refs/heads/githerd/mid-push")).toBe(head);
        expect(job.news.at(-1).text).toBe(`pushed ${head} to githerd/mid-push`);
        expect(job.state).toBe("working");
        rmSync(lock);
    });
});

describe("the sweep", () => {
    it("SIGKILLs what ignores SIGTERM after the grace, and leaves processes outside the worktree", async () => {
        const { dir } = workingJob("stubborn");
        const ready = join(repo.tmp, "ready");
        const stubborn = start(dir, stubbornCode(ready));
        const outside = start(repo.tmp);
        await until(() => existsSync(ready));
        /** @type {number[]} */
        const waits = [];
        const r = await sweepWorktree(dir, {
            graceMs: 1000,
            sleep: async (ms) => {
                waits.push(ms);
            },
        });
        expect(r).toEqual({ ended: [], killed: [stubborn], spared: [] });
        expect(waits).toEqual(Array(10).fill(100));
        await until(() => !alive(stubborn));
        expect(alive(outside)).toBe(true);
    });

    it("stops waiting as soon as everything ended on SIGTERM", async () => {
        const { dir } = workingJob("polite");
        const polite = start(dir);
        await until(() => worktreeProcesses(dir).users.length === 1);
        let waits = 0;
        const r = await sweepWorktree(dir, {
            sleep: async () => {
                waits++;
                await until(() => !alive(polite));
            },
        });
        expect(r).toEqual({ ended: [polite], killed: [], spared: [] });
        expect(waits).toBe(1);
    });

    it("does nothing for an empty worktree", async () => {
        const { dir } = workingJob("empty");
        let waits = 0;
        const sleep = async () => {
            waits++;
        };
        expect(await sweepWorktree(dir, { sleep })).toEqual({ ended: [], killed: [], spared: [] });
        expect(waits).toBe(0);
    });
});

describe("recovery", () => {
    it("removes a stale index.lock once nothing uses the worktree", async () => {
        const { job, dir } = workingJob("lock");
        const lock = git(dir, "rev-parse", "--path-format=absolute", "--git-path", "index.lock");
        writeFileSync(lock, "");
        const r = await recover(job);
        expect(r.indexLock).toBe(true);
        expect(existsSync(lock)).toBe(false);
    });

    it("says nothing was pushed and calls GitHub not at all when the job has no branch", async () => {
        const { job } = workingJob("fresh-job");
        await recover(job);
        expect(calls).toEqual([]);
        expect(job.news.at(-1).text).toBe("your session died; nothing was pushed yet: the job has no branch on GitHub");
    });

    it("reports a branch missing on GitHub, a branch with no pull request, and an unreachable GitHub", async () => {
        const { job } = workingJob("branches");
        job.branch = "githerd/branches";
        await recover(job, { github: fakeGitHub({ head: null }) });
        expect(job.news.at(-1).text).toContain("branch githerd/branches is not on GitHub");
        await recover(job, { github: fakeGitHub({ head: "b".repeat(40) }) });
        expect(job.news.at(-1).text).toContain(`on GitHub at ${"b".repeat(40)}; no pull request has it as head`);
        expect(calls.at(-1)).toBe(`repos/${REPO}/pulls?head=graphty-org:githerd%2Fbranches&state=all&per_page=100`);
        // The third death faults the job, whatever GitHub says.
        const r = await recover(job, { github: fakeGitHub({ fail: true }) });
        expect(job.news.at(-1).text).toContain("GitHub could not be read after the session died (network down)");
        expect(r.action).toBe("faulted");
        expect(job.state).toBe("faulted");
    });

    it("keeps a known pull request number", async () => {
        const { job } = workingJob("known");
        job.branch = "githerd/known";
        job.pr = 7;
        await recover(job, { github: fakeGitHub({ head: "c".repeat(40), prs: [{ number: 9, state: "open" }] }) });
        expect(job.pr).toBe(7);
    });

    it("starts fresh after a second death within 30 minutes", async () => {
        const { job } = workingJob("twice");
        expect((await recover(job)).action).toBe("resume");
        const r = await recover(job, { now: () => new Date(t0.getTime() + 10 * 60_000) });
        expect(r).toMatchObject({ action: "fresh", session: null });
    });

    it("resumes again when the deaths are more than 30 minutes apart", async () => {
        const { job } = workingJob("apart");
        await recover(job);
        job.holder = { session: "s-apart-2" };
        const r = await recover(job, { now: () => new Date(t0.getTime() + 31 * 60_000) });
        expect(r).toMatchObject({ action: "resume", session: "s-apart-2" });
    });

    it("starts fresh when the self-test did not verify resume, or no session is known", async () => {
        const a = workingJob("unverified").job;
        expect(await recover(a, { resumeVerified: false })).toMatchObject({ action: "fresh", session: null });
        expect(a.fresh).toBe(true);
        const b = workingJob("nameless").job;
        b.holder = null;
        b.sessions = [];
        expect(await recover(b)).toMatchObject({ action: "fresh", session: null });
    });

    it("skips the sweep for a job whose worktree is gone", async () => {
        const { job } = workingJob("gone");
        job.worktree = join(repo.tmp, "nowhere");
        expect(await recover(job)).toMatchObject({ action: "resume", ended: 0, killed: 0, indexLock: false });
    });
});
