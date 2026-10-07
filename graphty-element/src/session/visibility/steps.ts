/**
 * @file Filter steps: an ordered list of rules, each switchable on and off, combined with AND.
 *
 * The steps are project state beside the single filter (`visibility.filter`); the masks are
 * evaluated from both, so what is visible is the single filter AND every step that is on. A step
 * that is off keeps its rule and hides nothing.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { FilterStep, RuleTree } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { CodedFact } from "../shared";
import type { HistoryCode } from "../types";

/** No steps. */
export const NO_STEPS: readonly FilterStep[] = Object.freeze([]);

/**
 * Refuse a steps list that is not one: each step an object with a non-empty, unique string `id`,
 * a boolean `on` and an object `rule`. The rules themselves are checked by the caller, as a
 * single filter is.
 * @param steps - The value given.
 * @throws A `GraphtyError` (`E_BAD_COMMAND`) naming what is wrong.
 */
export function assertSteps(steps: unknown): asserts steps is readonly FilterStep[] {
    const bad = (message: string, details: Readonly<Record<string, unknown>>): GraphtyError =>
        new GraphtyError({ code: "E_BAD_COMMAND", message, source: "data", details });
    if (!Array.isArray(steps)) {
        throw bad("Filter steps are an array of { id, on, rule }.", { steps });
    }

    const seen = new Set<string>();
    for (const step of steps as unknown[]) {
        const { id, on, rule } = (step ?? {}) as Partial<FilterStep>;
        if (
            typeof id !== "string" ||
            id === "" ||
            typeof on !== "boolean" ||
            typeof rule !== "object" ||
            rule === null
        ) {
            throw bad("A filter step is { id: a non-empty string, on: a boolean, rule: a filter }.", { step });
        }

        if (seen.has(id)) {
            throw bad(`Two filter steps have the id "${id}"; a step's id is unique.`, { id });
        }

        seen.add(id);
    }
}

/** The rule last combined from each steps list, with the filter it was combined with. */
const combined = new WeakMap<readonly FilterStep[], { filter: RuleTree | null; rule: RuleTree | null }>();

/**
 * The one rule the masks evaluate: the single filter AND every step that is on, in order.
 *
 * The same object comes back for the same filter and steps, so a caller may compare rules by
 * identity. With no step on, it is the filter itself.
 * @param filter - The single filter, or null.
 * @param steps - The steps.
 * @returns The rule, or null when nothing filters.
 */
export function combinedRule(filter: RuleTree | null, steps: readonly FilterStep[]): RuleTree | null {
    const kept = combined.get(steps);
    if (kept?.filter === filter) {
        return kept.rule;
    }

    const rules = [...(filter === null ? [] : [filter]), ...steps.filter((step) => step.on).map((step) => step.rule)];
    let rule: RuleTree | null = rules.length === 1 ? rules[0] : null;
    if (rules.length > 1) {
        rule = Object.freeze({ kind: "all", of: rules });
    }
    combined.set(steps, { filter, rule });

    return rule;
}

/**
 * What one steps edit did, as a history fact: one step added, edited, switched on or off, or
 * removed, naming its id; `visibility.steps` for anything else (a reorder, several at once).
 * @param before - The steps before.
 * @param after - The steps after.
 * @returns The fact.
 */
export function stepsFact(before: readonly FilterStep[], after: readonly FilterStep[]): CodedFact<HistoryCode> {
    const ids = (steps: readonly FilterStep[]): string[] => steps.map((step) => step.id);
    const same = (a: readonly string[], b: readonly string[]): boolean =>
        a.length === b.length && a.every((id, index) => id === b[index]);

    if (after.length === before.length + 1) {
        const added = after.find((step) => !before.some((old) => old.id === step.id));
        if (
            added !== undefined &&
            same(
                ids(before),
                ids(after).filter((id) => id !== added.id),
            )
        ) {
            return { code: "visibility.step-add", params: { id: added.id } };
        }
    }

    if (after.length === before.length - 1) {
        const removed = before.find((step) => !after.some((now) => now.id === step.id));
        if (
            removed !== undefined &&
            same(
                ids(after),
                ids(before).filter((id) => id !== removed.id),
            )
        ) {
            return { code: "visibility.step-remove", params: { id: removed.id } };
        }
    }

    if (same(ids(before), ids(after))) {
        // By value: the steps are admitted as new objects on every edit.
        const sameRule = (a: FilterStep, b: FilterStep): boolean =>
            a.rule === b.rule || JSON.stringify(a.rule) === JSON.stringify(b.rule);
        const changed = after.filter((step, index) => step.on !== before[index].on || !sameRule(step, before[index]));
        if (changed.length === 1) {
            const [step] = changed;
            const old = before[after.indexOf(step)];
            if (sameRule(old, step)) {
                return { code: step.on ? "visibility.step-on" : "visibility.step-off", params: { id: step.id } };
            }

            return { code: "visibility.step-edit", params: { id: step.id } };
        }
    }

    return { code: "visibility.steps", params: {} };
}
