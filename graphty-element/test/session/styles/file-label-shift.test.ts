/**
 * A file's label pinned by one of its points pins its words, not the margins the element draws round them: Pajek's
 * labels start at their point (`text-anchor: start`), so the shift that says so is a shift of the words' own box.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import { fileStylesOn } from "../../helpers/file-styles-on";

fileStylesOn();

const labelOf = (session: ReturnType<typeof createGraphSession>, node: string): Record<string, unknown> =>
    ((session.styles.explain({ node }).merged as Record<string, unknown>)["node.labelStyle"] ?? {}) as Record<
        string,
        unknown
    >;

describe("a file's label shifts", () => {
    it("shift the words of a Pajek label, said in an ordinary layer", async () => {
        const session = createGraphSession();
        const net = '*Vertices 2\n1 "alpha" 0.1 0.1 0.5\n2 "beta" 0.9 0.9 0.5\n*Edges\n1 2\n';
        await session.data.import({ type: "pajek", config: { data: net } }, { styles: "file" });
        const style = labelOf(session, "1");
        assert.strictEqual(style.shiftX, 0.5);
        assert.strictEqual(style.shiftOf, "words");
        const layers = session.styles.list();
        assert.isTrue(layers.some((layer) => JSON.stringify(layer).includes("node.labelShiftX")));
        // the words are said by a layer like any other, which a reader can see and change
        assert.isTrue(
            layers.some((layer) => layer.source.by === "user" && JSON.stringify(layer).includes("node.labelShiftOf")),
        );
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

    it("place a Cytoscape.js node label outside its node by its words, said in an ordinary layer", async () => {
        const session = createGraphSession();
        const doc = {
            elements: { nodes: [{ data: { id: "a", label: "a" } }], edges: [] },
            style: [{ selector: "node", style: { label: "data(label)", "text-valign": "top" } }],
        };
        await session.data.import({ type: "json", config: { data: JSON.stringify(doc) } }, { styles: "file" });
        assert.strictEqual(labelOf(session, "a").gapOf, "words");
        assert.isTrue(
            session.styles
                .list()
                .some((layer) => layer.source.by === "user" && JSON.stringify(layer).includes("node.labelGapOf")),
        );
    });

    it("leave a label no file shifts as the element places it", async () => {
        const session = createGraphSession();
        const doc = { nodes: [{ id: "a", x: 0, y: 0, label: "a" }], edges: [], options: { physics: false } };
        await session.data.import({ type: "json", config: { data: JSON.stringify(doc) } }, { styles: "file" });
        assert.isUndefined(labelOf(session, "a").shiftOf);
        assert.isUndefined(labelOf(session, "a").gapOf);
    });
});
