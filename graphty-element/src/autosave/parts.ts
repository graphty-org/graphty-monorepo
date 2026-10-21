/**
 * An autosave entry's parts: the project document split by how often each piece changes, so a
 * write rebuilds only what a change touched. Reassembled, the parts are exactly the document
 * `session.project.save()` writes.
 *
 * | Part | Holds |
 * | --- | --- |
 * | `data` | the `graphty-data` member |
 * | `sources` | the `graphty-sources` member, written with `data`; absent when the session holds no load |
 * | `arrangement` | the `graphty-arrangement` member |
 * | `run:<id>` | one run of the `graphty-results` member (their order is the meta's `runs`) |
 * | `rest` | the document's head, the session, style, notes and view-state members, the results' head |
 * | `stash` | the consumer's stash |
 * @module autosave
 */

import type { RunId } from "../catalog/types";
import { dispatcherOf, sessionRunsOf } from "../session/GraphSession";
import {
    arrangementMember,
    dataMember,
    documentAround,
    type GraphIds,
    graphIdsOf,
    notesMember,
    type ProjectSources,
    resultsMember,
    runEntry,
    sessionMember,
    sourcesFileOf,
    styleMember,
    viewStateMember,
} from "../session/projectFile";
import type { GraphSession } from "../session/types";
import type { AutosaveEntryMeta, AutosaveParts } from "./types";

/**
 * What a change left unwritten. `runs` rewrites the runs that changed since they were written;
 * `allRuns` rewrites every run (the graph under them changed).
 */
export type PartTag = "data" | "arrangement" | "rest" | "runs" | "allRuns" | "stash";

/** Every part: what a new entry, or a change to the graph, has to write. */
export const EVERY_PART: readonly PartTag[] = ["data", "arrangement", "rest", "runs", "allRuns", "stash"];

/** The `rest` part. */
interface RestPart {
    readonly head: Record<string, unknown>;
    readonly session: Record<string, unknown>;
    readonly results: Record<string, unknown>;
    readonly style: Record<string, unknown>;
    readonly notes: Record<string, unknown>;
    readonly viewState: Record<string, unknown>;
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
 * The `data` part and, written with it because the data member reads the load records too, the
 * `sources` part. Every change to the records marks the data part unwritten (`Autosaver`).
 * @param session - The session.
 * @returns The parts; `sources` is null when the session holds no load.
 */
function dataParts(session: GraphSession): Record<string, string | null> {
    const file = sourcesFileOf(session);
    const member = file?.member ?? null;
    return {
        data: attempt("data", () => JSON.stringify(dataMember(session, file))),
        sources: member === null ? null : attempt("sources", () => JSON.stringify(member)),
    };
}

/**
 * Build the parts a set of tags names, from the session as it is now.
 * @param session - The session.
 * @param tags - What is unwritten.
 * @param written - The run entries already in the store, by id.
 * @param stash - The consumer's stash.
 * @returns The parts, and the run entries they hold.
 * @throws {PartTooLarge} when a part cannot be built.
 */
export function buildParts(
    session: GraphSession,
    tags: ReadonlySet<PartTag>,
    written: ReadonlyMap<RunId, unknown>,
    stash: ReadonlyMap<string, unknown>,
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

    if (tags.has("rest")) {
        parts.rest = attempt("rest", () => {
            const rest: RestPart = {
                head: documentAround(session, [], {}),
                session: sessionMember(sources, idsNow),
                results: resultsMember(session, []),
                style: styleMember(session),
                notes: notesMember(session),
                viewState: viewStateMember(session, idsNow),
            };
            return JSON.stringify(rest);
        });
    }

    if (tags.has("runs") || tags.has("allRuns")) {
        for (const [id, entry] of finished) {
            if (tags.has("allRuns") || written.get(id) !== entry) {
                parts[`run:${id}`] = attempt(`run:${id}`, () => JSON.stringify(runEntry(sources, id, idsNow())));
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

    if (tags.has("stash")) {
        parts.stash = attempt("stash", () => JSON.stringify(Object.fromEntries(stash)));
    }

    return { parts, runs, order: [...finished.keys()] };
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
    return {
        ...rest.head,
        members: [
            JSON.parse(textOf(parts, "data")) as unknown,
            rest.session,
            JSON.parse(textOf(parts, "arrangement")) as unknown,
            { ...rest.results, runs },
            rest.style,
            rest.notes,
            rest.viewState,
            ...(typeof parts.sources === "string" ? [JSON.parse(parts.sources) as unknown] : []),
        ],
    };
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
