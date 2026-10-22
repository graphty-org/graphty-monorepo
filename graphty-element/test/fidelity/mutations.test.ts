/**
 * The planted-defect test's bookkeeping, without a browser: a defect on an element the comparison already fails in
 * the property the defect is for tests nothing there; one on a passing element, or one the comparison cannot see at
 * all, is not excused.
 */
import { assert, describe, it } from "vitest";

import { absorbedByKnownFailures, MUTATIONS } from "./mutations";
import { compareOracle, ORACLE_PROPERTIES } from "./oracle/compare-oracle";
import type { PNode, PScene } from "./oracle/primitives";

const node = (id: string, cx: number, cy: number, color: string): PNode => ({
    id,
    cx,
    cy,
    w: 20,
    h: 20,
    shape: "ellipse",
    fill: { color, opacity: 1, gradient: null },
    stroke: null,
    label: null,
});
const scene = (side: PScene["side"], colors: string[]): PScene => ({
    side,
    width: 400,
    height: 300,
    background: "#ffffff",
    nodes: colors.map((c, i) => node(`n${String(i)}`, 50 + 100 * i, 50 + 60 * (i % 2), c)),
    edges: [],
    groups: [],
    texts: [],
    strays: [],
});

describe("planted defects", () => {
    // n0 is drawn the wrong color, n1 and n2 right
    const oracle = scene("oracle", ["#ff0000", "#00aa00", "#0000ff"]);
    const graphty = scene("graphty", ["#000000", "#00aa00", "#0000ff"]);
    const base = compareOracle("t", oracle, graphty);

    it("excuses a defect only on elements already failing the property it is for", () => {
        const after = structuredClone(graphty);
        after.nodes[0].fill = { color: "#ffff00", opacity: 1, gradient: null };
        assert.isTrue(absorbedByKnownFailures(graphty, after, base, ["node.fill"]));
        assert.isFalse(absorbedByKnownFailures(graphty, after, base, ["node.width"]));
        after.nodes[1].fill = { color: "#ffff00", opacity: 1, gradient: null };
        assert.isFalse(absorbedByKnownFailures(graphty, after, base, ["node.fill"]));
    });

    it("never excuses an added element or a change to the whole drawing", () => {
        const mutate = (name: string): PScene => MUTATIONS[name].mutate(structuredClone(graphty));
        assert.isFalse(absorbedByKnownFailures(graphty, mutate("one extra node added"), base, ["node.extra"]));
        assert.isFalse(absorbedByKnownFailures(graphty, mutate("canvas background changed"), base, ["background"]));
    });

    it("excuses removing only annotations the oracle draws nothing under", () => {
        const ann = (index: number): PScene["strays"][number] => ({
            index,
            tag: "annotation-shape",
            kind: "shape",
            box: { x0: 300 + index * 20, y0: 250, x1: 310 + index * 20, y1: 260 },
            fill: null,
            stroke: null,
            text: null,
        });
        const g = { ...structuredClone(graphty), strays: [ann(0)] };
        const r = compareOracle("t", oracle, g);
        assert.include(r.failures["stray.extra"] ?? [], "graphty:annotation-shape#0");
        const removed = MUTATIONS["annotations removed"].mutate(structuredClone(g));
        assert.isTrue(absorbedByKnownFailures(g, removed, r, ["stray.present"]));
        // one the oracle draws under is judged
        const o = { ...structuredClone(oracle), strays: [{ ...ann(0), tag: "path" }] };
        const r2 = compareOracle("t", o, g);
        assert.isFalse(absorbedByKnownFailures(g, removed, r2, ["stray.present"]));
        assert.isFalse(
            absorbedByKnownFailures(g, MUTATIONS["one extra annotation added"].mutate(structuredClone(g)), r, [
                "stray.extra",
            ]),
        );
    });

    it("names the properties each defect is for", () => {
        for (const [name, m] of Object.entries(MUTATIONS)) {
            assert.isTrue(name === "none" || m.targets.length > 0, name);
        }
    });

    it("tells a faint fill at half its opacity, though only 0.1 apart", () => {
        const faint = (s: PScene, opacity: number): PScene => ({
            ...s,
            nodes: s.nodes.map((n) => ({ ...n, fill: { color: "#00aa00", opacity, gradient: null } })),
        });
        const r = compareOracle("t", faint(oracle, 0.2), faint(graphty, 0.1));
        assert.include(Object.keys(r.failures), "node.fillOpacity");
        assert.notInclude(
            Object.keys(compareOracle("t", faint(oracle, 0.2), faint(graphty, 0.22)).failures),
            "node.fillOpacity",
        );
    });

    it("plants a defect for every property the comparison judges", () => {
        const targeted = new Set(Object.values(MUTATIONS).flatMap((m) => m.targets));
        assert.deepEqual(
            ORACLE_PROPERTIES.filter((p) => !targeted.has(p)),
            [],
            "a check with no planted defect: add one to mutations.ts",
        );
    });
});
