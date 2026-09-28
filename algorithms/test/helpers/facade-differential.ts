/**
 * The facade parity check: the facade that replaced a legacy function must give, on every fixture,
 * the answer the legacy function gave there, as recorded in the suite's golden file -- exactly for
 * discrete results, within a relative tolerance for finite f64 scores, and in the same Map and Set
 * iteration order. A facade delegates only when this passes.
 */

import { expect } from "vitest";

import type { Graph } from "../../src/core/graph.js";
import { toSnapshotOrNull } from "../../src/indexed/to-snapshot.js";
import { legacyResult } from "./golden.js";

/** A named legacy graph, the shape `test/unit/indexed/port-fixtures.ts` returns. */
export interface FacadeFixture {
    readonly name: string;
    readonly graph: Graph;
}

/** Options of {@link expectFacadeMatchesLegacy}. */
interface FacadeParityOptions {
    /**
     * Relative tolerance for finite numbers: `|a - b| <= tolerance * max(1, |a|, |b|)`. Default 0,
     * which requires equal numbers. Use 1e-9 for f64 scores. A non-finite number (an infinite
     * distance) must match exactly whatever the tolerance.
     */
    readonly tolerance?: number;
}

/**
 * Compare `actual` with `expected` structurally, including what `toEqual` ignores and a legacy
 * caller can observe: Map and Set iteration order, a property set to undefined against a missing
 * one, and the prototype (an array is not a typed array). Object property order is not compared.
 * @param actual - The facade's result
 * @param expected - The legacy result
 * @param tolerance - See {@link FacadeParityOptions}
 * @param at - Where in the result this is, for the failure message
 */
export function expectSame(actual: unknown, expected: unknown, tolerance: number, at: string): void {
    if (typeof expected === "number" && typeof actual === "number") {
        if (actual === expected || (Number.isNaN(actual) && Number.isNaN(expected))) {
            return;
        }
        const message = `${at}: ${String(actual)} vs ${String(expected)}`;
        expect(Number.isFinite(actual) && Number.isFinite(expected), message).toBe(true);
        const bound = tolerance * Math.max(1, Math.abs(actual), Math.abs(expected));
        expect(Math.abs(actual - expected), message).toBeLessThanOrEqual(bound);
        return;
    }
    if (expected === null || typeof expected !== "object") {
        expect(actual, at).toBe(expected);
        return;
    }
    expect(actual !== null && typeof actual === "object", `${at} is an object`).toBe(true);
    expect(Object.getPrototypeOf(actual), `${at} prototype`).toBe(Object.getPrototypeOf(expected));
    if (expected instanceof Map) {
        const map = actual as Map<unknown, unknown>;
        expect([...map.keys()], `${at} keys in order`).toEqual([...expected.keys()]);
        for (const [key, value] of expected) {
            expectSame(map.get(key), value, tolerance, `${at}.get(${String(key)})`);
        }
        return;
    }
    if (expected instanceof Set) {
        expectSame([...(actual as Set<unknown>)], [...expected], tolerance, `${at} in order`);
        return;
    }
    if (Array.isArray(expected) || ArrayBuffer.isView(expected)) {
        const list = expected as ArrayLike<unknown>;
        const other = actual as ArrayLike<unknown>;
        expect(other.length, `${at}.length`).toBe(list.length);
        for (let i = 0; i < list.length; i++) {
            expectSame(other[i], list[i], tolerance, `${at}[${String(i)}]`);
        }
        return;
    }
    const record = expected as Record<string, unknown>;
    const other = actual as Record<string, unknown>;
    expect(Object.keys(other).sort(), `${at} keys`).toEqual(Object.keys(record).sort());
    for (const key of Object.keys(record)) {
        expectSame(other[key], record[key], tolerance, `${at}.${key}`);
    }
}

/**
 * Run `facade` on every fixture and assert it returns what the legacy implementation returned on
 * that fixture, as recorded in the suite's golden file (see `golden.ts`). Each fixture is first
 * frozen with checksums (unless a NaN weight rules a snapshot out), so the facade's own
 * `toSnapshot` call returns that snapshot and a facade that writes into a shared view fails here
 * rather than corrupting the next call.
 * @param fixtures - The graphs to compare on
 * @param facade - The facade that delegates to the port
 * @param options - The numeric tolerance
 */
export function expectFacadeMatchesLegacy(
    fixtures: readonly FacadeFixture[],
    facade: (graph: Graph) => unknown,
    options: FacadeParityOptions = {},
): void {
    const tolerance = options.tolerance ?? 0;
    for (const { name, graph } of fixtures) {
        // A graph with a NaN weight has no weighted snapshot; its facade may still run.
        const s = toSnapshotOrNull(graph, { checksum: true });
        const mutations = graph.mutationCount;
        const expected = legacyResult();
        const actual = facade(graph);
        expectSame(actual, expected, tolerance, name);
        expect(graph.mutationCount, `${name}: the graph was mutated`).toBe(mutations);
        s?.validate({ checksum: true });
    }
}
