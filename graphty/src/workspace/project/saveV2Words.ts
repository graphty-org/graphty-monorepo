/**
 * The words of the version 2 save and open dialogs (the "save-files-v2" experiment): section
 * names, the save presets, one line per section from graphty-element's counts, and a report line
 * per code graphty-element reports. graphty-element hands back counts and codes; the words, the
 * presets and their order are the app's.
 */

import type {
    DocumentHeldReason,
    DocumentSection,
    DocumentSectionFacts,
    GraphSession,
    ProjectFileSection,
    ProjectProblem,
    ProjectSourceChoice,
    SourceEmbeddedReason,
    SourceUnavailableReason,
} from "@graphty/graphty-element/session";

import { countWords } from "../time/timeWords";

/** Each section's name as the dialogs show it. */
export const SECTION_LABELS: Readonly<Record<DocumentSection, string>> = {
    data: "Data",
    style: "Style",
    recipe: "Recipe",
    settings: "Settings",
    results: "Results",
    notes: "Notes",
    view: "View",
};

/** A save preset: one use case and the sections it picks. */
export interface SavePreset {
    readonly value: string;
    readonly label: string;
    readonly sections: readonly DocumentSection[];
}

/**
 * The save presets, one per use case.
 * @param all - every section graphty-element lists, in its order: Everything.
 * @returns the presets.
 */
export function savePresets(all: readonly DocumentSection[]): SavePreset[] {
    return [
        { value: "everything", label: "Everything", sections: all },
        { value: "share", label: "Share without notes", sections: all.filter((s) => s !== "notes" && s !== "results") },
        { value: "style", label: "Style only", sections: ["style"] },
        { value: "recipe", label: "Recipe only", sections: ["recipe"] },
        { value: "kit", label: "Starting kit", sections: ["style", "recipe", "settings"] },
        { value: "journal", label: "Journal", sections: ["notes", "view"] },
        { value: "record", label: "Record", sections: ["data", "recipe", "results", "view"] },
    ];
}

/**
 * The parts of a summary line with a count above zero.
 * @param counts - the section's counts.
 * @param parts - each count's member and its noun.
 * @returns the words, one per part.
 */
function counted(counts: Readonly<Record<string, number>>, parts: readonly [string, string][]): string[] {
    return parts
        .filter(([member]) => (counts[member] ?? 0) > 0)
        .map(([member, noun]) => countWords(counts[member], noun));
}

/**
 * What one section holds, as one short line: "3 sources . 5 nodes . 5 edges".
 * @param facts - what graphty-element said the section holds.
 * @returns the line; "Empty" when it holds nothing.
 */
export function sectionSummary(facts: DocumentSectionFacts): string {
    const { counts } = facts;
    const byKind: Record<DocumentSection, string[]> = {
        data: counted(counts, [
            ["sources", "source"],
            ["nodes", "node"],
            ["edges", "edge"],
            ["types", "type"],
        ]),
        style: counted(counts, [
            ["layers", "layer"],
            ["palettes", "palette"],
        ]),
        recipe: counted(counts, [["commands", "step"]]),
        settings: [...counted(counts, [["settings", "setting"]]), ...(counts.playback > 0 ? ["playback"] : [])],
        results: [...counted(counts, [["runs", "run"]]), ...(counts.layout > 0 ? ["the layout"] : [])],
        notes: counted(counts, [["notes", "note"]]),
        view: [
            ...(counts.camera > 0 ? ["Camera"] : []),
            ...counted(counts, [
                ["views", "saved view"],
                ["sets", "set"],
                ["layers", "layer"],
                ["runs", "run"],
            ]),
        ],
    };
    const parts = [...(facts.name === undefined ? [] : [facts.name]), ...byKind[facts.section]];
    return parts.length === 0 ? "Empty" : parts.join(" . ");
}

/** One line of a save or open report: the item, what happened to it and why. */
export interface ReportLine {
    readonly item: string;
    readonly outcome: string;
    readonly reason: string;
}

/** Why a source asked to be referenced was copied into the file (`W_SOURCE_EMBEDDED` reasons). */
const EMBEDDED_REASONS: Readonly<Record<SourceEmbeddedReason, string>> = {
    edited: "Holds your edits",
    rows: "Shares rows with another source",
    mapping: "Read through a mapping",
    bytes: "No file to read again",
    kind: "Cannot be read again",
};

