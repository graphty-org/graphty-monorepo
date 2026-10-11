/**
 * Exact equivalence classes: every property's values partition the elements (null is a block of its own), and
 * properties with identical partitions form one family, explained once.
 */

import type { StyleValue } from "../types.js";

/**
 * A group of properties that partition the elements the same way.
 */
export interface Family {
    /** The properties, in the order they were given. */
    readonly props: string[];
    /** Each element's block: 0 for null, 1.. by first appearance. */
    readonly blocks: Int32Array;
    /** The number of non-null blocks. */
    readonly k: number;
    /** The elements with a value (block above 0), ascending. */
    readonly styled: number[];
}

/**
 * The text a value is compared by.
 * @param v - the value
 * @returns a key unique per value and type
 */
export function valueKey(v: string | number | boolean | null | undefined): string {
    return v === null || v === undefined ? "\u0000null" : `${typeof v}:${String(v)}`;
}

/**
 * The partition of the elements by a property's values.
 * @param values - the values by element
 * @returns each element's block (0 for null, then by first appearance) and the number of non-null blocks
 */
function partition(values: readonly (StyleValue | null)[]): { blocks: Int32Array; k: number } {
    const ids = new Map<string, number>();
    const blocks = new Int32Array(values.length);
    for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (v === null) {
            continue;
        }
        const key = valueKey(v);
        let id = ids.get(key);
        if (id === undefined) {
            id = ids.size + 1;
            ids.set(key, id);
        }
        blocks[i] = id;
    }
    return { blocks, k: ids.size };
}

/**
 * A hash of a block array.
 * @param blocks - the blocks
 * @returns its hash
 */
function hashBlocks(blocks: Int32Array): number {
    let h = 0x811c9dc5;
    for (const b of blocks) {
        h = Math.imul(h ^ b, 0x01000193);
    }
    return h >>> 0;
}

/**
 * Whether two block arrays are equal.
 * @param a - one
 * @param b - the other
 * @returns true when equal
 */
function sameBlocks(a: Int32Array, b: Int32Array): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Groups properties by identical partitions.
 * @param props - the properties, each with its values
 * @returns the families, in the order of their first property
 */
export function familiesOf(props: readonly (readonly [string, readonly (StyleValue | null)[]])[]): Family[] {
    const byHash = new Map<number, Family[]>();
    const out: Family[] = [];
    for (const [p, values] of props) {
        const { blocks, k } = partition(values);
        const h = hashBlocks(blocks);
        const list = byHash.get(h) ?? [];
        const hit = list.find((f) => sameBlocks(f.blocks, blocks));
        if (hit !== undefined) {
            hit.props.push(p);
            continue;
        }
        const styled: number[] = [];
        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i] !== 0) {
                styled.push(i);
            }
        }
        const fam: Family = { props: [p], blocks, k, styled };
        list.push(fam);
        byHash.set(h, list);
        out.push(fam);
    }
    return out;
}
