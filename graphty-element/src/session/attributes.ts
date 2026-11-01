/**
 * @file What attributes the graph's records carry, described as data -- and the one function that
 * writes them.
 *
 * An options form, a filter builder, a colour encoding and a column picker all need the same
 * four facts about every attribute: what it is called, what type its values are, how many
 * records actually carry it, and what a few of its values look like. Each of those is a walk
 * over the graph, so each of them is the element's to do once rather than every consumer's to do
 * separately.
 *
 * The second half is the writer. A cache over a rule that reads `data.weight` is keyed on the
 * revision of `weight` (design/sets/sets-design.md 6.2), and a revision that some write path forgot
 * to bump is a cache that answers from values nobody holds any more. So every write into a
 * record's `data` goes through {@link writeAttributes} or {@link replaceAttributes}, and
 * `test/session/single-attribute-writer.test.ts` fails on any other.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { AttributeDescriptor, AttributeType, Measurement } from "../catalog/types";
import type { MovedInput } from "./sets/notify";
import { toColorValue } from "./styles/channels";
import { isNumericText, readInstant } from "./time/parse";
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
    /** Whether every value seen so far is text the element reads as a color. */
    colors: boolean;
    /** Whether every value seen so far spells the node id of its record (nodes only). */
    ids: boolean;
    /** How many values were text that is plainly a date (see {@link isPlainDate}). */
    dates: number;
}

/** A month's name or its three-letter abbreviation, as a whole word. */
const MONTH_NAME = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i;
/** A four-digit year, as a whole word. */
const FOUR_DIGIT_YEAR = /\b\d{4}\b/;
/** Of a column's values, at least this share must be plain dates for it to measure time. */
const DATE_SHARE = 0.95;

/**
 * Whether text is plainly a date, from the text alone: ISO 8601 (a year and month at least, such
 * as `2026-01`, `2026-01-31` or `2026-01-31T09:30Z`), or a month's name with a four-digit year
 * that the platform reads (`Mar 9, 2025`, `9 March 2025`). A bare number is never a date: `1995`
 * could as well be a count, and `1.10` a version.
 * @param text - the value
 * @returns true for a date
 */
function isPlainDate(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 7 || isNumericText(trimmed)) {
        return false;
    }

    if (readInstant(trimmed, "ms").how === "strict") {
        return true;
    }

    return MONTH_NAME.test(trimmed) && FOUR_DIGIT_YEAR.test(trimmed) && !Number.isNaN(Date.parse(trimmed));
}

/**
 * The attribute type of one value.
 *
 * `"time"` is not a value type: a column of text dates stays text here, and its MEASUREMENT reads
 * time when nearly all of its values are plain dates (see {@link isPlainDate}), which a bare number
 * or a version such as "1.10" never is.
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
 * @param id - the record's node id, for a node record
 */
