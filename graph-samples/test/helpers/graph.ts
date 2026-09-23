/**
 * Naive reference computations over a SampleGraph, used to check the generators' structural
 * properties independently of their own code.
 */

import { expect } from "vitest";

import { type SampleGraph } from "../../src/types.js";

/**
 * The edges as [u, v] pairs.
 * @param g - the graph
 * @returns the pairs, in edge order
 */
export function pairs(g: SampleGraph): [number, number][] {
    return Array.from(g.src, (u, e) => [u, g.dst[e]]);
}

/**
 * The degree of every node (an undirected edge counts at both ends, a directed one too).
 * @param g - the graph
 * @returns the degrees
 */
export function degrees(g: SampleGraph): number[] {
    const d = new Array<number>(g.nodeCount).fill(0);
    for (let e = 0; e < g.src.length; e++) {
        d[g.src[e]]++;
        d[g.dst[e]]++;
    }
    return d;
}

/**
 * Assert the graph is well formed and simple: equal-length endpoint arrays, indices in range, no
 * self-loop, no repeated pair (unordered when undirected).
 * @param g - the graph
 */
export function expectSimple(g: SampleGraph): void {
    expect(g.src.length).toBe(g.dst.length);
    const seen = new Set<number>();
    for (let e = 0; e < g.src.length; e++) {
        const u = g.src[e];
        const v = g.dst[e];
        expect(u).toBeLessThan(g.nodeCount);
        expect(v).toBeLessThan(g.nodeCount);
        expect(u).not.toBe(v);
        const key = g.directed ? u * g.nodeCount + v : Math.min(u, v) * g.nodeCount + Math.max(u, v);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
    }
}

/**
 * The number of connected components, ignoring direction.
 * @param g - the graph
 * @returns the component count
 */
export function componentCount(g: SampleGraph): number {
    const parent = Array.from({ length: g.nodeCount }, (_, i) => i);
    const find = (x: number): number => {
        let r = x;
        while (parent[r] !== r) {
            r = parent[r];
        }
        while (parent[x] !== r) {
            const next = parent[x];
            parent[x] = r;
            x = next;
        }
        return r;
    };
    let count = g.nodeCount;
    for (let e = 0; e < g.src.length; e++) {
        const a = find(g.src[e]);
        const b = find(g.dst[e]);
        if (a !== b) {
            parent[a] = b;
            count--;
        }
    }
    return count;
}

/**
 * Assert two graphs are identical: same direction, node count, edge arrays in the same order and
 * the same columns.
 * @param a - the first graph
 * @param b - the second graph
 */
export function expectSameGraph(a: SampleGraph, b: SampleGraph): void {
    expect(a.directed).toBe(b.directed);
    expect(a.nodeCount).toBe(b.nodeCount);
    expect(Array.from(a.src)).toEqual(Array.from(b.src));
    expect(Array.from(a.dst)).toEqual(Array.from(b.dst));
    expect(a.nodeColumns).toEqual(b.nodeColumns);
}

/**
 * A 32-bit FNV-1a hash of the node count and both endpoint arrays: a compact golden value.
 * @param g - the graph
 * @returns the hash as 8 hex digits
 */
export function graphHash(g: SampleGraph): string {
    let h = 0x811c9dc5;
    const mix = (x: number): void => {
        for (let s = 0; s < 32; s += 8) {
            h ^= (x >>> s) & 0xff;
            h = Math.imul(h, 0x01000193);
        }
    };
    mix(g.nodeCount);
    for (let e = 0; e < g.src.length; e++) {
        mix(g.src[e]);
        mix(g.dst[e]);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
}
