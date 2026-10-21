/**
 * @file The scene presets (design/rendering/shader-styles.md section 7.5): the nebula background
 * and the soap-bubble and hull boundaries, each as its catalog entry and its GLSL body, for their
 * stories and tests.
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
 * The id a layer or a background names a scene preset by: the bare id once the catalog lists it,
 * else a `preview/` registration of the same descriptor and body.
 * @param id - The preset's bare id.
 * @returns The id to write in `background.shader` or `boundary.shader`.
 */
export function presetId(id: string): string {
    if (shaderDescriptor(id) !== undefined) {
        return id;
    }

    const preset = SCENE_PRESETS.find((candidate) => candidate.descriptor.id === id);
    if (preset === undefined) {
        throw new Error(`"${id}" is not a scene preset`);
    }

    const previewId = `preview/${id}`;
    if (shaderDescriptor(previewId) === undefined) {
        const { origin: _origin, ...facts } = preset.descriptor;
        registerShader({ descriptor: { ...facts, id: previewId }, glsl: preset.body });
    }

    return previewId;
}