function accumulate(accumulator: Accumulator, value: unknown, id?: string | number): void {
    const type = classify(value);
    if (type === null) {
        return;
    }

    accumulator.ids &&= id !== undefined && String(value) === String(id);

    accumulator.present++;
    accumulator.types.add(type);
    if (typeof value === "string" && isPlainDate(value)) {
        accumulator.dates++;
    }

    if (typeof value === "number") {
        accumulator.min = Math.min(accumulator.min, value);
        accumulator.max = Math.max(accumulator.max, value);
    }

    if (accumulator.samples.length < ATTRIBUTE_SAMPLE_CAP) {
        accumulator.samples.push(value);
    }

    // Each distinct value is read as a color once, while the set still holds them all.
    if (accumulator.colors && !accumulator.unique?.has(value)) {
        accumulator.colors = typeof value === "string" && toColorValue(value) !== null;
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
 * What a column's values measure, read from their type, and for text from whether its values
 * are plain dates.
 *
 * Never from how many distinct values there are: the same column must not change meaning when
 * next month's file has more rows. Numbers are amounts until someone declares them codes.
 * @param type - the settled type
 * @param accumulator - what the walk saw, for text that reads as dates
 * @returns the measurement
 */
function inferMeasurement(type: AttributeType, accumulator?: Accumulator): Measurement {
    // Text whose values are nearly all plain dates measures time: read from the values, never from
    // the column's name.
    if (type === "string" && accumulator !== undefined && accumulator.dates >= DATE_SHARE * accumulator.present) {
        return "time";
    }

    switch (type) {
        case "number":
        case "integer":
            return "quantitative";
        case "time":
            return "time";
        default:
            return "categorical";
    }
}

/**
 * Whether a column reads as years: whole numbers from 1000 to 2999, spanning 500 or less.
 * ponytail: a range heuristic; a column of amounts from 1200 to 1450 reads as years too.
 * @param type - the settled type
 * @param accumulator - what the walk saw
 * @returns true for a column of years
 */
function isYearLike(type: AttributeType, accumulator: Accumulator): boolean {
    const { min, max } = accumulator;
    return type === "integer" && accumulator.present > 0 && min >= 1000 && max <= 2999 && max - min <= 500;
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
        ...(accumulator.present === 0
            ? {}
            : { measurement: inferMeasurement(settled, accumulator), measurementSource: "inferred" as const }),
        origin: "imported",
        completeness: total === 0 ? 0 : accumulator.present / total,
        ...(accumulator.unique === null ? {} : { uniqueCount: accumulator.unique.size }),
        ...(numeric ? { min: accumulator.min, max: accumulator.max } : {}),
        ...(isYearLike(settled, accumulator) ? { yearLike: true as const } : {}),
        sampleValues: Object.freeze([...accumulator.samples]),
        ...(accumulator.colors && accumulator.present > 0 ? { valuesAreColors: true as const } : {}),
        ...(kind === "node" && accumulator.ids && total > 0 && accumulator.present === total
            ? { holdsNodeIds: true as const }
            : {}),
    } satisfies AttributeDescriptor);
}

/**
 * An accumulator that has seen nothing.
 * @returns the accumulator
 */
function newAccumulator(): Accumulator {
    return {
        present: 0,
        types: new Set<AttributeType>(),
        unique: new Set<unknown>(),
        min: Number.POSITIVE_INFINITY,
        max: Number.NEGATIVE_INFINITY,
        samples: [],
        colors: true,
        ids: true,
        dates: 0,
    };
}

/**
 * The columns of rows not yet loaded, described as {@link describeAttributes} will describe them
 * once they are.
 * @param rows - the rows
 * @param kind - whether they will be nodes or edges
 * @param order - column names to list first, in this order, even when no row carries a value
 * @returns the descriptors
 */
export function describeRows(
    rows: readonly Readonly<Record<string, unknown>>[],
    kind: "node" | "edge",
    order: readonly string[] = [],
): readonly AttributeDescriptor[] {
    const found = walk(rows.length, (index) => rows[index]);
    const names = new Set([...order, ...found.keys()]);
    return [...names].map((name) => describe(name, kind, found.get(name) ?? newAccumulator(), rows.length));
}

/**
 * Walk one kind of element and accumulate every attribute its records carry.
 * @param total - how many rows there are
 * @param read - the attribute bag of one row, by index
 * @param idOf - the node id of one row, by index, when the rows are nodes
 * @returns the accumulators, in the order the keys were first seen
 */
