import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rates from "../../config/rates.json" with { type: "json" };
import { DAY, MIN } from "../../src/model/items.js";
import type { ReleaseSeen } from "../../src/model/snapshots.js";
import {
    classifyCancel,
    failedInRow,
    family,
    fixedCosts,
    isGhostRun,
    llmCost,
    loadKind,
    masterState,
    oldestUntested,
    OWNER_LOGIN,
    pool,
    prOfRun,
    prStocks,
    RELEASE_WORKFLOW_EVENTS,
    releaseAttempt,
    releaseTags,
    runnerFlags,
    runnerUse,
    stressQuiet,
    suiteNotes,
    t4Cost,
    taggedNotOnNpm,
    timedOutJobs,
    toIssueItem,
    toJobItem,
    toPrItem,
    toRunItem,
    trainSkipped,
    workflowState,
    type GhJob,
    type GhRun,
    type GqlIssue,
    type GqlPr,
    type Rates,
    type SuiteNode,
} from "../../src/collector/parse.js";
import { nextShared } from "../../src/collector/snapshots.js";
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

    it("sorts runs by the load they put on the runners, and stamps it on their jobs", () => {
        const at = (path: string, event: string, head_branch: string | null = "fix/x") =>
            loadKind({ path: `.github/workflows/${path}`, event, head_branch });
        expect(at("ci.yml", "pull_request")).toBe("pr");
        expect(at("pr-issue-link.yml", "pull_request_target")).toBe("pr");
        expect(at("ci.yml", "push", "master")).toBe("master");
        expect(at("release.yml", "workflow_dispatch", "master")).toBe("full");
        expect(at("release.yml", "schedule", "master")).toBe("full");
        expect(at("bisect.yml", "workflow_dispatch", "master")).toBe("other");
        expect(at("ci.yml", "push", "dependabot/npm/x")).toBe("other");
        expect(at("restricted-cpu-stress.yml", "schedule", "master")).toBe("other");
        const lint = jobs("jobs-master-40239928447.json").find((j) => j.name === "Lint")!;
        expect(toJobItem(lint, REPO, "ci.yml", false, "master").load).toBe("master");
        expect(toJobItem(lint, REPO, "ci.yml")).not.toHaveProperty("load");
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

// Recorded 2026-10-27 20:47 UTC: master's ci.yml push runs, where two builds were cancelled while they waited
// because a newer push replaced them (ci.yml's concurrency group, #3940). Their check suites have no check run.
describe("replaced runs (recorded 2026-10-27)", () => {
    const master = fixture<{ workflow_runs: GhRun[] }>("runs-master-replaced.json").workflow_runs;
    const suites = fixture<{ data: { nodes: SuiteNode[] } }>("suites-master-replaced.json").data.nodes;
    const items = (runs: GhRun[]) =>
        runs.map((r) => {
            const node = suites.find((n) => n.id === r.check_suite_node_id);
            return toRunItem(r, REPO, node ? { cancelClass: classifyCancel(suiteNotes(node)) } : {});
        });

    it("calls a master build cancelled before any job started superseded", () => {
        expect(suites.map((n) => classifyCancel(suiteNotes(n)))).toEqual([
            "superseded",
            "superseded",
            "superseded",
            "superseded",
        ]);
    });

    it("keeps master green across a replaced build: the last real verdict carries forward", () => {
        expect(masterState(items(master))).toMatchObject({ red: false, redBuilds: 0 });
        // At 20:30, before the newer push's build passed: the build replaced at 20:17 still says nothing.
        const at2030 = master.filter((r) => Date.parse(r.created_at) <= Date.parse("2026-10-27T20:30:00Z"));
        const running = at2030.map((r) =>
            r.id === 40576673438 ? { ...r, status: "in_progress", conclusion: null } : r,
        );
        expect(masterState(items(running))).toMatchObject({ red: false, redBuilds: 0 });
    });

    const releases = fixture<{ workflow_runs: GhRun[] }>("release-runs-replaced.json").workflow_runs;
    const seen = Object.values(fixture<Record<string, ReleaseSeen>>("release-seen-replaced.json")).sort(
        (a, b) => b.at - a.at,
    );

    it("does not call the train skipped when a newer release run replaced the cancelled one", () => {
        // The newest attempts (a stuck run cancelled by hand at 19:46, a restart replaced at 18:00) were each
        // replaced by a newer dispatch; the newest real attempt tested its candidate.
        expect(trainSkipped(seen, releases)).toBe(false);
    });

    it("still calls the train skipped for a cancelled run nothing replaced", () => {
        const before = releases.filter((r) => Date.parse(r.created_at) <= Date.parse("2026-10-27T13:05:04Z"));
        expect(trainSkipped(seen, before)).toBe(true);
    });

    it("does not count replaced release runs as failed", () => {
        const w = workflowState("release.yml", releases, Date.parse("2026-10-27T13:30:00Z"));
        expect(w).toMatchObject({ runs: 4, failed: 0 });
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

    it("passes a full-run lane whose Red early job skipped, though a non-gating job in it failed", () => {
        const run = { ...runs[0], display_title: "Release (full)" };
        const j = (name: string, conclusion: string) =>
            ({ name, status: "completed", conclusion, completed_at: "2026-10-26T16:00:00Z" }) as GhJob;
        const a = releaseAttempt(run, [
            j("CI / Build", "success"),
            j("CI / Performance Benchmarks", "failure"),
            j("CI / Story tests parity (graphty)", "failure"),
            j("Red early (CI)", "skipped"),
            j("T4 GPU / Test", "success"),
            j("Red early (T4 GPU)", "skipped"),
        ]);
        expect(a.lanes.ci).toBe("passed");
        expect(a.red).toEqual([]);
        const red = releaseAttempt(run, [j("CI / Build", "failure"), j("Red early (CI)", "success")]);
        expect(red.lanes.ci).toBe("failed");
        const skippedEarly = [j("CI / Build", "cancelled"), j("Red early (CI)", "skipped")];
        expect(releaseAttempt({ ...run, conclusion: "cancelled" }, skippedEarly).lanes.ci).toBe("failed");
        expect(releaseAttempt(run, skippedEarly).lanes.ci).toBe("failed");
    });

    it("ages untested master by its first-parent line, not a branch's own merge of master", () => {
        const c = (sha: string, date: string, ...parents: string[]) => ({
            sha,
            parents: parents.map((p) => ({ sha: p })),
            commit: { committer: { date } },
        });
        // base <- m1 (landed 17:00) <- m2 (landed 18:00); m2's branch side holds b1, its merge of master a day ago.
        const commits = [
            c("b1", "2026-10-25T20:00:00Z", "old", "base"),
            c("m1", "2026-10-26T17:00:00Z", "base", "x"),
            c("m2", "2026-10-26T18:00:00Z", "m1", "b1"),
        ];
        expect(oldestUntested(commits)).toBe(Date.parse("2026-10-26T17:00:00Z"));
        expect(oldestUntested([])).toBeUndefined();
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

describe("pull request of a run", () => {
    const run = (o: Partial<GhRun>) =>
        ({ id: 1, head_branch: "fix/1-a", head_sha: "bbb", pull_requests: [], ...o }) as GhRun;
    const prs = [
        { number: 10, headRefName: "fix/1-a", headRefOid: "aaa" },
        { number: 11, headRefName: "fix/1-a", headRefOid: "bbb" },
        { number: 12, headRefName: "fix/2-b", headRefOid: "ccc" },
    ] as GqlPr[];

    it("uses the run's own pull request when GitHub lists one", () => {
        expect(prOfRun(run({ pull_requests: [{ number: 7 }] }), prs)).toBe(7);
    });

    it("maps a merged pull request's run (empty pull_requests) by head branch, preferring the head commit", () => {
        expect(prOfRun(run({}), prs)).toBe(11);
        expect(prOfRun(run({ head_sha: "zzz" }), prs)).toBeUndefined();
        expect(prOfRun(run({ head_branch: "other" }), prs)).toBeUndefined();
        const merged = [{ number: 21, headRefName: "fix/1-a", mergedAt: "2026-10-25T00:00:00Z" }] as GqlPr[];
        expect(prOfRun(run({ head_sha: "zzz" }), merged)).toBe(21);
        // Two pull requests share the branch name (fork branches named "main", a reused name): no guess.
        const shared = [{ number: 20, headRefName: "fix/1-a", mergedAt: null }, ...merged] as GqlPr[];
        expect(prOfRun(run({ head_sha: "zzz" }), shared)).toBeUndefined();
    });
});

describe("stale and retired checks (live 2026-10-27: 9 old pull requests red on All Checks Pass and Queue Checks Pass)", () => {
    const page = fixture<{ data: { repository: { open: { nodes: GqlPr[] } } } }>("gql-pr.json");
    const base = page.data.repository.open.nodes[0];
    const NOW_27 = Date.parse("2026-10-27T20:49:22Z");
    /** An open pull request whose head's checks failed, as the open page returns them. */
    const red = (n: number, startedAt: string, names: string[]): GqlPr => ({
        ...base,
        number: n,
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
                                    status: "COMPLETED",
                                    conclusion: "FAILURE",
                                    startedAt,
                                })),
                            },
                        },
                    },
                },
            ],
        },
    });
    const prs = (startedAt: string, names: string[]) => [3220, 3007, 2942].map((n) => red(n, startedAt, names));

    it("never counts the retired Queue Checks Pass", () => {
        const fresh = prs("2026-10-27T20:00:00Z", ["Queue Checks Pass"]);
        expect(prStocks(fresh, NOW_27).maxFailingSameCheck).toBe(0);
        expect(nextShared(undefined, fresh, [], NOW_27).rows).toEqual([]);
    });

    it("skips a pull request whose newest check started over 2 days ago", () => {
        // Their red dates from 2026-10-16, before the merge queue was retired.
        const old = prs("2026-10-16T05:17:44Z", ["All Checks Pass", "Queue Checks Pass"]);
        expect(prStocks(old, NOW_27).maxFailingSameCheck).toBe(0);
        expect(nextShared(undefined, old, [], NOW_27).rows).toEqual([]);
        // The same checks failing today are shared.
        const today = prs("2026-10-27T20:00:00Z", ["All Checks Pass", "Queue Checks Pass"]);
        expect(prStocks(today, NOW_27).maxFailingSameCheck).toBe(3);
        expect(nextShared(undefined, today, [], NOW_27).rows.map((r) => r.check)).toEqual(["All Checks Pass"]);
    });
});

