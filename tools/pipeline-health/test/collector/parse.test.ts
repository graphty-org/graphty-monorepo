import { describe, expect, it } from "vitest";
import rates from "../../config/rates.json" with { type: "json" };
import { DAY, MIN } from "../../src/model/items.js";
import {
    classifyCancel,
    failedInRow,
    family,
    fixedCosts,
    llmCost,
    masterState,
    pool,
    prStocks,
    releaseAttempt,
    releaseTags,
    runnerFlags,
    runnerUse,
    suiteNotes,
    t4Cost,
    taggedNotOnNpm,
    timedOutJobs,
    toIssueItem,
    toJobItem,
    toPrItem,
    toRunItem,
    type GhJob,
    type GhRun,
    type GqlIssue,
    type GqlPr,
    type Rates,
    type SuiteNode,
} from "../../src/collector/parse.js";
import { fixture, masterRuns, NOW } from "./fake-github.js";

const R = rates as unknown as Rates;
const REPO = "graphty-org/graphty-monorepo";
const jobs = (name: string) => fixture<{ jobs: GhJob[] }>(name).jobs;

describe("runs and jobs", () => {
    it("maps a pull request run, its budget and its pull request", () => {
        const r = toRunItem(fixture<GhRun>("run-pr-40238975833.json"), REPO);
        expect(r).toMatchObject({
            id: `${REPO}/40238975833`,
            attempt: 1,
            workflow: "ci.yml",
            event: "pull_request",
            status: "completed",
            conclusion: "success",
            runKind: "pr",
            budgetMs: 20 * MIN,
            createdAt: Date.parse("2026-10-25T22:10:54Z"),
            completedAt: Date.parse("2026-10-25T23:09:15Z"),
        });
    });

    it("measures a needs-job's wait from its own created_at, and leaves skipped jobs out of waits", () => {
        const all = jobs("jobs-master-40239928447.json");
        const lint = toJobItem(
            all.find((j) => j.name === "Lint")!,
            REPO,
            "ci.yml",
        );
        expect(lint.startedAt! - lint.createdAt).toBe(
            Date.parse("2026-10-25T23:00:37Z") - Date.parse("2026-10-25T22:38:45Z"),
        );
        const skipped = all.find((j) => j.conclusion === "skipped")!;
        const s = toJobItem(skipped, REPO, "ci.yml");
        expect(s.startedAt).toBeUndefined();
        expect(s.completedAt).toBeUndefined();
    });

    it("folds bins into families and sorts jobs into runner pools", () => {
        expect(family("Test (graphty-element-browser-3)")).toBe("graphty-element-browser");
        expect(family("CI / Test (graphty-4)")).toBe("graphty");
        expect(family("Test (small-node)")).toBe("small-node");
        expect(family("Test (${{ matrix.shard }})")).toBeUndefined();
        expect(family("Lint")).toBeUndefined();
        expect(pool(["ubuntu-24.04"])).toBe("linux_windows");
        expect(pool(["windows-2025"])).toBe("linux_windows");
        expect(pool(["macos-26"])).toBe("macos");
        expect(pool(["machine/gpu=t4/cpu=4/ram=16/tenancy=on_demand"])).toBe("other");
    });
});

describe("cancel classification", () => {
    const suites = fixture<{ data: { nodes: SuiteNode[] } }>("cancel-annotations.json").data.nodes;

    it("calls a cancel by a person (or a session acting as one) by hand", () => {
        expect(classifyCancel(suiteNotes(suites[0]))).toBe("by-hand");
    });

    it("calls a timeout cancel red and the timed-out job a hang", () => {
        const notes = suiteNotes(suites[1]);
        expect(classifyCancel(notes)).toBe("red");
        expect([...timedOutJobs(notes)]).toEqual(["Build"]);
    });

    it("calls a concurrency cancel superseded", () => {
        const notes = [
            {
                name: "Build",
                conclusion: "cancelled",
                annotations: ["Canceling since a higher priority waiting request for 'ci-x' exists"],
            },
        ];
        expect(classifyCancel(notes)).toBe("superseded");
    });
});

