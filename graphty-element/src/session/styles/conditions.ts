/**
 * @file The condition model: a selector read as per-field conditions combined with AND, and written
 * back. A filter or a style-target editor draws one control per condition (a number range, a list
 * of values, a text match, yes or no, has a value, the loads an element came from) and turns the
 * edited conditions back into the selector the layer holds. The selector stays the one source of
 * truth: a leaf no condition can edit is kept as a `fixed` condition, so reading and writing back
 * loses nothing.
 *
 * Everything here is a neutral fact. What a field or a condition is called, how fields are grouped
 * and in what words a fixed condition is said are the application's.
 */

import type { EdgeReading, ReadableValue, ReadableValueKind, RuleTree, SourceKey } from "../../catalog/types";
import type { GraphSession } from "../types";
import { type Selector, selectorRule } from "./selector";

/**
 * What kind of condition a field makes: a readable value's own kind, `name` for the node id,
 * `source` for the load an element came from, or `date` for a column graphty-element says
 * measures time.
 * @since 3.38.0
 */
export type ConditionFieldKind = ReadableValueKind | "name" | "source" | "date";

/**
 * The least a condition needs to know about the field it tests. An application's own field type
 * extends it with whatever it shows (a name, a group, a tooltip).
 * @since 3.38.0
 */
export interface ConditionField {
    /** What the condition reads: a readable value's path, or {@link CONDITION_SOURCE_PATH}. */
    readonly path: string;
    /** Whether nodes or edges carry it. */
    readonly on: "node" | "edge";
    /** What kind of condition it makes. */
    readonly kind: ConditionFieldKind;
    /** The lowest and highest value, for a number: a new number condition starts over all of it. */
    readonly range?: { readonly min: number; readonly max: number };
}

/**
 * One field a condition can be stated on, as {@link conditionFields} lists it.
 * @since 3.38.0
 */
export interface ListedConditionField extends ConditionField {
    /** Where it comes from: the element itself, a data column, a run's result, or the loads. */
    readonly from: ReadableValue["from"] | "source";
    /** It holds whole numbers only (an integer column or run field), so a control steps by 1. */
    readonly integer?: true;
    /** The readable value it is, for its name and facts. Absent for the data source field. */
    readonly value?: ReadableValue;
}

/**
 * How a text or name condition compares.
 * @since 3.38.0
 */
export type ConditionTextMode = "substring" | "starts-with" | "ends-with" | "exact";

/** "Has a value" or "has no value", which every value condition can be. */
type Presence = "present" | "absent";

/**
 * One condition: what it reads and what it keeps. `key` is the field's (`node:<path>`, see
 * {@link conditionKey}), `"ends"`, or a fixed condition's own; conditions on one side have
 * distinct keys.
 * @template F - The field type the condition carries: the application's own, or {@link ConditionField}.
 * @since 3.38.0
 */
export type Condition<F extends ConditionField = ConditionField> =
    | {
          readonly type: "number";
          readonly key: string;
          readonly field: F;
          /** A range, the top N (or N percent), or presence. */
          readonly match: "range" | "top" | Presence;
          readonly min?: number;
          readonly max?: number;
          readonly top?: number;
          /** Which end the top counts from: the highest values (the default) or the lowest. */
          readonly from?: "high" | "low";
          /** `top` is a share of all the elements, in percent. */
          readonly percent?: boolean;
      }
    | {
          readonly type: "category";
          readonly key: string;
          readonly field: F;
          readonly match: "values" | Presence;
          readonly values: readonly string[];
          /** The elements without a value pass too. */
          readonly gaps: boolean;
      }
    | {
          readonly type: "text";
          readonly key: string;
          readonly field: F;
          /** A text comparison, presence, or `list`: the fixed node ids in `ids`. */
          readonly match: ConditionTextMode | Presence | "list";
          readonly text: string;
          readonly caseSensitive: boolean;
          readonly ids?: readonly string[];
      }
    | {
          /** Instants in epoch milliseconds, both ends kept: a range leaf read `as: "time"`. */
          readonly type: "date";
          readonly key: string;
          readonly field: F;
          readonly match: "before" | "after" | "between" | Presence;
          readonly min?: number;
          readonly max?: number;
      }
    | {
          readonly type: "yes-no";
          readonly key: string;
          readonly field: F;
          /** `"unset"`: nothing chosen yet, so the condition makes no leaf. */
          readonly match: "yes" | "no" | "unset" | Presence;
      }
    | {
          /** The loads an element came from (`data.sources()` keys); any of them passes. */
          readonly type: "source";
          readonly key: string;
          readonly field: F;
          readonly sources: readonly SourceKey[];
      }
    | {
          /**
           * An edge side's conditions on the nodes: the node side's leaves reach the edges, an edge
           * passing when both ends (`clipped`) or either end (`incident`) do.
           */
          readonly type: "ends";
          readonly key: "ends";
          readonly reading: "clipped" | "incident";
      }
    | {
          /**
           * A leaf no condition edits, kept as it is; or, with `selector`, a whole selector that cannot
           * be combined with conditions (edges picked by id, a rule with no rule form), `leaf` null.
           */
          readonly type: "fixed";
          readonly key: string;
          readonly leaf: RuleTree | null;
          readonly selector?: Selector;
          /** A second leaf on a field another condition already draws. */
          readonly repeat?: true;
      };

