/**
 * @file Joining a table onto the graph: the suggestion, the counts and the plan behind
 * `draft.suggestJoin()`, `draft.joinReport()`, `draft.load({ join })` and `data.editJoin()`.
 * Pure functions over the table's rows and the graph's records; `data.ts` dispatches the plan.
 */

import type { EdgeId, NodeId, SourceKey } from "../catalog/types";
import { GraphtyError } from "../errors";
import type { JoinChoices, JoinKey, JoinRecord, JoinReport, JoinShape, JoinSuggestion, RowUpdate } from "./types";

/** A table as a join reads it. */
export interface JoinTable {
    readonly name: string;
    readonly columns: readonly string[];
    readonly rows: readonly Readonly<Record<string, unknown>>[];
}

/** One node or edge as a join reads it: its id and its attributes. */
interface JoinElement {
    readonly id: NodeId | EdgeId;
    readonly data: Readonly<Record<string, unknown>>;
}

/** The graph as a join reads it. */
export interface JoinGraph {
    readonly nodes: readonly JoinElement[];
    readonly edges: readonly JoinElement[];
    /** The joined tables a `via` may name, by their load's key. */
    readonly joins: ReadonlyMap<SourceKey, JoinRecord>;
}

/** What a join writes: values onto elements, or edges to load. */
export type JoinPlan =
    | {
          readonly kind: "values";
          readonly target: "node" | "edge";
          readonly rows: readonly RowUpdate<NodeId | EdgeId>[];
          readonly matchedIds: readonly (NodeId | EdgeId)[];
          readonly columns: readonly string[];
          readonly before: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
      }
    | {
          readonly kind: "edges";
          readonly edges: readonly Record<string, unknown>[];
          readonly source: string;
          readonly target: string;
          readonly columns: readonly string[];
      }
    | { readonly kind: "rows" };

/** How keys are compared. */
interface Loose {
    readonly ignoreCase: boolean;
    readonly ignoreSpaces: boolean;
}

/** Joins compound key parts; no table value holds it. */
const PART = "\u0001";

/** The share of a key's values that must match for a suggestion to be confident. */
const CONFIDENT = 0.5;

/**
 * A refusal of a join choice.
 * @param message - What is wrong.
 * @param details - The facts.
 * @returns The error.
 */
function badJoin(message: string, details: Record<string, unknown>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", source: "data", message, details });
}

/**
 * A key value as compared: text, with case and spaces dropped when asked; undefined for a blank.
 * @param value - The value.
 * @param loose - How to compare.
 * @returns The compared form.
 */
function norm(value: unknown, loose: Loose): string | undefined {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        return undefined;
    }

    let text = String(value);
    if (loose.ignoreSpaces) {
        text = text.replaceAll(/\s+/g, "");
    }

    if (loose.ignoreCase) {
        text = text.toLowerCase();
    }

    return text === "" ? undefined : text;
}

/**
 * Whether a value counts as absent.
 * @param value - The value.
 * @returns True for undefined, null and empty text.
 */
function absent(value: unknown): boolean {
    return value === undefined || value === null || value === "";
}

/**
 * One graph value of an element.
 * @param element - The element.
 * @param path - `"id"` or `"data.<column>"` (a bare column name reads the same).
 * @returns The value.
 */
function graphValue(element: JoinElement, path: string): unknown {
    if (path === "id") {
        return element.id;
    }

    return element.data[path.startsWith("data.") ? path.slice("data.".length) : path];
}

/**
 * Elements by their compared key.
 * @param elements - The nodes or edges.
 * @param paths - The graph side of each key pair.
 * @param loose - How to compare.
 * @returns The ids under each key, in graph order.
 */
function indexOf(
    elements: readonly JoinElement[],
    paths: readonly string[],
    loose: Loose,
): Map<string, (NodeId | EdgeId)[]> {
    const out = new Map<string, (NodeId | EdgeId)[]>();
    for (const element of elements) {
        const parts = paths.map((path) => norm(graphValue(element, path), loose));
        if (parts.includes(undefined)) {
            continue;
        }

        const key = parts.join(PART);
        const list = out.get(key);
        if (list === undefined) {
            out.set(key, [element.id]);
        } else {
            list.push(element.id);
        }
    }

    return out;
}

