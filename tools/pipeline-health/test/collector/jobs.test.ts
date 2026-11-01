import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { GitHub } from "../../src/collector/github.js";
import {
    chronicJobs,
    definedJobs,
    isJob,
    jobHistories,
    type JobHistory,
    jobMembers,
    nonGatingJobs,
    titleOwnsJob,
} from "../../src/collector/jobs.js";
import { type GhJob, type GhRun, releaseAttempt } from "../../src/collector/parse.js";
import { DAY, HOUR, type JobItem, type RawItem, type RunItem } from "../../src/model/items.js";
import { jobFamily } from "../../src/model/metrics.js";
import { putRaw, setCursor } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";

/** A GitHub Actions expression, `${{ body }}`, as a workflow file spells it. */
const ghExpr = (body: string): string => ["$", "{{ ", body, " }}"].join("");

const REPO = "graphty-org/graphty-monorepo";
/** When the owner found Performance Benchmarks red in most full runs, and the dashboard showed nothing. */
const NOW = Date.parse("2026-10-27T03:00:00Z");

/**
 * CI / Performance Benchmarks in the release.yml runs of 2026-10-21 to 2026-10-27, as GitHub's jobs API recorded
 * them (run id, job end, conclusion): it last passed in run 40395969507.
 */
const PERF: [number, string, string][] = [
    [40423614862, "2026-10-27T01:08:46Z", "failure"],
    [40395969507, "2026-10-26T21:13:32Z", "success"],
    [40373901559, "2026-10-26T18:48:55Z", "success"],
    [40354962497, "2026-10-26T16:34:27Z", "failure"],
    [40342458043, "2026-10-26T15:16:24Z", "failure"],
    [40319269255, "2026-10-26T12:27:18Z", "failure"],
    [40277363108, "2026-10-26T06:27:25Z", "failure"],
    [40271955574, "2026-10-26T05:27:33Z", "failure"],
    [40257099973, "2026-10-26T03:23:29Z", "failure"],
    [40247287810, "2026-10-26T01:20:52Z", "failure"],
    [40119894804, "2026-10-24T19:47:08Z", "failure"],
    [39540908824, "2026-10-21T04:36:15Z", "failure"],
];

/** A job as the collector stores it (parse.ts toJobItem), with a release.yml run's load. */
function jobItem(run: number, name: string, end: string, conclusion: string, over: Partial<JobItem> = {}): JobItem {
    const completedAt = Date.parse(end);
    return {
        kind: "job",
        id: `${REPO}/${run}/${name}`,
        attempt: 1,
        repo: REPO,
        runId: run,
        workflow: "release.yml",
        name,
        pool: "linux_windows",
        os: "linux",
        load: "full",
        status: "completed",
        conclusion,
        createdAt: completedAt - HOUR,
        startedAt: completedAt - 40 * 60_000,
        completedAt,
        ...over,
    };
}

const perfJobs = (): JobItem[] => PERF.map(([run, end, c]) => jobItem(run, "CI / Performance Benchmarks", end, c));
/** A job beside it that passes in every run. */
const lintJobs = (): JobItem[] => PERF.map(([run, end]) => jobItem(run, "CI / Lint", end, "success"));

/** The table after the collector stored these jobs and the recompute rolled them up. */
async function stored(items: JobItem[]): Promise<MemoryStore> {
    const store = new MemoryStore();
    await putRaw(store, items, NOW);
    await recompute(store, NOW);
    return store;
}

/** A GitHub whose issue searches answer `issues`, and which keeps the search strings it was asked. */
function searchGitHub(issues: { number: number; title: string; body: string }[]) {
    const asked: string[] = [];
    const fetch = (_url: string, init?: RequestInit) => {
        const { variables } = JSON.parse(init?.body as string) as { variables: Record<string, string> };
        asked.push(...Object.values(variables));
        const data = Object.fromEntries(Object.keys(variables).map((k) => [`j${k.slice(1)}`, { nodes: issues }]));
        return Promise.resolve(new Response(JSON.stringify({ data }), { status: 200 }));
    };
    return { gh: new GitHub(() => Promise.resolve("ghs_test"), fetch), asked };
}

