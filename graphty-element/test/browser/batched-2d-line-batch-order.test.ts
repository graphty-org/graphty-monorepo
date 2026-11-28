/**
 * @file A 2D scene draws coplanar meshes in the order they were made. On the `"objects"` path an edge makes its line
 * batch (shared by every line of that look) and its cap batch as it is built, so a line batch made by the first edges
 * draws under the heads made after it. Under `renderPath: "batched"` those first edges are row lines, which make no
 * line batch: the yEd synthetic-edges sample's routed edges, which are `Edge`s, made it only after every pulled head,
 * and their lines drew over the heads they cross at the node ends. A row line now makes its look's line batch where an
 * `Edge` would, and the picture is the objects path's.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { CORPUS_SAMPLES } from "../../../graph-io/test/fidelity/corpus-samples";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { mountSample, unmount } from "../fidelity/mount";
import { type CanvasFrame, pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    renderPathDefault.value = "objects";
    unmount();
});

/**
 * Draw the sample on one render path.
 * @param path - The render path.
 * @returns Its whole canvas.
 */
async function drawn(path: "objects" | "batched"): Promise<CanvasFrame> {
    renderPathDefault.value = path;
    const sample = CORPUS_SAMPLES.find((candidate) => candidate.id === "graphml-synthetic-edges");
    assert.isDefined(sample);
    const { element } = await mountSample(sample);
    assert.equal(element.graph.renderPath, path);
    return readCanvas(element.graph);
}

describe("a 2D graph of row lines and routed edges", () => {
    it("draws the routed lines under the heads, as the objects path does", async () => {
        const want = await drawn("objects");
        const have = await drawn("batched");
        assert.equal(pixelsOverBar(want, have), 0);
    });
});