/**
 * Translates an incoming key through a mapping table: the table's column holding the most of the
 * incoming values to its column holding the most of the graph's.
 * @param via - The mapping table, or undefined.
 * @param values - The incoming values.
 * @param graphKeys - The graph's keys, compared.
 * @param loose - How to compare.
 * @returns The translation, or the identity when there is no mapping table.
 */
function translator(
    via: JoinRecord | undefined,
    values: readonly unknown[],
    graphKeys: ReadonlySet<string>,
    loose: Loose,
): (value: unknown) => unknown {
    if (via === undefined) {
        return (value) => value;
    }

    const incoming = new Set(values.map((value) => norm(value, loose)));
    // ponytail: one pass per mapping column; a mapping table is a few thousand rows at most.
    const overlap = (column: string, wanted: ReadonlySet<string | undefined>): number =>
        via.table.rows.filter((row) => wanted.has(norm(row[column], loose))).length;
    const from = [...via.table.columns].sort((a, b) => overlap(b, incoming) - overlap(a, incoming))[0];
    const to = via.table.columns
        .filter((column) => column !== from)
        .sort((a, b) => overlap(b, graphKeys) - overlap(a, graphKeys))[0];
    if (from === undefined || to === undefined) {
        return (value) => value;
    }

    const map = new Map<string, unknown>();
    for (const row of via.table.rows) {
        const key = norm(row[from], loose);
        if (key !== undefined && !map.has(key)) {
            map.set(key, row[to]);
        }
    }

    return (value) => {
        const key = norm(value, loose);
        return key !== undefined && map.has(key) ? map.get(key) : value;
    };
}

/**
 * The share of a column's distinct values found in a set of compared keys.
 * @param table - The table.
 * @param column - The column.
 * @param keys - The compared keys.
 * @returns The share, 0 to 1.
 */
function overlapOf(table: JoinTable, column: string, keys: ReadonlySet<string>): number {
    const loose = { ignoreCase: true, ignoreSpaces: true };
    const values = new Set<string>();
    for (const row of table.rows) {
        const value = norm(row[column], loose);
        if (value !== undefined) {
            values.add(value);
        }
    }

    if (values.size === 0) {
        return 0;
    }

    let found = 0;
    for (const value of values) {
        found += keys.has(value) ? 1 : 0;
    }

    return found / values.size;
}

/**
 * Every graph value path the elements carry: the id, then each attribute.
 * @param elements - The nodes or edges.
 * @returns The paths.
 */
function pathsOf(elements: readonly JoinElement[]): string[] {
    const names = new Set<string>();
    for (const element of elements) {
        for (const name of Object.keys(element.data)) {
            names.add(name);
        }
    }

    names.delete("id");
    return ["id", ...[...names].map((name) => `data.${name}`)];
}

/**
 * How the table most likely joins onto the graph.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param endpoints - The table's source and target columns, when its own reading found a pair.
 * @param endpoints.source - The source column.
 * @param endpoints.target - The target column.
 * @returns The suggestion.
 */
export function suggestJoin(
    table: JoinTable,
    graph: JoinGraph,
    endpoints?: { readonly source: string; readonly target: string },
): JoinSuggestion {
    const loose = { ignoreCase: true, ignoreSpaces: true };
    const ids = new Set(indexOf(graph.nodes, ["id"], loose).keys());
    // Edges: the table's own endpoint pair, or the two columns most of whose values are node ids.
    const byIds = table.columns
        .map((column) => ({ column, share: overlapOf(table, column, ids) }))
        .sort((a, b) => b.share - a.share);
    const pair =
        endpoints ??
        (byIds.length > 1 && byIds[1].share >= CONFIDENT
            ? { source: byIds[0].column, target: byIds[1].column }
            : undefined);
    if (pair !== undefined) {
        const share = Math.min(overlapOf(table, pair.source, ids), overlapOf(table, pair.target, ids));
        if (share > 0) {
            return Object.freeze({
                shape: "edges",
                keys: Object.freeze([
                    Object.freeze({ file: pair.source, graph: "id" }),
                    Object.freeze({ file: pair.target, graph: "id" }),
                ]),
                confident: share >= CONFIDENT,
            });
        }
    }

    // Values: the column and the graph path whose values meet most, on nodes, then on edges.
    let best: { shape: JoinShape; key: JoinKey; share: number } | undefined;
    for (const [shape, elements] of [
        ["node-values", graph.nodes],
        ["edge-values", graph.edges],
    ] as const) {
        for (const path of pathsOf(elements)) {
            const keys = new Set(indexOf(elements, [path], loose).keys());
            for (const column of table.columns) {
                const share = overlapOf(table, column, keys);
                if (share > (best?.share ?? 0)) {
                    best = { shape, key: { file: column, graph: path }, share };
                }
            }
        }
    }

    if (best === undefined) {
        return Object.freeze({ shape: "rows", keys: Object.freeze([]), confident: false });
    }

    return Object.freeze({
        shape: best.shape,
        keys: Object.freeze([Object.freeze(best.key)]),
        confident: best.share >= CONFIDENT,
    });
}

