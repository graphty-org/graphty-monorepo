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

import { englishBandName } from "../english";
import type { CodedFact, CodedFactParam } from "../shared";
import type { ReadingCode, ReadingOptions, RunResult } from "./types";

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

/** A reading fact's parameters. */
type Params = CodedFact["params"];

/**
 * A parameter as a number, or undefined when it is not one.
 * @param value - The parameter.
 * @returns The number.
 */
function numberOf(value: CodedFactParam | undefined): number | undefined {
    return typeof value === "number" ? value : undefined;
}

/**
 * What a result says, as a code and the figures it is about.
 *
 * ONE FACT PER SHAPE, not per algorithm. What a reader needs to hear about a measurement is the
 * same whether the measurement was degree or betweenness -- which is the same reason the field
 * NAMES are fixed by the shape rather than by the algorithm. An algorithm that wants to say
 * something only it can say publishes a field and the fact picks it up, as modularity is picked up
 * for a partition that scores itself. Every figure comes from the result.
 * @param result - The result.
 * @returns The fact.
 */
export function readingFactOf(result: RunResult): CodedFact<ReadingCode> {
    const summary = result.summary();

    switch (result.shape) {
        case "node-metric":
        case "edge-metric": {
            const leader = summary.top[0];
            if (leader === undefined || summary.median === null) {
                return { code: "reading.metric-empty", params: { field: "value" } };
            }

            return {
                code: "reading.metric",
                params: {
                    field: "value",
                    leader: leader.id,
                    leaderLabel: leader.label,
                    highest: leader.value,
                    median: summary.median,
                    lowest: summary.min,
                    tiedAtLowest: summary.tiedAtMin,
                    measured: summary.measured,
                    count: summary.count,
                },
            };
        }
        case "community":
        case "layered-grouping":
        case "category-table": {
            const groups = summary.groups ?? [];
            if (groups.length === 0) {
                return { code: "reading.groups-empty", params: {} };
            }

            return {
                code: "reading.groups",
                params: {
                    groups: groups.length,
                    largest: groups[0].size,
                    measured: summary.measured,
                    modularity: graphNumber(result, "modularity") ?? null,
                    band: result.band("modularity")?.id ?? null,
                },
            };
        }
        case "path": {
            const hops = graphNumber(result, "hops") ?? null;
            const cost = graphNumber(result, "cost") ?? null;

            return hops === null && cost === null
                ? { code: "reading.path-none", params: {} }
                : { code: "reading.path", params: { hops, cost } };
        }
        case "node-set":
        case "edge-set": {
            return {
                code: "reading.set",
                params: {
                    count: graphNumber(result, "count") ?? summary.measured,
                    element: result.shape === "edge-set" ? "edge" : "node",
                },
            };
        }
        case "pair-list": {
            const { pairs } = result.graph;

            return { code: "reading.pairs", params: { count: Array.isArray(pairs) ? pairs.length : 0 } };
        }
        case "temporal": {
            return { code: "reading.series", params: { steps: graphNumber(result, "steps") ?? 0 } };
        }
        default: {
            // A fact publishes whatever single figure it established, under its own field name, so
            // there is no shape-wide statement to make. Coverage is the honest thing left to say.
            return { code: "reading.coverage", params: { measured: summary.measured, count: summary.count } };
        }
    }
}

/**
 * The sentence for a measurement.
 * @param params - The fact's figures.
 * @param result - The result, for the field's names and unit.
 * @param options - Locale and audience.
 * @returns The sentence.
 */
function metricSentence(params: Params, result: RunResult, options: ReadingOptions): string {
    const { locale, audience } = options;
    const field = String(params.field);
    const words = fieldWords(result, field, audience);
    const highest = Number(params.highest);
    const median = Number(params.median);
    const lowest = numberOf(params.lowest);
    const tied = Number(params.tiedAtLowest);
    const measured = Number(params.measured);
    const count = Number(params.count);
    const parts = [
        `${String(params.leaderLabel)} has the highest ${words}, at ${figure(highest, locale)}${unitOf(result, field, highest)}.`,
        `The typical element sits at ${figure(median, locale)}${unitOf(result, field, median)}.`,
    ];

    // Said only when it is a real share of the measured elements. A graph where one node scores
    // zero has not told the reader anything; a graph where a third of them do has.
    if (measured > 0 && tied / measured >= TIE_SHARE && lowest !== undefined) {
        parts.push(
            `${figure(tied, locale)} of ${figure(measured, locale)} sit at the lowest value, ${figure(lowest, locale)}${unitOf(result, field, lowest)}.`,
        );
    }

    // The count the run did NOT reach, which is the difference between "every node scores low"
    // and "most nodes were never looked at".
    if (count > measured) {
        parts.push(`${figure(count - measured, locale)} were not measured.`);
    }

    return parts.join(" ");
}

/**
 * The sentence for a partition.
 * @param params - The fact's figures.
 * @param result - The result, for the band's words.
 * @param locale - The locale to print numbers in.
 * @returns The sentence.
 */
