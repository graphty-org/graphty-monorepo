/**
 * @file The paths of the values graphty-element keeps per element beside the data: the style
 * value store (`graphty.style.<set>.<kind>.<key>`) and the live degrees (`graphty.degree`,
 * `graphty.inDegree`, `graphty.outDegree`).
 *
 * Every such path is built and parsed HERE and nowhere else. A proposal to move every per-element
 * value graphty keeps under one namespaced root (issue #2029) would change these helpers and
 * nothing that calls them.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Path } from "../../../catalog/types";

/** The root of every file-style path. */
const STYLE_ROOT = "graphty.style.";

/**
 * Which kind of element a file-style value belongs to.
 * @experimental file-styles
 */
export type FileStyleKind = "node" | "edge";

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

/** A set name: lowercase, with no dot (`values`, `values-2`). */
const NAMESPACE = /^[a-z0-9][a-z0-9_-]*$/;

/** A file-style path, parsed. */
export interface FileStylePathParts {
    readonly namespace: string;
    readonly kind: FileStyleKind;
    readonly key: string;
}

/**
 * Whether a string can be a file-style namespace.
 * @param namespace - The candidate.
 * @returns True for a lowercase name with no dot.
 */
export function isFileStyleNamespace(namespace: string): boolean {
    return namespace.length <= 64 && NAMESPACE.test(namespace);
}

/**
 * The path a layer reads one style value column at.
 * @param namespace - The set's name (`values`, `values-2`).
 * @param kind - Nodes or edges.
 * @param key - The column's key, which may hold dots (`member.3`).
 * @returns `graphty.style.<namespace>.<kind>.<key>`.
 */
export function fileStylePath(namespace: string, kind: FileStyleKind, key: string): Path {
    return `${STYLE_ROOT}${namespace}.${kind}.${key}`;
}

/**
 * Whether a path is under the file-style root, known or not.
 * @param path - The path.
 * @returns True for a path starting `graphty.style.`.
 */
export function isFileStylePath(path: Path): boolean {
    return path.startsWith(STYLE_ROOT);
}

/**
 * The parts of a file-style path.
 * @param path - The path.
 * @returns Its namespace, kind and key, or undefined when it is not a well-formed file-style path.
 */
export function parseFileStylePath(path: Path): FileStylePathParts | undefined {
    if (!isFileStylePath(path)) {
        return undefined;
    }

    const first = path.indexOf(".", STYLE_ROOT.length);
    const second = first === -1 ? -1 : path.indexOf(".", first + 1);
    if (second === -1) {
        return undefined;
    }

    const namespace = path.slice(STYLE_ROOT.length, first);
    const kind = path.slice(first + 1, second);
    const key = path.slice(second + 1);
    if (!isFileStyleNamespace(namespace) || (kind !== "node" && kind !== "edge") || key === "") {
        return undefined;
    }

    return { namespace, kind, key };
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
