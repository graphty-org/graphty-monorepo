import { type AbstractMesh, Color3, FresnelParameters, type Scene, type StandardMaterial } from "@babylonjs/core";

import { DEFAULT_LIGHTING, isLighting, type Lighting } from "../config/Lighting";

/**
 * @file What a 3D node's material and mesh carry for each {@link Lighting}.
 *
 * The scene's lights are RenderManager's; this file is the node half: the emissive floor, the rim
 * and, for "flat", no lighting and an outline. Both halves were measured together in
 * `stories/experiments/NodeLighting.stories.ts` (25 shapes x 4 colors x 12 rotations).
 */

/** Marks a material as a lit 3D node material, so a lighting change finds it. */
const NODE_MATERIAL_TAG = "graphtyLitNode";

/** The emissive floor, as a fraction of the node's color: keeps a shadowed side from going black. */
const EMISSIVE_FLOOR = 0.2;

/**
 * The studio rim: the emissive floor multiplied by up to {@link RIM_BOOST} toward the silhouette.
 * The floor is the node's own color, so the rim adds that color, never white.
 */
const RIM_BOOST = 1.8;
const RIM_POWER = 2.5;
const RIM_BIAS = 0.1;

/** The flat outline: object-space width and color. */
const OUTLINE_WIDTH = 0.05;
const OUTLINE_COLOR = new Color3(0.25, 0.25, 0.25);

/**
 * The lighting a scene is drawn with, as RenderManager last set it.
 * @param scene - The scene, if any.
 * @returns Its lighting, or the default.
 */
export function sceneLighting(scene: Scene | null | undefined): Lighting {
    const value: unknown = (scene?.metadata as { lighting?: unknown } | null | undefined)?.lighting;

    return isLighting(value) ? value : DEFAULT_LIGHTING;
}

/**
 * Whether a material is a lit 3D node material.
 * @param material - The material.
 * @returns True when {@link lightNodeMaterial} set it up.
 */
export function isNodeMaterial(material: unknown): material is StandardMaterial {
    const metadata = (material as { metadata?: Record<string, unknown> | null } | null)?.metadata;

    return metadata?.[NODE_MATERIAL_TAG] === true;
}

/**
 * Set a 3D node material up for a lighting. The caller freezes it afterwards (or re-freezes it).
 * @param mat - A 3D node material: its color in `diffuseColor`, or a gradient in `diffuseTexture`.
 * @param lighting - The lighting.
 */
export function lightNodeMaterial(mat: StandardMaterial, lighting: Lighting): void {
    mat.metadata = { ...(mat.metadata as Record<string, unknown> | null), [NODE_MATERIAL_TAG]: true };
    const flat = lighting === "flat";
    mat.disableLighting = flat;

    if (mat.diffuseTexture) {
        // A gradient has no emissive floor (see NodeMesh.createMaterial); flat draws the ramp as is.
        mat.emissiveTexture = flat ? mat.diffuseTexture : null;
    } else {
        mat.emissiveColor = mat.diffuseColor.scale(flat ? 1 : EMISSIVE_FLOOR);
    }

    const rim = new FresnelParameters();
    rim.isEnabled = lighting === "studio";
    rim.bias = RIM_BIAS;
    rim.power = RIM_POWER;
    rim.leftColor = new Color3(RIM_BOOST, RIM_BOOST, RIM_BOOST);
    rim.rightColor = Color3.White();
    mat.emissiveFresnelParameters = rim;
}

/**
 * Outline a 3D node mesh when it is drawn flat, and only then.
 * @param mesh - The node's source mesh.
 * @param lighting - The lighting.
 */
export function outlineNodeMesh(mesh: AbstractMesh, lighting: Lighting): void {
    mesh.renderOutline = lighting === "flat";
    mesh.outlineWidth = OUTLINE_WIDTH;
    mesh.outlineColor = OUTLINE_COLOR;
}
