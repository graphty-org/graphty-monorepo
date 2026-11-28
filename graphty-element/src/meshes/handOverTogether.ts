import type { Node as SceneNode } from "@babylonjs/core";
import type { Scene } from "@babylonjs/core/scene.js";

/**
 * Run a step per item, each of which swaps scene nodes -- disposes one mesh or anchor and builds
 * another under the same parent -- without paying for the size of the scene on every swap.
 *
 * A disposed mesh leaves `scene.meshes` and its parent's child list each by an `indexOf` and a
 * `splice`, and frees the scene's rendering groups, a visit to every texture in the scene (one per
 * label, issue #10018). Every node hangs from the graph root, so handing a group of n nodes over to a batch,
 * or back, one at a time, scans both lists n times: quadratic, 11 s for 100k nodes (issue #3247).
 * Here both lists are set aside first, and what each step adds is moved aside after it, so a
 * step's removal finds the lists holding only what that step built. Afterwards the survivors go
 * back in their order, less any that a step disposed, followed by what the steps added. The
 * rendering groups are freed once, before the first step, and each dispose skips freeing them.
 *
 * Unlike `disposeReleased` (DataManager), nothing is dropped up front: a step disposes exactly
 * what it hands over, and the children of what it disposes move to what replaces it.
 *
 * No frame runs inside: the steps are synchronous.
 * @param scene - The scene.
 * @param parent - The parent the swapped nodes hang from, or null.
 * @param items - The items.
 * @param step - Swaps one item's scene nodes.
 */
export function handOverTogether<T>(
    scene: Scene,
    parent: SceneNode | null,
    items: Iterable<T>,
    step: (item: T) => void,
): void {
    const { meshes } = scene;
    // Babylon has no public way to edit a node's child list in place; `getChildren()` copies it.
    const children = (parent as unknown as { _children?: SceneNode[] | null } | null)?._children ?? null;
    const keptMeshes = meshes.splice(0);
    const keptChildren = children?.splice(0) ?? [];
    const addedMeshes: typeof keptMeshes = [];
    const addedChildren: SceneNode[] = [];
    // Setting the block frees the active meshes and rendering groups once; nothing is drawn until it lifts.
    const blocked = scene.blockfreeActiveMeshesAndRenderingGroups;
    scene.blockfreeActiveMeshesAndRenderingGroups = true;
    try {
        for (const item of items) {
            step(item);
            moveAll(meshes, addedMeshes);
            if (children !== null) {
                moveAll(children, addedChildren);
            }
        }
    } finally {
        scene.blockfreeActiveMeshesAndRenderingGroups = blocked;
        moveAll(meshes, addedMeshes);
        restore(meshes, keptMeshes, addedMeshes, (mesh) => !mesh.isDisposed());
        if (children !== null) {
            moveAll(children, addedChildren);
            restore(children, keptChildren, addedChildren, (child) => child.parent === parent && !child.isDisposed());
        }
    }
}

/**
 * Move everything in one list onto the end of another, emptying the first.
 * @param from - The list to empty.
 * @param to - The list that takes its items.
 */
function moveAll<T>(from: T[], to: T[]): void {
    for (const item of from) {
        to.push(item);
    }

    from.length = 0;
}

/**
 * Fill an emptied list with the survivors it held, then what was added while it was empty.
 * @param list - The list.
 * @param kept - What it held before.
 * @param added - What was added since.
 * @param alive - Whether an item still belongs in it.
 */
function restore<T>(list: T[], kept: readonly T[], added: readonly T[], alive: (item: T) => boolean): void {
    for (const item of kept) {
        if (alive(item)) {
            list.push(item);
        }
    }

    for (const item of added) {
        if (alive(item)) {
            list.push(item);
        }
    }
}

/** The scene nodes {@link disposeLater} set aside while {@link disposeSwappedTogether} runs; null outside it. */
let swapped: SceneNode[] | null = null;

/**
 * Run work that swaps many rows' meshes for a batch's anchors one row at a time (a paint that builds
 * rows' `Node`s and hands each to its batch), and dispose what the swaps let go together when it ends.
 *
 * Disposed one at a time, each mesh walked the scene: `scene.freeRenderingGroups()` visits every
 * texture (one per label), and leaving `scene.meshes` and the graph root's child list is an `indexOf`
 * over each. Labeling n batched rows cost n times the scene (issue #10018). Here the rendering groups
 * are freed once, and the lists are set aside once ({@link handOverTogether}).
 *
 * Nested calls join the outermost one. No frame runs inside: the work is synchronous, so what waits to
 * be disposed is never drawn.
 * @param work - The work.
 * @returns What `work` returns.
 */
export function disposeSwappedTogether<T>(work: () => T): T {
    if (swapped !== null) {
        return work();
    }

    const doomed: SceneNode[] = [];
    swapped = doomed;
    try {
        return work();
    } finally {
        swapped = null;
        disposeAll(doomed);
    }
}

/**
 * Dispose a mesh or anchor a swap let go: now, or with the rest when {@link disposeSwappedTogether} ends.
 * Whatever hangs from it has already moved to what replaced it.
 * @param node - The mesh or anchor.
 */
export function disposeLater(node: SceneNode): void {
    if (swapped === null) {
        node.dispose();
    } else {
        swapped.push(node);
    }
}

/**
 * Dispose scene nodes, paying for each scene's lists and rendering groups once.
 * @param doomed - The nodes.
 */
function disposeAll(doomed: readonly SceneNode[]): void {
    const byScene = new Map<Scene, SceneNode[]>();
    for (const node of doomed) {
        const scene = node.getScene();
        const list = byScene.get(scene) ?? [];
        list.push(node);
        byScene.set(scene, list);
    }

    for (const [scene, nodes] of byScene) {
        handOverTogether(scene, nodes[0].parent, nodes, (node) => {
            if (!node.isDisposed()) {
                node.dispose();
            }
        });
    }
}
