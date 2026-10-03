/**
 * @file The session's one query engine: `{ where }` predicates and text search.
 *
 * A scope, a selection, a visibility filter and an edge filter all accept an expression, and a
 * selection also accepts typed text. Every one of them reaches THIS object, and this object
 * evaluates an expression with the compiler the style layers use (`./styles/predicate`) over the
 * selector source the style layers read (`./styles/sources`). That is the point of it: a layer
 * selector and a scope with the same text match the same elements, because they are the same
 * code reading the same values. A second evaluator would drift from the first in exactly the
 * places nobody tests -- JMESPath truthiness, a column default, an edge's endpoints.
 *
 * A path nothing answers matches nothing and is REPORTED through `unresolvedPathsOf`, never
 * swallowed: "0 matched" and "you misspelled the attribute" must not look the same.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { EdgeId, NodeId, Path, Query } from "../catalog/types";
import { GraphtyError } from "../errors";
import { RevisionCache } from "./revision";
import type { SelectionMatch, SelectionSearchHit, SelectionTextMode } from "./selection";
import { searchOf, type SelectionTarget } from "./selection/targets";
import { columnsFor, compileExpressionPredicate, type SelectorSource, type SelectorTarget } from "./styles/predicate";
import { matchText, normalizeText } from "./text";
import type { FindEnd, FindHit, FindKind, FindResult, FindValueRow } from "./types";

/** Everything the engine reads. */
interface QueryEngineParts {
    /**
     * The snapshot the dense indices address, read on every query.
     * @returns The snapshot as it stands now.
     */
    readonly snapshot: () => GraphSnapshot;
    /**
     * The input revision: the find index is rebuilt when it moves.
     * @returns Any value; a change means the data changed.
     */
    readonly revision: () => unknown;
    /** Where values are read: the same source the style layers read. */
    readonly elements: Required<Pick<SelectorSource, "edgeIdOf" | "nodeIdOf">> & SelectorSource;
    /**
     * Whether this session answers a path for one kind of element. Absent, no path is reported.
     * @param path - The path as the query spelled it.
     * @param target - Which kind of element.
     * @returns True when something in the session answers it.
     */
    readonly answers?: (path: Path, target: SelectorTarget) => boolean;
    /**
     * The node attribute paths a text search reads, beside the id.
     * @returns The paths, such as `data.label`.
     */
    readonly searchPaths: () => readonly Path[];
    /**
     * The edge attribute paths a find reads. Absent, a find lists no edges.
     * @returns The paths, such as `data.kind`.
     */
    readonly edgeSearchPaths?: () => readonly Path[];
    /**
     * The path that names a node, such as `data.name`, or null when only the id names one.
     * @returns The path.
     */
    readonly labelPath?: () => Path | null;
    /**
     * The node attribute path that carries the id itself, such as `data.id`: a find reads the id
     * once, as `"id"`, and lists no value row for it.
     * @returns The path, or null.
     */
    readonly idPath?: () => Path | null;
    /**
     * Whether the visibility filter or the time window leaves an element out. Absent, none is.
     * @param target - Which kind of element.
     * @param index - Its dense index.
     * @returns True when it is left out.
     */
    readonly excluded?: (target: SelectorTarget, index: number) => boolean;
}

