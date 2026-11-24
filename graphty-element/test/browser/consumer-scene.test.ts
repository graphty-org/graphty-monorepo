/**
 * @file What a consumer gets when it reaches into the element's Babylon.js scene.
 *
 * `element.graph.scene` is public, and a third party uses it the way any Babylon.js scene is used:
 * `scene.pick`, a pointer observer's `pickInfo`, an `ActionManager` on its own mesh, a `GlowLayer`,
 * its own light, its own meshes shown and hidden. The element's own reads (`screenToWorld`,
 * `nodeScreenPosition`, `session.positions`) sit beside them. Each case here is what a consumer sees
 * on the default path at commit 57c0ee700e, the build before the row renderer.
 *
 * The file runs in "browser" on the objects path and in "forced-batched" on the batched path, with
 * the same assertions: the guide promises a consumer the same graph on both. A case that fails on
 * batched is an open batched defect and stays failing until it is fixed; it is never skipped here.
 *
 * The fixture keeps batched rows lazy: nodes only, no edges (an arrowed edge builds its two nodes as
 * objects), added after the first frame, and on batched every case first asserts that a batch draws
 * every node, so the case cannot quietly test object rows.
 */

import { ActionManager } from "@babylonjs/core/Actions/actionManager.js";
import { ExecuteCodeAction } from "@babylonjs/core/Actions/directActions.js";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer.js";
import { PointLight } from "@babylonjs/core/Lights/pointLight.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { pixelAt, pixelsAt } from "../helpers/canvas-pixels";
import { drawnFrames } from "../helpers/drawn-frames";
import { mountElement, unmountElements } from "../helpers/mount-element";
import { click, nodePoint, type Point } from "../helpers/real-input";

afterEach(unmountElements);

const PATH = renderPathDefault.value;
const COLUMNS = 5;
const NODES = Array.from({ length: COLUMNS * COLUMNS }, (_, i) => ({
    id: `n${String(i)}`,
    position: { x: (i % COLUMNS) * 3, y: Math.floor(i / COLUMNS) * 3, z: 0 },
}));
/** The middle node: away from the canvas edge on every side. */
const MIDDLE = "n12";

/**
 * A 25-node grid on a fixed layout, drawing every frame, settled.
 * @param dimension - The layout's dimension; a 2D view draws nodes unlit.
 * @returns The element.
 */
async function grid(dimension: "2d" | "3d" = "2d"): Promise<Graphty> {
    const element = await mountElement();
    element.renderOnDemand = false;
    await element.session.layout.setDimension(dimension);
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(NODES);
    await element.waitForStableFrame();
    assertBatched(element);
    return element;
}

/**
 * On batched, a batch still draws every node: nothing in the case set-up built them as objects.
 * @param element - The element.
 */
function assertBatched(element: Graphty): void {
    if (PATH === "batched") {
        assert.equal(element.rowCounts.batchedNodes, NODES.length, `rows ${JSON.stringify(element.rowCounts)}`);
    }
}

/**
 * How bright a pixel is, its largest channel.
 * @param element - The element.
 * @param at - CSS pixels.
 * @returns 0 to 255.
 */
async function brightness(element: Graphty, at: Point): Promise<number> {
    const [r, g, b] = await pixelAt(element, at);
    return Math.max(r, g, b);
}

/**
 * The midpoint between two nodes on screen, where the grid has empty background.
 * @param element - The element.
 * @param a - One node.
 * @param b - The other.
 * @returns CSS pixels.
 */
function between(element: Graphty, a: string, b: string): Point {
    const p = nodePoint(element, a);
    const q = nodePoint(element, b);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}

