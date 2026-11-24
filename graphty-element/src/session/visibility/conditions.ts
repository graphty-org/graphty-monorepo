/**
 * @file Filter conditions: a flat list of rules, each switchable on and off, each with an effect
 * (keep, exclude or select). Order never matters.
 *
 * The conditions are the one store; the filter steps (`visibility.steps`) are a view of the keep
 * and exclude conditions, and `setSteps` writes keep conditions. A step's rule is kept with its
 * meaning: a value leaf that names no `nodes` reading is given `"all"` (what a step reads it as),
 * so a step on an edge value hides exactly what it hid as a step.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type {
    AttributeLeafNodes,
    FilterCondition,
    FilterEffect,
    FilterStep,
    RuleTree,
    SourceKey,
} from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { CodedFact } from "../shared";
import type { HistoryCode } from "../types";
import { inertReason } from "./union";

/** The effects this element knows. */
const EFFECTS: ReadonlySet<string> = new Set<FilterEffect>(["keep", "exclude", "select"]);

/**
 * Whether a value is an effect this element knows.
 * @param effect - The value.
 * @returns True for keep, exclude or select.
 */
function knownEffect(effect: unknown): effect is FilterEffect {
    return typeof effect === "string" && EFFECTS.has(effect);
}

/**
 * The refusal of a malformed list.
 * @param message - What is wrong.
 * @param details - The offending value.
 * @returns The error.
 */
function bad(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "data", details });
}

/**
 * Refuse a conditions list that is not one: each an object with a non-empty, unique string `id`,
 * a boolean `on`, a known `effect` and an object `rule`. The rules are checked by the caller.
 * @param conditions - The value given.
 * @throws A `GraphtyError` (`E_BAD_COMMAND`) naming what is wrong.
 */
export function assertConditions(conditions: unknown): asserts conditions is readonly FilterCondition[] {
    if (!Array.isArray(conditions)) {
        throw bad("Filter conditions are an array of { id, on, effect, rule }.", { conditions });
    }

    const seen = new Set<string>();
    for (const condition of conditions as unknown[]) {
        if (!wellFormed(condition)) {
            throw bad(
                'A filter condition is { id: a non-empty string, on: a boolean, effect: "keep", "exclude" or "select", rule: a filter, within?: "graph" or "picture", name?: a string, source?: a load\'s key }.',
                { condition },
            );
        }

        if (seen.has(condition.id)) {
            throw bad(`Two filter conditions have the id "${condition.id}"; a condition's id is unique.`, {
                id: condition.id,
            });
        }

        seen.add(condition.id);
    }
}

/**
 * A condition's own fields with a new rule: `within` and `name` only when they were given.
 * @param condition - The condition.
 * @param rule - Its rule.
 * @returns The condition, unfrozen.
 */
export function conditionOf(condition: FilterCondition, rule: RuleTree): FilterCondition {
    const { id, on, effect, within, name, source } = condition;
    return {
        id,
        on,
        effect,
        rule,
        ...(within === undefined ? {} : { within }),
        ...(name === undefined ? {} : { name }),
        ...(source === undefined ? {} : { source }),
    };
}

/**
 * Whether the selection reaches past what is visible: every select condition that is on reads
 * `within: "graph"`.
 * @param conditions - The conditions.
 * @returns True when it does.
 */
export function selectsOverGraph(conditions: readonly FilterCondition[]): boolean {
    const selects = conditions.filter((each) => each.on && each.effect === "select");
    return selects.length > 0 && selects.every((each) => each.within === "graph");
}

/**
 * Whether one value is a well-formed condition (its rule unchecked).
 * @param condition - The value.
 * @returns True when it is.
 */
export function wellFormed(condition: unknown): condition is FilterCondition {
    const { id, on, effect, rule, within, name, source } = (condition ?? {}) as Partial<FilterCondition>;
    return (
        typeof id === "string" &&
        id !== "" &&
        typeof on === "boolean" &&
        knownEffect(effect) &&
        typeof rule === "object" &&
        rule !== null &&
        (within === undefined || within === "graph" || within === "picture") &&
        (name === undefined || typeof name === "string") &&
        (source === undefined || (typeof source === "string" && source !== ""))
    );
}

/**
 * A rule with every value leaf at positive polarity (under `all` and `any` only, never under
 * `not`) that names no `nodes` reading given one. Under a `not` a leaf is left as written, so a
 * negated edge leaf never hides the nodes at its ends. The same object comes back when nothing
 * changed.
 * @param rule - The rule.
 * @param reading - The reading to give, or a function of the reading written.
 * @returns The rule.
 */
