/**
 * @file Filter steps: an ordered list of rules, each switchable on and off, combined with AND.
 *
 * The steps are project state beside the single filter (`visibility.filter`); the masks are
 * evaluated from both, so what is visible is the single filter AND every step that is on. A step
 * that is off keeps its rule and hides nothing.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { FilterStep } from "../../catalog/types";
import { GraphtyError } from "../../errors";

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
