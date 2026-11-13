/**
 * The style fidelity gate, on hand-made records: a sample fails for an element failing that the known failures do not
 * list, and on the oracle scorecard for an element-judged rate below its floor and any accepted drop, never for a raster
 * region; a newly failing element is said to come from the drawing or the comparator when a
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
    ratchetDrops,
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

    it("fails the oracle scorecard for a rate below its recorded floor, unless the drop is accepted at that rate", () => {
        const known = { "node.position": ["a"] };
        const accepted = {
            "node.position": { floor: 0.9, to: 0.5, reason: "the oracle was redrawn", date: "2026-10-31" },
        };
        const at = (now: number, drops?: typeof accepted): string[] =>
            gateMessages(
                judgeKey(
                    "s",
                    run({ "node.position": ["a"] }, { "node.position": now, "raster.edge": 0.5 }),
                    known,
                    { "node.position": 0.9, "raster.edge": 0.97 },
                    { gateFloors: true, ...(drops === undefined ? {} : { accepted: drops }) },
                ),
            );
        // at its floor, and a raster region far under its own: the raster regions are never gated
        assert.deepEqual(at(0.9), []);
        assert.deepEqual(at(0.5), ["s node.position: 0.5 is below its recorded floor 0.9"]);
        assert.deepEqual(at(0.5, accepted), []);
        assert.deepEqual(at(0.4, accepted), [
            "s node.position: 0.4 is below its recorded floor 0.9 and its accepted drop to 0.5",
        ]);
        const report = gateReportText(
            [
                judgeKey(
                    "s",
                    run({}, { "node.position": 0.5 }),
                    undefined,
                    { "node.position": 0.9 },
                    { gateFloors: true },
                ),
            ],
            "none",
            null,
        );
        assert.include(report, "Failing keys: 1;");
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
        assert.throws(
            () => ratchetKnown(records({}), [gate], { reason: "a reason that names no issue", date: "2026-10-22" }),
            /names the issue/,
        );
        const added = ratchetKnown(records({ s: { "node.fill": ["a", "b", "gone"] } }), [gate], {
            reason: "c fails since the comparator reads fills off the body (#7015)",
            date: "2026-10-22",
        });
        assert.deepEqual(added.records.known.s, { "node.fill": ["b", "c", "gone"] });
        assert.deepEqual(added.records.reasons, [
            {
                date: "2026-10-22",
                reason: "c fails since the comparator reads fills off the body (#7015)",
                added: { s: { "node.fill": ["c"] } },
                sources: { unclassified: 1 },
            },
        ]);
    });

    it("records a drop below a floor only with a reason, and forgets it once the rate is back at its floor", () => {
        const low = judgeKey(
            "s",
            run({}, { "node.position": 0.5 }),
            undefined,
            { "node.position": 0.9 },
            { gateFloors: true },
        );
        const none = ratchetDrops({}, [low]);
        assert.deepEqual([none.drops, none.added, none.unaccepted], [{}, 0, 1]);
        assert.throws(() => ratchetDrops({}, [low], { reason: "", date: "2026-10-31" }), /reason of 10 or more/);
        assert.throws(
            () => ratchetDrops({}, [low], { reason: "a reason that names no issue", date: "2026-10-31" }),
            /names the issue/,
        );
        const reason = "the oracle now measures the face Graphviz means (#7015)";
        const added = ratchetDrops({}, [low], { reason, date: "2026-10-31" });
        assert.deepEqual(added.drops, { s: { "node.position": { floor: 0.9, to: 0.5, reason, date: "2026-10-31" } } });
        const back = judgeKey(
            "s",
            run({}, { "node.position": 0.9 }),
            undefined,
            { "node.position": 0.9 },
            {
                gateFloors: true,
                accepted: added.drops.s,
            },
        );
        const kept = ratchetDrops(added.drops, [back]);
        assert.deepEqual([kept.drops, kept.removed], [{}, 1]);
    });

    it("adds only the properties named, so a drop is accepted without the key's other failures", () => {
        const gate = judgeKey(
            "s",
            run(
                { "node.position": ["a"], "edge.route": ["e"] },
                { "node.position": 0.5, "edge.route": 0.5 },
                { "node.position": ["a", "b"], "edge.route": ["e", "f"] },
            ),
            undefined,
            { "node.position": 0.9, "edge.route": 0.9 },
            { gateFloors: true },
        );
        const add = {
            reason: "the comparator reads the place anew (#7015)",
            date: "2026-11-01",
            properties: ["node.position"],
        };
        const known = ratchetKnown(records({}), [gate], add);
        assert.deepEqual(known.records.known.s, { "node.position": ["a"] });
        assert.deepEqual([known.added, known.unlisted], [1, 1]);
        const drops = ratchetDrops({}, [gate], add);
        assert.deepEqual(Object.keys(drops.drops.s), ["node.position"]);
        assert.deepEqual([drops.added, drops.unaccepted], [1, 1]);
    });

    it("prunes only a known failure whose element neither drawing has any more, and only when asked", () => {
        // the program's square rect@1 is gone (read as one picture now); node d is not judged for fill but is still
        // drawn (graphty's extra d); x still fails; graphty's stray graphty:s1 is gone too
        const gate = judgeKey(
            "s",
            run(
                { "stray.present": ["x"], "node.extra": ["graphty:d"] },
                { "stray.present": 0.5 },
                { "stray.present": ["picture@0", "x"], "node.fill": ["a"], "node.extra": ["graphty:d"] },
            ),
            { "stray.present": ["rect@1", "x"], "node.fill": ["d"], "stray.extra": ["graphty:s1"] },
            undefined,
        );
        assert.deepEqual(gate.gone, { "stray.present": ["rect@1"], "stray.extra": ["graphty:s1"] });
        const known = { s: { "stray.present": ["rect@1", "x"], "node.fill": ["d"], "stray.extra": ["graphty:s1"] } };
        assert.deepEqual(ratchetKnown(records(known), [gate]).records.known.s, known.s);
        const pruned = ratchetKnown(records(known), [gate], undefined, true);
        assert.deepEqual(pruned.records.known.s, { "stray.present": ["x"], "node.fill": ["d"], "stray.extra": [] });
        assert.strictEqual(pruned.removed, 2);
        // a list of keys prunes only those keys
        assert.deepEqual(ratchetKnown(records(known), [gate], undefined, ["other"]).records.known.s, known.s);
        assert.strictEqual(ratchetKnown(records(known), [gate], undefined, ["s"]).removed, 2);
        assert.include(gateReportText([gate], "none", null), "s stray.present: rect@1");
        // a run that judged no element (a sample that drew nothing) prunes nothing
        const blank = judgeKey("s", run({}, {}, {}), known.s, undefined);
        assert.deepEqual(blank.gone, {});
    });

    it("prunes a known failure of a property the sample now judges only on the drawing as a whole", () => {
        // json-vis-siblings: edge.curve is judged once for the drawing ("edges"), so its per-edge entries can never pass
        // or fail, though the edges are still drawn; node.fill still judges node a one by one, so drawn node b, not
        // judged for its fill now, is kept
        const judged = {
            "edge.curve": ["edges"],
            "edge.present": ["a->b", "c->d"],
            "node.fill": ["a"],
            "node.present": ["a", "b"],
        };
        const known = { s: { "edge.curve": ["a->b", "c->d"], "node.fill": ["b"] } };
        const gate = judgeKey(
            "s",
            { ...run({}, { "edge.curve": 1 }, judged), wholeDrawing: ["edges"] },
            known.s,
            undefined,
        );
        assert.deepEqual(gate.gone, { "edge.curve": ["a->b", "c->d"] });
        // a run that does not say what it judged as the whole drawing (a gate file written before) prunes none of them
        const kept = judgeKey("s", run({}, { "edge.curve": 1 }, judged), known.s, undefined);
        assert.deepEqual(kept.gone, {});
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