function withReading(
    rule: RuleTree,
    reading: (nodes: AttributeLeafNodes | undefined) => AttributeLeafNodes | undefined,
): RuleTree {
    switch (rule.kind) {
        case "range":
        case "categories":
        case "text": {
            if (rule.kind === "text" && rule.reads === "id") {
                return rule;
            }

            const nodes = reading(rule.nodes);
            if (nodes === rule.nodes) {
                return rule;
            }

            const { nodes: _nodes, ...rest } = rule;
            return nodes === undefined ? rest : { ...rest, nodes };
        }
        case "all":
        case "any": {
            const of = rule.of.map((member) => withReading(member, reading));
            return of.every((member, at) => member === rule.of[at]) ? rule : { kind: rule.kind, of };
        }
        default:
            return rule;
    }
}

/**
 * The rule a condition's effect evaluates: for keep, a value leaf with no reading keeps the nodes
 * at the ends of its edges (`"ends"`); exclude and select read the rule as written.
 * @param condition - The condition.
 * @returns The rule.
 */
function effectiveRule(condition: Pick<FilterCondition, "effect" | "rule">): RuleTree {
    return condition.effect === "keep" ? withReading(condition.rule, (nodes) => nodes ?? "ends") : condition.rule;
}

/**
 * Whether a rule is a selection none of whose steps can apply yet: every group off or empty, and
 * every step off or not yet a test (no bound, no value picked, no reference). A keep or exclude
 * condition holding one removes nothing, so a card can be written the moment its first step is
 * added and still change nothing until that step has a test.
 * @param rule - The condition's rule.
 * @returns True for such a selection.
 */
function inertSelection(rule: RuleTree): boolean {
    return (
        rule.kind === "union" &&
        rule.branches.every(
            (branch) =>
                branch.on === false ||
                branch.steps.every((step) => step.on === false || inertReason(step.rule) !== null),
        )
    );
}

/**
 * A rule that judges only the nodes and edges some loads supplied: for theirs it answers as `of`
 * does, for every other element it answers `outside`. It is written as an `all` of one member, so
 * every walker that follows a rule's members (dependencies, held runs, signatures) sees the rule
 * inside; only the compiler reads `withinSources` (`compileOne` in `./filter`). Never accepted
 * from a consumer: it is made here, from a condition's `source`.
 */
export interface SourceScopedRule {
    readonly kind: "all";
    readonly of: readonly [RuleTree];
    /** The loads whose elements the rule judges. */
    readonly withinSources: readonly SourceKey[];
    /** What every other element answers: true passes it, false fails it. */
    readonly outside: boolean;
}

/**
 * Whether a rule is a {@link SourceScopedRule}.
 * @param rule - The rule.
 * @returns True when it is.
 */
export function isSourceScoped(rule: RuleTree): rule is RuleTree & SourceScopedRule {
    return rule.kind === "all" && Array.isArray((rule as Partial<SourceScopedRule>).withinSources);
}

/**
 * A rule that judges only one load's elements, or the rule itself when no load is named.
 * @param rule - The rule.
 * @param source - The load, or undefined for every element.
 * @param outside - What every other element answers.
 * @returns The rule.
 */
function scopedToSource(rule: RuleTree, source: SourceKey | undefined, outside: boolean): RuleTree {
    if (source === undefined) {
        return rule;
    }

    const scoped: SourceScopedRule = { kind: "all", of: [rule], withinSources: [source], outside };
    return Object.freeze(scoped);
}

/** The rule last combined from each conditions list, with the filter it was combined with. */
const combined = new WeakMap<readonly FilterCondition[], { filter: RuleTree | null; rule: RuleTree | null }>();

/**
 * The one rule the masks evaluate: the single filter AND every keep condition that is on AND no
 * exclude condition that is on. Select conditions are not part of it.
 *
 * The same object comes back for the same filter and conditions list, so a caller may compare
 * rules by identity.
 * @param filter - The single filter, or null.
 * @param conditions - The conditions.
 * @returns The rule, or null when nothing filters.
 */
