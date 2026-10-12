/**
 * @file A label's size is in the unit its channel descriptor states: `perWorldUnit` numbers make
 * one world unit, so a one-line label of size 48 is drawn one world unit tall and one of 96 two,
 * on Les Miserables at the element's own framing. A label is sized in the scene, not on screen,
 * so how many pixels that is depends on the framing; the test records the default's pixel height.
 */

import { Matrix, Vector3 } from "@babylonjs/core";
import { lesMiserables } from "@graphty/graph-samples/datasets/les-miserables";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { CHANNEL_DESCRIPTORS } from "../../src/session/styles/channels";

let graph: Graph;
let container: HTMLElement;

beforeAll(async () => {
    container = document.createElement("div");
    container.style.width = "1000px";
    container.style.height = "700px";
    document.body.appendChild(container);
    graph = new Graph(container);
    await graph.init();
    await graph.setLayout("force", { seed: 1 });
    const sample = lesMiserables();
    const ids = sample.ids ?? [];
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges([...sample.src].map((src, e) => ({ src: ids[src], dst: ids[sample.dst[e]] })));
    await operationQueueOf(graph).waitForCompletion();
    const manager = graph.getLayoutManager();
    for (let frame = 0; frame < 1100 && manager.running && !manager.layoutEngine?.isSettled; frame++) {
        graph.getUpdateManager().stepFrames(1);
    }
    graph.zoomToFit();
    await graph.waitForStableFrame();
});

afterAll(() => {
    graph.dispose();
    container.remove();
});

/**
 * Label every node with one line of words at a size, and measure the drawn planes.
 * @param size - The label size, or undefined for the default.
 * @returns The median plane height in world units and on screen in pixels.
 */
async function drawnHeights(size: number | undefined): Promise<{ world: number; pixels: number }> {
    const session = graph.getSession();
    const layer = await session.styles.add({
        name: "words",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "Mg", ...(size === undefined ? {} : { "node.labelSize": size }) },
    });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    graph.scene.render();

    const { scene } = graph;
    const engine = scene.getEngine();
    const camera = scene.activeCamera;
    assert.isNotNull(camera);
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const project = (point: Vector3): Vector3 =>
        Vector3.Project(point, Matrix.Identity(), scene.getTransformMatrix(), viewport);
    const world: number[] = [];
    const pixels: number[] = [];
    for (const mesh of scene.meshes) {
        if (!mesh.name.startsWith("richTextPlane") || !mesh.isEnabled()) {
            continue;
        }
        const box = mesh.getBoundingInfo().boundingBox;
        const height = box.extendSize.y * 2 * mesh.absoluteScaling.y;
        world.push(height);
        const center = box.centerWorld;
        const up = project(center.add(new Vector3(0, height / 2, 0)));
        const down = project(center.add(new Vector3(0, -height / 2, 0)));
        pixels.push(Math.abs(up.y - down.y));
    }
    await session.styles.remove(layer.id);
    await graph.waitForStableFrame();

    const median = (values: number[]): number => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    assert.strictEqual(world.length, 77, "a label on every node");

    return { world: median(world), pixels: median(pixels) };
}

describe("a label's size unit", () => {
    it("draws perWorldUnit of the size per world unit, so the drawn height follows the number", async () => {
        const descriptor = CHANNEL_DESCRIPTORS["node.labelSize"];
        const perWorldUnit = descriptor.perWorldUnit ?? Number.NaN;
        const fallback = Number(descriptor.default);

        const atDefault = await drawnHeights(undefined);
        const atDouble = await drawnHeights(fallback * 2);

        assert.strictEqual(perWorldUnit, 48);
        assert.closeTo(atDefault.world, fallback / perWorldUnit, 0.01, "one line at the default is one world unit");
        assert.closeTo(atDouble.world / atDefault.world, 2, 0.01, "twice the size, twice as tall");
        // At this framing a world unit is a few pixels: the default draws a line under 20 px tall,
        // which is why a reader-facing size needs the framing (or a screen-sized option) too.
        assert.isAbove(atDefault.pixels, 0);
        assert.closeTo(atDouble.pixels / atDefault.pixels, 2, 0.1);
    });
});