describe("pull requests waiting on the owner", () => {
    const page = fixture<{ data: { repository: { open: { nodes: GqlPr[] } } } }>("gql-pr.json");
    const base = { ...page.data.repository.open.nodes[0], state: "OPEN", isDraft: false, labels: { nodes: [] } };
    const at = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
    const armed = { enabledAt: at(1) };

    it("leaves the owner's own pull requests with auto-merge off, and held ones, out of open and oldest open", () => {
        const s = prStocks(
            [
                // #1727 (owner, no auto-merge, opened 443 h before the review) and #1677 (held): his to merge.
                { ...base, number: 1727, createdAt: at(443), author: { login: OWNER_LOGIN }, autoMergeRequest: null },
                { ...base, number: 1677, createdAt: at(300), labels: { nodes: [{ name: "hold" }] } },
                // His pull request an agent armed, and an agent's: waiting on CI, not on him.
                { ...base, number: 3900, createdAt: at(5), author: { login: OWNER_LOGIN }, autoMergeRequest: armed },
                {
                    ...base,
                    number: 3901,
                    createdAt: at(3),
                    author: { login: "graphty-agent" },
                    autoMergeRequest: armed,
                },
            ],
            NOW,
        );
        expect(s.open).toBe(2);
        expect(s.oldestOpenMs).toBe(5 * 3_600_000);
    });
});

