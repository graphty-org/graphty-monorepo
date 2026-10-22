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
    "matcap-ink": async () => (await import("./matcap-ink/body")).BODY,
    pearl: async () => (await import("./pearl/body")).BODY,
    "cel-shade": async () => (await import("./cel-shade/body")).BODY,
    halftone: async () => (await import("./halftone/body")).BODY,
    "glass-marble": async () => (await import("./glass-marble/body")).BODY,
    gemstone: async () => (await import("./gemstone/body")).BODY,
    "disco-ball": async () => (await import("./disco-ball/body")).BODY,
    lantern: async () => (await import("./lantern/body")).BODY,
    glass: async () => (await import("./glass/body")).BODY,
    "colorblind-patterns": async () => (await import("./colorblind-patterns/body")).BODY,
    "foil-shimmer": async () => (await import("./foil-shimmer/body")).BODY,
    hologram: async () => (await import("./hologram/body")).BODY,
    frost: async () => (await import("./frost/body")).BODY,
    "frosted-glass": async () => (await import("./frosted-glass/body")).BODY,
    "liquid-metal": async () => (await import("./liquid-metal/body")).BODY,
    "anodized-steel": async () => (await import("./anodized-steel/body")).BODY,
    "icon-sticker": async () => (await import("./icon-sticker/body")).BODY,
    mandala: async () => (await import("./mandala/body")).BODY,
    "uncertainty-aura": async () => (await import("./uncertainty-aura/body")).BODY,
    "lock-on-reticle": async () => (await import("./lock-on-reticle/body")).BODY,
    "orbiting-satellites": async () => (await import("./orbiting-satellites/body")).BODY,
    shockwave: async () => (await import("./shockwave/body")).BODY,
    "change-flash": async () => (await import("./change-flash/body")).BODY,
    "fiber-optic": async () => (await import("./fiber-optic/body")).BODY,
    "fiber-packets": async () => (await import("./fiber-packets/body")).BODY,
    "comet-tracers": async () => (await import("./comet-tracers/body")).BODY,
    "neon-line": async () => (await import("./neon-line/body")).BODY,
    "edge-change": async () => (await import("./edge-change/body")).BODY,
    nebula: async () => (await import("./nebula/body")).BODY,
    "soap-bubble": async () => (await import("./soap-bubble/body")).BODY,
    "metaball-hull": async () => (await import("./metaball-hull/body")).BODY,
});

/**
 * Each heavy preset's small-size program, by id, loaded on first use: the cheaper body the element
 * draws for a whole batch while the median node on screen is under 12 px (design section 5).
 */
export const SHADER_PRESET_LOW_DETAIL: Readonly<Record<string, () => Promise<string>>> = Object.freeze({
    "glass-marble": async () => (await import("./glass-marble/body")).LOW_DETAIL,
    gemstone: async () => (await import("./gemstone/body")).LOW_DETAIL,
    "disco-ball": async () => (await import("./disco-ball/body")).LOW_DETAIL,
    lantern: async () => (await import("./lantern/body")).LOW_DETAIL,
});
