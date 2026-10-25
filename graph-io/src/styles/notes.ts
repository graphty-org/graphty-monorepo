/**
 * Style notes are aggregated, never one per element: one note per (code, target, property), with up to 8 distinct
 * samples, a total count and the element indexes the note covers.
 */

import type { StyleNote, StyleNoteCode, StyleTarget } from "./types.js";

/** At most this many samples per note. */
const MAX_SAMPLES = 8;
/** A sample is cut to this many characters. */
const MAX_SAMPLE_LENGTH = 80;

/** graph-io's English for each note, used only in its own report. */
const PHRASES: ReadonlyMap<StyleNoteCode, string> = new Map<StyleNoteCode, string>([
    ["W_STYLE_VALUE_TOO_LONG", "values longer than 256 characters were not parsed"],
    ["W_STYLE_BAD_VALUE", "values do not parse"],
    ["W_STYLE_UNKNOWN_VALUE", "values have no name in the vocabulary and are kept as other:<value>"],
    ["W_STYLE_ALPHA_DROPPED", "color alpha was dropped"],
    ["W_STYLE_COLOR_LIST", "color lists are not read as one color"],
    ["W_STYLE_GRADIENT", "gradients are read as their first color"],
    ["W_STYLE_UNFILLED", "nodes with a fill color are drawn unfilled"],
    ["W_STYLE_NO_FILL", "fills are marked transparent"],
    ["W_STYLE_NO_STROKE", "strokes are marked absent"],
    ["W_STYLE_SIZE_MINIMUM", "node sizes are minimums: the node grows to fit its label"],
    ["W_STYLE_HTML_LABEL", "HTML-like labels keep their text; markup was dropped"],
    ["W_STYLE_RECORD_LABEL", "record label fields were joined"],
    ["W_STYLE_EXTRA_LABELS", "elements have more than one label; the first was kept"],
    ["W_STYLE_INHERIT_COLOR", "inherited colors cannot be expressed"],
    ["W_STYLE_NOT_CARRIED", "style properties have no counterpart and were not carried"],
    ["W_STYLE_ANNOTATION_SKIPPED", "annotations of a kind graph-io does not read were skipped"],
    ["W_STYLE_BAD_MAPPING", "mappings cannot be read"],
    ["W_STYLE_MAPPING_COLUMN_MISSING", "mappings read a column the file does not have"],
    ["W_STYLE_REFERENCE_CYCLE", "style references are circular or too deep"],
    ["W_STYLE_UNRESOLVED", "style references name nothing"],
    ["W_STYLE_NESTING", "style structures are nested too deep"],
    ["W_STYLE_UNREADABLE", "a style section cannot be read"],
    ["W_STYLE_NO_VIZMAP", "the session holds no visual styles"],
    ["W_STYLE_VIEW_STYLE_MISSING", "the view names a style the file does not hold"],
    ["W_STYLE_OTHER_STYLES", "other visual styles were not read"],
    ["W_STYLE_OTHER_VIEWS", "other views were not read"],
    ["W_STYLE_SELECTOR", "invalid selectors match every element"],
    ["W_STYLE_SELECTOR_AS_COLUMN", "selectors were evaluated into per-element values"],
    ["W_STYLE_STATE_ASSUMED", "selector states were evaluated as at load"],
    ["W_STYLE_RAMP_ROUNDED", "continuous mappings match within the tool's rounding"],
    ["W_STYLE_LAYER_CAP", "rules were folded into per-element copies"],
    ["W_STYLE_BUDGET", "the work budget ran out; values were copied per element"],
    ["W_STYLE_BLOCK_IGNORED", "the graphty.styles block was ignored"],
    ["W_STYLE_NOT_WRITTEN", "the format cannot hold this style"],
    ["W_STYLE_APPROXIMATED", "written as the nearest value the format allows"],
    ["W_STYLE_RULES_NOT_KEPT", "per-element values were written but not the rules"],
    ["W_STYLE_LAYER_FLATTENED", "a style was written as per-element values"],
]);

/** One note being collected. */
interface Collecting {
    readonly code: StyleNoteCode;
    readonly target: StyleTarget | "graph" | null;
    readonly property: string | null;
    count: number;
    readonly samples: string[];
    readonly elements: Set<number>;
    unindexed: boolean;
}

/**
 * Options of one report to `StyleNotes.add()`.
 * @category Styles
 */
export interface StyleNoteReport {
    /** An example of the offending value; kept while the note has fewer than 8 distinct samples. */
    readonly sample?: unknown;
    /** The element the report is about, by index. */
    readonly element?: number;
    /** How many occurrences the report stands for; defaults to 1. */
    readonly count?: number;
}

/**
 * Collects style notes, aggregated per (code, target, property).
 * @category Styles
 */
export class StyleNotes {
    readonly #notes = new Map<string, Collecting>();

    /**
     * Records one occurrence (or `count` occurrences) of a condition.
     * @param code - the condition
     * @param target - nodes, edges, the graph, or null for the file as a whole
     * @param property - the property or the file's name for the construct, or null
     * @param report - a sample, the element index and a count
     */
    add(
        code: StyleNoteCode,
        target: StyleTarget | "graph" | null,
        property: string | null,
        report: StyleNoteReport = {},
    ): void {
        const key = `${code}\u0000${target ?? ""}\u0000${property ?? ""}`;
        let note = this.#notes.get(key);
        if (note === undefined) {
            note = { code, target, property, count: 0, samples: [], elements: new Set(), unindexed: false };
            this.#notes.set(key, note);
        }
        note.count += report.count ?? 1;
        if (report.element === undefined) {
            note.unindexed = true;
        } else {
            note.elements.add(report.element);
        }
        if (report.sample !== undefined && note.samples.length < MAX_SAMPLES) {
            const sample = sampleText(report.sample);
            if (!note.samples.includes(sample)) {
                note.samples.push(sample);
            }
        }
    }

    /**
     * Whether a note with this code, target and property covers an element.
     * @param code - the condition
     * @param target - nodes or edges
     * @param property - the property
     * @param element - the element index
     * @returns true when such a note named the element
     */
    covers(code: StyleNoteCode, target: StyleTarget, property: string | null, element: number): boolean {
        return this.#notes.get(`${code}\u0000${target}\u0000${property ?? ""}`)?.elements.has(element) === true;
    }

    /**
     * The collected notes, in the order their conditions first occurred.
     * @returns one note per (code, target, property)
     */
    list(): StyleNote[] {
        const out: StyleNote[] = [];
        for (const n of this.#notes.values()) {
            const where = n.property === null ? (n.target ?? "file") : `${n.target ?? "file"} ${n.property}`;
            out.push({
                code: n.code,
                params: { property: n.property, target: n.target, count: n.count, samples: [...n.samples] },
                elements: n.unindexed ? { count: n.count } : Array.from(n.elements).sort((a, b) => a - b),
                message: `${where}: ${PHRASES.get(n.code) ?? n.code} (${n.count})`,
            });
        }
        return out;
    }
}

/**
 * A sample as at most 80 characters of text.
 * @param value - the sample
 * @returns its text
 */
function sampleText(value: unknown): string {
    let text: string;
    if (typeof value === "string") {
        text = value;
    } else {
        try {
            text = JSON.stringify(value) ?? typeof value;
        } catch {
            text = typeof value;
        }
    }
    return text.slice(0, MAX_SAMPLE_LENGTH);
}