describe("ghost runs", () => {
    const ghost = fixture<GhRun>("run-ghost-40441556963.json");
    const open = (branch: string) => [{ number: 4000, headRefName: branch }] as unknown as GqlPr[]; // only what the match reads

    it("calls a queued pull request run a ghost once no open pull request has its branch", () => {
        expect(isGhostRun(ghost, open("some/other-branch"), true)).toBe(true);
        expect(isGhostRun(ghost, open(ghost.head_branch!), true)).toBe(false);
        // A truncated open list proves nothing.
        expect(isGhostRun(ghost, open("some/other-branch"), false)).toBe(false);
        expect(isGhostRun({ ...ghost, event: "push" }, [], true)).toBe(false);
    });
});

describe("release workflows count only their declared events", () => {
    it("declares the events each workflow file names under on:", () => {
        for (const [wf, events] of Object.entries(RELEASE_WORKFLOW_EVENTS)) {
            const text = readFileSync(new URL(`../../../../.github/workflows/${wf}`, import.meta.url), "utf8");
            const on = /^on:\n((?:[ \t]+.*\n|\n)*)/m.exec(text)?.[1] ?? "";
            const declared = [...on.matchAll(/^ {4}(\w+):/gm)].map((m) => m[1]);
            expect(declared, wf).toEqual(events);
        }
    });

    it("ignores the push runs GitHub records for branches where promote.yml cannot run", () => {
        const push = fixture<{ workflow_runs: GhRun[] }>("promote-runs-push.json").workflow_runs;
        const now = Date.parse(push[0].created_at) + 30 * MIN;
        expect(workflowState("promote.yml", push, now)).toMatchObject({ runs: 0, failed: 0, inRow: 0 });
        // The same runs as dispatches would be a real streak.
        const asDispatch = push.map((r) => ({ ...r, event: "workflow_dispatch" }));
        expect(workflowState("promote.yml", asDispatch, now).inRow).toBe(10);
    });
});

describe("stress run: found nothing three weeks running", () => {
    // restricted-cpu-stress.yml's runs as listed on 2026-10-27 (two dispatches beside the Sunday schedule).
    const at = (iso: string) => Date.parse(iso);
    const runs = [
        { at: at("2026-10-26T19:14:33Z"), foundFailures: false },
        { at: at("2026-10-25T08:42:28Z"), foundFailures: false },
        { at: at("2026-10-18T08:19:37Z"), foundFailures: false },
        { at: at("2026-10-11T10:18:22Z"), foundFailures: false },
        { at: at("2026-10-10T18:55:07Z"), foundFailures: false },
    ];
    const now = at("2026-10-27T21:00:00Z");

    it("needs a run in each of the last three weeks, not three runs", () => {
        expect(stressQuiet(runs, now)).toBe(true);
        // The newest three runs span 9 days: two weeks, not three.
        expect(stressQuiet(runs.slice(0, 3), now)).toBe(false);
    });

    it("is not quiet when any run of the three weeks found a failure", () => {
        expect(
            stressQuiet(
                runs.map((r, i) => ({ ...r, foundFailures: i === 3 })),
                now,
            ),
        ).toBe(false);
        // A failure found four weeks ago is outside the rule.
        expect(stressQuiet([...runs, { at: at("2026-10-04T08:00:00Z"), foundFailures: true }], now)).toBe(true);
    });
});
