/**
 * @file One sentence saying what a result means, written from the result's own numbers.
 *
 * WHY THIS IS TEMPLATES AND NOT A LANGUAGE MODEL. A reading is a claim about the reader's data.
 * A model that writes one is free to round, to hedge, to invent a comparison the numbers do not
 * support, and to do it differently on two runs of the same graph -- and nothing downstream can
 * tell the difference between a sentence the data supports and one it does not. Every sentence
 * here is assembled from figures the result published, so a reader who checks it against the
 * chart beside it finds the same numbers.
 *
 * WHAT A READING IS FOR. `summary()` is the bounded form a card draws; this is the one line above
 * it. It exists because "0.0417" is not an answer to "what did that tell me", and because the
 * alternative -- every consumer writing its own sentence from the same statistics -- produces one
 * wording per consumer and one set of rounding decisions per consumer, all of them the element's
 * work done again.
 *
 * WHAT IT REFUSES TO SAY. A shape with nothing per element to describe gets a sentence about the
 * graph rather than an invented superlative; a run that measured nothing says so rather than
 * reporting zeros; and no sentence names a node the run did not measure. The element would rather
 * say less than say something the numbers do not carry.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: it is arithmetic and strings, published from
 * the Node-safe `./session` entry point.
 */

import type { ReadingOptions, ResultSummary, RunResult, SummaryEntry } from "./types";

/** How many decimal places a fractional figure is printed to. */
const DECIMALS = 3;

/** At or above this share of the measured elements tied at the lowest value, the tie is worth a clause. */
const TIE_SHARE = 0.1;

/**
 * Print one number the way a reader reads it.
 *
 * A whole number keeps its digits and gets thousands separators; anything else is cut to three
 * decimals, with trailing zeros dropped so "0.500" reads as "0.5". A number this small is being
 * read beside its own chart, so the digits that matter are the leading ones.
 * @param value - The number.
 * @param locale - The BCP 47 locale to print in.
 * @returns The printed form.
 */
function figure(value: number, locale: string | undefined): string {
    if (Number.isInteger(value)) {
        return value.toLocaleString(locale);
    }

    return Number(value.toFixed(DECIMALS)).toLocaleString(locale, { maximumFractionDigits: DECIMALS });
}

/**
 * What to call the field a metric measured.
 *
 * The plain name for a reader and the technical one for a paper, which is the same pairing every
 * other surface in the element speaks. Falls back to the field's name when a run published no
 * descriptor for it, rather than to a word invented here.
 * @param result - The result.
 * @param field - The field name.
 * @param audience - Which vocabulary to use.
 * @returns The words.
 */
function fieldWords(result: RunResult, field: string, audience: ReadingOptions["audience"]): string {
    const descriptor = result.fields.find((candidate) => candidate.name === field);

    if (descriptor === undefined) {
        return field;
    }

    return audience === "technical" ? descriptor.technicalName : descriptor.plainName.toLowerCase();
}

/**
 * The unit a figure carries, with the leading space, or nothing when the number counts nothing.
 *
 * Singular for exactly one, so a node with one edge has "1 link" rather than "1 links". The rule
 * is a trailing "s" dropped and nothing cleverer: the units the element declares are plain count
 * nouns, and a unit that does not pluralise that way should be declared in a form that reads
 * correctly on its own rather than have a table of exceptions grow here.
 * @param result - The result.
 * @param field - The field name.
 * @param count - The figure the unit is attached to.
 * @returns " links", " link", or the empty string.
 */
function unitOf(result: RunResult, field: string, count: number): string {
    const unit = result.fields.find((candidate) => candidate.name === field)?.unit;

    if (unit === undefined) {
        return "";
    }

    return count === 1 && unit.endsWith("s") ? ` ${unit.slice(0, -1)}` : ` ${unit}`;
}

/**
 * A graph-level number, when the run published one that is really a number.
 * @param result - The result.
 * @param field - The field name.
 * @returns The value, or undefined.
 */
