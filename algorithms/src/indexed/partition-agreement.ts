import { withCode } from "../errors.js";

/** How far two groupings of the same elements agree. @public */
export interface PartitionAgreement {
    /**
     * The adjusted Rand index: 1 for the same grouping whatever the groups are called, around 0 for
     * chance agreement, below 0 for less than chance.
     */
    readonly adjustedRand: number;
    /**
     * The adjusted mutual information (arithmetic normalization, as scikit-learn's default): 1 for
     * the same grouping, around 0 for chance agreement.
     */
    readonly adjustedMutualInformation: number;
}

/**
 * Pairs out of a count.
 * @param n - The count
 * @returns n choose 2
 */
function pairs(n: number): number {
    return (n * (n - 1)) / 2;
}

/**
 * Counts each key.
 * @param keys - The keys
 * @returns How often each occurs
 */
function tally<K>(keys: Iterable<K>): Map<K, number> {
    const counts = new Map<K, number>();
    for (const key of keys) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

/**
 * The entropy of a grouping, from its group sizes.
 * @param sizes - The group sizes
 * @param n - The elements
 * @returns The entropy in nats
 */
function entropy(sizes: Iterable<number>, n: number): number {
    let h = 0;
    for (const size of sizes) {
        h -= (size / n) * Math.log(size / n);
    }
    return h;
}

/**
 * The mutual information two groupings share by chance, over every grouping with their group sizes
 * (Vinh, Epps and Bailey 2010). Groups of one size share one term, so many singletons stay cheap.
 * @param sizesA - The first grouping's group sizes
 * @param sizesB - The second grouping's group sizes
 * @param n - The elements
 * @returns The expected mutual information in nats
 */
function expectedMutualInformation(sizesA: Iterable<number>, sizesB: Iterable<number>, n: number): number {
    const logFactorial = new Float64Array(n + 1);
    for (let k = 2; k <= n; k++) {
        logFactorial[k] = logFactorial[k - 1] + Math.log(k);
    }
    const lf = (k: number): number => logFactorial[k];
    const countsB = [...tally(sizesB)];
    let emi = 0;
    for (const [a, timesA] of tally(sizesA)) {
        for (const [b, timesB] of countsB) {
            const fixed = lf(a) + lf(b) + lf(n - a) + lf(n - b) - lf(n);
            let term = 0;
            for (let nij = Math.max(1, a + b - n); nij <= Math.min(a, b); nij++) {
                const p = Math.exp(fixed - lf(nij) - lf(a - nij) - lf(b - nij) - lf(n - a - b + nij));
                term += (nij / n) * Math.log((n * nij) / (a * b)) * p;
            }
            emi += term * timesA * timesB;
        }
    }
    return emi;
}

/**
 * How far two groupings of the same elements agree: the adjusted Rand index and the adjusted mutual
 * information. Element `i` is in group `a[i]` of the first grouping and `b[i]` of the second; what
 * the groups are called does not matter. Two identical groupings (all one group, or all apart,
 * included) score 1 on both.
 * @param a - The first grouping's group of every element
 * @param b - The second grouping's group of every element
 * @returns Both measures
 * @throws {RangeError} E_BAD_OPTION when the two are not equally long
 * @public
 */
export function partitionAgreement(a: ArrayLike<string | number>, b: ArrayLike<string | number>): PartitionAgreement {
    if (a.length !== b.length) {
        throw withCode(
            new RangeError(`the groupings label ${a.length} and ${b.length} elements; they must label the same ones`),
            "E_BAD_OPTION",
        );
    }
    const n = a.length;
    const sizesA = tally(Array.from(a));
    const sizesB = tally(Array.from(b));
    const cells = new Map<string | number, Map<string | number, number>>();
    for (let i = 0; i < n; i++) {
        const row = cells.get(a[i]) ?? new Map<string | number, number>();
        row.set(b[i], (row.get(b[i]) ?? 0) + 1);
        cells.set(a[i], row);
    }

    let cellCount = 0;
    let index = 0;
    let mi = 0;
    for (const [groupA, row] of cells) {
        const sizeA = sizesA.get(groupA) ?? 0;
        for (const [groupB, count] of row) {
            cellCount++;
            index += pairs(count);
            mi += (count / n) * Math.log((n * count) / (sizeA * (sizesB.get(groupB) ?? 0)));
        }
    }
    // The same grouping under other names. Also the cases whose formulas are 0/0 (both all one
    // group, both all apart, no elements).
    if (cellCount === sizesA.size && cellCount === sizesB.size) {
        return { adjustedRand: 1, adjustedMutualInformation: 1 };
    }

    let sumA = 0;
    for (const size of sizesA.values()) {
        sumA += pairs(size);
    }
    let sumB = 0;
    for (const size of sizesB.values()) {
        sumB += pairs(size);
    }
    const expected = (sumA * sumB) / pairs(n);
    const adjustedRand = (index - expected) / ((sumA + sumB) / 2 - expected);

    const emi = expectedMutualInformation(sizesA.values(), sizesB.values(), n);
    const normalizer = (entropy(sizesA.values(), n) + entropy(sizesB.values(), n)) / 2;
    // As scikit-learn: keep a vanishing denominator off zero, on its own side.
    const denominator = normalizer - emi;
    const safe = denominator < 0 ? Math.min(denominator, -Number.EPSILON) : Math.max(denominator, Number.EPSILON);

    return { adjustedRand, adjustedMutualInformation: (mi - emi) / safe };
}