function groupsSentence(params: Params, result: RunResult, locale: string | undefined): string {
    const groups = Number(params.groups);
    const parts = [
        `${figure(groups, locale)} ${groups === 1 ? "group" : "groups"} were found,`,
        `the largest holding ${figure(Number(params.largest), locale)} of ${figure(Number(params.measured), locale)}.`,
    ];
    const modularity = numberOf(params.modularity);

    // Modularity is published by some partitioning algorithms and not others, so it is said only
    // when there is one. A partition with no score is not a worse partition; it is an unscored
    // one. The word for a scored one comes from the field's own interpretation scale.
    if (modularity !== undefined) {
        const words = bandWords(result, params.band);
        const named = words === undefined ? "" : ` (${words.toLowerCase()})`;
        parts.push(`Modularity is ${figure(modularity, locale)}${named}.`);
    }

    return parts.join(" ");
}

/**
 * The English name of one band of the modularity scale.
 * @param result - The result, whose modularity field carries the scale.
 * @param id - The band's id, from the fact.
 * @returns The band's plain name, or undefined for no band.
 */
function bandWords(result: RunResult, id: CodedFactParam | undefined): string | undefined {
    const band = result.fields
        .find((candidate) => candidate.name === "modularity" && candidate.kind === "graph")
        ?.interpretation?.bands.find((candidate) => candidate.id === id);

    return band === undefined ? undefined : englishBandName(band);
}

/**
 * A count and its noun, plural unless the count is exactly one.
 * @param count - How many.
 * @param noun - The singular.
 * @param locale - The locale to print the count in.
 * @returns Such as "3 hops".
 */
function counted(count: number, noun: string, locale: string | undefined): string {
    const word = count === 1 ? noun : `${noun}s`;

    return `${figure(count, locale)} ${word}`;
}

/** Writes the English for one reading code from the fact's figures. */
type ReadingWords = (params: Params, result: RunResult, options: ReadingOptions) => string;

/** The English sentence the deprecated `reading()` returns for each code. */
const READING_SENTENCES: Readonly<Record<ReadingCode, ReadingWords>> = {
    "reading.metric": metricSentence,
    "reading.metric-empty": (params, result, options) =>
        `Nothing was measured, so there is no ${fieldWords(result, String(params.field), options.audience)} to report.`,
    "reading.groups": (params, result, options) => groupsSentence(params, result, options.locale),
    "reading.groups-empty": () => "Nothing was grouped, so there are no groups to report.",
    "reading.path": (params, _result, { locale }) => {
        const hops = numberOf(params.hops);
        const cost = numberOf(params.cost);
        const parts: string[] = [];
        if (hops !== undefined) {
            parts.push(`The route runs ${counted(hops, "hop", locale)}.`);
        }

        if (cost !== undefined) {
            parts.push(`Its total cost is ${figure(cost, locale)}.`);
        }

        return parts.join(" ");
    },
    "reading.path-none": () => "No route was found.",
    "reading.set": (params, _result, { locale }) => {
        const count = Number(params.count);
        const noun = String(params.element);
        if (count === 0) {
            return `No ${noun}s were selected.`;
        }

        return `${counted(count, noun, locale)} were selected.`;
    },
    "reading.pairs": (params, _result, { locale }) => {
        const count = Number(params.count);
        if (count === 0) {
            return "No pairs were found.";
        }

        const verb = count === 1 ? "was" : "were";
        return `${counted(count, "pair", locale)} ${verb} found.`;
    },
    "reading.series": (params, _result, { locale }) => {
        const steps = Number(params.steps);
        if (steps === 0) {
            return "The series is empty.";
        }

        return `The series covers ${counted(steps, "step", locale)}.`;
    },
    "reading.coverage": (params, _result, { locale }) => {
        const measured = Number(params.measured);
        if (measured === 0) {
            return "The run produced no values.";
        }

        return `The run covered ${figure(measured, locale)} of ${figure(Number(params.count), locale)}.`;
    },
};

/**
 * The English sentence the deprecated `reading()` returns for a reading fact.
 * @param fact - The fact.
 * @param result - The result it reads, for the names, units and band words of its fields.
 * @param options - The locale to print numbers in, and whether to use plain or technical words.
 * @returns The sentence.
 */
export function readingSentence(fact: CodedFact<ReadingCode>, result: RunResult, options: ReadingOptions): string {
    return READING_SENTENCES[fact.code](fact.params, result, options);
}

/**
 * Write one sentence saying what a result means: the English of {@link readingFactOf}.
 *
 * Every figure in the sentence comes from the result. Nothing is rounded to make a phrase read
 * better, no comparison is drawn that the numbers do not support, and a shape with nothing to say
 * falls back to how much of the graph the run covered rather than inventing a finding.
 * @param result - The result to read.
 * @param options - The locale to print numbers in, and whether to use plain or technical words.
 * @returns The sentence.
 */
export function englishReading(result: RunResult, options: ReadingOptions): string {
    return readingSentence(readingFactOf(result), result, options);
}
