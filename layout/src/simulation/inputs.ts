/**
 * The per-node and per-arc inputs of the CPU simulations (design 9.3 resolveNodeVector / resolveWeights; D28:
 * inputs resolve by graph-format ROLE on both the CPU and the GPU path). The CPU path is the one that still accepts
 * the legacy id-keyed record (the element passes it today); the GPU package rejects that form and graphty-element
 * converts it into a role column at engine creation (design 9.4 item 10).
 */

import { type Column, expandEdges, type F32, type GraphSnapshot, type NodeId } from "@graphty/graph-format";

function numericValues(s: GraphSnapshot, name: string, column: Column): F32 {
    if (column.meta.components !== 1) {
        throw new RangeError(`node column "${name}" has ${column.meta.components} components; a node vector has one`);
    }
    switch (column.dtype) {
        case "f32":
        case "f64": {
            // gpuView is the f32 array itself for f32 and its cached f32 copy for f64
            const view = s.nodes.gpuView(name);
            return view instanceof Float32Array ? view : new Float32Array(view);
        }
        case "u32":
        case "i32":
            return new Float32Array(s.nodes.gpuView(name));
        case "u8":
            // gpuView packs u8 four to a word; the per-node bytes are column.data
            return new Float32Array(column.data);
        default:
            throw new TypeError(`node column "${name}" is ${column.dtype}, not numeric`);
    }
}

/**
 * Resolves a per-node vector: null -> the role-`mass` node column when present, else `fallback(i)` for every i;
 * a Float32Array of length n as given; a column name -> that numeric node column; the legacy record -> every id
 * through the id map, missing ids take the fallback.
 * @param spec - the option value
 * @param s - the snapshot
 * @param fallback - the default per index
 * @returns n values
 */
export function resolveNodeVector(
    spec: F32 | string | Readonly<Record<NodeId, number>> | null | undefined,
    s: GraphSnapshot,
    fallback: (i: number) => number,
): F32 {
    const n = s.nodeCount;
    if (spec === null || spec === undefined) {
        const byRole = s.nodes.byRole("mass");
        if (byRole !== null) {
            return numericValues(s, byRole.meta.name, byRole);
        }
        const out = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            out[i] = fallback(i);
        }
        return out;
    }
    if (spec instanceof Float32Array) {
        if (spec.length !== n) {
            throw new RangeError(`the node vector has ${spec.length} values, expected ${n}`);
        }
        return spec;
    }
    if (typeof spec === "string") {
        const column = s.nodes.get(spec);
        if (column === null) {
            throw new RangeError(`the option names node column "${spec}", which the snapshot does not hold`);
        }
        return numericValues(s, spec, column);
    }
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const value = spec[s.ids.idOf(i)];
        out[i] = value === undefined ? fallback(i) : value;
    }
    return out;
}

/**
 * Resolves per-arc weights: true -> `s.weights` (null when unweighted); a string -> a one-component f32 / f64 / u32 /
 * i32 edge column expanded to arcs; false / null / undefined -> null. The same dtype discipline as the GPU package's
 * resolveWeights: a u8, bool or dict column is rejected before gpuView, whose packed words / codes are not per-edge
 * values, and a string / list / json column is rejected as non-numeric.
 * @param spec - the option value
 * @param s - the snapshot
 * @returns arcCount weights, or null for "every weight is 1"
 */
export function resolveWeights(spec: boolean | string | null | undefined, s: GraphSnapshot): F32 | null {
    if (spec === true) {
        return s.weights;
    }
    if (spec === false || spec === null || spec === undefined) {
        return null;
    }
    const column = s.edges.get(spec);
    if (column === null) {
        throw new RangeError(`weight names edge column "${spec}", which the snapshot does not hold`);
    }
    if (column.meta.components !== 1) {
        throw new RangeError(`edge column "${spec}" has ${column.meta.components} components; a weight column has one`);
    }
    switch (column.dtype) {
        case "f32":
        case "f64":
        case "u32":
        case "i32": {
            // gpuView is the column's own array for f32 / u32 / i32 and its cached f32 copy for f64
            const expanded = expandEdges(s, s.edges.gpuView(spec));
            return expanded instanceof Float32Array ? expanded : new Float32Array(expanded);
        }
        default:
            throw new TypeError(`edge column "${spec}" is ${column.dtype}; a weight column is f32, f64, u32 or i32`);
    }
}