export function combinedRule(filter: RuleTree | null, conditions: readonly FilterCondition[]): RuleTree | null {
    const kept = combined.get(conditions);
    if (kept?.filter === filter) {
        return kept.rule;
    }

    const rules: RuleTree[] = filter === null ? [] : [filter];
    for (const condition of conditions) {
        if (!condition.on || inertSelection(condition.rule)) {
            continue;
        }

        // A condition of one load leaves every other load's elements as they are.
        if (condition.effect === "keep") {
            rules.push(scopedToSource(effectiveRule(condition), condition.source, true));
        } else if (condition.effect === "exclude") {
            rules.push(scopedToSource({ kind: "not", of: condition.rule }, condition.source, true));
        }
    }

    let rule: RuleTree | null = rules.length === 1 ? rules[0] : null;
    if (rules.length > 1) {
        rule = Object.freeze({ kind: "all", of: rules });
    }

    combined.set(conditions, { filter, rule });
    return rule;
}

/**
 * The on select conditions' rules, or null when none is on.
 * @param conditions - The conditions.
 * @returns The rule every on select condition's rule ANDs into, or null.
 */
export function selectRule(conditions: readonly FilterCondition[]): RuleTree | null {
    const rules = conditions
        .filter((each) => each.on && each.effect === "select")
        .map((each) => scopedToSource(each.rule, each.source, false));
    if (rules.length === 0) {
        return null;
    }

    return rules.length === 1 ? rules[0] : { kind: "all", of: rules };
}

/** Each conditions list's steps view. */
const views = new WeakMap<readonly FilterCondition[], readonly FilterStep[]>();

/**
 * The steps view of a conditions list: the keep and exclude conditions as steps, in order. A keep
 * condition's step reads its edge leaves as the condition does (`"ends"` where none is named; a
 * step reads none as `"all"`); an exclude condition's step is `{ kind: "not", of: rule }`.
 * @param conditions - The conditions.
 * @returns The steps, the same object for the same list.
 */
export function stepsOf(conditions: readonly FilterCondition[]): readonly FilterStep[] {
    const kept = views.get(conditions);
    if (kept !== undefined) {
        return kept;
    }

    // A keep condition's edge leaves read as the condition reads them; a step reads none as "all".
    const asStep = (nodes: AttributeLeafNodes | undefined): AttributeLeafNodes | undefined => {
        if (nodes === undefined) {
            return "ends";
        }

        return nodes === "all" ? undefined : nodes;
    };
    const steps = Object.freeze(
        conditions
            .filter((each) => each.effect === "keep" || each.effect === "exclude")
            .map((each): FilterStep => {
                const rule: RuleTree =
                    each.effect === "exclude" ? { kind: "not", of: each.rule } : withReading(each.rule, asStep);
                return Object.freeze({ id: each.id, on: each.on, rule });
            }),
    );
    views.set(conditions, steps);
    return steps;
}

/**
 * A steps list as conditions: one keep condition per step, the rule kept with the meaning it has
 * as a step (a value leaf with no reading gets `"all"`), followed by the select conditions of the
 * list it replaces.
 * @param steps - The steps.
 * @param current - The conditions now; their select conditions are kept.
 * @returns The conditions.
 * @throws A `GraphtyError` (`E_BAD_COMMAND`) when a step's id is a select condition's id.
 */
export function conditionsOfSteps(
    steps: readonly FilterStep[],
    current: readonly FilterCondition[],
): readonly FilterCondition[] {
    const selects = current.filter((each) => each.effect !== "keep" && each.effect !== "exclude");
    const taken = new Set(selects.map((each) => each.id));
    // A step keeps the load its condition was made for.
    const sourceOf = new Map(current.flatMap((each) => (each.source === undefined ? [] : [[each.id, each.source]])));
    const kept = steps.map((step): FilterCondition => {
        if (taken.has(step.id)) {
            throw bad(`The filter step "${step.id}" has the id of a select condition; an id is unique.`, {
                id: step.id,
            });
        }

        const source = sourceOf.get(step.id);
        return Object.freeze({
            id: step.id,
            on: step.on,
            effect: "keep",
            rule: withReading(step.rule, (nodes) => nodes ?? "all"),
            ...(source === undefined ? {} : { source }),
        });
    });

    return Object.freeze([...kept, ...selects]);
}

/** One condition or step, as a history fact reads it. */
type Entry = Pick<FilterCondition, "id" | "on" | "rule"> &
    Partial<Pick<FilterCondition, "effect" | "source" | "name" | "within">>;

/**
 * What one conditions or steps edit did, as a history fact: one added, edited, switched on or
 * off, or removed; `visibility.steps` for anything else. A steps edit names the step's id
 * (`visibility.step-*`); a conditions edit names the condition's id and effect, and an edit its
 * effect before (`visibility.condition-*`), so a removed condition can still be described.
 * @param before - The list before.
 * @param after - The list after.
 * @param kind - Which API made the edit.
 * @returns The fact.
 */
