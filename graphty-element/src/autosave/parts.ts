/**
 * An autosave entry's parts: the project document split by how often each piece changes, so a
 * write rebuilds only what a change touched. Reassembled, the parts are exactly the document
 * `session.project.save()` writes.
 *
 * | Part | Holds |
 * | --- | --- |
 * | `data` | the `graphty-data` member |
 * | `sources` | the `graphty-sources` member, written with `data`; absent when the session holds no load |
 * | `inputs` | what each load the session can read again was read from (a file's bytes included), by load key, written with `data`; never in a project file |
 * | `arrangement` | the `graphty-arrangement` member |
 * | `run:<id>` | one run of the `graphty-results` member (their order is the meta's `runs`) |
 * | `rest` | the document's head, the session, style, notes and view-state members, the results' head, the assets member without its files |
 * | `asset:<sha256>` | the files of one embedded model, or the base64 of one uploaded font, written once per digest |
 * | `stash` | the consumer's stash |
 * | `drafts` | the filter drafts still open, reopened after a restore |
 * | `sourceDraft` | the draft of the sources and steps still open, written with `drafts` and reopened after a restore |
 * | `prepared` | the draft `data.prepare` handed back and still held (a file's bytes included), written with `drafts` and prepared again after a restore |
 * @module autosave
 */

import type { RunId, StyleDocumentFont } from "../catalog/types";
import { assetsMember } from "../session/assets/projectMember";
import type { SavedInput, SavedPrepared, SessionData } from "../session/data";
import { dispatcherOf, sessionRunsOf } from "../session/dispatchers";
import {
    arrangementMember,
    dataMember,
    documentAround,
    type GraphIds,
    graphIdsOf,
    notesMember,
    type ProjectSources,
    requiresOf,
    resultsMember,
    runEntry,
    sessionMember,
    sourcesFileOf,
    styleMember,
    viewStateMember,
} from "../session/projectFile";
import { type SavedSourceDraft, sourceDraftHooks } from "../session/sourceDraftHooks";
import type { GraphSession } from "../session/types";
import { filterDraftHooks, type SavedFilterDraft } from "../session/visibility/draftHooks";
import type { AutosaveEntryMeta, AutosaveParts } from "./types";

/**
 * What a change left unwritten. `runs` rewrites the runs that changed since they were written;
 * `allRuns` rewrites every run (the graph under them changed).
 */
export type PartTag = "data" | "arrangement" | "rest" | "runs" | "allRuns" | "stash" | "drafts";

/** Every part: what a new entry, or a change to the graph, has to write. */
export const EVERY_PART: readonly PartTag[] = ["data", "arrangement", "rest", "runs", "allRuns", "stash", "drafts"];

/** The `rest` part. */
interface RestPart {
    readonly head: Record<string, unknown>;
    readonly session: Record<string, unknown>;
    readonly results: Record<string, unknown>;
    /** The style member, each font's `data` in its own `asset:<sha256>` part. */
    readonly style: Record<string, unknown>;
    readonly notes: Record<string, unknown>;
    readonly viewState: Record<string, unknown>;
    /** The assets member, each entry's files in its own `asset:<sha256>` part. */
    readonly assets?: Record<string, unknown>;
}

/** A part could not be built: its text is over the engine's string length limit. */
export class PartTooLarge extends Error {
    /**
     * Name the part that could not be built.
     * @param part - The part.
     * @param cause - What building it threw.
     */
    constructor(
        readonly part: string,
        cause: unknown,
    ) {
        super(`autosave could not build the ${part} part`, { cause });
        this.name = "PartTooLarge";
    }
}

/** What a build wrote: the parts, and the run entries now in the store. */
export interface BuiltParts {
    readonly parts: Record<string, string | null>;
    /** The run entries the build wrote, by id; a run removed maps to undefined. */
    readonly runs: ReadonlyMap<RunId, unknown>;
    /** The finished runs, in the results member's order. */
    readonly order: readonly RunId[];
    /** The digests whose `asset:` parts the store holds after this build; undefined when `rest` was not built. */
    readonly assets?: ReadonlySet<string>;
}

/**
 * The member builders' sources for a session.
 * @param session - The session.
 * @returns Its sources.
 */
