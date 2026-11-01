/**
 * `resolveRule()`: one rule's values for one property, read the way `resolveStyles()` reads the whole rule list.
 */
import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    type ExtractedStyles,
    featuresOf,
    resolveRule,
    resolveStyles,
    styleFingerprint,
    type StyleRule,
} from "../../src/styles/index.js";

describe("resolveRule", () => {
    const b = new GraphBuilder({ directed: true });
    const score = b.declareNodeColumn({ name: "score", dtype: "f64" });
    for (let i = 0; i < 3; i++) {
        b.addNode(`n${String(i)}`);
        b.setNodeValue(score, i, i * 10);
    }
    const snapshot = b.freeze();
    const under: StyleRule = {
        id: "base",
        target: "node",
        role: "defaults",
        origin: "declared",
        where: { all: true },
        set: { width: 5, fill: "#000000" },
    };
    const scaled: StyleRule = {
        id: "scaled",
        target: "node",
        role: "continuous",
        origin: "declared",
        where: { in: [{ data: "score" }, [10, 20]] },
        map: {
            width: {
                kind: "continuous",
                by: { data: "score" },
                points: [
                    { at: 10, below: 1, value: 1, above: 1 },
                    { at: 20, below: 2, value: 2, above: 2 },
                ],
            },
        },
    };
    const ex: ExtractedStyles = {
        styles: {
            version: 1,
            source: { format: "test", dialect: "graphty", tool: null },
            units: { length: "px" },
            graph: {},
            rules: [under, scaled],
            notes: [],
        },
        columns: { node: new Map(), edge: new Map() },
        features: { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
        fingerprint: styleFingerprint(snapshot),
    };

    it("gives the rule's own values where it selects an element, null elsewhere, whatever the rules beside it", () => {
        expect(resolveRule(ex, scaled, "width", snapshot)).toEqual([null, 1, 2]);
        expect(resolveRule(ex, under, "width", snapshot)).toEqual([5, 5, 5]);
        expect(resolveRule(ex, scaled, "fill", snapshot)).toEqual([null, null, null]);
        // the rule list is the rules on top of each other
        expect(resolveStyles(ex, "node", "width", snapshot)).toEqual([5, 1, 2]);
    });
});
