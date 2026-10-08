/**
 * @file A frame drawn from the frozen list of visible meshes draws each instance once.
 *
 * THE DEFECT. When nothing changes the element freezes Babylon's list of what is drawn
 * (`UpdateManager.settleActiveMeshFreeze`). It does so between frames, where Babylon's render id
 * is still the one of the frame just drawn. Freezing walks the scene again and registers every
 * instance under that render id -- into the list the frame just drawn had already filled -- so
 * every frozen frame drew each instance twice. Opaque nodes hid it; a translucent selection halo
 * was blended twice and came out visibly darker.
 *
 * WHAT IS MEASURED. How many instances the engine is asked to draw in each frame, across the
 * frame that unfreezes (the camera is touched) and the frozen frames that follow it. Each frame
 * must ask for the same number.
 */

import type { AbstractEngine } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** A ring, so there are several node and edge instances. */
const NODES = Array.from({ length: 8 }, (_, i) => ({
    id: `n${String(i)}`,
    position: { x: 4 * Math.cos((i * Math.PI) / 4), y: 4 * Math.sin((i * Math.PI) / 4), z: 0 },
}));

/** Each node joined to the next. */
const EDGES = NODES.map((node, i) => ({ src: node.id, dst: NODES[(i + 1) % NODES.length].id }));

/** How many frames to record after the camera is touched: one unfrozen, the rest frozen. */
const FRAMES = 6;

describe("a frozen frame", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "320px";
        container.style.height = "240px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(graph).waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Count the instances the engine is asked to draw, frame by frame.
     * @param engine - The engine to watch.
     * @param frames - How many frames to record.
     * @returns The instance count of each frame.
     */
    async function instancesPerFrame(engine: AbstractEngine, frames: number): Promise<number[]> {
        const { scene } = graph;
        const counts: number[] = [];
        let drawn = 0;
        const drawElements = engine.drawElementsType.bind(engine);
        const drawArrays = engine.drawArraysType.bind(engine);

        engine.drawElementsType = (fillMode, start, count, instances) => {
            drawn += instances ?? 0;
            drawElements(fillMode, start, count, instances);
        };
        engine.drawArraysType = (fillMode, start, count, instances) => {
            drawn += instances ?? 0;
            drawArrays(fillMode, start, count, instances);
        };

        try {
            await new Promise<void>((resolve) => {
                const observer = scene.onAfterRenderObservable.add(() => {
                    counts.push(drawn);
                    drawn = 0;

                    if (counts.length === frames) {
                        scene.onAfterRenderObservable.remove(observer);
                        resolve();
                    }
                });

                // Rebuilding the view matrix stamps it as changed, which the element reads as a
                // camera move: the next frame is drawn unfrozen and the ones after it frozen.
                scene.activeCamera?.getViewMatrix(true);
            });
        } finally {
            engine.drawElementsType = drawElements;
            engine.drawArraysType = drawArrays;
        }

        return counts;
    }

    it("draws each instance once, as the unfrozen frame before it did", async () => {
        await graph.waitForStableFrame();

        const counts = await instancesPerFrame(graph.engine, FRAMES);

        assert.isAbove(counts[0], 0, "the graph draws its nodes and edges as instances");
        assert.deepEqual(
            counts,
            counts.map(() => counts[0]),
            "every frame, frozen or not, draws the same instances",
        );
    });
});