describe("chronically failing jobs", () => {
    it("flags Performance Benchmarks, which a passing lane hid, from the jobs the collector stored", async () => {
        const store = await stored([...perfJobs(), ...lintJobs()]);
        const { gh, asked } = searchGitHub([]);
        const { list, obs } = await jobMembers(store, gh, REPO, NOW);
        expect(list).toEqual([
            {
                workflow: "release.yml",
                job: "CI / Performance Benchmarks",
                runs: 10,
                failed: 8,
                lastPassAt: Date.parse("2026-10-26T21:13:32Z"),
                failingSince: Date.parse("2026-10-27T01:08:46Z"),
            },
        ]);
        expect(obs).toEqual({ "ci.chronic_jobs": 1, "ci.chronic_no_issue": 1 });
        expect(asked).toEqual([
            `repo:${REPO} is:issue is:open label:bug -label:ci-budget "Performance Benchmarks" in:title`,
        ]);
    });

    it("names the open issue that names the job, and then it no longer counts as unfiled", async () => {
        const store = await stored(perfJobs());
        const { gh } = searchGitHub([
            { number: 3000, title: "Benchmarks: a faster PageRank", body: "" },
            // A mention in a body is not ownership (#3447 named "All Checks Pass" only in its body).
            {
                number: 3447,
                title: "Check step 5 over the first 20 merged pull requests",
                body: "Performance Benchmarks",
            },
            {
                number: 3413,
                title: "ci: the Performance Benchmarks job has failed on every release train since 2026-10-21",
                body: "",
            },
        ]);
        const { list, obs } = await jobMembers(store, gh, REPO, NOW);
        expect(list.map((j) => j.issue)).toEqual([3413]);
        expect(obs).toEqual({ "ci.chronic_jobs": 1, "ci.chronic_no_issue": 0 });
    });

    it("gives an issue only the job of the workflow it names, not another workflow's job of the same name", async () => {
        // 2026-10-29: #4530, about release.yml's CI call, was shown on the CodeQL workflow's "All Checks Pass" row.
        const same = (workflow: string, name: string, load: JobItem["load"]) =>
            PERF.map(([run, end, c]) =>
                jobItem(run, name, end, c, { id: `${REPO}/${run}/${workflow}/${name}`, workflow, load }),
            );
        const store = await stored([
            ...same("release.yml", "CI / All Checks Pass", "full"),
            ...same("ci.yml", "All Checks Pass", "master"),
            ...same("codeql", "All Checks Pass", "other"),
        ]);
        const { gh } = searchGitHub([
            { number: 4530, title: "Full run: CI / All Checks Pass red in 5 of 10 full runs", body: "" },
        ]);
        const { list, obs } = await jobMembers(store, gh, REPO, NOW);
        expect(list.map((j) => [j.workflow, j.job, j.issue]).sort()).toEqual([
            ["ci.yml", "All Checks Pass", undefined],
            ["codeql", "All Checks Pass", undefined],
            ["release.yml", "CI / All Checks Pass", 4530],
        ]);
        expect(obs).toEqual({ "ci.chronic_jobs": 3, "ci.chronic_no_issue": 2 });
    });

    it("reads a workflow from its file's name or its run kind, never from a conventional-commit type", () => {
        const ci = { workflow: "ci.yml", job: "Lint" };
        expect(titleOwnsJob("Red master: Lint fails on every push", ci)).toBe(true);
        expect(titleOwnsJob("ci.yml Lint fails since the eslint upgrade", ci)).toBe(true);
        expect(titleOwnsJob("ci: Lint fails since the eslint upgrade", ci)).toBe(false);
        expect(titleOwnsJob("Full run: CI / Lint red", ci)).toBe(false);
        const mac = { workflow: "work-protection-macos.yml", job: "Autosave (webkit)" };
        expect(titleOwnsJob("work protection (macOS): Autosave (webkit) red since 2026-10-20", mac)).toBe(true);
        expect(titleOwnsJob("Autosave (webkit) red since 2026-10-20", mac)).toBe(false);
    });

    it("is a job that the release lanes still call passed", () => {
        // Run 40423614862: the ci lane passed (its Red early job skipped) while Performance Benchmarks failed.
        const run = { id: 40423614862, conclusion: "success", display_title: "Release (full)" } as unknown as GhRun;
        const jobs = [
            { name: "CI / Performance Benchmarks", status: "completed", conclusion: "failure" },
            { name: "CI / Build", status: "completed", conclusion: "success" },
            { name: "Red early (CI)", status: "completed", conclusion: "skipped" },
        ] as unknown as GhJob[];
        expect(releaseAttempt(run, jobs).lanes.ci).toBe("passed");
    });

    it("leaves out pull request runs, cancelled jobs and jobs failing less than half the time", async () => {
        const pr = perfJobs().map((j) => ({ ...j, name: "Lint", workflow: "ci.yml", load: "pr" as const }));
        const cancelled = perfJobs().map((j) => ({ ...j, name: "CI / Docs", conclusion: "cancelled" }));
        const sometimes = PERF.map(([run, end], i) =>
            jobItem(run, "CI / Test (graphty-1)", end, i % 3 ? "success" : "failure"),
        );
        const store = await stored([...pr, ...cancelled, ...sometimes]);
        const { list } = await jobMembers(store, searchGitHub([]).gh, REPO, NOW);
        expect(list).toEqual([]);
    });

    it("leaves out runs on other branches, whose failures may be the branch's own", async () => {
        // Test (graphty-element-lifecycle) on 2026-10-28: four ci.yml dispatches on the probe branches
        // ci/4237-probe-1 and ci/4237-probe-2 failed it, while every master run passed; the table called it chronic.
        const probes = PERF.slice(0, 6).map(([run, end]) =>
            jobItem(run, "Test (graphty-element-lifecycle)", end, "failure", {
                workflow: "ci.yml",
                load: "other",
                offMaster: true,
            }),
        );
        const master = PERF.slice(6).map(([run, end]) =>
            jobItem(run, "Test (graphty-element-lifecycle)", end, "success", { workflow: "ci.yml", load: "other" }),
        );
        const store = await stored([...probes, ...master]);
        const { list } = await jobMembers(store, searchGitHub([]).gh, REPO, NOW);
        expect(list).toEqual([]);
    });

    it("leaves out a run on another branch whose jobs were stored before they carried offMaster (#5053)", async () => {
        // The four ci.yml dispatches on the probe branches of #4237 on 2026-10-28, stored before 3796ced414 stamped
        // offMaster on jobs: Story tests (graphty-element) and Test (graphty-element-lifecycle) failed in each, and
        // the table still listed both as chronic on 2026-10-30, though every master run since had passed them.
        const now = Date.parse("2026-10-30T12:00:00Z");
        const probes: [number, string, string][] = [
            [40716130272, "ci/4237-probe-1", "2026-10-28T16:10:00Z"],
            [40728357923, "ci/4237-probe-2", "2026-10-28T17:20:00Z"],
            [40733744826, "ci/4237-probe-2", "2026-10-28T18:00:00Z"],
            [40742555405, "ci/4237-probe-2", "2026-10-28T18:53:00Z"],
        ];
        // Two earlier dispatches of ci.yml on master that passed both jobs (the issue's "last pass 2026-10-27").
        const masters: [number, string, string][] = [
            [40500000001, "master", "2026-10-27T13:59:00Z"],
            [40500000002, "master", "2026-10-27T15:07:00Z"],
        ];
        const items = [...probes, ...masters].flatMap(([runId, branch, end]): RawItem[] => {
            const conclusion = branch === "master" ? "success" : "failure";
            const at = Date.parse(end);
            const run: RunItem = {
                kind: "run",
                id: `${REPO}/${runId}`,
                attempt: 1,
                repo: REPO,
                runId,
                workflow: "ci.yml",
                event: "workflow_dispatch",
                branch,
                sha: "ab425a0699",
                status: "completed",
                conclusion,
                createdAt: at - HOUR,
                completedAt: at,
            };
            const jobs = ["Story tests (graphty-element)", "Test (graphty-element-lifecycle)"].map((name) =>
                // As toJobItem stored it then: a load, and no offMaster.
                jobItem(runId, name, end, conclusion, { workflow: "ci.yml", load: "other" }),
            );
            return [run, ...jobs];
        });
        const store = new MemoryStore();
        await putRaw(store, items, now);
        await recompute(store, now);
        const { list, obs } = await jobMembers(store, searchGitHub([]).gh, REPO, now);
        expect(list).toEqual([]);
        expect(obs).toEqual({ "ci.chronic_jobs": 0, "ci.chronic_no_issue": 0 });
    });

    it("stops judging a ci.yml job once ci.yml no longer defines it, and nothing else", async () => {
        // CI / Story tests parity (graphty) failed in most full runs until eca39b3b91 removed the job from ci.yml
        // on 2026-10-27; it stayed on the page as chronic and unfiled until it had gone two days without a run.
        const ci = readFileSync(new URL("../../../../.github/workflows/ci.yml", import.meta.url), "utf8");
        const parity = PERF.map(([run, end, c]) => jobItem(run, "CI / Story tests parity (graphty)", end, c));
        const dependabot = PERF.map(([run, end, c]) =>
            jobItem(run, "Dependabot", end, c, { workflow: "dependabot-updates", load: "other" }),
        );
        const store = await stored([...perfJobs(), ...parity, ...dependabot]);
        const names = async () => (await jobMembers(store, searchGitHub([]).gh, REPO, NOW)).list.map((j) => j.job);
        // Before the collector has read ci.yml, every job is judged.
        expect(await names()).toContain("CI / Story tests parity (graphty)");
        const withParity = `${ci}\n    story-tests-parity:\n        name: Story tests parity (${ghExpr("matrix.project")})\n`;
        await setCursor(store, "ci-jobs", JSON.stringify(definedJobs(withParity)), NOW);
        expect(await names()).toContain("CI / Story tests parity (graphty)");
        await setCursor(store, "ci-jobs", JSON.stringify(definedJobs(ci)), NOW);
        expect((await names()).toSorted()).toEqual(["CI / Performance Benchmarks", "Dependabot"]);
    });

    it("folds bins and shards into their family", () => {
        expect(jobFamily("CI / Test (graphty-element-browser-3)")).toBe("CI / Test (graphty-element-browser)");
        expect(jobFamily("Test (compact-mantine)")).toBe("Test (compact-mantine)");
        expect(jobFamily("Story tests (graphty)")).toBe("Story tests (graphty)");
    });
});

