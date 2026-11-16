/**
 * @file The typed door's columns turned into the two adds the record doors make
 * (design/rendering/row-renderer.md, section 4.6, "The typed door"), checked first so a malformed
 * call adds nothing.
 */

import { GraphtyError } from "../errors";
import type { DataMutation } from "./commands/data";
import { frozenRecord } from "./project/draft";
import { type RowSource, rowsView } from "./project/recordMap";
import type { ImportColumnsInput } from "./types";

/**
 * The error a malformed call is refused with.
 * @param field - What is wrong.
 * @returns The error.
 */
function bad(field: string): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        source: "data",
        message: `The importColumns argument is malformed: ${field}.`,
        details: { door: "importColumns", field },
    });
}

/**
 * Check that an optional column holds one value per row.
 * @param name - The column's name, for the error.
 * @param column - The column, or undefined.
 * @param length - The length it must have.
 */
function checkLength(name: string, column: ArrayLike<unknown> | undefined, length: number): void {
    if (column !== undefined && column.length !== length) {
        throw bad(`${name} has ${String(column.length)} values, not ${String(length)}`);
    }
}

/**
 * Check the columns line up: endpoints in range, one value per row in every other column.
 * @param columns - The columns.
 */
function check(columns: ImportColumnsInput): void {
    const { sources, targets, nodeCount } = columns;
    if (!Number.isInteger(nodeCount) || nodeCount < 0) {
        throw bad("nodeCount is not a whole number of nodes");
    }

    checkLength("targets", targets, sources.length);
    for (let at = 0; at < sources.length; at++) {
        for (const row of [sources[at], targets[at]]) {
            if (!Number.isInteger(row) || row < 0 || row >= nodeCount) {
                throw bad(`edge ${String(at)} names node row ${String(row)}, outside 0 to ${String(nodeCount - 1)}`);
            }
        }
    }

    checkLength("ids", columns.ids, nodeCount);
    checkLength("weights", columns.weights, sources.length);
    checkLength("positions", columns.positions, nodeCount * 3);
    for (const [name, column] of Object.entries(columns.attributes?.nodes ?? {})) {
        checkLength(`node attribute ${name}`, column, nodeCount);
    }

    for (const [name, column] of Object.entries(columns.attributes?.edges ?? {})) {
        checkLength(`edge attribute ${name}`, column, sources.length);
    }
}

/**
 * The records of one row across named columns.
 * @param attributes - The columns by name.
 * @param row - The row.
 * @param into - The record to write them into.
 * @returns The record.
 */
function withAttributes(
    attributes: Readonly<Record<string, ArrayLike<unknown>>> | undefined,
    row: number,
    into: Record<string, unknown>,
): Record<string, unknown> {
    for (const name in attributes) {
        into[name] = attributes[name][row];
    }

    return into;
}

/**
 * A copy of a column, so a caller writing its own array after the call changes nothing kept.
 * @param column - The column, or undefined.
 * @returns The copy, or undefined.
 */
function copied<T>(column: ArrayLike<T> | undefined): ArrayLike<T> | undefined {
    if (column === undefined) {
        return undefined;
    }

    return ArrayBuffer.isView(column) ? (column as unknown as { slice(): ArrayLike<T> }).slice() : Array.from(column);
}

/**
 * Copies of the columns, each optional column copied only when given.
 * @param columns - The columns.
 * @returns The copies.
 */
function copiedColumns(columns: ImportColumnsInput): ImportColumnsInput {
    const named = (all: Readonly<Record<string, ArrayLike<unknown>>> | undefined): Record<string, ArrayLike<unknown>> =>
        Object.fromEntries(Object.entries(all ?? {}).map(([name, column]) => [name, copied(column) ?? []]));
    return {
        sources: copied(columns.sources) ?? [],
        targets: copied(columns.targets) ?? [],
        nodeCount: columns.nodeCount,
        ids: copied(columns.ids),
        weights: copied(columns.weights),
        positions: copied(columns.positions),
        attributes: { nodes: named(columns.attributes?.nodes), edges: named(columns.attributes?.edges) },
    };
}

/**
 * The two row sources of a call's columns: one record per node row, one per edge.
 * @param columns - The columns, already checked.
 * @param frozen - Freeze each record built (the `"batched"` path); the objects path's are not.
 * @returns The node source and the edge source.
 */
function rowSources(columns: ImportColumnsInput, frozen: boolean): [RowSource, RowSource] {
    const { sources, targets, nodeCount, ids, weights, positions, attributes } = columns;
    const idOf = (row: number): string | number => (ids === undefined ? row : ids[row]);
    const node = (row: number): Record<string, unknown> => {
        const record: Record<string, unknown> = { id: idOf(row) };
        if (positions !== undefined) {
            record.position = [positions[row * 3], positions[row * 3 + 1], positions[row * 3 + 2]];
        }

        return withAttributes(attributes?.nodes, row, record);
    };
    const edge = (at: number): Record<string, unknown> => {
        const record: Record<string, unknown> = { source: idOf(sources[at]), target: idOf(targets[at]) };
        if (weights !== undefined) {
            record.weight = weights[at];
        }

        return withAttributes(attributes?.edges, at, record);
    };
    const freeze = (record: Record<string, unknown>): Record<string, unknown> =>
        frozen ? frozenRecord(record) : record;
    return [
        { size: nodeCount, build: (row) => freeze(node(row)) },
        { size: sources.length, build: (at) => freeze(edge(at)) },
    ];
}

/**
 * The adds the columns make: the nodes, read by `id`, then the edges, read by `source`, `target`
 * and `weight`, so the graph is the one the record doors make from the same rows.
 * @param columns - The columns.
 * @param batched - The `"batched"` render path: the adds hold copies of the columns, not records,
 *     and each record is built when read (row-renderer.md 4.6, "Records into columns"), so the
 *     journal, the graph slice and the op log keep a row number per record, not an object.
 *     Otherwise each record is built once, here, as the record doors' callers build theirs.
 * @returns The two mutations, nodes first.
 * @throws `E_BAD_COMMAND` when the columns do not line up.
 */
export function columnMutations(columns: ImportColumnsInput, batched = false): [DataMutation, DataMutation] {
    check(columns);
    const [nodeRows, edgeRows] = rowSources(batched ? copiedColumns(columns) : columns, batched);
    const records = (source: RowSource): readonly Record<string, unknown>[] =>
        batched ? rowsView(source) : Array.from({ length: source.size }, (_, row) => source.build(row));
    return [
        { kind: "add-nodes", records: records(nodeRows), idPath: "id" },
        // Without a weights column the edges are read as the record doors read them (a `value`
        // column is still a weight), so the graph is theirs.
        {
            kind: "add-edges",
            records: records(edgeRows),
            source: "source",
            target: "target",
            ...(columns.weights === undefined ? {} : { weight: "weight" }),
        },
    ];
}
