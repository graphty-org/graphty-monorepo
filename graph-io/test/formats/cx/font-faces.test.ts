/**
 * What Cytoscape desktop 3.10.5 draws for the CX settings its specimen sheets showed graph-io read otherwise.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles } from "../../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Imports a CX document of nodes with a `font` column and a view style, with its styles.
 * @param nodes - each node's name and `font` value
 * @param style - the `nodes:default` entry of `cyVisualProperties`
 * @returns a getter of what graphty draws for a node property of every node
 */
async function load(nodes: readonly [string, string][], style: Record<string, unknown>) {
    const doc = JSON.stringify([
        { nodes: nodes.map(([n], i) => ({ "@id": i + 1, n })) },
        { nodeAttributes: nodes.map(([, v], i) => ({ po: i + 1, n: "font", v })) },
        { cyVisualProperties: [{ properties_of: "nodes:default", ...style }] },
        { status: [{ error: "", success: true }] },
    ]);
    const { snapshot, styles } = await registry.importGraph(new TextEncoder().encode(doc), {
        format: "cx",
        styles: true,
    });
    return (property: string): readonly unknown[] =>
        resolveStyles(styles as ExtractedStyles, "node", property as never, snapshot);
}

describe("Cytoscape font faces", () => {
    it("takes the face from the name only, not from the style word after it", async () => {
        // cx-specimen-mappings-bypass-p19 passthrough-font-face: a passthrough of `Serif,bold,12` is drawn in Times,
        // font-weight normal; a `.bold` name suffix is still drawn bold
        const get = await load(
            [
                ["a", "Serif,bold,12"],
                ["b", "SansSerif.bold,bold,10"],
                ["c", "Serif,italic,12"],
            ],
            {
                properties: {},
                mappings: { NODE_LABEL_FONT_FACE: { type: "PASSTHROUGH", definition: "COL=font,T=string" } },
            },
        );
        expect(get("labelWeight")).toEqual(["normal", "bold", "normal"]);
        expect(get("labelItalic")).toEqual([false, false, false]);
        expect(String(get("labelFont")[0])).toMatch(/^DejaVu Serif/);
    });
});
