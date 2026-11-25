import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { Scene } from "@babylonjs/core/scene.js";

/** What an instance draws: a node, whose row may change as rows are renumbered. */
interface RowOwner {
    readonly index: number;
}

/** The node each listed instance draws. */
const owners = new WeakMap<AbstractMesh, RowOwner>();
/** The highest row an instance of each source was listed for. */
const lastRow = new WeakMap<Mesh, number>();
/** Scenes listed an instance below a higher row of its source since they were last sorted. */
const unsorted = new WeakSet<Scene>();
/** Scenes that sort before each evaluation. */
const watched = new WeakSet<Scene>();

/**
 * Draw a node's instance among the other instances of its source in row order, as a batch draws
 * its rows on `"batched"`. Babylon draws a source's instances in the order `scene.meshes` lists
 * them, which is the order they were made: a node whose mesh was made again (its removal undone,
 * or a restyle into a look other nodes already wear) went to the end and blended over neighbors
 * it had blended under, and only on `"objects"` (issue #10030). Rows renumber in order, so a
 * sorted list stays sorted; only an instance listed below a higher row of its source sorts again,
 * once, before the next frame chooses what to draw.
 * @param mesh - The node's mesh.
 * @param owner - The node.
 */
export function drawInRowOrder(mesh: AbstractMesh, owner: RowOwner): void {
    if (!(mesh instanceof InstancedMesh)) {
        return;
    }

    owners.set(mesh, owner);
    const scene = mesh.getScene();
    const last = lastRow.get(mesh.sourceMesh) ?? -1;
    if (owner.index < last) {
        unsorted.add(scene);
    }

    lastRow.set(mesh.sourceMesh, Math.max(last, owner.index));
    if (!watched.has(scene)) {
        watched.add(scene);
        scene.onBeforeActiveMeshesEvaluationObservable.add(() => {
            if (unsorted.delete(scene)) {
                sortByRow(scene.meshes);
            }
        });
    }
}

/**
 * Put the listed instances in row order in the places they hold, leaving every other mesh where
 * it is.
 * @param meshes - The scene's meshes.
 */
function sortByRow(meshes: AbstractMesh[]): void {
    const places: number[] = [];
    const listed: AbstractMesh[] = [];
    meshes.forEach((mesh, at) => {
        if (owners.has(mesh)) {
            places.push(at);
            listed.push(mesh);
        }
    });
    listed.sort((a, b) => (owners.get(a)?.index ?? 0) - (owners.get(b)?.index ?? 0));
    places.forEach((at, i) => {
        meshes[at] = listed[i];
    });
}
