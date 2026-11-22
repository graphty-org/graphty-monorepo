/**
 * @file Under renderPath "batched", a still frame -- nothing moves, nothing changes -- allocates
 * nothing per row: a scene ten times the size allocates no more per frame.
 *
 * A per-row object made every frame is garbage the collector has to sweep every frame, and at
 * 100,000 rows that was measured as milliseconds of collection per frame (issue #6389). The test
 * counts the bytes the page allocates over a run of still frames, through the DevTools protocol's
 * sampling heap profiler with collected objects kept, at two sizes, and compares them per frame.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { cdp } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

/** One node of the sampling heap profile. */
interface ProfileNode {
    readonly selfSize: number;
    readonly children: readonly ProfileNode[];
}

/** The DevTools protocol calls this test makes. */
interface Session {
    send(method: "HeapProfiler.enable"): Promise<unknown>;
    send(
        method: "HeapProfiler.startSampling",
        params: {
            samplingInterval: number;
            includeObjectsCollectedByMinorGC: boolean;
            includeObjectsCollectedByMajorGC: boolean;
        },
    ): Promise<unknown>;
    send(method: "HeapProfiler.stopSampling"): Promise<{ profile: { head: ProfileNode } }>;
}

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const FRAMES = 30;
const SMALL = 300;
const LARGE = 6000;

/**
 * A still graph of `count` nodes on a chain, placed where it is drawn, on renderPath "batched".
 * @param count - The nodes.
 * @returns The element, drawn and settled.
 */
async function mounted(count: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    // Drawing every frame, as a consumer that never set renderOnDemand does: a still graph still draws.
    element.renderOnDemand = false;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    element.graph.setRenderPath("batched");
    const nodes = Array.from({ length: count }, (_, id) => ({
        id,
        position: { x: (id % 60) * 2, y: Math.floor(id / 60) * 2, z: 0 },
    }));
    await element.session.data.addNodes(nodes);
    await element.session.data.addEdges(nodes.slice(1).map(({ id }) => ({ source: id - 1, target: id })));
    await element.graph.setLayout("fixed", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Wait for the element's scene to draw `count` frames.
 * @param element - The element.
 * @param count - The frames.
 */
async function frames(element: Graphty, count: number): Promise<void> {
    const { scene } = element.graph;
    let drawn = 0;
    await new Promise<void>((resolve) => {
        const observer = scene.onAfterRenderObservable.add(() => {
            drawn++;
            if (drawn === count) {
                scene.onAfterRenderObservable.remove(observer);
                resolve();
            }
        });
    });
}

/**
 * The sum of every sampled allocation in a profile.
 * @param node - The profile's head.
 * @returns The bytes.
 */
function bytesOf(node: ProfileNode): number {
    return node.children.reduce((sum, child) => sum + bytesOf(child), node.selfSize);
}

/**
 * The bytes the page allocates per still frame with `count` nodes drawn, garbage included.
 * @param count - The nodes.
 * @returns The bytes per frame.
 */
async function bytesPerStillFrame(count: number): Promise<number> {
    const element = await mounted(count);
    // Past the frames that finish the first picture: compiling, uploading, the first fit.
    await frames(element, 10);
    const session = cdp() as unknown as Session;
    await session.send("HeapProfiler.enable");
    await session.send("HeapProfiler.startSampling", {
        samplingInterval: 64,
        includeObjectsCollectedByMinorGC: true,
        includeObjectsCollectedByMajorGC: true,
    });
    await frames(element, FRAMES);
    const { profile } = await session.send("HeapProfiler.stopSampling");
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }

    return bytesOf(profile.head) / FRAMES;
}

describe("a still frame under renderPath batched", () => {
    it("allocates nothing per row", async () => {
        const small = await bytesPerStillFrame(SMALL);
        const large = await bytesPerStillFrame(LARGE);
        // One object per row is at least 16 bytes: 91,200 bytes a frame more for the 5,700 rows added.
        // A quarter of that leaves room for the frame's fixed work (about 15 KB a frame) to differ
        // between the two runs.
        const perAddedRow = (large - small) / (LARGE - SMALL);
        assert.isBelow(
            perAddedRow,
            4,
            `bytes per still frame: ${Math.round(small)} at ${SMALL} rows, ${Math.round(large)} at ${LARGE} rows`,
        );
    });
});
