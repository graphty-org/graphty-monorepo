/**
 * @file An accelerated simulation layout with `minDelta` set stops when its landed batches move
 * every node less than `minDelta`, not on the first frame that steps it (issue #4437).
 *
 * An accelerated batch is submitted in one frame and lands after it, so a move measured across the
 * submit, in the same frame, is always 0 and read as "arrived": the layout stopped on its first
 * stepped frame, long before it had settled.
 */
import "../../src/graphty-element";

import { afterEach, assert, test } from "vitest";

import type { Graphty } from "../../index.js";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";

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

const MIN_DELTA = 0.5;

const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

type Positions = Map<string, [number, number, number]>;

/**
 * A readback that waits for animation frames.
 * @param count - How many frames a batch takes to land.
 * @returns The readback.
 */
function nextFrames(count: number): () => Promise<void> {
    return async () => {
        for (let frame = 0; frame < count; frame++) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }
    };
}

/**
 * Where the engine has every node now.
 * @param element - The element.
 * @returns Node id to coordinates.
 */
function positions(element: Graphty): Positions {
    const engine = element.graph.getLayoutManager().layoutEngine;
    assert.isDefined(engine);
    const out: Positions = new Map();
    for (const node of element.graph.getDataManager().nodes.values()) {
        const { x, y, z } = engine.getNodePosition(node);
        out.set(String(node.id), [x, y, z ?? 0]);
    }

    return out;
}

/**
 * How far the node that moved most moved between two arrangements.
 * @param before - The earlier arrangement.
 * @param after - The later one.
 * @returns The largest distance.
 */
function largestMove(before: Positions, after: Positions): number {
    let largest = 0;
    for (const [id, [x, y, z]] of after) {
        const was = before.get(id);
        assert.isDefined(was);
        largest = Math.max(largest, Math.hypot(x - was[0], y - was[1], z - was[2]));
    }

    return largest;
}

test("an accelerated simulation with minDelta stops only once its landed batches move less than minDelta", async () => {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.layoutBehavior = { layout: { minDelta: MIN_DELTA, preSteps: 0 } };
    element.layoutConfig = { seed: 42 };
    element.layout = "forceatlas2";
    document.body.appendChild(element);
    mounted.push(element);

    // A slow device: a batch lands two animation frames after it was submitted, so the frame
    // after a submit finds nothing new landed. It runs the real ForceAtlas2, so the arrangement
    // changes shape from batch to batch (a translation would be framed away).
    const fake = createFakeAccelerator({ computes: "layout", readback: nextFrames(2) });
    element.session.setAccelerator(fake);

    // What each frame drew, by how many batches had landed before it: a frame's render runs in the
    // same task as its step, so the batch it submitted has not landed yet.
    const drawn = new Map<number, Positions>();
    const scene = element.graph.getScene();
    const observer = scene.onAfterRenderObservable.add(() => {
        if (element.graph.getDataManager().nodes.size === NODES.length) {
            drawn.set(fake.calls.resolved, positions(element));
        }
    });

    element.nodeData = NODES;
    element.edgeData = EDGES;
    await element.waitForStableFrame();
    scene.onAfterRenderObservable.remove(observer);

    const manager = element.graph.getLayoutManager();
    const engine = manager.layoutEngine;
    assert.instanceOf(engine, SimulationLayoutEngine);
    assert.isTrue(engine.isAccelerated, "the fake ran the layout");
    assert.isFalse(manager.running, "the layout stopped");

    const landings = [...drawn.keys()].sort((a, b) => a - b);
    const last = landings.at(-1);
    const previous = landings.at(-2);
    assert.isDefined(last);
    assert.isDefined(
        previous,
        `the layout stopped before a second batch landed (landings drawn: ${landings.join(",")})`,
    );

    if (!engine.isSettled) {
        const move = largestMove(drawn.get(previous) ?? new Map(), drawn.get(last) ?? new Map());
        assert.isBelow(move, MIN_DELTA, `stopped unsettled after ${last} landed batches while still moving ${move}`);
    }
});
