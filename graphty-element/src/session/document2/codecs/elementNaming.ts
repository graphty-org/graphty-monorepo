/**
 * @file Which style layers name elements or a dataset (spec 4.2 rule 5, spec 5 rule 5): owned by the style codec, which
 * leaves them out of a style section, and read by the view codec, which writes them in its
 * `layers`. Experimental (`save-files-v2`).
 */

import type { SetDefinition } from "../../../catalog/types";
import type { GraphSession } from "../../types";

/** A plain object, as a layer read from the session or a file holds one. */
type Loose = Readonly<Record<string, unknown>>;

/**
 * Whether a value is a plain object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isLoose(value: unknown): value is Loose {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a set definition names elements: a fixed or path set, or a rule set whose rule does.
 * @param definition - The definition.
 * @param session - The session, to resolve the sets a rule names.
 * @param seen - The sets already walked, so a set naming itself ends.
 * @returns True when it names elements.
 */
function definitionNames(definition: SetDefinition | undefined, session: GraphSession, seen: Set<string>): boolean {
    if (definition === undefined) {
        return false;
    }

    return definition.kind === "rule" ? ruleNames(definition.where, session, seen) : true;
}

/**
 * Whether a scope names elements: listed nodes, an inline fixed or path set, or a kept set that
 * does.
 * @param scope - The scope.
 * @param session - The session.
 * @param seen - The sets already walked.
 * @returns True when it names elements.
 */
function scopeNames(scope: unknown, session: GraphSession, seen: Set<string>): boolean {
    if (!isLoose(scope)) {
        return false;
    }

    if ("nodes" in scope) {
        return true;
    }

    if ("define" in scope) {
        return definitionNames(scope.define as SetDefinition, session, seen);
    }

    if (typeof scope.set === "string" && !seen.has(scope.set)) {
        seen.add(scope.set);
        return definitionNames(session.sets.get(scope.set)?.definition, session, seen);
    }

    return false;
}

/**
 * Whether a rule tree has a leaf naming an element: a neighborhood's seeds, a run item, listed ids,
 * or a member of a scope that names elements.
 * @param rule - The rule tree, or a query string (which names none).
 * @param session - The session.
 * @param seen - The sets already walked.
 * @returns True when it names elements.
 */
function ruleNames(rule: unknown, session: GraphSession, seen: Set<string>): boolean {
    if (!isLoose(rule)) {
        return false;
    }

    switch (rule.kind) {
        case "neighborhood":
        case "item":
        case "ids":
            return true;
        case "member":
            return scopeNames(rule.of, session, seen);
        case "all":
        case "any":
            return Array.isArray(rule.of) && rule.of.some((each) => ruleNames(each, session, seen));
        case "not":
            return ruleNames(rule.of, session, seen);
        default:
            return false;
    }
}

/**
 * Whether a run source's `params` give a value to an option that names a node.
 * @param source - The layer's source.
 * @param session - The session, for the algorithm's options.
 * @returns True when one does.
 */
function sourceNames(source: unknown, session: GraphSession): boolean {
    if (!isLoose(source) || source.by !== "run" || !isLoose(source.params)) {
        return false;
    }

    const { params } = source;
    const algorithm = session.catalog.algorithms().find((each) => each.key === source.algorithm);
    return (algorithm?.options ?? []).some(
        (option) =>
            (option.type === "node-id" || option.type === "node-set") &&
            params[option.name] !== undefined &&
            params[option.name] !== null,
    );
}

/** A run named in a path or an expression: `results.<run id>`. */
const RESULT_PATH = /(?<![\w."])results\.([A-Za-z_][\w:-]*)/g;

/** A run id made by a recipe step: `<namespace>__<as>` (spec 3.3). */
const RECIPE_RUN = /^([a-z][a-z0-9_]{0,31}?)__([a-z][a-z0-9_]*)$/;

/**
 * Every run id a layer reads: through a `results.` path, or its run source.
 * @param layer - The layer.
 * @returns The run ids.
 */
function runsReadBy(layer: Loose): Set<string> {
    const runs = new Set<string>();
    const walk = (value: unknown): void => {
        if (typeof value === "string") {
            for (const match of value.matchAll(RESULT_PATH)) {
                runs.add(match[1]);
            }
        } else if (Array.isArray(value) || isLoose(value)) {
            Object.values(value).forEach(walk);
        }
    };
    walk([layer.selector, layer.encode]);
    if (isLoose(layer.source) && layer.source.by === "run" && typeof layer.source.runId === "string") {
        runs.add(layer.source.runId);
    }

    return runs;
}

/**
 * Whether a layer reads an open run a style section cannot name by `as` (spec 5 rule 5): one no
 * recipe step made (its id is not `<namespace>__<as>`), or one whose `as` another open run shares.
 * A name no open run has is already a run name, as a style section holds it.
 * @param layer - The layer.
 * @param session - The session, for its runs.
 * @returns True when the layer belongs in the view section.
 */
function readsUnnamedRun(layer: Loose, session: GraphSession): boolean {
    const read = runsReadBy(layer);
    if (read.size === 0) {
        return false;
    }

    const open = session.runs.list().map((run) => run.id);
    const asOf = (id: string): string | undefined => RECIPE_RUN.exec(id)?.[2];
    return [...read].some((id) => {
        if (!open.includes(id)) {
            return false;
        }

        const as = asOf(id);
        return as === undefined || open.filter((each) => asOf(each) === as).length > 1;
    });
}

/**
 * Whether a layer names elements: an `ids` selector, a `member` of a picked or path set, a rule
 * leaf naming an element, or a run source whose `params` name a node.
 * @param layer - The layer, as `session.styles` holds it.
 * @param session - The session, to resolve the sets a layer names.
 * @returns True when the layer belongs in the view section.
 */
export function layerNamesElements(layer: unknown, session: GraphSession): boolean {
    if (!isLoose(layer)) {
        return false;
    }

    const { selector } = layer;
    if (isLoose(selector)) {
        const seen = new Set<string>();
        if (
            selector.match === "ids" ||
            (selector.match === "member" && scopeNames(selector.of, session, seen)) ||
            (selector.match === "rule" && ruleNames(selector.where, session, seen))
        ) {
            return true;
        }
    }

    return sourceNames(layer.source, session) || readsUnnamedRun(layer, session);
}
