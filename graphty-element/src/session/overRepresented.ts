/**
 * @file Which values of the categorical columns occur in a group more often than chance.
 *
 * For every group of a partition (a community run's `group`, or any categorical path) and every
 * value a group member carries, the count in the group is tested against the hypergeometric
 * draw of the group's size from the whole partition: the upper-tail p is the chance of seeing
 * that many or more. Dozens of columns times hundreds of values make thousands of tests, so the p
 * values are adjusted by Benjamini-Hochberg over EVERY test performed -- including the values that
 * turn out under-represented and are not returned -- or chance results read as findings.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: it is counting over values handed in.
 */

import type { Path } from "../catalog/types";
import type { OverRepresentedGroup, OverRepresentedValue, OverRepresentedValues } from "./types";

/** A value one element carries: a scalar, or each scalar of a list. */
type Scalar = string | number | boolean;

/**
 * The scalars a value stands for: itself, or the distinct scalars of a list.
 * @param value - the stored value
 * @returns the scalars, empty when nothing usable is stored
 */
function scalarsOf(value: unknown): readonly Scalar[] {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return [value];
    }

    if (Array.isArray(value)) {
        const seen = new Set<Scalar>();
        for (const each of value as unknown[]) {
            if (typeof each === "string" || typeof each === "number" || typeof each === "boolean") {
                seen.add(each);
            }
        }

        return [...seen];
    }

    return [];
}

/**
 * The natural logarithms of 0! through n!.
 * @param n - the largest factorial needed
 * @returns `table[i] = ln(i!)`
 */
function logFactorials(n: number): Float64Array {
    const table = new Float64Array(n + 1);
    for (let i = 2; i <= n; i++) {
        table[i] = table[i - 1] + Math.log(i);
    }

    return table;
}

/**
 * The chance that a draw of `n` from `N`, of which `K` are marked, holds `k` or more marked.
 *
 * Summed from whichever side of the mode is shorter, stopping once a term no longer moves the sum.
 * @param lnF - log factorials up to at least N
 * @param N - the population
 * @param K - how many of the population are marked
 * @param n - the draw
 * @param k - the marked count observed in the draw
 * @returns the upper-tail p, from 0 to 1
 */
export function hypergeometricUpperTail(lnF: Float64Array, N: number, K: number, n: number, k: number): number {
    const low = Math.max(0, n - (N - K));
    const high = Math.min(K, n);
    if (k <= low) {
        return 1;
    }

    if (k > high) {
        return 0;
    }

    const lnTotal = lnF[N] - lnF[n] - lnF[N - n];
    const term = (i: number): number =>
        Math.exp(lnF[K] - lnF[i] - lnF[K - i] + lnF[N - K] - lnF[n - i] - lnF[N - K - n + i] - lnTotal);
    const mode = Math.floor(((n + 1) * (K + 1)) / (N + 2));
    let sum = 0;
    if (k > mode) {
        // Terms fall from k upward.
        for (let i = k; i <= high; i++) {
            const t = term(i);
            sum += t;
            if (t <= sum * Number.EPSILON) {
                break;
            }
        }

        return Math.min(1, sum);
    }

    // Terms fall from k - 1 downward; the upper tail is what the lower one leaves.
    for (let i = k - 1; i >= low; i--) {
        const t = term(i);
        sum += t;
        if (t <= sum * Number.EPSILON) {
            break;
        }
    }

    return Math.min(1, Math.max(0, 1 - sum));
}

/**
 * Benjamini-Hochberg adjusted p values, in the order the raw ones were given.
 * @param p - the raw p values
 * @returns the adjusted p values, each from its raw value to 1
 */
export function benjaminiHochberg(p: readonly number[]): Float64Array {
    const m = p.length;
    const order = Array.from(p.keys()).sort((a, b) => p[a] - p[b]);
    const adjusted = new Float64Array(m);
    let running = 1;
    for (let rank = m; rank >= 1; rank--) {
        const at = order[rank - 1];
        running = Math.min(running, (p[at] * m) / rank);
        adjusted[at] = running;
    }

    return adjusted;
}

