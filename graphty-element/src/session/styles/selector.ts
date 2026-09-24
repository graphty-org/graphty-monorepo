/**
 * @file What a style layer paints: the four selector kinds, and the one call that turns one into
 * the closure a repaint runs.
 *
 * FOUR KINDS, AND THE SPLIT IS THE POINT. Only `{match:"expression"}` reaches an evaluator.
 * `{match:"has"}` is a column presence test, `{match:"ids"}` is a set membership test, and
 * `{match:"everything"}` is no test at all. Measured on this machine, the presence test costs
 * 7.3 ns per element against 1,322 ns for a `jmespath.search()` call, so the kind a layer is
 * written in is a performance decision and not only an ergonomic one. That is why `encode()`
 * generates `{match:"has", path}` rather than an expression: the consumer never writes the
 * selector and therefore cannot get it wrong, and the cheap road is the default road.
 *
 * "EVERYTHING" IS SPELLED OUT, AND THE EMPTY STRING IS REFUSED. Today a layer whose selector is
 * `""` matches every node and every edge, which is how an algorithm's suggested style paints the
 * whole graph and erases every layer beneath it. The empty string looks scoped, behaves
 * universally and says nothing about the difference. `{match:"everything"}` says it in a form
 * that greps, lints and reviews, and an empty selector is `E_SELECTOR_EMPTY` rather than a
 * silent universal match.
 *
 * COMPILED ONCE, AT ADD AND UPDATE. {@link compileSelector} is the only door, it parses and
 * validates everything it can before it returns, and what comes back is a closure held on the
 * layer. Nothing is parsed again per element, so a bad expression is refused in front of
 * whoever typed it rather than failing quietly on every element afterwards.
 *
 * WHAT THIS FILE CANNOT CHECK. A selector naming a run or an attribute that does not exist
 * parses perfectly and matches NOTHING, and an empty result reads exactly like a correct answer
 * of zero. Deciding that requires the run list and the attribute catalogue, which the compiler
 * does not have, so {@link CompiledSelector.paths} reports every column the selector reads and
 * the caller resolves them -- `E_UNKNOWN_RUN` and `E_UNKNOWN_ATTRIBUTE`, with candidates.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { EdgeId, NodeId, Path, Query } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import {
    columnsFor,
    type CompiledSelector,
    compileExpressionPredicate,
    hasPredicate,
    idsPredicate,
    type SelectorSource,
    type SelectorTarget,
} from "./predicate";

// ---------------------------------------------------------------------------------------------
// The union
// ---------------------------------------------------------------------------------------------

/**
 * Which elements a layer paints.
 *
 * Read the file's opening note before adding a kind: the union is small because each member is a
 * different COST, not a different spelling of the same question.
 */
export type Selector =
    /** Every element the layer's target names. The only universal match, and it is written out. */
    | { readonly match: "everything" }
    /**
     * The elements a predicate accepts. The only kind that reaches an evaluator, and the only
     * one whose cost grows with what was typed. `where` must be non-empty and is parsed here.
     */
    | { readonly match: "expression"; readonly where: Query }
    /**
     * The elements carrying a value for a column: the common case, and what `encode()` writes
     * so that a run-bound layer paints exactly the elements the run measured.
     */
    | { readonly match: "has"; readonly path: Path }
    /**
     * The elements named outright. A layer with neither list paints nothing, which is the honest
     * reading of "these elements" when there are none and is safe: it paints nothing rather than
     * everything.
     */
    | { readonly match: "ids"; readonly nodes?: readonly NodeId[]; readonly edges?: readonly EdgeId[] };

/** The path list every selector that reads no column shares. */
const EMPTY_PATHS: readonly Path[] = Object.freeze([]);

/** Every selector kind, for a refusal that lists what was allowed. */
const SELECTOR_KINDS = ["everything", "expression", "has", "ids"] as const;

// ---------------------------------------------------------------------------------------------
// Refusals
// ---------------------------------------------------------------------------------------------

/**
 * The refusal a selector whose shape is wrong gets.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values, for an editor that points at them.
 * @returns The error to throw.
 */
function badShape(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_SELECTOR", message, source: "style", details });
}

/**
 * The refusal an empty selector gets, which is its own code because it is its own defect.
 *
 * An empty selector is not a typo that matches nothing; it matches EVERYTHING, so a layer meant
 * to paint one algorithm's results paints the whole graph and erases every layer under it. The
 * caller writes `{match:"everything"}` when that is what it means.
 * @param what - Which field was empty.
 * @param details - The offending values.
 * @returns The error to throw.
 */
function emptySelector(what: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({
        code: "E_SELECTOR_EMPTY",
        message:
            `A selector's ${what} is empty, which matches every node and every edge rather than none. ` +
            'Write { match: "everything" } when a layer really is meant to paint the whole graph.',
        source: "style",
        details,
    });
}

