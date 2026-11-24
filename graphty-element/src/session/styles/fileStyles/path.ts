/**
 * @file The paths of the values graphty-element computes per element from the graph itself, live
 * (`graphty.degree`, `graphty.inDegree`, `graphty.outDegree`), and the parsing of the paths a layer
 * graphty wrote into an older file may read (`graphty.style.<set>.<kind>.<key>`), so a load can
 * point such a layer at the data column holding the same values.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Path } from "../../../catalog/types";

/** The root of the paths older files' layers read per-element values at. */
const WRITTEN_ROOT = "graphty.style.";

/** A value the element computes from the graph itself, live. */
export type ComputedValue = "degree" | "indegree" | "outdegree";

/** The path of each computed value. */
const COMPUTED_PATHS: Readonly<Record<ComputedValue, Path>> = Object.freeze({
    degree: "graphty.degree",
    indegree: "graphty.inDegree",
    outdegree: "graphty.outDegree",
});

/** The computed value each path reads. */
const COMPUTED_BY_PATH: ReadonlyMap<Path, ComputedValue> = new Map(
    (Object.entries(COMPUTED_PATHS) as [ComputedValue, Path][]).map(([value, path]) => [path, value]),
);

/** A set name: lowercase, with no dot. */
const SET_NAME = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/**
 * The parts of a path a layer in an older graphty file reads.
 * @param path - The path.
 * @returns Its kind and key; undefined when it is under the root but malformed; null when it is
 *     any other path.
 */
export function parseWrittenStylePath(
    path: Path,
): { readonly kind: "node" | "edge"; readonly key: string } | undefined | null {
    if (!path.startsWith(WRITTEN_ROOT)) {
        return null;
    }

    const first = path.indexOf(".", WRITTEN_ROOT.length);
    const second = first === -1 ? -1 : path.indexOf(".", first + 1);
    if (second === -1) {
        return undefined;
    }

    const set = path.slice(WRITTEN_ROOT.length, first);
    const kind = path.slice(first + 1, second);
    const key = path.slice(second + 1);
    if (!SET_NAME.test(set) || (kind !== "node" && kind !== "edge") || key === "") {
        return undefined;
    }

    return { kind, key };
}

/**
 * The path a layer reads one computed value at.
 * @param value - The value.
 * @returns `graphty.degree`, `graphty.inDegree` or `graphty.outDegree`.
 */
export function computedPath(value: ComputedValue): Path {
    return COMPUTED_PATHS[value];
}

/**
 * The computed value a path reads.
 * @param path - The path.
 * @returns The value, or undefined for any other path.
 */
export function computedOf(path: Path): ComputedValue | undefined {
    return COMPUTED_BY_PATH.get(path);
}
