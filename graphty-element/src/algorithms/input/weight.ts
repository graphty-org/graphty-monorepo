/**
 * @file Which edge weight a run reads: the run's `weight` option, else the weight the graph was
 * loaded with, checked against the meaning the algorithm reads.
 *
 * One rule for every algorithm with a weighted form, so the same column is never a strength to
 * one run and a distance to the next. A weight whose meaning the algorithm cannot read is left
 * unread -- the run counts edges -- and the run says so with a code, because reading a strength as
 * a distance gives a wrong answer, not a worse one.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { GraphtyError } from "../../errors";
import type { WeightMeaning, WeightSkip } from "../../session/runs/types";

/** The meaning of a weight an algorithm reads: `"strength"`, `"distance"` or `"capacity"`. */
export type WeightReads = WeightMeaning["meaning"];

/** The weight a graph was loaded with: its column, and its meaning, or null when the load did not say. */
export interface LoadedWeightFact {
    readonly attribute: string;
    readonly meaning: WeightReads | null;
}

/** What a run reads, and what its input is built with. */
export interface WeightReading {
    /** The weight the run read, as its `caveats.weight` states it; null when it read none. */
    readonly weight: WeightMeaning | null;
    /** Present when a weight was there but left unread. */
    readonly skipped?: WeightSkip;
    /**
     * What the run's input is asked for: undefined keeps the weights the graph was loaded with,
     * null reads the graph unweighted, a weight reads that column.
     */
    readonly input: WeightMeaning | null | undefined;
}

const MEANINGS: readonly unknown[] = ["strength", "distance", "capacity"] satisfies WeightReads[];

/**
 * The run's `weight` option, checked: absent, null, a column name, or a column and its meaning.
 * @param asked - The option as passed.
 * @returns The weight asked for, its meaning null when only a column was named.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` for anything else.
 */
function readAsked(asked: unknown): LoadedWeightFact | null | undefined {
    if (asked === undefined || asked === null) {
        return asked;
    }

    if (typeof asked === "string" && asked !== "") {
        return { attribute: asked, meaning: null };
    }

    const { attribute, meaning } = (typeof asked === "object" ? asked : {}) as Record<string, unknown>;
    if (typeof attribute === "string" && attribute !== "" && MEANINGS.includes(meaning)) {
        return { attribute, meaning: meaning as WeightReads };
    }

    throw new GraphtyError({
        code: "E_OPTION_RANGE",
        message:
            'The "weight" option takes null, an edge column\'s name, or { attribute, meaning } with a meaning of "strength", "distance" or "capacity".',
        source: "run",
        details: { option: "weight", value: asked },
    });
}

/**
 * Which weight a run reads.
 *
 * - An algorithm that reads no weight reads none, whatever was asked.
 * - `asked` null reads none. Absent, the loaded weight; a column name or `{ attribute, meaning }`
 *   overrides it for this run. A column named alone is taken to mean what the algorithm reads.
 * - A strength reader reads a strength, or a weight whose meaning nobody stated; a distance reader
 *   only a distance; a capacity reader only a capacity. Anything else is left unread, with a skip.
 * - A weight read with no stated meaning carries `assumed: true`.
 * @param reads - The meaning the algorithm reads, or null for an algorithm with no weighted form.
 * @param asked - The run's `weight` option.
 * @param loaded - The weight the graph was loaded with, or null.
 * @returns What the run reads.
 * @throws A `GraphtyError` with `E_OPTION_RANGE` for a malformed `weight` option.
 */
export function resolveRunWeight(
    reads: WeightReads | null,
    asked: unknown,
    loaded: LoadedWeightFact | null,
): WeightReading {
    // A class with no weighted form leaves the option to its own schema, whatever it holds.
    if (reads === null) {
        return { weight: null, input: undefined };
    }

    const named = readAsked(asked);

    if (named === null) {
        return { weight: null, input: null };
    }

    const candidate = named === undefined ? loaded : { attribute: named.attribute, meaning: named.meaning ?? reads };

    if (candidate === null) {
        // No weight was loaded: the store's weights all read 1, so the input stays as it is.
        return { weight: null, input: undefined };
    }

    if (candidate.meaning === reads || (reads === "strength" && candidate.meaning === null)) {
        // A meaning nobody stated is the algorithm's own assumption, and the run says so.
        const weight: WeightMeaning = Object.freeze({
            attribute: candidate.attribute,
            meaning: reads,
            ...(candidate.meaning === null ? { assumed: true as const } : {}),
        });
        // The loaded column is the store's own weights: read them rather than the column again.
        return { weight, input: candidate.attribute === loaded?.attribute ? undefined : weight };
    }

    return {
        weight: null,
        input: null,
        skipped: Object.freeze({
            code: "weight.meaning-mismatch",
            params: Object.freeze({ attribute: candidate.attribute, meaning: candidate.meaning, reads }),
        }),
    };
}
