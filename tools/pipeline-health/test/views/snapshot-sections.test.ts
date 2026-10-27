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
    it("workflowState counts the last hour and the failing streak", () => {
        const run = (min: number, conclusion: string) =>
            ({
                event: "workflow_dispatch",
                status: "completed",
                conclusion,
                created_at: new Date(NOW - min * MIN).toISOString(),
            }) as GhRun;
        const w = workflowState("promote.yml", [run(5, "failure"), run(20, "failure"), run(90, "success")], NOW);
        expect(w).toMatchObject({ workflow: "promote.yml", runs: 2, failed: 2, inRow: 2, since: NOW - 20 * MIN });
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
            },
            "release-workflows": [
                { workflow: "release-watch.yml", runs: 0, failed: 0, inRow: 0 },
                { workflow: "promote.yml", runs: 3, failed: 3, inRow: 9, since: at },
            ],
        });
        const lanes = await lanesTable(r);
        expect(lanes.kind === "table" && lanes.rows.map((x) => x.cells.lane)).toEqual([
            { t: "name", v: "t4" },
            { t: "name", v: "ci" },
            { t: "name", v: "land, publish" },
        ]);
        expect(lanes.sub).toMatchObject({ code: "releases.lanes.sub", params: { sha: "a870943ef", run: 1 } });
        const trains = await trainsTable(r);
        expect(
            trains.kind === "table" && trains.rows.map((x) => JSON.stringify(x.cells.lanes).match(/train\.\w+/)?.[0]),
        ).toEqual(["train.untested", "train.nothing_new", "train.tested_failed"]);
        const wf = await workflowsTable(r);
        expect(wf.kind === "table" && wf.rows.map((x) => [x.cells.workflow, !!x.past])).toEqual([
            [{ t: "name", v: "promote.yml" }, false],
            [{ t: "name", v: "release-watch.yml" }, true],
        ]);
    });
});
