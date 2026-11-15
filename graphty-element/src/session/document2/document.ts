/**
 * @file Saving and opening version 2 documents (spec 8): which sections, in which form, held
 * sections written back, and every section applied through its codec as one step.
 * Experimental (`save-files-v2`); `project.save` and `project.open` reach it only with it on.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { RunId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { TransactionOptions } from "../project/Dispatcher";
import type { CannedOutcomes } from "../projectFile";
import { ENGINE_VERSIONS } from "../runs";
import type { GraphSession, ProjectSlice } from "../types";
import { dataBindingOf, elementRefsOf } from "./codecs/dataRefs";
import {
    assembleSection,
    assembleWrapper,
    type DocumentState,
    documentStateOf,
    newDocumentId,
    type ParsedDocument,
    rememberOpened,
    rememberUnknownMembers,
} from "./framing";
import {
    APPLY_ORDER,
    type BindsTo,
    type CodecRegistry,
    DOCUMENT_SECTIONS,
    type DocumentProblem,
    type DocumentSection,
    type ElementRefs,
    type JsonObject,
    type ReadContext,
    type ReadSection,
    type SourceStorage,
    type WriteContext,
} from "./types";

/** What a version 2 save writes. */
export interface SaveChoices {
    /** The sections to write; default every section but results. */
    readonly sections?: readonly DocumentSection[];
    /** `"section"` writes one section as a section file; default `"full"`. */
    readonly form?: "full" | "section";
    /** Add results to the default sections. */
    readonly results?: boolean;
    /** Embed or reference, per source id. */
    readonly embed?: Readonly<Record<string, SourceStorage>>;
    /** The caller's extensions, already checked. */
    readonly extensions?: Readonly<JsonObject>;
}

/** What a version 2 open loads. */
export interface OpenChoices {
    /** The sections of a full file to load; default all. */
    readonly sections?: readonly DocumentSection[];
    /** Whether the behaviors rerun; default true. */
    readonly rerun?: boolean;
    /** Whether a data section replaces the open data or is added; default `"replace"`. */
    readonly dataMode?: "replace" | "add";
    /** Load a bound section written on other data (spec 6.4, "No match"); default false. */
    readonly bindOtherData?: boolean;
}

/** The generator every version 2 save writes. */
const GENERATOR = Object.freeze({ name: "graphty-element", version: ENGINE_VERSIONS.element });

/**
 * The open data's id, minted on first need.
 * @param state - The session's document state.
 * @returns The id.
 */
function dataIdOf(state: DocumentState): string {
    state.dataId ??= newDocumentId();
    return state.dataId;
}

/**
 * The element references, built on first use.
 * @param session - The session.
 * @returns A getter that builds them once.
 */
function lazyRefs(session: GraphSession): () => ElementRefs {
    let refs: ElementRefs | undefined;
    return () => {
        refs ??= elementRefsOf(session);
        return refs;
    };
}

/**
 * The sections a save writes, in file order.
 * @param choices - The saver's choices.
 * @returns The sections.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` for a section file of other than one section, or
 *     a section name that is not one of the seven.
 */
export function sectionsToSave(choices: SaveChoices): DocumentSection[] {
    const asked = choices.sections ?? DOCUMENT_SECTIONS.filter((name) => name !== "results");
    const unknown = asked.find((name) => !DOCUMENT_SECTIONS.includes(name));
    if (unknown !== undefined) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `There is no section named ${unknown}.`,
            source: "data",
            details: { key: "sections", value: unknown, available: [...DOCUMENT_SECTIONS] },
        });
    }

    const chosen = new Set<DocumentSection>(asked);
    if (choices.results === true) {
        chosen.add("results");
    }

    const sections = DOCUMENT_SECTIONS.filter((name) => chosen.has(name));
    if (choices.form === "section" && sections.length !== 1) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "A section file holds exactly one section.",
            source: "data",
            details: { key: "sections", count: sections.length },
        });
    }

    return sections;
}

/**
 * Write the session as a version 2 document.
 * @param session - The session.
 * @param codecs - The codecs.
 * @param choices - What to write.
 * @param isDerived - Whether the element minted a run's id.
 * @returns The document, the section keys written, and what the save reports.
 */
