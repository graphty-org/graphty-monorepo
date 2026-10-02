import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { normalizeConfig } from "../lib/config.mjs";
import {
    acceptCandidates,
    createRetriage,
    EXPORT_QUERY,
    exportRecord,
    nextStart,
    PAGE_SIZE,
} from "../lib/retriage.mjs";

const CONFIG = normalizeConfig({
    repo: "o/r",
    lanes: { ci: { workflow: "ci.yml", gating: "required" } },
    runs: { maxConcurrent: 2, caps: { default: { turns: 30, budgetUsd: 1.5, timeoutMinutes: 15 } } },
});

// A 202-issue repository behind a GraphQL fake that pages by cursor; `failAfter` names the cursor
// whose page throws once.
function fakeGitHub({ failAfter } = {}) {
    const all = Array.from({ length: 202 }, (_, i) => ({
        number: i + 1,
        title: `issue ${i + 1}`,
        body: "x".repeat(i === 0 ? 5000 : 10),
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
        author: { login: "someone" },
        labels: { nodes: [{ name: "bug" }] },
        comments: { nodes: [{ author: { login: "a" }, createdAt: "2026-02-01T00:00:00Z", body: "hi" }] },
        timelineItems: { nodes: [{ source: { number: 900 } }, { subject: { number: 901 } }, {}] },
    }));
    const calls = [];
    let failed = false;
    return {
        calls,
        async graphql(query, variables) {
            expect(query).toBe(EXPORT_QUERY);
            calls.push(variables.after);
            if (variables.after === failAfter && !failed) {
                failed = true;
                throw new Error("GitHub answered 502");
            }
            const from = variables.after ? Number(variables.after.slice(1)) : 0;
            const nodes = all.slice(from, from + PAGE_SIZE);
            const end = from + nodes.length;
            return {
                repository: {
                    issues: { pageInfo: { hasNextPage: end < all.length, endCursor: `c${end}` }, nodes },
                },
            };
        },
    };
}

// A runner that records requests and leaves each run `running` until the test ends it.
function fakeRunner(state, now) {
    const started = [];
    let n = 0;
    return {
        started,
        start(req) {
            if (Object.values(state.runs).filter((r) => r.status === "running").length >= 2) {
                return { ok: false, reason: "2 runs running" };
            }
            const id = `run-${++n}`;
            state.runs[id] = { id, kind: req.kind, status: "running", startedAt: now().toISOString(), budgetUsd: 1.5 };
            started.push({ id, ...req });
            return { ok: true, id };
        },
    };
}

const dirs = [];
afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function setup({ config = CONFIG, github = fakeGitHub(), at = "2026-10-05T09:00:00Z" } = {}) {
    const stateDir = mkdtempSync(join(tmpdir(), "githerd-retriage-"));
    dirs.push(stateDir);
    const clock = { t: new Date(at) };
    const now = () => clock.t;
    const state = { runs: {}, proposals: {}, schedule: {} };
    const ledgerLines = [];
    const runner = fakeRunner(state, now);
    const make = () =>
        createRetriage({
            stateDir,
            state,
            config: () => config,
            github,
            runner,
            prompt: (kind) => `BASE ${kind}\n`,
            ledger: (e) => void ledgerLines.push(e),
            now,
        });
    // Ends a run with a status, structured result and cost.
    const end = (id, { status = "ended", structured = { outcome: "done", summary: "s" }, cost = 1 } = {}) => {
        Object.assign(state.runs[id], { status, structured, costUsd: cost });
        const day = now().toISOString().slice(0, 10);
        state.spendRetriage = { ...state.spendRetriage, [day]: (state.spendRetriage?.[day] ?? 0) + cost };
    };
    const advance = (ms) => (clock.t = new Date(clock.t.getTime() + ms));
    return { stateDir, state, clock, runner, make, end, advance, ledgerLines, github };
}

const HOUR = 3600_000;