/**
 * The choices checked against the table.
 * @param table - The incoming table.
 * @param choices - The join.
 * @param shape - The shape when the choices give none.
 * @returns The shape.
 * @throws `E_BAD_COMMAND` for a key column the table lacks, or a key count the shape cannot take.
 */
function checked(table: JoinTable, choices: JoinChoices, shape: JoinShape): JoinShape {
    const chosen = choices.shape ?? shape;
    for (const key of choices.keys) {
        if (!table.columns.includes(key.file)) {
            throw badJoin(`The table has no column ${JSON.stringify(key.file)}.`, {
                reason: "unknown-column",
                column: key.file,
                columns: [...table.columns],
            });
        }
    }

    const needs = chosen === "edges" ? 2 : 1;
    if ((chosen === "edges" && choices.keys.length !== 2) || (chosen !== "rows" && choices.keys.length < needs)) {
        throw badJoin(`A join of ${chosen} takes ${chosen === "edges" ? "two keys" : "a key"}.`, {
            reason: "keys",
            shape: chosen,
            keys: choices.keys.length,
        });
    }

    return chosen;
}

/** What matching rows to elements found, under one way of comparing. */
interface Matching {
    /** Each row's matched ids. */
    readonly rowIds: readonly (readonly (NodeId | EdgeId)[])[];
    /** Each row's compared key, or undefined for a blank key. */
    readonly rowKeys: readonly (string | undefined)[];
    readonly matched: ReadonlySet<NodeId | EdgeId>;
}

/**
 * Match each row to the elements its key names.
 * @param table - The incoming table.
 * @param elements - The nodes or edges.
 * @param choices - The join.
 * @param loose - How to compare.
 * @param via - The mapping table, if any.
 * @returns The matching.
 */
function matchValues(
    table: JoinTable,
    elements: readonly JoinElement[],
    choices: JoinChoices,
    loose: Loose,
    via: JoinRecord | undefined,
): Matching {
    const index = indexOf(
        elements,
        choices.keys.map((key) => key.graph),
        loose,
    );
    const first = choices.keys[0].file;
    const translate = translator(
        via,
        table.rows.map((row) => row[first]),
        new Set(index.keys()),
        loose,
    );
    const matched = new Set<NodeId | EdgeId>();
    const rowKeys: (string | undefined)[] = [];
    const rowIds = table.rows.map((row) => {
        const parts = choices.keys.map((key, at) => norm(at === 0 ? translate(row[key.file]) : row[key.file], loose));
        const key = parts.includes(undefined) ? undefined : parts.join(PART);
        rowKeys.push(key);
        const ids = key === undefined ? [] : (index.get(key) ?? []);
        ids.forEach((id) => matched.add(id));
        return ids;
    });
    return { rowIds, rowKeys, matched };
}

/** One row of an edge table, its ends resolved. */
interface EdgeRow {
    /** The row. */
    readonly at: number;
    /** Each end: the graph's node id it matched, or the value as given when it matched none. */
    readonly ends: readonly [unknown, unknown];
    /** Whether each end matched a node. */
    readonly found: readonly [boolean, boolean];
}

/**
 * Resolve each row's two ends to the graph's node ids.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join: two keys, source then target.
 * @param loose - How to compare.
 * @returns The rows with both ends given.
 */