export function listFact(
    before: readonly Entry[],
    after: readonly Entry[],
    kind: "step" | "condition" = "step",
): CodedFact<HistoryCode> {
    const fact = (
        verb: "add" | "edit" | "on" | "off" | "remove",
        entry: Entry,
        old?: Entry,
    ): CodedFact<HistoryCode> => {
        if (kind === "step") {
            return { code: `visibility.step-${verb}`, params: { id: entry.id } };
        }

        const params: Record<string, string> = { id: entry.id, effect: entry.effect ?? "keep" };
        if (old !== undefined) {
            params.previousEffect = old.effect ?? "keep";
        }

        return { code: `visibility.condition-${verb}`, params };
    };

    const added = after.length === before.length + 1 ? onlyIn(after, before) : undefined;
    if (added !== undefined) {
        return fact("add", added);
    }

    const removed = after.length === before.length - 1 ? onlyIn(before, after) : undefined;
    if (removed !== undefined) {
        return fact("remove", removed);
    }

    const changed = oneChanged(before, after);
    if (changed === undefined) {
        return { code: "visibility.steps", params: {} };
    }

    const [old, entry, verb] = changed;

    return verb === "edit" ? fact("edit", entry, old) : fact(verb, entry);
}

/**
 * Whether two lists of ids are equal, in order.
 * @param a - One list.
 * @param b - The other.
 * @returns true when they are.
 */
function sameIds(a: readonly Entry[], b: readonly Entry[]): boolean {
    return a.length === b.length && a.every((entry, index) => entry.id === b[index].id);
}

/**
 * The one entry a longer list has that a shorter one lacks, when the rest are the same in order.
 * @param longer - The list with one more.
 * @param shorter - The list with one fewer.
 * @returns The extra entry, or undefined.
 */
function onlyIn(longer: readonly Entry[], shorter: readonly Entry[]): Entry | undefined {
    const extra = longer.find((entry) => !shorter.some((other) => other.id === entry.id));
    if (extra === undefined) {
        return undefined;
    }

    return sameIds(
        shorter,
        longer.filter((entry) => entry.id !== extra.id),
    )
        ? extra
        : undefined;
}

/**
 * The edit of exactly one entry in an unchanged order: switched on or off, or edited (its rule,
 * its effect, its name or what it selects within).
 * @param before - The list before.
 * @param after - The list after.
 * @returns The entry before, after, and what was done to it; undefined for anything else.
 */
function oneChanged(
    before: readonly Entry[],
    after: readonly Entry[],
): readonly [Entry, Entry, "edit" | "on" | "off"] | undefined {
    if (!sameIds(before, after)) {
        return undefined;
    }

    // By value: the entries are admitted as new objects on every edit.
    const sameBody = (a: Entry, b: Entry): boolean =>
        a.effect === b.effect &&
        a.source === b.source &&
        a.name === b.name &&
        a.within === b.within &&
        (a.rule === b.rule || JSON.stringify(a.rule) === JSON.stringify(b.rule));
    const changed = after.filter((entry, index) => entry.on !== before[index].on || !sameBody(entry, before[index]));
    if (changed.length !== 1) {
        return undefined;
    }

    const [entry] = changed;
    const old = before[after.indexOf(entry)];
    if (sameBody(old, entry)) {
        return [old, entry, entry.on ? "on" : "off"];
    }

    return [old, entry, "edit"];
}

/** The version of the `conditions` field a project file's `visibility` member writes. */
export const CONDITIONS_VERSION = 1;

/** What a saved `conditions` field reads as, with what the reader reports about it. */
export interface SavedConditions {
    /** The conditions to restore, or null to read the file's steps instead. */
    readonly conditions: readonly FilterCondition[] | null;
    /** What to report. */
    readonly problems: readonly CodedFact<
        "W_FILTER_CONDITION_SKIPPED" | "W_FILTER_CONDITIONS_UNREADABLE" | "W_FILTER_STEPS_DIFFER"
    >[];
}