function graphNumber(result: RunResult, field: string): number | undefined {
    const value = result.graph[field];

    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * What the highest-ranked element is called, and what it scored.
 * @param top - The summary's top entries.
 * @returns The entry, or undefined when nothing was measured.
 */
function best(top: readonly SummaryEntry[]): SummaryEntry | undefined {
    return top[0];
}

/**
 * The sentence for a result that measured every element on one scale.
 * @param result - The result.
 * @param summary - Its bounded form.
 * @param options - Locale and audience.
 * @returns The sentence.
 */
function metricReading(result: RunResult, summary: ResultSummary, options: ReadingOptions): string {
    const { locale, audience } = options;
    const words = fieldWords(result, "value", audience);
    const leader = best(summary.top);

    if (leader === undefined || summary.median === null) {
        return `Nothing was measured, so there is no ${words} to report.`;
    }

    const parts = [
        `${leader.label} has the highest ${words}, at ${figure(leader.value, locale)}${unitOf(result, "value", leader.value)}.`,
        `The typical element sits at ${figure(summary.median, locale)}${unitOf(result, "value", summary.median)}.`,
    ];

    // Said only when it is a real share of the measured elements. A graph where one node scores
    // zero has not told the reader anything; a graph where a third of them do has.
    if (summary.measured > 0 && summary.tiedAtMin / summary.measured >= TIE_SHARE && summary.min !== null) {
        parts.push(
            `${figure(summary.tiedAtMin, locale)} of ${figure(summary.measured, locale)} sit at the lowest value, ${figure(summary.min, locale)}${unitOf(result, "value", summary.min)}.`,
        );
    }

    // The count the run did NOT reach, which is the difference between "every node scores low"
    // and "most nodes were never looked at".
    if (summary.count > summary.measured) {
        parts.push(`${figure(summary.count - summary.measured, locale)} were not measured.`);
    }

    return parts.join(" ");
}

/**
 * The sentence for a result that sorts elements into groups.
 * @param result - The result.
 * @param summary - Its bounded form.
 * @param options - Locale and audience.
 * @returns The sentence.
 */
function groupingReading(result: RunResult, summary: ResultSummary, options: ReadingOptions): string {
    const { locale } = options;
    const groups = summary.groups ?? [];

    if (groups.length === 0) {
        return "Nothing was grouped, so there are no groups to report.";
    }

    const largest = groups[0];
    const parts = [
        `${figure(groups.length, locale)} ${groups.length === 1 ? "group" : "groups"} were found,`,
        `the largest holding ${figure(largest.size, locale)} of ${figure(summary.measured, locale)}.`,
    ];
    const modularity = graphNumber(result, "modularity");

    // Modularity is published by some partitioning algorithms and not others, so it is said only
    // when there is one. A partition with no score is not a worse partition; it is an unscored
    // one, and inventing a word for how good it is would be the reading making a claim up.
    if (modularity !== undefined) {
        parts.push(`Modularity is ${figure(modularity, locale)}.`);
    }

    return parts.join(" ");
}

/**
 * The sentence for a result that picked out a route.
 * @param result - The result.
 * @param options - Locale and audience.
 * @returns The sentence.
 */
function pathReading(result: RunResult, options: ReadingOptions): string {
    const { locale } = options;
    const hops = graphNumber(result, "hops");
    const cost = graphNumber(result, "cost");

    if (hops === undefined && cost === undefined) {
        return "No route was found.";
    }

    const parts: string[] = [];

    if (hops !== undefined) {
        parts.push(`The route runs ${figure(hops, locale)} ${hops === 1 ? "hop" : "hops"}.`);
    }

    if (cost !== undefined) {
        parts.push(`Its total cost is ${figure(cost, locale)}.`);
    }

    return parts.join(" ");
}

/**
 * The sentence for a result that chose a set of elements.
 * @param result - The result.
 * @param summary - Its bounded form.
 * @param options - Locale and audience.
 * @returns The sentence.
 */
function setReading(result: RunResult, summary: ResultSummary, options: ReadingOptions): string {
    const { locale } = options;
    const chosen = graphNumber(result, "count") ?? summary.measured;
    const noun = result.shape === "edge-set" ? "edge" : "node";

    if (chosen === 0) {
        return `No ${noun}s were selected.`;
    }

    return `${figure(chosen, locale)} ${chosen === 1 ? noun : `${noun}s`} were selected.`;
}

/**
 * The sentence for a result that is a list of pairs.
 * @param result - The result.
 * @param options - Locale and audience.
 * @returns The sentence.
 */
function pairReading(result: RunResult, options: ReadingOptions): string {
    const {pairs} = result.graph;
    const count = Array.isArray(pairs) ? pairs.length : 0;

    if (count === 0) {
        return "No pairs were found.";
    }

    return `${figure(count, options.locale)} ${count === 1 ? "pair was" : "pairs were"} found.`;
}

/**
 * The sentence for a result that is a series over time.
 * @param result - The result.
 * @param options - Locale and audience.
 * @returns The sentence.
 */
function temporalReading(result: RunResult, options: ReadingOptions): string {
    const steps = graphNumber(result, "steps");

    if (steps === undefined || steps === 0) {
        return "The series is empty.";
    }

    return `The series covers ${figure(steps, options.locale)} ${steps === 1 ? "step" : "steps"}.`;
}

/**
 * How many elements a run covered, as a sentence of last resort.
 * @param summary - The bounded form.
 * @param options - Locale and audience.
 * @returns The sentence.
 */
function coverageReading(summary: ResultSummary, options: ReadingOptions): string {
    if (summary.measured === 0) {
        return "The run produced no values.";
    }

    return `The run covered ${figure(summary.measured, options.locale)} of ${figure(summary.count, options.locale)}.`;
}

/**
 * Write one sentence saying what a result means.
 *
 * ONE SENTENCE PER SHAPE, not per algorithm. What a reader needs to hear about a measurement is
 * the same whether the measurement was degree or betweenness -- which is the same reason the
 * field NAMES are fixed by the shape rather than by the algorithm. An algorithm that wants to say
 * something only it can say publishes a field and the sentence picks it up, as modularity is
 * picked up for a partition that scores itself.
 *
 * Every figure in the sentence comes from the result. Nothing is rounded to make a phrase read
 * better, no comparison is drawn that the numbers do not support, and a shape with nothing to say
 * falls back to how much of the graph the run covered rather than inventing a finding.
 * @param result - The result to read.
 * @param options - The locale to print numbers in, and whether to use plain or technical words.
 * @returns The sentence.
 */
export function defaultReading(result: RunResult, options: ReadingOptions): string {
    const summary = result.summary();
    const {shape} = result;

    switch (shape) {
        case "node-metric":
        case "edge-metric": {
            return metricReading(result, summary, options);
        }
        case "community":
        case "layered-grouping":
        case "category-table": {
            return groupingReading(result, summary, options);
        }
        case "path": {
            return pathReading(result, options);
        }
        case "node-set":
        case "edge-set": {
            return setReading(result, summary, options);
        }
        case "pair-list": {
            return pairReading(result, options);
        }
        case "temporal": {
            return temporalReading(result, options);
        }
        case "fact": {
            // A fact publishes whatever single figure it established, under its own field name, so
            // there is no shape-wide sentence to write. Coverage is the honest thing left to say.
            return coverageReading(summary, options);
        }
        default: {
            return coverageReading(summary, options);
        }
    }
}