describe("master state", () => {
    const [redRun, green] = masterRuns();
    it("is red from the first red build after the last green, and gray cancels keep the verdict", () => {
        const red = toRunItem(redRun, REPO, { cancelClass: "red" });
        const g = toRunItem(green, REPO);
        expect(masterState([g, red])).toMatchObject({
            red: true,
            redBuilds: 1,
            redSince: Date.parse(redRun.updated_at),
        });
        const byHand = toRunItem(redRun, REPO, { cancelClass: "by-hand" });
        expect(masterState([g, byHand])).toMatchObject({ red: false, redBuilds: 0 });
        const building = toRunItem(
            { ...redRun, id: 1, status: "queued", conclusion: null, created_at: "2026-10-26T00:20:00Z" },
            REPO,
        );
        expect(masterState([g, building]).buildingSince).toBe(Date.parse("2026-10-26T00:20:00Z"));
    });
});

describe("runner use", () => {
    it("counts jobs, not runs, and a macOS job against both limits", () => {
        const base = jobs("jobs-pr-40238975833.json")[0];
        const at = (min: number) => new Date(NOW - min * MIN).toISOString();
        const j = (status: string, labels: string[], created = at(1)): GhJob => ({
            ...base,
            status,
            labels,
            created_at: created,
        });
        const use = runnerUse(
            [
                j("in_progress", ["ubuntu-24.04"]),
                j("in_progress", ["macos-26"]),
                j("queued", ["ubuntu-24.04"], at(10)),
                j("queued", ["machine/gpu=t4"], at(30)),
            ],
            [],
            NOW,
        );
        expect(use).toMatchObject({
            running: { linux_windows: 2, macos: 1, other: 0 },
            queued: 1,
            queuedOver2: 1,
            longestQueuedMs: 10 * MIN,
        });
        expect(runnerFlags(use, 60)).toEqual({ saturated: false, unassigned: true });
        expect(runnerFlags({ ...use, running: { linux_windows: 58, macos: 0, other: 0 } }, 60)).toEqual({
            saturated: true,
            unassigned: false,
        });
    });
});

describe("pull requests and issues", () => {
    const page = fixture<{ data: { repository: { open: { nodes: GqlPr[] }; recent: { nodes: GqlPr[] } } } }>(
        "gql-pr.json",
    );

    it("maps pull requests with their ready time and owner wait", () => {
        const p = page.data.repository.open.nodes[0];
        const item = toPrItem(p, REPO);
        expect(item).toMatchObject({ kind: "pr", id: `${REPO}#${p.number}`, number: p.number, base: "master" });
        expect(item.readyAt).toBe(
            p.isDraft ? undefined : Date.parse(p.readyEvents.nodes.at(-1)?.createdAt ?? p.createdAt),
        );
        expect(toPrItem({ ...p, title: "feat(ci)!: drop it" }, REPO).ownerWait).toBe(true);
    });

    it("reads the stocks from the open pull requests", () => {
        const s = prStocks(page.data.repository.open.nodes, NOW);
        expect(s.open).toBeGreaterThan(0);
        expect(s.open).toBeLessThanOrEqual(page.data.repository.open.nodes.length);
        expect(s.oldestOpenMs).toBeGreaterThan(0);
        expect(s.maxFailingSameCheck).toBeGreaterThanOrEqual(0);
    });

    it("counts open pull requests failing one check family, aggregators left out", () => {
        const p = page.data.repository.open.nodes[0];
        const failing = (names: string[]): GqlPr => ({
            ...p,
            isDraft: false,
            state: "OPEN",
            commits: {
                nodes: [
                    {
                        commit: {
                            statusCheckRollup: {
                                state: "FAILURE",
                                contexts: {
                                    nodes: names.map((name) => ({
                                        __typename: "CheckRun",
                                        name,
                                        conclusion: "FAILURE",
                                    })),
                                },
                            },
                        },
                    },
                ],
            },
        });
        const s = prStocks(
            [
                failing(["Test (graphty-1)", "All Checks Pass"]),
                failing(["Test (graphty-3)"]),
                failing(["Lint", "All Checks Pass"]),
            ],
            NOW,
        );
        expect(s.maxFailingSameCheck).toBe(2);
    });

    it("maps issues with lower-case state reasons", () => {
        const nodes = fixture<{ data: { repository: { recent: { nodes: GqlIssue[] } } } }>("gql-issue.json").data
            .repository.recent.nodes;
        const closed = nodes.find((n) => n.closedAt);
        const item = toIssueItem(closed ?? nodes[0], REPO);
        expect(item.kind).toBe("issue");
        if (closed) expect(item.closedAt).toBe(Date.parse(closed.closedAt!));
        expect(item.stateReason ?? "completed").toMatch(/^[a-z_]+$/);
    });
});

