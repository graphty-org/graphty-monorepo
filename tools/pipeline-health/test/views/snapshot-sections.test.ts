import { describe, expect, it } from "vitest";

import { codeownerPatterns, type GhRun, ownedPaths, prStages, workflowState } from "../../src/collector/parse.js";
import { HOUR, MIN } from "../../src/model/items.js";
import { setCursor } from "../../src/model/raw.js";
import type { Snapshots } from "../../src/model/snapshots.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { Reads } from "../../src/views/members.js";
import {
    channelTiles,
    lanesTable,
    ownerTable,
    prTime,
    quarantineTable,
    trainsTable,
    workflowsTable,
} from "../../src/views/snapshot-sections.js";

const NOW = Date.parse("2026-10-25T23:30:00Z");

async function reads(lists: Partial<Snapshots>) {
    const store = new MemoryStore();
    for (const [k, v] of Object.entries(lists)) await setCursor(store, k, JSON.stringify(v), NOW);
    return new Reads(store, NOW, await evaluate(store, NOW), SLAS);
}

describe("parsers", () => {
    it("prStages splits runner wait, checks, red and green-to-merged", () => {
        const t = 0;
        // red run 0-10 (job started at 2), fixed run 15-25 (job at 16), merged at 30
        expect(
            prStages(
                [
                    [t, 2, 10, 0],
                    [15, 16, 25, 1],
                ],
                30,
            ),
        ).toEqual({ runners: 3, checks: 17, red: 5, merging: 5 });
        expect(prStages([[40, 41, 50, 1]], 30)).toBeUndefined();
    });
    it("ownedPaths matches CODEOWNERS patterns", () => {
        const pats = codeownerPatterns("# x\n/.github/ @o\n/visual-review/ @o\n*.lock @o\n");
        expect(ownedPaths([".github/workflows/ci.yml", "a/b.lock", "src/x.ts"], pats)).toEqual([".github/", "*.lock"]);
    });
    it("workflowState counts the last 24 hours and the failing streak", () => {
        const run = (min: number, conclusion: string) =>
            ({
                event: "workflow_dispatch",
                status: "completed",
                conclusion,
                created_at: new Date(NOW - min * MIN).toISOString(),
            }) as GhRun;
        const w = workflowState(
            "promote.yml",
            [run(5, "failure"), run(20, "failure"), run(90, "success"), run(25 * 60, "failure")],
            NOW,
        );
        expect(w).toMatchObject({ workflow: "promote.yml", runs: 3, failed: 2, inRow: 2, since: NOW - 20 * MIN });
    });
});

