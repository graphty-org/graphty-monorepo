/**
 * A file's label pinned by one of its points pins its words, not the margins the element draws round them: Pajek's
 * labels start at their point (`text-anchor: start`), so the shift that says so is a shift of the words' own box.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";

const labelOf = (session: ReturnType<typeof createGraphSession>, node: string): Record<string, unknown> =>
    ((session.styles.explain({ node }).merged as Record<string, unknown>)["node.labelStyle"] ?? {}) as Record<
        string,
        unknown
    >;

describe("a file's label shifts", () => {
    it("shift the words of a Pajek label, and add no layer to do it", async () => {
        const session = createGraphSession();
        const net = '*Vertices 2\n1 "alpha" 0.1 0.1 0.5\n2 "beta" 0.9 0.9 0.5\n*Edges\n1 2\n';
        await session.data.import({ type: "pajek", config: { data: net } }, { styles: "file" });
        const style = labelOf(session, "1");
        assert.strictEqual(style.shiftX, 0.5);
        assert.strictEqual(style.shiftOf, "words");
        const layers = session.styles.list();
        const withShift = layers.filter((layer) => JSON.stringify(layer).includes("node.labelShiftX"));
        assert.isAbove(withShift.length, 0);
        // the words are said in the same layers that shift, never one of their own
        for (const layer of layers) {
            const text = JSON.stringify(layer);
            assert.strictEqual(text.includes("node.labelShiftOf"), text.includes("node.labelShiftX"));
        }
    });

    it("shift a Graphviz xlabel's whole box, which Graphviz pins by its corner, padding and all", async () => {
        const session = createGraphSession();
        const dot = 'graph { layout=neato; a -- b [label="ab"] }';
        await session.data.import({ type: "dot", config: { data: dot } }, { styles: "file" });
        const [ab] = session.data.edges();
        const edge = session.styles.explain({ edge: ab.id }).merged as Record<string, unknown>;
        const style = (edge["edge.labelStyle"] ?? {}) as Record<string, unknown>;
        assert.strictEqual(style.shiftX, -0.5);
        assert.isUndefined(style.shiftOf);
    });

    it("leave a label no file shifts as the element places it", async () => {
        const session = createGraphSession();
        const doc = { nodes: [{ id: "a", x: 0, y: 0, label: "a" }], edges: [], options: { physics: false } };
        await session.data.import({ type: "json", config: { data: JSON.stringify(doc) } }, { styles: "file" });
        assert.isUndefined(labelOf(session, "a").shiftOf);
    });
});
