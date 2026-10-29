/**
 * @file A file's arrowheads, loaded with `styles: "file"`, are drawn where nothing buries them
 * (issue #2324).
 *
 * Graphviz, yEd and Cytoscape.js files ask for an arrowhead at the target of their directed edges.
 * The arrow type always reached the edge; what hid it was the node it points at: a file's node
 * border used to be drawn as a node outline, a glow of one fixed pixel width that covers the node
 * and a cap's length of the edge beside it. These files are checked for both halves: a named edge
 * resolves the arrow the file gives it, and no node an arrowhead points at is outlined.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession, type ExplainTarget, type GraphSession } from "../../session";

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");

/** Each file, its reader, and edges named by their ends with the arrowhead the file draws on them. */
const FILES = [
    {
        type: "dot",
        path: "dot/graphviz-gallery-neato-colors.gv",
        // `edge [arrowhead=open]`: Graphviz's "open" is its vee.
        arrows: { "green->white": "vee", "red->deeppink": "vee" },
    },
    {
        type: "graphml",
        path: "graphml/yed-shapenode/voc__voctomix__schema.graphml",
        // `y:Arrows target="standard"`: yEd's standard arrow, a triangle with its back pressed in.
        arrows: { "n2::n21->n3::n0": "vee", "n2::n17->n0::n2": "vee" },
    },
    {
        type: "json",
        path: "json/iVis-at-Bilkent_cytoscape.js-cosep__glycolysis.json",
        // `.catalysis` edges end in a hollow circle, `.production` edges in a triangle.
        arrows: {
            "glyph9->nwtN_f72662af-67d4-4ca2-8504-4ca032ddd111": "open-dot",
            "nwtN_f72662af-67d4-4ca2-8504-4ca032ddd111->glyph1": "normal",
        },
    },
] as const;

/**
 * What the styles resolve one channel of an element to.
 * @param session - The session.
 * @param element - The node or edge.
 * @param channel - The channel.
 * @returns The value, or undefined when nothing paints it.
 */
function resolved(session: GraphSession, element: ExplainTarget, channel: string): unknown {
    return (session.styles.explain(element).merged as Record<string, unknown>)[channel];
}

describe("a file's arrowheads", () => {
    it.each(FILES)("$path: resolves each named edge's arrow, and outlines no node an arrow points at", async (file) => {
        const data = new Uint8Array(readFileSync(join(CORPUS, file.path)));
        const session = createGraphSession();
        try {
            await session.data.import({ type: file.type, config: { data } }, { styles: "file" });
            const edges = session.data.edges();
            const byEnds = new Map(edges.map((edge) => [`${String(edge.source)}->${String(edge.target)}`, edge]));

            for (const [ends, arrow] of Object.entries(file.arrows)) {
                const edge = byEnds.get(ends);
                if (edge === undefined) {
                    assert.fail(`no edge ${ends}`);
                }

                assert.strictEqual(resolved(session, { edge: edge.id }, "edge.arrowHead"), arrow, ends);
            }

            // Every node an arrowhead or an arrow tail sits against.
            const drawn = (value: unknown): boolean => value !== undefined && value !== "none";
            const pointedAt = new Set(
                edges.flatMap((edge) => [
                    ...(drawn(resolved(session, { edge: edge.id }, "edge.arrowHead")) ? [edge.target] : []),
                    ...(drawn(resolved(session, { edge: edge.id }, "edge.arrowTail")) ? [edge.source] : []),
                ]),
            );
            assert.isAbove(pointedAt.size, 0, "the file draws arrowheads");
            const outlined = [...pointedAt].filter((node) => resolved(session, { node }, "node.outline") !== undefined);
            assert.deepEqual(outlined, [], "nodes whose outline buries the arrows beside them");
        } finally {
            session.dispose();
        }
    });
});
