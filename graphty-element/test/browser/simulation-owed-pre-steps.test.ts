/**
 * @file A seeded GPU simulation layout whose data arrives after it was built pays its owed
 * pre-steps over the next frames, and ends in the same arrangement however many frames run while
 * the device computes them (issue #3533).
 *
 * The owed pre-steps are submitted in chunks and awaited, one at a time. A frame that stepped the
 * layout while a chunk was on the device submitted a batch of its own beside it (the simulation
 * takes two batches in flight), so a slow device -- one on which frames run while a chunk is
 * computed -- ran more iterations, and read `settled` at other batch boundaries, than a fast one:
 * the same data and seed drew a different picture.
 */
import "../../src/graphty-element";

import type { Scene } from "@babylonjs/core/scene";
import type { GraphSnapshot, NodeMask } from "@graphty/graph-format";
import type { ForceAtlas2Options, LayoutSimulation } from "@graphty/layout";
import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";
import { drawnFrames } from "../helpers/drawn-frames";

const NODES = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => ({ id }));
const EDGES = [
    { src: "a", dst: "b" },
    { src: "a", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "a" },
    { src: "d", dst: "e" },
    { src: "e", dst: "f" },
    { src: "f", dst: "g" },
    { src: "g", dst: "h" },
];

/** More than one 256-iteration chunk, so the payment awaits the device several times. */
const PRE_STEPS = 600;

/**
 * Iterations after which the device reports settled: inside the second pre-step chunk, so the
 * payment stops after the same chunk either way, and only the iterations frames added beside it
 * can change where the nodes end.
 */
const SETTLE_AFTER = 300;

/** Frames drawn while each pre-step chunk is on a slow device. */
const FRAMES_PER_CHUNK = 3;

const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * A device whose arithmetic counts iterations: a landed batch of `k` iterations moves node `i`
 * by `k * (i + 1)` along x, so where the nodes end says exactly how many iterations ran, whatever
 * the element does to centre and scale the arrangement. It settles once `SETTLE_AFTER` iterations
 * have landed. Two batches in flight at most, the oldest returned beyond that, as a GPU simulation
 * does.
 *
 * On a SLOW device a pre-step chunk (any batch other than the frame's `iterationsPerStep`) lands
 * only after `FRAMES_PER_CHUNK` drawn frames, so frames are certain to run while one is in flight;
 * a frame's own batch lands at once. On a fast one every batch lands at once.
 */
class CountingSimulation implements LayoutSimulation {
    readonly #inFlight: Promise<void>[] = [];
    #positions: Float32Array | null = null;
    #rows = 0;
    #done = 0;

    constructor(
        private readonly frameIterations: number | undefined,
        private readonly slow: (() => Scene) | null,
    ) {}

    get settled(): boolean {
        return this.#done >= SETTLE_AFTER;
    }

    load(snapshot: GraphSnapshot, positions: Float32Array): void {
        this.#positions = positions;
        this.#rows = snapshot.nodeCount;
    }

    step(iterations = this.frameIterations ?? 1): Promise<void> {
        const oldest = this.#inFlight[0];
        if (oldest !== undefined && this.#inFlight.length >= 2) {
            return oldest;
        }

        const batch = this.#land(iterations).finally(() => {
            void this.#inFlight.splice(this.#inFlight.indexOf(batch), 1);
        });
        this.#inFlight.push(batch);
        return batch;
    }

    async #land(iterations: number): Promise<void> {
        if (this.slow !== null && iterations !== this.frameIterations) {
            await drawnFrames(this.slow(), FRAMES_PER_CHUNK);
        } else {
            await Promise.resolve();
        }

        const positions = this.#positions;
        if (positions !== null) {
            for (let i = 0; i < this.#rows; i++) {
                positions[3 * i] += iterations * (i + 1);
            }
        }

        this.#done += iterations;
    }

    setFixed(_mask: NodeMask): void {
        // Nothing in this test pins a node.
    }

    setPosition(index: number, x: number, y: number, z: number): void {
        this.#positions?.set([x, y, z], 3 * index);
    }

    dispose(): void {
        this.#positions = null;
    }
}

/**
 * Where each node came to rest, to four decimals.
 * @param element - The settled element.
 * @returns Node id to coordinates.
 */
function positions(element: Graphty): Record<string, number[]> {
    const engine = element.graph.getLayoutManager().layoutEngine;
    assert.isDefined(engine);
    const out: Record<string, number[]> = {};
    for (const node of element.graph.getDataManager().nodes.values()) {
        const { x, y, z } = engine.getNodePosition(node);
        out[String(node.id)] = [x, y, z ?? 0].map((v) => Number(v.toFixed(4)));
    }

    return out;
}

/**
 * Mount a seeded ForceAtlas2 layout on a fake device with no data, then load the data, so the
 * pre-steps are owed and paid by the frames, and wait for it to settle.
 * @param slow - Whether each pre-step chunk takes several drawn frames to land.
 * @returns Where it settled.
 */
async function settle(slow: boolean): Promise<Record<string, number[]>> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.layoutBehavior = { layout: { preSteps: PRE_STEPS } };
    element.layoutConfig = { seed: 42 };
    element.layout = "forceatlas2";
    document.body.appendChild(element);
    mounted.push(element);

    const fake = createFakeAccelerator({
        members: {
            forceAtlas2: (options?: ForceAtlas2Options) =>
                new CountingSimulation(options?.iterationsPerStep, slow ? () => element.graph.getScene() : null),
        },
    });
    element.session.setAccelerator(fake);
    await element.waitForStableFrame();

    element.nodeData = NODES;
    element.edgeData = EDGES;
    await element.waitForStableFrame();

    const engine = element.graph.getLayoutManager().layoutEngine;
    assert.instanceOf(engine, SimulationLayoutEngine);
    assert.isTrue(engine.isAccelerated, "the layout ran on the fake device");
    assert.isTrue(engine.isSettled);
    return positions(element);
}

describe("a seeded GPU simulation layout paying owed pre-steps", () => {
    test("ends in the same arrangement whether frames run while its chunks are computed or not", async () => {
        const fast = await settle(false);
        assert.deepEqual(await settle(true), fast, "frames ran while each pre-step chunk was on the device");
    });
});
