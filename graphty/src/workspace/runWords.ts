/**
 * What the app calls a run, worded from the facts graphty-element publishes about it: the
 * algorithm's catalog name, the option its result was named after (`distinguishedBy`) and what
 * tells it apart from runs of the same algorithm that would otherwise share its name
 * (`siblingsDifferBy`). The words are the app's: "Communities (resolution 1.5)".
 */

import type { GraphSession, RunDistinction, Scope, SetId } from "@graphty/graphty-element/session";

/** The facts a run's name is worded from: a `Run`, or its `record`. */
export interface NamedRun {
    readonly algorithm: string;
    readonly params: Readonly<Record<string, unknown>>;
    readonly distinguishedBy: RunDistinction | null;
    readonly siblingsDifferBy: readonly string[] | null;
    readonly scope: { readonly spec: Scope };
}

/** The word an option goes by inside a run's name, where it is not the option's own name. */
const OPTION_WORDS: Readonly<Record<string, string>> = {
    dampingFactor: "damping",
    mode: "direction",
};

/**
 * A value inside a run's name: text as written, anything else as JSON.
 * @param value - the option's value.
 * @returns its text.
 */
function valueWords(value: unknown): string {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);
}

/**
 * A parameter's value where two runs of one algorithm differ by it.
 * @param value - the value.
 * @returns its text: on/off for a yes/no, "default" for an unset one.
 */
function differenceWords(value: unknown): string {
    if (typeof value === "boolean") {
        return value ? "on" : "off";
    }
    if (value === undefined) {
        return "default";
    }
    return typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value);
}

/**
 * What to call the scope a run computed over, when only the scope tells it apart.
 * @param spec - the scope.
 * @param setName - a kept set's name.
 * @returns a short phrase.
 */
export function scopeWords(spec: Scope, setName: (id: SetId) => string | undefined): string {
    if (spec === "visible") {
        return "visible";
    }
    if (spec === "graph") {
        return "whole graph";
    }
    if (spec === "selection") {
        return "selection";
    }
    if (spec === "largest-component") {
        return "largest component";
    }
    if ("set" in spec) {
        return setName(spec.set) ?? `set ${spec.set}`;
    }
    if ("where" in spec) {
        return spec.where;
    }
    if ("define" in spec) {
        return `${spec.define.kind} set`;
    }
    return `${String(spec.nodes.length)} nodes`;
}

/**
 * What the app calls a run.
 *
 * The algorithm's catalog name, with the option its result was named after once that left its
 * default, and, when another listed run of the algorithm would go by the same name, the options
 * that differ -- or the scope, when only the scope does. A batch goes by the label it was given.
 * @param session - the session, for the algorithm's catalog name and a kept set's name.
 * @param run - the run, or its record.
 * @returns such as "Communities (resolution 1.5)" or "Connections (largest component)".
 */
export function runName(session: GraphSession, run: NamedRun): string {
    if (run.algorithm === "batch") {
        return typeof run.params.label === "string" ? run.params.label : "Batch";
    }

    const algorithm =
        session.catalog.algorithms().find((descriptor) => descriptor.key === run.algorithm)?.plainName ?? run.algorithm;
    const { distinguishedBy: by } = run;
    const base =
        by === null ? algorithm : `${algorithm} (${OPTION_WORDS[by.option] ?? by.option} ${valueWords(by.value)})`;
    const differing = run.siblingsDifferBy;
    if (differing === null) {
        return base;
    }

    const qualifier =
        differing.length === 0
            ? scopeWords(run.scope.spec, (id) => session.sets.get(id)?.name)
            : differing.map((name) => `${name} ${differenceWords(run.params[name])}`).join(", ");
    return `${base} (${qualifier})`;
}
