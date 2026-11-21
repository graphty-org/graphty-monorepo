/**
 * @file A Cytoscape session draws with only the layers its visual style needs (issue #9297): the program's defaults,
 * the session's defaults and the values settling derives from them are one layer per kind, the per-element copies of
 * the file's values one more, and every element is painted as before.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { fileStylesOn } from "../helpers/file-styles-on";
import { loadedLayers } from "../helpers/loaded-layers";

fileStylesOn();

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");

describe("a Cytoscape session's layers", () => {
    it("cys/BasicDataVizDemo.cys: one defaults layer per kind, its label mapping, and the session's look", async () => {
        const data = new Uint8Array(readFileSync(join(CORPUS, "cys/BasicDataVizDemo.cys")));
        const session = createGraphSession();
        try {
            await session.data.import(
                { type: "cys", config: { data } },
                { styles: "file", styleOptions: { lengths: "spacing", framing: "file" } },
            );
            const layers = loadedLayers(session).map((layer) => `${layer.target ?? ""} ${layer.name}`);
            // The session's "default" style: node defaults and a label passthrough of COMMON, edge defaults. Beside
            // them: each node's draw order, the bends of the file's one pair of parallel edges and its end labels' face.
            assert.deepEqual(layers, [
                "node Defaults",
                "node By COMMON",
                "edge Defaults",
                "edge Values",
                "edge Drawing",
                "node Draw order",
            ]);

            const node = session.data.nodes().find((n) => n.COMMON === "SNF3");
            assert.isDefined(node);
            const look = session.styles.explain({ node: node.id }).merged as Record<string, unknown>;
            // The session's own values win over Cytoscape's lexicon defaults (red ellipses), as they did one layer apart.
            assert.strictEqual((look["node.color"] as { hex: string }).hex.toLowerCase(), "#66ccff");
            assert.strictEqual(look["node.shape"], "round-rectangle");
            assert.strictEqual(look["node.cornerFraction"], 0.125);
            assert.strictEqual(look["node.label"], "SNF3");
            // 75 x 35, the file's median node drawn at the element's node size
            assert.strictEqual(look["node.width"], 1);
            assert.closeTo(look["node.height"] as number, 35 / 75, 1e-9);

            const edge = session.data.edges()[0];
            const edgeLook = session.styles.explain({ edge: edge.id }).merged as Record<string, unknown>;
            assert.strictEqual((edgeLook["edge.color"] as { hex: string }).hex.toLowerCase(), "#848484");
            assert.closeTo(edgeLook["edge.width"] as number, 1.6, 1e-9);
        } finally {
            session.dispose();
        }
    });
});
