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
    MeasurementDeclaration,
    ReadableChannelKind,
    ReadableValue,
    ReadableValueKind,
} from "../catalog/types";
import { describeRows } from "./attributes";
import { elementIdsOf } from "./results/RunResult";
import { fieldMeasurement } from "./results/types";
import type { Run } from "./runs/types";
import { CHANNEL_DESCRIPTORS } from "./styles/channels";
import { columnFits } from "./styles/EncodingSpec";

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
 * What kind of value a described column holds.
 * @param column - The column.
 * @returns The kind.
 */
function kindOf(column: AttributeDescriptor): ReadableValueKind {
    if (column.type === "boolean") {
        return "yes-no";
    }

    if (column.measurement === "quantitative") {
        return "number";
    }

    // A string column with too many values to be groups is free text; numbers declared as codes
    // and a partition's ids are groups.
    const grouped = column.measurement === "categorical" || column.measurement === "ordinal";
    return grouped && column.type !== "string" && column.type !== "mixed" ? "category" : "text";
}

/**
 * One entry for a described column.
 * @param column - The column, with its path and names already the entry's.
 * @param from - Where it comes from.
 * @param declaration - Its declaration, if any.
 * @returns The entry.
 */
function entryOf(
    column: AttributeDescriptor,
    from: "data" | "run",
    declaration: MeasurementDeclaration | undefined,
): ReadableValue {
    const kind = kindOf(column);
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
        ...((kind === "category" || kind === "yes-no") && column.uniqueCount !== undefined
            ? { valueCount: column.uniqueCount }
            : {}),
        completeness: column.completeness,
        fits: Object.freeze(kinds.filter((each) => columnFits(column, declaration, each))),
    });
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
 * @returns The node id first, then the data columns, then each finished run's fields in run order.
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
        }),
    ];

    for (const column of input.attributes) {
        values.push(entryOf(column, "data", input.declarationOf(column)));
    }

    for (const run of input.runs) {
        for (const column of describeRun(run, input)) {
            values.push(entryOf(column, "run", undefined));
        }
    }

    return Object.freeze(values);
}
