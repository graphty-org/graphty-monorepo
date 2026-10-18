/**
 * A discrete mapping on one categorical feature: the feature's values fall inside the family's blocks, up to 20% of
 * the styled elements excepted, and the elements missing the feature may form their own group.
 */

import { type Family, valueKey } from "./families.js";
import type { FeatureInfo } from "./features.js";

/** Below this many styled elements anything explains anything: no mapping is tried. */
export const MIN_MAPPED = 8;
/** The most keys a discrete table may hold. */
const MAX_KEYS = 256;
/** The share of styled elements a mapping may get wrong; the replay moves them into the exceptions. */
const MAX_EXCEPTION_SHARE = 0.2;

/** A key of a discrete table, as the feature holds it. */
type KeyValue = string | number | boolean;

/**
 * A discrete mapping that explains a family.
 */
export interface DiscreteCandidate {
    /** The kind of candidate. */
    readonly type: "discrete";
    /** The feature the table reads. */
    readonly info: FeatureInfo;
    /** Each key (by its value key) with its raw value and the block it maps to. */
    readonly table: Map<string, { readonly raw: KeyValue; readonly block: number }>;
    /** The block the elements missing the feature share, or null. */
    readonly bucket: number | null;
    /** The description cost. */
    readonly cost: number;
}

/**
 * Tests a discrete mapping on one feature.
 * @param fam - the family
 * @param info - the feature
 * @param n - the element count
 * @param spend - spends work from the budget
 * @returns the candidate, or null when the feature does not explain the family
 */
export function discreteCandidate(
    fam: Family,
    info: FeatureInfo,
    n: number,
    spend: (ops: number) => void,
): DiscreteCandidate | null {
    const nF = fam.styled.length;
    if (!info.categorical || info.raw || nF < MIN_MAPPED) {
        return null;
    }
    if (info.distinct < 2 || info.distinct > Math.min(MAX_KEYS, nF / 2) || info.distinct >= 0.9 * n) {
        return null;
    }
    spend(n);
    const { values } = info.feature;
    const { votes, nullBlocks } = votesOf(fam, values);
    const { table, exceptions: wrong } = tableOf(votes);
    let exceptions = wrong;
    // never paint an element the file left unstyled
    const unstyledMissing = unstyledOf(fam, values, table, n);
    if (unstyledMissing === null) {
        return null;
    }
    // the elements missing the key form one group when they share one style (Gephi's "null" partition)
    let bucket: number | null = null;
    if (nullBlocks.size === 1 && !unstyledMissing) {
        bucket = nullBlocks.keys().next().value ?? null;
    } else {
        for (const c of nullBlocks.values()) {
            exceptions += c;
        }
    }
    if (exceptions > Math.max(2, MAX_EXCEPTION_SHARE * nF)) {
        return null;
    }
    const cost =
        50 + table.size * fam.props.length + (exceptions > 0 ? 50 + exceptions : 0) + (bucket === null ? 0 : 50);
    return { type: "discrete", info, table, bucket, cost };
}

/** How the styled elements of each key fall into the family's blocks. */
type Votes = Map<string, { raw: KeyValue; counts: Map<number, number> }>;

/**
 * Counts, per key of the feature, the styled elements in each block; and per block, those missing the feature.
 * @param fam - the family
 * @param values - the feature's values
 * @returns the votes, and the blocks of the elements missing the feature
 */
function votesOf(fam: Family, values: readonly (KeyValue | null)[]): { votes: Votes; nullBlocks: Map<number, number> } {
    const votes: Votes = new Map();
    const nullBlocks = new Map<number, number>();
    for (const i of fam.styled) {
        const b = fam.blocks[i];
        const kv = values[i];
        if (kv === null) {
            nullBlocks.set(b, (nullBlocks.get(b) ?? 0) + 1);
            continue;
        }
        const key = valueKey(kv);
        let vote = votes.get(key);
        if (vote === undefined) {
            vote = { raw: kv, counts: new Map() };
            votes.set(key, vote);
        }
        vote.counts.set(b, (vote.counts.get(b) ?? 0) + 1);
    }
    return { votes, nullBlocks };
}

/**
 * The table: each key maps to the block most of its elements are in; the others are exceptions.
 * @param votes - the votes
 * @returns the table and how many elements it gets wrong
 */
function tableOf(votes: Votes): { table: Map<string, { raw: KeyValue; block: number }>; exceptions: number } {
    const table = new Map<string, { raw: KeyValue; block: number }>();
    let exceptions = 0;
    for (const [key, { raw, counts }] of votes) {
        let best = -1;
        let bestCount = -1;
        let total = 0;
        for (const [b, c] of counts) {
            total += c;
            if (c > bestCount) {
                bestCount = c;
                best = b;
            }
        }
        table.set(key, { raw, block: best });
        exceptions += total - bestCount;
    }
    return { table, exceptions };
}

/**
 * Whether an element the file left unstyled misses the feature (or holds false, which a missing-key group's "not has"
 * also matches).
 * @param fam - the family
 * @param values - the feature's values
 * @param table - the table
 * @param n - the element count
 * @returns the answer, or null when the table would paint an unstyled element
 */
function unstyledOf(
    fam: Family,
    values: readonly (KeyValue | null)[],
    table: ReadonlyMap<string, unknown>,
    n: number,
): boolean | null {
    let missing = false;
    for (let i = 0; i < n; i++) {
        const v = values[i];
        if (fam.blocks[i] !== 0) {
            continue;
        }
        if (v !== null && table.has(valueKey(v))) {
            return null;
        }
        missing ||= v === null || v === false;
    }
    return missing;
}
