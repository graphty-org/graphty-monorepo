import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { Scene } from "@babylonjs/core/scene.js";

/**
 * Make Babylon's list of what may be drawn skip the meshes that are switched off (#6040).
 *
 * An unfrozen frame walks the candidate list twice -- once before the draw and once to choose
 * what is drawn -- and each disabled mesh still pays a readiness check, a vertex count and a
 * per-camera lookup before Babylon finds it disabled and moves on. On the default render path every
 * node is a mesh instance of its own, and a time window hides most of them, so a step that thaws the
 * frozen list spent most of that walk on nodes nobody draws: about two thirds of 100,000.
 *
 * The list keeps the scene's own order, so instances and translucent meshes are drawn in exactly
 * the order they were before, and a mesh switched on is in the next list it is asked for. Only a
 * mesh's own switch is read here; an enabled mesh under a disabled parent stays in and Babylon
 * skips it as it always did.
 * @param scene - The scene whose candidate list is narrowed.
 */
export function drawOnlyEnabledMeshes(scene: Scene): void {
    const data: AbstractMesh[] = [];
    const candidates = { data, length: 0 };
    scene.getActiveMeshCandidates = (): typeof candidates => {
        const { meshes } = scene;
        let count = 0;
        for (const mesh of meshes) {
            if (mesh.isEnabled(false)) {
                data[count++] = mesh;
            }
        }

        data.length = count;
        candidates.length = count;
        return candidates;
    };
}
