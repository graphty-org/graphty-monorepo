/**
 * @file The node-effect presets (design/rendering/shader-styles.md section 7.3), each as its
 * catalog entry and its GLSL body, for their stories and tests.
 *
 * A layer names a preset by its bare id, which the preset list (`src/shaders/presets/index.ts`)
 * carries.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { shaderDescriptor } from "../../src/catalog/shaderRegistry";
import type { ShaderDescriptor } from "../../src/catalog/shaders";
import { BODY as CHANGE_FLASH } from "../../src/shaders/presets/change-flash/body";
import { DESCRIPTOR as CHANGE_FLASH_D } from "../../src/shaders/presets/change-flash/descriptor";
import { BODY as LOCK_ON_RETICLE } from "../../src/shaders/presets/lock-on-reticle/body";
import { DESCRIPTOR as LOCK_ON_RETICLE_D } from "../../src/shaders/presets/lock-on-reticle/descriptor";
import { BODY as ORBITING_SATELLITES } from "../../src/shaders/presets/orbiting-satellites/body";
import { DESCRIPTOR as ORBITING_SATELLITES_D } from "../../src/shaders/presets/orbiting-satellites/descriptor";
import { BODY as SHOCKWAVE } from "../../src/shaders/presets/shockwave/body";
import { DESCRIPTOR as SHOCKWAVE_D } from "../../src/shaders/presets/shockwave/descriptor";
import { BODY as UNCERTAINTY_AURA } from "../../src/shaders/presets/uncertainty-aura/body";
import { DESCRIPTOR as UNCERTAINTY_AURA_D } from "../../src/shaders/presets/uncertainty-aura/descriptor";

/** A preset: its catalog entry and its body. */
export interface NodeEffectPreset {
    readonly descriptor: ShaderDescriptor;
    readonly body: string;
}

/** The five, in the design's order. */
export const NODE_EFFECT_PRESETS: readonly NodeEffectPreset[] = [
    { descriptor: UNCERTAINTY_AURA_D, body: UNCERTAINTY_AURA },
    { descriptor: LOCK_ON_RETICLE_D, body: LOCK_ON_RETICLE },
    { descriptor: ORBITING_SATELLITES_D, body: ORBITING_SATELLITES },
    { descriptor: SHOCKWAVE_D, body: SHOCKWAVE },
    { descriptor: CHANGE_FLASH_D, body: CHANGE_FLASH },
];

/**
 * The id a layer names a preset by: its bare id, checked against the catalog.
 * @param id - The preset's bare id.
 * @returns The id to write in a `node.shaders` use.
 */
export function presetId(id: string): string {
    if (shaderDescriptor(id) === undefined) {
        throw new Error(`"${id}" is not a node-effect preset the catalog lists`);
    }

    return id;
}