function matchEdges(table: JoinTable, graph: JoinGraph, choices: JoinChoices, loose: Loose): EdgeRow[] {
    const via = choices.via === undefined ? undefined : graph.joins.get(choices.via);
    const indexes = choices.keys.map((key) => indexOf(graph.nodes, [key.graph], loose));
    const translates = choices.keys.map((key, at) =>
        translator(
            via,
            table.rows.map((row) => row[key.file]),
            new Set(indexes[at].keys()),
            loose,
        ),
    );
    const out: EdgeRow[] = [];
    table.rows.forEach((row, at) => {
        const ends = choices.keys.map((key, side) => {
            const given = translates[side](row[key.file]);
            const id = indexes[side].get(norm(given, loose) ?? "")?.[0];
            return { value: id ?? given, found: id !== undefined, blank: absent(given) };
        });
        if (ends.some((end) => end.blank)) {
            return;
        }

        out.push({ at, ends: [ends[0].value, ends[1].value], found: [ends[0].found, ends[1].found] });
    });
    return out;
}

/**
 * The incoming columns a join brings: the choice, or every column but the keys.
 * @param table - The incoming table.
 * @param choices - The join.
 * @returns The columns.
 */
function columnsOf(table: JoinTable, choices: JoinChoices): string[] {
    const keys = new Set(choices.keys.map((key) => key.file));
    return (choices.columns ?? table.columns).filter((column) => table.columns.includes(column) && !keys.has(column));
}

/**
 * The incoming columns the target elements already carry.
 * @param elements - The nodes or edges.
 * @param columns - The incoming columns.
 * @returns The clashing ones.
 */
function clashesOf(elements: readonly JoinElement[], columns: readonly string[]): string[] {
    const held = new Set(pathsOf(elements).map((path) => (path === "id" ? "id" : path.slice("data.".length))));
    return columns.filter((column) => held.has(column));
}

/**
 * The loose choices: these choices with case or spaces also ignored.
 * @param choices - The join.
 * @param more - What else to ignore.
 * @returns How to compare.
 */
function looseOf(choices: JoinChoices, more: Partial<Loose> = {}): Loose {
    return {
        ignoreCase: more.ignoreCase ?? choices.ignoreCase === true,
        ignoreSpaces: more.ignoreSpaces ?? choices.ignoreSpaces === true,
    };
}

/**
 * Count what a join would do.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @param shape - The shape when the choices give none.
 * @returns The counts.
 */
export function joinReport(table: JoinTable, graph: JoinGraph, choices: JoinChoices, shape: JoinShape): JoinReport {
    const chosen = checked(table, choices, shape);
    const columns = columnsOf(table, choices);
    const report = (counts: Partial<JoinReport>, elements: readonly JoinElement[]): JoinReport =>
        Object.freeze({
            matched: 0,
            notInGraph: 0,
            withoutValue: 0,
            repeatedKeys: 0,
            extraIgnoringCase: 0,
            extraIgnoringSpaces: 0,
            newNodes: 0,
            newEdges: 0,
            updatedNodes: 0,
            rowMatches: Object.freeze([]),
            withoutValueIds: Object.freeze([]),
            ...counts,
            clashes: Object.freeze(
                clashesOf(elements, columns).map((column) => Object.freeze({ column, code: "clash" as const })),
            ),
        });
    if (chosen === "rows" || chosen === "replace") {
        return report({ newEdges: 0 }, []);
    }

    if (chosen === "edges") {
        return edgeReport(table, graph, choices, report);
    }

    const elements = chosen === "node-values" ? graph.nodes : graph.edges;
    const via = choices.via === undefined ? undefined : graph.joins.get(choices.via);
    const now = matchValues(table, elements, choices, looseOf(choices), via);
    const loosest = matchValues(table, elements, choices, { ignoreCase: true, ignoreSpaces: true }, via);
    const extra = (more: Partial<Loose>): number =>
        matchValues(table, elements, choices, looseOf(choices, more), via).matched.size - now.matched.size;
    const seen = new Map<string, number>();
    for (const key of now.rowKeys) {
        if (key !== undefined) {
            seen.set(key, (seen.get(key) ?? 0) + 1);
        }
    }

    return report(
        {
            matched: now.matched.size,
            notInGraph: loosest.rowIds.filter((ids) => ids.length === 0).length,
            withoutValue: elements.length - now.matched.size,
            repeatedKeys: [...seen.values()].filter((count) => count > 1).length,
            extraIgnoringCase: choices.ignoreCase === true ? 0 : extra({ ignoreCase: true }),
            extraIgnoringSpaces: choices.ignoreSpaces === true ? 0 : extra({ ignoreSpaces: true }),
            updatedNodes: chosen === "node-values" ? changedCount(table, graph, choices, chosen) : 0,
            rowMatches: frozen(now.rowIds.map((ids) => [...ids])),
            withoutValueIds: frozen(elements.map((element) => element.id).filter((id) => !now.matched.has(id))),
        },
        elements,
    );
}