describe("snapshot sections", () => {
    it("say not collected before the collector writes a list", async () => {
        const r = await reads({});
        for (const s of [
            await ownerTable(r),
            await quarantineTable(r),
            await lanesTable(r),
            await trainsTable(r),
            await workflowsTable(r),
        ])
            expect(s).toMatchObject({ kind: "empty", fact: { code: "section.no_detail" } });
        expect(await prTime(r, "1h")).toMatchObject({ kind: "empty", id: "time" });
    });

    it("owner names its paths, waiting time and the failing workflow it fixes", async () => {
        const r = await reads({
            "owner-wait": [
                {
                    number: 3577,
                    title: "fix(ci): promote.yml sets WORK",
                    since: NOW - 44 * MIN,
                    paths: [".github/"],
                    breaking: false,
                    labels: [],
                },
            ],
            "release-workflows": [{ workflow: "promote.yml", runs: 2, failed: 2, inRow: 5 }],
        });
        const s = await ownerTable(r);
        expect(s.kind).toBe("table");
        const row = s.kind === "table" ? s.rows[0] : undefined;
        expect(row?.cells.waiting).toEqual({ t: "dur", s: 44 * 60 });
        expect(JSON.stringify(row?.cells.why)).toContain("owner.fixes");
    });

    it("quarantine is a table of entries, or the empty fact for an empty list", async () => {
        expect(await quarantineTable(await reads({ quarantine: [] }))).toMatchObject({
            fact: { code: "flaky.quarantine.empty" },
        });
        const s = await quarantineTable(await reads({ quarantine: [{ file: "a.test.ts", name: "t", issue: 4 }] }));
        expect(s.kind === "table" && s.rows[0].cells.issue).toEqual({ t: "issue", n: 4 });
    });

    it("lanes, trains and workflows read the release lists", async () => {
        const at = NOW - 5 * HOUR;
        const r = await reads({
            release: {
                "1.1": {
                    sha: "a870943ef00",
                    at,
                    created: at,
                    tested: true,
                    red: ["t4"],
                    ciFailed: false,
                    run: 1,
                    ok: false,
                    nightly: "skipped",
                    lanes: { ci: "passed", t4: "failed", land: "skipped", publish: "skipped" },
                    jobs: {
                        t4: { job: "T4 GPU / Test", n: 1, s: 2340, redAt: at + HOUR },
                        ci: { job: "CI", n: 25, s: 3000 },
                    },
                },
                "2.1": {
                    sha: "a870943ef00",
                    at: at + 2 * HOUR,
                    created: at + 2 * HOUR,
                    tested: false,
                    red: [],
                    ciFailed: false,
                    ok: true,
                },
                "3.1": {
                    sha: "a870943ef00",
                    at: at + 3 * HOUR,
                    created: at + 3 * HOUR,
                    tested: false,
                    red: [],
                    ciFailed: false,
                    ok: true,
                },
                "4.1": {
                    sha: "1fa254bf300",
                    at: at + 4 * HOUR,
                    created: at + 4 * HOUR,
                    tested: false,
                    red: [],
                    ciFailed: false,
                    ok: true,
                },
                // A promotion tests nothing by design: not a train attempt, so no row.
                "5.1": {
                    sha: "d6f4798c900",
                    at: at + 5 * HOUR,
                    created: at + 5 * HOUR,
                    mode: "promote-nightly",
                    tested: false,
                    red: [],
                    ciFailed: false,
                    ok: false,
                    failedJob: "Promote to nightly",
                },
            },
            "release-workflows": [
                { workflow: "release-watch.yml", runs: 0, failed: 0, inRow: 0 },
                { workflow: "promote.yml", runs: 3, failed: 3, inRow: 9, since: at },
            ],
        });
        const lanes = await lanesTable(r);
        expect(lanes.kind === "table" && lanes.rows.map((x) => x.cells.lane)).toEqual([
            { t: "label", code: "lane.t4" },
            { t: "label", code: "lane.ci" },
            {
                t: "list",
                sep: "comma",
                items: [
                    { t: "label", code: "lane.land" },
                    { t: "label", code: "lane.publish" },
                ],
            },
        ]);
        // A red lane says since when; a lane that passed has no red span.
        expect(lanes.kind === "table" && lanes.rows.map((x) => x.cells.since.t)).toEqual(["time", "none", "none"]);
        expect(lanes.sub).toMatchObject({ code: "releases.lanes.sub", params: { sha: "a870943ef", run: 1 } });
        const trains = await trainsTable(r);
        expect(
            trains.kind === "table" && trains.rows.map((x) => JSON.stringify(x.cells.lanes).match(/train\.\w+/)?.[0]),
        ).toEqual(["train.untested", "train.nothing_new", "train.tested_failed"]);
        // A failed attempt is marked red, and says it did not move nightly.
        const failed = trains.kind === "table" ? trains.rows[2].cells : undefined;
        expect(failed?.lanes).toMatchObject({ t: "mark", state: "bad" });
        expect(failed?.nightly).toEqual({ t: "fact", fact: { code: "train.not_promoted" } });
        const wf = await workflowsTable(r);
        expect(wf.kind === "table" && wf.rows.map((x) => [x.cells.workflow, !!x.past])).toEqual([
            [{ t: "name", v: "promote.yml" }, false],
            [{ t: "name", v: "release-watch.yml" }, true],
        ]);
    });
});

