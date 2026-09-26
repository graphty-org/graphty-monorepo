/**
 * No frame is drawn while a call-shaped accelerated run is on the device.
 *
 * A GPU readback is delivered as a task, and a task cannot run until the frame the host is
 * drawing has finished. On a scene of thousands of meshes that frame is tens to hundreds of
 * milliseconds, so a traversal that costs 7 ms on the device came back after 225 ms through the
 * element at 1,000 nodes and after 8.6 s at 10,000: two frames per readback (issue #390). The
 * element now holds its frames for exactly the accelerated call, and this test pins that: it
 * counts the scene's renders while a fake accelerator is "on the device" waiting for animation
 * frames, and expects none, then expects the frames back once the run has returned.
 *
 * It runs in the browser because it needs a real `Graph` with a render loop.
 */
import type { PageRankResultLike } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";
import { afterEach, assert, describe, it } from "vitest";

import type { GraphAccelerator } from "../../src/acceleration";
import type { Graph } from "../../src/Graph";
import { cleanupE2EGraph, createE2EGraph } from "../helpers/e2e-graph-setup";

/** Graphs a test built, shut down after it whether it passed or not. */
const graphs: Graph[] = [];

/** Resolves after the browser has handed out `count` animation frames. */
async function animationFrames(count: number): Promise<void> {
    for (let frame = 0; frame < count; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }
}

/**
 * Waits until the scene has drawn `count` more frames, or fails. A frame is a render, not an
 * animation frame: a held frame ticks without drawing.
 * @param graph - The graph whose scene is counted.
 * @param count - How many renders to wait for.
 */
async function rendersOf(graph: Graph, count: number): Promise<void> {
    let rendered = 0;
    const scene = graph.getScene();
    const observer = scene.onAfterRenderObservable.add(() => {
        rendered += 1;
    });

    try {
        for (let attempt = 0; attempt < 600 && rendered < count; attempt++) {
            await animationFrames(1);
        }
    } finally {
        scene.onAfterRenderObservable.remove(observer);
    }

    assert.isAtLeast(rendered, count, `the scene drew ${String(count)} frames`);
}

afterEach(() => {
    while (graphs.length > 0) {
        graphs.pop()?.shutdown();
    }

    cleanupE2EGraph();
});

describe("an accelerated run and the render loop", () => {
    it("draws no frame while the run is on the device, and draws again once it is back", async () => {
        const { graph } = await createE2EGraph({
            nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
            edges: [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
            enableAi: false,
        });
        graphs.push(graph);
        const scene = graph.getScene();

        // The loop is running before the run starts: the hold is what stops it, not the test.
        await rendersOf(graph, 2);

        let renderedDuring = 0;
        let animationFramesDuring = 0;
        // "On the device" for five animation frames, which is where a readback would wait.
        const onDevice = async (snapshot: GraphSnapshot): Promise<PageRankResultLike> => {
            const observer = scene.onAfterRenderObservable.add(() => {
                renderedDuring += 1;
            });

            for (let frame = 0; frame < 5; frame++) {
                await animationFrames(1);
                animationFramesDuring += 1;
            }

            scene.onAfterRenderObservable.remove(observer);
            const scores = new Float32Array(snapshot.nodeCount).fill(1 / snapshot.nodeCount);
            return { scores, iterations: 1, converged: true };
        };
        const accelerator: GraphAccelerator = {
            name: "frame-counting-fake",
            backend: "webgpu",
            dispose: (): void => undefined,
            pageRank: onDevice,
        };
        graph.acceleration.setAccelerator(accelerator);

        const snapshot = graph.getDataManager().getSnapshot();
        const outcome = await graph.acceleration.run({ capability: "pageRank", nodeCount: snapshot.nodeCount }, () =>
            onDevice(snapshot),
        );

        assert.isTrue(outcome.accelerated, "the work ran on the accelerator");
        assert.strictEqual(animationFramesDuring, 5, "the browser kept ticking while the run was on the device");
        assert.strictEqual(renderedDuring, 0, "and the scene drew nothing in that time");

        // The hold is released with the run: the frames come back on their own.
        await rendersOf(graph, 2);
    });
});