/** The session's query engine. */
export interface QueryEngine {
    /**
     * The nodes an expression matches.
     * @param where - The expression.
     * @returns The node ids, in index order.
     */
    nodes(where: Query): NodeId[];
    /**
     * The edges an expression matches.
     * @param where - The expression.
     * @returns The edge ids, in index order.
     */
    edges(where: Query): EdgeId[];
    /**
     * Both halves an expression matches, and the paths it names that nothing answers.
     * @param where - The expression.
     * @returns The match.
     */
    select(where: Query): SelectionMatch;
    /**
     * The paths an expression names that no node and no edge in this session answers.
     * @param where - The expression.
     * @returns The unresolved paths.
     */
    unresolvedPathsOf(where: Query): readonly Path[];
    /**
     * Every path an expression reads, as its node compile sees them: what a cached answer over it
     * is keyed on.
     * @param where - The expression.
     * @returns The paths.
     */
    pathsOf(where: Query): readonly Path[];
    /**
     * The nodes a text search finds.
     * @param text - What was typed.
     * @param mode - How to match it.
     * @returns The hits, in index order.
     */
    find(text: string, mode: SelectionTextMode): SelectionSearchHit[];
    /**
     * What a find box lists: nodes and edges whose id or values contain the text, ranked, and the
     * matched values with their counts. Reads only; selects nothing.
     * @param text - What was typed.
     * @param request - The limit and the kinds.
     * @returns The hits, the value rows and the total.
     */
    search(text: string, request: SearchRequest): SearchAnswer;
}

/**
 * Build the query engine over a session's selector source.
 * @param parts - The snapshot, the value source, the path directory and the searchable paths.
 * @returns The engine.
 */
export function createQueryEngine(parts: QueryEngineParts): QueryEngine {
    const { elements } = parts;
    const findIndex = new RevisionCache<FindIndex>(parts.revision);

    const compile = (where: Query, target: SelectorTarget): ReturnType<typeof compileExpressionPredicate> =>
        compileExpressionPredicate(where, columnsFor(elements, target));

    const matching = (test: (index: number) => boolean, target: SelectorTarget): number[] => {
        const graph = parts.snapshot();
        const count = target === "node" ? graph.nodeCount : graph.edgeCount;
        const hits: number[] = [];

        for (let index = 0; index < count; index++) {
            if (test(index)) {
                hits.push(index);
            }
        }

        return hits;
    };

    const nodesOf = (test: (index: number) => boolean): NodeId[] =>
        matching(test, "node").map((index) => elements.nodeIdOf(index));
    const edgesOf = (test: (index: number) => boolean): EdgeId[] =>
        matching(test, "edge").map((index) => elements.edgeIdOf(index));

    const unresolvedOf = (paths: readonly Path[]): readonly Path[] => {
        const { answers } = parts;

        if (answers === undefined) {
            return [];
        }

        return Object.freeze([...new Set(paths)].filter((path) => !answers(path, "node") && !answers(path, "edge")));
    };

    const find = (text: string, mode: SelectionTextMode): SelectionSearchHit[] => {
        const graph = parts.snapshot();
        const searched = parts.searchPaths();
        let accepts: (value: string) => boolean;
        let paths: readonly Path[] = searched;
        let readsId = true;

        const attribute = mode === "attribute" ? attributeOf(text, searched) : null;

        if (attribute !== null) {
            const wanted = attribute.value.toLowerCase();
            accepts = (candidate) => candidate.toLowerCase() === wanted;
            readsId = attribute.path === "id";
            paths = readsId ? [] : [attribute.path];
        } else if (mode === "exact") {
            accepts = (candidate) => candidate === text;
        } else if (mode === "regex") {
            const pattern = compilePattern(text);
            accepts = (candidate) => pattern.test(candidate);
        } else {
            // Substring, and an attribute search whose prefix names no attribute: that text is
            // just text, so a pasted URL still finds the node that carries it.
            const wanted = text.toLowerCase();
            accepts = (candidate) => candidate.toLowerCase().includes(wanted);
        }

        const hits: SelectionSearchHit[] = [];

        for (let index = 0; index < graph.nodeCount; index++) {
            const id = elements.nodeIdOf(index);
            let found = readsId && accepts(String(id));

            for (let at = 0; !found && at < paths.length; at++) {
                const value = elements.nodeValue(index, paths[at]);
                found = (typeof value === "string" || typeof value === "number") && accepts(String(value));
            }

            if (found) {
                hits.push({ id, kind: "node" });
            }
        }

        return hits;
    };

    return {
        nodes: (where) => nodesOf(compile(where, "node").test),
        edges: (where) => edgesOf(compile(where, "edge").test),
        // One compile per target: the node compile's paths are the expression's paths.
        select: (where) => {
            const node = compile(where, "node");

            return {
                nodes: nodesOf(node.test),
                edges: edgesOf(compile(where, "edge").test),
                unresolvedPaths: unresolvedOf(node.paths),
            };
        },
        unresolvedPathsOf: (where) => unresolvedOf(compile(where, "node").paths),
        pathsOf: (where) => compile(where, "node").paths,
        find,
        search: (text, request) =>
            search(
                parts,
                findIndex.get(`${parts.labelPath?.() ?? ""}\0${parts.idPath?.() ?? ""}`, () => buildIndex(parts)),
                text,
                request,
            ),
    };
}

