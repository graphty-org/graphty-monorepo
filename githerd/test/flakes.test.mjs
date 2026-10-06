import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { classify } from "../lib/classify.mjs";
import {
    createFlakeIssues,
    failingTests,
    flakeData,
    flakeLines,
    flakePoll,
    flakeStore,
    MARKER,
    masterFlakeStep,
    noteMasterLog,
    readWorkspace,
    touchesPackage,
} from "../lib/flakes.mjs";
import { createGitHub } from "../lib/github.mjs";
import { createIncidentActions } from "../lib/incident-actions.mjs";
import { prWork, readyIssues } from "../lib/queue.mjs";
import { createFakeGh, fixture, httpOutput } from "./helpers/fake-gh.mjs";

const REPO = "graphty-org/graphty-monorepo";
const R = `repos/${REPO}/`;
const AT = "2026-10-06T01:00:00.000Z";
const OWNER = "apowers";
const WS = {
    packages: ["graph-format", "layout", "graphty-element", "webgpu-graph-algorithms", "graph-io"],
    deps: {
        "graphty-element": ["graph-format", "layout"],
        layout: ["graph-format"],
        "webgpu-graph-algorithms": ["graph-format"],
    },
};
const JOB = "Test (graphty-element-browser-1)";
const TEST = "graphty-element/test/a.test.ts > suite > settles";
const sha = (/** @type {string} */ s) => s.padEnd(40, "0");

/**
 * A Vitest log failing one test, as the job log endpoint returns it.
 * @param {string} [name] the test
 * @returns {string} the log
 */
const vitestLog = (name = "settles") =>
    [
        "2026-10-06T00:45:20.1Z \u001b[41m\u001b[1m FAIL \u001b[22m\u001b[49m \u001b[30m\u001b[43m browser (chromium) \u001b[49m\u001b[39m test/a.test.ts\u001b[2m > \u001b[22msuite\u001b[2m > \u001b[22m" +
            name,
        "2026-10-06T00:45:20.2Z AssertionError: expected 1 to be 2",
    ].join("\n");

/**
 * A fake GitHub holding issues, run jobs, compares and re-runs.
 * @param {{issues?: any[], jobs?: Record<string, any[]>, compare?: Record<string, string[]>, attempts?: Record<string, any[]>}} [init]
 *   the issues; each run's jobs; each compare's files; each run attempt's jobs
 * @returns the fake gh and its state
 */
function fakeRepo(init = {}) {
    const s = {
        issues: [...(init.issues ?? [])],
        jobs: { ...init.jobs },
        compare: { ...init.compare },
        attempts: { ...init.attempts },
        reruns: /** @type {string[]} */ ([]),
    };
    const ok = (/** @type {unknown} */ body, status = 200) => httpOutput({ status, body });
    const gh = createFakeGh(({ args, input }) => {
        const body = input ? JSON.parse(input) : undefined;
        const x = args.indexOf("-X");
        const method = x === -1 ? "GET" : args[x + 1];
        const p = new URL((x === -1 ? args.at(-1) : args[x + 2]).slice(R.length), "https://x/").pathname.slice(1);
        let m;
        if (method === "GET") {
            if ((m = /^actions\/runs\/(\d+)\/jobs$/.exec(p))) return ok({ jobs: s.jobs[m[1]] ?? [] });
            if ((m = /^actions\/runs\/(\d+)\/attempts\/(\d+)\/jobs$/.exec(p))) {
                const jobs = s.attempts[`${m[1]}/${m[2]}`];
                return jobs ? ok({ jobs }) : ok({ message: "Not Found" }, 404);
            }
            if ((m = /^compare\/(.+)$/.exec(p)))
                return ok({ files: (s.compare[m[1]] ?? []).map((filename) => ({ filename })) });
            if (p === "issues") return ok(s.issues);
            if ((m = /^issues\/(\d+)(\/labels)?$/.exec(p))) {
                const i = s.issues.find((y) => y.number === Number(m[1]));
                return ok(m[2] ? i.labels.map((/** @type {string} */ name) => ({ name })) : i);
            }
            return ok({ message: "Not Found" }, 404);
        }
        if ((m = /^actions\/jobs\/(\d+)\/rerun$/.exec(p))) {
            s.reruns.push(m[1]);
            return ok({}, 201);
        }
        if (p === "issues" && method === "POST") {
            const number = 900 + s.issues.length;
            s.issues.push({
                number,
                state: "open",
                title: body.title,
                body: body.body,
                labels: body.labels,
                comments: [],
            });
            return ok({ number, url: `https://api.github.com/${R}issues/${number}` }, 201);
        }
        if ((m = /^issues\/(\d+)(\/comments|\/labels(?:\/(.+))?)?$/.exec(p))) {
            const i = s.issues.find((y) => y.number === Number(m[1]));
            if (method === "PATCH") Object.assign(i, body);
            else if (m[2] === "/comments") {
                i.comments.push(body.body);
                return ok({ id: 7000 + i.comments.length, url: `https://api.github.com/${R}issues/comments/1` }, 201);
            } else if (method === "POST") i.labels.push(...body.labels);
            else i.labels = i.labels.filter((/** @type {string} */ l) => l !== decodeURIComponent(m[3]));
            return ok(i);
        }
        return ok({ message: "unexpected" }, 422);
    });
    return { gh, s };
}