describe("chronicJobs", () => {
    const h = (runs: [number, boolean][]): JobHistory => ({
        workflow: "restricted-cpu-stress.yml",
        job: "Stress",
        runs: runs.map(([daysAgo, ok]) => ({ at: NOW - daysAgo * DAY, ok })),
    });

    it("flags a job that has not passed in 3 days however few runs it had", () => {
        expect(
            chronicJobs(
                [
                    h([
                        [1, false],
                        [3.5, false],
                    ]),
                ],
                NOW,
            ),
        ).toHaveLength(1);
        expect(
            chronicJobs(
                [
                    h([
                        [1, false],
                        [4, false],
                        [5, true],
                    ]),
                ],
                NOW,
            )[0],
        ).toMatchObject({
            runs: 3,
            failed: 2,
            failingSince: NOW - 4 * DAY,
            lastPassAt: NOW - 5 * DAY,
        });
    });

    it("does not judge a share of fewer than 4 runs, a recent first failure, or a job that stopped running", () => {
        expect(
            chronicJobs(
                [
                    h([
                        [0.5, false],
                        [1, true],
                        [2, false],
                    ]),
                ],
                NOW,
            ),
        ).toEqual([]);
        expect(chronicJobs([h([[1, false]])], NOW)).toEqual([]);
        expect(
            chronicJobs(
                [
                    h([
                        [8, false],
                        [9, false],
                        [10, false],
                        [11, false],
                    ]),
                ],
                NOW,
            ),
        ).toEqual([]);
        // a job of four full runs a day, removed from ci.yml 2.5 days ago (as Story tests parity was on 2026-10-27)
        const removed = Array.from({ length: 10 }, (_, i): [number, boolean] => [2.5 + i / 4, i % 3 === 0]);
        expect(chronicJobs([h(removed)], NOW)).toEqual([]);
        expect(chronicJobs([h(removed.map(([d, ok]): [number, boolean] => [d - 2, ok]))], NOW)).toHaveLength(1);
    });

    it("still judges a weekly job between its runs", () => {
        expect(
            chronicJobs(
                [
                    h([
                        [6, false],
                        [13, false],
                    ]),
                ],
                NOW,
            ),
        ).toHaveLength(1);
    });

    it("reads each job's runs in order from the rollup's pass and fail times", () => {
        const dims = {
            [JSON.stringify(["release.yml", "CI / Lint", "pass"])]: { n: 2, sum: 0, vals: [3, 1] },
            [JSON.stringify(["release.yml", "CI / Lint", "fail"])]: { n: 1, sum: 0, vals: [2] },
        };
        expect(jobHistories([{ n: 3, sum: 0, dims }])).toEqual([
            {
                workflow: "release.yml",
                job: "CI / Lint",
                runs: [
                    { at: 3, ok: true },
                    { at: 2, ok: false },
                    { at: 1, ok: true },
                ],
            },
        ]);
    });
});

