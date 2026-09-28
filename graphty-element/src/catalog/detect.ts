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
 * 2. DISAMBIGUATION. When more than one claims the extension, the claimants whose content check
 *    says yes come first -- the element's own in graph-io's ranking, then registrations in
 *    registration order -- and the rest follow; if none says yes, the order of tier 1 stands.
 *    This is what tells GraphML from GEXF in a `.xml` file, and it is something a plugin can
 *    express, instead of a branch hard-coded in a private function.
 * 3. CONTENT. With no extension match, the element's own formats are ranked by graph-io's
 *    sniffers (the same `sniff` each graph-io importer publishes), then the plugins' are asked.
 *
 * THE ELEMENT DOES NOT SNIFF ITS OWN FORMATS. graph-io's importers define what each format is, so
 * the test of whether bytes are GraphML is the GraphML importer's own; a second set of regular
 * expressions here would drift from what the importers accept.
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
 */

import {
    csvImporter,
    dotImporter,
    gexfImporter,
    gmlImporter,
    type GraphImporter,
    graphmlImporter,
    jsonImporter,
    neo4jImporter,
    pajekImporter,
    rankFormats,
} from "@graphty/graph-io";

import { GraphtyError } from "../errors";
import { registeredFormats } from "./formatRegistry";
import { FORMAT_DESCRIPTORS, UNSERVED_FORMAT_IDS } from "./formats";
import type { FormatId } from "./types";

/** What is known about the file: its name, its first bytes, or both. */
export interface DetectionInput {
    /** The file name, with its extension. */
    readonly filename?: string;
    /** The first bytes of the file, as text. A few kilobytes is plenty. */
    readonly sample?: string;
}

/**
 * The graph-io importers behind the element's built-in formats, in graph-io's registry order,
 * which is also its tie-break order when two recognise the same bytes equally well.
 *
 * NEO4J IS THE ELEMENT'S "csv". The element has no separate Neo4j format: its CSV reader takes
 * neo4j-admin files as a variant. So a neo4j-admin header is answered "csv".
 */
const BUILT_IN_IMPORTERS: readonly { id: FormatId; importer: GraphImporter }[] = [
    { id: "json", importer: jsonImporter },
    { id: "graphml", importer: graphmlImporter },
    { id: "gexf", importer: gexfImporter },
    { id: "csv", importer: csvImporter },
    { id: "gml", importer: gmlImporter },
    { id: "dot", importer: dotImporter },
    { id: "pajek", importer: pajekImporter },
    { id: "csv", importer: neo4jImporter },
];

/**
 * How sure a graph-io sniffer must be before the element names its format from content alone.
 *
 * Below this a sniffer is tolerating the bytes, not recognising them: graph-io's GraphML answers
 * 0.05 for any XML prolog and its CSV answers 0.3 for any consistently delimited rows, which
 * includes a line of prose split at its spaces. Answering either would hand a file the element
 * cannot read to a reader that then reports a parse error instead of "unknown format". The cost
 * is that a headerless table is recognised by its extension (`.csv`, `.tsv`, `.tab`), not by its
 * content.
 */
const MIN_CONTENT_CONFIDENCE = 0.5;

/**
 * The element's built-in formats that recognise the bytes, best first, as graph-io's sniffers
 * rank them.
 * @param sample - The first bytes of the file.
 * @returns The format ids, best first, each once.
 */
function sniffBuiltIns(sample: string): FormatId[] {
    const ranked = rankFormats(
        { head: sample },
        BUILT_IN_IMPORTERS.map((entry) => entry.importer),
    ).filter((result) => result.content >= MIN_CONTENT_CONFIDENCE);
    const ids = ranked.map((result) => BUILT_IN_IMPORTERS.find((entry) => entry.importer.format === result.format)?.id);

    return [...new Set(ids.filter((id): id is FormatId => id !== undefined))];
}

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
            // The built-ins in graph-io's ranking, then the plugins that say yes, in claimant order.
            const confirmed = [
                ...sniffBuiltIns(sample).filter((id) => claimants.includes(id)),
                ...registered
                    .filter((entry) => claimants.includes(entry.descriptor.id))
                    .filter((entry) => entry.detect !== undefined && claims(entry.detect, sample))
                    .map((entry) => entry.descriptor.id),
            ];

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

    const byContent = sniffBuiltIns(sample);

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
    // A deprecated built-in name is still offered by `FormatId`, so it is not unknown: say why it
    // cannot be read instead.
    const unserved = UNSERVED_FORMAT_IDS.find((entry) => entry.id === name);
    const refusal =
        unserved === undefined ? `no format is named "${name}".` : `the format "${name}" cannot be read: ${unserved.reason}`;

    return new GraphtyError({
        code: "E_UNKNOWN_FORMAT",
        message:
            `${refusal} The formats this element can read are: ${available.join(", ")}. ` +
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
