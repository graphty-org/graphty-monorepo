/**
 * @file Facts about a version 2 save before it is made, and about a version 2 file before it is
 * opened (`project.describe`, `project.inspect`): what each section holds, which are held, how each
 * source would be kept, and which runs an open can rerun. Neutral facts only: counts, codes and
 * ids, never words. Experimental (`save-files-v2`).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { RunId } from "../../catalog/types";
import type { ProjectProblem } from "../projectFile";
import type { CodedFact } from "../shared";
import type { GraphSession } from "../types";
import { sourceChoicesOf } from "./codecs/dataRefs";
import { lazyRefs, sectionsToSave, writeContextOf } from "./document";
import { documentStateOf, type HeldSection, isJsonObject, type ParsedDocument } from "./framing";
import {
    type CodecRegistry,
    DOCUMENT_SECTIONS,
    type DocumentCode,
    type DocumentProblem,
    type DocumentSection,
    HEADER_MEMBERS,
    type JsonObject,
    type SourceStorage,
} from "./types";

/**
 * Why a section is held: a newer `version`, a required `extension`, `data` that cannot be built
 * whole, a known key holding another `kind`, an `unknown` key, a `malformed` value, or a file of
 * several `graphs`. OPEN UNION.
 * @experimental save-files-v2
 * @beta
 */
export type DocumentHeldReason = "version" | "extension" | "data" | "kind" | "unknown" | "malformed" | "graphs";

/**
 * A held section: kept exactly as read and written back on save; the session's own content of
 * its kind is not saved while it is held.
 * @experimental save-files-v2
 * @beta
 */
export interface DocumentHeldFacts {
    /** The section's version, or null when it has none. */
    readonly version: number | null;
    /** The newest version of this section this release reads, or null for a section it does not know. */
    readonly reads: number | null;
    /** Why it is held. */
    readonly reason: DocumentHeldReason;
}

/**
 * What one section holds (spec 3, section 4): its `name` and how many entries each of its body
 * members holds.
 * @experimental save-files-v2
 * @beta
 */
export interface DocumentSectionFacts {
    /** The section. */
    readonly section: DocumentSection;
    /** The section's `name` header member, when it has one. */
    readonly name?: string;
    /** Present when the section is held. */
    readonly held?: DocumentHeldFacts;
    /**
     * Per body member, how many entries it holds: an array's length, an object's member count
     * (`layers`, `palettes`, `commands`, `notes`, `views`, `sets`, `runs`, ...). The data section
     * gives `nodes` and `edges` in place of `graph`.
     */
    readonly counts: Readonly<Record<string, number>>;
}

/**
 * One section as a version 2 save would write it now.
 * @experimental save-files-v2
 * @beta
 */
export interface ProjectSaveSection extends DocumentSectionFacts {
    /** Whether a save with no `sections` option writes it. */
    readonly saved: boolean;
    /**
     * Whether a full file must hold it to be the project. A save without every such section, or a
     * section file, is a copy: it never clears `dirty` or moves the save point.
     */
    readonly required: boolean;
}

/**
 * A source's kind, as a version 2 file records it. OPEN UNION.
 * @experimental save-files-v2
 * @beta
 */
export type ProjectSourceKind = "file" | "url" | "network" | "sample" | "derived" | "reader";

/**
 * One source of the open data, and how a version 2 save keeps it.
 * @experimental save-files-v2
 * @beta
 */
export interface ProjectSourceChoice {
    /**
     * Its record id: a key `embed` and `paths` take, and the `params.source` of the
     * `W_SOURCE_*` codes. `"reader"` is the reader's own changes.
     */
    readonly id: string;
    /** Its load key (`session.data.sources()[i].key`); absent for the reader's own changes. */
    readonly key?: string;
    /** Its name, as the load gave it, else its file name, else its id. */
    readonly name: string;
    /** Where its rows came from. */
    readonly kind: ProjectSourceKind;
    /** Its file format, when known. */
    readonly format?: string;
    /** How a save with no `embed` entry for it keeps it. */
    readonly storage: SourceStorage;
    /** Whether a save asked to reference it (`embed: { [id]: "referenced" }`) would. */
    readonly referable: boolean;
    /** Why asking to reference it would embed it instead: `W_SOURCE_NO_PATH` or `W_SOURCE_EMBEDDED`. */
    readonly refused?: CodedFact<DocumentCode>;
    /** The nodes it supplies. */
    readonly nodes: number;
    /** The edges it supplies. */
    readonly edges: number;
    /** For the reader's own changes: how many operations they hold. */
    readonly operations?: number;
}