/** Why a referenced source did not load (`W_SOURCE_UNAVAILABLE` reasons). */
const UNAVAILABLE_REASONS: Readonly<Record<SourceUnavailableReason, string>> = {
    unreachable: "Could not be reached",
    "needs-file": "Needs its file",
    read: "Could not be read",
    "too-large": "Too large",
    consent: "Fetching not allowed",
    kind: "Cannot be read again",
};

/** Why a section is held (`W_SECTION_KEPT` reasons). */
const HELD_REASONS: Readonly<Record<Exclude<DocumentHeldReason, "version">, string>> = {
    extension: "Needs an extension",
    data: "Its data is held",
    add: "Not added to open data",
    graphs: "Holds several graphs",
    kind: "Not readable here",
    unknown: "Not readable here",
    malformed: "Not readable here",
};

/**
 * The words for a reason graphty-element gave; its reasons are open unions, so a reason this
 * release has no words for yet gets the fallback.
 * @param words - the words, by reason.
 * @param reason - the reason given.
 * @param fallback - the words for any other reason.
 * @returns the words.
 */
function wordOf<K extends string>(words: Readonly<Record<K, string>>, reason: unknown, fallback: string): string {
    const key = String(reason);
    return Object.hasOwn(words, key) ? words[key as K] : fallback;
}

/**
 * Why a section is held, in words.
 * @param reason - the reason graphty-element gave.
 * @param version - the section's version.
 * @returns the words.
 */
export function heldWords(reason: unknown, version: unknown): string {
    if (reason === "version") {
        return `Version ${String(version)}, newer than this release`;
    }
    return wordOf(HELD_REASONS, reason, "Not readable here");
}

/** What the report lines need to name things: the session's layers and the sources by id. */
export interface ReportNames {
    readonly session: GraphSession | null;
    /** Each source's name by its record id. */
    readonly sources: ReadonlyMap<string, string>;
}

/**
 * A section's name from a param.
 * @param value - the `section` param.
 * @returns its name, or "Project" for none.
 */
function sectionWord(value: unknown): string {
    return SECTION_LABELS[value as DocumentSection] ?? "Project";
}

/**
 * A layer's name from its id.
 * @param names - the names.
 * @param id - the `layer` param.
 * @returns "<name> (layer)", or "A layer".
 */
function layerWord(names: ReportNames, id: unknown): string {
    const layer = names.session?.styles.list().find((each) => each.id === id);
    return layer === undefined ? "A layer" : `${layer.name} (layer)`;
}

/**
 * One report line for one code graphty-element reported.
 * @param fact - the code and its params.
 * @param names - what names things.
 * @returns the line.
 */
function reportLine(fact: ProjectProblem, names: ReportNames): ReportLine {
    const { params } = fact;
    const source = names.sources.get(String(params.source)) ?? "A source";
    switch (fact.code) {
        case "W_SECTION_KEPT":
            return {
                item: sectionWord(params.section),
                outcome: "Kept as opened",
                reason: heldWords(params.reason, params.version),
            };
        case "W_ELEMENT_NAMING_LEFT_OUT":
            return {
                item: layerWord(names, params.layer),
                outcome: params.movedTo === "view" ? "Moved to view" : "Left out",
                reason: "Picks nodes by id",
            };
        case "W_SOURCE_NO_PATH":
            return { item: source, outcome: "Copied", reason: "No file path to refer to" };
        case "W_SOURCE_EMBEDDED":
            return {
                item: source,
                outcome: "Copied",
                reason: wordOf(EMBEDDED_REASONS, params.reason, "Cannot be read again"),
            };
        case "W_SOURCE_UNAVAILABLE":
            return {
                item: source,
                outcome: "Not loaded",
                reason: wordOf(UNAVAILABLE_REASONS, params.reason, "Could not be read"),
            };
        case "W_SOURCE_CHANGED":
            return { item: source, outcome: "Read again", reason: "Changed since saved" };
        case "W_DATA_MISMATCH":
            return { item: sectionWord(params.section), outcome: "Not loaded", reason: "Written on other data" };
        case "W_DATA_CHANGED":
            return { item: sectionWord(params.section), outcome: "Loaded", reason: "Data changed since saved" };
        case "W_REFERENCE_UNBOUND":
            return {
                item: sectionWord(params.section),
                outcome: "Partly bound",
                reason: "Names nodes not in the data",
            };
        case "W_RUN_NOT_RUN":
            return { item: String(params.run ?? params.id ?? "A run"), outcome: "Not run", reason: "" };
        case "W_RUN_PENDING":
            return { item: String(params.id ?? "A run"), outcome: "Left out", reason: "Still running" };
        case "W_RESULTS_DIFFER":
            return { item: sectionWord("results"), outcome: "Differ from saved", reason: "" };
        case "W_RECIPE_NOT_APPLIED":
            return { item: sectionWord("recipe"), outcome: "Kept, not applied", reason: "" };
        case "W_MEMBER_LEFT_OUT":
            return { item: sectionWord(params.section), outcome: "Partly left out", reason: "Not in version 2 yet" };
        default:
            return { item: sectionWord(params.section), outcome: "Not as saved", reason: "" };
    }
}