/**
 * The data source field's path: not a column, the load an element came from (a `source` leaf).
 * @since 3.38.0
 */
export const CONDITION_SOURCE_PATH = "@source";

/**
 * A field's condition key: one condition per field and side.
 * @param field - The field.
 * @returns `<on>:<path>`.
 * @since 3.38.0
 */
export const conditionKey = (field: Pick<ConditionField, "on" | "path">): string => `${field.on}:${field.path}`;

/**
 * The fields a condition can be stated on, for nodes or edges, in the order `data.readableValues()`
 * lists them: the node id (`kind: "name"`), the data columns and each finished run's fields. A
 * column that only spells node ids is left out (the node id stands for it), and so is a node value
 * read at an edge's end (an `ends` condition says how edges follow the nodes). A column the data
 * says measures time is a `date` field. With two or more loads, the data source is a field too.
 *
 * ```ts
 * import { conditionFields } from "@graphty/graphty-element/session";
 *
 * conditionFields(session, "node").map((field) => [field.path, field.kind]);
 * // [["id", "name"], ["data.age", "number"], ["data.team", "category"]]
 * ```
 * @param session - The session.
 * @param on - Nodes or edges.
 * @returns The fields.
 * @since 3.38.0
 */
export function conditionFields(session: GraphSession, on: "node" | "edge"): ListedConditionField[] {
    const attributes = session.data.attributes();
    const times = new Set(
        attributes.filter((each) => each.kind === on && each.measurement === "time").map((each) => each.path),
    );
    const integers = new Set([
        ...attributes.filter((each) => each.type === "integer").map((each) => each.path),
        ...session.runs
            .list()
            .flatMap((run) =>
                run.fields.filter((f) => f.type === "integer").map((f) => session.results.path(run.id, f.name)),
            ),
    ]);
    const fields = session.data
        .readableValues()
        .filter((value) => value.on === on && value.end === undefined && value.holdsNodeIds !== true)
        .map((value): ListedConditionField => {
            const time = times.has(value.path) && value.kind !== "number";
            const kind: ConditionFieldKind = time ? "date" : value.kind;
            if (value.path === "id") {
                return { path: value.path, on, kind: "name", from: value.from, value };
            }
            return {
                path: value.path,
                on,
                kind,
                from: value.from,
                value,
                ...(value.range === undefined ? {} : { range: value.range }),
                ...(value.kind === "number" && integers.has(value.path) ? { integer: true as const } : {}),
            };
        });
    return session.data.sources().length >= 2
        ? [...fields, { path: CONDITION_SOURCE_PATH, on, kind: "source", from: "source" }]
        : fields;
}

/**
 * A new condition on a field: a number over its whole range, yes for a yes-or-no value, nothing
 * chosen or typed yet for the rest.
 * @param field - The field.
 * @returns The condition.
 * @since 3.38.0
 */
