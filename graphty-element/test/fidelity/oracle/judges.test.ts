/**
 * Per-setting judging: an element's setting read off its id, the last rule naming a property and a setting choosing
 * its reference, the specification's drawing written over the oracle's, Tk's smoothed line, and every judges.json
 * well formed (each rule's properties real, each specification rule citing its source, each stand-in drawn).
 */
import { assert, describe, it } from "vitest";

import { ORACLE_PROPERTIES } from "./compare-oracle";
import {
    judgesFor,
    referenceOf,
    settingOf,
    SHEET_JUDGES,
    type SheetJudges,
    specificationScene,
    tkSmooth,
} from "./judges";
import type { PEdge, PNode, PScene } from "./primitives";

const standIns = Object.keys(
    import.meta.glob("../../../../graph-io/test/fidelity/oracles/stand-ins/*.svg", { query: "?raw" }),
).map((p) => p.replace(/^.*\//, "").replace(/\.svg$/, ""));

const node = (id: string): PNode => ({
    id,
    cx: 0,
    cy: 0,
    w: 10,
    h: 10,
    shape: "rect",
    fill: null,
    stroke: null,
    label: null,
});
const edge = (id: string, points: PEdge["points"]): PEdge => ({
    id,
    source: "a",
    target: "b",
    points,
    stroke: null,
    arrows: [],
    label: null,
});

describe("per-setting judging", () => {
    it("reads an element's setting off its id: a node's own, an edge's, an edge label's and an arrow's specimen", () => {
        assert.strictEqual(settingOf("fill-name"), "fill-name");
        assert.strictEqual(settingOf("arrow-first-s"), "arrow-first-s");
        assert.strictEqual(settingOf("arrow-first-s->arrow-first-t#g0"), "arrow-first");
        assert.strictEqual(settingOf("arrow-both-s->arrow-both-t#g0@source"), "arrow-both");
        assert.strictEqual(settingOf("edge:label-bend-s->label-bend-t#0"), "label-bend");
        assert.strictEqual(settingOf("loop-n->loop-n#0"), "loop");
        assert.isNull(settingOf("rect#3"));
        assert.isNull(settingOf("graphty:path#12"));
        // graphty's extra node by its id, and an extra edge by its ends (the comparator's subject)
        assert.strictEqual(settingOf("graphty:stipple-gray50"), "stipple-gray50");
        assert.strictEqual(settingOf("stipple-gray50-s->stipple-gray50-t"), "stipple-gray50");
    });

    it("lets the last rule naming a property and a setting choose its reference, and the oracle judge the rest", () => {
        const sheet: SheetJudges = {
            standIns: ["cytoscape-gml"],
            rules: [
                { judge: "cytoscape-gml", settings: ["*"], properties: ["node.shape"], why: "a" },
                { judge: "oracle", settings: ["type-rectangle"], properties: ["node.*"], why: "b" },
            ],
        };
        assert.strictEqual(referenceOf(sheet, "node.shape", "type-oval").judge, "cytoscape-gml");
        assert.strictEqual(referenceOf(sheet, "node.shape", "type-rectangle").judge, "oracle");
        assert.strictEqual(referenceOf(sheet, "node.fill", "type-oval").judge, "oracle");
        // `*` also takes the strays no setting owns
        assert.strictEqual(referenceOf(sheet, "node.shape", "rect#1").judge, "cytoscape-gml");
        assert.isTrue(judgesFor(sheet, "cytoscape-gml")("node.shape", "type-oval"));
        assert.isFalse(judgesFor(sheet, "oracle")("node.shape", "type-oval"));
    });

    it("writes the specification's expectation over the oracle's drawing of the settings it names, and no others", () => {
        const base = {
            side: "oracle",
            width: 100,
            height: 100,
            background: null,
            nodes: [node("stipple-gray50"), node("fill-hex6")],
            edges: [
                edge("smooth-1-s->smooth-1-t#0", [
                    [0, 0],
                    [10, 10],
                    [20, 0],
                ]),
            ],
            groups: [],
            texts: [],
            strays: [],
        } as PScene;
        const sheet: SheetJudges = {
            standIns: [],
            rules: [
                {
                    judge: "specification",
                    settings: ["stipple-gray50"],
                    properties: ["node.fillOpacity"],
                    why: "w",
                    expect: { node: { fill: { color: "#c8c8c8", opacity: 0.5, gradient: null } } },
                    source: "s",
                },
                {
                    judge: "specification",
                    settings: ["smooth-1"],
                    properties: ["edge.route"],
                    why: "w",
                    expect: { edge: { route: "tk-smooth" } },
                    source: "s",
                },
            ],
        };
        const spec = specificationScene(base, sheet);
        assert.deepEqual(spec.nodes[0].fill, { color: "#c8c8c8", opacity: 0.5, gradient: null });
        assert.isNull(spec.nodes[1].fill);
        assert.isAbove(spec.edges[0].points.length, 3);
        // the oracle's own scene is left as it was
        assert.isNull(base.nodes[0].fill);
        assert.lengthOf(base.edges[0].points, 3);
    });

    it("draws Tk's smoothed line from the first point to the last, through the middle of each inner segment", () => {
        const curve = tkSmooth([
            [0, 0],
            [10, 10],
            [20, 0],
            [30, 10],
        ]);
        assert.deepEqual(curve[0], [0, 0]);
        assert.deepEqual(curve.at(-1), [30, 10]);
        // an arc ends at the middle of the segment it shares with the next
        const mid = curve[16];
        assert.closeTo(mid[0], 15, 1e-9);
        assert.closeTo(mid[1], 5, 1e-9);
        // two points draw the straight line
        assert.deepEqual(
            tkSmooth([
                [0, 0],
                [5, 5],
            ]),
            [
                [0, 0],
                [5, 5],
            ],
        );
    });

    it("has a well-formed judges.json: real properties, cited expectations, and a drawing of every stand-in", () => {
        assert.isAbove(Object.keys(SHEET_JUDGES).length, 0);
        for (const [id, sheet] of Object.entries(SHEET_JUDGES)) {
            for (const route of sheet.standIns) {
                assert.include(standIns, `${id}.${route}`, `${id}: no drawing of its stand-in ${route}`);
            }
            for (const rule of sheet.rules) {
                const where = `${id} ${rule.judge} ${rule.settings.join(",")}`;
                assert.isAbove(rule.why.length, 10, `${where}: a rule says why`);
                for (const p of rule.properties) {
                    const re = new RegExp(`^${p.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`);
                    assert.isTrue(
                        ORACLE_PROPERTIES.some((q) => re.test(q)),
                        `${where}: ${p} names no property`,
                    );
                }
                if (rule.judge === "specification") {
                    assert.isDefined(rule.expect, `${where}: a specification rule records its expectation`);
                    assert.isAbove(rule.source?.length ?? 0, 10, `${where}: a specification rule cites its source`);
                } else {
                    assert.isUndefined(rule.expect, `${where}: only the specification has an expectation`);
                }
                if (rule.judge !== "oracle" && rule.judge !== "specification" && rule.judge !== "none") {
                    assert.include(
                        sheet.standIns,
                        rule.judge,
                        `${where}: judged by a stand-in the sheet does not draw`,
                    );
                }
            }
        }
    });
});
