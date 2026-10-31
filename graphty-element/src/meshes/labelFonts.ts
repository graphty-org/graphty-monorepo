/**
 * @file The web fonts labels are drawn in, and the loads a scene waits on (issue #3531).
 *
 * A label is measured and drawn on a canvas with whatever face its font has at that moment. A web
 * font that is still loading draws in the fallback face, and the browser does not redraw a canvas
 * when the font arrives. So a label built in a font the page has not loaded yet asks
 * `document.fonts.load()` for it, and when that settles the scene's graph rebuilds the labels in
 * that family. Until then the load counts as unfinished work, so a wait for the final picture
 * covers it.
 *
 * Why `load()` per family and not the `loadingdone` event: Chromium dispatches `loadingdone` in a
 * later task than the one that marks the face loaded, so between the two nothing says the picture
 * is still going to change. The promise settles in step with the face.
 */

import type { Scene } from "@babylonjs/core";

import { forgetFontBoxes } from "./RichTextParser";

/** One scene's font loads: the families still loading, and who rebuilds when one lands. */
interface SceneFonts {
    readonly loading: Set<string>;
    /** The fonts already found loaded, so a scene of many labels asks the page once per font. */
    readonly loaded: Set<string>;
    onLoaded?: (families: ReadonlySet<string>) => void;
}

const scenes = new WeakMap<Scene, SceneFonts>();

/**
 * A scene's font loads, made on first use.
 * @param scene - The scene.
 * @returns Its record.
 */
function fontsOf(scene: Scene): SceneFonts {
    let fonts = scenes.get(scene);
    if (fonts === undefined) {
        fonts = { loading: new Set(), loaded: new Set() };
        scenes.set(scene, fonts);
    }

    return fonts;
}

/**
 * The family names of a CSS font-family list, unquoted and lower-cased, so two spellings of one
 * family compare equal.
 * @param list - A family list, such as `"Outfit", sans-serif`.
 * @returns The families.
 */
export function fontFamilies(list: string): string[] {
    return list
        .split(",")
        .map((family) =>
            family
                .trim()
                .replaceAll(/(^["'])|(["']$)/g, "")
                .toLowerCase(),
        )
        .filter((family) => family !== "");
}

/**
 * Note a font a label in a scene has just been drawn in: when the page has a face for it that is
 * not loaded, load it, and when it settles tell the scene's watcher which family landed. Each
 * family is loaded once at a time per scene.
 * @param scene - The scene the label is drawn in.
 * @param style - The font's style and weight, such as `italic bold`.
 * @param list - The font's family list.
 */
export function noteLabelFont(scene: Scene, style: string, list: string): void {
    const set = globalThis.document?.fonts as FontFaceSet | undefined;
    if (set === undefined) {
        return;
    }

    const fonts = fontsOf(scene);
    for (const family of fontFamilies(list)) {
        const spec = `${style} 16px "${family}"`;
        if (fonts.loading.has(family) || fonts.loaded.has(spec)) {
            continue;
        }

        // ponytail: a face added to the page after its family was found loaded here is not waited
        // for; clear `loaded` when the page's FontFaceSet changes if that case appears.
        if (set.check(spec)) {
            fonts.loaded.add(spec);
            continue;
        }

        fonts.loading.add(family);
        // Settled either way, the font is not asked for again: a face that failed to load still fails
        // `check`, and asking again from the rebuilt labels would load, fail and rebuild for ever.
        const settled = (): void => {
            fonts.loaded.add(spec);
            fonts.loading.delete(family);
        };
        const landed = (): void => {
            settled();
            // The font boxes read while the family drew in its fallback are the fallback's.
            forgetFontBoxes();
            fonts.onLoaded?.(new Set([family]));
        };
        // A face that fails to load leaves the labels in the fallback they were drawn in.
        void set.load(spec).then(landed, settled);
    }
}

/**
 * Rebuild a scene's labels as their fonts land: one watcher per scene, its graph.
 * @param scene - The scene.
 * @param onLoaded - Called with the families that loaded.
 * @returns Stops watching.
 */
export function watchFontLoads(scene: Scene, onLoaded: (families: ReadonlySet<string>) => void): () => void {
    const fonts = fontsOf(scene);
    fonts.onLoaded = onLoaded;
    return () => {
        if (fonts.onLoaded === onLoaded) {
            fonts.onLoaded = undefined;
        }
    };
}

/**
 * Whether a font a label in the scene was drawn in is still loading: its labels will be rebuilt.
 * @param scene - The scene.
 * @returns True while one is.
 */
export function labelFontsLoading(scene: Scene): boolean {
    return (scenes.get(scene)?.loading.size ?? 0) > 0;
}