/**
 * What a version 2 save of the session would write, asked before saving.
 * @experimental save-files-v2
 * @beta
 */
export interface ProjectSaveFacts {
    /** Every section, in file order. */
    readonly sections: readonly ProjectSaveSection[];
    /** Every source of the open data, the reader's own changes first. */
    readonly sources: readonly ProjectSourceChoice[];
}

/**
 * How a bound section of a file binds (spec 6.4): to the data section of the same file, or to
 * the data open now. A bound section loads when it binds to the data the open leaves open, or
 * with `bindOtherData`.
 * @experimental save-files-v2
 * @beta
 */
export interface DocumentBindFacts {
    /** It was written on the file's own data section. */
    readonly file: boolean;
    /** It was written on the data open in the session now. */
    readonly open: boolean;
}

/**
 * One section of a version 2 file, as read without opening it.
 * @experimental save-files-v2
 * @beta
 */
export interface ProjectFileSection extends DocumentSectionFacts {
    /** The section's version, or null when it has none. */
    readonly version: number | null;
    /** For a dataset-bound section (results, notes, view): what it binds to. */
    readonly binds?: DocumentBindFacts;
}

/**
 * A run an open of the file would start (the view's run records, and `"layout"` for its layout).
 * @experimental save-files-v2
 * @beta
 */
export interface ProjectFileRun {
    /** The run id; `"layout"` for the layout. The key of `ProjectOpenOptions.runs`. */
    readonly id: string;
    /** Its name, when the record has one. */
    readonly name?: string;
    /** The algorithm or layout id. */
    readonly algorithm?: string;
    /** False when it cannot be replayed exactly (it ran narrowed): it never reruns. */
    readonly replayable: boolean;
    /** Whether the file's results section holds its saved results, so it can be restored. */
    readonly restorable: boolean;
}

/**
 * One source a file's data section names.
 * @experimental save-files-v2
 * @beta
 */
export interface ProjectFileSource {
    /** Its record id: the key of `ProjectOpenOptions.files`. */
    readonly id: string;
    /** Its label, else its file name, else its id. */
    readonly name: string;
    /** Where its rows came from. */
    readonly kind: ProjectSourceKind;
    /** Whether the file holds its rows or only refers to them. */
    readonly storage: SourceStorage;
    /** For a referenced source, the address an open fetches it from (with `fetchSources`). */
    readonly url?: string;
    /** For a referenced file source, its path relative to the file (resolved against `location`). */
    readonly path?: string;
}

/**
 * A version 2 file read without opening it (`project.inspect`).
 * @experimental save-files-v2
 * @beta
 */
export interface ProjectFileFacts {
    /** A full file, or a section file of one section. */
    readonly form: "full" | "section";
    /** The full file's name; null for a section file or a file with none. */
    readonly name: string | null;
    /** Every section it holds that this release knows, in file order. */
    readonly sections: readonly ProjectFileSection[];
    /** The runs an open would start, the layout last; empty without a readable view section. */
    readonly runs: readonly ProjectFileRun[];
    /** The sources its data section names, the reader's own changes left out. */
    readonly sources: readonly ProjectFileSource[];
    /** What reading it reported (a migration's codes, held sections, unknown members). */
    readonly problems: readonly ProjectProblem[];
}

/**
 * How many entries each body member holds.
 * @param section - The section.
 * @param value - The section (header and body).
 * @returns The counts.
 */
