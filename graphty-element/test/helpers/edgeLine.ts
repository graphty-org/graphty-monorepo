import type { AbstractMesh, Scene } from "@babylonjs/core";

import type { EdgeStyleConfig } from "../../src/config";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import type { MeshCache } from "../../src/meshes/MeshCache";
import type { PatternedLineMesh } from "../../src/meshes/PatternedLineMesh";

/**
 * What an edge style's line is drawn by, built the way `Edge` builds it: the mesh of the line
 * batch every edge of that appearance shares, or, for a patterned style, a patterned line.
 * @param cache - The mesh cache that owns the batches.
 * @param options - Edge mesh options.
 * @param options.styleId - The appearance's id, which keys its batch.
 * @param options.width - The line width.
 * @param options.color - The line colour.
 * @param style - The edge style.
 * @param scene - The scene.
 * @returns The batch's mesh, or the patterned line.
 */
export function edgeLineFor(
    cache: MeshCache,
    options: { styleId: string; width: number; color: string },
    style: EdgeStyleConfig,
    scene: Scene,
): AbstractMesh | PatternedLineMesh {
    return (
        EdgeMesh.lineBatch(cache, options, style, scene)?.mesh ?? EdgeMesh.createPatternedLine(options, style, scene)
    );
}