/**
 * The client over a fake, every group in one mode or by a function.
 * @param {ReturnType<typeof fakeRepo>} repo the fake
 * @param {string | ((group: string) => string)} [mode] the mode
 * @returns the client and its ledger
 */
function client(repo, mode = "acting") {
    const ledger = /** @type {any[]} */ ([]);
    const github = createGitHub({
        repo: REPO,
        fetch: repo.gh.fetch,
        token: repo.gh.token,
        mode,
        ledger: (e) => ledger.push(e),
        env: {},
        now: () => Date.parse(AT),
    });
    return { github, ledger };
}

/**
 * A check run of a pull request head.
 * @param {string} name the job
 * @param {string} conclusion its conclusion
 * @param {number} id the job id
 * @param {number} runId the run
 * @returns the GraphQL context
 */
const check = (name, conclusion, id, runId) => ({
    __typename: "CheckRun",
    name,
    status: "COMPLETED",
    conclusion,
    databaseId: id,
    checkSuite: { workflowRun: { databaseId: runId, workflow: { name: "CI" } } },
});

/**
 * A GraphQL pull request node.
 * @param {number} number the pull request
 * @param {string} head its head
 * @param {any[]} contexts its head's check runs
 * @param {{files?: string[], title?: string, queue?: boolean}} [opts] its changed files, and a batch's title
 * @returns the node
 */
const node = (number, head, contexts, { files = ["graph-io/src/x.ts"], title, queue = false } = {}) => ({
    number,
    title: title ?? `feat: ${number}`,
    headRefOid: head,
    headRefName: queue ? "mergify/merge-queue/abc" : `b${number}`,
    detail: { files },
    commits: { nodes: [{ commit: { statusCheckRollup: { contexts: { nodes: contexts } } } }] },
});

/**
 * A daemon state with open pull requests.
 * @param {number[]} prs the pull requests
 * @returns the state
 */
const daemonState = (prs = []) => ({
    trust: { login: OWNER },
    prs: Object.fromEntries(prs.map((n) => [n, { author: OWNER, required: { "All Checks Pass": "FAILURE" } }])),
    master: { lanes: {} },
    issues: { byNumber: {} },
    mergeGate: { heads: {} },
});

/**
 * One poll of the flake step.
 * @param {any} state the daemon state
 * @param {any[]} nodes the pull request nodes
 * @param {ReturnType<typeof createGitHub>} github the client
 * @param {Record<number, string>} logs job logs by job id
 * @param {any[]} [commits] master's commits
 * @returns {Promise<void>} once it is done
 */
const poll = (state, nodes, github, logs, commits = []) =>
    flakePoll({
        state,
        nodes,
        ws: WS,
        config: { repo: REPO, requiredChecks: ["All Checks Pass", "Lint PR Title"] },
        github,
        log: async (id) => logs[id] ?? null,
        commits,
        at: AT,
    });

