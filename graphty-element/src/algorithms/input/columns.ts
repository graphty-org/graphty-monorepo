/**
 * @file Where the columns a run reads come from: the attributes records arrived with, and the
 * values earlier runs published, laid out over the rows of the run's snapshot.
 *
 * The snapshot the store freezes carries topology, weights and the element's own bookkeeping
 * columns, not the arbitrary keys a record was imported with. A plugin that declares an
 * "attribute" or "partition" option still has to read the values behind it, and it must not read
 * the render objects or the session to get them, so the element reads them here and hands the
 * plugin a graph-format column over the rows it already works in.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { EdgeId, OptionDescriptor } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { GraphSession } from "../../session/types";

/** Which elements a column is over. */
type ColumnKind = "node" | "edge";

/** One column's values, by row of the snapshot it was read over. */
export interface ColumnValues {
    readonly kind: ColumnKind;
    /** One value per row; undefined where the element carries none. */
    readonly values: unknown[];
}

/** What an input reads its columns through. The algorithm builds one; the input only asks it. */
export interface InputColumns {
    /**
     * The path a declared "attribute" or "partition" option names.
     * @param optionName - The option's name.
     * @returns The path, and the kind of element it is over when the option fixes it.
     * @throws A GraphtyError with E_UNKNOWN_OPTION for a name the algorithm does not declare as
     *   an attribute or partition option, or E_OPTION_RANGE when it has no value.
     */
    option(optionName: string): { readonly path: string; readonly on?: ColumnKind };
    /**
     * The values at an attribute or result path, by row of `graph`.
     * @param graph - The snapshot whose rows the values are laid out over.
     * @param path - `data.<key>` (or the bare key), or `results.<run>.<field>`.
     * @param on - The kind of element, when the caller fixes it; else the kind that carries it.
     * @param edgeIdAt - The element's edge id of a row of `graph`.
     * @returns The values, or null when nothing carries the path.
     */
    read(
        graph: GraphSnapshot,
        path: string,
        on: ColumnKind | undefined,
        edgeIdAt: (row: number) => EdgeId,
    ): ColumnValues | null;
}

const RESULT_PREFIX = "results.";
const ATTRIBUTE_PREFIX = "data.";

/**
 * Lay one value reader out over the rows of a snapshot.
 * @param graph - The snapshot.
 * @param kind - Nodes or edges.
 * @param edgeIdAt - The edge id of a row.
 * @param node - A node's value, by id.
 * @param edge - An edge's value, by id.
 * @returns The values.
 */
function layOut(
    graph: GraphSnapshot,
    kind: ColumnKind,
    edgeIdAt: (row: number) => EdgeId,
    node: (id: string | number) => unknown,
    edge: (id: EdgeId) => unknown,
): ColumnValues {
    const count = kind === "node" ? graph.nodeCount : graph.edgeCount;
    const values = new Array<unknown>(count);
    for (let row = 0; row < count; row++) {
        const value = kind === "node" ? node(graph.ids.idOf(row)) : edge(edgeIdAt(row));
        values[row] = value ?? undefined;
    }

    return { kind, values };
}

/**
 * The columns a run of one algorithm reads, from the session it runs in.
 * @param session - The session: its records and its published results.
 * @param declared - The options the algorithm declares.
 * @param resolved - The option values this run resolved.
 * @param algorithm - The algorithm's key, for the errors.
 * @returns The reader.
 */
export function sessionColumns(
    session: GraphSession,
    declared: readonly OptionDescriptor[],
    resolved: Readonly<Record<string, unknown>>,
    algorithm: string,
): InputColumns {
    return {
        option(optionName) {
            const option = declared.find(
                (candidate) =>
                    candidate.name === optionName && (candidate.type === "attribute" || candidate.type === "partition"),
            );
            if (option === undefined) {
                throw new GraphtyError({
                    code: "E_UNKNOWN_OPTION",
                    message: `"${optionName}" is not an attribute or partition option of "${algorithm}"`,
                    source: "run",
                    details: {
                        algorithm,
                        option: optionName,
                        candidates: declared
                            .filter((candidate) => candidate.type === "attribute" || candidate.type === "partition")
                            .map((candidate) => candidate.name),
                    },
                });
            }

            const path = resolved[optionName];
            if (typeof path !== "string" || path === "") {
                throw new GraphtyError({
                    code: "E_OPTION_RANGE",
                    message: `"${optionName}" names no attribute`,
                    source: "run",
                    details: { algorithm, option: optionName },
                });
            }

            return option.type === "partition" ? { path, on: "node" } : { path };
        },

        read(graph, path, on, edgeIdAt) {
            if (path.startsWith(RESULT_PREFIX)) {
                const [run, field, ...rest] = path.slice(RESULT_PREFIX.length).split(".");
                const result = field === undefined || rest.length > 0 ? undefined : session.results.get(run);
                const kind =
                    on ??
                    result?.fields.find((candidate) => candidate.name === field && candidate.kind !== "graph")?.kind;
                if (result === undefined || (kind !== "node" && kind !== "edge")) {
                    return null;
                }

                return layOut(
                    graph,
                    kind,
                    edgeIdAt,
                    (id) => result.node(id)?.[field],
                    (id) => result.edge(id)?.[field],
                );
            }

            const key = path.startsWith(ATTRIBUTE_PREFIX) ? path.slice(ATTRIBUTE_PREFIX.length) : path;
            const carried = session.data.attributes().filter((attribute) => attribute.name === key);
            // A key both nodes and edges carry is read on nodes unless the option fixes the kind.
            const kind = on ?? (carried.some((a) => a.kind === "node") ? "node" : carried[0]?.kind);
            if (kind === undefined || !carried.some((attribute) => attribute.kind === kind)) {
                return null;
            }

            return layOut(
                graph,
                kind,
                edgeIdAt,
                (id) => session.data.node(id)?.[key],
                (id) => session.data.edge(id)?.[key],
            );
        },
    };
}