/**
 * Read a project file's `visibility.conditions` field, condition by condition, never as one
 * all-or-nothing list. Absent: null (the file's steps are read). Of an unknown version or not a
 * list: null, reported. A condition this reader cannot read is skipped and reported, and then what
 * the file hides is taken from its steps (every writer writes them), with the readable select
 * conditions. Steps that disagree with the keep and exclude conditions are reported; the
 * conditions win.
 * @param saved - The field as the file holds it.
 * @param steps - The file's steps, their rules already rewritten for this session.
 * @param remap - Rewrites a saved rule for this session (the set ids it names).
 * @param check - Refuses a rule this session cannot hold.
 * @param stepsSaved - Whether the file holds a steps list at all. A file with conditions and no
 *   steps (tier 4's) has nothing to disagree with, so nothing is reported.
 * @returns The conditions and the problems.
 */
export function readSavedConditions(
    saved: unknown,
    steps: readonly FilterStep[],
    remap: (rule: RuleTree) => RuleTree,
    check: (rule: RuleTree) => void,
    stepsSaved = true,
): SavedConditions {
    if (saved === undefined) {
        return { conditions: null, problems: [] };
    }

    const { version, list } = (typeof saved === "object" && saved !== null ? saved : {}) as {
        version?: unknown;
        list?: unknown;
    };
    if (version !== CONDITIONS_VERSION || !Array.isArray(list)) {
        const found = typeof version === "number" || typeof version === "string" ? version : null;
        return {
            conditions: null,
            problems: [{ code: "W_FILTER_CONDITIONS_UNREADABLE", params: { slice: "visibility", version: found } }],
        };
    }

    const problems: SavedConditions["problems"][number][] = [];
    const read: FilterCondition[] = [];
    for (const entry of list as unknown[]) {
        const id = (entry as { id?: unknown } | null)?.id;
        const condition = readable(entry, read, remap, check);
        if (condition === null) {
            problems.push({
                code: "W_FILTER_CONDITION_SKIPPED",
                params: { slice: "visibility", ...(typeof id === "string" ? { id } : {}) },
            });
        } else {
            read.push(condition);
        }
    }

    if (problems.length > 0) {
        // What it hides comes from the steps, so a skipped condition never shows what it hid.
        const selects = read.filter((each) => each.effect === "select" && !steps.some((step) => step.id === each.id));
        return { conditions: conditionsOfSteps(steps, selects), problems };
    }

    if (stepsSaved && JSON.stringify(stepsOf(read)) !== JSON.stringify(steps)) {
        problems.push({ code: "W_FILTER_STEPS_DIFFER", params: { slice: "visibility" } });
    }

    return { conditions: Object.freeze(read), problems };
}

/**
 * One saved condition, when this reader can hold it.
 * @param entry - The saved value.
 * @param read - The conditions read so far, whose ids it must not repeat.
 * @param remap - Rewrites its rule for this session.
 * @param check - Refuses a rule this session cannot hold.
 * @returns The condition, or null.
 */
function readable(
    entry: unknown,
    read: readonly FilterCondition[],
    remap: (rule: RuleTree) => RuleTree,
    check: (rule: RuleTree) => void,
): FilterCondition | null {
    if (!wellFormed(entry) || read.some((each) => each.id === entry.id)) {
        return null;
    }

    try {
        const rule = remap(entry.rule);
        check(rule);
        return Object.freeze(conditionOf(entry, rule));
    } catch {
        return null;
    }
}

/**
 * Whether a rule holds a `measure` that reads a run over the visible graph. A filter condition
 * decides what is visible, so such a measure would read its own output: each run over the new
 * picture moves the picture again, and the runs never settle.
 * @param rule - The rule, or any part of it.
 * @returns True when one does.
 */
function readsVisibleRun(rule: unknown): boolean {
    if (Array.isArray(rule)) {
        return rule.some(readsVisibleRun);
    }

    if (typeof rule !== "object" || rule === null) {
        return false;
    }

    const node = rule as Readonly<Record<string, unknown>>;
    if (node.kind === "measure" && node.scope === "visible") {
        return true;
    }

    return Object.values(node).some(readsVisibleRun);
}

/**
 * Refuse a filter condition whose rule reads a run over the visible graph: the picture would
 * depend on itself (see {@link readsVisibleRun}).
 * @param rule - The condition's rule.
 * @throws A `GraphtyError` (`E_BAD_COMMAND`) when it does.
 */
export function assertNotCircular(rule: RuleTree): void {
    if (readsVisibleRun(rule)) {
        throw bad(
            'A filter condition cannot read a run over the visible graph ("scope": "visible"): what it hides would change the run it reads. Read the run over "graph", or name another scope.',
            { rule },
        );
    }
}
