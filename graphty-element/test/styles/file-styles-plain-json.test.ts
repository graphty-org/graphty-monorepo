/**
 * @file A file that carries no style information adds no style layers when its styles are drawn, while the rest of
 * what the load reads from it (the scale of its lengths) still applies, and a file that carries styles still adds its
 * own (issue #9298).
 */
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

const NODES = [
    { id: "a", label: "A", kind: "account", city: "Chicago", latitude: 41.8781, longitude: -87.6298, case: "" },
    { id: "b", label: "B", kind: "device", city: "Chicago", latitude: 41.8781, longitude: -87.6298, case: "" },
    { id: "c", label: "C", kind: "address", city: "Boston", latitude: 42.36, longitude: -71.06, case: "ring" },
];

/** A NetworkX node-link document: graph data, no style keys. */
const PLAIN = JSON.stringify({
    directed: true,
    multigraph: true,
    graph: { note: "synthetic", seed: 2026 },
    nodes: NODES,
    links: [
        { source: "a", target: "b", amount: 12.5, kind: "uses" },
        { source: "b", target: "c", amount: 3, kind: "lives" },
    ],
});

/** A Cytoscape.js document whose stylesheet colors every node. */
const STYLED = JSON.stringify({
    elements: {
        nodes: NODES.map((data) => ({ data })),
        edges: [{ data: { id: "ab", source: "a", target: "b" } }],
    },
    style: [{ selector: "node", style: { "background-color": "#ff0000" } }],
});

/**
 * Import a JSON document with its styles drawn.
 * @param data - The document.
 * @returns The layers before and after, the layers the load reports and the scale of its lengths.
 */
async function load(
    data: string,
): Promise<{ before: string[]; after: string[]; reported: readonly string[]; lengthScale: number | undefined }> {
    const session = createGraphSession();
    try {
        const before = session.styles.list().map((l) => l.id);
        await session.data.import({ type: "json", config: { data } }, { styles: "file" });
        const after = session.styles.list().map((l) => l.id);
        const styles = session.data.lastImport()?.styles;
        return { before, after, reported: styles?.layers ?? [], lengthScale: styles?.lengthScale };
    } finally {
        session.dispose();
    }
}

describe("file styles from a JSON file", () => {
    it("adds no layers for a file with no style information", async () => {
        const { before, after, reported, lengthScale } = await load(PLAIN);
        assert.deepStrictEqual(after, before);
        assert.deepStrictEqual([...reported], []);
        // the rest of what the load read still applies: the scale the file's lengths and stored positions take
        assert.isNumber(lengthScale);
    });

    it("still adds the layers of a file that carries styles", async () => {
        const { before, after, reported } = await load(STYLED);
        assert.isAbove(reported.length, 0);
        assert.isAbove(after.length, before.length);
        for (const id of reported) {
            assert.include(after, id);
        }
    });
});