describe("schedule", () => {
    it("starts the first pass at the start hour, then intervalDays later", () => {
        const r = CONFIG.retriage;
        expect(nextStart(null, r, new Date("2026-10-05T08:59:00Z")).toISOString()).toBe("2026-10-05T09:00:00.000Z");
        expect(nextStart("2026-10-05T09:03:00Z", r, new Date()).toISOString()).toBe("2026-10-12T09:00:00.000Z");
    });

    it("does nothing before the start time and starts a pass once due", async () => {
        const t = setup({ at: "2026-10-05T08:00:00Z" });
        await t.make().tick();
        expect(t.state.retriage).toBeUndefined();
        expect(t.github.calls).toEqual([]);
        t.advance(HOUR);
        await t.make().tick();
        expect(t.state.retriage.date).toBe("2026-10-05");
        expect(t.state.schedule.lastRetriageAt).toBe("2026-10-05T09:00:00.000Z");
    });

    it("does not start another pass until the interval has passed", async () => {
        const t = setup();
        t.state.schedule.lastRetriageAt = "2026-10-05T09:00:00Z";
        t.state.retriage = { status: "done", date: "2026-10-05" };
        t.advance(6 * 24 * HOUR);
        await t.make().tick();
        expect(t.state.retriage.status).toBe("done");
        t.advance(24 * HOUR);
        await t.make().tick();
        expect(t.state.retriage.date).toBe("2026-10-12");
    });
});

describe("export and batches", () => {
    it("pages a 202-issue repository into issues.jsonl and batches of 25", async () => {
        const t = setup();
        await t.make().tick();
        expect(t.github.calls).toEqual([null, "c50", "c100", "c150", "c200"]);
        const pass = t.state.retriage;
        const dir = join(t.stateDir, "retriage", "2026-10-05");
        const lines = readFileSync(join(dir, "issues.jsonl"), "utf8").trim().split("\n");
        expect(lines).toHaveLength(202);
        expect(JSON.parse(lines[0]).body).toHaveLength(4000);
        expect(JSON.parse(lines[0]).linkedPrs).toEqual([900, 901]);
        expect(existsSync(join(dir, "issues", "202.md"))).toBe(true);
        expect(pass.batches.map((b) => b.issues.length)).toEqual([25, 25, 25, 25, 25, 25, 25, 25, 2]);
        expect(pass.batches[0].issues[0]).toBe(1);
        expect(pass.batches[1].issues[0]).toBe(26);
        expect(pass.batches[8].issues).toEqual([201, 202]);
        expect(pass.report.issues).toBe(202);
    });

    it("maps an issue node with missing parts", () => {
        const rec = exportRecord({ number: 3, title: "t", body: null, author: null });
        expect(rec).toMatchObject({ body: "", author: null, labels: [], comments: [], linkedPrs: [] });
    });

    it("resumes the export at the saved cursor after a failure and a restart", async () => {
        const t = setup({ github: fakeGitHub({ failAfter: "c100" }) });
        await t.make().tick();
        expect(t.state.retriage.status).toBe("exporting");
        expect(t.state.retriage.cursor).toBe("c100");
        await t.make().tick();
        expect(t.github.calls).toEqual([null, "c50", "c100", "c100", "c150", "c200"]);
        expect(t.state.retriage.report.issues).toBe(202);
    });
});

