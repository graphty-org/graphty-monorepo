/**
 * @file Joining a table onto the graph: the suggestion, the counts and the plan behind
 * `draft.suggestJoin()`, `draft.joinReport()`, `draft.load({ join })` and `data.editJoin()`.
 * Pure functions over the table's rows and the graph's records; `data.ts` dispatches the plan.
 */

import type { EdgeId, NodeId, SourceKey } from "../catalog/types";
import { GraphtyError } from "../errors";
import type {
    JoinChoices,
    JoinKey,
    JoinRecord,
    JoinReport,
    JoinRowFate,
    JoinShape,
    JoinSuggestion,
    RowUpdate,
} from "./types";

/** A table as a join reads it. */
export interface JoinTable {
    readonly name: string;
    readonly columns: readonly string[];
    readonly rows: readonly Readonly<Record<string, unknown>>[];
    /** Rows of the file its reader could not read, so they are not in `rows`. */
    readonly unreadRows?: number;
}

/** One node or edge as a join reads it: its id and its attributes. */
interface JoinElement {
    readonly id: NodeId | EdgeId;
    readonly data: Readonly<Record<string, unknown>>;
    /** An edge's source node. */
    readonly source?: NodeId;
    /** An edge's target node. */
    readonly target?: NodeId;
}

/** The graph as a join reads it. */
export interface JoinGraph {
    readonly nodes: readonly JoinElement[];
    readonly edges: readonly JoinElement[];
    /** The joined tables a `via` may name, by their load's key. */
    readonly joins: ReadonlyMap<SourceKey, JoinRecord>;
    /** Whether an edge's ends are ordered; an undirected graph's edge answers its pair either way. */
    readonly directed: boolean;
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
          /** The rows that matched nothing and become new nodes (`unmatchedRows: "add"`). */
          readonly newNodes: readonly RowUpdate<NodeId>[];
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

/** The share of a table's rows that must name an edge the graph holds for it to be read as values on them. */
const HOLDS_THE_EDGES = 0.8;

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
 * @param path - `"id"`, an edge's `"source"` or `"target"`, or `"data.<column>"` (a bare column
 *     name reads the same).
 * @returns The value.
 */
function graphValue(element: JoinElement, path: string): unknown {
    if (path === "id") {
        return element.id;
    }

    if ((path === "source" || path === "target") && element[path] !== undefined) {
        return element[path];
    }

    return element.data[path.startsWith("data.") ? path.slice("data.".length) : path];
}

/**
 * Add a value to a key's list, in place: a list rebuilt per value makes a key many rows share
 * quadratic.
 * @param lists - The lists by key.
 * @param key - The key.
 * @param value - The value.
 */
function pushTo<K, V>(lists: Map<K, V[]>, key: K, value: V): void {
    const list = lists.get(key);
    if (list === undefined) {
        lists.set(key, [value]);
    } else {
        list.push(value);
    }
}

/**
 * Elements by their compared key.
 * @param elements - The nodes or edges.
 * @param paths - The graph side of each key pair.
 * @param loose - How to compare.
 * @param directed - Whether an edge's ends are ordered; false files a source and target pair both ways.
 * @returns The ids under each key, in graph order.
 */
