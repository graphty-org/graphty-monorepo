/**
 * The facade parity check: a legacy function and the facade that replaces it run on the same
 * fixtures and must give the same answer -- exactly for discrete results, within a relative
 * tolerance for f64 scores. A facade delegates only when this passes.
 */

import { expect } from "vitest";

import type { Graph } from "../../src/core/graph.js";
import { toSnapshot } from "../../src/indexed/to-snapshot.js";

/** A named legacy graph, the shape `test/unit/indexed/port-fixtures.ts` returns. */
export interface FacadeFixture {
    readonly name: string;
    readonly graph: Graph;
}

/** Options of {@link expectFacadeMatchesLegacy}. */
interface FacadeParityOptions {
    /**
     * Relative tolerance for numbers: `|a - b| <= tolerance * max(1, |a|, |b|)`. Default 0, which
     * compares with `toEqual`. Use 1e-9 for f64 scores.
     */
    readonly tolerance?: number;
}

function expectNear(actual: unknown, expected: unknown, tolerance: number, at: string): void {
    if (typeof expected === "number" && typeof actual === "number") {
        if (actual !== expected && !(Number.isNaN(actual) && Number.isNaN(expected))) {
            const bound = tolerance * Math.max(1, Math.abs(actual), Math.abs(expected));
            expect(Math.abs(actual - expected), `${at}: ${String(actual)} vs ${String(expected)}`).toBeLessThanOrEqual(
                bound,
            );
        }
        return;
    }
    if (expected instanceof Map) {
        expect(actual, at).toBeInstanceOf(Map);
        const map = actual as Map<unknown, unknown>;
        expect([...map.keys()].map(String).sort(), `${at} keys`).toEqual([...expected.keys()].map(String).sort());
        for (const [key, value] of expected) {
            expectNear(map.get(key), value, tolerance, `${at}.get(${String(key)})`);
        }
        return;
    }
    if (Array.isArray(expected) || ArrayBuffer.isView(expected)) {
        const list = expected as ArrayLike<unknown>;
        const other = actual as ArrayLike<unknown>;
        expect(other.length, `${at}.length`).toBe(list.length);
        for (let i = 0; i < list.length; i++) {
            expectNear(other[i], list[i], tolerance, `${at}[${String(i)}]`);
        }
        return;
    }
    if (expected !== null && typeof expected === "object" && !(expected instanceof Set)) {
        const record = expected as Record<string, unknown>;
        const other = actual as Record<string, unknown>;
        expect(Object.keys(other).sort(), `${at} keys`).toEqual(Object.keys(record).sort());
        for (const key of Object.keys(record)) {
            expectNear(other[key], record[key], tolerance, `${at}.${key}`);
        }
        return;
    }
    expect(actual, at).toEqual(expected);
}

/**
 * Run `legacy` and `facade` on every fixture and assert the results agree. Each fixture is first
 * frozen with checksums, so the facade's own `toSnapshot` call returns that snapshot and a facade
 * that writes into a shared view fails here rather than corrupting the next call.
 * @param fixtures - The graphs to compare on
 * @param legacy - The legacy implementation
 * @param facade - The facade that delegates to the port
 * @param options - The numeric tolerance
 */
export function expectFacadeMatchesLegacy<R>(
    fixtures: readonly FacadeFixture[],
    legacy: (graph: Graph) => R,
    facade: (graph: Graph) => R,
    options: FacadeParityOptions = {},
): void {
    const tolerance = options.tolerance ?? 0;
    for (const { name, graph } of fixtures) {
        const s = toSnapshot(graph, { checksum: true });
        const mutations = graph.mutationCount;
        const expected = legacy(graph);
        const actual = facade(graph);
        if (tolerance === 0) {
            expect(actual, name).toEqual(expected);
        } else {
            expectNear(actual, expected, tolerance, name);
        }
        expect(graph.mutationCount, `${name}: the graph was mutated`).toBe(mutations);
        s.validate({ checksum: true });
    }
}
