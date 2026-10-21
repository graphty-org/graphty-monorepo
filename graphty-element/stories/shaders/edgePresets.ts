/**
 * @file The edge presets (design/rendering/shader-styles.md section 7.4), each as its catalog entry
 * and its GLSL body, for their stories and tests.
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
import { BODY as COMET_TRACERS_BODY } from "../../src/shaders/presets/comet-tracers/body";
import { COMET_TRACERS } from "../../src/shaders/presets/comet-tracers/descriptor";
import { BODY as EDGE_CHANGE_BODY } from "../../src/shaders/presets/edge-change/body";
import { EDGE_CHANGE } from "../../src/shaders/presets/edge-change/descriptor";
import { BODY as EDGE_GLOW_BODY } from "../../src/shaders/presets/edge-glow/body";
import { EDGE_GLOW } from "../../src/shaders/presets/edge-glow/descriptor";
import { BODY as FIBER_OPTIC_BODY } from "../../src/shaders/presets/fiber-optic/body";
import { FIBER_OPTIC } from "../../src/shaders/presets/fiber-optic/descriptor";
import { BODY as FIBER_PACKETS_BODY } from "../../src/shaders/presets/fiber-packets/body";
import { FIBER_PACKETS } from "../../src/shaders/presets/fiber-packets/descriptor";

/** A preset: its catalog entry and its body. */
export interface EdgePreset {
    readonly descriptor: ShaderDescriptor;
    readonly body: string;
}

/** The five, in the design's order. */
export const EDGE_PRESETS: readonly EdgePreset[] = [
    { descriptor: FIBER_OPTIC, body: FIBER_OPTIC_BODY },
    { descriptor: FIBER_PACKETS, body: FIBER_PACKETS_BODY },
    { descriptor: COMET_TRACERS, body: COMET_TRACERS_BODY },
    { descriptor: EDGE_GLOW, body: EDGE_GLOW_BODY },
    { descriptor: EDGE_CHANGE, body: EDGE_CHANGE_BODY },
];

/**
 * The id a layer names an edge preset by: the bare id once the catalog lists it, else a
 * `preview/` registration of the same descriptor and body.
 * @param id - The preset's bare id.
 * @returns The id to write in `edge.shader` or `edge.effects`.
 */
export function presetId(id: string): string {
    if (shaderDescriptor(id) !== undefined) {
        return id;
    }

    const preset = EDGE_PRESETS.find((candidate) => candidate.descriptor.id === id);
    if (preset === undefined) {
        throw new Error(`"${id}" is not an edge preset`);
    }

    const previewId = `preview/${id}`;
    if (shaderDescriptor(previewId) === undefined) {
        const { origin: _origin, ...facts } = preset.descriptor;
        registerShader({ descriptor: { ...facts, id: previewId }, glsl: preset.body });
    }

    return previewId;
}