const writes = (/** @type {ReturnType<typeof fakeRepo>} */ repo) =>
    repo.gh.writes().map((c) => `${c.args[3]} ${c.args[4].slice(R.length)}`);

describe("failingTests: occurrence extraction", () => {
    it("reads the failing test of a real CI log, with its package from the job's shard", () => {
        const log = fixture("flakes/ci-webgpu-node-failed.log");
        const tests = failingTests(log, {
            job: "Test (webgpu-graph-algorithms-node)",
            workflow: "CI",
            packages: WS.packages,
        });
        expect(tests).toEqual([
            {
                id: "webgpu-graph-algorithms/test/kernel/dense-loop-guard.test.ts > dense-row loops (G-ENV ENV-F8) > carry no tint_loop_idx guard in the SPIR-V Dawn generates",
                package: "webgpu-graph-algorithms",
                file: "webgpu-graph-algorithms/test/kernel/dense-loop-guard.test.ts",
                name: "dense-row loops (G-ENV ENV-F8) > carry no tint_loop_idx guard in the SPIR-V Dawn generates",
                line: expect.stringMatching(
                    /^FAIL {3}node {2}test\/kernel\/dense-loop-guard\.test\.ts > dense-row loops/,
                ),
            },
        ]);
    });

    it("reads gh's --log-failed form, a combined shard's sections and a file that failed to load", () => {
        const log = [
            "Test (small-node)\tRun tests\t2026-10-06T00:01:00.0Z ==> graph-io",
            "Test (small-node)\tRun tests\t2026-10-06T00:01:01.0Z  FAIL  test/csv.test.ts > csv > reads quotes",
            "Test (small-node)\tRun tests\t2026-10-06T00:01:02.0Z ==> layout",
            "Test (small-node)\tRun tests\t2026-10-06T00:01:03.0Z  FAIL  test/broken.test.ts [ test/broken.test.ts ]",
            "Test (small-node)\tRun tests\t2026-10-06T00:01:03.5Z  FAIL  test/broken.test.ts [ test/broken.test.ts ]",
        ].join("\n");
        expect(
            failingTests(log, { job: "Test (small-node)", packages: WS.packages }).map((t) => [t.id, t.package]),
        ).toEqual([
            ["graph-io/test/csv.test.ts > csv > reads quotes", "graph-io"],
            ["layout/test/broken.test.ts > (the whole file)", "layout"],
        ]);
        expect(failingTests(null, { job: JOB, packages: WS.packages })).toEqual([]);
        expect(failingTests("all 12 passed\nnot FAILing", { job: JOB, packages: WS.packages })).toEqual([]);
    });
});

describe("touchesPackage and readWorkspace", () => {
    it("counts the package, its workspace dependencies and repository-wide files, never documents", () => {
        expect(touchesPackage(["graph-io/src/a.ts"], "graphty-element", WS)).toBe(false);
        expect(touchesPackage(["graph-format/src/a.ts"], "graphty-element", WS)).toBe(true);
        expect(touchesPackage(["design/x.md", "graphty-element/README.md"], "graphty-element", WS)).toBe(false);
        expect(touchesPackage(["vitest.shared.config.ts"], "graph-io", WS)).toBe(true);
        expect(touchesPackage(null, "graph-io", WS)).toBeNull();
        expect(touchesPackage(["a"], null, WS)).toBeNull();
    });

    it("reads the packages and their transitive workspace dependencies", () => {
        const root = mkdtempSync(join(tmpdir(), "flakes-ws-"));
        writeFileSync(
            join(root, "pnpm-workspace.yaml"),
            'packages:\n    - "a"\n    - "b"\n    - "c"\n\ncatalog:\n    x: 1\n',
        );
        const pkg = (/** @type {string} */ dir, /** @type {Record<string, string>} */ deps) => {
            mkdirSync(join(root, dir));
            writeFileSync(join(root, dir, "package.json"), JSON.stringify({ name: `@s/${dir}`, dependencies: deps }));
        };
        pkg("a", { "@s/b": "workspace:*", lodash: "1" });
        pkg("b", { "@s/c": "workspace:*" });
        pkg("c", {});
        expect(readWorkspace(root)).toEqual({ packages: ["a", "b", "c"], deps: { a: ["b", "c"], b: ["c"], c: [] } });
        expect(readWorkspace(join(root, "missing"))).toEqual({ packages: [], deps: {} });
    });
});

