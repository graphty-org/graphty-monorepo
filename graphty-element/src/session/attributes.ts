/**
 * @file What attributes the graph's records carry, described as data.
 *
 * An options form, a filter builder, a colour encoding and a column picker all need the same
 * four facts about every attribute: what it is called, what type its values are, how many
 * records actually carry it, and what a few of its values look like. Each of those is a walk
 * over the graph, so each of them is the element's to do once rather than every consumer's to do
 * separately.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { AttributeDescriptor, AttributeType } from "../catalog/types";
import { ATTRIBUTE_SAMPLE_CAP, ATTRIBUTE_UNIQUE_CAP, type SessionRecordSource } from "./types";

/** What one attribute looked like as the walk accumulated it. */
interface Accumulator {
    /** How many records carried a value that was neither undefined nor null. */
    present: number;
    /** The value types seen, so a column of numbers and strings reports "mixed" rather than one. */
    readonly types: Set<AttributeType>;
    /** Distinct values, abandoned once there are more than {@link ATTRIBUTE_UNIQUE_CAP}. */
    unique: Set<unknown> | null;
    /** The smallest numeric value, when every value seen so far was a number. */
    min: number;
    /** The largest numeric value, when every value seen so far was a number. */
    max: number;
    /** The first few values, for a form that shows what it is about to filter on. */
    readonly samples: unknown[];
}

/**
 * The attribute type of one value.
 *
 * `"time"` is not inferred from a string here. Deciding that "2026-01" is a date and "1.10" is
 * not is a guess, and a guess that turns a version number into a timestamp is worse than no
 * answer at all; the time role arrives from the import plan, which is where a person can correct
 * it.
 * @param value - the value to classify
 * @returns its attribute type, or null when the value carries no information
 */
function classify(value: unknown): AttributeType | null {
    if (value === null || value === undefined) {
        return null;
    }

    switch (typeof value) {
        case "boolean":
            return "boolean";
        case "number":
            return Number.isInteger(value) ? "integer" : "number";
        case "string":
            return "string";
        default:
            return "mixed";
    }
}

/**
 * Fold one value into its attribute's accumulator.
 * @param accumulator - the accumulator for this attribute
 * @param value - the value one record carried
 */
function accumulate(accumulator: Accumulator, value: unknown): void {
    const type = classify(value);
    if (type === null) {
        return;
    }

    accumulator.present++;
    accumulator.types.add(type);

    if (typeof value === "number") {
        accumulator.min = Math.min(accumulator.min, value);
        accumulator.max = Math.max(accumulator.max, value);
    }

    if (accumulator.samples.length < ATTRIBUTE_SAMPLE_CAP) {
        accumulator.samples.push(value);
    }

    if (accumulator.unique !== null) {
        accumulator.unique.add(value);
        if (accumulator.unique.size > ATTRIBUTE_UNIQUE_CAP) {
            // Past the cap the set is dropped rather than kept: holding every distinct value of a
            // free-text column is a second copy of the column, and nothing renders it.
            accumulator.unique = null;
        }
    }
}

/**
 * Settle the type of an attribute from the types its values had.
 *
 * A column of integers and fractions is a number column, not a mixed one -- that is one type of
 * thing measured two ways. A column of numbers and strings is genuinely mixed, and saying so is
 * what stops a colour scale being offered for it.
 * @param types - the value types seen
 * @returns the attribute's type
 */
function settleType(types: ReadonlySet<AttributeType>): AttributeType {
    if (types.size === 1) {
        const [only] = types;
        return only;
    }

    if (types.size === 2 && types.has("integer") && types.has("number")) {
        return "number";
    }

    return "mixed";
}

/**
 * Whether a string attribute is a category rather than free text.
 *
 * The test is "few distinct values, many records", because that is what makes a legend readable
 * and a group-by useful. A column of 400 distinct labels over 400 nodes is an identifier; a
 * column of 4 over 400 is a category, and a palette should be offered for it.
 * @param accumulator - what the walk saw
 * @param total - how many records of that kind there are
 * @returns true when the attribute should be described as a category
 */
function isCategorical(accumulator: Accumulator, total: number): boolean {
    if (accumulator.unique === null || total === 0) {
        return false;
    }

    return accumulator.unique.size <= Math.max(2, Math.sqrt(total));
}

/**
 * Turn one accumulator into the descriptor a consumer reads.
 * @param name - the attribute's key
 * @param kind - whether it was found on nodes or on edges
 * @param accumulator - what the walk saw
 * @param total - how many records of that kind there are
 * @returns the descriptor
 */
function describe(name: string, kind: "node" | "edge", accumulator: Accumulator, total: number): AttributeDescriptor {
    const settled = settleType(accumulator.types);
    const numeric = settled === "number" || settled === "integer";
    const type = settled === "string" && isCategorical(accumulator, total) ? "category" : settled;

    return Object.freeze({
        path: `data.${name}`,
        token: `[${name}]`,
        name,
        plainName: name,
        technicalName: name,
        kind,
        type,
        origin: "imported",
        completeness: total === 0 ? 0 : accumulator.present / total,
        ...(accumulator.unique === null ? {} : { uniqueCount: accumulator.unique.size }),
        ...(numeric ? { min: accumulator.min, max: accumulator.max } : {}),
        sampleValues: Object.freeze([...accumulator.samples]),
    } satisfies AttributeDescriptor);
}

/**
 * Walk one kind of element and accumulate every attribute its records carry.
 * @param total - how many rows there are
 * @param read - the attribute bag of one row, by index
 * @returns the accumulators, in the order the keys were first seen
 */
function walk(total: number, read: (index: number) => Readonly<Record<string, unknown>> | undefined): Map<string, Accumulator> {
    const found = new Map<string, Accumulator>();

    for (let index = 0; index < total; index++) {
        const record = read(index);
        if (record === undefined) {
            continue;
        }

        for (const key of Object.keys(record)) {
            let accumulator = found.get(key);
            if (accumulator === undefined) {
                accumulator = {
                    present: 0,
                    types: new Set<AttributeType>(),
                    unique: new Set<unknown>(),
                    min: Number.POSITIVE_INFINITY,
                    max: Number.NEGATIVE_INFINITY,
                    samples: [],
                };
                found.set(key, accumulator);
            }

            accumulate(accumulator, record[key]);
        }
    }

    return found;
}

/**
 * Every attribute the graph's records carry.
 *
 * O(n + m) in the number of records, and O(k) in the keys each one has, so the caller is
 * expected to cache the answer against the snapshot it was computed from.
 * @param snapshot - the snapshot whose rows to walk
 * @param records - where to read the attributes a record arrived with; null means the element
 *     holds none, which is what a session with no view sees until the store carries attribute
 *     columns of its own
 * @returns the descriptors, node attributes first
 */
export function describeAttributes(
    snapshot: GraphSnapshot,
    records: SessionRecordSource | null,
): readonly AttributeDescriptor[] {
    if (records === null) {
        return Object.freeze([]);
    }

    const nodes = walk(snapshot.nodeCount, (index) => records.nodeAttributes(index, snapshot.ids.idOf(index)));
    const edges = walk(snapshot.edgeCount, (index) => records.edgeAttributes(index));

    const described: AttributeDescriptor[] = [];
    for (const [name, accumulator] of nodes) {
        described.push(describe(name, "node", accumulator, snapshot.nodeCount));
    }

    for (const [name, accumulator] of edges) {
        described.push(describe(name, "edge", accumulator, snapshot.edgeCount));
    }

    return Object.freeze(described);
}