/** One distinct value of one column, with the elements that carry it. */
interface IndexedValue {
    /** The value as the column holds it. */
    readonly value: string | number | boolean;
    /** The value as the matcher compares it. */
    readonly norm: string;
    /** Whether only a whole match counts: true for numbers and booleans. */
    readonly wholeOnly: boolean;
    /** The dense indices of the elements carrying it, in graph order. */
    readonly members: number[];
    /** The selection target naming every member, built on first use. */
    target?: SelectionTarget;
}

/** One searched column of one kind. */
interface IndexedColumn {
    /** `"id"`, or the attribute's literal column key. */
    readonly path: Path;
    /** Whether this column names the element (its id or its label): it ranks above the rest. */
    readonly names: boolean;
    /** Its distinct values. */
    readonly values: IndexedValue[];
}

/** One kind's half of the find index. */
interface IndexedKind {
    /** The searched columns, the id first, then `attributes()` order. */
    readonly columns: readonly IndexedColumn[];
    /** Each element's id, by dense index. */
    readonly ids: readonly (NodeId | EdgeId)[];
}

/** The find index: built once per revision, then read by every call. */
interface FindIndex {
    readonly node: IndexedKind;
    readonly edge: IndexedKind;
    /** Each node's name, by dense index. */
    readonly names: readonly string[];
    /** Each edge's ends, as node indices. */
    readonly ends: readonly (readonly [number, number])[];
}

/** What {@link QueryEngine.search} reads beside the text, already checked. */
export interface SearchRequest {
    /** The first hit to return. */
    readonly offset: number;
    /** The most hits to return. */
    readonly limit: number;
    /** What to list. */
    readonly kinds: ReadonlySet<FindKind>;
    /** The elements in scope, or null for the whole graph. */
    readonly scope: { readonly nodes: ReadonlySet<NodeId>; readonly edges: ReadonlySet<EdgeId> } | null;
}

/** What {@link QueryEngine.search} answers; the caller adds the window and the revision. */
export type SearchAnswer = Pick<FindResult, "records" | "total" | "values" | "notSearchable">;

/** Where a match fell, in rank order within a tier. */
const MATCH_ORDER = ["whole", "word-start", "anywhere"] as const;

/** No match yet, in a rank array. */
const NO_RANK = 255;

/** How many value rows a find lists. */
const VALUE_ROWS = 3;

/**
 * Build the find index: one walk of each kind's searched columns.
 * @param parts - What the engine reads.
 * @returns The index.
 */
