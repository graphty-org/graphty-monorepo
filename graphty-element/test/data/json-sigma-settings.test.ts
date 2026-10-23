/**
 * A graphology document drawn under the sigma.js settings given as `sigmaSettings`: sigma draws edge labels only with
 * `renderEdgeLabels` on, a setting of the application's that no file carries.
 */
import { assert, test } from "vitest";

import { createGraphSession } from "../../src/session";

const doc = JSON.stringify({
    options: { type: "directed" },
    nodes: [
        { key: "a", attributes: { label: "a", x: 0, y: 0 } },
        { key: "b", attributes: { label: "b", x: 10, y: 0 } },
    ],
    edges: [{ key: "e", source: "a", target: "b", attributes: { label: "Text" } }],
});

/**
 * The edge's file style.
 * @param config - the JSON reader's settings beyond the document
 * @returns the merged style, as JSON text
 */
async function edgeStyle(config: Record<string, unknown>): Promise<string> {
    const session = createGraphSession();
    await session.data.import({ type: "json", config: { data: doc, ...config } }, { styles: "file" });
    await session.styles.settled();
    const [edge] = session.data.edges();
    return JSON.stringify(session.styles.explain({ edge: edge.id }).merged);
}

test("draws a graphology edge's label only under sigmaSettings' renderEdgeLabels", async () => {
    assert.notInclude(await edgeStyle({}), '"Text"');
    assert.include(await edgeStyle({ sigmaSettings: { renderEdgeLabels: true } }), '"Text"');
});
