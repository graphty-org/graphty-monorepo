/**
 * The opaque pool: the families nothing explains. Over their non-text, non-size properties each distinct joint tuple
 * of values is a style class, numbered 1..k by frequency in the style column `class`; a few classes become one group
 * rule each, more become one table keyed by the class. What is left is copied per element.
 */

import type { StyleRule, StyleTarget, StyleValue } from "../types.js";
import { STYLE_PROPERTIES } from "../vocabulary.js";
import { MIN_MAPPED } from "./discrete.js";
import { valueKey } from "./families.js";

/** The most style classes; more distinct tuples are copied per element. */
const MAX_CLASSES = 64;
/** At most this many classes become one group rule each. */
const MAX_CLASS_RULES = 4;
/** Sizes vary per element by nature and are never joined into a class. */
const SIZES: ReadonlySet<string> = new Set(["width", "height"]);
/** The style column holding each element's class. */
export const CLASS_COLUMN = "class";

/**
 * The style classes of an opaque pool.
 */
interface StyleClasses {
    /** The properties the classes explain. */
    readonly classed: readonly string[];
    /** The class of each element, 1..k, or null. */
    readonly column: (number | null)[];
    /** One group rule per class, or one mapping rule keyed by the class. */
    readonly rules: StyleRule[];
}

/**
 * Whether a property's values have few enough distinct values to be part of a class.
 * @param values - the values
 * @returns true when they do
 */
function fewValues(values: readonly (StyleValue | null)[]): boolean {
    const seen = new Set<string>();
    for (const v of values) {
        seen.add(valueKey(v));
        if (seen.size > MAX_CLASSES + 1) {
            return false;
        }
    }
    return true;
}

/**
 * One element's combination of values of the classable properties, as a key; null when it has none.
 * @param classable - the properties
 * @param truth - the values per property
 * @param i - the element
 * @returns the key
 */
function tupleKey(
    classable: readonly string[],
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
    i: number,
): string | null {
    let key = "";
    let any = false;
    for (const p of classable) {
        const v = (truth.get(p) ?? [])[i] ?? null;
        any ||= v !== null;
        key += `${valueKey(v)}\u0001`;
    }
    return any ? key : null;
}

/**
 * Finds the style classes of the opaque properties.
 * @param target - nodes or edges
 * @param props - the opaque properties
 * @param truth - the values per property
 * @param n - the element count
 * @param spend - spends work from the budget
 * @returns the classes, or null when the values have too many combinations
 */
export function styleClasses(
    target: StyleTarget,
    props: readonly string[],
    truth: ReadonlyMap<string, readonly (StyleValue | null)[]>,
    n: number,
    spend: (ops: number) => void,
): StyleClasses | null {
    const classable = props.filter(
        (p) => STYLE_PROPERTIES[target].get(p) !== "text" && !SIZES.has(p) && fewValues(truth.get(p) ?? []),
    );
    if (classable.length === 0) {
        return null;
    }
    spend(n * (classable.length + 1));
    const counts = new Map<string, { count: number; rep: number }>();
    const tupleOf = new Array<string | null>(n).fill(null);
    let withTuple = 0;
    for (let i = 0; i < n; i++) {
        const key = tupleKey(classable, truth, i);
        if (key === null) {
            continue;
        }
        withTuple++;
        tupleOf[i] = key;
        const c = counts.get(key);
        if (c === undefined) {
            counts.set(key, { count: 1, rep: i });
            if (counts.size > MAX_CLASSES) {
                return null;
            }
        } else {
            c.count++;
        }
    }
    if (counts.size === 0 || withTuple < MIN_MAPPED || counts.size * 2 > withTuple) {
        return null;
    }
    // classes by frequency, ties by first appearance (a stable sort)
    const order = Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);
    const rank = new Map(order.map(([key], j) => [key, j + 1]));
    const column = tupleOf.map((t) => (t === null ? null : (rank.get(t) ?? null)));
    const ref = { style: CLASS_COLUMN };
    const valueOf = (p: string, rep: number): StyleValue | null => (truth.get(p) ?? [])[rep] ?? null;
    const rules: StyleRule[] = [];
    if (order.length <= Math.min(MAX_CLASS_RULES, Math.floor(withTuple / 4))) {
        order.forEach(([, { count, rep }], j) => {
            const set: Record<string, StyleValue> = {};
            for (const p of classable) {
                const v = valueOf(p, rep);
                if (v !== null) {
                    set[p] = v;
                }
            }
            rules.push({
                id: `${target}.class.${String(j + 1)}`,
                target,
                role: "group",
                origin: "inferred",
                where: { eq: [ref, j + 1] },
                set,
                facts: { elements: count, reason: "STYLE_CLASS" },
            });
        });
    } else {
        const map: Record<string, { kind: "discrete"; by: { style: string }; table: [number, StyleValue][] }> = {};
        for (const p of classable) {
            const table: [number, StyleValue][] = [];
            order.forEach(([, { rep }], j) => {
                const v = valueOf(p, rep);
                if (v !== null) {
                    table.push([j + 1, v]);
                }
            });
            map[p] = { kind: "discrete", by: ref, table };
        }
        rules.push({
            id: `${target}.classes`,
            target,
            role: "mapping",
            origin: "inferred",
            where: { all: true },
            map,
            facts: { classes: order.length, elements: withTuple, reason: "STYLE_CLASS" },
        });
    }
    return { classed: classable, column, rules };
}