/**
 * Check a list of ids is a list of ids.
 * @param ids - What the selector carried.
 * @param field - Which field it was, for the message.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` when it is not a list of strings or
 *     numbers.
 */
function assertIdList(ids: unknown, field: string): void {
    if (ids === undefined) {
        return;
    }

    if (!Array.isArray(ids)) {
        throw badShape(`An "ids" selector's ${field} is a list of ids.`, { field, [field]: ids });
    }

    const wrong = ids.findIndex((id) => typeof id !== "string" && typeof id !== "number");
    if (wrong !== -1) {
        throw badShape(`An "ids" selector's ${field} holds ids, and entry ${String(wrong)} is not one.`, {
            field,
            at: wrong,
            value: ids[wrong],
        });
    }
}

/**
 * Check a selector is a selector, without touching the session.
 *
 * Separate from compiling it so the shape is refused at the call that offered it, which is what
 * lets a form show the mistake where it was typed.
 * @param selector - The selector to check.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR`, or `E_SELECTOR_EMPTY` for an empty one.
 */
function assertSelector(selector: Selector): void {
    // Read through `unknown` because the refusals below are about a value the type system was
    // told is a Selector and that arrived as something else -- a legacy selector string, most of
    // all, which is the shape every layer in the element carries today.
    const given: unknown = selector;

    if (typeof given === "string") {
        const advice =
            given === ""
                ? 'The empty string matched every element, so write { match: "everything" } if that is what it meant.'
                : `Write { match: "expression", where: ${JSON.stringify(given)} }.`;

        throw badShape(
            `A selector is an object naming one of ${SELECTOR_KINDS.join(", ")}, not a bare string. ${advice}`,
            { selector: given },
        );
    }

    if (typeof given !== "object" || given === null || !("match" in given)) {
        throw badShape(`A selector is an object with a "match" of ${SELECTOR_KINDS.join(", ")}.`, { selector: given });
    }

    // Kept as a plain string beside the switch so the refusal below can name a kind the union
    // does not contain, which is exactly the case this check exists for.
    const kind: unknown = selector.match;

    switch (selector.match) {
        case "everything":
            return;
        case "expression":
            if (typeof selector.where !== "string") {
                throw badShape('An "expression" selector needs a where.', { where: selector.where });
            }

            if (selector.where.trim() === "") {
                throw emptySelector("where", { where: selector.where });
            }

            return;
        case "has":
            if (typeof selector.path !== "string") {
                throw badShape('A "has" selector needs a path, such as "results.louvain.group".', {
                    path: selector.path,
                });
            }

            if (selector.path.trim() === "") {
                throw emptySelector("path", { path: selector.path });
            }

            return;
        case "ids":
            assertIdList(selector.nodes, "nodes");
            assertIdList(selector.edges, "edges");

            return;
        default:
            throw badShape(`"${String(kind)}" is not a selector kind.`, { match: kind, kinds: SELECTOR_KINDS });
    }
}

// ---------------------------------------------------------------------------------------------
// Compiling
// ---------------------------------------------------------------------------------------------

/**
 * Turn a selector into the predicate a repaint runs.
 *
 * Call it once, when a layer is added or updated, and hold what comes back on the layer. Calling
 * it per element would reintroduce exactly the cost it exists to remove.
 * @param selector - What the layer says it paints.
 * @param target - Which kind of element the layer paints, which decides whose ids an `ids`
 *     selector reads and which half of the source every other kind reads.
 * @param source - What the session can answer about an element.
 * @returns The compiled selector: its test, and the columns that test reads.
 * @throws A `GraphtyError` with code `E_BAD_SELECTOR` when the selector's shape or its
 *     expression is wrong, `E_SELECTOR_EMPTY` when a selector is empty, and `E_UNSUPPORTED`
 *     when an `ids` selector is offered to a session that cannot say which id sits at which row.
 */
export function compileSelector(
    selector: Selector,
    target: SelectorTarget,
    source: SelectorSource,
): CompiledSelector {
    assertSelector(selector);

    const columns = columnsFor(source, target);

    switch (selector.match) {
        case "everything":
            return { match: "everything", target, test: null, paths: EMPTY_PATHS };
        case "has":
            return { match: "has", target, test: hasPredicate(columns, selector.path), paths: Object.freeze([selector.path]) };
        case "ids": {
            const named = target === "node" ? selector.nodes : selector.edges;
            const ids = new Set<EdgeId | NodeId>(named ?? []);

            return { match: "ids", target, test: idsPredicate(columns, ids), paths: EMPTY_PATHS };
        }
        default: {
            const { paths, test } = compileExpressionPredicate(selector.where, columns);

            return { match: "expression", target, test, paths };
        }
    }
}