describe(`a consumer's view of the scene (${PATH})`, () => {
    it("scene.pick at a node's screen point hits the node", async () => {
        const element = await grid();
        const at = nodePoint(element, MIDDLE);
        const info = element.graph.scene.pick(at.x, at.y);
        assert.isTrue(info.hit, `scene.pick over ${MIDDLE} hit nothing; rows ${JSON.stringify(element.rowCounts)}`);
    });

    it("screenToWorld over a node answers the node's place", async () => {
        const element = await grid();
        const world = element.screenToWorld(nodePoint(element, MIDDLE));
        assert.isNotNull(world, "screenToWorld over a node");
        // n12 is at (6, 6): the point is on its surface, within its radius.
        assert.approximately(world.x, 6, 1, JSON.stringify(world));
        assert.approximately(world.y, 6, 1, JSON.stringify(world));
    });

    it("a click on a node reaches a pointer observer's pickInfo and fires no action on a mesh behind it", async () => {
        const element = await grid();
        const { scene } = element.graph;
        // A consumer's wall behind the whole grid, with its own pick action.
        const wall = MeshBuilder.CreatePlane("consumer-wall", { size: 200 }, scene);
        wall.position.set(6, 6, 5);
        const fired: string[] = [];
        wall.actionManager = new ActionManager(scene);
        wall.actionManager.registerAction(
            new ExecuteCodeAction({ trigger: ActionManager.OnPickTrigger }, () => {
                fired.push("wall");
            }),
        );
        const picked: (string | null)[] = [];
        scene.onPointerObservable.add((info) => {
            if (info.pickInfo !== null) {
                picked.push(info.pickInfo.pickedMesh?.name ?? null);
            }
        });
        await drawnFrames(scene, 2);
        assertBatched(element);

        // The control: a click on the open wall fires the wall's action.
        await click(element, between(element, "n11", "n12"));
        await element.waitForStableFrame();
        assert.deepEqual(fired, ["wall"], "a click on the open wall fires its action");

        fired.length = 0;
        picked.length = 0;
        await click(element, nodePoint(element, MIDDLE));
        await element.waitForStableFrame();
        assert.deepEqual([...element.session.selection.nodes], [MIDDLE], "the click selected the node");
        assert.deepEqual(fired, [], "the click on the node went through it to the wall's action");
        assert.isTrue(
            picked.some((name) => name !== null && name !== "consumer-wall"),
            `pickInfo named ${JSON.stringify(picked)}, never the node`,
        );
    });

    it("a consumer GlowLayer glows the nodes in place and leaves the background dark", async () => {
        const element = await grid();
        const { scene } = element.graph;
        scene.clearColor.set(0, 0, 0, 1);
        await drawnFrames(scene, 2);
        // Every gap between two neighbors in a row, and the canvas corners: background on the objects path.
        const gaps: Point[] = [
            { x: 4, y: 4 },
            { x: 396, y: 4 },
            { x: 4, y: 296 },
            { x: 396, y: 296 },
        ];
        for (let i = 0; i < NODES.length; i++) {
            if (i % COLUMNS !== COLUMNS - 1) {
                gaps.push(between(element, `n${String(i)}`, `n${String(i + 1)}`));
            }
        }

        const before = await pixelsAt(element, gaps);
        const glow = new GlowLayer("consumer-glow", scene);
        try {
            await drawnFrames(scene, 4);
            assertBatched(element);
            const after = await pixelsAt(element, gaps);
            const lit = gaps.filter(
                (_, i) => Math.max(...after[i].slice(0, 3)) > Math.max(...before[i].slice(0, 3)) + 80,
            );
            assert.deepEqual(lit, [], "background points the glow lit with no node there");
            assert.isAbove(await brightness(element, nodePoint(element, MIDDLE)), 40, "the node is still drawn");
        } finally {
            glow.dispose();
        }
    });

    it("a consumer light changes a lit node's color in 3D", async () => {
        const element = await grid("3d");
        const { scene } = element.graph;
        const at = nodePoint(element, MIDDLE);
        const before = await pixelAt(element, at);
        const light = new PointLight("consumer-red", new Vector3(6, 6, -20), scene);
        light.diffuse = new Color3(1, 0, 0);
        light.intensity = 3;
        try {
            await drawnFrames(scene, 4);
            assertBatched(element);
            const after = await pixelAt(element, at);
            assert.notDeepEqual(after, before, "the node did not change under a red light");
        } finally {
            light.dispose();
        }
    });

    // Fails on both paths, and before the rendering optimizations, until issue #9923 is fixed.
    it("a consumer mesh hidden with setEnabled(false) at rest leaves the canvas", async () => {
        const element = await grid();
        const { scene } = element.graph;
        const box = MeshBuilder.CreateBox("consumer-box", { size: 1.2 }, scene);
        const material = new StandardMaterial("consumer-box", scene);
        material.disableLighting = true;
        material.emissiveColor = new Color3(1, 1, 0);
        box.material = material;
        box.position.set(7.5, 7.5, -1);
        await element.waitForStableFrame();
        const at = element.worldToScreen({ x: 7.5, y: 7.5, z: -1 });
        const shown = await pixelAt(element, at);
        assert.isTrue(shown[0] > 200 && shown[1] > 200 && shown[2] < 80, `the yellow box is drawn: ${String(shown)}`);

        box.setEnabled(false);
        await element.waitForStableFrame();
        const hidden = await pixelAt(element, at);
        assert.isFalse(
            hidden[0] > 200 && hidden[1] > 200 && hidden[2] < 80,
            `the box hidden with setEnabled(false) is still drawn: ${String(hidden)}`,
        );
    });
});

describe(`the element's own reads before the first frame (${PATH})`, () => {
    it("nodeScreenPosition before the first frame does not throw", async () => {
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        try {
            await element.updateComplete;
            const adding = element.session.data.addNodes(NODES);
            assert.doesNotThrow(
                () => element.nodeScreenPosition(MIDDLE),
                undefined,
                undefined,
                "while the nodes are added",
            );
            await adding;
            assert.doesNotThrow(
                () => element.nodeScreenPosition(MIDDLE),
                undefined,
                undefined,
                "after the nodes are added",
            );
            await element.waitForStableFrame();
            assert.isTrue(element.nodeScreenPosition(MIDDLE)?.visible, "drawn after the first frame");
        } finally {
            element.remove();
        }
    });

    it("session.positions.set before the first frame places the nodes", async () => {
        const element = await mountElement();
        const { session } = element;
        await session.layout.setDimension("2d");
        await session.layout.set("fixed");
        await session.data.addNodes(NODES.map(({ id }) => ({ id })));
        await session.positions.set(NODES.map(({ id, position }) => ({ id, x: position.x, y: position.y, z: 0 })));
        await element.waitForStableFrame();
        assertBatched(element);
        const stored = session.positions.get(MIDDLE);
        assert.deepInclude(stored, { x: 6, y: 6 }, `stored position of ${MIDDLE}`);
        const a = nodePoint(element, "n0");
        const b = nodePoint(element, "n24");
        assert.isAbove(
            Math.hypot(b.x - a.x, b.y - a.y),
            50,
            `n0 at ${JSON.stringify(a)} and n24 at ${JSON.stringify(b)}`,
        );
    });
});
