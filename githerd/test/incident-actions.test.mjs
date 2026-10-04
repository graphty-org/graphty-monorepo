import { describe, expect, it } from "vitest";

import { createGitHub } from "../lib/github.mjs";
import { backoffSlot, createIncidentActions, laneNotProgressing } from "../lib/incident-actions.mjs";
import { createFakeGh, httpOutput } from "./helpers/fake-gh.mjs";

const REPO = "graphty-org/graphty-monorepo";
const R = `repos/${REPO}/`;
const T0 = Date.parse("2026-10-02T04:06:00Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const KEY = "GPU / Test (NVIDIA T4) / Benchmark compare";

/**
 * A fake GitHub holding runs, run attempts' jobs, issues and pull requests, answering the calls
 * `createGitHub` sends and applying the writes.
 * @param {{runs?: Record<number, number>, jobs?: Record<string, any[]>, issues?: any[], pulls?: any[]}} [init]
 *   run attempts by run id; jobs by `<run>/<attempt>`; issues; pull requests
 * @returns the fake gh and the state it changes
 */
function fakeRepo(init = {}) {
    const s = {
        runs: { ...init.runs },
        jobs: { ...init.jobs },
        issues: [...(init.issues ?? [])],
        pulls: [...(init.pulls ?? [])],
    };
    const ok = (body, status = 200) => httpOutput({ status, body });
    const gh = createFakeGh(({ args, input }) => {
        const body = input ? JSON.parse(input) : undefined;
        if (args.includes("graphql")) {
            const pr = s.pulls.find((p) => p.node_id === body.variables.id);
            const number = 900 + s.pulls.length;
            s.pulls.push({ number, title: body.variables.title, state: "open", base: pr.base, node_id: `N${number}` });
            return ok({ data: { revertPullRequest: { revertPullRequest: { number } } } });
        }
        const x = args.indexOf("-X");
        const method = x === -1 ? "GET" : args[x + 1];
        const path = (x === -1 ? args.at(-1) : args[x + 2]).slice(R.length);
        const url = new URL(path, "https://x/");
        const p = url.pathname.slice(1);
        let m;
        if (method === "GET") {
            if ((m = /^actions\/runs\/(\d+)$/.exec(p))) {
                return s.runs[m[1]]
                    ? ok({ id: Number(m[1]), run_attempt: s.runs[m[1]], status: "completed" })
                    : ok({}, 404);
            }
            if ((m = /^actions\/runs\/(\d+)\/attempts\/(\d+)$/.exec(p))) {
                return (s.runs[m[1]] ?? 0) >= Number(m[2])
                    ? ok({ id: Number(m[1]), run_attempt: Number(m[2]) })
                    : ok({ message: "Not Found" }, 404);
            }
            if ((m = /^actions\/runs\/(\d+)\/attempts\/(\d+)\/jobs$/.exec(p))) {
                const jobs = s.jobs[`${m[1]}/${m[2]}`];
                return jobs ? ok({ jobs }) : ok({ message: "Not Found" }, 404);
            }
            if (p === "issues") return ok(s.issues);
            if ((m = /^issues\/(\d+)(\/labels)?$/.exec(p))) {
                const i = s.issues.find((x) => x.number === Number(m[1]));
                return ok(m[2] ? i.labels.map((name) => ({ name })) : i);
            }
            if ((m = /^issues\/comments\/(\d+)$/.exec(p))) return ok({ id: Number(m[1]) });
            if ((m = /^pulls\/(\d+)$/.exec(p))) return ok(s.pulls.find((x) => x.number === Number(m[1])));
            if (p === "pulls") return ok(s.pulls.filter((x) => x.state === "open"));
            return ok({ message: "Not Found" }, 404);
        }
        if ((m = /^actions\/(?:jobs\/\d+\/rerun|runs\/(\d+)\/(?:rerun|rerun-failed-jobs))$/.exec(p))) {
            // A job re-run names its run only through the job: the tests' job ids are run id * 10.
            const run = m[1] ?? String(Number(/jobs\/(\d+)/.exec(p)[1]) / 10);
            s.runs[run] = (s.runs[run] ?? 1) + 1;
            return ok({}, 201);
        }
        if (p === "issues" && method === "POST") {
            const number = 800 + s.issues.length;
            s.issues.push({
                number,
                id: number,
                state: "open",
                title: body.title,
                body: body.body,
                labels: body.labels,
                comments: [],
            });
            return ok({ number, id: number, url: `https://api.github.com/${R}issues/${number}` }, 201);
        }
        if ((m = /^issues\/(\d+)(\/comments|\/labels(?:\/(.+))?)?$/.exec(p))) {
            const i = s.issues.find((x) => x.number === Number(m[1]));
            if (method === "PATCH") Object.assign(i, body);
            else if (m[2] === "/comments") {
                i.comments.push(body.body);
                const id = 7000 + i.comments.length;
                return ok({ id, url: `https://api.github.com/${R}issues/comments/${id}` }, 201);
            } else if (method === "POST") i.labels.push(...body.labels);
            else i.labels = i.labels.filter((l) => l !== decodeURIComponent(m[3]));
            return ok(i);
        }
        return ok({ message: "unexpected" }, 422);
    });
    return { gh, s };
}

/**
 * The actions over a fake repository.
 * @param {ReturnType<typeof fakeRepo>} repo the fake
 * @param {string | ((group: string) => string)} mode the incidents group's mode
 * @param {number} [start] the clock's start
 * @param {{spent?: any, persist?: () => unknown}} [saved] the spent record to start from, and the
 *   client's save hook
 * @param {any} [saved.spent] the spent record to start from
 * @param {() => unknown} [saved.persist] the client's save hook
 * @returns the actions, the ledger, the persisted record and a clock setter
 */
function setup(repo, mode = "acting", start = T0, saved = {}) {
    const { spent = {}, persist } = saved;
    const ledger = [];
    let t = start;
    const github = createGitHub({
        repo: REPO,
        exec: repo.gh.exec,
        mode,
        ledger: (e) => ledger.push(e),
        env: {},
        now: () => t,
        persist,
    });
    const actions = createIncidentActions({ github, repo: REPO, spent, now: () => t });
    return { actions, ledger, spent, set: (/** @type {number} */ ms) => (t = ms) };
}

const job = (runId, attempt, name = "Test (NVIDIA T4)") => ({ id: runId * 10, runId, attempt, name });
const done = (conclusion, name = "Test (NVIDIA T4)") => [{ name, status: "completed", conclusion }];

/**
 * A code-red key: red run 2, last green run 1.
 * @param {{sha: string, pr: number | null}[]} [suspects] the merges between them
 * @param {boolean} [confirmed] whether an earlier reconcile saw the key
 * @returns the key's incident input
 */
function incident(suspects = [{ sha: "c2", pr: 701 }], confirmed = true) {
    return {
        key: KEY,
        redSha: "c2".padEnd(40, "0"),
        redJob: job(2, 1),
        parentSha: "c1".padEnd(40, "0"),
        parentJob: job(1, 1),
        suspects,
        confirmed,
        excerpt: "row fr-10k 2.9x slower than its pinned best",
    };
}

describe("backoffSlot", () => {
    it("is 0 for 30 minutes, 1 until 2 hours, then one more every 6 hours", () => {
        const at = (ms) => backoffSlot(T0, T0 + ms);
        expect([0, 29 * MIN, 30 * MIN, 119 * MIN, 2 * HOUR, 8 * HOUR - 1, 8 * HOUR, 14 * HOUR].map(at)).toEqual([
            0, 0, 1, 1, 2, 2, 3, 4,
        ]);
    });
});

describe("laneNotProgressing", () => {
    it("names the longest-waiting job past its bound, and is null within every bound", () => {
        const ages = [
            { name: "Test (NVIDIA T4)", label: "machine/gpu", ageMs: 20 * MIN, boundMs: 926_000, over: true },
            { name: "Other", label: "machine/gpu", ageMs: 16 * MIN, boundMs: 926_000, over: true },
        ];
        const item = laneNotProgressing("gpu", ages);
        expect(item?.key).toBe("lane-not-progressing:gpu");
        expect(item?.summary).toMatch(
            /^gpu: Test \(NVIDIA T4\) has waited 20 min for a runner on machine\/gpu, past the worst pickup seen there \(15 min\)/,
        );
        expect(laneNotProgressing("gpu", [{ ...ages[0], over: false }])).toBeNull();
    });
});

describe("rerun: once per (head, key)", () => {
    it("re-runs the job once, reads it back by the run's attempt, and refuses every later ask", async () => {
        const repo = fakeRepo({ runs: { 2: 1 } });
        const { actions, spent } = setup(repo);
        expect(await actions.rerun(job(2, 1), "abc", KEY, "outside")).toMatchObject({ performed: true, stuck: true });
        expect(await actions.rerun(job(2, 1), "abc", KEY, "worker-asked")).toEqual({
            refused: `${KEY} was already re-run on abc (outside, 2026-10-02T04:06:00.000Z)`,
        });
        expect(repo.gh.writes().map((c) => c.args[4])).toEqual([`${R}actions/jobs/20/rerun`]);
        expect(Object.keys(spent.reruns)).toEqual([`abc ${KEY}`]);
        // Another key on the same head is its own budget.
        await actions.rerun(job(2, 2), "abc", "GPU / other / step", "outside");
        expect(repo.gh.writes()).toHaveLength(2);
    });

    it("in dry-run sends nothing, records a would-do once, and spends the budget all the same", async () => {
        const repo = fakeRepo({ runs: { 2: 1 } });
        const { actions, ledger } = setup(repo, "dry-run");
        await actions.rerun(job(2, 1), "abc", KEY, "outside");
        await actions.rerun(job(2, 1), "abc", KEY, "outside");
        expect(repo.gh.writes()).toEqual([]);
        expect(ledger.filter((e) => e.kind === "would-do")).toEqual([
            expect.objectContaining({ op: "POST actions/jobs/20/rerun", group: "incidents", situation: "outside" }),
        ]);
    });
});

describe("codeRed: the incident procedure's daemon steps", () => {
    it("waits for a second reconcile to see the key before any re-run", async () => {
        const repo = fakeRepo();
        const { actions } = setup(repo);
        expect(await actions.codeRed(incident(undefined, false))).toEqual({
            outcome: "waiting",
            waitingFor: "confirmation",
        });
        expect(repo.gh.calls).toEqual([]);
    });

    it("re-runs the red head and the parent once each, then waits for the red head's answer", async () => {
        const repo = fakeRepo({ runs: { 1: 1, 2: 1 } });
        const { actions } = setup(repo);
        expect(await actions.codeRed(incident())).toEqual({ outcome: "waiting", waitingFor: "red-head" });
        expect(await actions.codeRed(incident())).toEqual({ outcome: "waiting", waitingFor: "red-head" });
        expect(repo.gh.writes().map((c) => c.args[4])).toEqual([
            `${R}actions/jobs/20/rerun`,
            `${R}actions/jobs/10/rerun`,
        ]);
    });

    it("a red-head pass is intermittent: files the issue once, and reverts nothing", async () => {
        const repo = fakeRepo({ runs: { 1: 1, 2: 1 }, jobs: { "2/2": done("success") } });
        const { actions } = setup(repo);
        const out = await actions.codeRed(incident());
        expect(out).toMatchObject({ outcome: "intermittent", revert: null, issue: 800 });
        await actions.codeRed(incident());
        const [issue] = repo.s.issues;
        expect(issue.title).toBe(`Intermittent failure: ${KEY}`);
        expect(issue.labels).toEqual(["intermittent", "bug", "priority:high", "effort:medium"]);
        expect(issue.body).toContain("row fr-10k 2.9x slower");
        expect(issue.body.split("\n").at(-1)).toBe(`githerd-key: ${KEY}`);
        expect(repo.s.issues).toHaveLength(1);
        expect(repo.gh.calls.some((c) => c.args.includes("graphql"))).toBe(false);
    });

    it("a second occurrence on another commit comments and makes the issue critical; a closed one is reopened", async () => {
        const body = `earlier\n\ngitherd-key: ${KEY}`;
        const repo = fakeRepo({
            runs: { 1: 1, 2: 1 },
            jobs: { "2/2": done("success") },
            issues: [
                {
                    number: 703,
                    state: "closed",
                    title: "x",
                    body,
                    labels: ["intermittent", "bug", "priority:high"],
                    comments: [],
                },
            ],
        });
        const { actions } = setup(repo);
        expect(await actions.codeRed(incident())).toMatchObject({ outcome: "intermittent", issue: 703 });
        const [issue] = repo.s.issues;
        expect(issue.state).toBe("open");
        expect(issue.comments).toHaveLength(1);
        expect(issue.comments[0]).toMatch(/^Again: `GPU \/ Test/);
        expect(issue.labels).toEqual(["intermittent", "bug", "priority:critical"]);
        // Already critical: only the comment.
        const again = setup(repo);
        await again.actions.intermittentIssue(KEY, "c3", "");
        expect(issue.comments).toHaveLength(2);
        expect(issue.labels).toEqual(["intermittent", "bug", "priority:critical"]);
    });

    it("the world changed (both re-runs fail): fixes forward, nothing written past the re-runs", async () => {
        const repo = fakeRepo({ runs: { 1: 1, 2: 1 }, jobs: { "2/2": done("failure"), "1/2": done("failure") } });
        const { actions } = setup(repo);
        expect(await actions.codeRed(incident())).toEqual({ outcome: "world-changed", revert: null, fixForward: true });
        expect(repo.gh.writes()).toHaveLength(2);
    });

    it("one merge between green and red: opens its revert pull request once, with GitHub's revert title", async () => {
        const repo = fakeRepo({
            runs: { 1: 1, 2: 1 },
            jobs: { "2/2": done("failure"), "1/2": done("success") },
            pulls: [
                { number: 701, title: "fix(tools): x", state: "closed", base: { ref: "master" }, node_id: "PR701" },
            ],
        });
        const { actions } = setup(repo);
        const suspects = [
            { sha: "r1", pr: null },
            { sha: "c2", pr: 701 },
        ];
        const out = await actions.codeRed(incident(suspects));
        expect(out).toMatchObject({ outcome: "revert", reland: 701, revertPr: 901 });
        await actions.codeRed(incident(suspects));
        expect(repo.s.pulls.map((p) => p.title)).toEqual(["fix(tools): x", 'Revert "fix(tools): x"']);
        const mutation = JSON.parse(repo.gh.calls.find((c) => c.args.includes("graphql"))?.input ?? "{}");
        expect(mutation.variables.body).toMatch(/^Reverts #701\. /);
    });

    it("several merges, or a parent that has not answered: no revert", async () => {
        const repo = fakeRepo({ runs: { 1: 1, 2: 1 }, jobs: { "2/2": done("failure"), "1/2": done("success") } });
        const { actions } = setup(repo);
        const many = [
            { sha: "c3", pr: 702 },
            { sha: "c2", pr: 701 },
        ];
        expect(await actions.codeRed(incident(many))).toMatchObject({ outcome: "suspects", revert: null });
        const waiting = fakeRepo({ runs: { 1: 1, 2: 1 }, jobs: { "2/2": done("failure") } });
        expect(await setup(waiting).actions.codeRed(incident())).toEqual({ outcome: "waiting", waitingFor: "parent" });
        expect(waiting.gh.calls.some((c) => c.args.includes("graphql"))).toBe(false);
    });

    it("in dry-run: would-dos for the re-runs, an intermittent issue and a revert, and zero writes", async () => {
        const red = { "2/2": done("success") };
        const repo = fakeRepo({ runs: { 1: 1, 2: 1 }, jobs: red });
        const { actions, ledger } = setup(repo, "dry-run");
        expect(await actions.codeRed(incident())).toMatchObject({ outcome: "intermittent", issue: null });
        const revert = fakeRepo({
            runs: { 1: 1, 2: 1 },
            jobs: { "2/2": done("failure"), "1/2": done("success") },
            pulls: [{ number: 701, title: "t", state: "closed", base: { ref: "master" }, node_id: "PR701" }],
        });
        const second = setup(revert, "dry-run");
        expect(await second.actions.codeRed(incident())).toMatchObject({ outcome: "revert", revertPr: null });
        expect([...repo.gh.writes(), ...revert.gh.writes()]).toEqual([]);
        const ops = [...ledger, ...second.ledger].filter((e) => e.kind === "would-do").map((e) => e.op);
        expect(ops).toEqual([
            "POST actions/jobs/20/rerun",
            "POST actions/jobs/10/rerun",
            "POST issues",
            "POST actions/jobs/20/rerun",
            "POST actions/jobs/10/rerun",
            "graphql mutation RevertPullRequest",
        ]);
    });
});

describe("dry-run spends nothing, and a crash never doubles a write", () => {
    it("a would-do is ledgered once, and the same steps go out for real once the group acts", async () => {
        const repo = fakeRepo({ runs: { 1: 1, 2: 1 } });
        let mode = "dry-run";
        const { actions, ledger, spent } = setup(repo, () => mode);
        await actions.codeRed(incident());
        await actions.codeRed(incident());
        expect(repo.gh.writes()).toEqual([]);
        expect(ledger.filter((e) => e.kind === "would-do")).toHaveLength(2);
        expect(spent.reruns).toEqual({});
        mode = "acting";
        await actions.codeRed(incident());
        expect(repo.gh.writes().map((c) => c.args[4])).toEqual([
            `${R}actions/jobs/20/rerun`,
            `${R}actions/jobs/10/rerun`,
        ]);
        expect(Object.keys(spent.reruns)).toHaveLength(2);
    });

    it("a write GitHub refused is taken off the record and tried again", async () => {
        let refuse = true;
        const repo = fakeRepo({ runs: { 2: 1 } });
        const exec = repo.gh.exec;
        repo.gh.exec = async (args, options) =>
            refuse && args.includes("-X")
                ? httpOutput({ status: 403, body: { message: "Must have admin rights" } })
                : exec(args, options);
        const { actions, spent } = setup(repo);
        await expect(actions.rerun(job(2, 1), "abc", KEY, "outside")).rejects.toMatchObject({ kind: "credential" });
        expect(spent.reruns).toEqual({});
        refuse = false;
        expect(await actions.rerun(job(2, 1), "abc", KEY, "outside")).toMatchObject({ performed: true, stuck: true });
    });

    it("files the intermittent issue on the next reconcile when the first try failed", async () => {
        let fail = true;
        const repo = fakeRepo();
        const exec = repo.gh.exec;
        repo.gh.exec = async (args, options) =>
            fail && args.at(-1).includes("issues?")
                ? httpOutput({ status: 502, body: "bad gateway" })
                : exec(args, options);
        const { actions, spent } = setup(repo);
        await expect(actions.intermittentIssue(KEY, "c2", "x")).rejects.toMatchObject({ kind: "server" });
        expect(spent.intermittent).toEqual({});
        fail = false;
        expect(await actions.intermittentIssue(KEY, "c2", "x")).toBe(800);
        expect(repo.s.issues).toHaveLength(1);
    });

    it("saves the spent record before each re-run, so a crash before the reconcile's save re-runs nothing twice", async () => {
        const repo = fakeRepo({ runs: { 1: 1, 2: 1 } });
        /** @type {string[]} */
        const order = [];
        let disk = "{}";
        const exec = repo.gh.exec;
        repo.gh.exec = async (args, options) => {
            if (args.includes("-X")) order.push(`send ${args[4].split("/").slice(-2).join("/")}`);
            return exec(args, options);
        };
        const spent = {};
        const persist = () => {
            disk = JSON.stringify(spent);
            order.push(`save ${Object.keys(spent.reruns ?? {}).length}`);
        };
        await setup(repo, "acting", T0, { spent, persist }).actions.codeRed(incident());
        expect(order).toEqual(["save 1", "send 20/rerun", "save 2", "send 10/rerun"]);
        // The process dies here, before its own save: the restart reads what the gate saved.
        const restarted = setup(repo, "acting", T0, { spent: JSON.parse(disk), persist });
        await restarted.actions.codeRed(incident());
        expect(repo.gh.writes()).toHaveLength(2);
    });

    it("finds a revert opened before a crash by its title instead of opening a second", async () => {
        const repo = fakeRepo({
            runs: { 1: 1, 2: 1 },
            jobs: { "2/2": done("failure"), "1/2": done("success") },
            pulls: [
                { number: 701, title: "fix(tools): x", state: "closed", base: { ref: "master" }, node_id: "PR701" },
            ],
        });
        const first = setup(repo);
        expect(await first.actions.codeRed(incident())).toMatchObject({ revertPr: 901 });
        // The record of it is lost with the crash; the revert pull request is on GitHub.
        const spent = JSON.parse(JSON.stringify(first.spent));
        delete spent.reverts;
        const again = setup(repo, "acting", T0, { spent });
        expect(await again.actions.codeRed(incident())).toMatchObject({ outcome: "revert", revertPr: 901 });
        expect(repo.gh.calls.filter((c) => c.args.includes("graphql"))).toHaveLength(1);
    });
});

describe("backoff: a lane parked for paid capacity", () => {
    const item = (over = {}) => ({
        lane: "gpu",
        openedAt: T0,
        run: { id: 5, attempt: 1 },
        running: false,
        notProgressing: false,
        ...over,
    });

    it("over three days re-runs only at 30 min, 2 h and every 6 h after: the paid-lane budget is never exceeded", async () => {
        const repo = fakeRepo({ runs: { 5: 1 } });
        const { actions, set, ledger } = setup(repo);
        const at = [];
        for (let t = T0; t < T0 + 72 * HOUR; t += MIN) {
            set(t);
            const res = await actions.backoff(item({ run: { id: 5, attempt: repo.s.runs[5] } }));
            if (res) at.push((t - T0) / MIN);
        }
        expect(at).toEqual([30, 120, 480, 840, 1200, 1560, 1920, 2280, 2640, 3000, 3360, 3720, 4080]);
        expect(repo.gh.writes()).toHaveLength(backoffSlot(T0, T0 + 72 * HOUR - MIN));
        expect(ledger.filter((e) => e.kind === "write-mismatch")).toEqual([]);
    });

    it("nothing while a run of the lane is in progress or no runner picks it up, and a missed slot is not made up", async () => {
        const repo = fakeRepo({ runs: { 5: 1 } });
        const { actions, set } = setup(repo);
        set(T0 + 31 * MIN);
        expect(await actions.backoff(item({ running: true }))).toBeNull();
        expect(await actions.backoff(item({ notProgressing: true }))).toBeNull();
        set(T0 + 9 * HOUR);
        expect(await actions.backoff(item())).toMatchObject({ performed: true });
        expect(await actions.backoff(item({ run: { id: 5, attempt: 2 } }))).toBeNull();
        expect(repo.gh.writes()).toHaveLength(1);
    });

    it("in dry-run records one would-do per slot and writes nothing", async () => {
        const repo = fakeRepo({ runs: { 5: 1 } });
        const { actions, set, ledger } = setup(repo, "dry-run");
        for (let t = T0; t < T0 + 3 * HOUR; t += MIN) {
            set(t);
            await actions.backoff(item());
        }
        expect(repo.gh.writes()).toEqual([]);
        expect(ledger.filter((e) => e.kind === "would-do").map((e) => e.slot)).toEqual([1, 2]);
    });
});

describe("recreateArtifacts: a release skipped because CI's artifacts expired", () => {
    const sha = "a".repeat(40);
    const notice = [{ annotation_level: "notice", message: `${sha} is green but CI run 7 no longer holds its builds` }];

    it("re-runs that CI run once per attempt, and nothing for other notices", async () => {
        const repo = fakeRepo({ runs: { 7: 1 } });
        const { actions } = setup(repo);
        expect(
            await actions.recreateArtifacts([
                { annotation_level: "notice", message: "nothing on master since the last release" },
            ]),
        ).toBeNull();
        expect(await actions.recreateArtifacts(notice)).toMatchObject({ performed: true, stuck: true });
        expect(repo.s.runs[7]).toBe(2);
        // The same notice from another release run while attempt 2 holds: a new attempt, a new re-run.
        expect(await actions.recreateArtifacts(notice)).toMatchObject({ performed: true });
        const writes = repo.gh.writes().map((c) => c.args[4]);
        expect(writes).toEqual([`${R}actions/runs/7/rerun`, `${R}actions/runs/7/rerun`]);
    });

    it("in dry-run: one would-do, no write, and the next notice for that attempt is not repeated", async () => {
        const repo = fakeRepo({ runs: { 7: 1 } });
        const { actions, ledger } = setup(repo, "dry-run");
        await actions.recreateArtifacts(notice);
        expect(await actions.recreateArtifacts(notice)).toBeNull();
        expect(repo.gh.writes()).toEqual([]);
        expect(ledger.filter((e) => e.kind === "would-do")).toHaveLength(1);
    });
});

describe("rerunResult", () => {
    it("reads the job of the same name in the next attempt; none yet, unfinished or a 404 is null", async () => {
        const repo = fakeRepo({
            jobs: { "3/2": [{ name: "Build", status: "in_progress", conclusion: null }, ...done("success", "Lint")] },
        });
        const { actions } = setup(repo);
        expect(await actions.rerunResult(job(3, 1, "Lint"))).toBe("success");
        expect(await actions.rerunResult(job(3, 1, "Build"))).toBeNull();
        expect(await actions.rerunResult(job(3, 1, "Gone"))).toBeNull();
        expect(await actions.rerunResult(job(4, 1))).toBeNull();
    });
});
