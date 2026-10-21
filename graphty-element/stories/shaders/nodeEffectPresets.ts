/**
 * @file The node-effect presets (design/rendering/shader-styles.md section 7.3), each as its
 * catalog entry and its GLSL body, for their stories and tests.
 *
 * A layer names a preset by its bare id once the preset list (`src/shaders/presets/index.ts`)
 * lists it. Until then, {@link presetId} registers the same descriptor and body under the
 * `preview/` namespace and returns that id, so the stories and tests draw exactly the preset's
 * program through the element's own path either way.
 *
 * ponytail: the preview registration is a bridge for the time before the preset list carries
 * these ids; once `catalog.shaders()` lists them, presetId returns the bare id and registers
 * nothing, and the bridge can be deleted.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { registerShader, shaderDescriptor } from "../../src/catalog/shaderRegistry";
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
 * The id a layer names a node-effect preset by: the bare id once the catalog lists it, else a
 * `preview/` registration of the same descriptor and body.
 * @param id - The preset's bare id.
 * @returns The id to write in `node.effects`.
 */
export function presetId(id: string): string {
    if (shaderDescriptor(id) !== undefined) {
        return id;
    }

    const preset = NODE_EFFECT_PRESETS.find((candidate) => candidate.descriptor.id === id);
    if (preset === undefined) {
        throw new Error(`"${id}" is not a node-effect preset`);
    }

    const previewId = `preview/${id}`;
    if (shaderDescriptor(previewId) === undefined) {
        const { origin: _origin, ...facts } = preset.descriptor;
        registerShader({ descriptor: { ...facts, id: previewId }, glsl: preset.body });
    }

    return previewId;
}
