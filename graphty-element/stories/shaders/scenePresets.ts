/**
 * @file The scene presets (design/rendering/shader-styles.md section 7.5): the nebula background, as its
 * catalog entry and its GLSL body, for its stories and tests.
 *
 * A layer names a preset by its bare id, which the preset list (`src/shaders/presets/index.ts`)
 * carries.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { shaderDescriptor } from "../../src/catalog/shaderRegistry";
import type { ShaderDescriptor } from "../../src/catalog/shaders";
import { BODY as NEBULA } from "../../src/shaders/presets/nebula/body";
import { DESCRIPTOR as NEBULA_D } from "../../src/shaders/presets/nebula/descriptor";

/** A preset: its catalog entry and its body. */
export interface ScenePreset {
    readonly descriptor: ShaderDescriptor;
    readonly body: string;
}

/** The scene presets. */
export const SCENE_PRESETS: readonly ScenePreset[] = [{ descriptor: NEBULA_D, body: NEBULA }];

/**
 * The id a layer or a background names a scene preset by: its bare id, checked against the catalog.
 * @param id - The preset's bare id.
 * @returns The id to write in `background.shader` or a `node.shaders` use.
 */
export function presetId(id: string): string {
    if (shaderDescriptor(id) === undefined) {
        throw new Error(`"${id}" is not a scene preset the catalog lists`);
    }

    return id;
}
