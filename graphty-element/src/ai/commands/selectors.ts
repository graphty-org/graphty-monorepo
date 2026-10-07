/**
 * The one selector language every AI command takes.
 *
 * A selector a model writes is an expression in the element's own selector language -- the one a
 * style layer, a filter and a `{ where }` scope read -- with a record's own fields under `data.`:
 * `data.type == 'server'`. findNodes and zoomToNodes used to read bare fields (`type ==
 * 'server'`) while the style commands read `data.type`, so a model that carried a selector from
 * one tool to the next matched nothing, and was told "no nodes matched", the same words a correct
 * answer of zero uses.
 * @module ai/commands/selectors
 */

import type { Graph } from "../../Graph";

/** The sentence every selector parameter carries, so each tool describes the language the same way. */
export const SELECTOR_SYNTAX =
    "A node's or edge's own fields are under 'data.', so write data.type == 'server' or data.weight > `0.5` (numbers in backticks). An empty string matches everything.";

/**
 * Common selector spellings that mean "every element".
 *
 * A model reaches for one of these when it wants the whole graph, and the element's own spelling
 * for that is `{match: "everything"}` -- never an empty expression, which is refused.
 */
const MATCH_ALL_SELECTORS = new Set(["", "*", "all", "*.*", "true"]);

/**
 * Whether a selector means "every element".
 * @param selector - The selector string as it arrived.
 * @returns True when it matches everything.
 */
export function isMatchAllSelector(selector: string | undefined): boolean {
    return !selector || MATCH_ALL_SELECTORS.has(selector.toLowerCase().trim());
}

/**
 * The expression the element's parser reads. Its string literals take single quotes, and a model
 * that was trained on JSON sends double ones.
 * @param selector - The selector as it arrived.
 * @returns The selector with double quotes made single.
 */
export function normalizeSelector(selector: string): string {
    return selector.replaceAll('"', "'");
}

/**
 * The ids of the nodes a selector matches, read through the session's own `{ where }` scope.
 * @param graph - The graph.
 * @param selector - The selector, empty or a match-all word for every node.
 * @returns The matching node ids, as strings.
 * @throws The session's `GraphtyError` (`E_BAD_SELECTOR`) for an expression that does not parse.
 */
export async function matchingNodeIds(graph: Graph, selector: string | undefined): Promise<string[]> {
    if (selector === undefined || isMatchAllSelector(selector)) {
        return Array.from(graph.getDataManager().nodes.keys(), String);
    }

    const scope = await graph.getSession().scope.resolve({ where: normalizeSelector(selector) });

    return Array.from(scope.nodes, String);
}

/**
 * What to tell the model when a selector matched no node: that fields live under `data.`, which
 * is the usual reason, rather than only that nothing matched.
 * @param selector - The selector that matched nothing.
 * @returns The sentence.
 */
export function noMatchMessage(selector: string): string {
    return `No nodes matched the selector "${selector}". ${SELECTOR_SYNTAX}`;
}
