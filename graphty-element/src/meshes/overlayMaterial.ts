import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { SubMesh } from "@babylonjs/core/Meshes/subMesh.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { DEFAULT_SELECTION_STYLE } from "../config";
import { readColor } from "./readColor";

/**
 * The material an overlay -- a selection halo or a context point -- is drawn with: unlit, in one
 * color.
 *
 * Unlit on purpose: an overlay is a marker, and a marker that changes shade as the camera orbits
 * reads as another node rather than as an annotation on one.
 * @param name - The material's name.
 * @param color - The color, as a hex string.
 * @param alpha - How opaque it is, in `[0, 1]`.
 * @param scene - The scene.
 * @returns The material.
 */
export function createOverlayMaterial(name: string, color: string, alpha: number, scene: Scene): StandardMaterial {
    const material = new StandardMaterial(name, scene);
    material.disableLighting = true;
    const painted = readColor(color, DEFAULT_SELECTION_STYLE.color);
    material.emissiveColor = painted.rgb;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    material.alpha = alpha * painted.alpha;
    return material;
}

/** The scenes whose overlay shader has been prepared. */
const prepared = new WeakSet<Scene>();

/**
 * Compile the overlay material's shader in a scene before the first overlay needs it.
 *
 * THE FIRST SELECTION AFTER A LOAD PAID FOR THIS COMPILE (issue #10124): the halo's source mesh
 * and material are built on first use, and on a real GPU compiling the material's shader held
 * back the frame that drew the selection by about 300 ms on a 99,000-node graph, against no
 * compile at all for every later selection. Called once per scene right after the first frame
 * that shows its nodes, inside a load that is drawing new frames anyway: asked for while the first
 * node source was built, the compile held back that first frame by about 40 ms in the load-time
 * benchmark (issue #10396).
 *
 * Babylon keeps a compiled shader in its engine's cache while anything holds it, and the
 * temporary submesh below keeps holding it after the mesh it was asked for is disposed, so a halo
 * material built later finds its shader ready. A halo's shader depends on no more of its mesh
 * than this one has -- positions, drawn as instances, unlit, so normals and texture coordinates
 * are never read -- and nothing of the color or opacity, so one compile serves every halo and
 * every context point of the scene.
 * @param scene - The scene.
 */
export function prepareOverlayShader(scene: Scene): void {
    if (prepared.has(scene)) {
        return;
    }

    prepared.add(scene);
    const mesh = new Mesh("graphty-overlay-shader", scene);
    const data = new VertexData();
    data.positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
    data.indices = [0, 1, 2];
    data.applyToMesh(mesh);
    mesh.setEnabled(false);
    const material = createOverlayMaterial(
        "graphty-overlay-shader-material",
        DEFAULT_SELECTION_STYLE.color,
        DEFAULT_SELECTION_STYLE.opacity,
        scene,
    );
    // Not added to the mesh, so disposing the mesh leaves the shader it holds alone.
    const holder = new SubMesh(0, 0, 0, 0, 0, mesh, undefined, false, false);
    // Asking starts the compile; the shader finishes compiling on its own, off this call.
    material.isReadyForSubMesh(mesh, holder, true);
    mesh.dispose();
    material.dispose();
}