describe("release lanes", () => {
    const runs = fixture<{ workflow_runs: GhRun[] }>("release-runs.json").workflow_runs;

    it("sees a skipped attempt as untested", () => {
        const a = releaseAttempt(
            runs.find((r) => r.id === 40167547801)!,
            jobs("jobs-release-skipped-40167547801.json"),
        );
        expect(a.tested).toBe(false);
        expect(a.lanes.ci).toBe("skipped");
        expect(a.red).toEqual([]);
    });

    it("judges reusable lanes by their worst job", () => {
        const a = releaseAttempt(
            runs.find((r) => r.id === 40119894804)!,
            jobs("jobs-release-tested-40119894804.json"),
        );
        expect(a.mode).toBe("legacy");
        expect(a.tested).toBe(true);
        expect(a.lanes).toMatchObject({
            t4: "failed",
            audit: "failed",
            llm: "passed",
            hosts: "passed",
            autosave_macos: "passed",
            ci: "failed",
            version: "skipped",
        });
        expect(a.red.sort()).toEqual(["audit", "ci", "t4"]);
    });

    it("counts failures in a row, newest first", () => {
        expect(failedInRow(runs)).toBe(0);
        const f = (id: number, c: string, at: string) => ({ ...runs[1], id, conclusion: c, created_at: at });
        expect(
            failedInRow([
                f(1, "failure", "2026-10-25T02:00:00Z"),
                f(2, "failure", "2026-10-25T01:00:00Z"),
                f(3, "success", "2026-10-25T00:00:00Z"),
            ]),
        ).toBe(2);
    });
});

describe("costs", () => {
    const tested = jobs("jobs-release-tested-40119894804.json");

    it("prices a T4 job by its minutes, boot and tenancy", () => {
        const j = tested.find((x) => x.name === "T4 GPU / Test (NVIDIA T4)")!;
        const min = Math.ceil((Date.parse(j.completed_at!) - Date.parse(j.started_at!)) / MIN) + 1;
        expect(t4Cost(j, REPO, R)).toMatchObject({ line: "t4", usd: min * 0.018 });
        expect(
            t4Cost(
                tested.find((x) => x.name === "CI / Lint")!,
                REPO,
                R,
            ),
        ).toBeUndefined();
    });

    it("prices the paid LLM step", () => {
        expect(
            llmCost(
                tested.find((x) => x.name === "LLM regression")!,
                REPO,
                R,
            ),
        ).toMatchObject({ line: "llm", usd: 0.94 });
    });

    it("spreads fixed monthly lines over the month", () => {
        const start = Date.UTC(2026, 9, 1);
        const month = Array.from({ length: 31 }, (_, i) => fixedCosts(R, start + i * DAY)).flat();
        const github = month.filter((c) => c.line === "github").reduce((s, c) => s + c.usd, 0);
        expect(github).toBeCloseTo(8, 9);
        expect(month.some((c) => c.line === "sentry")).toBe(false); // no rate: NO DATA, never zero
    });
});

describe("npm", () => {
    const tags = releaseTags(
        fixture<{ data: { repository: { refs: { nodes: never[] } } } }>("gql-tag.json").data.repository.refs.nodes,
    );

    it("keeps {project}@{version} tags only, scoped names included", () => {
        expect(tags.some((t) => t.project === "golden-good")).toBe(false);
        expect(tags.find((t) => t.project === "graph-format")).toMatchObject({ version: "1.4.7" });
        expect(tags.some((t) => t.project === "@graphty/remote-logger")).toBe(true);
    });

    it("lists tagged versions npm does not have, apart from projects never published", () => {
        const npm = fixture<{ time: Record<string, string> }>("npm-graph-format.json");
        const times = new Map([["@graphty/graph-format", npm.time]]);
        const missing = taggedNotOnNpm(tags, times).map((t) => `${t.project}@${t.version}`);
        expect(missing).not.toContain("graph-format@1.4.7");
        expect(missing).toContain("layout@2.5.10");
        expect(missing.some((m) => m.startsWith("graphty@") || m.startsWith("githerd@"))).toBe(false);
    });
});
