/**
 * The envelope a simulation layout is published in.
 *
 * Every other layout in this element lands in roughly a plus-or-minus-100 box, and every visual
 * size the element draws -- node size, edge width, label size, arrow size -- is an absolute scene
 * unit tuned for that box. The simulations are the only layouts that never rescale what they
 * compute, and a ForceAtlas2 equilibrium grows with the graph, so the bridge fits their output to
 * the element's envelope on the way out. This file pins the rule that does the fitting, which is a
 * pure function of an array of coordinates: no device, no renderer and no running simulation.
 *
 * The other direction -- a scene-unit position written INTO the simulation, which is what a drag,
 * a pin and a seed are -- is pinned over a real graph in
 * `test/browser/simulation-layout-engine.test.ts`, against the simulation's own array: a published
 * position cannot pin it, because this rule normalises any consistent pair of unit systems to the
 * same picture.
 */
import { assert, describe, it } from "vitest";

import { measureEnvelope } from "../../src/layout/SimulationLayoutEngine";

/**
 * The furthest any row of an arrangement ends up from the arrangement's centre, once the measured
 * envelope has been applied to it.
 * @param positions - The simulation-unit coordinates, stride 3.
 * @param scalingFactor - The scene-unit radius they are to be published at.
 * @returns The published radius.
 */
function publishedRadius(positions: readonly number[], scalingFactor: number): number {
    const nodeCount = positions.length / 3;
    const { scale, centre } = measureEnvelope(positions, nodeCount, scalingFactor);

    let furthest = 0;
    for (let row = 0; row < nodeCount; row += 1) {
        const x = (positions[3 * row] - centre[0]) * scale;
        const y = (positions[3 * row + 1] - centre[1]) * scale;
        const z = (positions[3 * row + 2] - centre[2]) * scale;
        furthest = Math.max(furthest, Math.hypot(x, y, z));
    }

    return furthest;
}

describe("the envelope a simulation's arrangement is published in", () => {
    it("fits an arrangement two orders of magnitude too large to the configured radius", () => {
        // The measured ForceAtlas2 case: a settled graph about 23,000 scene units across, where
        // every node is one scene unit and therefore a thirtieth of a pixel.
        const positions = [-9693, -9693, 0, 6060, 6060, 0, 100, -200, 50, 0, 0, 0];

        assert.closeTo(publishedRadius(positions, 100), 100, 1e-9, "the widest row sits at the radius");
        assert.closeTo(publishedRadius(positions, 250), 250, 1e-9, "whatever the reader configured");
    });

    it("fits an arrangement far too small to the same radius", () => {
        // The other direction, which is the same defect: an arrangement inside a unit ball would
        // draw every node on top of every other.
        assert.closeTo(publishedRadius([-0.5, 0, 0, 0.5, 0, 0, 0, 0.25, 0], 100), 100, 1e-9);
    });

    it("publishes about the arrangement's own centre, not the origin", () => {
        const { centre } = measureEnvelope([10, 20, 30, 30, 40, 50], 2, 100);

        assert.deepEqual([centre[0], centre[1], centre[2]], [20, 30, 40]);
    });

    it("leaves a single node and an all-coincident arrangement alone rather than dividing by nothing", () => {
        // Both measure a radius of zero. A scale derived from one would be infinite, and every
        // coordinate the bridge then published would be unstorable.
        assert.strictEqual(measureEnvelope([7, 8, 9], 1, 100).scale, 1, "one node is its own centre");
        assert.strictEqual(measureEnvelope([2, 2, 2, 2, 2, 2, 2, 2, 2], 3, 100).scale, 1, "and so is a pile of them");

        // A seed that has taken one step away from a single point measures a radius near enough to
        // zero to overflow the float the position array stores.
        assert.strictEqual(measureEnvelope([0, 0, 0, 1e-9, 0, 0], 2, 100).scale, 1);
    });

    it("measures the rows a layout has placed and ignores the ones it has not", () => {
        // NaN is the element's "not laid out yet", and it reaches the simulation's array through
        // every row a freeze has just added. Counted, it would poison the centre and the radius
        // for the whole graph.
        const withGaps = [Number.NaN, Number.NaN, Number.NaN, 10, 20, 30, 30, 40, 50];
        const { scale, centre } = measureEnvelope(withGaps, 3, 100);

        assert.deepEqual([centre[0], centre[1], centre[2]], [20, 30, 40]);
        assert.closeTo(scale, 100 / Math.hypot(10, 10, 10), 1e-12);
    });

    it("answers the identity for a graph with no placed row at all", () => {
        const { scale, centre } = measureEnvelope([Number.NaN, Number.NaN, Number.NaN], 1, 100);

        assert.strictEqual(scale, 1);
        assert.deepEqual([centre[0], centre[1], centre[2]], [0, 0, 0]);
    });

    it("measures only the rows the publish will write, so a held row cannot resize the rest", () => {
        // A drag writes the pointer's scene position back into the simulation, so a node dragged
        // outside the envelope really is out there in the simulation's units too -- while its
        // scene coordinate stays under the pointer, because a held row is not published over.
        // Measuring it would fit all the other rows inside a radius taken from a row that is not
        // drawn there, and the graph would shrink under a pointer that had not moved.
        const arrangement = [-1, 0, 0, 1, 0, 0, 0, 1, 0, 400, 0, 0];
        const dragged = (row: number): boolean => row === 3;

        const free = measureEnvelope(arrangement, 4, 100, dragged);

        assert.strictEqual(free.placed, 3, "the held row was not measured");
        assert.deepEqual([free.centre[0], free.centre[1], free.centre[2]], [0, 1 / 3, 0]);
        assert.closeTo(free.scale, 100 / Math.hypot(1, 1 / 3), 1e-12, "fitted to the three rows it will write");

        const everything = measureEnvelope(arrangement, 4, 100);

        assert.strictEqual(everything.placed, 4);
        assert.isBelow(everything.scale, free.scale / 100, "and measuring it would have shrunk them by 100x");
    });

    it("reports how many rows it measured, so a caller can tell a measurement from the identity", () => {
        // The identity is what a graph with nothing to fit answers, and it is indistinguishable
        // from a real measurement of a unit-radius arrangement centred on the origin. The bridge
        // keeps its previous map rather than adopting this one, and the count is how it knows.
        assert.strictEqual(measureEnvelope([1, 2, 3], 1, 100, () => true).placed, 0);
        assert.strictEqual(measureEnvelope([1, 2, 3], 1, 100, () => true).scale, 1);
        assert.strictEqual(measureEnvelope([1, 2, 3, 4, 5, 6], 2, 100).placed, 2);
    });

    it("measures nothing beyond the node count it was given", () => {
        // The bridge's array is sized to the snapshot it was built over, and a freeze that drops
        // nodes leaves the tail behind rather than reallocating.
        const stale = [1, 0, 0, -1, 0, 0, 10_000, 0, 0];

        assert.closeTo(measureEnvelope(stale, 2, 100).scale, 100, 1e-12);
    });
});
