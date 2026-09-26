/**
 * @file The result object: a column of numbers turned into something a reader can act on.
 *
 * A run produces values. A reader wants a ranking, a distribution, a range and one bounded object
 * small enough to put on a card, in a tool response or in a saved document. Those are not the
 * algorithm's job and they are not the consumer's either: the element already walks every value
 * on its way out, it knows which elements were in scope, which of them were measured, how the
 * metric was scaled and what qualifies the numbers, and a consumer reconstructing any of that
 * from per-element values is doing the same work again with less to go on.
 *
 * So the statistics live here, computed once and cached, and the fields a shape declares are
 * FILLED here rather than restated by every algorithm: a metric that publishes a value per
 * element gets its `rank` and `percentile` and its graph-level range without asking, a partition
 * gets its group sizes, and a set gets its count. Nothing already published is overwritten -- an
 * algorithm that computed a real `modularity` or a weighted `cost` keeps it -- so this is the
 * floor under the contract in `./types`, never a second opinion about it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: a result is plain data plus arithmetic,
 * published from the Node-safe `./session` entry point.
 */

import type { EdgeId, FieldDescriptor, NodeId, ResultShape, RunId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { Caveats } from "../runs/types";
import { defaultReading } from "./reading";
import { nearestNames } from "./ResultsApi";
import {
    analyzeColumn,
    type AnalyzedColumn,
    buildHistogram,
    isNormalization,
    type NumericColumnSource,
    rankEntries,
    topOfRanking,
} from "./statistics";
import {
    type Histogram,
    type HistogramOptions,
    type Normalization,
    type NumericColumnView,
    type RankingEntry,
    type ReadingOptions,
    resultShapeContract,
    type ResultSummary,
    type RunResult,
    type SummaryEntry,
    type SummaryGroup,
    type TopRanking,
} from "./types";

// ---------------------------------------------------------------------------------------------
// The bounds on a summary
// ---------------------------------------------------------------------------------------------

/**
 * How many ranked elements a summary carries.
 *
 * A summary is what an agent tool returns and what a result card reads, and the rule behind it is
 * that a tool result is a summary and never a list with one entry per node. The bound is applied
 * inside `summary()`, and `summary()` takes no arguments, so no call returns the whole column by
 * accident.
 */
export const SUMMARY_TOP_LIMIT = 10;

/** How many groups a summary carries, for a result that partitions rather than measures. */
export const SUMMARY_GROUP_LIMIT = 10;

// ---------------------------------------------------------------------------------------------
// What a run hands over
// ---------------------------------------------------------------------------------------------

/** One element's published fields, as the run machinery hands them over. */
export interface ResultElementValues<Id extends NodeId = NodeId> {
    /** The element's id, exactly as the graph holds it. */
    readonly id: Id;
    /** The fields the run published for it, keyed by the shape's field names. */
    readonly values: Readonly<Record<string, unknown>>;
}

/** One row of the `sizes` table a grouping result publishes, largest first. */
interface ResultSizeRow {
    /** The group, or the level for a layered grouping. */
    readonly group: string | number;
    /** How many elements are in it. */
    readonly size: number;
}

/** One row of the `categories` table a category result publishes, largest first. */
interface ResultCategoryRow {
    /** The category's name. */
    readonly category: string;
    /** How many elements fell into it. */
    readonly count: number;
}

/**
 * Writes the one plain-language sentence {@link RunResult.reading} returns.
 *
 * This is the seam the reading generator attaches to. It is installed through
 * {@link RunResultInit.reading}, it is handed the finished result, and it reads that result's own
 * statistics. Nothing in this module writes prose, and a result built without a generator throws
 * `E_UNSUPPORTED` from `reading()` rather than returning an empty sentence a consumer would print
 * under a heading.
 */
type ResultReadingGenerator = (result: RunResult, options: ReadingOptions) => string;

/** Everything a result is built from. */
export interface RunResultInit {
    /** The run that produced it. */
    readonly runId: RunId;
    /** The shape, which fixes the field names. */
    readonly shape: ResultShape;
    /** Every field this run actually published, with its path and its plain name. */
    readonly fields: readonly FieldDescriptor[];
    /** How many nodes and edges the run looked at. */
    readonly measured: {
        /** Nodes in the run's scope. */
        readonly nodes: number;
        /** Edges in the run's scope. */
        readonly edges: number;
    };
    /** The graph-level fields the algorithm published, keyed by field name. */
    readonly graph?: Readonly<Record<string, unknown>>;
    /** What the run published per node, in the order a column reads them. */
    readonly nodes?: readonly ResultElementValues[];
    /** What the run published per edge, in the order a column reads them. */
    readonly edges?: readonly ResultElementValues<EdgeId>[];
    /** What qualifies the numbers. */
    readonly caveats: Caveats;
    /** How long the run took, in milliseconds. */
    readonly durationMs: number;
    /**
     * What to call one element in a summary row.
     *
     * A result holds values, not labels, so the label comes from the session that holds the
     * attributes. A summary entry falls back to the printed id when this is absent or answers
     * nothing.
     */
    readonly labelOf?: (id: NodeId) => string | undefined;
    /** The plain-language generator, when one is installed. */
    readonly reading?: ResultReadingGenerator;
}

// ---------------------------------------------------------------------------------------------
// Element storage
// ---------------------------------------------------------------------------------------------

/**
 * The published elements of one half of a result, in column order.
 *
 * Edge ids are strings and node ids are strings or numbers, so one table type holds both halves:
 * an edge id is a node id that happens never to be a number.
 */
interface ElementTable {
    /** The ids, in the order a column reads them. */
    readonly ids: NodeId[];
    /** The fields, one record per id, at the same positions. */
    readonly records: Record<string, unknown>[];
    /** Where each id sits, so `node(id)` is a lookup rather than a scan. */
    readonly index: Map<NodeId, number>;
}

/**
 * Copy what a run published into the storage a result reads.
 *
 * The records are copied rather than referenced, because a result is immutable once built and the
 * caller's objects are not. An id that arrives twice merges into the row it already has: two rows
 * for one element would make a column longer than the set of elements it measures.
 * @param entries - What the run published, or undefined when this half is empty.
 * @returns The table.
 */
function buildTable(entries: readonly ResultElementValues[] | undefined): ElementTable {
    const table: ElementTable = { ids: [], records: [], index: new Map<NodeId, number>() };
    if (entries === undefined) {
        return table;
    }

    for (const entry of entries) {
        const seen = table.index.get(entry.id);
        if (seen === undefined) {
            table.index.set(entry.id, table.ids.length);
            table.ids.push(entry.id);
            table.records.push({ ...entry.values });
            continue;
        }

        Object.assign(table.records[seen], entry.values);
    }

    return table;
}

/**
 * Read one field of a table as a numeric column, without building an array of numbers.
 * @param table - The elements to read.
 * @param field - The field name.
 * @returns A source over the table's own storage.
 */
function tableColumn(table: ElementTable, field: string): NumericColumnSource {
    const { records } = table;

    return {
        length: records.length,
        get: (index: number): number => numberOf(records[index][field]),
    };
}

/**
 * Read a table's field as the entries a ranking is built from.
 * @param table - The elements to read.
 * @param field - The field name.
 * @returns One entry per element, in table order.
 */
function rankableEntries(table: ElementTable, field: string): { id: NodeId; value: number }[] {
    return table.ids.map((id, position) => ({ id, value: numberOf(table.records[position][field]) }));
}

/**
 * Read an unknown published value as a number.
 * @param value - The published value.
 * @returns The number, or NaN when the element carries none.
 */
function numberOf(value: unknown): number {
    return typeof value === "number" ? value : Number.NaN;
}

/**
 * Tell whether a published value can be a group, a level or a category key.
 * @param value - The published value.
 * @returns True when it is a string or a number.
 */
function isGroupKey(value: unknown): value is string | number {
    return typeof value === "string" || typeof value === "number";
}

/**
 * Tell whether a field carries numbers.
 * @param field - The field descriptor.
 * @returns True when its values can be read as a column.
 */
function isNumericField(field: FieldDescriptor): boolean {
    return field.type === "number" || field.type === "integer";
}

// ---------------------------------------------------------------------------------------------
// Filling in what the shape declares
// ---------------------------------------------------------------------------------------------

/**
 * Publish a graph-level field the algorithm did not publish itself.
 * @param graph - The graph half, still mutable.
 * @param field - The field name.
 * @param value - What to publish.
 */
function fillGraph(graph: Record<string, unknown>, field: string, value: unknown): void {
    if (graph[field] === undefined) {
        graph[field] = value;
    }
}

/**
 * Publish an element-level field the algorithm did not publish itself.
 * @param record - The element's fields, still mutable.
 * @param field - The field name.
 * @param value - What to publish.
 */
function fillElement(record: Record<string, unknown>, field: string, value: unknown): void {
    if (record[field] === undefined) {
        record[field] = value;
    }
}

/**
 * Count how many elements each key was seen on.
 * @param table - The elements to walk.
 * @param field - The field holding the key.
 * @returns The counts by key.
 */
function countByKey(table: ElementTable, field: string): Map<string | number, number> {
    const counts = new Map<string | number, number>();

    for (const record of table.records) {
        const key = record[field];
        if (isGroupKey(key)) {
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    return counts;
}

/**
 * Order two group keys so that equal-sized groups come back in the same order every time.
 * @param left - One key.
 * @param right - The other.
 * @returns The usual negative, zero or positive ordering.
 */
function compareKeys(left: string | number, right: string | number): number {
    const a = String(left);
    const b = String(right);
    if (a === b) {
        return 0;
    }

    return a < b ? -1 : 1;
}

/**
 * Turn key counts into the `sizes` table, largest first.
 * @param counts - The counts by key.
 * @returns The rows.
 */
function sizeRows(counts: ReadonlyMap<string | number, number>): readonly ResultSizeRow[] {
    const rows: ResultSizeRow[] = [...counts.entries()].map(([group, size]) => ({ group, size }));
    rows.sort((left, right) => right.size - left.size || compareKeys(left.group, right.group));

    return Object.freeze(rows.map((row) => Object.freeze(row)));
}

/**
 * Read how a field declares its values were scaled.
 * @param fields - The fields the run published.
 * @param name - The field to ask about.
 * @returns The declared normalisation, or "none" when the field declares none the element knows.
 */
function declaredNormalization(fields: readonly FieldDescriptor[], name: string): Normalization {
    const declared = fields.find((field) => field.name === name)?.normalization;

    return isNormalization(declared) ? declared : "none";
}

/**
 * Fill in what a metric shape declares: a place for every element, and the range for the graph.
 *
 * The range is published only when something was measured. A `min` of 0 over a run that measured
 * nothing is a number a reader would go looking for in their own data and never find.
 * @param table - The measured elements.
 * @param graph - The graph half, still mutable.
 * @param fields - The fields the run published, read for the value field's declared scaling.
 */
function fillMetric(table: ElementTable, graph: Record<string, unknown>, fields: readonly FieldDescriptor[]): void {
    const {statistics} = analyzeColumn(tableColumn(table, "value"));

    for (const entry of rankEntries(rankableEntries(table, "value"))) {
        const position = table.index.get(entry.id);
        if (position !== undefined) {
            fillElement(table.records[position], "rank", entry.rank);
            fillElement(table.records[position], "percentile", entry.percentile);
        }
    }

    if (statistics.measured > 0) {
        fillGraph(graph, "min", statistics.min);
        fillGraph(graph, "max", statistics.max);
        fillGraph(graph, "median", statistics.median);
        fillGraph(graph, "mean", statistics.mean);
    }

    fillGraph(graph, "measured", statistics.measured);
    fillGraph(graph, "tiedAtMin", statistics.tiedAtMin);
    fillGraph(graph, "normalization", declaredNormalization(fields, "value"));
}

/**
 * Fill in what a grouping shape declares: the size of each element's group, and the group table.
 * @param table - The grouped elements.
 * @param graph - The graph half, still mutable.
 * @param keyField - The per-element field holding the group, which is "group" or "level".
 * @param sizeField - The per-element field holding its size.
 * @param countField - The graph-level field holding how many groups there are.
 */
function fillGrouping(
    table: ElementTable,
    graph: Record<string, unknown>,
    keyField: string,
    sizeField: string,
    countField: string,
): void {
    const counts = countByKey(table, keyField);

    for (const record of table.records) {
        const key = record[keyField];
        if (isGroupKey(key)) {
            fillElement(record, sizeField, counts.get(key));
        }
    }

    fillGraph(graph, countField, counts.size);
    fillGraph(graph, "sizes", sizeRows(counts));
}

/**
 * Fill in what a category shape declares: a place for every element, and the category table.
 * @param table - The sorted elements.
 * @param graph - The graph half, still mutable.
 */
function fillCategories(table: ElementTable, graph: Record<string, unknown>): void {
    for (const entry of rankEntries(rankableEntries(table, "score"))) {
        const position = table.index.get(entry.id);
        if (position !== undefined) {
            fillElement(table.records[position], "rank", entry.rank);
        }
    }

    const rows: ResultCategoryRow[] = [...countByKey(table, "category").entries()].map(([category, count]) => ({
        category: String(category),
        count,
    }));
    rows.sort((left, right) => right.count - left.count || compareKeys(left.category, right.category));

    fillGraph(graph, "categories", Object.freeze(rows.map((row) => Object.freeze(row))));
}

/**
 * Count the elements a boolean field is true for.
 * @param table - The elements to walk.
 * @param field - The boolean field.
 * @returns How many carry true.
 */
function countTrue(table: ElementTable, field: string): number {
    let total = 0;

    for (const record of table.records) {
        if (record[field] === true) {
            total++;
        }
    }

    return total;
}

/**
 * Count the elements that carry a field at all.
 * @param table - The elements to walk.
 * @param field - The field to look for.
 * @returns How many carry a value for it.
 */
function countDefined(table: ElementTable, field: string): number {
    let total = 0;

    for (const record of table.records) {
        if (record[field] !== undefined) {
            total++;
        }
    }

    return total;
}

/**
 * Fill in every field the result's shape declares and the algorithm left to the element.
 * @param shape - The result's shape.
 * @param nodes - The published nodes.
 * @param edges - The published edges.
 * @param graph - The graph half, still mutable.
 * @param fields - The fields the run published.
 */
function fillShapeFields(
    shape: ResultShape,
    nodes: ElementTable,
    edges: ElementTable,
    graph: Record<string, unknown>,
    fields: readonly FieldDescriptor[],
): void {
    switch (shape) {
        case "node-metric":
            fillMetric(nodes, graph, fields);
            break;
        case "edge-metric":
            fillMetric(edges, graph, fields);
            break;
        case "community":
            fillGrouping(nodes, graph, "group", "groupSize", "groupCount");
            break;
        case "layered-grouping":
            fillGrouping(nodes, graph, "level", "levelSize", "levelCount");
            break;
        case "category-table":
            fillCategories(nodes, graph);
            break;
        case "path":
            fillGraph(graph, "length", countTrue(nodes, "onPath"));
            fillGraph(graph, "hops", countTrue(edges, "onPath"));
            break;
        case "node-set":
            fillGraph(graph, "count", countTrue(nodes, "in"));
            break;
        case "edge-set":
            fillGraph(graph, "count", countTrue(edges, "in"));
            break;
        // A pair list, a temporal series and a bag of facts publish tables and scalars the
        // algorithm computed and the element cannot infer. There is nothing to fill.
        case "pair-list":
        case "temporal":
        case "fact":
        default:
            break;
    }
}

// ---------------------------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------------------------

/**
 * The numeric field a shape's summary describes.
 *
 * A summary carries one range, so a shape that measures something says which of its fields that
 * is. A shape that measures no number -- a path, a set, a partition, a bag of facts -- has no
 * range, and its summary says so with nulls rather than with zeros.
 * @param shape - The result's shape.
 * @returns The field name, or null when the shape measures no number.
 */
function summaryValueField(shape: ResultShape): string | null {
    switch (shape) {
        case "node-metric":
        case "edge-metric":
            return "value";
        case "category-table":
            return "score";
        case "layered-grouping":
            return "level";
        case "community":
        case "path":
        case "node-set":
        case "edge-set":
        case "pair-list":
        case "temporal":
        case "fact":
        default:
            return null;
    }
}

/**
 * Read the `sizes` or `categories` table a result published as summary groups.
 * @param value - The published table.
 * @param limit - How many rows a summary may carry.
 * @returns The groups, bounded, or undefined when the value is not a table this can read.
 */
function toSummaryGroups(value: unknown, limit: number): readonly SummaryGroup[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const groups: SummaryGroup[] = [];

    for (const row of value) {
        if (typeof row !== "object" || row === null) {
            continue;
        }

        const record: Record<string, unknown> = row;
        const group = record.group ?? record.category;
        const size = record.size ?? record.count;
        if (isGroupKey(group) && typeof size === "number") {
            groups.push(Object.freeze({ group, size }));
        }

        if (groups.length === limit) {
            break;
        }
    }

    return Object.freeze(groups);
}

// ---------------------------------------------------------------------------------------------
// The result
// ---------------------------------------------------------------------------------------------

/**
 * What a run produced, with the statistics already computed.
 *
 * Build one with {@link createRunResult} rather than with `new`: the factory is what fills in the
 * fields the shape declares before the object is frozen, and a result built around a half-filled
 * record would publish a contract it does not keep.
 */
class Result implements RunResult {
    readonly runId: RunId;
    readonly shape: ResultShape;
    readonly fields: readonly FieldDescriptor[];
    readonly measured: { readonly nodes: number; readonly edges: number };
    readonly graph: Readonly<Record<string, unknown>>;

    readonly #nodes: ElementTable;
    readonly #edges: ElementTable;
    readonly #caveats: Caveats;
    readonly #durationMs: number;
    readonly #labelOf: (id: NodeId) => string | undefined;
    readonly #reading: ResultReadingGenerator;
    readonly #columns = new Map<string, AnalyzedColumn>();
    readonly #rankings = new Map<string, readonly RankingEntry[]>();
    readonly #tops = new Map<string, TopRanking>();
    #summary: ResultSummary | undefined;

    /**
     * Build a result around storage that has already been filled and frozen.
     * @param init - What the run published.
     * @param nodes - The published nodes.
     * @param edges - The published edges.
     * @param graph - The graph half, frozen.
     */
    constructor(
        init: RunResultInit,
        nodes: ElementTable,
        edges: ElementTable,
        graph: Readonly<Record<string, unknown>>,
    ) {
        this.runId = init.runId;
        this.shape = init.shape;
        this.fields = Object.freeze([...init.fields]);
        this.measured = Object.freeze({ nodes: init.measured.nodes, edges: init.measured.edges });
        this.graph = graph;
        this.#nodes = nodes;
        this.#edges = edges;
        this.#caveats = init.caveats;
        this.#durationMs = init.durationMs;
        this.#labelOf = init.labelOf ?? ((): undefined => undefined);
        // The element's own generator unless a host supplied one. It used to be left undefined,
        // which made `reading()` throw on every run of the shipped element: a published verb that
        // could not be called. A host that wants different words still supplies its own.
        this.#reading = init.reading ?? defaultReading;
    }

    /**
     * One node's fields.
     * @param id - The node id.
     * @returns The fields, or undefined when the run produced nothing for that node.
     */
    node(id: NodeId): Readonly<Record<string, unknown>> | undefined {
        const position = this.#nodes.index.get(id);

        return position === undefined ? undefined : this.#nodes.records[position];
    }

    /**
     * One edge's fields.
     * @param id - The edge id.
     * @returns The fields, or undefined when the run produced nothing for that edge.
     */
    edge(id: EdgeId): Readonly<Record<string, unknown>> | undefined {
        const position = this.#edges.index.get(id);

        return position === undefined ? undefined : this.#edges.records[position];
    }

    /**
     * One numeric field as a column.
     *
     * The view reads straight through to the result's own storage and its four figures were
     * computed on the first call, so a histogram, a colour ramp's domain and a summary all walk
     * one column rather than three copies of it.
     * @param field - The field name.
     * @returns A view over the values, without an object per element.
     * @throws A GraphtyError coded E_UNKNOWN_ATTRIBUTE when the run published no such field, or
     *   E_BAD_COMMAND when the field is not a number published per element.
     */
    column(field: string): NumericColumnView {
        return this.#analyze(field).view;
    }

    /**
     * The highest-ranked elements on one field.
     *
     * Elements with equal values share a rank and come back in printed-id order, so the top of a
     * ranking does not reshuffle between two runs that measured the same thing.
     * @param field - The field to rank on.
     * @param limit - How many entries to return; the whole ranking when absent.
     * @returns The entries, best first.
     * @throws A GraphtyError coded E_OPTION_RANGE when the limit is not a whole number of
     *   entries, E_UNKNOWN_ATTRIBUTE when the run published no such field, or E_BAD_COMMAND when
     *   the field is not a number published per element.
     */
    ranking(field: string, limit?: number): readonly RankingEntry[] {
        if (limit !== undefined) {
            this.#checkLimit(limit, "limit");
        }

        const cached = this.#rankings.get(field) ?? this.#rank(field);

        return limit === undefined ? cached : Object.freeze(cached.slice(0, limit));
    }

    /**
     * The top `n` elements on one field, cut only between tie groups: a group of equal values is
     * taken whole, and only when all of it fits inside `n`. Kept per field and `n`, because a
     * top selector asks once per element it paints.
     * @param field - The field to rank on.
     * @param n - The most elements the top may hold.
     * @returns The elements taken, and the tie group left out when there was one.
     * @throws A GraphtyError coded E_OPTION_RANGE when n is not a whole number of entries,
     *   E_UNKNOWN_ATTRIBUTE when the run published no such field, or E_BAD_COMMAND when the
     *   field is not a number published per element.
     */
    top(field: string, n: number): TopRanking {
        const key = `${String(n)}:${field}`;
        const cached = this.#tops.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const top = topOfRanking(this.ranking(field), this.#checkLimit(n, "n"));
        this.#tops.set(key, top);

        return top;
    }

    /**
     * Refuse a count of entries that is not a whole number.
     * @param limit - The count.
     * @param option - What the caller called it, for the refusal.
     * @returns The count.
     * @throws A GraphtyError coded E_OPTION_RANGE when it is not a whole number of entries.
     */
    #checkLimit(limit: number, option: string): number {
        if (!Number.isInteger(limit) || limit < 0) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                source: "run",
                message: `A ranking limit is a whole number of entries, not ${String(limit)}.`,
                details: { option, value: limit, min: 0 },
                target: { kind: "run", id: this.runId },
            });
        }

        return limit;
    }

    /**
     * The distribution of one numeric field.
     *
     * Whether the field counts things is read off its own descriptor rather than passed in, so a
     * count metric gets whole-number band edges without the caller knowing that it should.
     * @param field - The field to bin.
     * @param options - How to cut the bins.
     * @returns The distribution, carrying the scale that was applied as well as the bars.
     * @throws A GraphtyError coded E_OPTION_RANGE when the bin count is outside the permitted
     *   range, E_UNKNOWN_ATTRIBUTE when the run published no such field, or E_BAD_COMMAND when
     *   the field is not a number published per element.
     */
    histogram(field: string, options?: HistogramOptions): Histogram {
        const descriptor = this.#descriptorFor(field);
        const table = descriptor.kind === "edge" ? this.#edges : this.#nodes;

        return buildHistogram(tableColumn(table, field), {
            ...options,
            integerValued: descriptor.type === "integer",
        });
    }

    /**
     * The bounded form of this result.
     *
     * Everything on it is either a single figure or a list the element cut to a fixed length, so
     * the object is the same size for a graph of a hundred nodes and a graph of a million.
     * @returns The summary.
     */
    summary(): ResultSummary {
        this.#summary ??= this.#buildSummary();

        return this.#summary;
    }

    /**
     * What this result means, in one sentence of plain language.
     * @param options - The locale and how technical to be.
     * @returns The sentence.
     */
    reading(options?: ReadingOptions): string {
        return this.#reading(this, options ?? {});
    }

    /**
     * The descriptor of one numeric per-element field, without complaining when there is none.
     *
     * A summary asks this rather than {@link Result.#descriptorFor} because a summary must not
     * throw: a run whose field list does not declare the field its shape calls primary is a
     * defect in that run, and the summary's job is to say what it can about the result rather
     * than to refuse to describe it at all.
     * @param field - The field name.
     * @returns Its descriptor, or null when the run published no numeric field under that name.
     */
    #findNumeric(field: string): FieldDescriptor | null {
        const declared = this.fields.find((candidate) => candidate.name === field && candidate.kind !== "graph");

        return declared !== undefined && isNumericField(declared) ? declared : null;
    }

    /**
     * The descriptor of one numeric field the run published per element.
     * @param field - The field name.
     * @returns Its descriptor.
     * @throws A GraphtyError naming what went wrong, with the readable fields in its details.
     */
    #descriptorFor(field: string): FieldDescriptor {
        const declared = this.fields.filter((candidate) => candidate.name === field);
        const perElement = declared.find((candidate) => candidate.kind !== "graph");
        const available = this.fields
            .filter((candidate) => candidate.kind !== "graph" && isNumericField(candidate))
            .map((candidate) => candidate.name);

        if (perElement === undefined) {
            if (declared.length > 0) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    source: "run",
                    message: `"${field}" is a graph-level field of run "${this.runId}"; read it from result.graph.`,
                    details: { field, kind: "graph", available },
                    target: { kind: "run", id: this.runId },
                });
            }

            throw new GraphtyError({
                code: "E_UNKNOWN_ATTRIBUTE",
                source: "run",
                message: `Run "${this.runId}" published no field named "${field}".`,
                details: { field, available, candidates: nearestNames(field, available) },
                target: { kind: "run", id: this.runId },
            });
        }

        if (!isNumericField(perElement)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                source: "run",
                message: `"${field}" is typed "${perElement.type}", which is not a column of numbers.`,
                details: { field, type: perElement.type, available },
                target: { kind: "run", id: this.runId },
            });
        }

        return perElement;
    }

    /**
     * The half of the result a per-element field belongs to.
     * @param field - The field name.
     * @returns The nodes or the edges.
     * @throws A GraphtyError naming what went wrong.
     */
    #tableFor(field: string): ElementTable {
        return this.#descriptorFor(field).kind === "edge" ? this.#edges : this.#nodes;
    }

    /**
     * One field's column and statistics, computed on the first ask and kept.
     * @param field - The field name.
     * @returns The view and the statistics behind it.
     * @throws A GraphtyError naming what went wrong.
     */
    #analyze(field: string): AnalyzedColumn {
        const cached = this.#columns.get(field);
        if (cached !== undefined) {
            return cached;
        }

        const analyzed = analyzeColumn(tableColumn(this.#tableFor(field), field));
        this.#columns.set(field, analyzed);

        return analyzed;
    }

    /**
     * Rank one field for the first time and keep the answer.
     * @param field - The field to rank on.
     * @returns The whole ranking, best first.
     * @throws A GraphtyError naming what went wrong.
     */
    #rank(field: string): readonly RankingEntry[] {
        const ranked = rankEntries(rankableEntries(this.#tableFor(field), field));
        this.#rankings.set(field, ranked);

        return ranked;
    }

    /**
     * Build the bounded form of this result.
     * @returns The summary.
     */
    #buildSummary(): ResultSummary {
        const declared = summaryValueField(this.shape);
        const valueField = declared === null || this.#findNumeric(declared) === null ? null : declared;
        const statistics = valueField === null ? null : this.#analyze(valueField).statistics;
        const range = statistics !== null && statistics.measured > 0 ? statistics : null;
        const top: SummaryEntry[] =
            valueField === null
                ? []
                : this.ranking(valueField, SUMMARY_TOP_LIMIT).map((entry) =>
                      Object.freeze({
                          id: entry.id,
                          label: this.#labelOf(entry.id) ?? String(entry.id),
                          value: entry.value,
                          rank: entry.rank,
                          percentile: entry.percentile,
                      }),
                  );

        const summary: ResultSummary = {
            count: this.#scopeCount(),
            measured: statistics === null ? this.#countPrimary() : statistics.measured,
            min: range === null ? null : range.min,
            max: range === null ? null : range.max,
            median: range === null ? null : range.median,
            mean: range === null ? null : range.mean,
            tiedAtMin: statistics === null ? 0 : statistics.tiedAtMin,
            normalization: this.#normalization(valueField),
            top: Object.freeze(top),
            caveats: this.#caveats,
            durationMs: this.#durationMs,
        };

        const table = this.graph.sizes ?? this.graph.categories;
        const groups = toSummaryGroups(table, SUMMARY_GROUP_LIMIT);

        return Object.freeze(groups === undefined ? summary : { ...summary, groups });
    }

    /**
     * How many elements this result was computed over.
     *
     * A shape publishes per-element fields for nodes, for edges or for neither, and the scope a
     * summary reports is the half or halves it actually measures. A shape that publishes nothing
     * per element reports none, rather than borrowing the graph's size to look busy.
     * @returns The count.
     */
    #scopeCount(): number {
        const contract = resultShapeContract(this.shape);
        const nodes = contract.nodeFields.length > 0 ? this.measured.nodes : 0;
        const edges = contract.edgeFields.length > 0 ? this.measured.edges : 0;

        return nodes + edges;
    }

    /**
     * How many elements carry the shape's primary field, for a shape that measures no number.
     * @returns The count.
     */
    #countPrimary(): number {
        const contract = resultShapeContract(this.shape);
        const { primaryField } = contract;
        if (primaryField === null) {
            return 0;
        }

        const nodes = contract.nodeFields.includes(primaryField) ? countDefined(this.#nodes, primaryField) : 0;
        const edges = contract.edgeFields.includes(primaryField) ? countDefined(this.#edges, primaryField) : 0;

        return nodes + edges;
    }

    /**
     * How this result's values were scaled.
     * @param valueField - The field a summary describes, or null when the shape measures no
     *   number.
     * @returns The normalisation the run published, the one its field declares, or "none".
     */
    #normalization(valueField: string | null): Normalization {
        const published = this.graph.normalization;
        if (isNormalization(published)) {
            return published;
        }

        return valueField === null ? "none" : declaredNormalization(this.fields, valueField);
    }
}

/**
 * Build the result a run publishes.
 *
 * Every field the result's shape declares and the algorithm did not publish is filled in here,
 * once, before the object is frozen -- the per-element `rank` and `percentile`, a metric's
 * graph-level range, a partition's group sizes, a set's count. An algorithm that published its
 * own value for any of them keeps it, so a weighted `cost` or a measured `modularity` is never
 * replaced by an inference.
 * @param init - What the run published, and what qualifies it.
 * @returns The result, immutable.
 */
export function createRunResult(init: RunResultInit): RunResult {
    const nodes = buildTable(init.nodes);
    const edges = buildTable(init.edges);
    const graph: Record<string, unknown> = { ...init.graph };

    fillShapeFields(init.shape, nodes, edges, graph, init.fields);

    for (const record of nodes.records) {
        Object.freeze(record);
    }

    for (const record of edges.records) {
        Object.freeze(record);
    }

    return new Result(init, nodes, edges, Object.freeze(graph));
}
