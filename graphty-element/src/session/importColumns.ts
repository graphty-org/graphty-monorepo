/**
 * @file The typed door's columns turned into the two adds the record doors make
 * (design/rendering/row-renderer.md, section 4.6, "The typed door"), checked first so a malformed
 * call adds nothing.
 */

import { GraphtyError } from "../errors";
import type { DataMutation } from "./commands/data";
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
 * The adds the columns make: the nodes, read by `id`, then the edges, read by `source`, `target`
 * and `weight`, so the graph is the one the record doors make from the same rows.
 * ponytail: builds a record per row; staging straight into the builder's columns is the next step
 * of the stage (row-renderer.md 4.6, "Staging").
 * @param columns - The columns.
 * @returns The two mutations, nodes first.
 * @throws `E_BAD_COMMAND` when the columns do not line up.
 */
export function columnMutations(columns: ImportColumnsInput): [DataMutation, DataMutation] {
    check(columns);
    const { sources, targets, nodeCount, ids, weights, positions, attributes } = columns;
    const idOf = (row: number): string | number => (ids === undefined ? row : ids[row]);
    const nodes = Array.from({ length: nodeCount }, (_, row) => {
        const record: Record<string, unknown> = { id: idOf(row) };
        if (positions !== undefined) {
            record.position = [positions[row * 3], positions[row * 3 + 1], positions[row * 3 + 2]];
        }

        return withAttributes(attributes?.nodes, row, record);
    });
    const edges = Array.from({ length: sources.length }, (_, at) => {
        const record: Record<string, unknown> = { source: idOf(sources[at]), target: idOf(targets[at]) };
        if (weights !== undefined) {
            record.weight = weights[at];
        }

        return withAttributes(attributes?.edges, at, record);
    });
    return [
        { kind: "add-nodes", records: nodes, idPath: "id" },
        { kind: "add-edges", records: edges, source: "source", target: "target", weight: "weight" },
    ];
}
