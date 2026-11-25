/**
 * In the 3D view, a node a file draws later (a higher z-order) is the one a click on it selects, as in 2D. The NDEx
 * CX2 "Toll-like receptor pathway" sample draws each gene over a nearly transparent pathway box; a real click at a
 * gene's center selected the box instead, because both are flat and the bigger box is the thicker slab, so its
 * front face was nearer the camera.
 */
import { afterEach, assert, it } from "vitest";

import SAMPLES from "../../../graph-io/test/corpus/programs/samples.json";
import { mountSample, unmount } from "../fidelity/mount";
import { drawnFrames } from "../helpers/drawn-frames";
import { click } from "../helpers/real-input";

afterEach(() => {
    unmount();
});

it("a click on a gene drawn over a pathway box selects the gene in 3D", async () => {
    const sample = SAMPLES.find((s) => s.id === "ndex-cx2");
    assert.exists(sample);
    const { element } = await mountSample(
        { id: sample.id, format: sample.format, file: sample.file, license: sample.license, routes: [] },
        undefined,
        undefined,
        undefined,
        "placed",
        "3d",
    );
    await element.waitForSettled();
    await element.session.styles.settled();
    await element.waitForStableFrame();

    // PIK3CD, IFNA10 and IRAK4, each inside a pathway box the file draws first
    for (const id of ["137025", "137116", "137026"]) {
        const at = element.nodeScreenPosition(id);
        assert.exists(at, id);
        assert.deepEqual(element.elementAt(at), { kind: "node", id }, `elementAt ${id}`);
        await click(element, at);
        await drawnFrames(element.graph.getScene(), 2);
        assert.deepEqual([...element.session.selection.nodes].map(String), [id], `a click at ${id}`);
    }
});
