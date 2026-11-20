import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { SubMesh } from "@babylonjs/core/Meshes/subMesh.js";

/*
 * Where a mesh draws among the opaque meshes of rendering group 0, when that is not where its
 * material puts it: a held node's own source, and the batch that draws a look's rows after them.
 */

/** Meshes drawn in another mesh's place in the opaque sort: see `MeshCache.sourceFor` and {@link drawAt}. */
const drawnInPlaceOf = new WeakMap<AbstractMesh, number>();

/**
 * Where a mesh sorts among the opaque meshes ({@link painterSortCompare}).
 * @param mesh - The mesh.
 * @returns Its order.
 */
export function drawOrderOf(mesh: AbstractMesh): number {
    return drawnInPlaceOf.get(mesh) ?? mesh.material?.uniqueId ?? mesh.uniqueId;
}

/**
 * Sort a mesh at another place among the opaque meshes than its material's, or back at its material's.
 * @param mesh - The mesh.
 * @param order - The place, or undefined for its material's.
 */
export function drawAt(mesh: AbstractMesh, order: number | undefined): void {
    if (order === undefined) {
        drawnInPlaceOf.delete(mesh);
    } else {
        drawnInPlaceOf.set(mesh, order);
    }
}

/**
 * Babylon's `RenderingGroup.PainterSortCompare` (by material creation, else by mesh), but a mesh
 * given a place with {@link drawAt} sorts there. A node whose mesh a consumer
 * read under `"batched"` draws from a source of its own, built after its look's border; sorted by
 * its own material it drew its fill over the border, and over every overlapping node, where the
 * shared source draws it under them. Every other mesh sorts exactly as Babylon's own compare does.
 * @param a - A submesh.
 * @param b - Another.
 * @returns Negative when a draws first.
 */
export function painterSortCompare(a: SubMesh, b: SubMesh): number {
    const meshA = a.getMesh();
    const meshB = b.getMesh();
    if (meshA.material && meshB.material) {
        return drawOrderOf(meshA) - drawOrderOf(meshB);
    }

    return meshA.uniqueId - meshB.uniqueId;
}
