/**
 * The repair every format's reader makes on a file graphty wrote (`takeFromBlock`): a value read from the file's own
 * keys gives way to the `graphty.styles` block's wherever it is exactly what the writer writes for the block's value,
 * whether the block gives a value or none, and whether the file holds a value or none. Every format applies the same
 * rule; the hand-made styles written as each format and read back (round-trip.test.ts) check it per format.
 */
import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    type ExtractedStyles,
    featuresOf,
    type StyleColumn,
    styleFingerprint,
    type StyleValue,
    writeStyleBlock,
} from "../../src/styles/internal.js";
import { takeFromBlock } from "../../src/styles/io/round-trip.js";

/**
 * Four nodes; the block colors node 0 red and node 1 a green the writer cannot hold, and leaves 2 and 3 uncolored.
 * @returns the graph and its block
 */
function graphAndBlock(): { snapshot: GraphSnapshot; text: string } {
    const b = new GraphBuilder({ directed: true });
    const name = b.declareNodeColumn({ name: "name", dtype: "string" });
    for (let i = 0; i < 4; i++) {
        b.addNode(`n${String(i)}`);
        b.setNodeValue(name, i, `n${String(i)}`);
    }
    const snapshot = b.freeze();
    const ex: ExtractedStyles = {
        styles: {
            version: 1,
            source: { format: "test", dialect: "graphty", tool: null },
            units: { length: "px" },
            graph: {},
            rules: [
                {
                    id: "red",
                    target: "node",
                    role: "defaults",
                    origin: "declared",
                    where: { eq: [{ data: "name" }, "n0"] },
                    set: { fill: "#ff0000" },
                },
                {
                    id: "green",
                    target: "node",
                    role: "defaults",
                    origin: "declared",
                    where: { eq: [{ data: "name" }, "n1"] },
                    set: { fill: "#00ff00" },
                },
            ],
            notes: [],
        },
        columns: { node: new Map(), edge: new Map() },
        features: { node: featuresOf(snapshot, "node"), edge: featuresOf(snapshot, "edge") },
        fingerprint: styleFingerprint(snapshot),
    };
    return { snapshot, text: writeStyleBlock(ex) };
}

/**
 * A writer that cannot write green (it reads back as none) and writes gray for no color.
 * @param want - the block's value
 * @returns what the reader reads back
 */
function writtenAndReadBack(want: StyleValue | null): StyleValue | null {
    if (want === "#00ff00") {
        return null;
    }
    return want ?? "#888888";
}

describe("takeFromBlock", () => {
    it("takes the block's value, or its none, wherever the value read is what the writer writes for it", () => {
        const { snapshot, text } = graphAndBlock();
        // n0 as written, n1 none (the writer could not hold green), n2 the gray the writer writes for none, n3 an
        // outside edit
        const values: Partial<Record<string, StyleColumn>> = { fill: ["#ff0000", null, "#888888", "#0000ff"] };
        takeFromBlock(snapshot, text, "test", (target) =>
            target === "node"
                ? {
                      values,
                      properties: ["fill"],
                      readBack: (_i, want) => (property) => writtenAndReadBack(want(property)),
                  }
                : null,
        );
        expect(values.fill).toEqual(["#ff0000", "#00ff00", null, "#0000ff"]);
    });

    it("changes nothing for a file without a block", () => {
        const { snapshot } = graphAndBlock();
        const values: Partial<Record<string, StyleColumn>> = { fill: ["#ff0000", null, "#888888", "#0000ff"] };
        takeFromBlock(snapshot, null, "test", () => ({
            values,
            properties: ["fill"],
            readBack: (_i, want) => (property) => writtenAndReadBack(want(property)),
        }));
        expect(values.fill).toEqual(["#ff0000", null, "#888888", "#0000ff"]);
    });
});