function walk(
    total: number,
    read: (index: number) => Readonly<Record<string, unknown>> | undefined,
    idOf?: (index: number) => string | number,
): Map<string, Accumulator> {
    const found = new Map<string, Accumulator>();

    for (let index = 0; index < total; index++) {
        const record = read(index);
        if (record === undefined) {
            continue;
        }

        for (const key of Object.keys(record)) {
            let accumulator = found.get(key);
            if (accumulator === undefined) {
                accumulator = newAccumulator();
                found.set(key, accumulator);
            }

            accumulate(accumulator, record[key], idOf?.(index));
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

    const nodes = walk(
        snapshot.nodeCount,
        (index) => records.nodeAttributes(index, snapshot.ids.idOf(index)),
        (index) => snapshot.ids.idOf(index),
    );
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

// ---------------------------------------------------------------------------------------------
// Attribute revisions and the input tick (design/sets/sets-design.md 5.2 and 6.2)
// ---------------------------------------------------------------------------------------------

/**
 * One session-wide counter that moves whenever any input a set's resolution can read moves: an
 * attribute revision, a visibility or selection mask version, an execution token or a freeze.
 *
 * A memo keyed on it can never outlive an input it summarises, which is its whole job: a reader
 * that saw the same tick twice knows nothing it could have read has changed in between.
 */
export class InputTick {
    #value = 0;
    readonly #listeners = new Set<(input: MovedInput) => void>();

    /**
     * The current tick.
     * @returns the tick, starting at 0 and only ever growing
     */
    get value(): number {
        return this.#value;
    }

    /** Move the tick on. Allocation-free, so a freeze can call it inside its commit. */
    advance(): void {
        this.#value += 1;
    }

    /**
     * Tell every session over this store that an input moved (design/sets 11). Separate from
     * {@link InputTick.advance}, which moves on every bump: this is said once per write or freeze,
     * after it has landed, by the store owner's side -- a freeze once delivered, an attribute
     * write once per batch.
     * @param input - what moved
     */
    announce(input: MovedInput): void {
        for (const listener of [...this.#listeners]) {
            listener(input);
        }
    }

    /**
     * Hear every announcement.
     * @param listener - called with each
     * @returns stops listening
     */
    listen(listener: (input: MovedInput) => void): () => void {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }
}

/**
 * Per-field revisions of one element kind's attributes.
 *
 * Keyed by the TOP-LEVEL field, the first segment after `data.`, because that is the granularity a
 * compiled rule's paths name and the granularity a write touches: editing `label` must not
 * invalidate a rule over `weight`.
 */
export class AttributeRevisions {
    readonly #revisions = new Map<string, number>();
    readonly #tick: InputTick;
    #writes = 0;

    /**
     * Start every field at revision 0.
     * @param tick - the session tick every bump advances
     */
    constructor(tick: InputTick) {
        this.#tick = tick;
    }

    /**
     * The revision of one field.
     * @param field - the top-level attribute key
     * @returns how many writes have touched it; 0 for a field nothing has written
     */
    of(field: string): number {
        return this.#revisions.get(field) ?? 0;
    }

    /**
     * How many writes have touched any field of this kind.
     * @returns the count, starting at 0 and only ever growing
     */
    get writes(): number {
        return this.#writes;
    }

    /**
     * Record that one write touched these fields. A write that changed no value still counts:
     * comparing old and new values would cost a deep equality per field for no correctness gain.
     * @param fields - the top-level keys written
     */
    bump(fields: Iterable<string>): void {
        for (const field of fields) {
            this.#revisions.set(field, (this.#revisions.get(field) ?? 0) + 1);
        }

        this.#writes += 1;
        this.#tick.advance();
    }
}

/** The three counters a set's input signature reads, shared by a session and its store's owner. */
export interface InputCounters {
    /** The session input tick. */
    readonly tick: InputTick;
    /** Node attribute revisions. */
    readonly nodes: AttributeRevisions;
    /** Edge attribute revisions. */
    readonly edges: AttributeRevisions;
}

/**
 * The revision of the graph's data alone: one token that changes on a freeze (a new snapshot) or
 * an attribute write, and NOT on a mask, selection or run, which move the input tick too. What a
 * reader of columns, types and values keys its cache on, so moving a time window or a filter keeps
 * it (issue #4386).
 * @param snapshot - the graph now; freezes a pending write, so the token is read after it
 * @param counters - the store owner's counters
 * @returns reads the token now; the same object while the data has not moved
 */
export function dataRevisionOf(snapshot: () => GraphSnapshot, counters: InputCounters): () => object {
    let held = { snapshot: null as GraphSnapshot | null, nodes: -1, edges: -1 };
    return () => {
        const now = snapshot();
        const { writes: nodes } = counters.nodes;
        const { writes: edges } = counters.edges;
        if (held.snapshot !== now || held.nodes !== nodes || held.edges !== edges) {
            held = { snapshot: now, nodes, edges };
        }

        return held;
    };
}

const countersByOwner = new WeakMap<object, InputCounters>();

/**
 * The counters of one store owner, created on first ask.
 *
 * Keyed by the object the session is handed as its store: `DataManager` for a rendered graph, which
 * passes the same counters to every `GraphStore` it builds so a Clear never rewinds them, or the
 * `GraphStore` itself for a headless session. A side table rather than a member, so the published
 * `SessionGraphStore` interface gains nothing.
 * @param owner - the store, or whoever builds stores
 * @returns its counters
 */
export function inputCountersOf(owner: object): InputCounters {
    let counters = countersByOwner.get(owner);
    if (counters === undefined) {
        const tick = new InputTick();
        counters = { tick, nodes: new AttributeRevisions(tick), edges: new AttributeRevisions(tick) };
        countersByOwner.set(owner, counters);
    }

    return counters;
}

/**
 * Write fields into a record's attributes and bump each field's revision. With `fields` naming
 * only some keys of `update`, only those are written.
 * @param revisions - the revisions of the record's kind
 * @param data - the record's attribute object (`node.data`, `edge.data`)
 * @param update - where the values come from
 * @param fields - the keys to write; every own key of `update` when absent
 */
export function writeAttributes(
    revisions: AttributeRevisions,
    data: Record<string, unknown>,
    update: Readonly<Record<string, unknown>>,
    fields: readonly string[] = Object.keys(update),
): void {
    for (const field of fields) {
        data[field] = update[field];
    }

    revisions.bump(fields);
}

/**
 * Write a batch of updates, each into the attributes of the record its `id` names, through
 * {@link writeAttributes}, then announce the fields written once on the input tick, so a live set
 * re-resolves once per batch rather than once per record (design/sets 11). `id` is the address,
 * not an attribute, and is not written; an id with no record is skipped.
 * @param counters - the store owner's counters
 * @param element - which kind of record
 * @param updates - the updates
 * @param dataOf - a record's attribute object by id
 */
export function writeUpdates(
    counters: InputCounters,
    element: "node" | "edge",
    updates: readonly { readonly id: string | number; readonly [key: string]: unknown }[],
    dataOf: (id: string | number) => Record<string, unknown> | undefined,
): void {
    const revisions = element === "node" ? counters.nodes : counters.edges;
    const written = new Set<string>();
    for (const update of updates) {
        const data = dataOf(update.id);
        if (data !== undefined) {
            const fields = Object.keys(update).filter((key) => key !== "id");
            writeAttributes(revisions, data, update, fields);
            for (const field of fields) {
                written.add(field);
            }
        }
    }

    if (written.size > 0) {
        counters.tick.announce({ kind: "attributes", element, fields: [...written] });
    }
}

/**
 * Replace a record's attributes wholesale (the `last` repeated-edge policy) and bump every field
 * the old or the new record carries, since a field that disappeared changed too.
 * @param revisions - the revisions of the record's kind
 * @param owner - the object holding `data`
 * @param owner.data - its current attributes
 * @param record - the new attributes, held by reference as the constructor holds the first
 */
export function replaceAttributes<T extends object>(
    revisions: AttributeRevisions,
    owner: { data: T },
    record: T,
): void {
    const fields = new Set([...Object.keys(owner.data), ...Object.keys(record)]);
    owner.data = record;
    revisions.bump(fields);
}
