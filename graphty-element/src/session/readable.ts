/**
 * @file Every value a rule or a binding can read, as one list: the node id, the data columns and
 * the fields finished runs published per element.
 *
 * A rule editor and a "vary by" picker ask the same question, and each building its own answer
 * from `data.attributes()` and `results.roots` is how two pickers come to disagree. So the list is
 * the element's: run fields are described by the same walk as data columns, and whether a value
 * fits a kind of channel is the same decision `styles.proposeEncoding({ column })` makes.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type {
    AttributeDescriptor,
    AttributeUse,
    MeasurementDeclaration,
    Path,
    ReadableChannelKind,
    ReadableValue,
    ReadableValueKind,
    RuleTestKind,
} from "../catalog/types";
import { describeRows } from "./attributes";
import { elementIdsOf } from "./results/RunResult";
import { fieldMeasurement } from "./results/types";
import type { Run } from "./runs/types";
import { CHANNEL_DESCRIPTORS } from "./styles/channels";
import { columnFits, readableKindOf } from "./styles/EncodingSpec";

/** What the list is built from. */
export interface ReadableInput {
    /** The snapshot, for the counts and the node ids. */
    readonly snapshot: GraphSnapshot;
    /** Whether the graph is directed; on an undirected one a `directedOnly` field is left out. */
    readonly directed: boolean;
    /** `data.attributes()`, declarations already applied. */
    readonly attributes: readonly AttributeDescriptor[];
    /** A column's declaration, read for an ordinal column's order. */
    readonly declarationOf: (column: AttributeDescriptor) => MeasurementDeclaration | undefined;
    /** The session's runs, in order; only finished ones are read. */
    readonly runs: readonly Run[];
    /** The layers that read a path on a half now, in stack order; a data column brings its own `usedBy`. */
    readonly layersReading?: (path: string, on: "node" | "edge") => readonly AttributeUse[];
}

/** The channel kinds a value can be listed as fitting, in the order they are listed. */
const KINDS: readonly ReadableChannelKind[] = ["color", "number", "enum", "text", "boolean"];

/**
 * Which kinds of channel a half has at all.
 * @param on - Nodes or edges.
 * @returns The kinds.
 */
function kindsOn(on: "node" | "edge"): readonly ReadableChannelKind[] {
    const present = new Set(
        Object.values(CHANNEL_DESCRIPTORS)
            .filter((descriptor) => descriptor.target === on)
            .map((descriptor) => descriptor.accepts),
    );
    return KINDS.filter((kind) => present.has(kind));
}

const NODE_KINDS = kindsOn("node");
const EDGE_KINDS = kindsOn("edge");

/**
 * One entry for a described column.
 * @param column - The column, with its path and names already the entry's.
 * @param from - Where it comes from.
 * @param declaration - Its declaration, if any.
 * @param usedBy - What reads it now.
 * @returns The entry.
 */
function entryOf(
    column: AttributeDescriptor,
    from: "data" | "run",
    declaration: MeasurementDeclaration | undefined,
    usedBy: readonly AttributeUse[] | undefined,
): ReadableValue {
    const kind = readableKindOf(column);
    const kinds = column.kind === "node" ? NODE_KINDS : EDGE_KINDS;
    return Object.freeze({
        path: column.path,
        plainName: column.plainName,
        technicalName: column.technicalName,
        on: column.kind,
        from,
        ...(column.runId === undefined ? {} : { runId: column.runId }),
        kind,
        ...(kind === "number" && column.min !== undefined && column.max !== undefined
            ? { range: Object.freeze({ min: column.min, max: column.max }) }
            : {}),
        // A number column's count is there only while it was countable (the walk stops at 256).
        ...(kind !== "text" && column.uniqueCount !== undefined ? { valueCount: column.uniqueCount } : {}),
        ...(column.valuesAreColors === true ? { valuesAreColors: true as const } : {}),
        ...(column.holdsNodeIds === true && from === "data" ? { holdsNodeIds: true as const } : {}),
        completeness: column.completeness,
        fits: Object.freeze(kinds.filter((each) => columnFits(column, declaration, each))),
        ...(usedBy === undefined || usedBy.length === 0 ? {} : { usedBy: Object.freeze([...usedBy]) }),
        tests: testsOf(kind, column.path, column.uniqueCount !== undefined),
    });
}