describe("train attempts", () => {
    it("say whether each tested attempt promoted nightly or was held", async () => {
        const at = NOW - 5 * HOUR;
        const passed = { sha: "b".repeat(40), tested: true, red: [], ciFailed: false, ok: true };
        const r = await reads({
            release: {
                "1.1": { ...passed, at, created: at, run: 1, nightly: "passed" },
                "2.1": {
                    ...passed,
                    sha: "c".repeat(40),
                    at: at + HOUR,
                    created: at + HOUR,
                    run: 2,
                    nightly: "skipped",
                },
            },
        });
        const trains = await trainsTable(r);
        if (trains.kind !== "table") throw new Error(trains.kind);
        expect(trains.rows.map((x) => x.cells.nightly)).toEqual([
            { t: "mark", state: "warn", cell: { t: "fact", fact: { code: "train.held" } } },
            { t: "fact", fact: { code: "train.promoted" } },
        ]);
        // A pass is plain: only failures and untested commits carry a mark.
        expect(trains.rows.map((x) => x.cells.lanes.t)).toEqual(["fact", "fact"]);
    });
});

describe("release channels", () => {
    const at = (min: number) => NOW - min * MIN;
    const seen = (run: number, min: number, more: Partial<Snapshots["release"][string]>) => ({
        sha: `${run}`.padEnd(40, "0"),
        at: at(min),
        tested: true,
        red: [],
        ciFailed: false,
        run,
        mode: "full",
        ok: true,
        conclusion: "success",
        nightly: "passed",
        ...more,
    });

    it("is NO DATA for every channel before anything is collected", async () => {
        const tiles = await channelTiles(await reads({}));
        expect(tiles.map((t) => [t.id, t.state, t.sha, t.at, t.attempts.length])).toEqual([
            ["canary", "nodata", null, null, 0],
            ["nightly", "nodata", null, null, 0],
            ["production", "nodata", null, null, 0],
        ]);
    });

    it("draws each channel's attempts oldest first, its state from the newest and what it serves", async () => {
        const r = await reads({
            channels: {
                canary: [
                    { at: at(10), outcome: "bad", sha: "c2".padEnd(40, "0"), run: 12 },
                    { at: at(40), outcome: "ok", sha: "c1".padEnd(40, "0"), run: 11 },
                ],
                promotions: {
                    "21.1": { at: at(3000), outcome: "ok", run: 21 },
                    "22.1": null,
                    "23.1": { at: at(60), outcome: "cancelled", run: 23 },
                },
                refs: { production: "p".padEnd(40, "0") },
            },
            release: {
                "1.1": seen(1, 900, {}),
                "2.1": seen(2, 500, { ok: false, conclusion: "failure", nightly: "skipped", red: ["t4"] }),
                "3.1": seen(3, 100, { nightly: "skipped" }),
                // not nightly attempts: a shadow run, a skip with nothing new, one read before nightly was kept
                "4.1": seen(4, 50, { mode: "shadow" }),
                "5.1": seen(5, 40, { tested: false, nightly: "skipped" }),
                "6.1": seen(6, 30, { nightly: undefined }),
            },
        });
        const [canary, nightly, production] = await channelTiles(r);
        expect(canary).toMatchObject({ state: "bad", sha: "c1".padEnd(40, "0"), at: new Date(at(40)).toISOString() });
        expect(canary.attempts.map((a) => [a.run, a.outcome])).toEqual([
            [11, "ok"],
            [12, "bad"],
        ]);
        // no channel/nightly ref collected: the newest promoted attempt's commit
        expect(nightly).toMatchObject({ state: "warn", sha: "1".padEnd(40, "0") });
        expect(nightly.attempts.map((a) => [a.run, a.outcome])).toEqual([
            [1, "ok"],
            [2, "bad"],
            [3, "held"],
        ]);
        // a cancelled newest attempt does not set the state; the ref says what production serves
        expect(production).toMatchObject({ state: "ok", sha: "p".padEnd(40, "0"), link: "/releases" });
        expect(production.attempts.map((a) => a.outcome)).toEqual(["ok", "cancelled"]);
    });
});
