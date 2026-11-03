/**
 * @file A vis.js file's curved edges rest in the same places however the frames split the work (#5299).
 *
 * The support points that bend vis-network's "dynamic" smooth edges are stepped a few times a frame.
 * They used to carry their position and speed from frame to frame while the nodes moved, so where
 * they came to rest depended on the history of node positions each frame happened to show them: the
 * minimum-work-per-frame test mode (`src/managers/minimumWork.ts`, one paint batch and one layout
 * round a frame) drew four vis.js fidelity samples' curves elsewhere than full speed did. Each sample
 * is loaded here twice, once at full speed and once in that mode, and every node and every support
 * point must be drawn at the same place bit for bit. The test sets the mode itself, so it gives the
 * same answer in the "browser" and the "minimum-work" projects.
 */
import { afterEach, assert, describe, it } from "vitest";

import { CORPUS_SAMPLES } from "../../../graph-io/test/fidelity/corpus-samples";
import { setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
import { mountSample, unmount } from "../fidelity/mount";

/** The samples whose curves rested elsewhere under the mode. */
const CURVED = ["json-vis-siblings", "json-vis-transparency", "json-vis-world", "json-vis-lesmiserables"];

/**
 * Loads a sample with the mode on or off and reads where every node and support point was drawn.
 * @param id - The sample.
 * @param minimum - Whether every frame does the least work it can.
 * @returns Each node's x and y, and each edge's support point (null without one), by id.
 */
async function drawn(id: string, minimum: boolean): Promise<{ nodes: object; points: object; curved: number }> {
    const sample = CORPUS_SAMPLES.find((s) => s.id === id);
    assert.isDefined(sample, id);
    setMinimumWorkPerFrame(minimum);
    const { element } = await mountSample(sample);
    const dm = element.graph.getDataManager();
    const nodes = Object.fromEntries(
        [...dm.nodes].map(([key, node]) => [String(key), [node.mesh.position.x, node.mesh.position.y]]),
    );
    const points = Object.fromEntries(
        [...dm.edges].map(([key, edge]) => {
            const p = dm.supportPoints.pointOf(edge);
            return [key, p === null ? null : [p.x, p.y]];
        }),
    );
    const curved = Object.values(points).filter((p) => p !== null).length;
    return { nodes, points, curved };
}

describe("curved edges' support points", () => {
    afterEach(() => {
        unmount();
        setMinimumWorkPerFrame(false);
    });

    for (const id of CURVED) {
        it(`rest at the same places at full speed and with the least work a frame: ${id}`, async () => {
            const full = await drawn(id, false);
            const minimum = await drawn(id, true);
            assert.isAbove(full.curved, 0, "the sample draws curves through support points");
            assert.deepStrictEqual(minimum.nodes, full.nodes, "the nodes are laid out at the same places");
            assert.deepStrictEqual(minimum.points, full.points, "the support points rest at the same places");
        });
    }
});
