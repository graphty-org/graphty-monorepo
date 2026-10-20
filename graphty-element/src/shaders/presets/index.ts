/**
 * @file The element's own shader presets, as catalog data.
 *
 * Each preset owns a folder, `./<id>/`, holding `descriptor.ts` (catalog data, no GLSL) and
 * `body.ts` (the GLSL string). This file lists the descriptors, one import line per preset, so the
 * catalog loads no GLSL; the renderer loads the bodies when a layer first names a shader
 * (design/rendering/shader-styles.md section 8).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { ShaderDescriptor } from "../../catalog/shaders";

/** Every preset's descriptor, in catalog order. */
export const SHADER_PRESETS: readonly ShaderDescriptor[] = Object.freeze([]);