export async function saveDocument2(
    session: GraphSession,
    codecs: CodecRegistry,
    choices: SaveChoices,
    isDerived: (id: RunId) => boolean,
): Promise<{ document: JsonObject; written: string[]; problems: DocumentProblem[] }> {
    const chosen = sectionsToSave(choices);
    const state = documentStateOf(session);
    const now = new Date().toISOString();
    const problems: DocumentProblem[] = [];
    const sections: JsonObject = {};
    const context: WriteContext = {
        session,
        problems,
        refs: lazyRefs(session),
        dataId: () => dataIdOf(state),
        sections: new Set(chosen),
        embed: choices.embed ?? {},
        isDerived,
        async bindsTo(full: boolean): Promise<BindsTo> {
            const data = dataIdOf(state);
            return full ? { data, ...(await dataBindingOf(session)) } : { data };
        },
    };

    for (const name of chosen) {
        const held = state.held.get(name);
        if (held !== undefined) {
            // Written back exactly as read; the session's own content of this kind is not saved.
            sections[name] = held.value;
            const { version } = held.value as { version?: unknown };
            problems.push({
                code: "W_SECTION_KEPT",
                params: { section: name, version: typeof version === "number" ? version : null, reason: held.reason },
            });
            continue;
        }

        const codec = codecs[name];
        if (codec === undefined) {
            continue;
        }

        const written = await codec.write(context);
        const bindsTo = codec.bound ? await context.bindsTo(name === "results") : undefined;
        sections[name] = await assembleSection(
            name,
            codec,
            written,
            {
                generator: GENERATOR,
                ...(name === "data" ? { id: dataIdOf(state) } : {}),
                ...(bindsTo === undefined ? {} : { bindsTo: bindsTo as unknown as JsonObject }),
            },
            state,
            now,
        );
    }

    if (choices.form === "section") {
        const [name] = chosen;
        return { document: sections[name] as JsonObject, written: [...chosen], problems };
    }

    // Unknown sections an opened file held are written back in a full file.
    for (const [key, held] of state.held) {
        if (held.reason === "unknown" && !(key in sections)) {
            sections[key] = held.value;
        }
    }

    const document = assembleWrapper(
        state,
        {
            id: session.project.id,
            name: session.project.name,
            generator: GENERATOR,
            extensions: choices.extensions ?? {},
        },
        sections,
        now,
    );
    return { document, written: Object.keys(sections), problems };
}

/** What `openDocument2` needs from the project that is not the session. */
export interface OpenHooks {
    readonly canned: CannedOutcomes;
    readonly restoreDerived: (id: RunId) => void;
    /**
     * Called before the transaction when the open replaces the data: refuses over unsaved changes,
     * marks the project boundary.
     */
    readonly beforeReplace: () => void;
    /** The project's name, set in the open's transaction when it replaces the data. */
    readonly name: string | null;
}

/**
 * Apply a parsed version 2 document to the session: every chosen section through its codec, in
 * apply order, as one transaction. A data section in replace mode starts the history.
 * @param session - The session.
 * @param codecs - The codecs.
 * @param parsed - The document.
 * @param choices - What to load.
 * @param hooks - What the project lends.
 * @returns Whether the data was replaced, the parts restored and the problems.
 */
export async function openDocument2(
    session: GraphSession,
    codecs: CodecRegistry,
    parsed: ParsedDocument,
    choices: OpenChoices,
    hooks: OpenHooks,
): Promise<{ replaced: boolean; restored: ProjectSlice[]; problems: DocumentProblem[] }> {
    const state = documentStateOf(session);
    const problems: DocumentProblem[] = [...parsed.problems];
    const asked = choices.sections === undefined ? undefined : new Set(choices.sections);
    const chosen = new Map<DocumentSection, ReadSection>(
        [...parsed.sections].filter(([name]) => asked === undefined || asked.has(name)),
    );
    const dataMode = choices.dataMode ?? "replace";
    const data = chosen.get("data");
    const replaced = data !== undefined && dataMode === "replace";
    // A bound section binds to the data this open brings, or to the data already open.
    const openDataId = replaced && typeof data.header.id === "string" ? data.header.id : state.dataId;

    for (const name of [...chosen.keys()]) {
        const section = chosen.get(name);
        const codec = codecs[name];
        if (section === undefined || codec?.bound !== true || choices.bindOtherData === true) {
            continue;
        }

        const bound = section.header.bindsTo?.data;
        if (bound === undefined || bound !== openDataId) {
            problems.push({
                code: "W_DATA_MISMATCH",
                params: { section: name, data: typeof bound === "string" ? bound : null },
            });
            chosen.delete(name);
        }
    }

    if (replaced) {
        hooks.beforeReplace();
    }

    const restored = new Set<ProjectSlice>();
    const loaded = new Set<DocumentSection>(chosen.keys());
    const options: TransactionOptions = {
        fact: { code: replaced ? "project.open" : "document.open", params: replaced ? { name: hooks.name } : {} },
        ...(replaced ? { starts: true } : {}),
    };
    await session.transaction(
        replaced ? "Open project" : "Open document",
        async (tx) => {
            if (replaced) {
                await tx.config.set({ name: hooks.name });
            }

            for (const name of APPLY_ORDER) {
                const section = chosen.get(name);
                const codec = codecs[name];
                if (section === undefined || codec === undefined) {
                    continue;
                }

                const context: ReadContext = {
                    session,
                    problems,
                    // Built after the data loads, so the references are the new data's.
                    refs: lazyRefs(session),
                    dataId: () => openDataId ?? dataIdOf(state),
                    sections: loaded,
                    tx,
                    rerun: choices.rerun ?? true,
                    dataMode,
                    restored,
                    other: (other) => chosen.get(other),
                    canned: hooks.canned,
                    restoreDerived: hooks.restoreDerived,
                };
                await codec.read(section, context);
                rememberUnknownMembers(state, name, section, codec);
            }
        },
        options,
    );

    if (replaced) {
        state.dataId = openDataId ?? newDocumentId();
    }

    await rememberOpened(state, parsed, loaded);
    return { replaced, restored: [...restored], problems };
}