function indexOf(
    elements: readonly JoinElement[],
    paths: readonly string[],
    loose: Loose,
    directed = true,
): Map<string, (NodeId | EdgeId)[]> {
    const bothWays = !directed && paths.length === 2 && paths.includes("source") && paths.includes("target");
    const out = new Map<string, (NodeId | EdgeId)[]>();
    for (const element of elements) {
        const parts = paths.map((path) => norm(graphValue(element, path), loose));
        if (parts.includes(undefined)) {
            continue;
        }

        const key = parts.join(PART);
        const reversed = [...parts].reverse().join(PART);
        for (const each of bothWays && reversed !== key ? [key, reversed] : [key]) {
            pushTo(out, each, element.id);
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
 * Every graph value path the elements carry: the id, an edge's two ends, then each attribute.
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
    const ends = elements[0]?.source === undefined ? [] : ["source", "target"];
    return ["id", ...ends, ...[...names].map((name) => `data.${name}`)];
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
    const inFileOrder = byIds.length > 1 ? fileOrder(table, byIds[0].column, byIds[1].column) : undefined;
    const pair = endpoints ?? (inFileOrder !== undefined && byIds[1].share >= CONFIDENT ? inFileOrder : undefined);
    if (pair !== undefined) {
        const valuesOnEdges = pairValues(table, graph, pair);
        if (valuesOnEdges !== undefined) {
            return valuesOnEdges;
        }

        const share = Math.min(overlapOf(table, pair.source, ids), overlapOf(table, pair.target, ids));
        if (share > 0) {
            return Object.freeze({
                shape: "edges",
                keys: Object.freeze([
                    Object.freeze({ file: pair.source, graph: "id" }),
                    Object.freeze({ file: pair.target, graph: "id" }),
                ]),
                confident: share >= CONFIDENT,
                ...(repeatsDiffer(table, pair) ? { repeated: "both" as const } : {}),
            });
        }
    }

    const best = bestValuesKey(table, graph, loose);
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
 * Whether some rows name the same source and target but say different things: separate events
 * (two door entries), not one row repeated.
 * @param table - The table.
 * @param pair - Its source and target columns.
 * @param pair.source - The source column.
 * @param pair.target - The target column.
 * @returns True when a repeated pair's rows differ.
 */
function repeatsDiffer(table: JoinTable, pair: { readonly source: string; readonly target: string }): boolean {
    const first = new Map<string, Readonly<Record<string, unknown>>>();
    for (const row of table.rows) {
        const key = `${String(row[pair.source])}${PART}${String(row[pair.target])}`;
        const earlier = first.get(key);
        if (earlier === undefined) {
            first.set(key, row);
        } else if (table.columns.some((column) => row[column] !== earlier[column])) {
            return true;
        }
    }

    return false;
}

/**
 * The column and the graph path whose values meet most, on nodes, then on edges.
 * @param table - The table.
 * @param graph - The graph.
 * @param loose - How to compare.
 * @returns The key and its shape, or undefined when no values meet.
 */
function bestValuesKey(
    table: JoinTable,
    graph: JoinGraph,
    loose: Loose,
): { shape: JoinShape; key: JoinKey; share: number } | undefined {
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

    return best;
}

/**
 * Two of a table's columns in the order the file has them, so a suggested edge reads as the file does.
 * @param table - The table.
 * @param one - A column.
 * @param two - The other.
 * @returns The pair.
 */
function fileOrder(table: JoinTable, one: string, two: string): { source: string; target: string } {
    return table.columns.indexOf(one) < table.columns.indexOf(two)
        ? { source: one, target: two }
        : { source: two, target: one };
}

/**
 * A join of a table's other columns onto the edges its rows name, when most of its rows name an
 * edge the graph holds and it has a column to bring.
 * @param table - The table.
 * @param graph - The graph.
 * @param pair - The table's source and target columns.
 * @param pair.source - The source column.
 * @param pair.target - The target column.
 * @returns The suggestion, or undefined when the table reads better as new edges.
 */
function pairValues(
    table: JoinTable,
    graph: JoinGraph,
    pair: { readonly source: string; readonly target: string },
): JoinSuggestion | undefined {
    if (table.rows.length === 0 || !table.columns.some((column) => column !== pair.source && column !== pair.target)) {
        return undefined;
    }

    const loose = { ignoreCase: true, ignoreSpaces: true };
    const held = indexOf(graph.edges, ["source", "target"], loose, graph.directed);
    const named = table.rows.filter((row) =>
        held.has(`${String(norm(row[pair.source], loose))}${PART}${String(norm(row[pair.target], loose))}`),
    );
    if (named.length / table.rows.length < HOLDS_THE_EDGES) {
        return undefined;
    }

    return Object.freeze({
        shape: "edge-values",
        keys: Object.freeze([
            Object.freeze({ file: pair.source, graph: "source" }),
            Object.freeze({ file: pair.target, graph: "target" }),
        ]),
        confident: true,
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
 * @param directed - Whether an edge's ends are ordered.
 * @returns The matching.
 */
function matchValues(
    table: JoinTable,
    elements: readonly JoinElement[],
    choices: JoinChoices,
    loose: Loose,
    via: JoinRecord | undefined,
    directed: boolean,
): Matching {
    const index = indexOf(
        elements,
        choices.keys.map((key) => key.graph),
        loose,
        directed,
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
            rowFates: Object.freeze([]),
            unknownEndRows: 0,
            unreadRows: table.unreadRows ?? 0,
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
    const match = (loose: Loose): Matching => matchValues(table, elements, choices, loose, via, graph.directed);
    const now = match(looseOf(choices));
    const loosest = match({ ignoreCase: true, ignoreSpaces: true });
    const extra = (more: Partial<Loose>): number => match(looseOf(choices, more)).matched.size - now.matched.size;
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
            rowFates: frozen(valueFates(now.rowKeys, now.rowIds, choices, chosen)),
            newNodes: addsRows(choices, chosen)
                ? new Set(now.rowKeys.filter((key, at) => key !== undefined && now.rowIds[at].length === 0)).size
                : 0,
        },
        elements,
    );
}

/**
 * Whether a join of values makes a new node for each row matching nothing: asked for, on one key
 * read directly, since only such a key can name the new node.
 * @param choices - The join.
 * @param shape - The join's shape.
 * @returns True when it does.
 */
function addsRows(choices: JoinChoices, shape: JoinShape): boolean {
    return (
        shape === "node-values" &&
        choices.unmatchedRows === "add" &&
        choices.keys.length === 1 &&
        choices.via === undefined
    );
}

/**
 * What a join of values does with each row: a row matching nothing is left out, or makes a new
 * node with `unmatchedRows: "add"`; of several rows with one key, `repeated` keeps the first or the
 * last and the rest repeat it, or keeps them all.
 * @param rowKeys - Each row's key, undefined for a blank one.
 * @param rowIds - Each row's matches.
 * @param choices - The join.
 * @param shape - The join's shape.
 * @returns Each row's fate.
 */
function valueFates(
    rowKeys: readonly (string | undefined)[],
    rowIds: readonly (readonly unknown[])[],
    choices: JoinChoices,
    shape: JoinShape,
): JoinRowFate[] {
    const adding = addsRows(choices, shape);
    const counts = (at: number): boolean => adding || rowIds[at].length > 0;
    const kept = new Map<string, number>();
    rowKeys.forEach((key, at) => {
        if (key !== undefined && counts(at) && (choices.repeated === "last" || !kept.has(key))) {
            kept.set(key, at);
        }
    });
    return rowKeys.map((key, at) => {
        if (key === undefined || !counts(at)) {
            return "left-out";
        }
        if (choices.repeated !== "both" && kept.get(key) !== at) {
            return "repeat";
        }
        return rowIds[at].length === 0 ? "new-end" : "joined";
    });
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
 * Whether both of an edge row's ends are nodes the graph holds.
 * @param row - The row.
 * @returns True when both matched.
 */
function bothFound(row: EdgeRow): boolean {
    return row.found[0] && row.found[1];
}

/**
 * What a join of edges does with each row: of several rows naming one pair, `repeated` keeps the
 * first (the last with "last") and the rest repeat it, or keeps them all; a loaded row joins two
 * known nodes or adds a new end; a row not loaded is left out.
 * @param count - How many rows the table holds.
 * @param rows - The rows the join loads.
 * @param choices - The join.
 * @returns Each row's fate.
 */
function edgeFates(count: number, rows: readonly EdgeRow[], choices: JoinChoices): JoinRowFate[] {
    const pairOf = (row: EdgeRow): string => `${String(row.ends[0])}${PART}${String(row.ends[1])}`;
    const keptAt = new Map<string, number>();
    for (const row of rows) {
        if (choices.repeated === "last" || !keptAt.has(pairOf(row))) {
            keptAt.set(pairOf(row), row.at);
        }
    }
    const fates: JoinRowFate[] = Array.from({ length: count }, () => "left-out");
    for (const row of rows) {
        const loadedFate = bothFound(row) ? "joined" : "new-end";
        const repeat = choices.repeated !== "both" && keptAt.get(pairOf(row)) !== row.at;
        fates[row.at] = repeat ? "repeat" : loadedFate;
    }
    return fates;
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
    const all = matchEdges(table, graph, choices, looseOf(choices));
    const both = (edgeRows: readonly EdgeRow[]): number => edgeRows.filter(bothFound).length;
    const loosest = matchEdges(table, graph, choices, { ignoreCase: true, ignoreSpaces: true });
    // The rows the join loads: with unknownEnds "leave-out", only those whose two ends are known.
    const rows = all.filter((row) => choices.unknownEnds !== "leave-out" || bothFound(row));
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
    for (const row of all.filter(bothFound)) {
        rowMatches[row.at] = [row.ends[0] as NodeId, row.ends[1] as NodeId];
    }

    const rowFates = edgeFates(table.rows.length, rows, choices);
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
            rowFates: frozen(rowFates),
            unknownEndRows: all.filter((row) => !bothFound(row)).length,
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
    const matching = matchValues(table, elements, choices, looseOf(choices), via, graph.directed);
    const clashing = new Set(clashesOf(elements, columns));
    // Each element's rows, in table order.
    const rowsOf = new Map<NodeId | EdgeId, Readonly<Record<string, unknown>>[]>();
    matching.rowIds.forEach((ids, at) => {
        for (const id of ids) {
            pushTo(rowsOf, id, table.rows[at]);
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
            const value = columnValue(matchedRows, column, choices);
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
            newNodes: addsRows(choices, chosen)
                ? newNodeRows(table, matching, choices, new Set(graph.nodes.map((node) => node.id)))
                : [],
        },
    };
}

/**
 * The value a join brings for a column from one element's rows.
 * @param rows - The element's rows, in table order.
 * @param column - The column.
 * @param choices - The join.
 * @returns The value, or undefined when no row gives one.
 */
function columnValue(
    rows: readonly Readonly<Record<string, unknown>>[],
    column: string,
    choices: JoinChoices,
): unknown {
    const given = rows.map((row) => row[column]).filter((value) => !absent(value));
    const distinct = [...new Set(given)];
    const one = choices.repeated === "last" ? given.at(-1) : given[0];
    return choices.repeated === "both" && distinct.length > 1 ? distinct : one;
}

/**
 * The new nodes of a join with `unmatchedRows: "add"`, one per key no element matched.
 * @param table - The incoming table.
 * @param matching - What matching found.
 * @param choices - The join: one key.
 * @param held - The graph's node ids.
 * @returns The new nodes, in table order. A new node holds no value to clash with, so each column
 * is written under its own name. A key value that is already another node's id gets a free id.
 */
function newNodeRows(
    table: JoinTable,
    matching: Matching,
    choices: JoinChoices,
    held: ReadonlySet<NodeId | EdgeId>,
): RowUpdate<NodeId>[] {
    const [key] = choices.keys;
    const rowsOf = new Map<string, Readonly<Record<string, unknown>>[]>();
    matching.rowIds.forEach((ids, at) => {
        const rowKey = matching.rowKeys[at];
        if (ids.length === 0 && rowKey !== undefined) {
            pushTo(rowsOf, rowKey, table.rows[at]);
        }
    });
    return [...rowsOf.values()].map((rows) => {
        const values: Record<string, unknown> = {};
        for (const column of columnsOf(table, choices)) {
            const value = columnValue(rows, column, choices);
            if (value !== undefined) {
                values[column] = value;
            }
        }

        if (key.graph.startsWith("data.")) {
            values[key.graph.slice("data.".length)] = rows[0][key.file];
        }

        let id = rows[0][key.file] as NodeId;
        let copy = 1;
        while (held.has(id)) {
            copy += 1;
            id = `${String(rows[0][key.file])} (${String(copy)})`;
        }

        return frozen({ id, values });
    });
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
    const loaded = matchEdges(table, graph, choices, looseOf(choices)).filter(
        (row) => choices.unknownEnds !== "leave-out" || bothFound(row),
    );
    // An edge's own values: each brought column, under its clash name.
    const valuesOf = (row: EdgeRow): Record<string, unknown> => {
        const values: Record<string, unknown> = {};
        for (const column of columns) {
            const rule = clashing.has(column) ? (choices.clash?.[column] ?? "both") : "overwrite";
            const value = table.rows[row.at][column];
            if (!absent(value)) {
                values[rule === "both" ? bothName(column, table) : column] = value;
            }
        }
        return values;
    };
    for (const [at, row] of loaded.entries()) {
        const pair = choices.repeated === "both" ? String(at) : `${String(row.ends[0])}${PART}${String(row.ends[1])}`;
        if (choices.repeated !== "last" && byPair.has(pair)) {
            continue;
        }

        const edge: Record<string, unknown> = { [source]: row.ends[0], [target]: row.ends[1], ...valuesOf(row) };
        byPair.set(pair, { edge, both: bothFound(row) });
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
