/**
 * @file Overlapping translucent nodes blend in the same order on both render paths: looks against
 * each other in 3D from any side (#10029), and nodes of one look in 2D after a removal is undone, a
 * node is added back or a node is restyled into a look its neighbors wear (#10030).
 *
 * Babylon blends one translucent source after another, and a source's instances in the order
 * `scene.meshes` lists them. On `"objects"` every source parks at one place, so the order of looks
 * fell to how far its geometry's bounds sat from that place (a pyramid's are off center) and, on a
 * tie, to which look's node the list met first; on `"batched"` each look's batch sat at the graph's
 * origin. Inside a look, a node whose mesh was made again went to the end of the list on `"objects"`
 * while its batch drew it in its row. Now looks blend in the order they were made and the nodes of
 * a look in row order, on both paths.
 *
 * How to run, from graphty-element (part of the render-parity project):
 *   npx vitest run --project=render-parity test/render-parity/translucent-overlap-order.test.ts
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { assertSameFrame, type CanvasFrame, readCanvas } from "../helpers/whole-canvas";

type Path = "objects" | "batched";

/** A 4 by 3 grid at 1.1 apart, drawn at size 1.6, so each node overlaps its neighbors. */
const NODES = Array.from({ length: 12 }, (_, id) => ({
    id,
    position: { x: (id % 4) * 1.1 - 2, y: Math.floor(id / 4) * 1.1 - 1, z: 0 },
    color: ["#e11d48", "#16a34a", "#f59e0b"][id % 3] ?? "",
}));

afterEach(() => {
    document.body.replaceChildren();
});

/**
 * Settle the element after an edit.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

/**
 * An element drawing the grid at 0.6 opacity, even nodes in one shape and odd ones in another,
 * each in one of three colors.
 * @param path - The render path.
 * @param view - 2D or 3D.
 * @param shapes - The even nodes' shape and the odd nodes'.
 * @returns The element, settled.
 */
async function mount(path: Path, view: "2d" | "3d", shapes: [string, string]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.append(element);
    await element.updateComplete;
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(view);
    for (const [parity, shape] of shapes.entries()) {
        await element.session.styles.add({
            name: `shape ${shape}`,
            target: "node",
            selector: { match: "ids", nodes: NODES.filter(({ id }) => id % 2 === parity).map(({ id }) => id) },
            set: { "node.shape": shape, "node.size": 1.6, "node.opacity": 0.6 },
        });
    }

    for (const color of new Set(NODES.map((node) => node.color))) {
        await element.session.styles.add({
            name: `fill ${color}`,
            target: "node",
            selector: { match: "ids", nodes: NODES.filter((node) => node.color === color).map(({ id }) => id) },
            set: { "node.color": color },
        });
    }

    await settle(element);
    return element;
}

/** Cameras in front of the grid, behind it and under it. */
const CAMERAS = {
    front: { x: 0.5, y: 2, z: -10 },
    behind: { x: 0.5, y: 2, z: 10 },
    under: { x: 0.3, y: -10, z: -0.5 },
};

/**
 * The canvas from one of the {@link CAMERAS}.
 * @param element - The element.
 * @param camera - Which.
 * @returns The frame.
 */
async function from(element: Graphty, camera: keyof typeof CAMERAS): Promise<CanvasFrame> {
    await element.graph.setCameraState({ position: CAMERAS[camera], target: { x: -0.35, y: 0.1, z: 0 } });
    await element.waitForStableFrame();
    return readCanvas(element.graph);
}

/**
 * Ink: pixels that differ from the background, so a blank frame cannot pass.
 * @param frame - The frame.
 * @returns How many.
 */
function ink(frame: CanvasFrame): number {
    const background = frame.pixels.subarray(0, 4).join();
    let drawn = 0;
    for (let i = 0; i < frame.pixels.length; i += 4) {
        drawn += frame.pixels.subarray(i, i + 4).join() === background ? 0 : 1;
    }

    return drawn;
}

