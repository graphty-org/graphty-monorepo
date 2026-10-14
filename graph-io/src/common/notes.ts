/**
 * The note collector file positions use (and file styles, after their rebase): one note per code
 * (and optional property), never one per element, with at most 8 distinct samples of 80
 * characters, a total count and the element indexes the note covers.
 */

/** At most this many samples per note. */
const MAX_SAMPLES = 8;
/** A sample is cut to this many characters. */
const MAX_SAMPLE_LENGTH = 80;

/** One occurrence (or `count` occurrences) of a condition. */
interface NoteReport {
    /** An example of the offending value. */
    readonly sample?: unknown;
    /** The element the report is about, by index. */
    readonly element?: number;
    /** How many occurrences the report stands for; defaults to 1. */
    readonly count?: number;
}

/** A collected note, before a module shapes it into its own note type. */
interface CollectedNote<C extends string> {
    readonly code: C;
    readonly property: string | null;
    readonly count: number;
    readonly samples: readonly string[];
    readonly elements: readonly number[] | { readonly count: number };
}

interface Collecting<C extends string> {
    readonly code: C;
    readonly property: string | null;
    count: number;
    readonly samples: string[];
    readonly elements: Set<number>;
    unindexed: boolean;
}

/** Collects notes, aggregated per (code, property), in the order their conditions first occur. */
export class NoteCollector<C extends string> {
    readonly #notes = new Map<string, Collecting<C>>();

    /**
     * Record a condition.
     * @param code - the condition
     * @param report - a sample, the element index and a count
     * @param property - what the note is about, or null
     */
    add(code: C, report: NoteReport = {}, property: string | null = null): void {
        const key = `${code}\u0000${property ?? ""}`;
        let note = this.#notes.get(key);
        if (note === undefined) {
            note = { code, property, count: 0, samples: [], elements: new Set(), unindexed: false };
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
     * The collected notes.
     * @returns one note per (code, property)
     */
    list(): CollectedNote<C>[] {
        return Array.from(this.#notes.values(), (n) => ({
            code: n.code,
            property: n.property,
            count: n.count,
            samples: [...n.samples],
            elements: n.unindexed ? { count: n.count } : Array.from(n.elements).sort((a, b) => a - b),
        }));
    }
}

/**
 * A sample as at most 80 characters of text.
 * @param value - the sample
 * @returns the text
 */
function sampleText(value: unknown): string {
    const text = typeof value === "string" ? value : (JSON.stringify(value) ?? String(value));
    return text.length > MAX_SAMPLE_LENGTH ? `${text.slice(0, MAX_SAMPLE_LENGTH - 3)}...` : text;
}
