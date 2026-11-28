import type { Material } from "@babylonjs/core/Materials/material.js";
import { MaterialPluginBase } from "@babylonjs/core/Materials/materialPluginBase.js";
import { ShaderLanguage } from "@babylonjs/core/Materials/shaderLanguage.js";
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

/** The name the halo depth plugin is registered under on a material. */
const BEHIND_MIDDLE = "GraphtyHaloBehindMiddle";

/**
 * How far behind the plane through the node's middle a halo is kept, as a share of each vertex's distance from the
 * middle: past the depth of the flat rings drawn there (a border slab is a fiftieth of the node across, centered on
 * that plane).
 */
const BEHIND_SHARE = 0.1;

/*
 * Moved along the line from the eye, so the vertex lands on the same pixel and only its depth changes: to the plane
 * through the node's middle square to the line from the eye, plus BEHIND_SHARE of its reach. A vertex behind the eye
 * is left alone. The eye is the view matrix's inverse translation. A triangle with every vertex on or behind that
 * plane lies on or behind it, so no fragment of the halo comes in front of the rings.
 */
const PUSH_GLSL = `#ifndef MULTIVIEW
{
    vec3 haloEye = -(view[3].xyz * mat3(view));
    vec3 haloMid = finalWorld[3].xyz;
    vec3 haloLine = haloMid - haloEye;
    float haloMidAt = length(haloLine);
    float haloAt = dot(worldPos.xyz - haloEye, haloLine) / haloMidAt;
    float haloBehind = haloMidAt + ${String(BEHIND_SHARE)} * distance(worldPos.xyz, haloMid);
    if (haloAt > 0.0 && haloAt < haloBehind) {
        gl_Position = viewProjection * vec4(haloEye + (worldPos.xyz - haloEye) * (haloBehind / haloAt), 1.0);
    }
}
#endif
`;

const PUSH_WGSL = `#ifndef MULTIVIEW
{
    let haloTurn = mat3x3f(scene.view[0].xyz, scene.view[1].xyz, scene.view[2].xyz);
    let haloEye = -(scene.view[3].xyz * haloTurn);
    let haloMid = finalWorld[3].xyz;
    let haloLine = haloMid - haloEye;
    let haloMidAt = length(haloLine);
    let haloAt = dot(worldPos.xyz - haloEye, haloLine) / haloMidAt;
    let haloBehind = haloMidAt + ${String(BEHIND_SHARE)} * distance(worldPos.xyz, haloMid);
    if (haloAt > 0.0 && haloAt < haloBehind) {
        vertexOutputs.position = scene.viewProjection * vec4f(haloEye + (worldPos.xyz - haloEye) * (haloBehind / haloAt), 1.0);
    }
}
#endif
`;

/**
 * Keeps a solid's halo behind the plane through its node's middle (issue #10499).
 *
 * The halo is the solid scaled up, drawing only its far faces. On a sphere those all lie behind the node's middle,
 * but on a tetrahedron, a torus, or a box or cone seen at an angle, some far faces lie in front of it -- and the
 * border, the outer border and the plates of a solid are flat rings drawn in that plane, turned to the camera. The
 * halo painted over them: the border read a fifth of its width and the outer border went missing on a third of the
 * rays. No setting on the material can do it (a depth offset is in depth-buffer units, not world units, and a
 * rendering group of its own would put every other node and edge over the halo too), so the vertex shader moves
 * each halo vertex in front of that plane back along its line from the eye to just behind it.
 */
class HaloBehindMiddle extends MaterialPluginBase {
    /**
     * Attach to one material, enabled at once.
     * @param material - The halo's material.
     */
    constructor(material: Material) {
        super(material, BEHIND_MIDDLE, 900, {}, true, true);
    }

    /**
     * The name Babylon keys this plugin's shader code on.
     * @returns The name.
     */
    override getClassName(): string {
        return BEHIND_MIDDLE;
    }

    /**
     * Whether a material's shader language has code here.
     * @returns True: both do.
     */
    override isCompatible(): boolean {
        return true;
    }

    /**
     * The vertex code, in the language the material compiles to.
     * @param shaderType - "vertex" or "fragment".
     * @param shaderLanguage - GLSL or WGSL.
     * @returns The code, or null for the fragment shader.
     */
    override getCustomCode(shaderType: string, shaderLanguage?: ShaderLanguage): Record<string, string> | null {
        if (shaderType !== "vertex") {
            return null;
        }

        return { CUSTOM_VERTEX_MAIN_END: shaderLanguage === ShaderLanguage.WGSL ? PUSH_WGSL : PUSH_GLSL };
    }
}

/**
 * Keep a solid's halo behind the rings drawn through its node's middle, in a perspective view; see
 * {@link HaloBehindMiddle}. Only for a halo a perspective camera draws: under an orthographic one the line from the
 * eye is not the line a pixel is seen along.
 * @param material - A halo material from {@link createOverlayMaterial}.
 */
export function keepBehindMiddle(material: Material): void {
    if (material.pluginManager?.getPlugin(BEHIND_MIDDLE)) {
        return;
    }

    new HaloBehindMiddle(material); // eslint-disable-line sonarjs/constructor-for-side-effects -- the base constructor attaches it to the material
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
    // a solid's halo in 3D keeps behind its rings, a shader of its own (keepBehindMiddle); the rest draw without
    for (const behind of [false, true]) {
        const material = createOverlayMaterial(
            "graphty-overlay-shader-material",
            DEFAULT_SELECTION_STYLE.color,
            DEFAULT_SELECTION_STYLE.opacity,
            scene,
        );
        if (behind) {
            keepBehindMiddle(material);
        }
        // Not added to the mesh, so disposing the mesh leaves the shader it holds alone.
        const holder = new SubMesh(0, 0, 0, 0, 0, mesh, undefined, false, false);
        // Asking starts the compile; the shader finishes compiling on its own, off this call.
        material.isReadyForSubMesh(mesh, holder, true);
        material.dispose();
    }
    mesh.dispose();
}