function buildIndex(parts: QueryEngineParts): FindIndex {
    const graph = parts.snapshot();
    const { elements } = parts;
    const labelPath = parts.labelPath?.() ?? null;
    const idPath = parts.idPath?.() ?? null;

    const column = (path: Path, names: boolean, count: number, read: (index: number) => unknown): IndexedColumn => {
        const byValue = new Map<string | number | boolean, IndexedValue>();
        for (let index = 0; index < count; index++) {
            const value = read(index);
            if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
                continue;
            }

            let entry = byValue.get(value);
            if (entry === undefined) {
                // An id is text the reader types, whatever its type; a number or boolean value is not.
                const wholeOnly = path !== "id" && typeof value !== "string";
                entry = { value, norm: normalizeText(String(value)), wholeOnly, members: [] };
                byValue.set(value, entry);
            }

            entry.members.push(index);
        }

        return { path, names, values: [...byValue.values()] };
    };

    const nodeIds = Array.from({ length: graph.nodeCount }, (_, index) => elements.nodeIdOf(index));
    const nodeColumns = [
        column("id", true, graph.nodeCount, (index) => nodeIds[index]),
        ...parts
            .searchPaths()
            .filter((path) => path !== idPath)
            .map((path) =>
                column(path, path === labelPath, graph.nodeCount, (index) => elements.nodeValue(index, path)),
            ),
    ];
    const names = nodeIds.map((id, index) => {
        const label = labelPath === null ? undefined : elements.nodeValue(index, labelPath);
        return typeof label === "string" || typeof label === "number" ? String(label) : String(id);
    });
    const edgeIds = Array.from({ length: graph.edgeCount }, (_, index) => elements.edgeIdOf(index));
    // An edge's id is a counter the element assigned, which no reader typed: it is not searched.
    const edgeColumns = (parts.edgeSearchPaths?.() ?? []).map((path) =>
        column(path, false, graph.edgeCount, (index) => elements.edgeValue(index, path)),
    );
    const ends = edgeIds.map((_, index) => [graph.edgeSource(index), graph.edgeTarget(index)] as const);

    return { node: { columns: nodeColumns, ids: nodeIds }, edge: { columns: edgeColumns, ids: edgeIds }, names, ends };
}

/**
 * The find box's search over the index.
 * @param parts - What the engine reads.
 * @param index - The index for this revision.
 * @param text - What was typed.
 * @param request - The window, the kinds and the scope.
 * @returns The hits, the value rows and the total.
 */
