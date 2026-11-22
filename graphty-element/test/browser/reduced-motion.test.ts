/**
 * @file `reducedMotion`: camera moves jump to their end and a running layout is drawn once it has
 * settled; `"auto"` follows `prefers-reduced-motion`; the default changes nothing (issue #812).
 */
import { afterEach, assert, describe, it, vi } from "vitest";
import { commands } from "vitest/browser";

import type { Graph } from "../../src/Graph.js";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup.js";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Emulates `prefers-reduced-motion: reduce` (true) or no preference (false). */
        emulateReducedMotion: (reduce: boolean) => Promise<void>;
    }
}

let graph: Graph | undefined;

afterEach(async () => {
    if (graph !== undefined) {
        cleanupTestGraph(graph);
        graph = undefined;
    }

    await commands.emulateReducedMotion(false);
});

/**
 * Resolve after the scene has rendered one more frame.
 * @param g - The graph.
 * @returns When the frame has been drawn.
 */
function oneFrame(g: Graph): Promise<void> {
    const scene = g.getScene();
    return new Promise((resolve) => {
        scene.onAfterRenderObservable.addOnce(() => {
            resolve();
        });
    });
}

const START = { position: { x: 0, y: 0, z: 50 }, target: { x: 0, y: 0, z: 0 } };
const END = { position: { x: 40, y: 30, z: 20 }, target: { x: 0, y: 0, z: 0 } };

/**
 * Ask for a one-second fly-to, and read where the camera stands after one rendered frame.
 * @param g - The graph.
 * @returns The camera position one frame after the move was asked for.
 */
async function positionOneFrameAfterFlyTo(g: Graph): Promise<{ x: number; y: number; z: number }> {
    await g.setCameraState(START, { animate: false });
    const moving = g.setCameraState(END, { animate: true, duration: 1000 });
    await oneFrame(g);
    const { position } = g.getCameraState();
    assert.isDefined(position);
    g.cancelCameraAnimation();
    await moving.catch(() => undefined);
    return position;
}

/**
 * Lay out a small graph with a seeded force layout, and count how many different places node 0 is
 * drawn at, frame by frame, from its first placement until the layout has settled.
 * @param g - The graph.
 * @returns The drawn places, in order, and where the layout left the node.
 */
async function drawnPlacesWhileSettling(g: Graph): Promise<{ places: string[]; settled: string }> {
    const key = (p: { x: number; y: number; z: number }): string =>
        `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
    const places: string[] = [];
    const observer = g.getScene().onAfterRenderObservable.add(() => {
        const mesh = g.getNode(0)?.mesh;
        if (mesh === undefined || mesh.position.y === -10000) {
            return;
        }

        const now = key(mesh.position);
        if (places.at(-1) !== now) {
            places.push(now);
        }
    });

    await g.setLayout("ngraph", { seed: 7 });
    await g.addNodes(Array.from({ length: 20 }, (_, id) => ({ id })));
    await g.addEdges(Array.from({ length: 19 }, (_, i) => ({ src: i, dst: i + 1 })));
    await g.waitForStableFrame();
    g.getScene().onAfterRenderObservable.remove(observer);

    const node = g.getNode(0);
    assert.isDefined(node);
    return { places, settled: key(node.mesh.position) };
}

describe("reducedMotion", () => {
    it("is false by default, and a fly-to still glides", async () => {
        graph = await createTestGraph();
        assert.strictEqual(graph.getReducedMotion(), false);
        const position = await positionOneFrameAfterFlyTo(graph);
        assert.notDeepEqual(position, END.position, "one frame into a one-second move, the camera is on its way");
    });

    it("lands a fly-to in one frame when true", async () => {
        graph = await createTestGraph();
        graph.setReducedMotion(true);
        const position = await positionOneFrameAfterFlyTo(graph);
        assert.closeTo(position.x, END.position.x, 1e-3);
        assert.closeTo(position.y, END.position.y, 1e-3);
        assert.closeTo(position.z, END.position.z, 1e-3);
    });

    it("draws a force layout settled, not moving into place, when true", async () => {
        graph = await createTestGraph();
        graph.setReducedMotion(true);
        const { places, settled } = await drawnPlacesWhileSettling(graph);
        assert.isAtMost(places.length, 2, `drawn at ${String(places.length)} places: ${places.join(" ")}`);
        assert.strictEqual(places.at(-1), settled);
    });

    it("draws a force layout moving into place by default", async () => {
        graph = await createTestGraph();
        const { places } = await drawnPlacesWhileSettling(graph);
        assert.isAbove(places.length, 2, "by default the layout is drawn on its way");
    });

    it("follows prefers-reduced-motion when auto", async () => {
        await commands.emulateReducedMotion(true);
        graph = await createTestGraph();
        graph.setReducedMotion("auto");
        const position = await positionOneFrameAfterFlyTo(graph);
        assert.closeTo(position.x, END.position.x, 1e-3);
        const { places, settled } = await drawnPlacesWhileSettling(graph);
        assert.isAtMost(places.length, 2, `drawn at ${String(places.length)} places: ${places.join(" ")}`);
        assert.strictEqual(places.at(-1), settled);

        // The platform preference cleared: the camera glides again.
        await commands.emulateReducedMotion(false);
        const gliding = await positionOneFrameAfterFlyTo(graph);
        assert.notDeepEqual(gliding, END.position);
    });

    it("glides under auto when the platform asks for nothing", async () => {
        graph = await createTestGraph();
        graph.setReducedMotion("auto");
        const position = await positionOneFrameAfterFlyTo(graph);
        assert.notDeepEqual(position, END.position);
    });

    it("answers isMotionReduced, and tells reduced-motion-changed each time the answer changes", async () => {
        graph = await createTestGraph();
        const told: boolean[] = [];
        graph.addListener("reduced-motion-changed", (event) => {
            told.push((event as { reduced: boolean }).reduced);
        });
        assert.isFalse(graph.isMotionReduced());

        graph.setReducedMotion("auto");
        assert.isFalse(graph.isMotionReduced(), "auto with no platform preference");
        assert.deepEqual(told, [], "the answer did not change");

        await commands.emulateReducedMotion(true);
        await vi.waitFor(() => {
            assert.deepEqual(told, [true]);
        });
        assert.isTrue(graph.isMotionReduced());

        await commands.emulateReducedMotion(false);
        await vi.waitFor(() => {
            assert.deepEqual(told, [true, false]);
        });
        assert.isFalse(graph.isMotionReduced());

        graph.setReducedMotion(true);
        assert.isTrue(graph.isMotionReduced());
        assert.deepEqual(told, [true, false, true]);
    });
});