describe("non-gating jobs", () => {
    const ci = readFileSync(new URL("../../../../.github/workflows/ci.yml", import.meta.url), "utf8");

    it("reads ci.yml's job-level continue-on-error, not a step's", () => {
        const jobs = nonGatingJobs(ci);
        expect(jobs).toContain("Performance Benchmarks");
        // gating since #4613 (the screenshot gate blocks again)
        expect(jobs).not.toContain(`Story tests (${ghExpr("matrix.name || matrix.project")})`);
        expect(jobs).not.toContain("Build");
        expect(jobs).not.toContain("Lint");
    });

    it("counts an advisory job only during its warning period", () => {
        const yaml = [
            "jobs:",
            "    lint:",
            "        name: Lint",
            `        continue-on-error: ${ghExpr("contains(fromJSON(needs.packages.outputs.advisory-checks), 'lint')")}`,
            "        steps:",
            "            - run: x",
            "              continue-on-error: true",
            "    perf:",
            "        continue-on-error: true",
        ].join("\n");
        expect(nonGatingJobs(yaml)).toEqual(["perf"]);
        expect(nonGatingJobs(yaml, ["lint"])).toEqual(["Lint", "perf"]);
    });

    it("lists every job ci.yml defines, by name or id", () => {
        const jobs = definedJobs(ci);
        expect(jobs).toContain("Performance Benchmarks");
        expect(jobs).toContain("Build");
        expect(jobs).toContain("All Checks Pass");
        expect(jobs.some((p) => isJob(p, "CI / Story tests parity (graphty)"))).toBe(false);
    });

    it("matches a matrix job's name and a called workflow's prefix", () => {
        const story = `Story tests (${ghExpr("matrix.name || matrix.project")})`;
        expect(isJob(story, "CI / Story tests (graphty-element)")).toBe(true);
        expect(isJob(story, "Story tests merge (graphty)")).toBe(false);
        expect(isJob("Performance Benchmarks", "CI / Performance Benchmarks")).toBe(true);
        expect(isJob("Performance Benchmarks", "Performance Benchmarks (old)")).toBe(false);
    });
});
