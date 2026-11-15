/**
 * @file The lit-surface presets (design/rendering/shader-styles.md section 7.1), each as its
 * catalog entry and its GLSL body, for their stories and tests.
 *
 * A layer names a preset by its bare id, which the preset list (`src/shaders/presets/index.ts`)
 * carries.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { shaderDescriptor } from "../../src/catalog/shaderRegistry";
import type { ShaderDescriptor } from "../../src/catalog/shaders";
import { BODY as ANODIZED_STEEL } from "../../src/shaders/presets/anodized-steel/body";
import { DESCRIPTOR as ANODIZED_STEEL_D } from "../../src/shaders/presets/anodized-steel/descriptor";
import { BODY as CEL_SHADE } from "../../src/shaders/presets/cel-shade/body";
import { DESCRIPTOR as CEL_SHADE_D } from "../../src/shaders/presets/cel-shade/descriptor";
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

/** A preset: its catalog entry and its body. */
export interface LitSurfacePreset {
    readonly descriptor: ShaderDescriptor;
    readonly body: string;
}

/** The eight, in the design's order. */
export const LIT_SURFACE_PRESETS: readonly LitSurfacePreset[] = [
    { descriptor: MATCAP_INK_D, body: MATCAP_INK },
    { descriptor: PEARL_D, body: PEARL },
    { descriptor: CEL_SHADE_D, body: CEL_SHADE },
    { descriptor: HALFTONE_D, body: HALFTONE },
    { descriptor: FROSTED_GLASS_D, body: FROSTED_GLASS },
    { descriptor: LIQUID_METAL_D, body: LIQUID_METAL },
    { descriptor: ANODIZED_STEEL_D, body: ANODIZED_STEEL },
];

/**
 * The id a layer names a preset by: its bare id, checked against the catalog.
 * @param id - The preset's bare id.
 * @returns The id to write in `node.shader` and `node.shaderParams`.
 */
export function presetId(id: string): string {
    if (shaderDescriptor(id) === undefined) {
        throw new Error(`"${id}" is not a lit-surface preset the catalog lists`);
    }

    return id;
}
