import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";

/** The member of an instance Babylon keeps private: the source it draws from. */
interface InstanceSource {
    _sourceMesh: Mesh;
}

/**
 * Draw an instance from another source mesh of the same geometry, keeping the instance itself.
 *
 * Babylon offers no way to change an instance's source: the way it offers is to dispose the
 * instance and create one on the other source, which also disposes everything parented to it (a
 * node's label, border and halo) and costs a linear search of the scene's mesh list each way.
 * A node's opacity is its source's `visibility`, so a view that draws most nodes faint moved
 * every one of them to another source (issue #6047). This does what the constructor of
 * `InstancedMesh` does about its source, and nothing else: the instance keeps its place in the
 * scene, its parent, its children, its world matrix and its own instanced buffers.
 *
 * Only for a source whose geometry is the one the instance was drawn from: its bounding box is
 * taken from the new source, but nothing that hangs from the instance is measured again.
 * @param instance - The instance.
 * @param to - The source it is drawn from from now on.
 */
export function moveInstance(instance: InstancedMesh, to: Mesh): void {
    const from = instance.sourceMesh;
    if (from === to) {
        return;
    }

    from.removeInstance(instance);
    to.addInstance(instance);
    (instance as unknown as InstanceSource)._sourceMesh = to;
    instance._unIndexed = to._unIndexed;
    // An instanced buffer the new source registered and the old one did not starts at the
    // source's value, as Babylon's own factory starts every new instance.
    if (to.instancedBuffers) {
        instance.instancedBuffers ??= {};
        for (const kind of Object.keys(to.instancedBuffers)) {
            if (!(kind in instance.instancedBuffers)) {
                instance.instancedBuffers[kind] = to.instancedBuffers[kind] as unknown;
            }
        }
    }

    if (to.hasBoundingInfo) {
        const { minimum, maximum } = to.getBoundingInfo();
        // In the world where the instance stands: without the matrix Babylon boxes it at the origin, and nothing puts
        // it back, because the instance's world matrix is already up to date (issue #10066).
        instance.buildBoundingInfo(minimum, maximum, instance.worldMatrixFromCache);
    }

    instance._syncSubMeshes();
}