function sourcesOf(session: GraphSession): ProjectSources {
    const runs = sessionRunsOf(session);
    return { session, dispatcher: dispatcherOf(session), isDerived: (id) => runs.isDerivedId(id) };
}

/**
 * Build one part, naming it when it throws.
 * @param part - The part.
 * @param build - Builds its text.
 * @returns The text.
 */
function attempt(part: string, build: () => string): string {
    try {
        return build();
    } catch (error) {
        // The engine's string length limit is a RangeError; anything else is not about size.
        throw error instanceof RangeError ? new PartTooLarge(part, error) : error;
    }
}

/**
 * Build the `rest` part, an `asset:` part for each model file set not yet in the store, and a
 * null (delete) for each stored `asset:` part no model holds any more.
 * @param session - The session.
 * @param sources - The session's project sources.
 * @param idsNow - The session's graph ids, built on first use.
 * @param parts - The parts being built, written into.
 * @param writtenAssets - The digests whose `asset:` parts are already in the store.
 * @returns The digests the session's models hold.
 */
function buildRestPart(
    session: GraphSession,
    sources: ProjectSources,
    idsNow: () => GraphIds,
    parts: Record<string, string | null>,
    writtenAssets: ReadonlySet<string>,
): Set<string> {
    const held = new Set<string>();
    parts.rest = attempt("rest", () => {
        // Each model's files once, in a part of their own: a style change rewrites none of them.
        // Autosave embeds everything, whatever the reader chose to keep by URL in a saved file.
        const { member } = assetsMember(session, "embed-all");
        const entries = ((member?.assets ?? []) as Record<string, unknown>[]).map(({ files, ...entry }) => {
            const digest = entry.sha256 as string;
            if (files !== undefined) {
                held.add(digest);
                if (!writtenAssets.has(digest)) {
                    parts[`asset:${digest}`] = attempt(`asset:${digest}`, () => JSON.stringify(files));
                }
            }

            return entry;
        });
        // Each font's bytes once, in the same kind of part: a style change rewrites none of them.
        const style = styleMember(session);
        const fonts = (style.fonts as StyleDocumentFont[] | undefined)?.map(({ data, ...font }) => {
            held.add(font.sha256);
            if (!writtenAssets.has(font.sha256)) {
                parts[`asset:${font.sha256}`] = attempt(`asset:${font.sha256}`, () => JSON.stringify(data));
            }

            return font;
        });
        const rest: RestPart = {
            head: documentAround(session, [], {}),
            session: sessionMember(sources),
            results: resultsMember(session, []),
            style: fonts === undefined ? style : { ...style, fonts },
            notes: notesMember(session),
            viewState: viewStateMember(session, idsNow),
            ...(member === null ? {} : { assets: { ...member, assets: entries } }),
        };
        return JSON.stringify(rest);
    });
    for (const digest of writtenAssets) {
        if (!held.has(digest)) {
            parts[`asset:${digest}`] = null;
        }
    }

    return held;
}

/**
 * Build a `run:` part for each finished run that is new or changed (or every one), and a null
 * (delete) for each stored run that is no longer finished.
 * @param sources - The session's project sources.
 * @param all - Whether every finished run is rewritten.
 * @param written - The run entries already in the store, by id.
 * @param parts - The parts being built, written into.
 * @param runs - The run entries the parts hold, written into.
 */
function buildRunParts(
    sources: ProjectSources,
    all: boolean,
    written: ReadonlyMap<RunId, unknown>,
    parts: Record<string, string | null>,
    runs: Map<RunId, unknown>,
): void {
    const finished = sources.dispatcher.state.runs;
    for (const [id, entry] of finished) {
        if (all || written.get(id) !== entry) {
            parts[`run:${id}`] = attempt(`run:${id}`, () => JSON.stringify(runEntry(sources, id)));
            runs.set(id, entry);
        }
    }

    for (const id of written.keys()) {
        if (!finished.has(id)) {
            parts[`run:${id}`] = null;
            runs.set(id, undefined);
        }
    }
}

/**
 * The `data` part and, written with it because the data member reads the load records too, the
 * `sources` part. Every change to the records marks the data part unwritten (`Autosaver`).
 * @param session - The session.
 * @returns The parts; `sources` is null when the session holds no load.
 */
