/**
 * The Map section's facts the Map layout form reads too: which list entry a basemap setting is,
 * its name, and the id of the Source select a row elsewhere moves focus to.
 */

import { BASEMAP_SOURCE_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import type { BasemapConfig } from "@graphty/graphty-element/schema";

/** The list's values for a map of the reader's own, beside the catalog's source ids. */
export type Custom = "tiles" | "image";

/** The app's word for a map of the reader's own, by kind. */
export const CUSTOM_WORDS: Readonly<Record<Custom, string>> = { tiles: "Tiles", image: "Image" };

/** The bundled world map, drawn when no basemap is set. */
const DEFAULT_SOURCE = "natural-earth";

/** The id of the Map section's Source select, which the Map layout form's source row moves focus to. */
export const MAP_SOURCE_FIELD_ID = "graph-settings-map-source";

/**
 * The name of the map a basemap setting draws, as the Source list names it.
 * @param basemap - the project's basemap, or undefined.
 * @returns the name.
 */
export function mapSourceName(basemap: BasemapConfig | undefined): string {
    const choice = choiceOf(basemap);
    if (choice === "tiles" || choice === "image") {
        return CUSTOM_WORDS[choice];
    }
    if (choice === "none") {
        return "None";
    }
    return BASEMAP_SOURCE_DESCRIPTORS.find((source) => source.id === choice)?.plainName ?? choice;
}

/**
 * Which list entry a basemap setting is.
 * @param basemap - the project's basemap, or undefined.
 * @returns the entry's value.
 */
export function choiceOf(basemap: BasemapConfig | undefined): string {
    if (basemap === undefined) {
        return DEFAULT_SOURCE;
    }
    if ("source" in basemap) {
        return basemap.source;
    }
    return "tiles" in basemap ? "tiles" : "image";
}
