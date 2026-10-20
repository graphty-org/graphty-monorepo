/**
 * XGMML specimen fixes, round 2: what Cytoscape desktop 3.10.5's own SVG export draws for settings graph-io read
 * otherwise (the xgmml-specimen-* oracles in graph-io/test/fidelity/oracles/).
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/registry.js";
import { type ExtractedStyles, resolveStyles } from "../../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Imports XGMML text with styles.
 * @param text - the file
 * @returns the snapshot and its styles
 */
async function load(text: string): Promise<{
    snapshot: Awaited<ReturnType<typeof registry.importGraph>>["snapshot"];
    styles: ExtractedStyles;
}> {
    const r = await registry.importGraph(new TextEncoder().encode(text), { format: "xgmml", styles: true });
    return { snapshot: r.snapshot, styles: r.styles as ExtractedStyles };
}

const doc = (body: string): string =>
    `<?xml version="1.0"?>\n<graph label="g" directed="1" xmlns:cy="http://www.cytoscape.org" xmlns="http://www.cs.rpi.edu/XGMML">\n${body}</graph>\n`;

const att = (name: string, value: string): string => `<att name="${name}" value="${value}" type="string"/>`;

/** Two 30 x 30 nodes 100 apart. */
const NODES = `<node id="s" label="s"><graphics x="0" y="0" w="30" h="30"/></node>
<node id="t" label="t"><graphics x="100" y="0" w="30" h="30"/></node>`;

/**
 * Parallel edges from s to t, each with these visual properties.
 * @param n - how many
 * @param atts - the edges' `<att>` elements
 * @returns the file
 */
const parallel = (n: number, atts: string): string =>
    doc(
        NODES +
            Array.from(
                { length: n },
                (_, i) => `<edge id="e${i}" source="s" target="t"><graphics>${atts}</graphics></edge>`,
            ).join("\n"),
    );

describe("XGMML arrows", () => {
    it("draws ARROW as the filled delta Cytoscape desktop draws, not an open vee", async () => {
        const { snapshot, styles } = await load(
            doc(
                `${NODES}<edge source="s" target="t"><graphics>${att("EDGE_TARGET_ARROW_SHAPE", "ARROW")}${att("EDGE_SOURCE_ARROW_SHAPE", "ARROW")}</graphics></edge>`,
            ),
        );
        expect(resolveStyles(styles, "edge", "targetArrow", snapshot)).toEqual(["triangle"]);
        expect(resolveStyles(styles, "edge", "sourceArrow", snapshot)).toEqual(["triangle"]);
    });
});

describe("XGMML parallel edges", () => {
    it("draws HAYSTACK parallel edges straight, never fanned", async () => {
        const { snapshot, styles } = await load(
            parallel(3, att("EDGE_CURVED", "true") + att("EDGE_STACKING", "HAYSTACK")),
        );
        expect(resolveStyles(styles, "edge", "curved", snapshot).map((c) => c === true)).toEqual([false, false, false]);
        expect(resolveStyles(styles, "edge", "fanSpacing", snapshot).every((v) => v === null)).toBe(true);
    });

    it("still fans AUTO_BEND parallel edges under EDGE_CURVED false, as curves", async () => {
        const { snapshot, styles } = await load(
            parallel(3, att("EDGE_CURVED", "false") + att("EDGE_STACKING", "AUTO_BEND")),
        );
        // desktop draws the newest straight and bends the two before it
        expect(resolveStyles(styles, "edge", "curved", snapshot)).toEqual([true, true, false]);
        const spacing = resolveStyles(styles, "edge", "fanSpacing", snapshot);
        expect([typeof spacing[0], typeof spacing[1]]).toEqual(["number", "number"]);
    });
});

describe("XGMML label background boxes", () => {
    it("rounds a ROUND_RECTANGLE label box's corners an eighth of its one-line height, square a RECTANGLE's", async () => {
        const box = (shape: string, size: string): string =>
            att("NODE_LABEL_BACKGROUND_SHAPE", shape) + att("NODE_LABEL_FONT_SIZE", size);
        const { snapshot, styles } = await load(
            doc(`<node id="r" label="r"><graphics x="0" y="0">${box("ROUND_RECTANGLE", "10")}</graphics></node>
            <node id="s" label="s"><graphics x="50" y="0">${box("RECTANGLE", "10")}</graphics></node>`),
        );
        expect(resolveStyles(styles, "node", "labelCornerRadius", snapshot)).toEqual([1.455, null]);
        expect(resolveStyles(styles, "node", "labelBackground", snapshot)).toEqual(["#b6b6b6", "#b6b6b6"]);
    });

    it("draws a label's box round its words: no padding and lines one font tall", async () => {
        const { snapshot, styles } = await load(
            doc(
                `<node id="a" label="a"><graphics x="0" y="0">${att("NODE_LABEL_BACKGROUND_SHAPE", "RECTANGLE")}</graphics></node>`,
            ),
        );
        expect(resolveStyles(styles, "node", "labelPadding", snapshot)).toEqual([0]);
        expect(resolveStyles(styles, "node", "labelLineHeight", snapshot)).toEqual([1]);
    });
});
