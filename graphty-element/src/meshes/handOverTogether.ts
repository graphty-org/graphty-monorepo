import type { Node as SceneNode, Scene } from "@babylonjs/core";

/**
 * Run a step per item, each of which swaps scene nodes -- disposes one mesh or anchor and builds
 * another under the same parent -- without paying for the size of the scene on every swap.
 *
 * A disposed mesh leaves `scene.meshes` and its parent's child list each by an `indexOf` and a
 * `splice`. Every node hangs from the graph root, so handing a group of n nodes over to a batch,
 * or back, one at a time, scans both lists n times: quadratic, 11 s for 100k nodes (issue #3247).
 * Here both lists are set aside first, and what each step adds is moved aside after it, so a
 * step's removal finds the lists holding only what that step built. Afterwards the survivors go
 * back in their order, less any that a step disposed, followed by what the steps added.
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
    try {
        for (const item of items) {
            step(item);
            moveAll(meshes, addedMeshes);
            if (children !== null) {
                moveAll(children, addedChildren);
            }
        }
    } finally {
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
