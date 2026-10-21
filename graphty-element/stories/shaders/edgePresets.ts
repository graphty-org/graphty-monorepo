/**
 * @file The edge presets (design/rendering/shader-styles.md section 7.4), each as its catalog entry
 * and its GLSL body, for their stories and tests.
 *
 * A layer names a preset by its bare id, which the preset list (`src/shaders/presets/index.ts`)
 * carries.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { shaderDescriptor } from "../../src/catalog/shaderRegistry";
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
 * The id a layer names a preset by: its bare id, checked against the catalog.
 * @param id - The preset's bare id.
 * @returns The id to write in `edge.shader` or `edge.effects`.
 */
export function presetId(id: string): string {
    if (shaderDescriptor(id) === undefined) {
        throw new Error(`"${id}" is not an edge preset the catalog lists`);
    }

    return id;
}