function dataParts(session: GraphSession): Record<string, string | null> {
    const file = sourcesFileOf(session);
    const member = file?.member ?? null;
    const inputs = (session.data as Partial<Pick<SessionData, "savedInputs">>).savedInputs?.() ?? {};
    return {
        data: attempt("data", () => JSON.stringify(dataMember(session, file))),
        sources: member === null ? null : attempt("sources", () => JSON.stringify(member)),
        inputs: Object.keys(inputs).length === 0 ? null : attempt("inputs", () => JSON.stringify(inputs)),
    };
}

/** The parts kept apart from the graph, which a drawn source draft leaves as they are. */
export const APART: ReadonlySet<PartTag> = new Set<PartTag>(["drafts", "stash"]);

/**
 * Whether a source draft's After is drawn on the graph.
 * @param session - The session.
 * @returns True while one is.
 */
export function draftIsDrawn(session: GraphSession): boolean {
    return (session.data as Partial<Pick<SessionData, "draftIsDrawn">>).draftIsDrawn?.() === true;
}

/**
 * Build the parts a set of tags names, from the session as it is now.
 * @param session - The session.
 * @param tags - What is unwritten.
 * @param written - The run entries already in the store, by id.
 * @param stash - The consumer's stash.
 * @param writtenAssets - The digests whose `asset:` parts are already in the store.
 * @returns The parts, and the run entries they hold.
 * @throws {PartTooLarge} when a part cannot be built.
 */
export function buildParts(
    session: GraphSession,
    tags: ReadonlySet<PartTag>,
    written: ReadonlyMap<RunId, unknown>,
    stash: ReadonlyMap<string, unknown>,
    writtenAssets: ReadonlySet<string> = new Set(),
): BuiltParts {
    const build = (): BuiltParts => partsNow(session, tags, written, stash, writtenAssets);
    const data = session.data as Partial<Pick<SessionData, "withoutDrawnDraft">>;
    // A source draft's After drawn on the graph is no part of the project; the drafts are kept apart.
    const ofTheGraph = [...tags].some((tag) => !APART.has(tag));
    return ofTheGraph && data.withoutDrawnDraft !== undefined ? data.withoutDrawnDraft(build) : build();
}

/**
 * Build the parts from the session as it is drawn.
 * @param session - The session.
 * @param tags - What is unwritten.
 * @param written - The run entries already in the store, by id.
 * @param stash - The consumer's stash.
 * @param writtenAssets - The digests whose `asset:` parts are already in the store.
 * @returns The parts, and the run entries they hold.
 */
function partsNow(
    session: GraphSession,
    tags: ReadonlySet<PartTag>,
    written: ReadonlyMap<RunId, unknown>,
    stash: ReadonlyMap<string, unknown>,
    writtenAssets: ReadonlySet<string>,
): BuiltParts {
    const sources = sourcesOf(session);
    const finished = sources.dispatcher.state.runs;
    const parts: Record<string, string | null> = tags.has("data") ? dataParts(session) : {};

    const runs = new Map<RunId, unknown>();
    let ids: GraphIds | undefined;
    const idsNow = (): GraphIds => (ids ??= graphIdsOf(session));

    if (tags.has("arrangement")) {
        parts.arrangement = attempt("arrangement", () => JSON.stringify(arrangementMember(session, idsNow())));
    }

    const assets = tags.has("rest") ? buildRestPart(session, sources, idsNow, parts, writtenAssets) : undefined;

    if (tags.has("runs") || tags.has("allRuns")) {
        buildRunParts(sources, tags.has("allRuns"), written, parts, runs);
    }

    if (tags.has("stash")) {
        parts.stash = attempt("stash", () => JSON.stringify(Object.fromEntries(stash)));
    }

    if (tags.has("drafts")) {
        parts.drafts = attempt("drafts", () => JSON.stringify(filterDraftHooks(session.visibility)?.saved() ?? []));
        parts.sourceDraft = attempt("sourceDraft", () =>
            JSON.stringify(sourceDraftHooks(session.data)?.saved() ?? null),
        );
        const prepared = (session.data as Partial<Pick<SessionData, "savedPrepared">>).savedPrepared?.() ?? null;
        parts.prepared = prepared === null ? null : attempt("prepared", () => JSON.stringify(prepared));
    }

    return { parts, runs, order: [...finished.keys()], ...(assets === undefined ? {} : { assets }) };
}