export function newCondition<F extends ConditionField>(field: F): Exclude<Condition<F>, { type: "fixed" | "ends" }> {
    const key = conditionKey(field);
    switch (field.kind) {
        case "number":
            return { type: "number", key, field, match: "range", min: field.range?.min, max: field.range?.max };
        case "category":
            return { type: "category", key, field, match: "values", values: [], gaps: false };
        case "yes-no":
            return { type: "yes-no", key, field, match: "yes" };
        case "date":
            return { type: "date", key, field, match: "before" };
        case "source":
            return { type: "source", key, field, sources: [] };
        default:
            return { type: "text", key, field, match: "substring", text: "", caseSensitive: false };
    }
}

/** A condition of one type. */
type ConditionOf<T extends Condition["type"], F extends ConditionField = ConditionField> = Extract<
    Condition<F>,
    { type: T }
>;

/** A rule leaf of one kind. */
type LeafOf<K extends RuleTree["kind"]> = Extract<RuleTree, { kind: K }>;

/**
 * The leaf that says an element carries a value for a path.
 * @param path - The value path.
 * @returns The leaf.
 */
const present = (path: string): RuleTree => ({ kind: "text", reads: path, mode: "regex", text: "" });

/**
 * Whether a leaf is "has a value" on some path.
 * @param leaf - The leaf.
 * @returns Its path, or undefined.
 */
function presentPath(leaf: RuleTree): string | undefined {
    return leaf.kind === "text" && leaf.mode === "regex" && leaf.text === "" ? leaf.reads : undefined;
}

/**
 * The rule leaf a condition makes, or null while it is unfinished (nothing chosen, no text typed,
 * yes or no unset) and for an `ends` condition, which says how the node leaves reach the edges.
 * @param condition - The condition.
 * @returns The leaf.
 * @since 3.38.0
 */
export function conditionLeaf(condition: Condition): RuleTree | null {
    switch (condition.type) {
        case "ends":
            return null;
        case "fixed":
            return condition.leaf;
        case "source":
            return condition.sources.length === 0 ? null : { kind: "source", sources: condition.sources };
        default:
            break;
    }
    const { path } = condition.field;
    if (condition.match === "present") {
        return present(path);
    }
    if (condition.match === "absent") {
        return { kind: "not", of: present(path) };
    }
    switch (condition.type) {
        case "number":
            return numberLeaf(condition, path);
        case "date":
            return dateLeaf(condition, path);
        case "category":
            return categoryLeaf(condition, path);
        case "yes-no":
            return condition.match === "unset"
                ? null
                : {
                      kind: "text",
                      reads: path,
                      mode: "exact",
                      text: String(condition.match === "yes"),
                      caseSensitive: true,
                  };
        default:
            return textLeaf(condition, path);
    }
}

/**
 * Whether a condition is finished: it makes a leaf, it is the `ends` condition, or it holds a whole
 * selector.
 * @param condition - The condition.
 * @returns True when finished.
 * @since 3.38.0
 */
export const isConditionFinished = (condition: Condition): boolean =>
    condition.type === "ends" ||
    (condition.type === "fixed" && condition.selector !== undefined) ||
    conditionLeaf(condition) !== null;

/**
 * A date condition's leaf: its range compared as times, or null while it has neither end.
 * @param condition - The condition, matching neither present nor absent.
 * @param path - The value path.
 * @returns The leaf.
 */
function dateLeaf(condition: ConditionOf<"date">, path: string): RuleTree | null {
    if (condition.min === undefined && condition.max === undefined) {
        return null;
    }
    return {
        kind: "range",
        attribute: path,
        ...(condition.min === undefined ? {} : { min: condition.min }),
        ...(condition.max === undefined ? {} : { max: condition.max }),
        as: "time",
    };
}

/**
 * A number condition's leaf: its top N (or N percent), or its range.
 * @param condition - The condition, matching neither present nor absent.
 * @param path - The value path.
 * @returns The leaf, or null while it is unfinished.
 */
function numberLeaf(condition: ConditionOf<"number">, path: string): RuleTree | null {
    if (condition.match === "top") {
        const { top } = condition;
        const from = condition.from === "low" ? { from: "low" as const } : {};
        if (condition.percent === true) {
            return top === undefined || top <= 0 || top > 100
                ? null
                : { kind: "threshold", path, percentile: top, ...from };
        }
        return top === undefined || top < 1 ? null : { kind: "threshold", path, top, ties: "all", ...from };
    }
    return {
        kind: "range",
        attribute: path,
        ...(condition.min === undefined ? {} : { min: condition.min }),
        ...(condition.max === undefined ? {} : { max: condition.max }),
    };
}

