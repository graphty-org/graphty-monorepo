import { type F32, GraphBuilder, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";

/** A snapshot of `count` isolated nodes: the fake needs a node count and nothing else. */
function graphOf(count: number): GraphSnapshot {
    const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
    for (let i = 0; i < count; i += 1) {
        builder.addNode(String(i));
    }

    return builder.freeze({ label: "fake-accelerator-test" });
}

/** The element's position array before any layout has placed a row: NaN, never the origin. */
function unplaced(count: number): F32 {
    const positions = new Float32Array(3 * count);
    positions.fill(Number.NaN);
    return positions;
}

/** The code a thrown or rejected value carries, or undefined when it is not one of ours. */
function codeOf(error: unknown): string | undefined {
    return isGraphtyError(error) ? error.code : undefined;
}

describe("the fake accelerator's simulation", () => {
    it("computes: layout lays the graph out instead of translating it", async () => {
        // The default batch moves every row the same distance in the same direction, which is
        // the one thing a camera that frames the graph cannot show. Under `computes: "layout"`
        // the batch runs the layout's own simulation, so connected rows end up near one another
        // and the shape of the answer is the layout's rather than the shape it started in.
        const builder = new GraphBuilder({ directed: false, addMissingNodes: true });
        for (let i = 0; i < 12; i += 1) {
            builder.addEdge(String(i), String((i + 1) % 12));
        }

        const ring = builder.freeze({ label: "fake-accelerator-layout-test" });
        const fake = createFakeAccelerator({ computes: "layout" });
        const simulation = fake.fruchtermanReingold({ dim: 2, seed: 7, iterations: 200 });
        const positions = unplaced(12);

        simulation.load(ring, positions);
        await simulation.step(200);

        assert.isTrue(simulation.settled, "the layout ran to its own iteration budget");
        assert.strictEqual(fake.calls.resolved, 1, "the batch landed on the accelerator");

        // A ring drawn by a force layout is a ring: every neighbour is nearer than the average
        // pair, which a translated seed scatter has no reason to be.
        const at = (i: number): [number, number] => [positions[3 * i], positions[3 * i + 1]];
        const gap = (i: number, j: number): number => Math.hypot(at(i)[0] - at(j)[0], at(i)[1] - at(j)[1]);
        let neighbours = 0;
        let pairs = 0;
        let pairCount = 0;
        for (let i = 0; i < 12; i += 1) {
            neighbours += gap(i, (i + 1) % 12);
            for (let j = i + 1; j < 12; j += 1) {
                pairs += gap(i, j);
                pairCount += 1;
            }
        }

        assert.isBelow(
            neighbours / 12,
            (pairs / pairCount) * 0.75,
            "a ring laid out by the layout draws its neighbours closer than its average pair",
        );
    });

    it("step moves unmasked rows by moveBy * k and leaves fixed rows", async () => {
        const fake = createFakeAccelerator({ moveBy: 2 });
        const simulation = fake.forceAtlas2();
        const positions = unplaced(3);
        simulation.load(graphOf(3), positions);

        const mask = makeMask(3);
        maskSet(mask, 1, true);
        simulation.setFixed(mask);

        await simulation.step(4);

        assert.strictEqual(positions[0], 8, "row 0 moved by moveBy * k");
        assert.strictEqual(positions[3], 0, "the fixed row stayed where load seeded it");
        assert.strictEqual(positions[6], 8, "row 2 moved by moveBy * k");
        assert.strictEqual(positions[1], 0, "y is untouched");
        assert.strictEqual(positions[2], 0, "z is untouched");
    });

    it("a saturated step returns the oldest pending promise", async () => {
        const fake = createFakeAccelerator({ maxInFlight: 2 });
        const simulation = fake.forceAtlas2();
        simulation.load(graphOf(2), unplaced(2));

        const first = simulation.step();
        const second = simulation.step();
        const coalesced = simulation.step();

        assert.notStrictEqual(second, first, "the second call fits under maxInFlight and submits");
        assert.strictEqual(coalesced, first, "the third call lands on the oldest batch in flight");
        assert.strictEqual(fake.pending, 2);

        await fake.flush();
        assert.strictEqual(fake.pending, 0);
    });

    it("setPosition wins over the next resolution", async () => {
        const fake = createFakeAccelerator({ moveBy: 1 });
        const simulation = fake.forceAtlas2();
        const positions = unplaced(2);
        simulation.load(graphOf(2), positions);

        const batch = simulation.step();
        simulation.setPosition(0, 7, 8, 9);
        await batch;

        assert.strictEqual(positions[0], 7, "the batch in flight did not slide the dragged node");
        assert.strictEqual(positions[1], 8);
        assert.strictEqual(positions[2], 9);
        assert.strictEqual(positions[3], 1, "every other row moved");

        await simulation.step();
        assert.strictEqual(positions[0], 8, "the override lapsed after one resolution");
    });

    it("settled after settleAfter and false again after reheat", async () => {
        const fake = createFakeAccelerator({ settleAfter: 2 });
        const simulation = fake.forceAtlas2();
        simulation.load(graphOf(2), unplaced(2));

        assert.isFalse(simulation.settled);
        await simulation.step();
        assert.isFalse(simulation.settled);
        await simulation.step();
        assert.isTrue(simulation.settled);

        simulation.reheat();
        assert.isFalse(simulation.settled);
        assert.strictEqual(simulation.iterationsDone, 0);
        assert.strictEqual(fake.calls.reheat, 1);
    });

    it("fail(E_DEVICE_LOST) rejects the next step with the code", async () => {
        const fake = createFakeAccelerator();
        const simulation = fake.forceAtlas2();
        simulation.load(graphOf(2), unplaced(2));

        fake.fail("E_DEVICE_LOST");

        let caught: unknown;
        try {
            await simulation.step();
        } catch (error: unknown) {
            caught = error;
        }

        assert.strictEqual(codeOf(caught), "E_DEVICE_LOST");
        assert.strictEqual(fake.calls.resolved, 0, "a rejected batch never lands");

        await simulation.step();
        assert.strictEqual(fake.calls.resolved, 1, "only the NEXT batch was told to fail");
    });

    it("dispose makes step throw E_DISPOSED", () => {
        const fake = createFakeAccelerator();
        const simulation = fake.forceAtlas2();
        simulation.load(graphOf(2), unplaced(2));
        simulation.dispose();

        let caught: unknown;
        try {
            void simulation.step();
        } catch (error: unknown) {
            caught = error;
        }

        assert.strictEqual(codeOf(caught), "E_DISPOSED");
        assert.isTrue(simulation.disposed);
    });
});

describe("the fake accelerator's counters", () => {
    it("step counts submissions not calls, resolved counts landed batches, pending is in-flight, release lists snapshots in order, dispose is counted", async () => {
        const fake = createFakeAccelerator({ maxInFlight: 1 });
        const simulation = fake.forceAtlas2();
        simulation.load(graphOf(2), unplaced(2));

        void simulation.step();
        void simulation.step();
        void simulation.step();

        assert.strictEqual(fake.calls.step, 1, "two of the three calls coalesced");
        assert.strictEqual(fake.pending, 1);

        await fake.flush();

        assert.strictEqual(fake.calls.resolved, 1);
        assert.strictEqual(fake.pending, 0);
        assert.strictEqual(fake.calls.load, 1);
        assert.strictEqual(fake.calls.forceAtlas2, 1);
        assert.deepStrictEqual(fake.simulations, [simulation]);

        const first = graphOf(1);
        const second = graphOf(2);
        fake.release(first);
        fake.release(second);
        assert.deepStrictEqual(fake.calls.release, [first, second]);

        fake.dispose();
        assert.strictEqual(fake.calls.dispose, 1);
    });
});