/**
 * The report lines for what a version 2 save or open reported, the same line said once.
 * @param facts - what graphty-element reported.
 * @param names - what names things.
 * @returns the lines, in the order first reported.
 */
export function reportLines(facts: readonly ProjectProblem[], names: ReportNames): ReportLine[] {
    const lines = new Map<string, ReportLine>();
    for (const fact of facts) {
        const line = reportLine(fact, names);
        const key = `${line.item}\n${line.outcome}\n${line.reason}`;
        if (!lines.has(key)) {
            lines.set(key, line);
        }
    }
    return [...lines.values()];
}

/**
 * A source's detail line in the save dialog: "csv . 3 nodes . 2 edges".
 * @param source - what graphty-element said of it.
 * @returns the line.
 */
export function sourceDetail(source: ProjectSourceChoice): string {
    if (source.kind === "reader") {
        return countWords(source.operations ?? 0, "operation");
    }
    return [
        ...(source.format === undefined ? [] : [source.format.toUpperCase()]),
        countWords(source.nodes, "node"),
        countWords(source.edges, "edge"),
    ].join(" . ");
}

/**
 * Why a source cannot be referenced, in words, from the refusal graphty-element gave.
 * @param source - what graphty-element said of it.
 * @returns the words, or undefined when it can be.
 */
export function refusedWords(source: ProjectSourceChoice): string | undefined {
    if (source.referable) {
        return undefined;
    }
    if (source.refused === undefined) {
        return source.kind === "reader" ? "Always copied" : "Cannot be read again";
    }
    return reportLine(source.refused, { session: null, sources: new Map() }).reason;
}

/**
 * A date a section gives, as a reader reads it: "Nov 12, 2026"; the text as given when it is no
 * date.
 * @param at - the ISO 8601 text.
 * @returns the words.
 */
function dateWords(at: string): string {
    const date = new Date(at);
    return Number.isNaN(date.getTime())
        ? at
        : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * The rows of a section file's facts in the Add dialog: its name, when it changed, who wrote it,
 * its license, where it was taken from and what it adds; a row the file says nothing of is left out.
 * @param facts - what graphty-element read of the section.
 * @returns the rows, each a label and a value.
 */
export function aboutRows(facts: ProjectFileSection): [string, string][] {
    const { about } = facts;
    const rows: [string, string | undefined][] = [
        ["Name", facts.name],
        ["Modified", about.modified === undefined ? undefined : dateWords(about.modified)],
        ["Authors", about.authors?.map((author) => author.name).join(", ")],
        ["License", about.license],
        ["From", about.from],
        ["Adds", sectionSummary(facts)],
    ];
    return rows.filter((row): row is [string, string] => row[1] !== undefined && row[1] !== "");
}

/** One row of the Needs table: what a section needs, what the open data has for it, and its state. */
export interface NeedRow {
    readonly need: string;
    readonly found: string;
    readonly state: string;
}

/**
 * The Needs table's rows: each column, type, source role and run a section needs, and whether the
 * open data answers it, as graphty-element said.
 * @param facts - what graphty-element read of the section.
 * @returns the rows.
 */
export function needRows(facts: ProjectFileSection): NeedRow[] {
    return facts.needs.map((need) => {
        const label = {
            column: need.name,
            type: `Type ${need.name}`,
            source: `Source ${need.name}`,
            result: `Run ${need.name}`,
        }[need.kind];
        if (need.found === undefined) {
            return { need: label, found: "", state: "" };
        }
        if (need.kind === "result") {
            return { need: label, found: "", state: need.found ? "Bound" : "Waits for the run" };
        }
        return need.found
            ? { need: label, found: need.name, state: "Bound" }
            : { need: label, found: "", state: "Missing" };
    });
}