/**
 * A category condition's leaf: its chosen values, or'd with "no value" when `gaps` is set.
 * @param condition - The condition, matching neither present nor absent.
 * @param path - The value path.
 * @returns The leaf, or null while nothing is chosen.
 */
function categoryLeaf(condition: ConditionOf<"category">, path: string): RuleTree | null {
    const values: RuleTree = { kind: "categories", attribute: path, values: condition.values };
    if (condition.values.length === 0) {
        return condition.gaps ? { kind: "not", of: present(path) } : null;
    }
    return condition.gaps ? { kind: "any", of: [values, { kind: "not", of: present(path) }] } : values;
}

/**
 * A text or name condition's leaf: its fixed list of ids, or its typed text.
 * @param condition - The condition, matching neither present nor absent.
 * @param path - The value path.
 * @returns The leaf, or null while it is unfinished.
 */
function textLeaf(condition: ConditionOf<"text">, path: string): RuleTree | null {
    if (condition.match === "list") {
        const ids = condition.ids ?? [];
        return ids.length === 0 ? null : { kind: "member", of: { nodes: ids } };
    }
    const text = condition.text.trim();
    if (text === "" || condition.match === "present" || condition.match === "absent") {
        return null;
    }
    return {
        kind: "text",
        reads: path,
        mode: condition.match,
        text,
        ...(condition.caseSensitive ? { caseSensitive: true } : {}),
    };
}

/** What a selector holds, as leaves ANDed together, or a whole selector that stands alone. */
type Leaves = { readonly leaves: readonly RuleTree[]; readonly edges?: EdgeReading } | { readonly whole: Selector };

/**
 * A selector as leaves: a rule's `all`, node ids and a saved selection as member leaves, any other
 * selector with a rule form through {@link selectorRule}.
 * @param selector - The selector.
 * @returns The leaves, or the whole selector when it cannot be ANDed with a condition.
 */
function leavesOf(selector: Selector): Leaves {
    switch (selector.match) {
        case "everything":
            return { leaves: [] };
        case "ids": {
            // Node ids are a member leaf; edge ids have no leaf form and stand alone.
            const edges = selector.edges ?? [];
            return edges.length === 0
                ? { leaves: [{ kind: "member", of: { nodes: selector.nodes ?? [] } }] }
                : { whole: selector };
        }
        case "member":
            return { leaves: [{ kind: "member", of: selector.of }] };
        default: {
            const rule = selectorRule(selector, { comparisons: true, states: true });
            if (rule === undefined) {
                return selector.match === "expression"
                    ? { leaves: [{ kind: "expression", where: selector.where }] }
                    : { whole: selector };
            }
            const leaves = rule.where.kind === "all" ? rule.where.of : [rule.where];
            return { leaves, ...(rule.edges === undefined ? {} : { edges: rule.edges }) };
        }
    }
}

/**
 * The condition one rule leaf is, typed by its field, or a `fixed` condition for a leaf no
 * condition edits (a saved selection, picked node ids, a state, a threshold above a value, a rule
 * on a field not in `fields`).
 * @param leaf - The leaf.
 * @param fields - The fields of the side, as {@link conditionFields} lists them or the
 *     application's own.
 * @param at - The leaf's place, for a fixed condition's key.
 * @returns The condition.
 * @since 3.38.0
 */
