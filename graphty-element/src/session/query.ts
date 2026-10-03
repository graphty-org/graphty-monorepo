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
import type { SelectionMatch, SelectionSearchHit, SelectionTextMode } from "./selection";
import {
    columnsFor,
    compileExpressionPredicate,
    quotePath,
    type SelectorSource,
    type SelectorTarget,
} from "./styles/predicate";
import type { FindHit, FindKind, FindResult, FindValue } from "./types";

/** Everything the engine reads. */
interface QueryEngineParts {
    /**
     * The snapshot the dense indices address, read on every query.
     * @returns The snapshot as it stands now.
     */
    readonly snapshot: () => GraphSnapshot;
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
     * The edge attribute paths a find reads, beside the id. Absent, edges are found by id only.
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

/** What {@link QueryEngine.search} reads beside the text, already checked. */
export interface SearchRequest {
    /** The most hits, and the most value rows. */
    readonly limit: number;
    /** What to list. */
    readonly kinds: ReadonlySet<FindKind>;
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
    search(text: string, request: SearchRequest): FindResult;
}

/**
 * Build the query engine over a session's selector source.
 * @param parts - The snapshot, the value source, the path directory and the searchable paths.
 * @returns The engine.
 */
export function createQueryEngine(parts: QueryEngineParts): QueryEngine {
    const { elements } = parts;

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
        search: (text, request) => search(parts, text, request),
    };
}

/** How well a hit matched: lower ranks first. */
const enum Rank {
    ExactName = 0,
    NameStart = 1,
    Name = 2,
    ExactValue = 3,
    Value = 4,
}

/**
 * How well one value matched.
 * @param isName - Whether the value is the element's id or label.
 * @param exact - Whether it is the text, ignoring case.
 * @param start - Whether it starts with the text.
 * @returns The rank.
 */
function rankOf(isName: boolean, exact: boolean, start: boolean): Rank {
    if (!isName) {
        return exact ? Rank.ExactValue : Rank.Value;
    }

    if (exact) {
        return Rank.ExactName;
    }

    return start ? Rank.NameStart : Rank.Name;
}

/**
 * The find box's search: one pass over each kind, ranking every element by its best match.
 * @param parts - What the engine reads.
 * @param text - What was typed.
 * @param request - The limit and the kinds.
 * @returns The hits, the value rows and the total.
 */
function search(parts: QueryEngineParts, text: string, request: SearchRequest): FindResult {
    const wanted = text.trim().toLowerCase();
    if (wanted === "") {
        return { elements: [], values: [], total: 0 };
    }

    const graph = parts.snapshot();
    const { elements } = parts;
    const labelPath = parts.labelPath?.() ?? null;
    const nameOf = (index: number): string => {
        const label = labelPath === null ? undefined : elements.nodeValue(index, labelPath);
        return typeof label === "string" || typeof label === "number"
            ? String(label)
            : String(elements.nodeIdOf(index));
    };
    const hits: (FindHit & { rank: Rank; order: number })[] = [];
    // Every matched value, keyed by kind, path and value, counted in the same pass.
    // Every element carrying a matched value contains the text, so the scan visits all of them.
    const values = new Map<string, Omit<FindValue, "count"> & { count: number; exact: boolean }>();
    const listValues = request.kinds.has("value");
    const arrow = graph.directed ? " -> " : " -- ";

    const scan = (target: SelectorTarget, count: number, paths: readonly Path[], namePath: Path | null): void => {
        const listElements = request.kinds.has(target);
        if (!listElements && !listValues) {
            return;
        }

        const read = target === "node" ? elements.nodeValue : elements.edgeValue;
        const idOf = target === "node" ? elements.nodeIdOf : elements.edgeIdOf;
        for (let index = 0; index < count; index++) {
            // The best match so far; a null rank means none yet.
            const best: { rank: Rank | null; path: Path; value: string | number } = { rank: null, path: "", value: "" };
            const consider = (path: Path, value: string | number, isName: boolean): void => {
                const candidate = String(value).toLowerCase();
                const at = candidate.indexOf(wanted);
                if (at < 0) {
                    return;
                }

                const rank = rankOf(isName, candidate.length === wanted.length, at === 0);
                if (best.rank === null || rank < best.rank) {
                    best.rank = rank;
                    best.path = path;
                    best.value = value;
                }
            };

            const id = idOf(index);
            // An edge's id is a counter the element assigned, which no reader typed; a node's is theirs.
            if (target === "node") {
                consider("id", id, true);
            }
            for (const path of paths) {
                const value = read(index, path);
                if (typeof value !== "string" && typeof value !== "number") {
                    continue;
                }

                const isName = path === namePath;
                consider(path, value, isName);
                if (listValues && !isName && String(value).toLowerCase().includes(wanted)) {
                    const key = JSON.stringify([target, path, value]);
                    const row = values.get(key);
                    if (row !== undefined) {
                        row.count++;
                    } else {
                        values.set(key, {
                            kind: target,
                            path,
                            value,
                            count: 1,
                            where: `${quotePath(path)} == \`${JSON.stringify(value).replace(/`/g, "\\`")}\``,
                            exact: String(value).toLowerCase() === wanted,
                        });
                    }
                }
            }

            if (best.rank === null || !listElements) {
                continue;
            }

            const identity =
                target === "node"
                    ? { kind: "node" as const, id, label: nameOf(index) }
                    : {
                          kind: "edge" as const,
                          id: elements.edgeIdOf(index),
                          label: nameOf(graph.edgeSource(index)) + arrow + nameOf(graph.edgeTarget(index)),
                      };
            hits.push({
                ...identity,
                matched: { path: best.path, value: best.value },
                ...(parts.excluded?.(target, index) === true ? { excludedBy: "filter" as const } : {}),
                rank: best.rank,
                order: hits.length,
            });
        }
    };

    const idPath = parts.idPath?.() ?? null;
    scan(
        "node",
        graph.nodeCount,
        parts.searchPaths().filter((path) => path !== idPath),
        labelPath,
    );
    scan("edge", graph.edgeCount, parts.edgeSearchPaths?.() ?? [], null);

    hits.sort((a, b) => a.rank - b.rank || a.order - b.order);
    const rows = [...values.values()].sort((a, b) => Number(b.exact) - Number(a.exact));

    return {
        elements: hits.slice(0, request.limit).map(({ rank: _rank, order: _order, ...hit }) => hit),
        values: rows.slice(0, request.limit).map(({ exact: _exact, ...row }) => row),
        total: hits.length,
    };
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