/**
 * How many elements a join of values would change: ones it writes a value to that differs from
 * the one they hold.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @param shape - The shape.
 * @returns The count.
 */
function changedCount(table: JoinTable, graph: JoinGraph, choices: JoinChoices, shape: JoinShape): number {
    const { plan } = planJoin(table, graph, choices, shape);
    if (plan.kind !== "values") {
        return 0;
    }

    const held = new Map((plan.target === "node" ? graph.nodes : graph.edges).map((each) => [each.id, each.data]));
    return plan.rows.filter((row) =>
        Object.entries(row.values).some(
            ([name, value]) => JSON.stringify(held.get(row.id)?.[name]) !== JSON.stringify(value),
        ),
    ).length;
}

/**
 * Count what a join of edges would do.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @param report - Fills in the rest of the report.
 * @returns The counts.
 */
function edgeReport(
    table: JoinTable,
    graph: JoinGraph,
    choices: JoinChoices,
    report: (counts: Partial<JoinReport>, elements: readonly JoinElement[]) => JoinReport,
): JoinReport {
    const rows = matchEdges(table, graph, choices, looseOf(choices));
    const both = (edgeRows: readonly EdgeRow[]): number =>
        edgeRows.filter((row) => row.found[0] && row.found[1]).length;
    const loosest = matchEdges(table, graph, choices, { ignoreCase: true, ignoreSpaces: true });
    const pairs = new Map<string, number>();
    const fresh = new Set<string>();
    const touched = new Set<unknown>();
    for (const row of rows) {
        const pair = `${String(row.ends[0])}${PART}${String(row.ends[1])}`;
        pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
        row.ends.forEach((end, side) => (row.found[side] ? touched.add(end) : fresh.add(String(end))));
    }

    const repeatedKeys = [...pairs.values()].filter((count) => count > 1).length;
    const rowMatches: (readonly (NodeId | EdgeId)[])[] = table.rows.map(() => []);
    for (const row of rows) {
        if (row.found[0] && row.found[1]) {
            rowMatches[row.at] = [row.ends[0] as NodeId, row.ends[1] as NodeId];
        }
    }

    const kept = choices.repeated === "both" ? rows.length : pairs.size;
    const matched = both(rows);
    return report(
        {
            matched,
            notInGraph: table.rows.length - both(loosest),
            withoutValue: graph.nodes.length - touched.size,
            repeatedKeys,
            extraIgnoringCase:
                choices.ignoreCase === true
                    ? 0
                    : both(matchEdges(table, graph, choices, looseOf(choices, { ignoreCase: true }))) - matched,
            extraIgnoringSpaces:
                choices.ignoreSpaces === true
                    ? 0
                    : both(matchEdges(table, graph, choices, looseOf(choices, { ignoreSpaces: true }))) - matched,
            newNodes: fresh.size,
            newEdges: kept,
            // An edge join writes no node's values.
            updatedNodes: 0,
            rowMatches: frozen(rowMatches),
            withoutValueIds: frozen(graph.nodes.map((node) => node.id).filter((id) => !touched.has(id))),
        },
        graph.edges,
    );
}

/**
 * The column a clashing incoming column is written under with `"both"`.
 * @param column - The incoming column.
 * @param table - The incoming table.
 * @returns The name.
 */
function bothName(column: string, table: JoinTable): string {
    return `${column} (${table.name})`;
}

/**
 * Plan a join: what it writes.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @param shape - The shape when the choices give none.
 * @returns The plan and its shape.
 */
