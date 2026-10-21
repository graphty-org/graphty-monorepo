/**
 * @file The lit-surface presets (design/rendering/shader-styles.md section 7.1), each as its
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
import { BODY as ANODIZED_STEEL } from "../../src/shaders/presets/anodized-steel/body";
import { DESCRIPTOR as ANODIZED_STEEL_D } from "../../src/shaders/presets/anodized-steel/descriptor";
import { BODY as CLEAR_GLASS } from "../../src/shaders/presets/clear-glass/body";
import { DESCRIPTOR as CLEAR_GLASS_D } from "../../src/shaders/presets/clear-glass/descriptor";
import { BODY as FROSTED_GLASS } from "../../src/shaders/presets/frosted-glass/body";
import { DESCRIPTOR as FROSTED_GLASS_D } from "../../src/shaders/presets/frosted-glass/descriptor";
import { BODY as HALFTONE } from "../../src/shaders/presets/halftone/body";
import { DESCRIPTOR as HALFTONE_D } from "../../src/shaders/presets/halftone/descriptor";
import { BODY as LIQUID_METAL } from "../../src/shaders/presets/liquid-metal/body";
import { DESCRIPTOR as LIQUID_METAL_D } from "../../src/shaders/presets/liquid-metal/descriptor";
import { BODY as MATCAP_INK } from "../../src/shaders/presets/matcap-ink/body";
import { DESCRIPTOR as MATCAP_INK_D } from "../../src/shaders/presets/matcap-ink/descriptor";
import { BODY as PEARL } from "../../src/shaders/presets/pearl/body";
import { DESCRIPTOR as PEARL_D } from "../../src/shaders/presets/pearl/descriptor";
import { BODY as TOON_OUTLINE } from "../../src/shaders/presets/toon-outline/body";
import { DESCRIPTOR as TOON_OUTLINE_D } from "../../src/shaders/presets/toon-outline/descriptor";

/** A preset: its catalog entry and its body. */
export interface LitSurfacePreset {
    readonly descriptor: ShaderDescriptor;
    readonly body: string;
}

/** The eight, in the design's order. */
export const LIT_SURFACE_PRESETS: readonly LitSurfacePreset[] = [
    { descriptor: MATCAP_INK_D, body: MATCAP_INK },
    { descriptor: CLEAR_GLASS_D, body: CLEAR_GLASS },
    { descriptor: PEARL_D, body: PEARL },
    { descriptor: TOON_OUTLINE_D, body: TOON_OUTLINE },
    { descriptor: HALFTONE_D, body: HALFTONE },
    { descriptor: FROSTED_GLASS_D, body: FROSTED_GLASS },
    { descriptor: LIQUID_METAL_D, body: LIQUID_METAL },
    { descriptor: ANODIZED_STEEL_D, body: ANODIZED_STEEL },
];

/**
 * The id a layer names a lit-surface preset by: the bare id once the catalog lists it, else a
 * `preview/` registration of the same descriptor and body.
 * @param id - The preset's bare id.
 * @returns The id to write in `node.shader` and `node.shaderParams`.
 */
export function presetId(id: string): string {
    if (shaderDescriptor(id) !== undefined) {
        return id;
    }

    const preset = LIT_SURFACE_PRESETS.find((candidate) => candidate.descriptor.id === id);
    if (preset === undefined) {
        throw new Error(`"${id}" is not a lit-surface preset`);
    }

    const previewId = `preview/${id}`;
    if (shaderDescriptor(previewId) === undefined) {
        const { origin: _origin, ...facts } = preset.descriptor;
        registerShader({ descriptor: { ...facts, id: previewId }, glsl: preset.body });
    }

    return previewId;
}
