/**
 * The style fidelity gate, on hand-made records: a sample fails only for an element failing that the known failures do
 * not list, never for a pass rate; a newly failing element is said to come from the drawing or the comparator when a
 * baseline was judged again; a known failure that is not measurable any more is reported, not failed; the raster
 * regions are reported past 0.02 only; and the ratchet takes off what passes, raises floors, never lowers one, and adds
 * only with a reason.
 */
import { assert, describe, it } from "vitest";

import {
    type Baseline,
    gateMessages,
    gateReportText,
    judgeKey,
    type Judgement,
    type KnownRecords,
    oracleFileSha256,
    oracleSlice,
    raiseFloors,
    ratchetKnown,
    recordableScores,
    sourceOf,
} from "./floors";

const run = (
    failures: Judgement["failures"],
    scores: Record<string, number> = {},
    judged?: Judgement["judged"],
): Judgement => ({ failures, scores, ...(judged === undefined ? {} : { judged }) });

const records = (known: KnownRecords["known"]): KnownRecords => ({ about: "", known, reasons: [] });

describe("style fidelity gate", () => {
    it("fails a sample for one element newly failing, and never for a pass rate", () => {
        const known = { "node.fill": ["a"] };
        // a fixed, b broken: the rate is the same
        const broken = judgeKey("s", run({ "node.fill": ["b"] }, { "node.fill": 0.5 }), known, { "node.fill": 0.5 });
        assert.deepEqual(gateMessages(broken), ["s node.fill: 1 newly failing: b (unclassified)"]);
        // far below its recorded rate, with only known failures: reported, not failed
        const low = judgeKey("s", run({ "node.fill": ["a"] }, { "node.fill": 0.1 }), known, { "node.fill": 0.9 });
        assert.deepEqual(gateMessages(low), []);
        assert.deepEqual(
            low.changes.map((c) => [c.property, c.kind]),
            [["node.fill", "drop"]],
        );
    });

    it("fails an element failing a property with no record, as a new failure", () => {
        const gate = judgeKey("s", run({ "edge.color": ["e"] }, { "edge.color": 0.5 }), undefined, undefined);
        assert.deepEqual(
            gate.newlyFailing.map((f) => f.id),
            ["e"],
        );
        assert.deepEqual(
            gate.changes.map((c) => c.kind),
            ["new"],
        );
    });

    it("reports a known failure that is not judged any more as not measurable, never as a failure", () => {
        const gate = judgeKey(
            "s",
            run({}, { "edge.arrow": 1 }, { "edge.arrow": ["e2"] }),
            { "edge.arrow": ["e1", "e2"] },
            { "edge.arrow": 0.5, "edge.arrowShape": 0.5 },
        );
        assert.deepEqual(gateMessages(gate), []);
        assert.deepEqual(gate.nowPassing, { "edge.arrow": ["e2"] });
        assert.deepEqual(gate.notMeasurable, { "edge.arrow": ["e1"] });
        assert.deepEqual(
            gate.changes.filter((c) => c.kind === "not measurable").map((c) => c.property),
            ["edge.arrowShape"],
        );
    });

    it("counts every known failure of a scored property as measured where the comparison lists no judged elements", () => {
        const gate = judgeKey("s", run({}, { fill: 1 }), { fill: ["a"], size: ["b"] }, undefined);
        assert.deepEqual(gate.nowPassing, { fill: ["a"] });
        assert.deepEqual(gate.notMeasurable, { size: ["b"] });
    });

    it("reports a raster region only when it drops more than 0.02, and records raster floors from SwiftShader only", () => {
        const at = (edge: number): string[] =>
            judgeKey("s", run({}, { "raster.edge": edge }), undefined, { "raster.edge": 0.97 })
                .changes.filter((c) => c.kind === "drop")
                .map((c) => c.property);
        assert.deepEqual(at(0.95), []);
        assert.deepEqual(at(0.94), ["raster.edge"]);
        const scores = { "raster.edge": 0.9, "node.fill": 1 };
        assert.deepEqual(recordableScores(scores, "none"), scores);
        assert.deepEqual(recordableScores(scores, "nvidia"), { "node.fill": 1 });
    });

    it("says whether a newly failing element comes from the drawing or the comparator, by the baseline judged again", () => {
        const baseline: Baseline = {
            recorded: run({ "edge.route": ["old"] }, { "edge.route": 0.8 }),
            rejudged: run({ "edge.route": ["old", "judgedNow"] }, { "edge.route": 0.7 }),
        };
        assert.strictEqual(sourceOf("edge.route", "judgedNow", baseline), "comparator");
        assert.strictEqual(sourceOf("edge.route", "drawn", baseline), "drawing");
        assert.strictEqual(sourceOf("edge.route", "old", baseline), "baseline");
        assert.strictEqual(sourceOf("edge.route", "drawn", undefined), "unclassified");
        const gate = judgeKey(
            "s",
            run({ "edge.route": ["old", "judgedNow", "drawn"] }, { "edge.route": 0.6 }),
            { "edge.route": ["old"] },
            { "edge.route": 0.8 },
            { baseline },
        );
        assert.deepEqual(gateMessages(gate), [
            "s edge.route: 2 newly failing: judgedNow (comparator), drawn (drawing)",
        ]);
        const [change] = gate.changes;
        assert.closeTo(change.comparator ?? NaN, -0.1, 1e-9);
        assert.closeTo(change.drawing ?? NaN, -0.1, 1e-9);
        const text = gateReportText([gate], "none", "tmp/base");
        assert.include(text, "comparator 1, drawing 1");
        assert.include(text, "comparator -0.1, drawing -0.1");
    });

    it("ratchets: takes off what passes, keeps what is not measurable, and adds only with a reason it records", () => {
        const gate = judgeKey(
            "s",
            run({ "node.fill": ["b", "c"] }, { "node.fill": 0.5 }, { "node.fill": ["a", "b", "c"] }),
            { "node.fill": ["a", "b", "gone"] },
            undefined,
        );
        const kept = ratchetKnown(records({ s: { "node.fill": ["a", "b", "gone"] } }), [gate]);
        assert.deepEqual(kept.records.known.s, { "node.fill": ["b", "gone"] });
        assert.deepEqual([kept.removed, kept.added, kept.unlisted], [1, 0, 1]);
        assert.deepEqual(kept.records.reasons, []);
        assert.throws(
            () => ratchetKnown(records({}), [gate], { reason: "", date: "2026-10-22" }),
            /reason of 10 or more/,
        );
        const added = ratchetKnown(records({ s: { "node.fill": ["a", "b", "gone"] } }), [gate], {
            reason: "c fails since the comparator reads fills off the body",
            date: "2026-10-22",
        });
        assert.deepEqual(added.records.known.s, { "node.fill": ["b", "c", "gone"] });
        assert.deepEqual(added.records.reasons, [
            {
                date: "2026-10-22",
                reason: "c fails since the comparator reads fills off the body",
                added: { s: { "node.fill": ["c"] } },
                sources: { unclassified: 1 },
            },
        ]);
    });

    it("raises a floor and records a new one, and never lowers one", () => {
        const table: Record<string, Record<string, number>> = { s: { "node.fill": 0.5, "edge.color": 0.9 } };
        assert.strictEqual(raiseFloors(table, "s", { "node.fill": 0.6, "edge.color": 0.1, "node.shape": 1 }), 2);
        assert.deepEqual(table.s, { "node.fill": 0.6, "edge.color": 0.9, "node.shape": 1 });
    });

    it("keeps a key's records with the real programs unless it says the stand-ins or the specification judged it", () => {
        assert.strictEqual(judgeKey("s", run({}), undefined, undefined).section, "floors");
        assert.strictEqual(
            judgeKey("s~specification", run({}), undefined, undefined, { section: "specificationFloors" }).section,
            "specificationFloors",
        );
    });

    it("spreads the full run over slices that are disjoint and cover every sample, and refuses a bad slice", () => {
        const ids = ["a", "b", "c", "d", "e"];
        assert.deepEqual(oracleSlice(ids, undefined), ids);
        assert.deepEqual(oracleSlice(ids, ""), ids);
        assert.deepEqual(oracleSlice(ids, "1/2"), ["a", "c", "e"]);
        assert.deepEqual(oracleSlice(ids, "2/2"), ["b", "d"]);
        const three = ["1/3", "2/3", "3/3"].flatMap((s) => oracleSlice(ids, s));
        assert.deepEqual([...three].sort(), ids);
        for (const bad of ["0/2", "3/2", "2", "a/b", "1/0"]) {
            assert.throws(() => oracleSlice(ids, bad), /GRAPHTY_ORACLE_SLICE/);
        }
    });
});

describe("the sample file an oracle was drawn from", () => {
    it("reads the web oracles' fileSha256 as well as the desktop tools' sha256, and nothing else as one", () => {
        // the 74 web oracles (cyjs, sigma, vis) record only fileSha256, which the gate read as no record at all
        assert.strictEqual(oracleFileSha256({ fileSha256: "ab12", svgSha256: "ff" }), "ab12");
        assert.strictEqual(oracleFileSha256({ sha256: "cd34" }), "cd34");
        assert.isNull(oracleFileSha256({ svgSha256: "ff" }));
        assert.isNull(oracleFileSha256({ sha256: 7 }));
    });
});
