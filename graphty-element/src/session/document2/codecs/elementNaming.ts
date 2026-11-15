/**
 * @file Which style layers name elements (spec 4.2 rule 5): owned by the style codec, which
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

    return sourceNames(layer.source, session);
}