describe("candidate runs", () => {
    it("starts at most runsPerHour runs an hour, each on its batch", async () => {
        const t = setup();
        await t.make().tick();
        expect(t.runner.started).toHaveLength(2);
        const first = t.runner.started[0];
        expect(first.kind).toBe("retriage-candidates");
        expect(first.batch).toHaveLength(25);
        expect(first.batch[0]).toBe("issue:1");
        expect(first.prompt).toMatch(/^BASE retriage-candidates/);
        expect(first.prompt).toContain("#1, #2");
        t.end("run-1");
        t.end("run-2");
        await t.make().tick();
        expect(t.runner.started).toHaveLength(2);
        t.advance(HOUR);
        await t.make().tick();
        expect(t.runner.started).toHaveLength(4);
        expect(t.runner.started[2].batch[0]).toBe("issue:51");
    });

    it("waits when the runner refuses for concurrency", async () => {
        const t = setup({ config: { ...CONFIG, retriage: { ...CONFIG.retriage, runsPerHour: 5 } } });
        await t.make().tick();
        expect(t.runner.started).toHaveLength(2);
        expect(t.state.retriage.batches[2].status).toBe("pending");
    });

    it("restarts a batch whose run was interrupted and keeps finished ones", async () => {
        const t = setup();
        await t.make().tick();
        t.end("run-1");
        t.state.runs["run-2"].status = "interrupted";
        t.advance(HOUR);
        await t.make().tick();
        const pass = t.state.retriage;
        expect(pass.batches[0].status).toBe("done");
        expect(t.runner.started.slice(2).map((s) => s.batch[0])).toEqual(["issue:26", "issue:51"]);
    });

    it("stops the pass when the weekly budget is spent", async () => {
        const t = setup({ config: { ...CONFIG, retriage: { ...CONFIG.retriage, budgetUsd: 3 } } });
        await t.make().tick();
        expect(t.runner.started).toHaveLength(2);
        t.end("run-1", { cost: 1.5 });
        t.advance(HOUR);
        await t.make().tick();
        // run-2 is still running with its $1.50; wait for it.
        expect(t.state.retriage.status).toBe("candidates");
        t.end("run-2", { cost: 1.5 });
        await t.make().tick();
        expect(t.state.retriage.status).toBe("stopped");
        expect(t.runner.started).toHaveLength(2);
        expect(t.ledgerLines.at(-1)).toMatchObject({ event: "retriage-done", status: "stopped" });
    });

    it("keeps at most 3 duplicate candidates per issue and drops malformed ones", () => {
        const dup = (of) => ({ issue: 1, type: "duplicate", duplicateOf: of, reason: "same" });
        const { kept, dropped } = acceptCandidates(
            [
                dup(5),
                dup(6),
                dup(6),
                dup(7),
                dup(8),
                { issue: 1, type: "obsolete", reason: "fixed", evidence: [{ pr: 3 }] },
                { issue: 99, type: "obsolete" },
                { issue: 2, type: "duplicate" },
                { issue: 2, type: "close" },
                null,
            ],
            [1, 2],
        );
        expect(kept.map((k) => `${k.type}:${k.duplicateOf}`)).toEqual([
            "duplicate:5",
            "duplicate:6",
            "duplicate:7",
            "obsolete:null",
        ]);
        expect(dropped.map((d) => d.why)).toEqual([
            "repeated",
            "more than 3 duplicate candidates",
            "issue not in the batch",
            "duplicate without a valid duplicateOf",
            "unknown type",
            "not an object",
        ]);
        expect(acceptCandidates(undefined, [1])).toEqual({ kept: [], dropped: [] });
    });
});

// Runs a pass on a 2-batch repository up to its filter runs.
async function toFilter(candidates) {
    const config = { ...CONFIG, retriage: { ...CONFIG.retriage, batchSize: 101 } };
    const t = setup({ config });
    await t.make().tick();
    expect(t.runner.started).toHaveLength(2);
    t.end("run-1", { structured: { outcome: "done", summary: "s", candidates } });
    t.end("run-2", { status: "failed", structured: null });
    t.advance(HOUR);
    await t.make().tick();
    return t;
}

