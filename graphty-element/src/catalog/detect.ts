/**
 * @file Deciding which format a file is, published rather than module-private.
 *
 * WHY THIS IS PUBLISHED. Detection used to be a private function inside the data directory, so a
 * consumer that needed to know what it had been handed -- to label a drop target, to warn before
 * a large import, to choose a reader -- had to reimplement an extension table and a content
 * sniffer of its own. `@graphty/graphty` did exactly that, in two files, which under this
 * repository's rules is a bug report that was never filed.
 *
 * THE ORDER, STATED RATHER THAN IMPLIED BY AN IF-CHAIN.
 *
 * 1. EXTENSION. Every format whose descriptor claims the file's extension, the element's own
 *    first, then registrations in registration order.
 * 2. DISAMBIGUATION. When more than one claims the extension, each claimant's `detect` is asked
 *    in that same order and the first yes wins; if none says yes, the first claimant wins. This
 *    is what makes the `.xml` case -- GraphML against GEXF, told apart by namespace -- something
 *    a plugin can express, instead of a branch hard-coded in a private function.
 * 3. CONTENT. With no extension match, the built-in sniffers are asked in a fixed order (CSV
 *    last, because its pattern is the loosest), then the plugins'.
 *
 * PLUGIN DETECTORS RUN STRICTLY AFTER EVERY BUILT-IN DETECTOR, so a plugin can only claim a file
 * the element could not already read. A plugin that wants a file the element also claims does so
 * by extension, where the ambiguity is explicit and both formats are offered. A detector that
 * throws is caught and treated as "no": a sniffer is a guess about somebody else's bytes, and a
 * guess that fails is an answer rather than a failed import.
 *
 * `detectFormats` returning a ranked list is what ends the disagreement between a detector that
 * answers one format and `formatsForExtension` that answers an array: the ranking is the same
 * order in both, and the single answer is its first entry.
 *
 * ONE KNOWN GAP, NAMED HERE RATHER THAN LEFT TO BE FOUND. `.xml` is claimed by GraphML's
 * descriptor and by nothing else, so a GEXF file saved as `.xml` reaches tier 1 with a single
 * claimant and is answered "graphml" -- where the private function this replaces read the
 * namespace and answered "gexf". Closing it is a one-line change to GEXF's descriptor, which
 * makes both formats claim the extension and lets tier 2 tell them apart by namespace exactly as
 * the order above describes; it also changes what `formatsForExtension(".xml")` answers, which is
 * pinned. This module is not what decides a built-in's extensions, so the change belongs beside
 * that table and its test rather than here.
 */

import { GraphtyError } from "../errors";
import { registeredFormats } from "./formatRegistry";
import { FORMAT_DESCRIPTORS } from "./formats";
import type { FormatId } from "./types";

/** What is known about the file: its name, its first bytes, or both. */
export interface DetectionInput {
    /** The file name, with its extension. */
    readonly filename?: string;
    /** The first bytes of the file, as text. A few kilobytes is plenty. */
    readonly sample?: string;
}

/**
 * The element's own content sniffers, in the order they are asked.
 *
 * CSV IS LAST because its pattern -- a word, a comma, a word -- matches the first line of a great
 * many files that are not CSV. Ordering is the whole of the policy here; each individual test is
 * as narrow as the format allows.
 */
/**
 * Whether the bytes are an XML document, which only the element's two XML formats may claim.
 *
 * GML's sniffer looks for `graph [` ANYWHERE in the sample and CSV's looks for `word , word` at
 * the start of ANY line, and both of those appear inside perfectly ordinary XML that is neither
 * GraphML nor GEXF. The detector this module replaced could not make that mistake: a sample
 * beginning with `<` was answered GraphML, GEXF or nothing at all, and it never reached the
 * plain-text tests. Keeping that answer is what stops an XML document the element cannot read
 * from being handed to the CSV reader, where "I do not recognise this file" would come back as a
 * parse error about a column instead.
 *
 * It guards only the two loose sniffers. JSON, Pajek and DOT anchor their tests to the start of
 * the sample, so a document beginning with `<` cannot reach them anyway.
 * @param sample - The first bytes of the file, trimmed.
 * @returns Whether the sample opens an XML document.
 */
function isXmlDocument(sample: string): boolean {
    return sample.startsWith("<");
}

