/**
 * @file The pattern, state and sprite presets (design/rendering/shader-styles.md sections 7.1 and
 * 7.2: Patterns, Foil shimmer, Hologram, Frost, Sticker, Mandala), each as its catalog entry and
 * its GLSL body, for their stories and tests.
 *
 * A layer names a preset by its bare id, which the preset list (`src/shaders/presets/index.ts`)
 * carries.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { shaderDescriptor } from "../../src/catalog/shaderRegistry";
import type { ShaderDescriptor } from "../../src/catalog/shaders";
import { BODY as COLORBLIND_PATTERNS } from "../../src/shaders/presets/colorblind-patterns/body";
import { DESCRIPTOR as COLORBLIND_PATTERNS_D } from "../../src/shaders/presets/colorblind-patterns/descriptor";
import { BODY as FOIL_SHIMMER } from "../../src/shaders/presets/foil-shimmer/body";
import { DESCRIPTOR as FOIL_SHIMMER_D } from "../../src/shaders/presets/foil-shimmer/descriptor";
import { BODY as FROST } from "../../src/shaders/presets/frost/body";
import { DESCRIPTOR as FROST_D } from "../../src/shaders/presets/frost/descriptor";
import { BODY as HOLOGRAM } from "../../src/shaders/presets/hologram/body";
import { DESCRIPTOR as HOLOGRAM_D } from "../../src/shaders/presets/hologram/descriptor";
import { BODY as ICON_STICKER } from "../../src/shaders/presets/icon-sticker/body";
import { DESCRIPTOR as ICON_STICKER_D } from "../../src/shaders/presets/icon-sticker/descriptor";
import { BODY as MANDALA } from "../../src/shaders/presets/mandala/body";
import { DESCRIPTOR as MANDALA_D } from "../../src/shaders/presets/mandala/descriptor";

/** A preset: its catalog entry and its body. */
export interface PatternSpritePreset {
    readonly descriptor: ShaderDescriptor;
    readonly body: string;
}

/** The six, in the design's order. */
export const PATTERN_SPRITE_PRESETS: readonly PatternSpritePreset[] = [
    { descriptor: COLORBLIND_PATTERNS_D, body: COLORBLIND_PATTERNS },
    { descriptor: FOIL_SHIMMER_D, body: FOIL_SHIMMER },
    { descriptor: HOLOGRAM_D, body: HOLOGRAM },
    { descriptor: FROST_D, body: FROST },
    { descriptor: ICON_STICKER_D, body: ICON_STICKER },
    { descriptor: MANDALA_D, body: MANDALA },
];

/**
 * The id a layer names a preset by: its bare id, checked against the catalog.
 * @param id - The preset's bare id.
 * @returns The id to write in a `node.shaders` use and its `encode` keys.
 */
export function patternPresetId(id: string): string {
    if (shaderDescriptor(id) === undefined) {
        throw new Error(`"${id}" is not a pattern, state or sprite preset the catalog lists`);
    }

    return id;
}
