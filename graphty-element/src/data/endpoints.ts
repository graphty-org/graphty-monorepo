/**
 * @file Deciding which keys of an edge record name its endpoints, once per batch, out loud.
 *
 * The element used to read two configured paths whose defaults were `src` and `dst`, while its own
 * guides taught `source` and `target`. A file spelled the way the guides teach passed validation,
 * reached the data manager, resolved null against both defaults, and produced a graph with nodes,
 * no edges and no error -- while the load event reported the full edge count, because that number
 * counted records handed over rather than edges accepted.
 *
 * This module is the whole of the fix: one implementation, one decision per batch, and a thrown
 * error rather than a silent edgeless graph when no spelling answers.
 */

import jmespath from "jmespath";

import { GraphtyError } from "../errors/GraphtyError";

/** How the endpoint expressions for a batch of edge records were arrived at. */
export type EndpointSpelling = "source/target" | "src/dst" | "from/to" | "declared";

/** The endpoint expressions in force for one batch of edge records, and where they came from. */
export interface ResolvedEndpoints {
    /** The JMESPath expression actually used to read the source endpoint. */
    readonly source: string;
    /** The JMESPath expression actually used to read the target endpoint. */
    readonly target: string;
    /** Which spelling answered, or `"declared"` when the caller named the columns. */
    readonly resolvedFrom: EndpointSpelling;
}

/** What a caller may declare, from `knownFields` or from an `addEdges` option. Null means probe. */
interface DeclaredEndpoints {
    /** The source expression the caller named, or null. */
    readonly source: string | null;
    /** The target expression the caller named, or null. */
    readonly target: string | null;
}

/**
 * The spellings that are probed, in the order they are probed.
 *
 * `source`/`target` is first because it is what the ecosystem writes: D3, Cytoscape, NetworkX
 * JSON, GEXF, GraphML and GML all use it, and none of them uses `src`/`dst`. `from`/`to` is third
 * because vis.js uses it.
 */
const PROBE_ORDER: readonly ResolvedEndpoints[] = Object.freeze([
    { source: "source", target: "target", resolvedFrom: "source/target" },
    { source: "src", target: "dst", resolvedFrom: "src/dst" },
    { source: "from", target: "to", resolvedFrom: "from/to" },
]);

/** How many column names the unresolved error reports before it stops listing. */
const MAX_REPORTED_COLUMNS = 50;

/**
 * Read one endpoint out of one record, treating a JMESPath failure as "this record does not
 * answer" rather than as an import failure.
 * @param record - the raw edge record
 * @param expression - the JMESPath expression to evaluate against it
 * @returns the value, or null when the record does not carry it
 */
export function readEndpoint(record: Record<string | number, unknown>, expression: string): unknown {
    try {
        return jmespath.search(record, expression) as unknown;
    } catch {
        // A malformed expression is the caller's, not the record's, and it is the same answer for
        // every record in the batch: nothing resolves, and the batch throws with the columns it
        // does carry, which is the information that lets a reader write a working expression.
        return null;
    }
}

/**
 * The top-level keys the records in a batch carry, in first-mention order.
 * @param records - the edge records
 * @returns up to {@link MAX_REPORTED_COLUMNS} names
 */
function columnsOf(records: readonly Record<string | number, unknown>[]): string[] {
    const seen = new Set<string>();
    for (const record of records) {
        for (const key of Object.keys(record)) {
            seen.add(key);
            if (seen.size >= MAX_REPORTED_COLUMNS) {
                return [...seen];
            }
        }
    }

    return [...seen];
}

/**
 * Decide the endpoint expressions for one batch of edge records.
 *
 * The rules, in force order:
 *
 * - A DECLARED pair wins and is never probed against. A consumer who named the columns has
 *   settled the question, and a record that does not answer them is a rejected record rather than
 *   a reason to try another spelling.
 * - Otherwise the batch is probed in {@link PROBE_ORDER}, and the first pair for which SOME record
 *   yields a non-null value for BOTH halves wins.
 * - The decision is per batch, never per record. A file that spells one edge `source`/`target` and
 *   another `from`/`to` is a broken file, and resolving per record makes the answer unreportable
 *   and order-dependent.
 * @param records - the batch's edge records; an empty batch never throws
 * @param declared - what the caller named, if anything
 * @returns the expressions every record in this batch is read with
 * @throws A `GraphtyError` with `E_EDGE_ENDPOINTS_UNRESOLVED` when the batch carries edge records
 *     and no spelling answers for any of them. `details.columns` names what the records do carry.
 */
export function resolveEndpoints(
    records: readonly Record<string | number, unknown>[],
    declared: DeclaredEndpoints,
): ResolvedEndpoints {
    if (declared.source !== null && declared.target !== null) {
        return { source: declared.source, target: declared.target, resolvedFrom: "declared" };
    }

    // A half-declared pair is still a declaration: the caller named one column, and probing the
    // other half independently would pair a named column with a guessed one.
    if (declared.source !== null || declared.target !== null) {
        return {
            source: declared.source ?? "source",
            target: declared.target ?? "target",
            resolvedFrom: "declared",
        };
    }

    if (records.length === 0) {
        // Nothing to decide and nothing to complain about. A chunked load whose first chunk is all
        // nodes must not fail before the edges arrive.
        return PROBE_ORDER[0];
    }

    for (const candidate of PROBE_ORDER) {
        for (const record of records) {
            const source = readEndpoint(record, candidate.source);
            const target = readEndpoint(record, candidate.target);
            if (source !== null && source !== undefined && target !== null && target !== undefined) {
                return candidate;
            }
        }
    }

    const columns = columnsOf(records);
    throw new GraphtyError({
        code: "E_EDGE_ENDPOINTS_UNRESOLVED",
        source: "data",
        message:
            `No edge endpoint columns found. The element looked for source/target, src/dst and from/to, ` +
            `and these records carry ${columns.length === 0 ? "no top-level keys at all" : columns.join(", ")}. ` +
            `Name the columns with data.knownFields.edgeSrcIdPath and edgeDstIdPath.`,
        details: { columns, tried: PROBE_ORDER.map((candidate) => candidate.resolvedFrom), records: records.length },
    });
}
