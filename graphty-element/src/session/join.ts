/**
 * @file Joining a table onto the graph: the suggestion, the counts and the plan behind
 * `draft.suggestJoin()`, `draft.joinReport()`, `draft.load({ join })` and `data.editJoin()`.
 * Pure functions over the table's rows and the graph's records; `data.ts` dispatches the plan.
 */

import { isNumericText } from "@graphty/graph-io";

import type { EdgeId, NodeId, SourceKey } from "../catalog/types";
import { GraphtyError } from "../errors";
import type {
    JoinChoices,
    JoinKey,
    JoinLookup,
    JoinReduce,
    JoinRegion,
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
    /** After a `split` of an edges join: each row's row in the table as given. */
    readonly origin?: readonly number[];
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
    /** The table a `via` names, by its load's key: a joined table's rows, or a load's records. */
    readonly table: (key: SourceKey) => JoinTable | undefined;
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
          /** Node records to load (`id` their id): new nodes, and for `"merge"` the nodes merged into. */
          readonly nodes: readonly Record<string, unknown>[];
          readonly edges: readonly Record<string, unknown>[];
          readonly source: string;
          readonly target: string;
          readonly columns: readonly string[];
          /** For `"merge"`: the merged nodes' values before, as for values. */
          readonly before: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
          /** For `"merge"`: the nodes merged into. */
          readonly matchedIds: readonly NodeId[];
          /**
           * Of `nodes`, the graph's own that only take a value from the join and are not among
           * what it supplies (a compare's `"only-onto"` nodes).
           */
          readonly marked?: readonly NodeId[];
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

/** The hub cap when `link.maxShared` is absent (Neo4j's fraud examples use 10). */
const MAX_SHARED = 10;
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
 * Text that spells a number compares as that number, so `+15550142` in a column kept as text
 * matches 15550142 in a column read as numbers.
 * @param value - The value.
 * @param loose - How to compare.
 * @returns The compared form.
 */
function norm(value: unknown, loose: Loose): string | undefined {
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        return undefined;
    }

    let text = typeof value === "string" && isNumericText(value) ? String(Number(value)) : String(value);
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

/** Incoming keys translated through a mapping table, and what the table could not map. */
interface Translation {
    /** The values a key maps to: itself when the table lacks it. */
    readonly to: (value: unknown) => readonly unknown[];
    /** Distinct incoming keys the table lacks. */
    readonly unmapped: number;
    /** Distinct incoming keys the table maps to more than one value. */
    readonly mappedToMany: number;
}

/** No mapping table: every key is itself. */
const IDENTITY: Translation = { to: (value) => [value], unmapped: 0, mappedToMany: 0 };

/**
 * Translates an incoming key through a mapping table: by default, the table's column holding the
 * most of the incoming values to its column holding the most of the graph's.
 * @param via - The mapping table, or undefined.
 * @param values - The incoming values.
 * @param graphKeys - The graph's keys, compared.
 * @param loose - How to compare.
 * @param choices - The join: its `mapping`.
 * @returns The translation, or the identity when there is no mapping table.
 */
function translator(
    via: JoinTable | undefined,
    values: readonly unknown[],
    graphKeys: ReadonlySet<string>,
    loose: Loose,
    choices: JoinChoices,
): Translation {
    if (via === undefined) {
        return IDENTITY;
    }

    for (const column of choices.mapping?.columns ?? []) {
        if (!via.columns.includes(column)) {
            throw badJoin(`The mapping table has no column ${JSON.stringify(column)}.`, {
                reason: "unknown-column",
                column,
                columns: [...via.columns],
            });
        }
    }

    const incoming = new Set(values.map((value) => norm(value, loose)).filter((value) => value !== undefined));
    // ponytail: one pass per mapping column; a mapping table is a few thousand rows at most.
    const overlap = (column: string, wanted: ReadonlySet<string | undefined>): number =>
        via.rows.filter((row) => wanted.has(norm(row[column], loose))).length;
    const from =
        choices.mapping?.columns?.[0] ??
        [...via.columns].sort((a, b) => overlap(b, incoming) - overlap(a, incoming))[0];
    const to =
        choices.mapping?.columns?.[1] ??
        via.columns
            .filter((column) => column !== from)
            .sort((a, b) => overlap(b, graphKeys) - overlap(a, graphKeys))[0];
    if (from === undefined || to === undefined) {
        return IDENTITY;
    }

    const map = new Map<string, unknown[]>();
    for (const row of via.rows) {
        const key = norm(row[from], loose);
        const list = key === undefined ? undefined : (map.get(key) ?? []);
        if (key !== undefined && list !== undefined && !absent(row[to]) && !list.includes(row[to])) {
            list.push(row[to]);
            map.set(key, list);
        }
    }

    const many = choices.mapping?.many === "list";
    return {
        to: (value) => {
            const list = map.get(norm(value, loose) ?? "");
            if (list === undefined) {
                return [value];
            }

            return many ? list : [list[0]];
        },
        unmapped: [...incoming].filter((key) => !map.has(key)).length,
        mappedToMany: [...incoming].filter((key) => (map.get(key)?.length ?? 0) > 1).length,
    };
}

/**
 * The mapping table a join names.
 * @param graph - The graph.
 * @param choices - The join.
 * @returns The table, or undefined when the join names none (or one no longer loaded).
 */
function viaOf(graph: JoinGraph, choices: JoinChoices): JoinTable | undefined {
    const { via, lookup } = choices;
    if (via !== undefined && lookup !== undefined) {
        throw badJoin("A join takes a mapping table as via or as lookup, not both.", { reason: "via-and-lookup" });
    }

    if (lookup !== undefined) {
        return lookupTable(lookup);
    }

    return via === undefined ? undefined : graph.table(via);
}

/**
 * A lookup as a join reads it.
 * @param lookup - The lookup.
 * @returns The table, its columns by default every column a row holds.
 */
function lookupTable(lookup: JoinLookup): JoinTable {
    return {
        name: lookup.name ?? "",
        columns: lookup.columns ?? [...new Set(lookup.rows.flatMap((row) => Object.keys(row)))],
        rows: lookup.rows,
    };
}

/**
 * The name a join writes in place of one it derives (`JoinChoices.names`).
 * @param choices - The join.
 * @param name - The derived name.
 * @returns The reader's name for it, or the derived one.
 */
function named(choices: JoinChoices, name: string): string {
    return choices.names?.[name] ?? name;
}

/**
 * The share of a column's distinct values found in a set of compared keys.
 * @param table - The table.
 * @param column - The column.
 * @param keys - The compared keys.
 * @returns The share, 0 to 1.
 */
function overlapOf(table: JoinTable, column: string, keys: ReadonlySet<string> | ReadonlyMap<string, unknown>): number {
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

/** A table column and the node value its values meet most. */
interface ColumnMatch {
    readonly column: string;
    /** The node value: `"id"` or `"data.<column>"`. */
    readonly path: string;
    /** The share of the column's distinct values found there. */
    readonly share: number;
    /** The nodes under each compared value of the path. */
    readonly index: ReadonlyMap<string, readonly (NodeId | EdgeId)[]>;
}

/**
 * Whether most of a column's values found among the nodes each name exactly one node, as an
 * edge's end does (an id, a person_id), unlike a shared attribute (a tissue).
 * @param table - The table.
 * @param end - The column.
 * @param loose - How to compare.
 * @returns Whether it names nodes.
 */
function namesOneNode(table: JoinTable, end: ColumnMatch, loose: Loose): boolean {
    const found = new Set<string>();
    for (const row of table.rows) {
        const value = norm(row[end.column], loose);
        if (value !== undefined && end.index.has(value)) {
            found.add(value);
        }
    }

    let one = 0;
    for (const value of found) {
        one += end.index.get(value)?.length === 1 ? 1 : 0;
    }

    return one * 2 > found.size;
}

/**
 * Whether the two columns read as an edge's ends: each names one node, and most rows naming a
 * node in both name two different nodes, not a second key of the same node (an id and a name).
 * @param table - The table.
 * @param ends - The two columns.
 * @param loose - How to compare.
 * @returns Whether the rows read as edges.
 */
function namesTwoNodes(table: JoinTable, ends: readonly [ColumnMatch, ColumnMatch], loose: Loose): boolean {
    if (!ends.every((end) => namesOneNode(table, end, loose))) {
        return false;
    }

    let both = 0;
    let apart = 0;
    for (const row of table.rows) {
        const [source, target] = ends.map((end) => end.index.get(norm(row[end.column], loose) ?? "")?.[0]);
        if (source !== undefined && target !== undefined) {
            both++;
            apart += source === target ? 0 : 1;
        }
    }

    return apart * 2 > both;
}

/**
 * Whether a cell holds a number, as a number or as text.
 * @param value - The cell.
 * @returns Whether it is a finite number.
 */
function isNumeric(value: unknown): boolean {
    return (
        (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) &&
        Number.isFinite(Number(value))
    );
}

/**
 * The columns whose values, shared by a few of the nodes the key names, would link them
 * (`shape: "link"`): a value held by 2 to `MAX_SHARED` nodes links them, one held by more is a
 * hub. A column fits when it has a linking value and no more hubs than linking values.
 * @param table - The table.
 * @param key - The key column and the nodes under each compared value.
 * @param loose - How to compare.
 * @returns The columns, in table order.
 */
function linkColumnsOf(table: JoinTable, key: ColumnMatch, loose: Loose): string[] {
    const rowNodes = table.rows.map((row) => key.index.get(norm(row[key.column], loose) ?? ""));
    return table.columns.filter((column) => {
        if (column === key.column) {
            return false;
        }

        // A measurement (a fold change, a p-value) repeats by chance; an identifier is text or a
        // whole number.
        if (table.rows.some((row) => isNumeric(row[column]) && !Number.isInteger(Number(row[column])))) {
            return false;
        }

        const holders = new Map<string, Set<NodeId | EdgeId>>();
        table.rows.forEach((row, at) => {
            const value = norm(row[column], loose);
            const ids = rowNodes[at];
            if (value === undefined || ids === undefined) {
                return;
            }

            const held = holders.get(value) ?? new Set();
            ids.forEach((id) => held.add(id));
            holders.set(value, held);
        });
        let linking = 0;
        let hubs = 0;
        for (const held of holders.values()) {
            hubs += held.size > MAX_SHARED ? 1 : 0;
            linking += held.size > 1 && held.size <= MAX_SHARED ? 1 : 0;
        }

        return linking > 0 && linking >= hubs;
    });
}

/**
 * The column and the graph path whose values meet most, on nodes, then on edges.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param matches - Each column's best match on the nodes.
 * @param loose - How keys are compared.
 * @returns The best values key, or undefined when no value meets.
 */
function bestValuesKey(
    table: JoinTable,
    graph: JoinGraph,
    matches: Iterable<ColumnMatch>,
    loose: Loose,
): { shape: JoinShape; key: JoinKey; share: number } | undefined {
    let best: { shape: JoinShape; key: JoinKey; share: number } | undefined;
    for (const match of matches) {
        if (match.share > (best?.share ?? 0)) {
            best = { shape: "node-values", key: { file: match.column, graph: match.path }, share: match.share };
        }
    }

    for (const path of pathsOf(graph.edges)) {
        const keys = indexOf(graph.edges, [path], loose);
        for (const column of table.columns) {
            const share = overlapOf(table, column, keys);
            if (share > (best?.share ?? 0)) {
                best = { shape: "edge-values", key: { file: column, graph: path }, share };
            }
        }
    }
    return best;
}

/**
 * How the table most likely joins onto the graph. An edge end may match any node value, not only
 * the id (a person_id column onto the people's `data.person_id`). A values join onto nodes also
 * names, in `link`, the columns whose shared values would link the nodes, when any fit.
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
    const nodePaths = pathsOf(graph.nodes).map((path) => ({ path, index: indexOf(graph.nodes, [path], loose) }));
    const matchOf = (column: string): ColumnMatch => {
        const all = nodePaths.map(({ path, index }) => ({
            column,
            path,
            index,
            share: overlapOf(table, column, index),
        }));
        return all.reduce((best, each) => (each.share > best.share ? each : best), all[0]);
    };
    const matches = new Map(table.columns.map((column) => [column, matchOf(column)]));

    // Edges: the table's own endpoint pair, or the two columns most of whose values name
    // different nodes in each row.
    const ranked = [...matches.values()].sort((a, b) => b.share - a.share);
    // In table order, so the earlier column is the source.
    const [first, second] = ranked
        .slice(0, 2)
        .sort((a, b) => table.columns.indexOf(a.column) - table.columns.indexOf(b.column));
    const guessed: readonly [ColumnMatch, ColumnMatch] | undefined =
        second !== undefined && ranked[1].share >= CONFIDENT && namesTwoNodes(table, [first, second], loose)
            ? [first, second]
            : undefined;
    const given: readonly [ColumnMatch, ColumnMatch] | undefined =
        endpoints === undefined ? undefined : [matchOf(endpoints.source), matchOf(endpoints.target)];
    const pair = given ?? guessed;
    if (pair !== undefined) {
        const ends = { source: pair[0].column, target: pair[1].column };
        const valuesOnEdges = pairValues(table, graph, ends);
        if (valuesOnEdges !== undefined) {
            return valuesOnEdges;
        }

        const share = Math.min(pair[0].share, pair[1].share);
        if (share > 0) {
            return Object.freeze({
                shape: "edges",
                keys: Object.freeze(pair.map((end) => Object.freeze({ file: end.column, graph: end.path }))),
                confident: share >= CONFIDENT,
                ...(repeatsDiffer(table, ends) ? { repeated: "both" as const } : {}),
            });
        }
    }

    const best = bestValuesKey(table, graph, matches.values(), loose);
    if (best === undefined) {
        return Object.freeze({ shape: "rows", keys: Object.freeze([]), confident: false });
    }

    const keyMatch = matches.get(best.key.file);
    const link = best.shape === "node-values" && keyMatch !== undefined ? linkColumnsOf(table, keyMatch, loose) : [];
    return Object.freeze({
        shape: best.shape,
        keys: Object.freeze([Object.freeze(best.key)]),
        confident: best.share >= CONFIDENT,
        ...(link.length === 0 ? {} : { link: Object.freeze({ columns: Object.freeze(link) }) }),
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
    const named = [
        ...choices.keys.map((key) => key.file),
        ...Object.keys(choices.aggregate ?? {}),
        ...(choices.link?.columns ?? []),
    ];
    for (const column of named) {
        if (!table.columns.includes(column)) {
            throw badJoin(`The table has no column ${JSON.stringify(column)}.`, {
                reason: "unknown-column",
                column,
                columns: [...table.columns],
            });
        }
    }

    if (choices.compare === true && chosen !== "merge") {
        throw badJoin("Only a join of merge can compare two graphs.", { reason: "compare", shape: chosen });
    }

    if (chosen === "link" && (choices.link === undefined || choices.link.columns.length === 0)) {
        throw badJoin("A join of link takes link.columns.", { reason: "link", shape: chosen });
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
    /** What the mapping table could not map. */
    readonly translation: Translation;
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
    via: JoinTable | undefined,
    directed: boolean,
): Matching {
    const index = indexOf(
        elements,
        choices.keys.map((key) => key.graph),
        loose,
        directed,
    );
    const first = choices.keys[0].file;
    const translation = translator(
        via,
        table.rows.map((row) => row[first]),
        new Set(index.keys()),
        loose,
        choices,
    );
    const matched = new Set<NodeId | EdgeId>();
    const rowKeys: (string | undefined)[] = [];
    const rowIds = table.rows.map((row) => {
        const rest = choices.keys.slice(1).map((key) => norm(row[key.file], loose));
        const keys = translation
            .to(row[first])
            .map((value) => [norm(value, loose), ...rest])
            .filter((parts) => !parts.includes(undefined))
            .map((parts) => parts.join(PART));
        rowKeys.push(keys.at(0));
        const ids = [...new Set(keys.flatMap((key) => index.get(key) ?? []))];
        ids.forEach((id) => matched.add(id));
        return ids;
    });
    return { rowIds, rowKeys, matched, translation };
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

/** An edge table's rows, their ends resolved, and what the mapping table could not map. */
interface EdgeMatching {
    readonly rows: EdgeRow[];
    readonly unmapped: number;
    readonly mappedToMany: number;
}

/**
 * Resolve each row's two ends to the graph's node ids. With `endKinds` and `kindIds: "scoped"`,
 * an end matches only a node of its kind, and an end the join makes is `<kind>:<value>` when a
 * node, or another end it makes, holds its value under another kind.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join: two keys, source then target.
 * @param loose - How to compare.
 * @returns The rows with both ends given.
 */
function matchEdges(table: JoinTable, graph: JoinGraph, choices: JoinChoices, loose: Loose): EdgeMatching {
    const via = viaOf(graph, choices);
    const kinds = endKindsOf(choices);
    const scoped = choices.kindIds === "scoped";
    const indexes = choices.keys.map((key, side) => {
        const kind = scoped ? kinds[side] : undefined;
        const nodes = kind === undefined ? graph.nodes : graph.nodes.filter((node) => node.data.kind === kind);
        return indexOf(nodes, [key.graph], loose);
    });
    const translations = choices.keys.map((key, at) =>
        translator(
            via,
            table.rows.map((row) => row[key.file]),
            new Set(indexes[at].keys()),
            loose,
            choices,
        ),
    );
    const out: EdgeRow[] = [];
    // The kinds each value a made end carries, to keep one id apart across kinds.
    const madeKinds = new Map<string, Set<string | undefined>>();
    table.rows.forEach((row, at) => {
        const ends = choices.keys.map((key, side) => {
            // ponytail: an end mapped to several values takes the first; edges per value if asked.
            const given = translations[side].to(row[key.file])[0];
            const id = indexes[side].get(norm(given, loose) ?? "")?.[0];
            if (id === undefined && !absent(given)) {
                madeKinds.set(String(given), (madeKinds.get(String(given)) ?? new Set()).add(kinds[side]));
            }

            return { value: id ?? given, found: id !== undefined, blank: absent(given) };
        });
        if (ends.some((end) => end.blank)) {
            return;
        }

        out.push({ at, ends: [ends[0].value, ends[1].value], found: [ends[0].found, ends[1].found] });
    });
    const held = new Set(graph.nodes.map((node) => String(node.id)));
    const apart = (value: unknown, side: number): unknown => {
        const kind = kinds[side];
        const clashes = held.has(String(value)) || (madeKinds.get(String(value))?.size ?? 0) > 1;
        return scoped && kind !== undefined && clashes ? `${kind}:${String(value)}` : value;
    };
    const rows = out.map((row) => ({
        ...row,
        ends: row.ends.map((end, side) => (row.found[side] ? end : apart(end, side))) as unknown as readonly [
            unknown,
            unknown,
        ],
    }));
    return {
        rows,
        unmapped: translations[0].unmapped + translations[1].unmapped,
        mappedToMany: translations[0].mappedToMany + translations[1].mappedToMany,
    };
}

/**
 * The kinds of the ends an edges join makes, source then target.
 * @param choices - The join.
 * @returns The kinds, undefined where none is named.
 */
function endKindsOf(choices: JoinChoices): readonly [string | undefined, string | undefined] {
    return [choices.endKinds?.source, choices.endKinds?.target];
}

/**
 * The incoming columns a join brings: the choice, or every column but the keys.
 * @param table - The incoming table.
 * @param choices - The join.
 * @returns The columns.
 */
function columnsOf(table: JoinTable, choices: JoinChoices): string[] {
    const keys = new Set(choices.keys.map((key) => key.file));
    const brought = (choices.columns ?? table.columns).filter(
        (column) => table.columns.includes(column) && !keys.has(column),
    );
    // An aggregated column is brought even when it is a key column (to count the rows).
    return [...new Set([...brought, ...Object.keys(choices.aggregate ?? {})])];
}

/**
 * One value from many: see {@link JoinReduce}.
 * @param rule - The reduction.
 * @param values - The values, blanks dropped, in table order.
 * @returns The value, or undefined when there is none.
 */
function reduce(rule: JoinReduce, values: readonly unknown[]): unknown {
    if (rule === "count") {
        return values.length;
    }

    if (values.length === 0) {
        return undefined;
    }

    if (rule === "first" || rule === "last" || rule === "list") {
        return { first: values[0], last: values.at(-1), list: [...values] }[rule];
    }

    const numbers = values.map(Number).filter((value) => Number.isFinite(value));
    if (rule === "min" || rule === "max") {
        if (numbers.length < values.length) {
            const texts = values.map(String).sort((a, b) => a.localeCompare(b));
            return rule === "min" ? texts[0] : texts.at(-1);
        }

        return rule === "min" ? Math.min(...numbers) : Math.max(...numbers);
    }

    if (numbers.length === 0) {
        return undefined;
    }

    const sum = numbers.reduce((total, value) => total + value, 0);
    return rule === "sum" ? sum : sum / numbers.length;
}

/** One value a group of rows writes: the incoming column, the name written, the value. */
interface Written {
    readonly column: string;
    readonly name: string;
    readonly value: unknown;
}

/**
 * The values a group of rows (one key's, or one pair's) writes: with `aggregate`, each column
 * reduced; otherwise the first value, the last with `repeated: "last"`, or every distinct value
 * with `repeated: "both"`.
 * @param rows - The rows, in table order.
 * @param columns - The incoming columns brought.
 * @param choices - The join.
 * @param nameOf - The name a column is written under.
 * @returns The values, blanks left out.
 */
function groupValues(
    rows: readonly Readonly<Record<string, unknown>>[],
    columns: readonly string[],
    choices: JoinChoices,
    nameOf: (column: string) => string,
): Written[] {
    const out: Written[] = [];
    const keys = new Set(choices.keys.map((key) => key.file));
    for (const column of columns) {
        const given = rows.map((row) => row[column]).filter((value) => !absent(value));
        const values =
            choices.aggregate === undefined
                ? keptValue(given, choices)
                : reducedValues(column, given, choices.aggregate[column] ?? "first", keys.has(column), choices, nameOf);
        for (const { name, value } of values) {
            out.push({ column, name: name ?? nameOf(column), value });
        }
    }

    return out;
}

/**
 * A column's values with `aggregate`: each reduction, written under the column's name when it is
 * the only one and the column is not a key column (whose own name holds the match).
 * @param column - The incoming column.
 * @param given - Its values, blanks dropped.
 * @param rules - Its reductions.
 * @param isKey - Whether it is a key column.
 * @param choices - The join, for its names.
 * @param nameOf - The name a column is written under.
 * @returns The values, each with its name.
 */
function reducedValues(
    column: string,
    given: readonly unknown[],
    rules: JoinReduce | readonly JoinReduce[],
    isKey: boolean,
    choices: JoinChoices,
    nameOf: (column: string) => string,
): { readonly name: string; readonly value: unknown }[] {
    const plain = typeof rules === "string" && !isKey;
    return (typeof rules === "string" ? [rules] : rules).flatMap((rule) => {
        const value = reduce(rule, given);
        const name = plain ? nameOf(column) : named(choices, `${nameOf(column)} (${rule})`);
        return value === undefined ? [] : [{ name, value }];
    });
}

/**
 * A column's value without `aggregate`: the first, the last with `repeated: "last"`, or every
 * distinct value with `repeated: "both"`.
 * @param given - Its values, blanks dropped.
 * @param choices - The join.
 * @returns The value under the column's own name, or none.
 */
function keptValue(
    given: readonly unknown[],
    choices: JoinChoices,
): { readonly name?: string; readonly value: unknown }[] {
    const distinct = [...new Set(given)];
    const one = choices.repeated === "last" ? given.at(-1) : given[0];
    const value = choices.repeated === "both" && distinct.length > 1 ? distinct : one;
    return value === undefined ? [] : [{ value }];
}

/**
 * Whether every row of a key is kept, not one: `repeated: "both"` or `aggregate`.
 * @param choices - The join.
 * @returns True when no row repeats another.
 */
function keepsEveryRow(choices: JoinChoices): boolean {
    return choices.repeated === "both" || choices.aggregate !== undefined;
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
 * The table with its `split` columns split at their separators: for `"edges"`, one row per part;
 * otherwise each cell's parts as a list.
 * @param table - The incoming table.
 * @param choices - The join.
 * @param shape - The join's shape.
 * @returns The table, the same one when nothing is split.
 */
function splitTable(table: JoinTable, choices: JoinChoices, shape: JoinShape): JoinTable {
    const split = Object.entries(choices.split ?? {}).filter(([column]) => table.columns.includes(column));
    if (split.length === 0) {
        return table;
    }

    const partsOf = (value: unknown, separator: string): unknown[] => {
        if (Array.isArray(value)) {
            return value;
        }

        if (typeof value !== "string") {
            return absent(value) ? [] : [value];
        }

        return value
            .split(separator)
            .map((part) => part.trim())
            .filter((part) => part !== "");
    };
    let rows: Readonly<Record<string, unknown>>[] = [...table.rows];
    let origin = rows.map((_row, at) => at);
    for (const [column, separator] of split) {
        if (shape === "edges") {
            const next: Readonly<Record<string, unknown>>[] = [];
            const from: number[] = [];
            rows.forEach((row, at) => {
                const parts = partsOf(row[column], separator);
                for (const each of parts.length === 0 ? [row] : parts.map((part) => ({ ...row, [column]: part }))) {
                    next.push(each);
                    from.push(origin[at]);
                }
            });
            rows = next;
            origin = from;
        } else {
            rows = rows.map((row) => {
                const parts = partsOf(row[column], separator);
                return parts.length === 0 ? row : { ...row, [column]: parts };
            });
        }
    }

    return { ...table, rows, origin };
}

/**
 * Each matched element's rows, in table order.
 * @param table - The incoming table.
 * @param matching - Each row's matches.
 * @returns The rows by element id.
 */
function rowsByElement(
    table: JoinTable,
    matching: Matching,
): Map<NodeId | EdgeId, Readonly<Record<string, unknown>>[]> {
    const rowsOf = new Map<NodeId | EdgeId, Readonly<Record<string, unknown>>[]>();
    matching.rowIds.forEach((ids, at) => {
        for (const id of ids) {
            rowsOf.set(id, [...(rowsOf.get(id) ?? []), table.rows[at]]);
        }
    });
    return rowsOf;
}

/** One clash: an element's own value of a column and the different value a row brings. */
export interface ClashPair {
    readonly id: NodeId | EdgeId;
    readonly graph: unknown;
    readonly incoming: unknown;
}

/**
 * The clashes of each clashing column: the matched elements whose own value is set and differs
 * from the incoming one.
 * @param table - The incoming table.
 * @param elements - The nodes or edges.
 * @param matching - Each row's matches.
 * @param columns - The incoming columns brought.
 * @param choices - The join.
 * @returns The clashes by column.
 */
function clashPairs(
    table: JoinTable,
    elements: readonly JoinElement[],
    matching: Matching,
    columns: readonly string[],
    choices: JoinChoices,
): Map<string, ClashPair[]> {
    const clashing = clashesOf(elements, columns);
    const out = new Map<string, ClashPair[]>(clashing.map((column) => [column, []]));
    if (clashing.length === 0) {
        return out;
    }

    const byId = new Map(elements.map((element) => [element.id, element]));
    const plain: JoinChoices = { ...choices, aggregate: undefined };
    for (const [id, rows] of rowsByElement(table, matching)) {
        const held = byId.get(id)?.data ?? {};
        for (const { column, value } of groupValues(rows, clashing, plain, (each) => each)) {
            if (!absent(held[column]) && JSON.stringify(held[column]) !== JSON.stringify(value)) {
                out.get(column)?.push(Object.freeze({ id, graph: held[column], incoming: value }));
            }
        }
    }

    return out;
}

/**
 * The clashes of one column a join of values (or a merge) meets: what a conflicts review lists.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @param shape - The shape when the choices give none.
 * @param column - The incoming column.
 * @returns The clashes, in table order; empty for any other shape.
 */
export function joinClashes(
    table: JoinTable,
    graph: JoinGraph,
    choices: JoinChoices,
    shape: JoinShape,
    column: string,
): readonly ClashPair[] {
    const chosen = checked(table, choices, shape);
    if (chosen !== "node-values" && chosen !== "edge-values" && chosen !== "merge") {
        return [];
    }

    const split = splitTable(table, choices, chosen);
    const elements = chosen === "edge-values" ? graph.edges : graph.nodes;
    const matching = matchValues(split, elements, choices, looseOf(choices), viaOf(graph, choices), graph.directed);
    return clashPairs(split, elements, matching, columnsOf(split, choices), choices).get(column) ?? [];
}

/**
 * Count what a join would do.
 * @param given - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @param shape - The shape when the choices give none.
 * @returns The counts.
 */
export function joinReport(given: JoinTable, graph: JoinGraph, choices: JoinChoices, shape: JoinShape): JoinReport {
    const chosen = checked(given, choices, shape);
    const table = splitTable(given, choices, chosen);
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
            fanOut: 0,
            merged: 0,
            onlyFrom: 0,
            onlyOnto: 0,
            pairsLinked: 0,
            valuesOverCap: 0,
            pairsBelowMin: 0,
            unmapped: 0,
            mappedToMany: 0,
            unreadRows: given.unreadRows ?? 0,
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

    const elements = chosen === "edge-values" ? graph.edges : graph.nodes;
    const via = viaOf(graph, choices);
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

    const base: Partial<JoinReport> = {
        matched: now.matched.size,
        notInGraph: loosest.rowIds.filter((ids) => ids.length === 0).length,
        withoutValue: elements.length - now.matched.size,
        repeatedKeys: [...seen.values()].filter((count) => count > 1).length,
        extraIgnoringCase: choices.ignoreCase === true ? 0 : extra({ ignoreCase: true }),
        extraIgnoringSpaces: choices.ignoreSpaces === true ? 0 : extra({ ignoreSpaces: true }),
        updatedNodes: chosen === "edge-values" || chosen === "link" ? 0 : changedCount(table, graph, choices, chosen),
        rowMatches: frozen(now.rowIds.map((ids) => [...ids])),
        withoutValueIds: frozen(elements.map((element) => element.id).filter((id) => !now.matched.has(id))),
        rowFates: frozen(valueFates(now.rowKeys, now.rowIds, choices, chosen)),
        newNodes: addsRows(choices, chosen)
            ? new Set(now.rowKeys.filter((key, at) => key !== undefined && now.rowIds[at].length === 0)).size
            : 0,
        fanOut: now.rowIds.filter((ids) => ids.length > 1).length,
        unmapped: now.translation.unmapped,
        mappedToMany: now.translation.mappedToMany,
    };
    if (chosen === "merge") {
        return report(mergeCounts(table, graph, choices, base, now.matched.size), elements);
    }

    if (chosen === "link") {
        const link = linkOf(table, graph, choices);
        return report({ ...base, ...link.counts, rowFates: frozen(link.fates) }, []);
    }

    return report(base, elements);
}

/**
 * A merge's counts: the values join's, with the merge's fates and, with `compare`, its regions.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @param base - The values join's counts.
 * @param merged - The nodes rows merge into.
 * @returns The counts.
 */
function mergeCounts(
    table: JoinTable,
    graph: JoinGraph,
    choices: JoinChoices,
    base: Partial<JoinReport>,
    merged: number,
): Partial<JoinReport> {
    const merge = mergeOf(table, graph, choices);
    const kept = choices.unmatchedFrom === "drop" ? 0 : merge.onlyFrom;
    const onlyOnto = graph.nodes.length - merged;
    const regions = { "only-from": kept, both: merged, "only-onto": onlyOnto };
    return {
        ...base,
        rowFates: frozen(merge.fates),
        merged,
        onlyFrom: merge.onlyFrom,
        onlyOnto,
        newNodes: kept,
        ...(choices.compare === true ? { regions: frozen({ nodes: regions }) } : {}),
    };
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
        choices.via === undefined &&
        choices.lookup === undefined
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
        if (!keepsEveryRow(choices) && kept.get(key) !== at) {
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
    if (plan.kind === "rows") {
        return 0;
    }

    const elements = plan.kind === "values" && plan.target === "edge" ? graph.edges : graph.nodes;
    const held = new Map(elements.map((each) => [each.id, each.data]));
    const rows =
        plan.kind === "values"
            ? plan.rows
            : plan.nodes.map(({ id, ...values }) => ({ id: id as NodeId, values })).filter((row) => held.has(row.id));
    return rows.filter((row) =>
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
        const repeat = !keepsEveryRow(choices) && keptAt.get(pairOf(row)) !== row.at;
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
    const matching = matchEdges(table, graph, choices, looseOf(choices));
    const all = matching.rows;
    const both = (edgeRows: readonly EdgeRow[]): number => edgeRows.filter(bothFound).length;
    const loosest = matchEdges(table, graph, choices, { ignoreCase: true, ignoreSpaces: true }).rows;
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
    const kept = choices.repeated === "both" && choices.aggregate === undefined ? rows.length : pairs.size;
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
                    : both(matchEdges(table, graph, choices, looseOf(choices, { ignoreCase: true })).rows) - matched,
            extraIgnoringSpaces:
                choices.ignoreSpaces === true
                    ? 0
                    : both(matchEdges(table, graph, choices, looseOf(choices, { ignoreSpaces: true })).rows) - matched,
            newNodes: fresh.size,
            newEdges: kept,
            // An edge join writes no node's values.
            updatedNodes: 0,
            rowMatches: frozen(rowMatches),
            withoutValueIds: frozen(graph.nodes.map((node) => node.id).filter((id) => !touched.has(id))),
            rowFates: frozen(rowFates),
            unknownEndRows: all.filter((row) => !bothFound(row)).length,
            unmapped: matching.unmapped,
            mappedToMany: matching.mappedToMany,
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
 * The column a clashing incoming column is written under with `"both"`, or the reader's name for it.
 * @param column - The incoming column.
 * @param table - The incoming table.
 * @param choices - The join.
 * @returns The name.
 */
function bothColumn(column: string, table: JoinTable, choices: JoinChoices): string {
    return named(choices, bothName(column, table));
}

/**
 * Plan a join: what it writes.
 * @param given - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @param shape - The shape when the choices give none.
 * @returns The plan and its shape.
 */
export function planJoin(
    given: JoinTable,
    graph: JoinGraph,
    choices: JoinChoices,
    shape: JoinShape,
): { readonly shape: JoinShape; readonly plan: JoinPlan; readonly matched: number; readonly joinedRows: number } {
    const chosen = checked(given, choices, shape);
    const table = splitTable(given, choices, chosen);
    const columns = columnsOf(table, choices);
    if (chosen === "rows" || chosen === "replace") {
        return { shape: chosen, plan: { kind: "rows" }, matched: 0, joinedRows: 0 };
    }

    if (chosen === "edges") {
        return { shape: chosen, ...planEdges(table, graph, choices, columns) };
    }

    if (chosen === "merge") {
        const merge = mergeOf(table, graph, choices);
        const joinedRows = merge.fates.filter((fate) => fate !== "left-out").length;
        return { shape: chosen, plan: merge.plan, matched: merge.plan.matchedIds.length, joinedRows };
    }

    if (chosen === "link") {
        const link = linkOf(table, graph, choices);
        const joinedRows = link.fates.filter((fate) => fate === "linked").length;
        return { shape: chosen, plan: link.plan, matched: link.matched, joinedRows };
    }

    const target = chosen === "node-values" ? "node" : "edge";
    const elements = target === "node" ? graph.nodes : graph.edges;
    const via = viaOf(graph, choices);
    const matching = matchValues(table, elements, choices, looseOf(choices), via, graph.directed);
    const { rows, before, written } = valuesOf(table, elements, matching, columns, choices);
    return {
        shape: chosen,
        matched: matching.matched.size,
        joinedRows: matching.rowIds.filter((ids) => ids.length > 0).length,
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
 * The values a join writes onto the elements its rows matched, and what they held before.
 * @param table - The incoming table.
 * @param elements - The nodes or edges.
 * @param matching - Each row's matches.
 * @param columns - The incoming columns brought.
 * @param choices - The join.
 * @returns Each element's values, the values before, and the names written.
 */
function valuesOf(
    table: JoinTable,
    elements: readonly JoinElement[],
    matching: Matching,
    columns: readonly string[],
    choices: JoinChoices,
): {
    readonly rows: RowUpdate<NodeId | EdgeId>[];
    readonly before: Record<string, Record<string, unknown>>;
    readonly written: Set<string>;
} {
    const byId = new Map(elements.map((element) => [element.id, element]));
    const clashing = new Set(clashesOf(elements, columns));
    const fuseOf = (column: string): JoinReduce | undefined =>
        clashing.has(column) ? choices.fuse?.[column] : undefined;
    const ruleOf = (column: string): "keep" | "overwrite" | "both" =>
        clashing.has(column) && fuseOf(column) === undefined ? (choices.clash?.[column] ?? "both") : "overwrite";
    const nameOf = (column: string): string =>
        ruleOf(column) === "both" ? bothColumn(column, table, choices) : column;
    const written = new Set<string>();
    const before: Record<string, Record<string, unknown>> = {};
    const rows: RowUpdate<NodeId | EdgeId>[] = [];
    for (const [id, matchedRows] of rowsByElement(table, matching)) {
        const held = byId.get(id)?.data ?? {};
        const values: Record<string, unknown> = {};
        const write = (name: string, value: unknown): void => {
            values[name] = value;
            written.add(name);
            const rowKey = String(id);
            before[rowKey] ??= {};
            before[rowKey][name] = held[name] ?? null;
        };
        for (const { column, name, value } of groupValues(matchedRows, columns, choices, nameOf)) {
            if (ruleOf(column) === "keep" && !absent(held[name])) {
                continue;
            }

            const fuse = fuseOf(column);
            const result =
                fuse === undefined
                    ? value
                    : reduce(
                          fuse,
                          [held[name], value].flat().filter((each) => !absent(each)),
                      );
            if (result !== undefined) {
                write(name, result);
            }
        }

        if (choices.flag !== undefined && held[choices.flag] !== true) {
            write(choices.flag, true);
        }

        if (Object.keys(values).length > 0) {
            rows.push(Object.freeze({ id, values: Object.freeze(values) }));
        }
    }

    return { rows, before, written };
}

/** What a merge does: its plan, each row's fate, and the keys only the table holds. */
interface Merge {
    readonly plan: Extract<JoinPlan, { kind: "edges" }>;
    readonly matching: Matching;
    readonly fates: JoinRowFate[];
    readonly onlyFrom: number;
}

/**
 * Plan a merge: a row naming a node is fused into it as values are; the rows of each key naming
 * no node become one new node, its id the key's value (`<value> (<table>)` when a node already has
 * that id), carrying the key under the graph column it matched.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @returns The merge.
 */
function mergeOf(table: JoinTable, graph: JoinGraph, choices: JoinChoices): Merge {
    const columns = columnsOf(table, choices);
    const via = viaOf(graph, choices);
    const matching = matchValues(table, graph.nodes, choices, looseOf(choices), via, graph.directed);
    const { rows, before, written } = valuesOf(table, graph.nodes, matching, columns, choices);
    const valuesById = new Map(rows.map((row) => [row.id, row.values]));
    const nodes: Record<string, unknown>[] = [...matching.matched].map((id) => ({
        ...valuesById.get(id),
        id,
    }));
    // The rows of each key no node holds, in table order.
    const unmatched = new Map<string, number[]>();
    matching.rowKeys.forEach((key, at) => {
        if (key !== undefined && matching.rowIds[at].length === 0) {
            unmatched.set(key, [...(unmatched.get(key) ?? []), at]);
        }
    });

    const fates = valueFates(matching.rowKeys, matching.rowIds, choices, "merge").map((fate) =>
        fate === "joined" ? "merged" : fate,
    );
    const marked: NodeId[] = [];
    const region = regionWriter(graph, choices, matching, { nodes, before, written, marked });
    if (choices.unmatchedFrom !== "drop") {
        const ids = new Set(graph.nodes.map((node) => String(node.id)));
        // Comparing two graphs keeps the table's clashing values in their own columns on every node.
        const clashing = new Set(choices.compare === true ? clashesOf(graph.nodes, columns) : ["id"]);
        const nameOf = (column: string): string =>
            clashing.has(column) && (column === "id" || (choices.clash?.[column] ?? "both") === "both")
                ? bothColumn(column, table, choices)
                : column;
        for (const ats of unmatched.values()) {
            const first = table.rows[ats[0]];
            const given = choices.keys.map((key) => String(first[key.file])).join(" ");
            const record: Record<string, unknown> = {};
            for (const key of choices.keys.filter((each) => each.graph !== "id")) {
                record[key.graph.replace(/^data\./, "")] = first[key.file];
            }

            for (const { name, value } of groupValues(
                ats.map((at) => table.rows[at]),
                columns,
                choices,
                nameOf,
            )) {
                record[name] = value;
                written.add(name);
            }

            nodes.push({ ...record, ...region("only-from"), id: ids.has(given) ? bothName(given, table) : given });
            const kept = keepsEveryRow(choices) ? ats : [choices.repeated === "last" ? ats.at(-1) : ats[0]];
            for (const at of ats) {
                fates[at] = kept.includes(at) ? "new-end" : "repeat";
            }
        }
    }

    return {
        plan: {
            kind: "edges",
            nodes,
            edges: [],
            source: "source",
            target: "target",
            columns: [...written],
            before,
            matchedIds: [...matching.matched] as NodeId[],
            ...(marked.length === 0 ? {} : { marked }),
        },
        matching,
        fates,
        onlyFrom: unmatched.size,
    };
}

/**
 * With `compare`: writes each node's region to the membership column, the graph's own nodes now
 * (the merged ones `"both"`, the rest `"only-onto"`, their values before kept for undo), and
 * returns the value a node the table alone holds takes.
 * @param graph - The graph.
 * @param choices - The join.
 * @param matching - Which nodes rows merge into.
 * @param into - What the merge collects, added to.
 * @param into.nodes - The merge's node records.
 * @param into.before - The values before.
 * @param into.written - The names written.
 * @param into.marked - The `"only-onto"` nodes, which take the column but are not supplied by the join.
 * @returns The membership value of a region, as a record to spread; empty without `compare`.
 */
function regionWriter(
    graph: JoinGraph,
    choices: JoinChoices,
    matching: Matching,
    into: {
        readonly nodes: Record<string, unknown>[];
        readonly before: Record<string, Record<string, unknown>>;
        readonly written: Set<string>;
        readonly marked: NodeId[];
    },
): (region: JoinRegion) => Record<string, unknown> {
    const { nodes, before, written, marked } = into;
    if (choices.compare !== true) {
        return () => ({});
    }

    const column = choices.membership ?? "membership";
    written.add(column);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    for (const node of graph.nodes) {
        const region: JoinRegion = matching.matched.has(node.id) ? "both" : "only-onto";
        const record = byId.get(node.id);
        if (record === undefined) {
            nodes.push({ id: node.id, [column]: region });
            marked.push(node.id);
        } else {
            record[column] = region;
        }

        before[String(node.id)] = { ...before[String(node.id)], [column]: node.data[column] ?? null };
    }

    return (region) => ({ [column]: region });
}

/** What linking by shared values does: its plan, each row's fate, and its counts. */
interface Link {
    readonly plan: Extract<JoinPlan, { kind: "edges" }>;
    readonly matched: number;
    readonly fates: JoinRowFate[];
    readonly counts: Pick<JoinReport, "pairsLinked" | "valuesOverCap" | "pairsBelowMin" | "newNodes" | "newEdges">;
}

/**
 * Plan a link: each row's node holds the row's values in the link columns; a value two to
 * `maxShared` nodes hold links them, as edges between each pair sharing at least `minShared`
 * values, or as one node per value with an edge from each holder.
 * ponytail: pairs per value are quadratic in its holders, bounded by maxShared.
 * @param table - The incoming table.
 * @param graph - The graph.
 * @param choices - The join.
 * @returns The link.
 */
function linkOf(table: JoinTable, graph: JoinGraph, choices: JoinChoices): Link {
    const link = choices.link ?? { columns: [] };
    const loose = looseOf(choices);
    const via = viaOf(graph, choices);
    const matching = matchValues(table, graph.nodes, choices, loose, via, graph.directed);
    const order = new Map(graph.nodes.map((node, at) => [node.id, at]));
    // Each value's holders, by column and compared value.
    const values = new Map<string, { column: string; given: unknown; ids: Set<NodeId | EdgeId> }>();
    const valueKeysOf: string[][] = table.rows.map(() => []);
    matching.rowIds.forEach((ids, at) => {
        for (const column of ids.length === 0 ? [] : link.columns) {
            const compared = norm(table.rows[at][column], loose);
            if (compared === undefined) {
                continue;
            }

            const key = `${column}${PART}${compared}`;
            const entry = values.get(key) ?? { column, given: table.rows[at][column], ids: new Set() };
            ids.forEach((id) => entry.ids.add(id));
            values.set(key, entry);
            valueKeysOf[at].push(key);
        }
    });

    const cap = link.maxShared ?? MAX_SHARED;
    const used = new Set(
        [...values].filter(([, each]) => each.ids.size > 1 && each.ids.size <= cap).map(([key]) => key),
    );
    const overCap = [...values.values()].filter((each) => each.ids.size > cap).length;
    const pairs = new Map<string, { a: NodeId | EdgeId; b: NodeId | EdgeId; count: number }>();
    for (const key of used) {
        const ids = [...(values.get(key)?.ids ?? [])].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
        ids.forEach((a, at) => {
            for (const b of ids.slice(at + 1)) {
                const pair = `${String(a)}${PART}${String(b)}`;
                const entry = pairs.get(pair) ?? { a, b, count: 0 };
                entry.count++;
                pairs.set(pair, entry);
            }
        });
    }

    const min = link.minShared ?? 1;
    const linked = [...pairs.values()].filter((pair) => pair.count >= min);
    const inPair = new Set(linked.flatMap((pair) => [pair.a, pair.b]));
    const asNodes = link.as === "nodes";
    const kind = link.kind === undefined ? {} : { kind: link.kind };
    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    if (asNodes) {
        for (const key of used) {
            const { column, given, ids } = values.get(key) ?? { column: "", given: "", ids: new Set() };
            const id = `${column}:${String(given)}`;
            nodes.push({ id, kind: link.kind ?? column, [column]: given });
            ids.forEach((holder) => edges.push({ source: holder, target: id, ...kind }));
        }
    } else {
        linked.forEach((pair) =>
            edges.push({ source: pair.a, target: pair.b, [named(choices, "shared")]: pair.count, ...kind }),
        );
    }

    const fates = matching.rowIds.map((ids, at): JoinRowFate => {
        const keys = valueKeysOf[at];
        if (keys.some((key) => used.has(key)) && (asNodes || ids.some((id) => inPair.has(id)))) {
            return "linked";
        }

        return keys.some((key) => (values.get(key)?.ids.size ?? 0) > cap) ? "over-cap" : "left-out";
    });
    return {
        plan: {
            kind: "edges",
            nodes,
            edges,
            source: "source",
            target: "target",
            columns: [...new Set(edges.flatMap((edge) => Object.keys(edge)))].filter(
                (name) => name !== "source" && name !== "target",
            ),
            before: {},
            matchedIds: [],
        },
        matched: matching.matched.size,
        fates,
        counts: {
            pairsLinked: linked.length,
            valuesOverCap: overCap,
            pairsBelowMin: pairs.size - linked.length,
            newNodes: nodes.length,
            newEdges: edges.length,
        },
    };
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
        for (const { name, value } of groupValues(rows, columnsOf(table, choices), choices, (column) => column)) {
            values[name] = value;
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
): { readonly plan: JoinPlan; readonly matched: number; readonly joinedRows: number } {
    const [source, target] = choices.keys.map((key) => key.file);
    const clashing = new Set(clashesOf(graph.edges, columns));
    const nameOf = (column: string): string =>
        clashing.has(column) && (choices.clash?.[column] ?? "both") === "both"
            ? bothColumn(column, table, choices)
            : column;
    // The rows of each pair, or of each row with "both"; a Map keeps the pair where it first
    // appeared. Without aggregate, one row is kept: the first, or the last with "last".
    const groups = new Map<string, EdgeRow[]>();
    const loaded = matchEdges(table, graph, choices, looseOf(choices)).rows.filter(
        (row) => choices.unknownEnds !== "leave-out" || bothFound(row),
    );
    for (const [at, row] of loaded.entries()) {
        const pair =
            choices.repeated === "both" && choices.aggregate === undefined
                ? String(at)
                : `${String(row.ends[0])}${PART}${String(row.ends[1])}`;
        groups.set(pair, [...(groups.get(pair) ?? []), row]);
    }

    const byPair = new Map<string, { edge: Record<string, unknown>; both: boolean }>();
    for (const [pair, group] of groups) {
        const rows = choices.aggregate !== undefined ? group : [choices.repeated === "last" ? group.at(-1) : group[0]];
        const kept = rows.filter((row) => row !== undefined);
        const values = groupValues(
            kept.map((row) => table.rows[row.at]),
            columns,
            choices,
            nameOf,
        );
        const edge: Record<string, unknown> = { [source]: group[0].ends[0], [target]: group[0].ends[1] };
        for (const { name, value } of values) {
            edge[name] = value;
        }

        byPair.set(pair, { edge, both: bothFound(group[0]) });
    }

    const edges = [...byPair.values()].map((each) => each.edge);
    const matched = [...byPair.values()].filter((each) => each.both).length;
    const joinedRows = new Set(loaded.map((row) => table.origin?.[row.at] ?? row.at)).size;
    // The ends the join makes, with the kind named for their side.
    const kinds = endKindsOf(choices);
    const made = new Map<string, Record<string, unknown>>();
    for (const row of loaded) {
        row.ends.forEach((end, side) => {
            const kind = kinds[side];
            if (!row.found[side] && kind !== undefined && !made.has(String(end))) {
                made.set(String(end), { id: end, kind });
            }
        });
    }

    const written = new Set(
        edges.flatMap((edge) => Object.keys(edge)).filter((key) => key !== source && key !== target),
    );
    return {
        matched,
        joinedRows,
        plan: {
            kind: "edges",
            nodes: [...made.values()],
            edges,
            source,
            target,
            columns: [...written],
            before: {},
            matchedIds: [],
        },
    };
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

/** How many distinct sample values a column reads out. */
const SAMPLES = 3;

/**
 * The first few distinct values a list holds, blanks skipped.
 * @param values - The values, in order.
 * @param limit - The most to read.
 * @returns The values.
 */
function samplesOf(values: Iterable<unknown>, limit: number): unknown[] {
    const seen = new Set<string>();
    const out: unknown[] = [];
    for (const value of values) {
        if (out.length >= limit) {
            break;
        }

        const text = absent(value) ? undefined : JSON.stringify(value);
        if (text !== undefined && !seen.has(text)) {
            seen.add(text);
            out.push(value);
        }
    }

    return out;
}

/**
 * The first few distinct values of a table's column.
 * @param table - The table.
 * @param column - The column.
 * @param limit - The most to read.
 * @returns The values.
 */
export function columnSamples(table: JoinTable, column: string, limit = SAMPLES): unknown[] {
    return samplesOf(
        (function* rows() {
            for (const row of table.rows) {
                yield row[column];
            }
        })(),
        limit,
    );
}

/**
 * How one column of a table meets each graph value of the elements: the rows whose value one
 * of them holds, as compared, the more rows found ignoring case and spaces, and a few of the
 * graph value's own values.
 * @param table - The table.
 * @param column - Its column.
 * @param elements - The nodes or edges.
 * @param loose - How the join compares.
 * @returns One entry per graph value, the id first.
 */
export function keyMatchesOf(
    table: JoinTable,
    column: string,
    elements: readonly JoinElement[],
    loose: Loose,
): { graph: string; rows: number; loose: number; samples: unknown[] }[] {
    const loosest = { ignoreCase: true, ignoreSpaces: true };
    return pathsOf(elements).map((path) => {
        const strict = indexOf(elements, [path], loose);
        const wide = indexOf(elements, [path], loosest);
        let rows = 0;
        let more = 0;
        for (const row of table.rows) {
            const exact = norm(row[column], loose);
            if (exact !== undefined && strict.has(exact)) {
                rows += 1;
            } else {
                const either = norm(row[column], loosest);
                more += either !== undefined && wide.has(either) ? 1 : 0;
            }
        }

        const values = (function* values() {
            for (const element of elements) {
                yield graphValue(element, path);
            }
        })();
        return { graph: path, rows, loose: more, samples: samplesOf(values, SAMPLES) };
    });
}
