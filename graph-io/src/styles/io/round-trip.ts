/**
 * The round-trip repair every styled format shares: for a file graphty wrote, a value read from the format's own
 * drawing keys that is only what graphty's writer writes for the `graphty.styles` block's exact value (a pentagon
 * written as a hexagon, an opacity rounded to 255 steps) is read as the block's value, so a re-import gives back the
 * same rules. A value another program changed since stays the truth. Each format passes what its writer writes for an
 * element, read back the way its reader reads it.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { styleFingerprint } from "../plan/features.js";
import { resolveStyles } from "../plan/resolve.js";
import type { ExtractedStyles, StyleColumn, StyleProperty, StyleTarget, StyleValue } from "../types.js";
import { blockStyles, parseStyleBlock } from "./block.js";

/** One element's value of a property, null when it has none. */
export type ElementValues = (property: string) => StyleValue | null;

/** The block's values of a property, one per element. */
type BlockValues = (target: StyleTarget, property: string) => readonly (StyleValue | null)[];

/**
 * The values a `graphty.styles` block gives every element, worked out once per property.
 * @param snapshot - the graph
 * @param ex - the block's styles
 * @returns the block's values
 */
function blockValues(snapshot: GraphSnapshot, ex: ExtractedStyles): BlockValues {
    const cache = new Map<string, readonly (StyleValue | null)[]>();
    return (target, property) => {
        const key = `${target} ${property}`;
        let held = cache.get(key);
        if (held === undefined) {
            held = resolveStyles(ex, target, property as StyleProperty, snapshot);
            cache.set(key, held);
        }
        return held;
    };
}

/**
 * Each element's values of the properties a writer writes, as a getter per element; any other property reads as null.
 * @param picture - each element's value of a property
 * @param target - nodes or edges
 * @param properties - the properties the writer writes
 * @returns the getter
 */
export function elementValues(
    picture: BlockValues,
    target: StyleTarget,
    properties: readonly string[],
): (i: number) => ElementValues {
    const columns = new Map<string, readonly (StyleValue | null)[]>();
    for (const p of properties) {
        columns.set(p, picture(target, p));
    }
    return (i) => (property) => columns.get(property)?.[i] ?? null;
}

/** One target's round trip, as a format describes it. */
interface RoundTrip {
    /** The values the reader read, per property; a property whose values change gets a new array. */
    readonly values: Partial<Record<string, StyleColumn>>;
    /** The properties compared with the block's. */
    readonly properties: Iterable<string>;
    /** The properties the writer is given the block's values of; any other reads as null. Default: every one. */
    readonly writes?: readonly string[];
    /**
     * An element's block values written the way the writer writes them and read back the way the reader reads them.
     * @param i - the element
     * @param want - the element's block values
     * @returns the values read back, or null when the element is not compared
     */
    readBack(i: number, want: ElementValues): ElementValues | null;
    /**
     * Whether a property's value of an element may be taken from the block at all (before comparing). Default: always.
     * @param property - the property
     * @param wanted - the block's value
     * @param native - the value read
     */
    take?(property: string, wanted: StyleValue | null, native: StyleValue | null): boolean;
}

/**
 * Wherever a value read is not the block's but is what the writer writes for the block's value, takes the block's.
 * @param target - nodes or edges
 * @param n - the element count
 * @param block - the block's values
 * @param trip - the target's round trip; its values change in place
 */
function takeBlockValues(target: StyleTarget, n: number, block: BlockValues, trip: RoundTrip): void {
    const { values } = trip;
    const get = blockGetter(target, block, trip.writes);
    const properties = [...trip.properties];
    const changed = new Map<string, (StyleValue | null)[]>();
    for (let i = 0; i < n; i++) {
        const want = get(i);
        const back = trip.readBack(i, want);
        if (back === null) {
            continue;
        }
        for (const property of properties) {
            const w = want(property);
            if (takes(trip, property, w, values[property]?.[i] ?? null, back)) {
                columnOf(changed, values, property, n)[i] = w;
            }
        }
    }
    for (const [property, column] of changed) {
        values[property] = column;
    }
}

/**
 * Each element's block values, limited to the properties the writer is given when it is given only some.
 * @param target - nodes or edges
 * @param block - the block's values
 * @param writes - the properties the writer is given, or undefined for every one
 * @returns the element's values, by element
 */
function blockGetter(
    target: StyleTarget,
    block: BlockValues,
    writes: readonly string[] | undefined,
): (i: number) => ElementValues {
    if (writes !== undefined) {
        return elementValues(block, target, writes);
    }
    return (i) => (p) => block(target, p)[i] ?? null;
}

/**
 * Whether the block's value replaces the value read: the format allows it, they differ, and the value read is what the
 * writer writes for the block's value.
 * @param trip - the target's round trip
 * @param property - the property
 * @param wanted - the block's value
 * @param native - the value read
 * @param back - the element's block values written and read back
 * @returns whether to take the block's value
 */
function takes(
    trip: RoundTrip,
    property: string,
    wanted: StyleValue | null,
    native: StyleValue | null,
    back: ElementValues,
): boolean {
    return trip.take?.(property, wanted, native) !== false && native !== wanted && native === (back(property) ?? null);
}

/**
 * The changed copy of a property's values, made on first use.
 * @param changed - the changed copies so far
 * @param values - the values read
 * @param property - the property
 * @param n - the element count
 * @returns the property's changed copy
 */
function columnOf(
    changed: Map<string, (StyleValue | null)[]>,
    values: Partial<Record<string, StyleColumn>>,
    property: string,
    n: number,
): (StyleValue | null)[] {
    let column = changed.get(property);
    if (column === undefined) {
        const own = values[property];
        column = own === undefined ? new Array<StyleValue | null>(n).fill(null) : [...own];
        changed.set(property, column);
    }
    return column;
}

/**
 * For a file graphty wrote: wherever a value read from the format's own keys is not the `graphty.styles` block's
 * value but is what graphty's writer writes for it, takes the block's value, so a re-import gives back the same rules.
 * A block that does not parse or describes another graph changes nothing.
 * @param snapshot - the graph
 * @param text - the block's text, or null when the file has none
 * @param format - the format the block was read from
 * @param trip - each target's round trip, given the block's values and its styles; null leaves the target as read
 */
export function takeFromBlock(
    snapshot: GraphSnapshot,
    text: string | null,
    format: string,
    trip: (target: StyleTarget, block: BlockValues, styles: ExtractedStyles) => RoundTrip | null,
): void {
    const parsed = text === null ? null : parseStyleBlock(text, styleFingerprint(snapshot));
    const ex = parsed?.ok === true ? blockStyles(parsed.block, snapshot, format) : null;
    if (ex === null) {
        return;
    }
    const block = blockValues(snapshot, ex);
    for (const target of ["node", "edge"] as const) {
        const t = trip(target, block, ex);
        if (t !== null) {
            takeBlockValues(target, target === "node" ? snapshot.nodeCount : snapshot.edgeCount, block, t);
        }
    }
}