describe("filter runs", () => {
    const candidates = [
        { issue: 4, type: "obsolete", reason: "fixed by #800", evidence: [{ pr: 800 }] },
        { issue: 7, type: "duplicate", duplicateOf: 9, reason: "same crash" },
        { issue: 7, type: "duplicate", duplicateOf: 10, reason: "same crash" },
        { issue: 7, type: "duplicate", duplicateOf: 11, reason: "same crash" },
        { issue: 7, type: "duplicate", duplicateOf: 12, reason: "a fourth" },
    ];

    it("hands candidates to a filter run and drops a fourth duplicate", async () => {
        const t = await toFilter(candidates);
        const pass = t.state.retriage;
        expect(pass.status).toBe("filter");
        expect(pass.report).toMatchObject({ candidates: 4, dropped: 1 });
        expect(t.ledgerLines).toContainEqual(
            expect.objectContaining({ event: "retriage-candidate-dropped", why: "more than 3 duplicate candidates" }),
        );
        const filter = t.runner.started[2];
        expect(filter.kind).toBe("retriage-filter");
        expect(filter.batch).toEqual(["issue:4", "issue:7"]);
        expect(filter.prompt).toContain('"duplicateOf": 11');
        expect(filter.prompt).not.toContain('"duplicateOf": 12');
    });

    it("keeps a confirmed candidate's proposal and voids a rejected one's", async () => {
        const t = await toFilter(candidates);
        const prop = (id, target, extra) => ({ id, target, proposedBy: "run-3", status: "dry-run", ...extra });
        t.state.proposals = {
            a: prop("a", "issue:4", { closeAs: "completed" }),
            b: prop("b", "issue:7", { closeAs: "duplicate", duplicateOf: 10 }),
            c: { id: "c", target: "issue:50", proposedBy: "run-other", status: "dry-run" },
        };
        t.end("run-3", {
            structured: {
                outcome: "done",
                summary: "s",
                candidates: [
                    { issue: 4, verdict: "confirmed", reason: "merged" },
                    { issue: 7, verdict: "rejected", reason: "different crash" },
                ],
            },
        });
        await t.make().tick();
        expect(t.state.proposals.a.status).toBe("dry-run");
        expect(t.state.proposals.b.status).toBe("voided");
        expect(t.state.proposals.c.status).toBe("dry-run");
        const pass = t.state.retriage;
        expect(pass.status).toBe("done");
        expect(pass.report).toMatchObject({ confirmed: 1, rejected: 1, proposals: ["a"] });
        expect(t.ledgerLines.at(-1)).toMatchObject({ event: "retriage-done", status: "done", issues: 202 });
    });

    it("voids a proposal that does not match the confirmed claim, and all of a failed run's", async () => {
        const t = await toFilter(candidates);
        t.state.proposals = {
            wrong: {
                id: "wrong",
                target: "issue:7",
                proposedBy: "run-3",
                status: "dry-run",
                closeAs: "duplicate",
                duplicateOf: 12,
            },
            obs: { id: "obs", target: "issue:7", proposedBy: "run-3", status: "dry-run", closeAs: "completed" },
        };
        t.end("run-3", {
            structured: { outcome: "done", summary: "s", candidates: [{ issue: 7, verdict: "confirmed" }] },
        });
        await t.make().tick();
        expect(t.state.proposals.wrong.status).toBe("voided");
        expect(t.state.proposals.obs.status).toBe("voided");

        const f = await toFilter(candidates);
        f.state.proposals = { a: { id: "a", target: "issue:4", proposedBy: "run-3", status: "dry-run" } };
        f.end("run-3", { status: "failed", structured: null });
        await f.make().tick();
        expect(f.state.proposals.a.status).toBe("voided");
    });

    it("voids every proposal of a filter run that was interrupted or lost, and runs the group again", async () => {
        for (const status of ["interrupted", "lost"]) {
            const t = await toFilter(candidates);
            t.state.proposals = {
                a: { id: "a", target: "issue:4", proposedBy: "run-3", status: "pending", closeAs: "completed" },
                c: { id: "c", target: "issue:50", proposedBy: "run-other", status: "pending" },
            };
            t.end("run-3", { status, structured: null });
            await t.make().tick();
            expect(t.state.proposals.a).toMatchObject({
                status: "voided",
                voidReason: "its filter run did not finish",
            });
            expect(t.state.proposals.c.status).toBe("pending");
            expect(t.state.retriage.filters[0]).toMatchObject({ status: "running", run: "run-4" });
        }
    });

    it("splits filter groups to fit the run write cap", async () => {
        const many = Array.from({ length: 12 }, (_, i) => ({ issue: i + 1, type: "obsolete", reason: "r" }));
        const t = await toFilter(many);
        expect(t.state.retriage.filters.map((g) => g.issues.length)).toEqual([10, 2]);
    });

    it("finishes at once when there are no candidates", async () => {
        const t = await toFilter([]);
        expect(t.state.retriage.status).toBe("done");
        expect(t.runner.started).toHaveLength(2);
    });
});