export function planJoin(
    table: JoinTable,
    graph: JoinGraph,
    choices: JoinChoices,
    shape: JoinShape,
): { readonly shape: JoinShape; readonly plan: JoinPlan; readonly matched: number } {
    const chosen = checked(table, choices, shape);
    const columns = columnsOf(table, choices);
    if (chosen === "rows" || chosen === "replace") {
        return { shape: chosen, plan: { kind: "rows" }, matched: 0 };
    }

    if (chosen === "edges") {
        return { shape: chosen, ...planEdges(table, graph, choices, columns) };
    }

    const target = chosen === "node-values" ? "node" : "edge";
    const elements = target === "node" ? graph.nodes : graph.edges;
    const byId = new Map(elements.map((element) => [element.id, element]));
    const via = choices.via === undefined ? undefined : graph.joins.get(choices.via);
    const matching = matchValues(table, elements, choices, looseOf(choices), via);
    const clashing = new Set(clashesOf(elements, columns));
    // Each element's rows, in table order.
    const rowsOf = new Map<NodeId | EdgeId, Readonly<Record<string, unknown>>[]>();
    matching.rowIds.forEach((ids, at) => {
        for (const id of ids) {
            rowsOf.set(id, [...(rowsOf.get(id) ?? []), table.rows[at]]);
        }
    });

    const written = new Set<string>();
    const before: Record<string, Record<string, unknown>> = {};
    const rows: RowUpdate<NodeId | EdgeId>[] = [];
    for (const [id, matchedRows] of rowsOf) {
        const held = byId.get(id)?.data ?? {};
        const values: Record<string, unknown> = {};
        for (const column of columns) {
            const rule = clashing.has(column) ? (choices.clash?.[column] ?? "both") : "overwrite";
            const name = rule === "both" ? bothName(column, table) : column;
            const given = matchedRows.map((row) => row[column]).filter((value) => !absent(value));
            const distinct = [...new Set(given)];
            const one = choices.repeated === "last" ? given.at(-1) : given[0];
            const value = choices.repeated === "both" && distinct.length > 1 ? distinct : one;
            if (value === undefined || (rule === "keep" && !absent(held[name]))) {
                continue;
            }

            values[name] = value;
            written.add(name);
            const rowKey = String(id);
            before[rowKey] ??= {};
            before[rowKey][name] = held[name] ?? null;
        }

        if (Object.keys(values).length > 0) {
            rows.push(Object.freeze({ id, values: Object.freeze(values) }));
        }
    }

    return {
        shape: chosen,
        matched: matching.matched.size,
        plan: {
            kind: "values",
            target,
            rows,
            matchedIds: [...matching.matched],
            columns: [...written],
            before,
        },
    };
}

/**
 * Plan a join of edges: the rows to load, their ends resolved to the graph's ids.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @param columns - The incoming columns to bring.
 * @returns The plan and how many rows matched both ends.
 */
function planEdges(
    table: JoinTable,
    graph: JoinGraph,
    choices: JoinChoices,
    columns: readonly string[],
): { readonly plan: JoinPlan; readonly matched: number } {
    const [source, target] = choices.keys.map((key) => key.file);
    const clashing = new Set(clashesOf(graph.edges, columns));
    // One edge per pair, the first row's or the last row's, or one per row with "both"; a Map
    // keeps the pair where it first appeared either way.
    const byPair = new Map<string, { edge: Record<string, unknown>; both: boolean }>();
    for (const [at, row] of matchEdges(table, graph, choices, looseOf(choices)).entries()) {
        const pair = choices.repeated === "both" ? String(at) : `${String(row.ends[0])}${PART}${String(row.ends[1])}`;
        if (choices.repeated !== "last" && byPair.has(pair)) {
            continue;
        }

        const edge: Record<string, unknown> = { [source]: row.ends[0], [target]: row.ends[1] };
        for (const column of columns) {
            const rule = clashing.has(column) ? (choices.clash?.[column] ?? "both") : "overwrite";
            const value = table.rows[row.at][column];
            if (!absent(value)) {
                edge[rule === "both" ? bothName(column, table) : column] = value;
            }
        }

        byPair.set(pair, { edge, both: row.found[0] && row.found[1] });
    }

    const edges = [...byPair.values()].map((each) => each.edge);
    const matched = [...byPair.values()].filter((each) => each.both).length;

    const written = new Set(
        edges.flatMap((edge) => Object.keys(edge)).filter((key) => key !== source && key !== target),
    );
    return { matched, plan: { kind: "edges", edges, source, target, columns: [...written] } };
}

/**
 * Deep-freeze plain data, so a record kept in the graph cannot be written past a command.
 * @param value - The value.
 * @returns The same value, frozen.
 */
export function frozen<T>(value: T): T {
    if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const each of Object.values(value)) {
            frozen(each);
        }
    }

    return value;
}