describe("overlapping translucent looks", () => {
    // shapes whose bounds sit off center, against one centered shape and against each other
    const pairs: [string, string][] = [
        ["pentagonal_pyramid", "box"],
        ["square_pyramid", "sphere"],
        ["cone", "tetrahedron"],
    ];
    for (const shapes of pairs) {
        it.for(Object.keys(CAMERAS) as (keyof typeof CAMERAS)[])(
            `blend ${shapes.join(" and ")} in the same order on both paths in 3D, camera %s`,
            async (camera) => {
                const objects = await from(await mount("objects", "3d", shapes), camera);
                document.body.replaceChildren();
                const batched = await mount("batched", "3d", shapes);
                assert.equal(batched.graph.rowCounts.batchedNodes, NODES.length, "every node is drawn by a batch");
                assert.isAbove(ink(objects), 5000, "the frame holds the graph");
                assertSameFrame(
                    objects,
                    await from(batched, camera),
                    "the paths blend the translucent looks differently",
                );
            },
        );
    }

    it("blend in the same order on both paths in 2D after a removal is undone, and after a node is added back", async () => {
        const frames: Record<string, CanvasFrame[]> = {};
        for (const path of ["objects", "batched"] as const) {
            const element = await mount(path, "2d", ["ellipse", "rectangle"]);
            const before = await readCanvas(element.graph);
            await element.session.data.removeNodes([0]);
            await settle(element);
            await element.session.undo();
            // undo selects what it brought back; the selection's look is not under test
            element.session.selection.clear();
            await settle(element);
            const undone = await readCanvas(element.graph);
            assertSameFrame(before, undone, `undoing the removal does not restore the picture on ${path}`);
            await element.session.data.removeNodes([0]);
            await settle(element);
            await element.session.data.addNodes(NODES.filter(({ id }) => id === 0));
            await settle(element);
            frames[path] = [before, undone, await readCanvas(element.graph)];
            document.body.replaceChildren();
        }

        const [objects, batched] = [frames.objects ?? [], frames.batched ?? []];
        for (const [at, step] of ["first drawn", "removal undone", "re-added"].entries()) {
            const [a, b] = [objects[at], batched[at]];
            assert.isDefined(a);
            assert.isDefined(b);
            assertSameFrame(a, b, `the paths blend the translucent looks differently, ${step}`);
        }
    });
    it("keep a look's place among the others in 2D once the only node wearing it leaves it and comes back", async () => {
        for (const path of ["objects", "batched"] as const) {
            const element = await mount(path, "2d", ["ellipse", "rectangle"]);
            // node 1 is the only rectangle left, and the diamonds are a look made after it
            await element.session.styles.add({
                name: "odd nodes but 1 as diamonds",
                target: "node",
                selector: { match: "ids", nodes: [3, 5, 7, 9, 11] },
                set: { "node.shape": "diamond" },
            });
            await settle(element);
            const before = await readCanvas(element.graph);
            const away = await element.session.styles.add({
                name: "node 1 as an ellipse",
                target: "node",
                selector: { match: "ids", nodes: [1] },
                set: { "node.shape": "ellipse" },
            });
            await settle(element);
            await element.session.styles.remove(away.id);
            await settle(element);
            assert.isAbove(ink(before), 5000, "the frame holds the graph");
            assertSameFrame(
                before,
                await readCanvas(element.graph),
                `the rectangle blends in another place on ${path}`,
            );
            document.body.replaceChildren();
        }
    });

    it("blend in row order on both paths in 2D after a node is restyled into a look its neighbors wear", async () => {
        const frames: CanvasFrame[] = [];
        for (const path of ["objects", "batched"] as const) {
            const element = await mount(path, "2d", ["ellipse", "rectangle"]);
            await element.session.styles.add({
                name: "node 4 as a rectangle",
                target: "node",
                selector: { match: "ids", nodes: [4] },
                set: { "node.shape": "rectangle" },
            });
            await settle(element);
            frames.push(await readCanvas(element.graph));
            document.body.replaceChildren();
        }

        const [objects, batched] = frames;
        assert.isDefined(objects);
        assert.isDefined(batched);
        assertSameFrame(objects, batched, "the restyled node blends in another order on one path");
    });
});