/**
 * Read one part's text.
 * @param parts - The entry's parts.
 * @param name - The part.
 * @returns Its text.
 * @throws {TypeError} when the part is missing or is not text.
 */
function textOf(parts: AutosaveParts, name: string): string {
    const value = parts[name];
    if (typeof value !== "string") {
        throw new TypeError(`the autosave entry has no ${name} part`);
    }

    return value;
}

/**
 * Put an entry's parts back together as the project document.
 * @param meta - The entry's meta, whose `runs` orders the results.
 * @param parts - Its parts.
 * @returns The document `project.save()` would have written.
 * @throws {Error} when a part is missing or malformed.
 */
export function reassemble(meta: AutosaveEntryMeta, parts: AutosaveParts): Record<string, unknown> {
    // ponytail: parse and stringify again; join the texts if a restore's memory peak matters.
    const rest = JSON.parse(textOf(parts, "rest")) as RestPart;
    const order = Array.isArray(meta.runs) ? (meta.runs as string[]) : [];
    const runs = order.map((id) => JSON.parse(textOf(parts, `run:${id}`)) as unknown);
    // The first entry of each digest carries its files, as `project.save()` writes them.
    const seen = new Set<string>();
    const assets =
        rest.assets === undefined
            ? []
            : [
                  {
                      ...rest.assets,
                      assets: (rest.assets.assets as Record<string, unknown>[]).map((entry) => {
                          const digest = entry.sha256 as string;
                          if (seen.has(digest)) {
                              return entry;
                          }

                          seen.add(digest);
                          return { ...entry, files: JSON.parse(textOf(parts, `asset:${digest}`)) as unknown };
                      }),
                  },
              ];
    const fonts = rest.style.fonts as Record<string, unknown>[] | undefined;
    const style =
        fonts === undefined
            ? rest.style
            : {
                  ...rest.style,
                  fonts: fonts.map((font) => ({
                      ...font,
                      data: JSON.parse(textOf(parts, `asset:${String(font.sha256)}`)) as unknown,
                  })),
              };
    const members = [
        JSON.parse(textOf(parts, "data")) as Record<string, unknown>,
        rest.session,
        JSON.parse(textOf(parts, "arrangement")) as Record<string, unknown>,
        { ...rest.results, runs },
        style,
        rest.notes,
        rest.viewState,
        ...assets,
        ...(typeof parts.sources === "string" ? [JSON.parse(parts.sources) as Record<string, unknown>] : []),
    ];
    return { ...rest.head, requires: requiresOf(members), members };
}

/**
 * The consumer's stash an entry holds.
 * @param parts - The entry's parts.
 * @returns The stash, by name.
 */
export function stashOf(parts: AutosaveParts): Map<string, unknown> {
    const text = parts.stash;
    return new Map(typeof text === "string" ? Object.entries(JSON.parse(text) as Record<string, unknown>) : []);
}

/**
 * The open filter drafts an entry holds; an entry written before drafts were kept holds none.
 * @param parts - The entry's parts.
 * @returns The drafts.
 */
export function draftsOf(parts: AutosaveParts): SavedFilterDraft[] {
    const text = parts.drafts;
    return typeof text === "string" ? (JSON.parse(text) as SavedFilterDraft[]) : [];
}

/**
 * The open source draft an entry holds; an entry written before source drafts were kept holds none.
 * @param parts - The entry's parts.
 * @returns The draft, or null.
 */
export function sourceDraftOf(parts: AutosaveParts): SavedSourceDraft | null {
    const text = parts.sourceDraft;
    return typeof text === "string" ? (JSON.parse(text) as SavedSourceDraft | null) : null;
}

/**
 * The prepared draft an entry holds; an entry written before prepared drafts were kept holds none.
 * @param parts - The entry's parts.
 * @returns The draft as kept, or null.
 */
export function preparedOf(parts: AutosaveParts): SavedPrepared | null {
    const text = parts.prepared;
    return typeof text === "string" ? (JSON.parse(text) as SavedPrepared) : null;
}

/**
 * What each load an entry holds was read from; an entry written before inputs were kept holds none.
 * @param parts - The entry's parts.
 * @returns The inputs, by load key.
 */
export function inputsOf(parts: AutosaveParts): Record<string, SavedInput> {
    const text = parts.inputs;
    return typeof text === "string" ? (JSON.parse(text) as Record<string, SavedInput>) : {};
}
