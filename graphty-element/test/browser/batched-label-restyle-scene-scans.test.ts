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
 *
 * Removing many labeled nodes at once took the same walk: each node mesh's dispose visited every label's texture.
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
 * A graph of n nodes on a render path; on "batched" every row is drawn with no `Node`.
 * @param n - How many nodes.
 * @param path - The render path.
 * @returns The element.
 */
async function mounted(n: number, path: "batched" | "objects" = "batched"): Promise<Graphty> {
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
    element.graph.setRenderPath(path);
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
 * Label every node and wait until the labels are drawn.
 * @param element - The element.
 */
async function label(element: Graphty): Promise<void> {
    await element.session.styles.add({
        name: "labels",
        target: "node",
        selector: { match: "everything" },
        encode: { "node.label": { by: "data.id", scale: "passthrough" } },
    } as never);
    await element.waitForSettled();
    await element.waitForStableFrame();
}

/**
 * Count the scene walks an action makes.
 * @param element - The element.
 * @param action - The action.
 * @returns The walks.
 */
async function counted(element: Graphty, action: () => Promise<void>): Promise<Scans> {
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
        await action();
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
    const scans = await counted(element, () => label(element));
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

describe("removing many labeled nodes at once", () => {
    it("walks the label textures a few times in all, not once per node", async () => {
        const n = 1000;
        const element = await mounted(n, "objects");
        await label(element);
        assert.strictEqual(element.graph.scene.textures.length >= n, true, "every label has a texture");
        const scans = await counted(element, async () => {
            await element.session.data.removeNodes(Array.from({ length: n }, (_, id) => id));
            await element.waitForSettled();
            await element.waitForStableFrame();
        });
        // the picture: every node is gone
        assert.strictEqual(element.graph.getNodes().length, 0, "every node is removed");
        assert.isAtMost(scans.textures / n, PER_ROW, `textures visited per removed node: ${JSON.stringify(scans)}`);
    });
});
