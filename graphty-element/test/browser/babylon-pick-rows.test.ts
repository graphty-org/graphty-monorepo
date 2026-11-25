/**
 * @file Babylon's own picks over the element's scene find the nodes, whatever draws them.
 *
 * A consumer that reaches into `element.graph.scene` picks it the way any Babylon.js scene is
 * picked: `scene.pick`, `scene.pickWithRay`, a pointer observer's `pickInfo`, an `ActionManager` on
 * its own mesh. On the default path every node is a mesh, so all of them name the node. On the
 * `"batched"` path a batch draws the nodes with no mesh each, and Babylon's picks saw straight
 * through them to whatever was behind. The file runs in "browser" (objects) and "forced-batched".
 */

import { ActionManager } from "@babylonjs/core/Actions/actionManager.js";
import { ExecuteCodeAction } from "@babylonjs/core/Actions/directActions.js";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { drawnFrames } from "../helpers/drawn-frames";
import { mountElement, unmountElements } from "../helpers/mount-element";
import { click, nodePoint } from "../helpers/real-input";

afterEach(unmountElements);

const PATH = renderPathDefault.value;
/** Three nodes in a row, the middle one at the world origin. */
const NODES = [-4, 0, 4].map((x, i) => ({ id: `p${String(i)}`, position: { x, y: 0, z: 0 } }));

/**
 * The row, on a fixed 2D layout, settled; on batched, a batch draws every node.
 * @returns The element.
 */
async function row(): Promise<Graphty> {
    const element = await mountElement();
    element.renderOnDemand = false;
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(NODES);
    await element.waitForStableFrame();
    if (PATH === "batched") {
        assert.equal(element.rowCounts.batchedNodes, NODES.length, JSON.stringify(element.rowCounts));
    }

    return element;
}

/**
 * The node a picked mesh names.
 * @param mesh - The mesh, or null.
 * @param mesh.metadata - Its metadata.
 * @returns The node's id, or undefined.
 */
function nodeIdOf(mesh: { metadata: unknown } | null | undefined): unknown {
    return (mesh?.metadata as { nodeId?: unknown } | null | undefined)?.nodeId;
}

describe(`Babylon's picks over the nodes (${PATH})`, () => {
    it("scene.pick at each node's point names that node, and an empty point names nothing", async () => {
        const element = await row();
        const { scene } = element.graph;
        for (const { id } of NODES) {
            const at = nodePoint(element, id);
            const info = scene.pick(at.x, at.y);
            assert.isTrue(info.hit, `scene.pick over ${id}`);
            assert.strictEqual(nodeIdOf(info.pickedMesh), id);
            assert.isNotNull(info.pickedPoint);
        }

        const a = nodePoint(element, "p0");
        const b = nodePoint(element, "p1");
        assert.isFalse(scene.pick((a.x + b.x) / 2, (a.y + b.y) / 2).hit, "the gap between two nodes");
    });

    it("scene.pickWithRay through a node names it, and a predicate can turn it away", async () => {
        const element = await row();
        const { scene } = element.graph;
        const at = nodePoint(element, "p2");
        const ray = scene.createPickingRay(at.x, at.y, null, null);
        assert.strictEqual(nodeIdOf(scene.pickWithRay(ray)?.pickedMesh), "p2");
        assert.isFalse(scene.pickWithRay(ray, () => false)?.hit, "a predicate that admits nothing");
    });

    it("a click on a node reaches pickInfo and not the action of a consumer mesh behind it", async () => {
        const element = await row();
        const { scene } = element.graph;
        const wall = MeshBuilder.CreatePlane("consumer-wall", { size: 100 }, scene);
        wall.position.set(0, 0, 5);
        const fired: string[] = [];
        wall.actionManager = new ActionManager(scene);
        wall.actionManager.registerAction(
            new ExecuteCodeAction({ trigger: ActionManager.OnPickTrigger }, () => {
                fired.push("wall");
            }),
        );
        // The press, the release and the tap: Babylon's pick on a move is left to meshes on batched (PickService).
        const picked: unknown[] = [];
        scene.onPointerObservable.add(
            (info) => {
                picked.push(nodeIdOf(info.pickInfo?.pickedMesh) ?? info.pickInfo?.pickedMesh?.name);
            },
            PointerEventTypes.POINTERDOWN | PointerEventTypes.POINTERUP | PointerEventTypes.POINTERTAP,
        );
        await drawnFrames(scene, 2);

        await click(element, nodePoint(element, "p1"));
        await element.waitForStableFrame();
        assert.deepEqual([...element.session.selection.nodes], ["p1"], "the click selected the node");
        assert.deepEqual(fired, [], "the click went through the node to the wall's action");
        assert.include(picked, "p1", `pickInfo named ${JSON.stringify(picked)}`);
        assert.notInclude(picked, "consumer-wall");
    });
});
