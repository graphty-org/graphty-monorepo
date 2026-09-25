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
import { columnsFor, compileExpressionPredicate, type SelectorSource, type SelectorTarget } from "./styles/predicate";

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
     * The nodes a text search finds.
     * @param text - What was typed.
     * @param mode - How to match it.
     * @returns The hits, in index order.
     */
    find(text: string, mode: SelectionTextMode): SelectionSearchHit[];
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
        find,
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