export function conditionOf<F extends ConditionField>(leaf: RuleTree, fields: readonly F[], at: number): Condition<F> {
    const field: FieldFinder<F> = (path) => fields.find((each) => each.path === path);
    const fixed = fixedCondition<F>(leaf, at);
    const has = presentPath(leaf);
    const hasField = has === undefined ? undefined : field(has);
    if (hasField !== undefined) {
        return withMatch(hasField, "present");
    }
    switch (leaf.kind) {
        case "not": {
            const not = presentPath(leaf.of);
            const notField = not === undefined ? undefined : field(not);
            return notField === undefined ? fixed : withMatch(notField, "absent");
        }
        case "range":
            return rangeCondition(leaf, field(leaf.attribute), fixed);
        case "threshold":
            return thresholdCondition(leaf, field, fixed);
        case "expression":
            return expressionCondition(leaf, field, fixed);
        case "categories": {
            const f = field(leaf.attribute);
            if (f?.kind === "yes-no" && leaf.values.length === 0) {
                return { type: "yes-no", key: conditionKey(f), field: f, match: "unset" };
            }
            return f === undefined
                ? fixed
                : {
                      type: "category",
                      key: conditionKey(f),
                      field: f,
                      match: "values",
                      values: leaf.values,
                      gaps: false,
                  };
        }
        case "any":
            return gapsCondition(leaf, field, fixed);
        case "text":
            return textCondition(leaf, field, fixed);
        case "source": {
            const f = field(CONDITION_SOURCE_PATH);
            return f === undefined ? fixed : { type: "source", key: conditionKey(f), field: f, sources: leaf.sources };
        }
        default:
            return fixed;
    }
}

/** Finds the field a path names. */
type FieldFinder<F extends ConditionField> = (path: string) => F | undefined;

/**
 * The fixed condition that keeps a leaf as it is.
 * @param leaf - The leaf.
 * @param at - Its place.
 * @returns The condition.
 */
const fixedCondition = <F extends ConditionField>(leaf: RuleTree | null, at: number): ConditionOf<"fixed", F> => ({
    type: "fixed",
    key: `fixed:${String(at)}:${JSON.stringify(leaf)}`,
    leaf,
});

/**
 * A "has a value" or "has no value" condition on a field.
 * @param field - The field.
 * @param match - Which.
 * @returns The condition.
 */
function withMatch<F extends ConditionField>(field: F, match: Presence): Condition<F> {
    return { ...newCondition(field), match } as Condition<F>;
}

/**
 * The condition a range leaf is: a date for a range read as times, a number for one read as numbers.
 * @param leaf - The range leaf.
 * @param f - Its field, if the side has it.
 * @param fixed - The fixed condition.
 * @returns The condition.
 */
function rangeCondition<F extends ConditionField>(
    leaf: LeafOf<"range">,
    f: F | undefined,
    fixed: Condition<F>,
): Condition<F> {
    if (leaf.as === "time") {
        if (f?.kind !== "date") {
            return fixed;
        }
        const { min, max } = leaf;
        let match: "before" | "after" | "between" = "between";
        if (min === undefined) {
            match = "before";
        } else if (max === undefined) {
            match = "after";
        }
        return {
            type: "date",
            key: conditionKey(f),
            field: f,
            match,
            ...(min === undefined ? {} : { min }),
            ...(max === undefined ? {} : { max }),
        };
    }
    return f?.kind === "number"
        ? { type: "number", key: conditionKey(f), field: f, match: "range", min: leaf.min, max: leaf.max }
        : fixed;
}

/**
 * A threshold's condition: its top N or top percent. A threshold above a value stays fixed.
 * @param leaf - The leaf.
 * @param field - Finds a path's field.
 * @param fixed - The fixed condition.
 * @returns The condition.
 */
function thresholdCondition<F extends ConditionField>(
    leaf: LeafOf<"threshold">,
    field: FieldFinder<F>,
    fixed: Condition<F>,
): Condition<F> {
    const f = field(leaf.path);
    if (f?.kind !== "number" || leaf.above !== undefined) {
        return fixed;
    }
    const from = leaf.from === "low" ? { from: "low" as const } : {};
    if (leaf.percentile !== undefined && leaf.top === undefined) {
        return {
            type: "number",
            key: conditionKey(f),
            field: f,
            match: "top",
            top: leaf.percentile,
            percent: true,
            ...from,
        };
    }
    return leaf.top === undefined
        ? fixed
        : { type: "number", key: conditionKey(f), field: f, match: "top", top: leaf.top, ...from };
}

/**
 * An expression's condition: a bare column name (`email`) tests that the column holds a value,
 * yes for a yes-or-no column. Any other expression stays fixed.
 * @param leaf - The leaf.
 * @param field - Finds a path's field.
 * @param fixed - The fixed condition.
 * @returns The condition.
 */
