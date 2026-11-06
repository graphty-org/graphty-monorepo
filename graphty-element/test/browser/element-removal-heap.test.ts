/**
 * @file A removed graphty-element is garbage: nothing keeps its graph, its scene or its data alive.
 *
 * Before issue #6028, every `Scene.render` pointed Babylon's module-wide
 * `FloatingOriginCurrentScene.getScene` at a closure over the scene, and `Scene.dispose` left it
 * there. So the last scene drawn on the page stayed reachable after its element was removed, and
 * through it the whole graph: about 2.4 GB at 1,000,000 edges, and a second graph that size in the
 * same page ran out of memory (`timeline-frame-bench.ts`).
 *
 * The test drops every reference it has to the element, lets the page draw a frame (until its next
 * rendering update Blink itself holds a just-removed canvas, and through its shadow root the
 * element), collects garbage through the DevTools protocol, and counts the objects still alive.
 */
import "../../src/graphty-element";

import { assert, it, vi } from "vitest";
import { cdp } from "vitest/browser";

import type { Graphty } from "../../index.js";

/** The DevTools protocol call this test makes. */
interface Session {
    send(method: "HeapProfiler.collectGarbage"): Promise<unknown>;
}

/** Weak references to what a mounted element owns. */
interface Owned {
    readonly element: WeakRef<Graphty>;
    readonly graph: WeakRef<object>;
    readonly scene: WeakRef<object>;
    readonly dataManager: WeakRef<object>;
}

/**
 * Mount an element with a small graph, let it draw, then remove it; only weak references leave.
 * @returns Weak references to the element and what it owned.
 */
async function mountDrawAndRemove(): Promise<Owned> {
    const element = document.createElement("graphty-element");
    element.style.width = "320px";
    element.style.height = "240px";
    element.style.display = "block";
    document.body.appendChild(element);
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    await element.graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await element.graph.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    await element.waitForSettled();
    // A drawn frame is what pointed Babylon's module-wide getter at this scene.
    await element.waitForStableFrame();
    const { graph } = element;
    const owned: Owned = {
        element: new WeakRef(element),
        graph: new WeakRef(graph),
        scene: new WeakRef(graph.scene),
        dataManager: new WeakRef(graph.getDataManager()),
    };
    element.remove();
    await vi.waitFor(() => {
        assert.isTrue(graph.scene.isDisposed, "the removed element shut its graph down");
    });
    return owned;
}

/**
 * Resolve after the page's next rendering update.
 * @returns A promise for the frame after next.
 */
function twoFrames(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

it("a removed element leaves nothing it owned alive", async () => {
    const owned = await mountDrawAndRemove();
    await twoFrames();
    await (cdp() as unknown as Session).send("HeapProfiler.collectGarbage");

    const held = Object.entries(owned)
        .filter(([, ref]) => (ref as WeakRef<object>).deref() !== undefined)
        .map(([name]) => name);
    assert.deepEqual(held, [], "still alive after the element was removed and garbage collected");
});