function countsOf(section: DocumentSection, value: unknown): Record<string, number> {
    const counts: Record<string, number> = {};
    if (!isJsonObject(value)) {
        return counts;
    }

    for (const [member, each] of Object.entries(value)) {
        if ((HEADER_MEMBERS as readonly string[]).includes(member)) {
            continue;
        }

        if (Array.isArray(each)) {
            counts[member] = each.length;
        } else if (isJsonObject(each)) {
            counts[member] = Object.keys(each).length;
        }
    }

    const { graph } = value;
    if (section === "data" && isJsonObject(graph)) {
        delete counts.graph;
        counts.nodes = Array.isArray(graph.nodes) ? graph.nodes.length : 0;
        counts.edges = Array.isArray(graph.links) ? graph.links.length : 0;
    }

    return counts;
}

/**
 * A section's name and counts.
 * @param section - The section.
 * @param value - The section as written or read.
 * @returns The facts.
 */
function sectionFacts(section: DocumentSection, value: unknown): DocumentSectionFacts {
    const name = isJsonObject(value) && typeof value.name === "string" ? value.name : undefined;
    return { section, ...(name === undefined ? {} : { name }), counts: countsOf(section, value) };
}

/**
 * A held section's facts.
 * @param held - The section.
 * @param codecs - The codecs.
 * @param section - Its name.
 * @returns The facts.
 */
function heldFacts(held: HeldSection, codecs: CodecRegistry, section: DocumentSection): DocumentHeldFacts {
    const version = isJsonObject(held.value) && typeof held.value.version === "number" ? held.value.version : null;
    const reads = codecs[section]?.reads;
    return { version, reads: reads === undefined ? null : Math.max(...reads), reason: held.reason };
}

/**
 * What a version 2 save of the session would write: every section's facts as its codec writes it
 * now, and every source's storage choice. Writes nothing and moves no save point.
 * @param session - The session.
 * @param codecs - The codecs.
 * @param isDerived - Whether the element minted a run's id.
 * @returns The facts.
 */
export async function describeSave(
    session: GraphSession,
    codecs: CodecRegistry,
    isDerived: (id: RunId) => boolean,
): Promise<ProjectSaveFacts> {
    const state = documentStateOf(session);
    const saved = new Set(sectionsToSave({}, state));
    const refs = lazyRefs(session);
    const all = new Set(DOCUMENT_SECTIONS);
    const sections: ProjectSaveSection[] = [];
    // ponytail: every codec writes the whole session once per call (the data section copies every
    // row); cache by history position if a dialog calls it often on large graphs.
    for (const section of DOCUMENT_SECTIONS) {
        const flags = { saved: saved.has(section), required: isProjectSection(section) };
        const held = state.held.get(section);
        const codec = codecs[section];
        if (held !== undefined) {
            sections.push({ ...sectionFacts(section, held.value), ...flags, held: heldFacts(held, codecs, section) });
        } else if (codec !== undefined) {
            const context = writeContextOf(session, state, all, {}, isDerived, [], refs);
            const written = await codec.write(context);
            const facts = sectionFacts(section, { ...written.header, ...written.body });
            // The open data's whole graph, referenced rows included.
            const counts =
                section === "data"
                    ? { ...facts.counts, nodes: session.status.counts.nodes, edges: session.status.counts.edges }
                    : facts.counts;
            sections.push({ ...facts, counts, ...flags });
        }
    }

    return { sections, sources: sourceChoicesOf(session) as ProjectSourceChoice[] };
}

/**
 * Whether a full file must hold a section to be the project rather than a copy: every section
 * but results.
 * @param section - The section.
 * @returns True when it must.
 */
export function isProjectSection(section: DocumentSection): boolean {
    return section !== "results";
}

/**
 * A string member, when it is one.
 * @param value - The object.
 * @param member - The member.
 * @returns The string, or undefined.
 */
function stringOf(value: unknown, member: string): string | undefined {
    const each = isJsonObject(value) ? value[member] : undefined;
    return typeof each === "string" ? each : undefined;
}

/**
 * The runs an open of the file would start, from its view section.
 * @param view - The view section's body, when it loads.
 * @param results - The results section's body, when it loads.
 * @returns The runs, the layout last.
 */
