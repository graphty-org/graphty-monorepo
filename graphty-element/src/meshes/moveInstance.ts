import type { AbstractMesh, InstancedMesh, Mesh } from "@babylonjs/core";

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
                instance.instancedBuffers[kind] = to.instancedBuffers[kind];
            }
        }
    }

    if (to.hasBoundingInfo) {
        const { minimum, maximum } = to.getBoundingInfo();
        instance.buildBoundingInfo(minimum, maximum);
    }

    instance._syncSubMeshes();
}

/**
 * Put meshes at the end of their scene's mesh list, in the order given, keeping the order of the
 * rest: where an instance built for them now would be.
 *
 * Babylon draws a source's instances in the order it meets them in `scene.meshes`, and a
 * translucent source when it meets its first instance there, so the order translucent nodes blend
 * in is their order in that list. A rebuilt node's new instance is added at the end; a node moved
 * by {@link moveInstance} is put there too, so a moved node blends as a rebuilt one would. One pass
 * over the list, however many meshes are moved.
 * @param moved - The meshes, all of one scene.
 */
export function drawLast(moved: readonly AbstractMesh[]): void {
    if (moved.length === 0) {
        return;
    }

    const last = new Set(moved);
    const { meshes } = moved[0].getScene();
    const found = new Set<AbstractMesh>();
    let kept = 0;
    for (const mesh of meshes) {
        if (last.has(mesh)) {
            found.add(mesh);
        } else {
            meshes[kept++] = mesh;
        }
    }

    meshes.length = kept;
    for (const mesh of last) {
        if (found.has(mesh)) {
            meshes.push(mesh);
        }
    }
}