function expressionCondition<F extends ConditionField>(
    leaf: LeafOf<"expression">,
    field: FieldFinder<F>,
    fixed: Condition<F>,
): Condition<F> {
    const bare = selectorRule({ match: "expression", where: `${leaf.where} != \`null\`` }, { comparisons: true });
    const path = bare === undefined ? undefined : presentPath(bare.where);
    const named = path === undefined ? undefined : field(path);
    if (named === undefined) {
        return fixed;
    }
    return named.kind === "yes-no"
        ? { type: "yes-no", key: conditionKey(named), field: named, match: "yes" }
        : withMatch(named, "present");
}

/**
 * "Group 3 or no value": a category condition with `gaps` set.
 * @param leaf - The leaf.
 * @param field - Finds a path's field.
 * @param fixed - The fixed condition.
 * @returns The condition.
 */
function gapsCondition<F extends ConditionField>(
    leaf: LeafOf<"any">,
    field: FieldFinder<F>,
    fixed: Condition<F>,
): Condition<F> {
    const [values, gap] = leaf.of;
    const f = values?.kind === "categories" ? field(values.attribute) : undefined;
    const gapPath = gap?.kind === "not" ? presentPath(gap.of) : undefined;
    return f !== undefined && leaf.of.length === 2 && values.kind === "categories" && gapPath === f.path
        ? { type: "category", key: conditionKey(f), field: f, match: "values", values: values.values, gaps: true }
        : fixed;
}

/**
 * A text leaf's condition: yes or no on a yes-or-no value, else a text condition.
 * @param leaf - The leaf.
 * @param field - Finds a path's field.
 * @param fixed - The fixed condition.
 * @returns The condition.
 */
function textCondition<F extends ConditionField>(
    leaf: LeafOf<"text">,
    field: FieldFinder<F>,
    fixed: Condition<F>,
): Condition<F> {
    const f = field(leaf.reads);
    if (f === undefined || leaf.mode === "regex") {
        return fixed;
    }
    if (f.kind === "yes-no" && leaf.mode === "exact" && (leaf.text === "true" || leaf.text === "false")) {
        return { type: "yes-no", key: conditionKey(f), field: f, match: leaf.text === "true" ? "yes" : "no" };
    }
    return {
        type: "text",
        key: conditionKey(f),
        field: f,
        match: leaf.mode,
        text: leaf.text,
        caseSensitive: leaf.caseSensitive === true,
    };
}

/**
 * One condition per field: a second leaf on a field already drawn becomes a fixed condition, so
 * nothing is lost.
 * @param conditions - The conditions in order.
 * @returns Them, keys distinct.
 */
function dedupe<F extends ConditionField>(conditions: readonly Condition<F>[]): Condition<F>[] {
    const seen = new Set<string>();
    return conditions.map((condition, at) => {
        if (!seen.has(condition.key)) {
            seen.add(condition.key);
            return condition;
        }
        return { ...fixedCondition<F>(conditionLeaf(condition), at), repeat: true };
    });
}

/**
 * Whether an edge rule's leaf is about nodes, so it reached the edges through an `ends` condition:
 * the node id, a saved selection or id list, the structure leaves, or a value edges do not carry.
 * @param leaf - The leaf.
 * @param edgeFields - The edge fields.
 * @returns True when it is about nodes.
 */
function speaksNodes(leaf: RuleTree, edgeFields: readonly ConditionField[]): boolean {
    const onEdges = (path: string): boolean => edgeFields.some((field) => field.path === path);
    switch (leaf.kind) {
        case "range":
        case "categories":
            return !onEdges(leaf.attribute);
        case "text":
            return leaf.reads === "id" || !onEdges(leaf.reads);
        case "threshold":
            return !onEdges(leaf.path);
        case "not":
            return speaksNodes(leaf.of, edgeFields);
        case "any":
        case "all":
            return leaf.of.length > 0 && leaf.of.every((each) => speaksNodes(each, edgeFields));
        case "member":
        case "degree":
        case "component":
        case "neighborhood":
        case "isolated":
        case "expression":
            return true;
        default:
            return false;
    }
}