/**
 * The rule leaves that can test a value: see `ReadableValue.tests`.
 * @param kind - What kind of value it is.
 * @param path - Its path; a `threshold` leaf reads only `data.` and `results.` paths.
 * @param countable - Whether its distinct values were few enough to count.
 * @returns The leaf kinds.
 */
function testsOf(kind: ReadableValueKind, path: Path, countable: boolean): readonly RuleTestKind[] {
    const ranked = path.startsWith("data.") || path.startsWith("results.");
    const tests: RuleTestKind[] = [];
    if (kind === "number") {
        tests.push("range", ...(ranked ? (["top", "above"] as const) : []));
    }

    if (kind === "category" || kind === "yes-no" || countable) {
        tests.push("categories");
    }

    if (kind === "text" || kind === "category") {
        tests.push("text");
    }

    return Object.freeze(tests);
}

/**
 * The fields one finished run published per element, described as data columns are.
 * @param run - The run.
 * @param input - The snapshot and the graph's direction.
 * @returns The descriptors.
 */
function describeRun(run: Run, input: ReadableInput): AttributeDescriptor[] {
    const { result } = run;
    if (result === undefined) {
        return [];
    }

    const described: AttributeDescriptor[] = [];
    for (const half of ["node", "edge"] as const) {
        const fields = result.fields.filter(
            (field) => field.kind === half && field.type !== "table" && (input.directed || field.directedOnly !== true),
        );
        if (fields.length === 0) {
            continue;
        }

        // ponytail: one record per element per call; cache on the run's execution if a picker
        // opened on a 50,000-node graph shows up in a profile.
        const total = half === "node" ? input.snapshot.nodeCount : input.snapshot.edgeCount;
        const rows: Readonly<Record<string, unknown>>[] = elementIdsOf(result, half).map(
            (id) => (half === "node" ? result.node(id) : result.edge(String(id))) ?? {},
        );
        while (rows.length < total) {
            rows.push({});
        }

        const columns = describeRows(rows, half, []);
        for (const field of fields) {
            const column = columns.find((each) => each.name === field.name);
            if (column === undefined) {
                continue;
            }

            described.push({
                ...column,
                path: field.path,
                plainName: field.plainName,
                technicalName: field.technicalName,
                origin: "result",
                runId: run.id,
                measurement: fieldMeasurement(field, run.shape),
            });
        }
    }

    return described;
}

/**
 * Every value a rule or a binding can read.
 * @param input - What the list is built from.
 * @returns The node id first, then the data columns, then each finished run's fields in run order,
 *     then every node value read at each edge's source, then at its target.
 */
export function readableValues(input: ReadableInput): readonly ReadableValue[] {
    const values: ReadableValue[] = [
        Object.freeze({
            path: "id",
            plainName: "Node id",
            technicalName: "id",
            on: "node",
            from: "element",
            kind: "text",
            completeness: 1,
            fits: Object.freeze([]),
            tests: Object.freeze(["text"] as const),
        }),
    ];

    const nodeColumns: [AttributeDescriptor, "data" | "run", MeasurementDeclaration | undefined][] = [];
    for (const column of input.attributes) {
        const declaration = input.declarationOf(column);
        values.push(entryOf(column, "data", declaration, column.usedBy));
        if (column.kind === "node") {
            nodeColumns.push([column, "data", declaration]);
        }
    }

    for (const run of input.runs) {
        for (const column of describeRun(run, input)) {
            values.push(entryOf(column, "run", undefined, input.layersReading?.(column.path, column.kind)));
            if (column.kind === "node") {
                nodeColumns.push([column, "run", undefined]);
            }
        }
    }

    // Each node value again on the edges, read at each end. Its facts are the nodes' own. With no
    // edges there is nothing to read them on, so a picker lists none.
    const ends = input.snapshot.edgeCount > 0 ? (["source", "target"] as const) : [];
    for (const end of ends) {
        for (const [column, from, declaration] of nodeColumns) {
            const path = `graphty.${end}.${column.path}`;
            const read = entryOf(
                { ...column, kind: "edge", path },
                from,
                declaration,
                input.layersReading?.(path, "edge"),
            );
            values.push(Object.freeze({ ...read, end }));
        }
    }

    return Object.freeze(values);
}
