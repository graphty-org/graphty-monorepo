/**
 * @file Which experiments a session or an element switches on.
 *
 * The element never reads the host page's URL, storage or environment to decide this: the page
 * passes the ids, and `featuresFromUrl` is here so it does not have to write the parser. Unknown
 * ids never throw, because a link made for a newer build can be opened on an older one.
 */

import { type FeatureId, FEATURES, GRADUATED_FEATURES } from "./registry";

/** What a session or element actually switched on, and the ids it did not recognise. */
export interface EnabledFeatures {
    /** The experiments switched on, in `FEATURES` order. */
    readonly enabled: readonly FeatureId[];
    /** Requested ids that are neither declared nor graduated; the consumer decides whether to show them. */
    readonly unknown: readonly string[];
}

let pageDefault: readonly string[] = Object.freeze([]);

/**
 * Set the experiments for every element and session on this page that names none of its own.
 * Read when each one is created; one already created keeps what it had.
 * @param ids - Experiment ids, or `"all"` for every declared experiment.
 * @example
 * ```ts
 * import { setDefaultFeatures } from "@graphty/graphty-element/extend";
 * setDefaultFeatures(["timeline"]);
 * ```
 */
export function setDefaultFeatures(ids: readonly string[]): void {
    pageDefault = Object.freeze([...ids]);
}

/**
 * The page default as it is now. No entry point exports it.
 * @returns The ids last passed to `setDefaultFeatures`.
 */
export function pageDefaultFeatures(): readonly string[] {
    return pageDefault;
}

/**
 * Resolve requested ids against this build's experiments.
 * @param requested - The ids asked for; absent means the page default (`setDefaultFeatures`).
 * @returns The experiments switched on and the ids not recognised, frozen. Never throws.
 */
export function resolveFeatures(requested?: readonly string[]): EnabledFeatures {
    const asked = new Set<string>();
    for (const raw of requested ?? pageDefault) {
        // A caller the types did not check may pass anything; only strings can name an id.
        const id = typeof raw === "string" ? raw.trim().toLowerCase() : "";
        if (id !== "") {
            asked.add(id);
        }
    }

    const all = asked.has("all");
    const enabled = FEATURES.filter((feature) => all || asked.has(feature.id)).map((feature) => feature.id);
    const known = new Set<string>([...FEATURES.map((feature) => feature.id), ...GRADUATED_FEATURES, "all"]);
    const unknown = [...asked].filter((id) => !known.has(id));
    return Object.freeze({ enabled: Object.freeze(enabled), unknown: Object.freeze(unknown) });
}

/**
 * Read experiment ids from a URL's query, such as `?features=timeline,location-map`.
 * @param url - The URL, usually `location.href`.
 * @param param - The query parameter to read.
 * @returns The ids, comma separated, trimmed, lowercased and without duplicates, unknown ones
 *     included; empty when the URL does not parse.
 * @example
 * ```ts
 * import { featuresFromUrl } from "@graphty/graphty-element/catalog";
 * element.features = featuresFromUrl(location.href);
 * ```
 */
export function featuresFromUrl(url: string | URL, param = "features"): string[] {
    let values: string[];
    try {
        values = new URL(url).searchParams.getAll(param);
    } catch {
        return [];
    }

    const ids = values.flatMap((value) => value.split(",")).map((id) => id.trim().toLowerCase());
    return [...new Set(ids.filter((id) => id !== ""))];
}
