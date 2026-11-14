/**
 * @file A file's defaults stay drawn when the project holds the base look in its Everything row
 * (`editableBase`, issue #7495). The file's defaults layers are ordinary layers of kind `base`;
 * only the element's own base layers give way to Everything.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");

describe("a file's defaults under editableBase", () => {
    it("cys/BasicDataVizDemo.cys: draws the file's node shape and color and its edge ends", async () => {
        const data = new Uint8Array(readFileSync(join(CORPUS, "cys/BasicDataVizDemo.cys")));
        const session = createGraphSession();
        try {
            await session.config.set({ startingRows: true, editableBase: true });
            await session.data.import({ type: "cys", config: { data } }, { styles: "file" });
            const node = session.data.nodes()[0];
            const edge = session.data.edges()[0];
            const nodeLook = session.styles.explain({ node: node.id }).merged as Record<string, unknown>;
            const edgeLook = session.styles.explain({ edge: edge.id }).merged as Record<string, unknown>;

            assert.strictEqual(nodeLook["node.shape"], "round-rectangle");
            assert.strictEqual((nodeLook["node.color"] as { hex: string }).hex.toLowerCase(), "#66ccff");
            assert.strictEqual(edgeLook["edge.arrowHead"], "none");
            assert.strictEqual(edgeLook["edge.arrowTail"], "none");
        } finally {
            session.dispose();
        }
    });
});