function search(parts: QueryEngineParts, index: FindIndex, text: string, request: SearchRequest): SearchAnswer {
    const nothing = { records: [], total: 0, values: [] };
    const typed = text.trim();
    if (typed.startsWith("=")) {
        return { ...nothing, notSearchable: "expression" };
    }

    const parsed = searchOf(typed);
    if (parsed.mode === "regex") {
        return { ...nothing, notSearchable: "regex" };
    }

    // `<attribute>:` names one column per kind; a prefix neither kind holds is plain text.
    const only = new Map<FindKind, Path | null>();
    let query = parsed.text;
    if (parsed.mode === "attribute") {
        const node = attributeOf(typed, ["id", ...index.node.columns.map((c) => c.path)]);
        const edge = attributeOf(
            typed,
            index.edge.columns.map((c) => c.path),
        );
        if (node !== null || edge !== null) {
            only.set("node", node?.path ?? null);
            only.set("edge", edge?.path ?? null);
            query = (node ?? edge)?.value ?? "";
        }
    }

    const wanted = normalizeText(query);
    if (wanted === "") {
        return nothing;
    }

    const rows: { kind: FindKind; column: IndexedColumn; entry: IndexedValue; members: number[] }[] = [];
    // Each element's best rank so far (NO_RANK for none) and the value it came from, per kind.
    const best = {
        node: {
            rank: new Uint8Array(index.node.ids.length).fill(NO_RANK),
            from: [] as [IndexedColumn, IndexedValue][],
        },
        edge: {
            rank: new Uint8Array(index.edge.ids.length).fill(NO_RANK),
            from: [] as [IndexedColumn, IndexedValue][],
        },
    };

    for (const kind of ["node", "edge"] as const) {
        if (!request.kinds.has(kind)) {
            continue;
        }

        const { columns, ids } = index[kind];
        const { rank: ranks, from } = best[kind];
        const inScope = request.scope?.[kind === "node" ? "nodes" : "edges"] as
            | ReadonlySet<NodeId | EdgeId>
            | undefined;
        for (const column of columns) {
            if (only.has(kind) && only.get(kind) !== column.path) {
                continue;
            }

            for (const entry of column.values) {
                const where = matchText(wanted, entry.norm);
                if (where === null || ((entry.wholeOnly || parsed.mode === "exact") && where !== "whole")) {
                    continue;
                }

                const rank = (column.names ? 0 : MATCH_ORDER.length) + MATCH_ORDER.indexOf(where);
                const members =
                    inScope === undefined ? entry.members : entry.members.filter((at) => inScope.has(ids[at]));
                for (const at of members) {
                    if (rank < ranks[at]) {
                        ranks[at] = rank;
                        from[at] = [column, entry];
                    }
                }

                if (!column.names && members.length > 0) {
                    rows.push({ kind, column, entry, members });
                }
            }
        }
    }

    // One sort key per hit: rank first, then graph order, nodes before edges.
    const nodeCount = index.node.ids.length;
    const span = nodeCount + index.edge.ids.length;
    const keys: number[] = [];
    for (const [kind, offset] of [
        ["node", 0],
        ["edge", nodeCount],
    ] as const) {
        const ranks = best[kind].rank;
        for (let at = 0; at < ranks.length; at++) {
            if (ranks[at] !== NO_RANK) {
                keys.push(ranks[at] * span + offset + at);
            }
        }
    }

    const sorted = Float64Array.from(keys).sort();
    rows.sort((a, b) => b.members.length - a.members.length);

    const records = Array.from(sorted.subarray(request.offset, request.offset + request.limit), (key): FindHit => {
        const order = key % span;
        const kind = order < nodeCount ? "node" : "edge";
        const at = kind === "node" ? order : order - nodeCount;
        const [column, entry] = best[kind].from[at];
        const id = index[kind].ids[at];
        const base = {
            match: { path: column.path, value: entry.value },
            ...(parts.excluded?.(kind, at) === true ? { excludedBy: { kind: "filter" as const } } : {}),
        };
        if (kind === "node") {
            return { kind: "node", id, name: index.names[at], ...base, target: { nodes: [id] } };
        }

        const [source, target] = index.ends[at];
        const end = (node: number): FindEnd => ({ id: index.node.ids[node], name: index.names[node] });
        return {
            kind: "edge",
            id: String(id),
            ends: { source: end(source), target: end(target) },
            ...base,
            target: { edges: [String(id)] },
        };
    });

    const values = rows.slice(0, VALUE_ROWS).map(({ kind, column, entry, members }): FindValueRow => {
        // ponytail: a value many elements carry makes a long id list; a where-target limited to
        // one kind replaces it when the target grammar can say "nodes only".
        const named = (): SelectionTarget => {
            const ids = members.map((at) => index[kind].ids[at]);
            return kind === "node" ? { nodes: ids } : { edges: ids.map(String) };
        };
        const target = members === entry.members ? (entry.target ??= named()) : named();
        return { kind, path: column.path, value: entry.value, count: members.length, target };
    });

    return { records, total: sorted.length, values };
}

/**
 * Split `key:value` into the path it names and the value wanted.
 * @param text - What was typed.
 * @param searched - The node attribute paths this session holds.
 * @returns The path and the value, or null when the prefix names no attribute and no id.
 */
function attributeOf(text: string, searched: readonly Path[]): { path: Path; value: string } | null {
    const colon = text.indexOf(":");

    if (colon <= 0) {
        return null;
    }

    const key = text.slice(0, colon);
    const value = text.slice(colon + 1);

    if (key === "id") {
        return { path: "id", value };
    }

    const path = key.startsWith("data.") ? key : `data.${key}`;

    return searched.includes(path) ? { path, value } : null;
}

/**
 * Compile a typed regular expression, refusing one that does not parse.
 * @param text - The pattern.
 * @returns The expression.
 * @throws A `GraphtyError` coded `E_BAD_COMMAND` naming the parse error.
 */
function compilePattern(text: string): RegExp {
    try {
        return new RegExp(text);
    } catch (error) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `"${text}" is not a regular expression: ${error instanceof Error ? error.message : String(error)}`,
            source: "run",
            details: { text, mode: "regex" },
            cause: error,
        });
    }
}
