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
    canonicalText,
    type DocumentState,
    documentStateOf,
    type HeldSection,
    isJsonObject,
    newDocumentId,
    type ParsedDocument,
    plainNumbers,
    rememberOpened,
    rememberUnknownMembers,
} from "./framing";
import { forgetDocument, whileOpening } from "./memory";
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
    type SectionCodec,
    type SectionWrite,
    type SourceStorage,
    type WriteContext,
} from "./types";

/** What a version 2 save writes. */
export interface SaveChoices {
    /**
     * The sections to write; default every section but results, and results too when the file the
     * project was opened from had them (spec 8.1 rule 5).
     */
    readonly sections?: readonly DocumentSection[];
    /** `"section"` writes one section as a section file; default `"full"`. */
    readonly form?: "full" | "section";
    /** Add results to the default sections. */
    readonly results?: boolean;
    /** Embed or reference, per source id. */
    readonly embed?: Readonly<Record<string, SourceStorage>>;
    /** The caller's extensions, already checked. */
    readonly extensions?: Readonly<JsonObject>;
    /** Write the recipe from the session even when one was opened from a file; default false. */
    readonly rewriteRecipe?: boolean;
}

/** What a version 2 open loads. */
export interface OpenChoices {
    /** The sections of a full file to load; default all. */
    readonly sections?: readonly DocumentSection[];
    /** Whether the behaviors rerun; default true. */
    readonly rerun?: boolean;
    /** The rerun choice per run id, over `rerun` (spec 8.2 rule 3). */
    readonly runs?: Readonly<Record<string, boolean>>;
    /** Apply a recipe section to the data instead of only keeping it (spec 8.2 rule 4); default false. */
    readonly applyRecipe?: boolean;
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
 * The context a codec writes in.
 * @param session - The session.
 * @param state - The session's document state.
 * @param sections - The sections written.
 * @param embed - The saver's embed choices.
 * @param isDerived - Whether the element minted a run's id.
 * @param problems - Where the codecs report.
 * @param refs - The element references, built once per save.
 * @param rewriteRecipe - Whether the saver asked for the recipe from the session.
 * @returns The context.
 */
function writeContextOf(
    session: GraphSession,
    state: DocumentState,
    sections: ReadonlySet<DocumentSection>,
    embed: Readonly<Record<string, SourceStorage>>,
    isDerived: (id: RunId) => boolean,
    problems: DocumentProblem[],
    refs: () => ElementRefs = lazyRefs(session),
    rewriteRecipe = false,
): WriteContext {
    return {
        session,
        problems,
        refs,
        dataId: () => dataIdOf(state),
        sections,
        embed,
        rewriteRecipe,
        isDerived,
        bindsTo: (): Promise<BindsTo> => Promise.resolve({ data: dataIdOf(state) }),
        buildStamp: () => dataBindingOf(session),
    };
}

/** The header members a codec owns (`SectionHeaderInput`), in the order the spec writes them. */
const CODEC_HEADER = [
    "id",
    "name",
    "description",
    "authors",
    "license",
    "keywords",
    "language",
    "dependencies",
    "origin",
] as const;

/**
 * A section as read, in the form a codec writes.
 * @param section - The section.
 * @returns Its codec-owned header members and its body.
 */
function asWritten(section: ReadSection): SectionWrite {
    const header: Record<string, unknown> = {};
    for (const member of CODEC_HEADER) {
        if (section.header[member] !== undefined) {
            header[member] = section.header[member];
        }
    }

    return { header, body: section.body };
}

/**
 * Remember, after a project open, what each loaded section's codec writes now beside the section
 * as read, so a save that finds the session unchanged writes the section as read (spec 8.5: what
 * this release cannot represent is kept). Saved results are not remembered when the runs reran:
 * the saved outputs may disagree with the session's.
 * @param session - The session.
 * @param codecs - The codecs.
 * @param sections - The loaded sections.
 * @param rerun - Whether the open reran the behaviors.
 * @param isDerived - Whether the element minted a run's id.
 */
async function rememberBaselines(
    session: GraphSession,
    codecs: CodecRegistry,
    sections: ReadonlyMap<DocumentSection, ReadSection>,
    rerun: boolean,
    isDerived: (id: RunId) => boolean,
): Promise<void> {
    const state = documentStateOf(session);
    state.opened.clear();
    // ponytail: one extra write per section at open; skip the data section's if its write is slow on large graphs.
    const context = writeContextOf(session, state, new Set(sections.keys()), {}, isDerived, []);
    for (const [name, section] of sections) {
        const codec = codecs[name];
        if (codec === undefined || (name === "results" && rerun)) {
            continue;
        }

        try {
            state.opened.set(name, {
                baseline: canonicalText(await codec.write(context)),
                read: asWritten(section),
                ...(section.header.bindsTo === undefined ? {} : { bindsTo: section.header.bindsTo }),
            });
        } catch {
            // A section its codec cannot write now is written fresh, or refused, at save.
        }
    }
}

/**
 * The sections a save writes, in file order.
 * @param choices - The saver's choices.
 * @param state - The session's document state, for what the opened file held.
 * @returns The sections.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` for a section file of other than one section, or
 *     a section name that is not one of the seven.
 */
function sectionsToSave(choices: SaveChoices, state: DocumentState): DocumentSection[] {
    const asked =
        choices.sections ?? DOCUMENT_SECTIONS.filter((name) => name !== "results" || state.hadResults === true);
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
 * One section as a save writes it: the codec's write, or the section as read when the session has
 * not changed it since the open (`rememberBaselines`), framed.
 * @param name - The section.
 * @param codec - Its codec.
 * @param context - The save's context; its problems are this save's report.
 * @param state - The session's document state.
 * @param now - The time of this save.
 * @returns The section.
 */
async function writeSection(
    name: DocumentSection,
    codec: SectionCodec,
    context: WriteContext,
    state: DocumentState,
    now: string,
): Promise<JsonObject> {
    // The codec reports into its own list, dropped when the section is written as read.
    const reported: DocumentProblem[] = [];
    let written = await codec.write({ ...context, problems: reported });
    const opened = state.opened.get(name);
    const asRead = opened?.baseline === canonicalText(written) ? opened : undefined;
    if (asRead === undefined) {
        context.problems.push(...reported);
    } else {
        written = asRead.read;
    }

    // A bound section's `bindsTo` is `{ data }` alone (spec 6.4); a results run carries its own
    // build and copy ids.
    const bindsTo = codec.bound ? await context.bindsTo() : undefined;
    return assembleSection(
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
    const state = documentStateOf(session);
    const chosen = sectionsToSave(choices, state);
    const now = new Date().toISOString();
    const problems: DocumentProblem[] = [];
    const sections: JsonObject = {};
    const refs = lazyRefs(session);

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
        if (codec !== undefined) {
            const context = writeContextOf(
                session,
                state,
                new Set(chosen),
                choices.embed ?? {},
                isDerived,
                problems,
                refs,
                choices.rewriteRecipe === true,
            );
            sections[name] = await writeSection(name, codec, context, state, now);
        }
    }

    if (choices.form === "section") {
        const [name] = chosen;
        return { document: plainNumbers(sections[name] as JsonObject), written: [...chosen], problems };
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
    return { document: plainNumbers(document), written: Object.keys(sections), problems };
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
    /** Whether the element minted a run's id; default none. */
    readonly isDerived?: (id: RunId) => boolean;
}

/**
 * Leave out each bound section written on other data than the open's (spec 6.4, "No match").
 * @param chosen - The sections to load; the ones left out are deleted.
 * @param codecs - The codecs.
 * @param openDataId - The id of the data the open binds to.
 * @param problems - Where `W_DATA_MISMATCH` is reported.
 */
function dropOtherData(
    chosen: Map<DocumentSection, ReadSection>,
    codecs: CodecRegistry,
    openDataId: string | undefined,
    problems: DocumentProblem[],
): void {
    for (const [name, section] of [...chosen]) {
        const bound = section.header.bindsTo?.data;
        if (codecs[name]?.bound === true && (bound === undefined || bound !== openDataId)) {
            problems.push({
                code: "W_DATA_MISMATCH",
                params: { section: name, data: typeof bound === "string" ? bound : null },
            });
            chosen.delete(name);
        }
    }
}

/**
 * When a full file's data section is held, its bound sections written on that data are held with
 * it, verbatim, so the next save writes them back beside it (spec 8.5).
 * @param chosen - The sections to load; the ones held are deleted.
 * @param codecs - The codecs.
 * @param dataId - The held data section's id.
 * @param problems - Where `W_SECTION_KEPT` is reported.
 * @returns The held sections, by key.
 */
function holdBoundTo(
    chosen: Map<DocumentSection, ReadSection>,
    codecs: CodecRegistry,
    dataId: string | undefined,
    problems: DocumentProblem[],
): Map<string, HeldSection> {
    const held = new Map<string, HeldSection>();
    for (const [name, section] of [...chosen]) {
        if (codecs[name]?.bound === true && dataId !== undefined && section.header.bindsTo?.data === dataId) {
            held.set(name, { value: section.header, reason: "data" });
            problems.push({
                code: "W_SECTION_KEPT",
                params: { section: name, version: section.header.version, reason: "data" },
            });
            chosen.delete(name);
        }
    }

    return held;
}

/**
 * The id of a data section, loaded or held.
 * @param data - The section to load, if any.
 * @param held - The section held, if any.
 * @returns Its `id`, when it has one.
 */
function dataSectionId(data: ReadSection | undefined, held: HeldSection | undefined): string | undefined {
    if (data !== undefined) {
        return data.header.id;
    }

    const id = isJsonObject(held?.value) ? held.value.id : undefined;
    return typeof id === "string" ? id : undefined;
}

/**
 * Apply a parsed version 2 document to the session: every chosen section through its codec, in
 * apply order, as one transaction. A data section in replace mode, loaded or held, opens a project
 * and starts the history; a held one clears the old data and holds the sections bound to it.
 * @param session - The session.
 * @param codecs - The codecs.
 * @param parsed - The document.
 * @param choices - What to load.
 * @param hooks - What the project lends.
 * @returns Whether the data was replaced, the parts restored and the problems.
 */
export function openDocument2(
    session: GraphSession,
    codecs: CodecRegistry,
    parsed: ParsedDocument,
    choices: OpenChoices,
    hooks: OpenHooks,
): Promise<{ replaced: boolean; restored: ProjectSlice[]; problems: DocumentProblem[] }> {
    return whileOpening(session, () => applyDocument(session, codecs, parsed, choices, hooks));
}

/**
 * `openDocument2`, inside `whileOpening`.
 * @param session - The session.
 * @param codecs - The codecs.
 * @param parsed - The document.
 * @param choices - What to load.
 * @param hooks - What the project lends.
 * @returns Whether the data was replaced, the parts restored and the problems.
 */
async function applyDocument(
    session: GraphSession,
    codecs: CodecRegistry,
    parsed: ParsedDocument,
    choices: OpenChoices,
    hooks: OpenHooks,
): Promise<{ replaced: boolean; restored: ProjectSlice[]; problems: DocumentProblem[] }> {
    const problems: DocumentProblem[] = [...parsed.problems];
    const asked = choices.sections === undefined ? undefined : new Set(choices.sections);
    const chosen = new Map<DocumentSection, ReadSection>(
        [...parsed.sections].filter(([name]) => asked === undefined || asked.has(name)),
    );
    const dataMode = choices.dataMode ?? "replace";
    const data = chosen.get("data");
    const heldData = asked === undefined || asked.has("data") ? parsed.held.get("data") : undefined;
    // A file carrying a data section opens a project, whether its data loads or is held.
    const replaced = dataMode === "replace" && (data !== undefined || heldData !== undefined);
    // A bound section binds to the data this open brings, or to the data already open.
    const openDataId = replaced ? dataSectionId(data, heldData) : documentStateOf(session).dataId;
    const heldBound = replaced && data === undefined ? holdBoundTo(chosen, codecs, openDataId, problems) : new Map();

    if (choices.bindOtherData !== true) {
        dropOtherData(chosen, codecs, openDataId, problems);
    }

    if (replaced) {
        hooks.beforeReplace();
        // Nothing the open project held, kept or stamped reaches the new one.
        forgetDocument(session);
    }

    const state = documentStateOf(session);
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

            if (replaced && data === undefined) {
                // The held data is the project's: the old project's data does not stay under it.
                await tx.data.clear();
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
                    buildStamp: () => dataBindingOf(session),
                    sections: loaded,
                    tx,
                    rerun: choices.rerun ?? true,
                    rerunOf: (id) => choices.runs?.[id],
                    applyRecipe: choices.applyRecipe === true,
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
        await rememberBaselines(session, codecs, chosen, choices.rerun ?? true, hooks.isDerived ?? (() => false));
    }

    await rememberOpened(state, parsed, loaded, replaced ? new Map([...parsed.held, ...heldBound]) : undefined);
    return { replaced, restored: [...restored], problems };
}