describe("the four proofs", () => {
    it("(1) the same job passing on the same commit proves it, and an issue is filed once", async () => {
        const repo = fakeRepo({ jobs: { 50: [{ id: 501, run_attempt: 1 }] } });
        const { github } = client(repo);
        const state = daemonState([12]);
        await poll(state, [node(12, sha("a"), [check(JOB, "FAILURE", 501, 50)])], github, { 501: vitestLog() });
        const t = flakeStore(state).tests[TEST];
        expect(t.occurrences).toEqual([
            expect.objectContaining({
                runId: 50,
                attempt: 1,
                job: JOB,
                jobId: 501,
                sha: sha("a"),
                where: "pr",
                pr: 12,
                touched: false,
            }),
        ]);
        expect(t.proofs).toEqual([]);
        expect(writes(repo)).toEqual([]);
        // The re-run (anyone's) passed: a later attempt's check run on the same head.
        await poll(state, [node(12, sha("a"), [check(JOB, "SUCCESS", 502, 50)])], github, {});
        expect(t.proofs.map((p) => p.kind)).toEqual(["same-commit"]);
        expect(writes(repo)).toEqual(["POST issues"]);
        const [issue] = repo.s.issues;
        expect(issue.title).toBe("Flaky test: suite > settles (graphty-element)");
        expect(issue.labels).toEqual(["bug", "intermittent", "effort:medium", "priority:medium"]);
        expect(issue.body).toContain(`${MARKER}${TEST}`);
        expect(issue.body).toContain("Failed in 1 runs: 0 on master, 0 in merge batches, 1 on 1 pull requests.");
        await poll(state, [node(12, sha("a"), [check(JOB, "SUCCESS", 502, 50)])], github, {});
        expect(repo.s.issues).toHaveLength(1);
        expect(flakeLines(flakeData(state))).toEqual([
            "FLAKY TESTS (1):",
            `  ${TEST} -- 1 runs (0 master, 0 batch, 1 PR); issue #900`,
            `    proof same-commit: ${JOB} failed on aaaaaaaa0 in run 50 and passed on the same commit`.replace(
                "aaaaaaaa0",
                sha("a").slice(0, 9),
            ),
        ]);
    });

    it("(2) a merge-queue batch holding the failing head passing the job proves it", async () => {
        const repo = fakeRepo({ jobs: { 50: [{ id: 501, run_attempt: 1 }] } });
        const { github } = client(repo);
        const state = daemonState([12]);
        const pr = node(12, sha("a"), [check(JOB, "FAILURE", 501, 50)]);
        await poll(state, [pr], github, { 501: vitestLog() });
        const batch = node(40, sha("q"), [check(JOB, "SUCCESS", 601, 60)], {
            queue: true,
            title: "merge queue: checking #12 + #13 together on master (99c8a1e)",
        });
        await poll(state, [pr, batch], github, {});
        expect(flakeStore(state).tests[TEST].proofs.map((p) => p.kind)).toEqual(["merge-batch"]);
        // A batch that does not hold the pull request proves nothing.
        const other = daemonState([12]);
        await poll(other, [pr], github, { 501: vitestLog() });
        await poll(other, [pr, { ...batch, title: "merge queue: checking #13 on master (99c8a1e)" }], github, {});
        expect(flakeStore(other).tests[TEST].proofs).toEqual([]);
    });

    it("(3) master passing at the next commit, with nothing between touching the package, proves it", async () => {
        const commits = [
            { sha: sha("m3"), parents: [{ sha: sha("m2") }], commit: { message: "x" } },
            { sha: sha("m2"), parents: [{ sha: sha("m1") }], commit: { message: "y" } },
            { sha: sha("m1"), parents: [], commit: { message: "z" } },
        ];
        const run = async (/** @type {string[]} */ between) => {
            const repo = fakeRepo({ compare: { [`${sha("m1")}...${sha("m3")}`]: between } });
            const { github } = client(repo);
            const state = daemonState();
            noteMasterLog(state, WS, vitestLog(), {
                workflow: "CI",
                lane: "ci",
                runId: 70,
                attempt: 1,
                job: JOB,
                jobId: 701,
                sha: sha("m1"),
                at: AT,
            });
            // m2 still running, m3 green.
            state.master.lanes = { ci: { shas: { [sha("m2")]: "running", [sha("m3")]: "green" } } };
            await poll(state, [], github, {}, commits);
            return { t: flakeStore(state).tests[TEST], repo };
        };
        const proven = await run(["graph-io/src/a.ts", "design/b.md"]);
        expect(proven.t.proofs.map((p) => p.kind)).toEqual(["next-master"]);
        expect(proven.repo.s.issues[0].labels).toContain("priority:critical");
        const touched = await run(["layout/src/a.ts"]);
        expect(touched.t.proofs).toEqual([]);
        expect(touched.repo.s.issues).toEqual([]);
    });

    it("(4) failing on two pull requests whose changes do not touch the package proves it", async () => {
        const repo = fakeRepo({ jobs: { 50: [{ id: 501, run_attempt: 1 }], 51: [{ id: 511, run_attempt: 2 }] } });
        const { github } = client(repo);
        const state = daemonState([12, 13]);
        const a = node(12, sha("a"), [check(JOB, "FAILURE", 501, 50)]);
        const b = node(13, sha("b"), [check(JOB, "FAILURE", 511, 51)], { files: ["graphty-element/src/x.ts"] });
        await poll(state, [a, b], github, { 501: vitestLog(), 511: vitestLog() });
        // #13 touches graphty-element: one untouched pull request is not proof.
        expect(flakeStore(state).tests[TEST].proofs).toEqual([]);
        const c = node(14, sha("c"), [check(JOB, "FAILURE", 521, 52)]);
        repo.s.jobs[52] = [{ id: 521, run_attempt: 1 }];
        await poll(state, [a, b, c], github, { 521: vitestLog() });
        const t = flakeStore(state).tests[TEST];
        expect(t.proofs.map((p) => p.kind)).toEqual(["untouched-prs"]);
        // Three pull requests: high from the start.
        expect(repo.s.issues[0].labels).toContain("priority:high");
    });
});

