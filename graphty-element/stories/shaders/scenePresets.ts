/**
 * @file The scene presets (design/rendering/shader-styles.md section 7.5): the nebula background
 * and the soap-bubble and hull group outlines, each as its catalog entry and its GLSL body, for their
 * stories and tests.
 *
 * A layer names a preset by its bare id, which the preset list (`src/shaders/presets/index.ts`)
 * carries.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { shaderDescriptor } from "../../src/catalog/shaderRegistry";
import type { ShaderDescriptor } from "../../src/catalog/shaders";
import { BODY as METABALL_HULL } from "../../src/shaders/presets/metaball-hull/body";
import { DESCRIPTOR as METABALL_HULL_D } from "../../src/shaders/presets/metaball-hull/descriptor";
import { BODY as NEBULA } from "../../src/shaders/presets/nebula/body";
import { DESCRIPTOR as NEBULA_D } from "../../src/shaders/presets/nebula/descriptor";
import { BODY as SOAP_BUBBLE } from "../../src/shaders/presets/soap-bubble/body";
import { DESCRIPTOR as SOAP_BUBBLE_D } from "../../src/shaders/presets/soap-bubble/descriptor";

/** A preset: its catalog entry and its body. */
export interface ScenePreset {
    readonly descriptor: ShaderDescriptor;
    readonly body: string;
}

/** The three, in the design's order. */
export const SCENE_PRESETS: readonly ScenePreset[] = [
    { descriptor: NEBULA_D, body: NEBULA },
    { descriptor: SOAP_BUBBLE_D, body: SOAP_BUBBLE },
    { descriptor: METABALL_HULL_D, body: METABALL_HULL },
];

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
