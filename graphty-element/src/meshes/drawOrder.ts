import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { SubMesh } from "@babylonjs/core/Meshes/subMesh.js";
import { RenderingGroup } from "@babylonjs/core/Rendering/renderingGroup.js";

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

/** Meshes that blend at another mesh's distance among the translucent meshes: see {@link blendWith}. */
const blendsWith = new WeakMap<AbstractMesh, AbstractMesh>();

/**
 * Sort a mesh among the translucent meshes at another mesh's distance from the camera, or at its own.
 * A held node's own source blends at its look's batch's distance, so it ties with that batch exactly
 * whatever its shape's bounds, and the scene's mesh list sets their order (`NodeBatches.refill`).
 * @param mesh - The mesh.
 * @param with_ - The mesh whose distance it takes, or undefined for its own.
 */
export function blendWith(mesh: AbstractMesh, with_: AbstractMesh | undefined): void {
    if (with_ === undefined) {
        blendsWith.delete(mesh);
    } else {
        blendsWith.set(mesh, with_);
    }
}

/**
 * The distance Babylon sorts a translucent submesh by, taken from the mesh it blends with if any.
 * @param subMesh - The submesh, its own distance set by the pass.
 * @returns The distance.
 */
function blendDistanceOf(subMesh: SubMesh): number {
    const other = blendsWith.get(subMesh.getMesh());
    const at = other?.subMeshes?.[0];
    if (other === undefined || other.isDisposed() || at === undefined) {
        return subMesh._distanceToCamera;
    }

    // as the pass measures its own submeshes (`RenderingGroup._RenderSorted`), so a tie is exact
    const camera = other.getScene().activeCamera;
    return Vector3.Distance(at.getBoundingInfo().boundingSphere.centerWorld, camera?.globalPosition ?? Vector3.Zero());
}

/**
 * Babylon's `RenderingGroup.defaultTransparentSortCompare` (alpha index, then back to front), but a
 * mesh given another's distance with {@link blendWith} sorts at that distance. Every other mesh sorts
 * exactly as Babylon's own compare does.
 * @param a - A submesh.
 * @param b - Another.
 * @returns Negative when a draws first.
 */
export function transparentSortCompare(a: SubMesh, b: SubMesh): number {
    if (!blendsWith.has(a.getMesh()) && !blendsWith.has(b.getMesh())) {
        return RenderingGroup.defaultTransparentSortCompare(a, b);
    }

    return a._alphaIndex - b._alphaIndex || Math.sign(blendDistanceOf(b) - blendDistanceOf(a));
}