describe("one issue per test", () => {
    /**
     * A store with one proven test and the given occurrences.
     * @param {any[]} occurrences the occurrences
     * @param {Partial<import("../lib/flakes.mjs").Test>} [more] other fields
     * @returns the daemon state
     */
    const proven = (occurrences, more = {}) => {
        const state = daemonState();
        flakeStore(state).tests[TEST] = {
            id: TEST,
            package: "graphty-element",
            file: "graphty-element/test/a.test.ts",
            name: "suite > settles",
            occurrences,
            proofs: [{ kind: "same-commit", text: "passed on re-run" }],
            issue: null,
            reported: 0,
            proofsReported: 0,
            ...more,
        };
        return state;
    };
    const occ = (/** @type {number} */ pr, /** @type {string} */ where = "pr") => ({
        runId: pr * 10,
        attempt: 1,
        job: JOB,
        jobId: pr * 100,
        sha: sha(String(pr)),
        where,
        pr: where === "master" ? null : pr,
        touched: false,
        line: "FAIL test/a.test.ts > suite > settles",
        at: AT,
    });

    it("appends a recurrence to the open issue, and finds an issue filed before a crash by its marker", async () => {
        const repo = fakeRepo({
            issues: [
                {
                    number: 5,
                    state: "open",
                    body: `x\n${MARKER}${TEST}`,
                    labels: ["bug", "intermittent", "priority:medium"],
                    comments: [],
                },
            ],
        });
        const { github } = client(repo);
        const state = proven([occ(12)]);
        const store = flakeStore(state);
        const issues = createFlakeIssues({ github, repo: REPO, store });
        await issues.sync();
        expect(store.tests[TEST].issue).toBe(5);
        await issues.sync();
        expect(repo.s.issues[0].comments).toEqual([
            expect.stringMatching(/^Again:\n- proof: passed on re-run\n- #12, Test/),
        ]);
        store.tests[TEST].occurrences.push(occ(13));
        await issues.sync();
        await issues.sync();
        expect(repo.s.issues).toHaveLength(1);
        expect(repo.s.issues[0].comments).toHaveLength(2);
        expect(repo.s.issues[0].comments[1]).toMatch(
            /- #13, Test .*Failed in 2 runs: 0 on master, 0 in merge batches, 2 on 2 pull requests\.$/s,
        );
        // Two pull requests: raised to high, medium dropped.
        expect(repo.s.issues[0].labels).toEqual(["bug", "intermittent", "priority:high"]);
    });

    it("reopens a closed issue on a recurrence instead of filing a new one, and never lowers its priority", async () => {
        const repo = fakeRepo({
            issues: [
                {
                    number: 5,
                    state: "closed",
                    body: "x",
                    labels: ["bug", "intermittent", "priority:critical"],
                    comments: [],
                },
            ],
        });
        const { github } = client(repo);
        const state = proven([occ(12), occ(13)], { issue: 5, reported: 1, proofsReported: 1 });
        await createFlakeIssues({ github, repo: REPO, store: flakeStore(state) }).sync();
        expect(repo.s.issues).toHaveLength(1);
        expect(repo.s.issues[0].state).toBe("open");
        expect(repo.s.issues[0].labels).toEqual(["bug", "intermittent", "priority:critical"]);
        expect(writes(repo)).toEqual(["PATCH issues/5", "POST issues/5/comments"]);
    });

    it("raises the priority to critical when the test turns master red", async () => {
        const repo = fakeRepo({
            issues: [{ number: 5, state: "open", body: "x", labels: ["bug", "priority:high"], comments: [] }],
        });
        const { github } = client(repo);
        const state = proven([occ(12), occ(13), occ(14, "master")], { issue: 5, reported: 2, proofsReported: 1 });
        await createFlakeIssues({ github, repo: REPO, store: flakeStore(state) }).sync();
        expect(repo.s.issues[0].labels).toEqual(["bug", "priority:critical"]);
        expect(repo.s.issues[0].comments[0]).toMatch(/- master, Test/);
    });

    it("in dry-run writes nothing and records each would-do once", async () => {
        const repo = fakeRepo({ jobs: { 50: [{ id: 501, run_attempt: 1 }] } });
        const { github, ledger } = client(repo, "dry-run");
        const state = daemonState([12]);
        await poll(state, [node(12, sha("a"), [check(JOB, "FAILURE", 501, 50)])], github, { 501: vitestLog() });
        await poll(state, [node(12, sha("a"), [check(JOB, "SUCCESS", 502, 50)])], github, {});
        await poll(state, [node(12, sha("a"), [check(JOB, "SUCCESS", 502, 50)])], github, {});
        expect(repo.gh.writes()).toEqual([]);
        expect(ledger.filter((e) => e.kind === "would-do")).toEqual([
            expect.objectContaining({ op: "POST issues", group: "owner-items", situation: "flaky-test" }),
        ]);
        expect(flakeStore(state).tests[TEST].issue).toBeNull();
    });

    it("is the owner's issue, offered by the normal issue queue", () => {
        const state = {
            trust: { login: OWNER },
            issues: {
                byNumber: {
                    900: {
                        state: "open",
                        author: OWNER,
                        labels: ["bug", "intermittent", "effort:medium", "priority:critical"],
                        createdAt: AT,
                    },
                },
            },
            jobs: {},
            prs: {},
        };
        const config = {
            labels: {
                types: ["bug"],
                priorities: ["priority:critical", "priority:high", "priority:medium", "priority:low"],
                efforts: ["effort:high", "effort:medium", "effort:low"],
            },
            backlog: { agingDays: 60 },
        };
        expect(readyIssues(state, config, new Date(AT)).ranked.map((r) => r.number)).toEqual([900]);
    });
});

describe("a known flaky test on a pull request is not the pull request's", () => {
    it("classifies the failure intermittent and says so in the pull request's need", async () => {
        const repo = fakeRepo({
            jobs: { 50: [{ id: 501, run_attempt: 1 }], 51: [{ id: 511, run_attempt: 1 }] },
            issues: [{ number: 900, state: "open", body: "x", labels: ["bug", "priority:medium"], comments: [] }],
        });
        const { github } = client(repo);
        const state = daemonState([12, 13]);
        const store = flakeStore(state);
        await poll(state, [node(12, sha("a"), [check(JOB, "FAILURE", 501, 50)])], github, { 501: vitestLog() });
        store.tests[TEST].issue = 900;
        state.issues.byNumber[900] = { state: "open" };
        const pr = node(13, sha("b"), [check(JOB, "FAILURE", 511, 51), check("All Checks Pass", "FAILURE", 512, 51)]);
        await poll(state, [pr], github, { 511: vitestLog() });
        expect(state.prs[13].knownFlake).toBe(
            `known flaky test ${TEST} (#900), not this pull request's failure: ask githerd_rerun for the failed job`,
        );
        expect(prWork("13", state.prs[13], state)).toBe(state.prs[13].knownFlake);
        // A job failing on another test as well is the pull request's.
        const both = node(13, sha("c"), [check(JOB, "FAILURE", 521, 52)]);
        repo.s.jobs[52] = [{ id: 521, run_attempt: 1 }];
        await poll(state, [both], github, { 521: `${vitestLog()}\n${vitestLog("other")}` });
        expect(state.prs[13].knownFlake).toBeUndefined();
        // The issue closed: no longer known.
        state.issues.byNumber[900].state = "closed";
        await poll(state, [pr], github, {});
        expect(state.prs[13].knownFlake).toBeUndefined();
        expect(store.tests[TEST].occurrences.map((o) => o.pr)).toEqual([12, 13, 13]);
    });

    it("classify names every failing test against the open issues", () => {
        const f = { workflow: "CI", job: JOB, steps: ["Run tests"], tests: [TEST] };
        expect(classify(f, { flakyTests: [TEST] })).toMatchObject({
            class: "intermittent",
            reason: "an open flaky-test issue names every failing test",
        });
        expect(classify({ ...f, tests: [TEST, "x"] }, { flakyTests: [TEST] }).class).toBe("own");
        expect(classify({ ...f, tests: [] }, { flakyTests: [TEST] }).class).toBe("own");
    });
});

describe("the master re-run", () => {
    const red = sha("r");
    const green = sha("g");
    const KEY = `CI / ${JOB} / Run tests`;
    const job = { id: 801, runId: 80, attempt: 1, name: JOB, tests: [TEST] };
    /**
     * A master incident for one red CI job, with the test recorded.
     * @param {string} [lane] the lane
     * @returns the daemon state and the incident
     */
    const setup = (lane = "ci") => {
        const state = daemonState();
        noteMasterLog(state, WS, vitestLog(), {
            workflow: "CI",
            lane,
            runId: 80,
            attempt: 1,
            job: JOB,
            jobId: 801,
            sha: red,
            at: AT,
        });
        const incident = { lanes: { [lane]: { sha: red } }, lastGreenSha: green, issue: null };
        return { state, incident };
    };
    const step = (/** @type {any} */ ctx, /** @type {any} */ github, lane = "ci", workflow = "CI") =>
        masterFlakeStep({ ...ctx, ws: WS, github, repo: REPO, lane, workflow, key: KEY, now: AT, job });

    it("re-runs a known flake's job once, through worker-writes, and points the incident at its issue", async () => {
        const repo = fakeRepo({ compare: { [`${green}...${red}`]: ["graphty-element/src/a.ts"] } });
        const { github, ledger } = client(repo);
        const ctx = setup();
        flakeStore(ctx.state).tests[TEST].issue = 900;
        expect(await step(ctx, github)).toEqual({ issue: 900 });
        expect(await step(ctx, github)).toEqual({ issue: 900 });
        expect(repo.s.reruns).toEqual(["801"]);
        expect(ledger.find((e) => e.kind === "action")).toMatchObject({
            op: "POST actions/jobs/801/rerun",
            group: "worker-writes",
        });
        expect(ctx.incident.issue).toBe(900);
        expect(ctx.state.incidentActions.reruns[`${red} ${KEY}`]).toMatchObject({ why: "flaky-test" });
        expect(ctx.state.reruns[`${red}:${JOB}`]).toBeTruthy();
    });

    it("re-runs once for a test in a package the red range did not touch, and not when it touched it", async () => {
        const untouched = fakeRepo({ compare: { [`${green}...${red}`]: ["graph-io/src/a.ts"] } });
        const a = setup();
        expect(await step(a, client(untouched).github)).toEqual({ issue: null });
        expect(untouched.s.reruns).toEqual(["801"]);
        const touched = fakeRepo({ compare: { [`${green}...${red}`]: ["layout/src/a.ts"] } });
        expect(await step(setup(), client(touched).github)).toBeNull();
        expect(touched.gh.writes()).toEqual([]);
    });

    it("never re-runs the GPU lane: its failure is only recorded", async () => {
        const repo = fakeRepo({ compare: { [`${green}...${red}`]: ["graph-io/src/a.ts"] } });
        const ctx = setup("gpu");
        flakeStore(ctx.state).tests[TEST].issue = 900;
        expect(await step(ctx, client(repo).github, "gpu", "GPU")).toBeNull();
        expect(repo.gh.writes()).toEqual([]);
        expect(flakeStore(ctx.state).tests[TEST].occurrences).toEqual([
            expect.objectContaining({ where: "master", lane: "gpu" }),
        ]);
    });

    it("in dry-run writes nothing and records the would-do once", async () => {
        const repo = fakeRepo({ compare: { [`${green}...${red}`]: ["graph-io/src/a.ts"] } });
        const { github, ledger } = client(repo, "dry-run");
        const ctx = setup();
        await step(ctx, github);
        await step(ctx, github);
        expect(repo.gh.writes()).toEqual([]);
        expect(ledger.filter((e) => e.kind === "would-do")).toEqual([
            expect.objectContaining({ op: "POST actions/jobs/801/rerun", group: "worker-writes" }),
        ]);
        expect(ctx.state.incidentActions?.reruns?.[`${red} ${KEY}`]).toBeUndefined();
    });

    it("holds the revert path while the flake's re-run has not failed, and ends on its issue", async () => {
        const repo = fakeRepo({ attempts: {} });
        const { github } = client(repo);
        const spent = { reruns: { [`${red} ${KEY}`]: { why: "flaky-test", at: AT } } };
        const actions = createIncidentActions({ github, repo: REPO, spent, now: () => Date.parse(AT) });
        const inc = {
            key: KEY,
            verdict: /** @type {"code"} */ ("code"),
            redSha: red,
            redJob: { id: 801, runId: 80, attempt: 1, name: JOB },
            parentSha: green,
            parentJob: { id: 701, runId: 70, attempt: 1, name: JOB },
            suspects: [{ sha: red, pr: 12 }],
            confirmed: false,
            excerpt: "",
            flake: true,
            flakeIssue: 900,
        };
        expect(await actions.codeRed(inc)).toEqual({ outcome: "waiting", waitingFor: "verdict" });
        repo.s.attempts["80/2"] = [{ name: JOB, status: "completed", conclusion: "success" }];
        expect(await actions.codeRed(inc)).toMatchObject({ outcome: "intermittent", issue: 900 });
        // No parent re-test, no revert, no key-level intermittent issue: the flaky-test issue is the pointer.
        expect(repo.gh.writes()).toEqual([]);
        // Its re-run failed: the code path goes on as for any key.
        repo.s.attempts["80/2"] = [{ name: JOB, status: "completed", conclusion: "failure" }];
        await actions.codeRed(inc);
        expect(writes(repo)).toEqual(["POST actions/jobs/701/rerun"]);
    });
});
