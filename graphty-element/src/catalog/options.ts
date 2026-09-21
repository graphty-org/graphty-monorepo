/**
 * @file One option mechanism, for all six extension points.
 *
 * WHAT THIS REPLACES. An extension author used to face three disagreeing mechanisms. An
 * algorithm declared its options twice -- as `OptionDescriptor[]` for the catalogue and as a
 * separate schema for its constructor -- in two vocabularies that do not correspond
 * (`select`/`nodeId` against `enum`/`node-id`), with nothing cross-checking them. A layout
 * declared a Zod schema the catalogue emitter read for built-ins only. A format hand-wrote a
 * descriptor and validated nothing. A camera had no options at all.
 *
 * THE ONE MECHANISM: an extension declares `readonly OptionDescriptor[]` -- the plain-JSON type
 * the catalogue already publishes and already hands a picker -- and the element validates the
 * caller's values against that declaration. One declaration is what a form renders, what the
 * catalogue publishes and what validation reads, so the three cannot disagree.
 *
 * Zod stays off the boundary, which is the catalogue's own stated rule: shipping Zod across a
 * package boundary makes the consumer's Zod version part of this package's API. An author who
 * prefers to write a Zod schema calls `optionsFromZod` once and registers what it emits.
 *
 * ONE FAILURE VOCABULARY. An unknown name is `E_UNKNOWN_OPTION` with `details.available` and
 * `details.candidates`; a value outside the declared range or not one of the declared choices is
 * `E_OPTION_RANGE` with the range and the value passed. The algorithm run path already failed
 * this way; every other point now joins it instead of inventing a third answer.
 */

import { GraphtyError } from "../errors";
import type { OptionDescriptor } from "./types";

/** Which extension point is being configured, which is what a failure message names. */
export interface OptionContext {
    readonly kind: "algorithm" | "camera" | "format" | "layout" | "sink";
    readonly id: string;
}

/** How close two names have to be before one is offered as a correction of the other. */
const MAX_EDIT_DISTANCE = 3;

/**
 * The edit distance between two names, for a "did you mean" list.
 * @param a - One name.
 * @param b - The other.
 * @returns How many single-character edits separate them.
 */
function editDistance(a: string, b: string): number {
    let previous = Array.from({ length: b.length + 1 }, (_unused, index) => index);

    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) {
            const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
            row[j] = Math.min(substitution, (previous[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1);
        }

        previous = row;
    }

    return previous[b.length] ?? Math.max(a.length, b.length);
}

/**
 * The declared names nearest to one that was not recognised.
 * @param wanted - The name that was passed.
 * @param available - The names that are declared.
 * @returns The nearest few, nearest first.
 */
function candidatesFor(wanted: string, available: readonly string[]): readonly string[] {
    return available
        .map((name) => ({ name, distance: editDistance(wanted.toLowerCase(), name.toLowerCase()) }))
        .filter((entry) => entry.distance <= MAX_EDIT_DISTANCE)
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 3)
        .map((entry) => entry.name);
}

/**
 * The numeric half of a declared bound, or undefined when the bound is resolved against a graph.
 *
 * A bound written as an option-bound reference -- "up to the largest core in this graph"
 * -- is not a number until a scope is measured, and `catalog.optionsFor` is what resolves it.
 * Refusing a value against an unresolved bound would refuse against a number nobody has.
 * @param bound - The declared bound.
 * @returns The number, or undefined when there is no fixed one.
 */
function fixedBound(bound: OptionDescriptor["min"]): number | undefined {
    return typeof bound === "number" ? bound : undefined;
}

/**
 * Check one value against one declaration.
 * @param declared - The option as its extension declares it.
 * @param value - The value the caller passed.
 * @param context - Which extension is being configured.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` when the value is outside the declared range or
 * is not one of the declared choices.
 */
function checkValue(declared: OptionDescriptor, value: unknown, context: OptionContext): void {
    const where = { kind: context.kind, id: context.id, option: declared.name, value };

    if (declared.type === "enum" && declared.values !== undefined) {
        const allowed = declared.values.map((choice) => choice.value);
        if (typeof value !== "string" || !allowed.includes(value)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `"${declared.name}" accepts ${allowed.map((name) => `"${name}"`).join(", ")}`,
                source: "config",
                details: { ...where, values: allowed },
            });
        }

        return;
    }

    if (declared.type === "number" || declared.type === "integer") {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `"${declared.name}" takes a number`,
                source: "config",
                details: where,
            });
        }

        if (declared.type === "integer" && !Number.isInteger(value)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `"${declared.name}" takes a whole number`,
                source: "config",
                details: where,
            });
        }

        const min = fixedBound(declared.min);
        const max = fixedBound(declared.max);
        if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `"${declared.name}" is limited to ${min ?? "any"} through ${max ?? "any"}`,
                source: "config",
                details: { ...where, min, max },
            });
        }

        return;
    }

    if (declared.type === "boolean" && typeof value !== "boolean") {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `"${declared.name}" takes true or false`,
            source: "config",
            details: where,
        });
    }
}

/**
 * Fill in the defaults an extension declares and refuse anything it did not.
 *
 * The result is a plain record, so an extension reads its options as data rather than being
 * handed a validator, a schema object or a class.
 * @param declared - The options the extension's descriptor declares.
 * @param passed - What the caller asked for. Undefined values are treated as absent, so passing
 *   `{ padding: undefined }` takes the declared default rather than overriding it with nothing.
 * @param context - Which extension is being configured, for the failure message.
 * @returns Every declared option, with the caller's values where they were given and the
 *   declared defaults everywhere else.
 * @throws A `GraphtyError` with `E_UNKNOWN_OPTION` for a name the extension does not declare, or
 * `E_OPTION_RANGE` for a value it would not accept.
 */
export function resolveOptionValues(
    declared: readonly OptionDescriptor[],
    passed: Readonly<Record<string, unknown>>,
    context: OptionContext,
): Record<string, unknown> {
    const byName = new Map(declared.map((option) => [option.name, option]));

    for (const name of Object.keys(passed)) {
        if (!byName.has(name)) {
            const available = declared.map((option) => option.name);
            throw new GraphtyError({
                code: "E_UNKNOWN_OPTION",
                message: `the ${context.kind} "${context.id}" has no option named "${name}"`,
                source: "config",
                details: {
                    kind: context.kind,
                    id: context.id,
                    option: name,
                    available,
                    candidates: candidatesFor(name, available),
                },
            });
        }
    }

    const resolved: Record<string, unknown> = {};
    for (const option of declared) {
        const value = passed[option.name];

        if (value === undefined) {
            if (option.default !== undefined) {
                resolved[option.name] = option.default;
            }

            continue;
        }

        checkValue(option, value, context);
        resolved[option.name] = value;
    }

    return resolved;
}