/** One column, as the test reads it. */
export interface OverRepresentedColumn {
    /** The column's path. */
    readonly path: Path;
    /** The value an element carries, by element index. */
    valueAt(index: number): unknown;
}

/** A test performed, before its p is adjusted. */
interface Test {
    readonly group: Scalar;
    readonly path: Path;
    readonly value: Scalar;
    readonly count: number;
    readonly expected: number;
    readonly p: number;
}

/**
 * Test every value of one column in every group.
 * @param column - the column
 * @param groups - each element's group, undefined when it has none
 * @param lnF - log factorials up to at least the element count
 * @returns one test per group and value a member carries
 */
function testColumn(column: OverRepresentedColumn, groups: readonly (Scalar | undefined)[], lnF: Float64Array): Test[] {
    // The population is the grouped elements that carry the column; a missing value is no draw.
    let carriers = 0;
    const carriersIn = new Map<Scalar, number>();
    const withValue = new Map<Scalar, number>();
    const inGroup = new Map<Scalar, Map<Scalar, number>>();
    groups.forEach((group, index) => {
        const values = group === undefined ? [] : scalarsOf(column.valueAt(index));
        if (group === undefined || values.length === 0) {
            return;
        }

        carriers++;
        carriersIn.set(group, (carriersIn.get(group) ?? 0) + 1);
        const tally = inGroup.get(group) ?? new Map<Scalar, number>();
        inGroup.set(group, tally);
        for (const value of values) {
            withValue.set(value, (withValue.get(value) ?? 0) + 1);
            tally.set(value, (tally.get(value) ?? 0) + 1);
        }
    });

    const tests: Test[] = [];
    for (const [group, tally] of inGroup) {
        const n = carriersIn.get(group) ?? 0;
        for (const [value, k] of tally) {
            const K = withValue.get(value) ?? 0;
            tests.push({
                group,
                path: column.path,
                value,
                count: k,
                expected: (n * K) / carriers,
                p: hypergeometricUpperTail(lnF, carriers, K, n, k),
            });
        }
    }

    return tests;
}

/**
 * Test every value of every column in every group, and correct over all of the tests.
 * @param groupBy - the path holding each element's group
 * @param groupAt - the group of an element, by index
 * @param count - how many elements there are
 * @param columns - the columns to test
 * @returns the over-represented values per group, with the correction named
 */
export function overRepresentedValues(
    groupBy: Path,
    groupAt: (index: number) => unknown,
    count: number,
    columns: readonly OverRepresentedColumn[],
): OverRepresentedValues {
    const groups: (Scalar | undefined)[] = [];
    const sizes = new Map<Scalar, number>();
    for (let index = 0; index < count; index++) {
        const group = groupAt(index);
        const scalar =
            typeof group === "string" || typeof group === "number" || typeof group === "boolean" ? group : undefined;
        groups.push(scalar);
        if (scalar !== undefined) {
            sizes.set(scalar, (sizes.get(scalar) ?? 0) + 1);
        }
    }

    const lnF = logFactorials(count);
    const tests = columns.flatMap((column) => testColumn(column, groups, lnF));

    const adjusted = benjaminiHochberg(tests.map((test) => test.p));
    const byGroup = new Map<Scalar, OverRepresentedValue[]>();
    tests.forEach((test, at) => {
        if (test.count <= test.expected) {
            return;
        }

        const row: OverRepresentedValue = Object.freeze({
            path: test.path,
            value: test.value,
            count: test.count,
            expected: test.expected,
            p: test.p,
            adjustedP: adjusted[at],
        });
        const rows = byGroup.get(test.group);
        if (rows === undefined) {
            byGroup.set(test.group, [row]);
        } else {
            rows.push(row);
        }
    });

    const result: OverRepresentedGroup[] = [...sizes]
        .sort((a, b) => b[1] - a[1])
        .map(([group, size]) => {
            const values = (byGroup.get(group) ?? []).sort(
                (a, b) => a.adjustedP - b.adjustedP || a.p - b.p || b.count - a.count,
            );
            return Object.freeze({ group, size, values: Object.freeze(values) });
        });

    return Object.freeze({
        groupBy,
        correction: "benjamini-hochberg",
        testCount: tests.length,
        groups: Object.freeze(result),
    });
}