/**
 * A selector read as conditions, or `{ whole }` when it cannot be (edges picked by id, a selector
 * with no rule form).
 */
type Whole = Extract<Condition, { type: "fixed" }> & { readonly selector: Selector };

/**
 * A whole selector as its one fixed condition.
 * @param selector - The selector.
 * @returns The condition.
 */
const wholeCondition = (selector: Selector): Whole => ({ type: "fixed", key: "fixed:whole", leaf: null, selector });

/**
 * A node selector as conditions: one per leaf of its rule, combined with AND. A selector that cannot
 * be drawn as conditions is one `fixed` condition holding it whole.
 *
 * ```ts
 * import { conditionFields, nodeConditions, conditionSelector } from "@graphty/graphty-element/session";
 *
 * const fields = conditionFields(session, "node");
 * const conditions = nodeConditions(layer.selector, fields);
 * // [{ type: "number", key: "node:data.age", match: "range", min: 30, max: 50, ... }]
 * conditionSelector(conditions); // the same selector back
 * ```
 * @param selector - The selector.
 * @param fields - The node fields.
 * @returns The conditions.
 * @since 3.38.0
 */
export function nodeConditions<F extends ConditionField>(selector: Selector, fields: readonly F[]): Condition<F>[] {
    const read = leavesOf(selector);
    if ("whole" in read) {
        return [wholeCondition(read.whole)];
    }
    return dedupe(read.leaves.map((leaf, at) => conditionOf(leaf, fields, at)));
}

/**
 * An edge selector as conditions: an `ends` condition first when its rule holds leaves about nodes
 * (those are the node side's, see {@link nodeConditionLeaves}), then one per edge leaf.
 * @param selector - The selector.
 * @param fields - The edge fields.
 * @returns The conditions.
 * @since 3.38.0
 */
export function edgeConditions<F extends ConditionField>(selector: Selector, fields: readonly F[]): Condition<F>[] {
    const read = leavesOf(selector);
    if ("whole" in read) {
        return [wholeCondition(read.whole)];
    }
    const own = read.leaves.filter((leaf) => !speaksNodes(leaf, fields));
    const ends: Condition<F>[] =
        own.length < read.leaves.length
            ? [{ type: "ends", key: "ends", reading: read.edges === "incident" ? "incident" : "clipped" }]
            : [];
    return [...ends, ...dedupe(own.map((leaf, at) => conditionOf(leaf, fields, at)))];
}

/**
 * The leaves a node selector holds, which an `ends` condition carries to the edge side, or null
 * when it is a whole selector that cannot be.
 * @param selector - The node selector.
 * @returns The leaves.
 * @since 3.38.0
 */
export function nodeConditionLeaves(selector: Selector): readonly RuleTree[] | null {
    const read = leavesOf(selector);
    return "whole" in read ? null : read.leaves;
}

/**
 * The selector some conditions make: their leaves combined with AND, unfinished ones left out. A
 * whole fixed condition stands alone; no leaves is every element.
 * @param conditions - One side's conditions.
 * @param ends - The node leaves an `ends` condition carries, for the edge side.
 * @returns The selector.
 * @since 3.38.0
 */
export function conditionSelector(conditions: readonly Condition[], ends: readonly RuleTree[] = []): Selector {
    const whole = conditions.find((each) => each.type === "fixed" && each.selector !== undefined);
    if (whole?.type === "fixed" && whole.selector !== undefined) {
        return whole.selector;
    }
    const endsCondition = conditions.find((each) => each.type === "ends");
    const own = conditions.flatMap((each) => conditionLeaf(each) ?? []);
    const leaves = endsCondition === undefined ? own : [...ends, ...own];
    if (leaves.length === 0) {
        return { match: "everything" };
    }
    // A bare state is the one selector tested per element with no rule to resolve.
    if (leaves.length === 1 && leaves[0].kind === "state") {
        return { match: "state", state: leaves[0].state };
    }
    const where: RuleTree = leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves };
    return endsCondition?.type === "ends" && endsCondition.reading === "incident"
        ? { match: "rule", where, edges: "incident" }
        : { match: "rule", where };
}
