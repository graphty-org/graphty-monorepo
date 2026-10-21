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
export const SHADER_PRESET_BODIES: Readonly<Record<string, () => Promise<string>>> = Object.freeze({
    "glass-marble": async () => (await import("./glass-marble/body")).BODY,
    gemstone: async () => (await import("./gemstone/body")).BODY,
    "disco-ball": async () => (await import("./disco-ball/body")).BODY,
    "lantern-glow": async () => (await import("./lantern-glow/body")).BODY,
    "dew-drop": async () => (await import("./dew-drop/body")).BODY,
});

/**
 * Each heavy preset's small-size program, by id, loaded on first use: the cheaper body the element
 * draws for a whole batch while the median node on screen is under 12 px (design section 5).
 */
export const SHADER_PRESET_LOW_DETAIL: Readonly<Record<string, () => Promise<string>>> = Object.freeze({
    "glass-marble": async () => (await import("./glass-marble/body")).LOW_DETAIL,
    gemstone: async () => (await import("./gemstone/body")).LOW_DETAIL,
    "disco-ball": async () => (await import("./disco-ball/body")).LOW_DETAIL,
    "lantern-glow": async () => (await import("./lantern-glow/body")).LOW_DETAIL,
});
