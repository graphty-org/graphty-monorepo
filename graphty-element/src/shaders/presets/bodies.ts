/**
 * @file The GLSL body of each of the element's shader presets, loaded only when something draws
 * or copies one (design/rendering/shader-styles.md section 8).
 *
 * One line per preset, each a lazy import of the preset's own `./<id>/body.ts`, so the catalog
 * (`./index.ts`) loads no GLSL and a preset's body is fetched with the renderer, not the page.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/** Each preset's body, by id, loaded on first use. */
export const SHADER_PRESET_BODIES: Readonly<Record<string, () => Promise<string>>> = Object.freeze({});
