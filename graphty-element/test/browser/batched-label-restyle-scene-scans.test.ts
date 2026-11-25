/**
 * @file A label restyle on renderPath "batched" costs each row the same, however many labels the scene holds
 * already (issue #10018).
 *
 * WHAT WENT WRONG. A label hangs from a `Node`, so labeling a row drawn with no `Node` builds one. The new `Node`
 * is built on its own instance mesh, and the batch that draws the row trades that mesh for an anchor straight
 * away. Babylon's `Mesh.dispose` then walks the scene for that one mesh: `scene.freeRenderingGroups()` visits
 * every texture (each label made so far has one) and `scene.removeMesh` searches every mesh. Each row cost time
 * in proportion to the labels and meshes made before it, so labeling the graph was quadratic: 10,000 rows spent
 * seconds in those two walks alone.
 *
 * The work is counted, not timed: the textures `freeRenderingGroups` visits and the meshes `removeMesh` searches
 * over the whole restyle, per labeled row. It must not grow with the number of rows labeled.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";

/** The most scene items a label restyle may walk per labeled row; a walk per row would be about as many as rows. */
const PER_ROW = 16;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A batched graph of n nodes, every row drawn with no `Node`.
 * @param n - How many nodes.
 * @returns The element.
 */
async function mounted(n: number): Promise<Graphty> {
    const element = document.createElement("graphty-element");
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
    await element.graph.setLayout("random", { dim: 3, seed: 7 });
    await element.session.data.addNodes(Array.from({ length: n }, (_, id) => ({ id })));
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/** The scene walks a restyle made, summed over the walks. */
interface Scans {
    /** Textures visited by `scene.freeRenderingGroups` while it was not blocked. */
    textures: number;
    /** Meshes `scene.removeMesh` searched. */
    meshes: number;
}

/**
 * Label every node and count the scene walks until the labels are drawn.
 * @param element - The element.
 * @returns The walks.
 */
async function labelAndCount(element: Graphty): Promise<Scans> {
    const { scene } = element.graph;
    const scans: Scans = { textures: 0, meshes: 0 };
    const free = scene.freeRenderingGroups.bind(scene);
    const remove = scene.removeMesh.bind(scene);
    scene.freeRenderingGroups = () => {
        if (!scene.blockfreeActiveMeshesAndRenderingGroups) {
            scans.textures += scene.textures.length;
        }

        free();
    };
    scene.removeMesh = (...args: Parameters<typeof remove>) => {
        scans.meshes += scene.meshes.length;
        return remove(...args);
    };
    try {
        await element.session.styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.label": { by: "data.id", scale: "passthrough" } },
        } as never);
        await element.waitForSettled();
        await element.waitForStableFrame();
    } finally {
        delete (scene as { freeRenderingGroups?: unknown }).freeRenderingGroups;
        delete (scene as { removeMesh?: unknown }).removeMesh;
    }

    return scans;
}

/**
 * The scene walks per labeled row of a label restyle on n batched rows.
 * @param n - How many rows.
 * @returns The walks, per row.
 */
async function perRow(n: number): Promise<Scans> {
    const element = await mounted(n);
    const manager = element.graph.getDataManager();
    assert.strictEqual(dataManagerInternals.nodesBuilt(manager), 0, "every row is drawn with no Node");
    const scans = await labelAndCount(element);
    // the picture: every row labeled, and still drawn by its batch
    assert.strictEqual(element.rowCounts.batchedNodes, n, "every node is still on a batch");
    const nodes = element.graph.getNodes();
    assert.strictEqual(nodes.filter((node) => node.label !== undefined).length, n, "every node has its label");
    assert.isTrue(
        nodes.every((node) => !node.mesh.isDisposed()),
        "every node's anchor, which its label hangs from, is live",
    );
    const { meshes } = element.graph.scene;
    assert.isTrue(
        meshes.every((mesh) => !mesh.isDisposed()),
        "nothing the swaps let go is left in the scene",
    );
    assert.strictEqual(new Set(meshes).size, meshes.length, "no mesh is listed twice");
    element.remove();
    return { textures: scans.textures / n, meshes: scans.meshes / n };
}

describe("a label restyle on batched rows", () => {
    it("walks the scene a few times in all, not once per row, at 1,000 and 4,000 rows", async () => {
        const small = await perRow(1000);
        const large = await perRow(4000);
        const said = `per row at 1,000: ${JSON.stringify(small)}; at 4,000: ${JSON.stringify(large)}`;
        // Quadratic, each row walks every label and mesh made before it: about as many per row as there are rows.
        // Linear, a few whole-scene walks for the restyle as a whole, a handful per row at any size.
        for (const [rows, scans] of [
            [1000, small],
            [4000, large],
        ] as const) {
            assert.isAtMost(scans.textures, PER_ROW, `textures visited per row at ${String(rows)}. ${said}`);
            assert.isAtMost(scans.meshes, PER_ROW, `meshes searched per row at ${String(rows)}. ${said}`);
        }
    });
});