function runsOf(view: JsonObject | undefined, results: JsonObject | undefined): ProjectFileRun[] {
    const saved = isJsonObject(results?.runs) ? results.runs : {};
    const runs: ProjectFileRun[] = (Array.isArray(view?.runs) ? view.runs : []).filter(isJsonObject).map((record) => {
        const id = String(record.id);
        const name = stringOf(record, "name");
        const algorithm = stringOf(record, "algorithm");
        return {
            id,
            ...(name === undefined ? {} : { name }),
            ...(algorithm === undefined ? {} : { algorithm }),
            replayable: record.replayable !== false,
            restorable: id in saved,
        };
    });
    if (isJsonObject(view?.layout)) {
        const algorithm = stringOf(view.layout, "algorithm");
        runs.push({
            id: "layout",
            ...(algorithm === undefined ? {} : { algorithm }),
            replayable: true,
            restorable: isJsonObject(results?.layout),
        });
    }

    return runs;
}

/**
 * The sources a file's data section names.
 * @param data - The data section's body.
 * @returns The sources, the reader's own changes left out.
 */
function sourcesOf(data: JsonObject | undefined): ProjectFileSource[] {
    return (Array.isArray(data?.sources) ? data.sources : [])
        .filter((record): record is JsonObject => isJsonObject(record) && record.kind !== "reader")
        .map((record) => {
            const id = String(record.id);
            const url = stringOf(record.origin, "url");
            const path = stringOf(record.origin, "path");
            const storage: SourceStorage = record.copy === undefined ? "referenced" : "embedded";
            return {
                id,
                name: stringOf(record, "label") ?? stringOf(record.origin, "name") ?? id,
                kind: String(record.kind) as ProjectSourceKind,
                storage,
                ...(storage === "referenced" && url !== undefined ? { url } : {}),
                ...(storage === "referenced" && path !== undefined ? { path } : {}),
            };
        });
}

/**
 * One section of a parsed file, loaded or held.
 * @param codecs - The codecs.
 * @param parsed - The file.
 * @param section - The section.
 * @param ids - The file's data id and the open data's id.
 * @param ids.file - The file's data section id.
 * @param ids.open - The open data's id.
 * @returns Its facts, or undefined when the file holds none.
 */
function fileSection(
    codecs: CodecRegistry,
    parsed: ParsedDocument,
    section: DocumentSection,
    ids: { readonly file: string | undefined; readonly open: string | undefined },
): ProjectFileSection | undefined {
    const loads = parsed.sections.get(section);
    const held = parsed.held.get(section);
    const value: unknown = loads === undefined ? held?.value : { ...loads.header, ...loads.body };
    if (value === undefined) {
        return undefined;
    }

    const version = isJsonObject(value) && typeof value.version === "number" ? value.version : null;
    const bound = stringOf(isJsonObject(value) ? value.bindsTo : undefined, "data");
    const binds = (id: string | undefined): boolean => bound !== undefined && bound === id;
    return {
        ...sectionFacts(section, value),
        version,
        ...(held === undefined ? {} : { held: heldFacts(held, codecs, section) }),
        ...(codecs[section]?.bound === true ? { binds: { file: binds(ids.file), open: binds(ids.open) } } : {}),
    };
}

/**
 * A parsed version 2 file's facts, read without applying anything.
 * @param session - The session, for the data open now.
 * @param codecs - The codecs.
 * @param parsed - The file.
 * @param problems - What reading it reported.
 * @returns The facts.
 */
export function describeFile(
    session: GraphSession,
    codecs: CodecRegistry,
    parsed: ParsedDocument,
    problems: readonly DocumentProblem[],
): ProjectFileFacts {
    const data = parsed.sections.get("data");
    const fileDataId = data?.header.id ?? stringOf(parsed.held.get("data")?.value, "id");
    const ids = { file: fileDataId, open: documentStateOf(session).dataId };
    const sections = DOCUMENT_SECTIONS.flatMap((section) => {
        const facts = fileSection(codecs, parsed, section, ids);
        return facts === undefined ? [] : [facts];
    });

    return {
        form: parsed.form,
        name: stringOf(parsed.wrapper, "name") ?? null,
        sections,
        runs: runsOf(parsed.sections.get("view")?.body, parsed.sections.get("results")?.body),
        sources: sourcesOf(data?.body),
        problems,
    };
}
