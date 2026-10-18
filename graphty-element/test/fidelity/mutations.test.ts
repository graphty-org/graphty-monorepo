/**
 * The planted-defect test's bookkeeping, without a browser: a defect on an element the comparison already fails in
 * the property the defect is for tests nothing there; one on a passing element, or one the comparison cannot see at
 * all, is not excused.
 */
import { assert, describe, it } from "vitest";

import { absorbedByKnownFailures, MUTATIONS } from "./mutations";
import { compareOracle } from "./oracle/compare-oracle";
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

    it("names the properties each defect is for", () => {
        for (const [name, m] of Object.entries(MUTATIONS)) {
            assert.isTrue(name === "none" || m.targets.length > 0, name);
        }
    });
});