const BUILT_IN_DETECTORS: readonly { id: FormatId; detect: (sample: string) => boolean }[] = [
    { id: "graphml", detect: (sample) => sample.includes('xmlns="http://graphml.graphdrawing.org') },
    { id: "gexf", detect: (sample) => sample.includes('xmlns="http://gexf.net') },
    { id: "json", detect: (sample) => sample.startsWith("{") || sample.startsWith("[") },
    { id: "gml", detect: (sample) => !isXmlDocument(sample) && /graph\s*\[/i.test(sample) },
    { id: "pajek", detect: (sample) => /^\*vertices/i.test(sample) },
    { id: "dot", detect: (sample) => /^\s*(strict\s+)?(di)?graph\s+/i.test(sample) },
    { id: "csv", detect: (sample) => !isXmlDocument(sample) && /^[\w-]+\s*,\s*[\w-]+/m.test(sample) },
];

/**
 * Ask one sniffer, treating a throw as a no.
 * @param detect - The sniffer.
 * @param sample - The bytes to look at.
 * @returns Whether the format claims the file.
 */
function claims(detect: (sample: string) => boolean, sample: string): boolean {
    try {
        return detect(sample);
    } catch {
        return false;
    }
}

/**
 * The extension of a file name, lower-cased and with its dot.
 * @param filename - The file name.
 * @returns The extension, or null when the name has none.
 */
function extensionOf(filename: string): string | null {
    return /\.[^.]+$/.exec(filename.toLowerCase())?.[0] ?? null;
}

/**
 * Every format that could read this file, best first.
 *
 * A ranked list rather than one answer, because an extension two formats claim is a real
 * ambiguity: a consumer can offer both rather than being handed a guess with the alternative
 * thrown away.
 * @param input - The file name, the first bytes, or both.
 * @returns The format ids, best first. Empty when nothing recognises the file.
 */
export function detectFormats(input: DetectionInput): readonly FormatId[] {
    const sample = input.sample?.trim() ?? "";
    const registered = registeredFormats();

    const extension = input.filename === undefined ? null : extensionOf(input.filename);
    if (extension !== null) {
        const claimants: FormatId[] = [
            ...FORMAT_DESCRIPTORS.filter((descriptor) => descriptor.extensions.includes(extension)).map(
                (descriptor) => descriptor.id,
            ),
            ...registered
                .filter((entry) => entry.descriptor.extensions.includes(extension))
                .map((entry) => entry.descriptor.id),
        ];

        if (claimants.length > 1 && sample !== "") {
            const sniffers = new Map<FormatId, (candidate: string) => boolean>([
                ...BUILT_IN_DETECTORS.map((entry) => [entry.id, entry.detect] as const),
                ...registered
                    .filter((entry) => entry.detect !== undefined)
                    .map((entry) => [entry.descriptor.id, entry.detect] as [FormatId, (candidate: string) => boolean]),
            ]);

            const confirmed = claimants.filter((id) => {
                const detect = sniffers.get(id);

                return detect !== undefined && claims(detect, sample);
            });

            if (confirmed.length > 0) {
                return Object.freeze([...confirmed, ...claimants.filter((id) => !confirmed.includes(id))]);
            }
        }

        if (claimants.length > 0) {
            return Object.freeze(claimants);
        }
    }

    if (sample === "") {
        return Object.freeze([]);
    }

    const byContent: FormatId[] = BUILT_IN_DETECTORS.filter((entry) => claims(entry.detect, sample)).map(
        (entry) => entry.id,
    );

    for (const entry of registered) {
        const {detect} = entry;
        if (detect !== undefined && claims(detect, sample) && !byContent.includes(entry.descriptor.id)) {
            byContent.push(entry.descriptor.id);
        }
    }

    return Object.freeze(byContent);
}

/**
 * The format that can read this file.
 * @param input - The file name, the first bytes, or both.
 * @returns The format id, or null when nothing recognises the file.
 */
export function detectFormat(input: DetectionInput): FormatId | null {
    return detectFormats(input)[0] ?? null;
}

/**
 * Every format that can be named right now: the element's own, then the registered ones.
 *
 * THE REGISTERED ONES ARE IN IT, and that is the whole reason this exists rather than a literal
 * list of the seven built-ins. A reader who registered a format, mistyped its name, and was then
 * shown a list their own format is missing from would conclude the registration had not taken --
 * and go and debug the wrong thing.
 * @returns The ids, the element's own first.
 */
function knownFormatIds(): readonly FormatId[] {
    return [...FORMAT_DESCRIPTORS.map((descriptor) => descriptor.id), ...registeredFormats().map((entry) => entry.descriptor.id)];
}

/**
 * The refusal for a format name nothing answers to.
 *
 * A CODE RATHER THAN A SENTENCE. This used to be a `TypeError` in one place and a plain `Error`
 * naming a hard-coded list of the element's own seven in two others, so a consumer whose format
 * WAS registered could still be told the element supports seven formats and theirs is not one.
 * `details.available` is read from the catalogue, so it names whatever this page actually has.
 * @param name - The format name the caller asked for.
 * @returns The error to throw.
 */
export function unknownFormat(name: string): GraphtyError {
    const available = knownFormatIds();

    return new GraphtyError({
        code: "E_UNKNOWN_FORMAT",
        message:
            `no format is named "${name}". The formats this element can read are: ${available.join(", ")}. ` +
            "A format of your own is registered with `DataSource.register`.",
        source: "data",
        details: { format: name, available: [...available] },
    });
}

/**
 * The refusal for a file nothing recognised.
 * @param describes - How to name the thing that was not recognised, such as a file name or a url.
 * @param hint - The call that would have settled it, written the way a caller would type it.
 * @returns The error to throw.
 */
export function undetectedFormat(describes: string, hint: string): GraphtyError {
    const available = knownFormatIds();

    return new GraphtyError({
        code: "E_UNKNOWN_FORMAT",
        message:
            `nothing recognised the format of "${describes}". The formats this element can read are: ` +
            `${available.join(", ")}. Name one explicitly: ${hint}`,
        source: "data",
        details: { source: describes, available: [...available] },
    });
}
