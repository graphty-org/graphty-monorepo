/**
 * @file Computed columns: `data.derive`, the op behind `session.data.derive(name, expression)`.
 *
 * A computed column is a data column whose values an expression reads from other columns and
 * from run results, in the expression language selectors, scopes and filters speak (the query
 * engine's, `../query.ts`). Its values are written into the records like any column's, so every
 * reader -- pages, styles, find, export -- reads it with no change; its DEFINITION is a graph
 * value, so the project keeps the expression and works the values out again on open.
 *
 * One op does all three things a computed column needs: add one (definitions and values), change
 * one, and bring every one up to date after its inputs moved. The last is started by the commands
 * that move inputs -- a data edit, a load, a run finishing or going away -- as a deferred member of
 * their own step (`refreshDerivedAfter`), so undo takes back the edit and the values it caused
 * together, and undoing the step that added a column takes the column away.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { EdgeId, NodeId, Path, Query } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { SessionCommand } from "../planning";
import type { CommandDefinition, UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import { edgeSpaceOf } from "../scope/spaces";
import { deepEquals, quotePath } from "../styles/predicate";
import type { DerivedColumn, RowUpdate } from "../types";
import { serviceOf } from "./data";

/** The graph value holding every computed column's definition, in the order they are worked out. */
const DERIVED_VALUE = "derived";

/** `data.derive`: set the computed columns, and write the values that change. */
export interface DataDeriveCommand {
    readonly op: "data.derive";
    /** Every computed column after the step, in the order they are worked out. */
    readonly columns: readonly DerivedColumn[];
    /** The node values that change. */
    readonly nodes?: readonly RowUpdate<NodeId>[];
    /** The edge values that change. */
    readonly edges?: readonly RowUpdate<EdgeId>[];
    /** The column the step added or changed; absent when it only brings values up to date. */
    readonly column?: { readonly kind: "node" | "edge"; readonly name: string };
}

/** No computed columns. */
const NONE: readonly DerivedColumn[] = Object.freeze([]);

/**
 * The computed columns a graph's values hold.
 * @param values - The graph slice's values.
 * @returns The columns, in order; empty when there are none.
 */
export function derivedColumnsOf(values: ReadonlyMap<string, unknown>): readonly DerivedColumn[] {
    return (values.get(DERIVED_VALUE) as readonly DerivedColumn[] | undefined) ?? NONE;
}

/**
 * What an expression reads for every element of one kind, by dense index: the query engine's
 * `values`, with `overlay` read in place of the session's values.
 */
export type ValuesWhere = (
    where: Query,
    target: "node" | "edge",
    overlay?: ReadonlyMap<Path, readonly unknown[]>,
) => unknown[];

/**
 * The values of computed columns that differ from what the records hold now. The columns are
 * worked out in order, and one reading an earlier one reads its new values.
 * @param columns - The computed columns.
 * @param snapshot - The graph, for the ids at each dense index.
 * @param valuesWhere - Reads an expression over every element.
 * @returns The rows to write, per kind; a row carries every column of it that changed.
 */
export function derivedRows(
    columns: readonly DerivedColumn[],
    snapshot: GraphSnapshot,
    valuesWhere: ValuesWhere,
): { readonly nodes: RowUpdate<NodeId>[]; readonly edges: RowUpdate<EdgeId>[] } {
    const fresh = { node: new Map<Path, unknown[]>(), edge: new Map<Path, unknown[]>() };
    const changed = {
        node: new Map<number, Record<string, unknown>>(),
        edge: new Map<number, Record<string, unknown>>(),
    };
    for (const column of columns) {
        const path = `data.${column.name}`;
        const overlay = fresh[column.kind];
        let values: unknown[];
        try {
            values = valuesWhere(column.expression, column.kind, overlay);
        } catch {
            // Checked when it was added; a project file anyone edited could still hold a bad one.
            continue;
        }

        const held = valuesWhere(quotePath(path), column.kind);
        overlay.set(path, values);
        const rows = changed[column.kind];
        values.forEach((value, at) => {
            if (!deepEquals(value, held[at])) {
                const row = rows.get(at) ?? {};
                row[column.name] = value;
                rows.set(at, row);
            }
        });
    }

    const nodes = [...changed.node].map(([at, values]) => ({ id: snapshot.ids.idOf(at), values }));
    if (changed.edge.size === 0) {
        return { nodes, edges: [] };
    }

    const space = edgeSpaceOf(snapshot);
    return { nodes, edges: [...changed.edge].map(([at, values]) => ({ id: space.idOf(at), values })) };
}

/**
 * Whether a value is a list of computed columns, as a command or a project file may hold one.
 * @param value - The value.
 * @returns True when every entry has a kind, a name and an expression.
 */
function isColumns(value: unknown): value is readonly DerivedColumn[] {
    return (
        Array.isArray(value) &&
        value.every((each: unknown) => {
            const { kind, name, expression } = (typeof each === "object" && each !== null ? each : {}) as Record<
                string,
                unknown
            >;
            return (
                (kind === "node" || kind === "edge") &&
                typeof name === "string" &&
                name !== "" &&
                typeof expression === "string"
            );
        })
    );
}

/**
 * Start bringing the computed columns up to date once a command that moved their inputs has been
 * recorded, as a deferred member of its step. Does nothing while there are none.
 * @param ctx - The command's context.
 */
export function refreshDerivedAfter(ctx: UndoableContext): void {
    const refresh = ctx.services.derive;
    if (refresh === undefined || derivedColumnsOf(ctx.state.graph.values).length === 0) {
        return;
    }

    ctx.after(DERIVED_VALUE, (dispatch) => {
        const command = refresh();
        if (command !== null) {
            // An undo that took the step away cancels this too; the values go with it.
            void dispatch(command).catch(() => undefined);
        }
    });
}

const dataDerive: UndoableDefinition<DataDeriveCommand> = {
    op: "data.derive",
    undo: {
        kind: "undoable",
        label: (command) =>
            command.column === undefined ? "Updated the computed columns" : `Computed ${command.column.name}`,
        fact: (command) => ({
            code: "data.derive",
            params: { kind: command.column?.kind ?? null, column: command.column?.name ?? null },
        }),
    },
    moves: false,
    draws: true,
    // The rows it writes are any of the graph's; a computed column is as wide as the graph.
    keys: () => ["graph"],
    lane: { kind: "queued", category: "data-update" },
    execute: (command, ctx) => {
        if (!isColumns(command.columns)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "Computed columns list each column's kind, name and expression.",
                source: "data",
                details: { reason: "not-columns", columns: command.columns },
            });
        }

        const service = serviceOf(ctx.services.data);
        if (service.values === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session cannot write graph values, so it cannot keep computed columns.",
                source: "data",
            });
        }

        // Written without `after`: these rows are the refresh, and must not start another.
        if (command.nodes !== undefined && command.nodes.length > 0) {
            service.apply({ kind: "update-rows", target: "node", rows: command.nodes }, ctx.draft);
        }

        if (command.edges !== undefined && command.edges.length > 0) {
            service.apply({ kind: "update-rows", target: "edge", rows: command.edges }, ctx.draft);
        }

        service.values(
            {
                [DERIVED_VALUE]:
                    command.columns.length === 0
                        ? undefined
                        : Object.freeze(command.columns.map((column) => Object.freeze({ ...column }))),
            },
            ctx.draft,
        );
    },
};

/** The computed-column op's definition. */
export const DERIVE_DEFINITIONS: readonly CommandDefinition<SessionCommand>[] = [dataDerive];
