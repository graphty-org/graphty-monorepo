import type { CodedFact, HistoryCode, HistoryStep, PendingStep } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import { historyRows, undoVerb } from "../historyRows";
import { historyTitle } from "../historyWords";
import { makeStep, PANEL_TITLES } from "./historyFixtures";

const at = (minutes: number): number => new Date(2026, 8, 4, 14, minutes).getTime();

const three = [
    makeStep("a", "Imported cats.json", ["graph"], at(1)),
    makeStep("b", "Ran degree", ["runs", "styles"], at(2)),
    makeStep("c", "Changed colour of Hubs", ["styles"], at(3)),
];

describe("historyRows", () => {
    it("runs newest first, with every step past the position undone", () => {
        const rows = historyRows(three, 2, PANEL_TITLES);

        expect(rows.map((row) => row.kind === "entry" && row.entry.title)).toEqual([
            "Changed colour of Hubs",
            "Ran degree",
            "Imported cats.json",
        ]);
        expect(rows[0]).toMatchObject({ undone: true, current: false });
        expect(rows[1]).toMatchObject({ undone: false, current: true });
        expect(rows[2]).toMatchObject({ undone: false, current: false });
    });

    it("marks every step undone and none current at the baseline", () => {
        const rows = historyRows(three, 0, PANEL_TITLES);

        expect(rows.every((row) => row.undone && row.kind === "entry" && !row.current)).toBe(true);
    });

    it("gives a step to the panel that owns what it changed, a run before its layers", () => {
        const rows = historyRows(three, 3, PANEL_TITLES);

        expect(rows.map((row) => row.kind === "entry" && row.entry.activityLabel)).toEqual([
            "Style",
            "Analyze",
            "Data",
        ]);
        expect(rows[1]).toMatchObject({ entry: { id: "b", destinationTitle: "Ran degree. Opens Analyze" } });
    });

    it("groups the steps of one XR session and strikes the group only when all are undone", () => {
        const xr = { xr: `vr:${new Date(at(0)).toISOString()}` };
        const steps: HistoryStep[] = [
            makeStep("a", "Flagged merch-88", ["visibility"], at(5), xr),
            makeStep("b", "Note on acct-4471", ["visibility"], at(9), { ...xr, via: "voice" }),
        ];

        const [group] = historyRows(steps, 1, PANEL_TITLES);

        expect(group).toMatchObject({ kind: "xrSession", label: "VR session 14:00 - 14:09", undone: false });
        expect(group.kind === "xrSession" && group.children.length).toBe(2);
        expect(group.kind === "xrSession" && group.children[0].entry.provenance).toBe("by voice, in VR");
        expect(historyRows(steps, 0, PANEL_TITLES)[0].undone).toBe(true);
    });
});

describe("undoVerb", () => {
    it("names the step an undo would take back, or the work it would cancel", () => {
        const pending: PendingStep = {
            id: "p" as PendingStep["id"],
            label: "Ran pagerank",
            fact: { code: "algo.run", params: { algorithm: "pagerank" } },
            since: "",
            runIds: [],
        };

        expect(undoVerb(null)).toBeUndefined();
        expect(undoVerb({ kind: "undo", step: three[1] })).toBe("Undo Ran degree");
        expect(undoVerb({ kind: "cancel", pending: [pending] })).toBe("Cancel Ran pagerank");
    });
});

describe("historyTitle", () => {
    it("words each step from its code and params, not from the element's label", () => {
        const cases: readonly [CodedFact<HistoryCode>, string][] = [
            [{ code: "data.add-nodes", params: { count: 3 } }, "Added 3 nodes"],
            [{ code: "data.add-edges", params: { count: 1 } }, "Added an edge"],
            [{ code: "data.edit", params: { target: "node", count: 2 } }, "Edited 2 nodes"],
            [{ code: "algo.run", params: { algorithm: "degree" } }, "Ran degree"],
            [{ code: "data.expand", params: { node: "n7" } }, "Expanded n7"],
            [{ code: "view.save", params: { names: ["Overview"] } }, 'Saved the view "Overview"'],
            [{ code: "config.set", params: { keys: ["a", "b"] } }, "Changed 2 settings"],
            [{ code: "positions.release", params: { count: 1 } }, "Released a node"],
            [{ code: "batch", params: { label: null, steps: 2 } }, "2 changes"],
            [{ code: "transaction", params: { label: "Tidy up" } }, "Tidy up"],
        ];

        for (const [fact, title] of cases) {
            expect(historyTitle(fact)).toBe(title);
        }
    });

    it("names a code it does not know generically, since new codes come in minor releases", () => {
        expect(historyTitle({ code: "something.new" as HistoryCode, params: {} })).toBe("Change");
    });
});
