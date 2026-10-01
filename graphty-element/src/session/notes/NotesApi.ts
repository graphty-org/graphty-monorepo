/**
 * @file `session.notes`: the reads, the three write doors and `note:changed`.
 *
 * The records live in the `notes` slice of the session's dispatcher; every write door dispatches
 * one `note.*` command through it, so each write is one undoable step, joins a transaction it is
 * made in, and is refused before anything changes. `note:changed` is the diff of the slice,
 * published once per touched note after each change of it, as `set:changed` is for the sets.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { EdgeId, EdgeMember, ResultId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import type { NoteCommand } from "../commands/notes";
import type { Dispatcher } from "../project/Dispatcher";
import type { NoteEntry } from "../project/state";
import { canonicalize } from "../runs/runId";
import { supportedTarget, writeMember } from "./document";
import { bindable, edgeRowsOf, nodeRowOf, statusOf, type StatusSources } from "./status";
import type { Note, NoteChange, NoteId, NoteInput, NotePatch, NotesApi, NotesReport, NoteTarget } from "./types";
import { refuseNote, targetKey } from "./validate";

/** What the notes read of the session beside their slice. */
interface NotesDependencies {
    /** The dispatcher whose `notes` slice holds the records. */
    readonly dispatcher: Dispatcher;
    /** What a status reads, and what a write checks a result against. */
    readonly status: StatusSources;
    /** The stable form of a session edge id, or undefined when the graph does not hold it. */
    edgeMember(id: EdgeId): EdgeMember | undefined;
    /** Told each committed change, after the write. */
    onChange(change: NoteChange): void;
}

/** The target kinds this release knows. */
const KINDS = ["graph", "node", "edge", "set", "result", "item"] as const;

/**
 * A target's kind: the known key it carries, or its first key.
 * @param target - The target.
 * @returns The kind.
 */
function kindOf(target: NoteTarget): string {
    return KINDS.find((kind) => Object.hasOwn(target, kind)) ?? Object.keys(target)[0] ?? "";
}

/**
 * The keys a `list` filter target matches: its own, and for an item with no run, any run of it.
 * @param raw - The filter target.
 * @param edgeMember - Reads a session edge id.
 * @returns The key, or undefined for a filter that names nothing.
 */
function filterKey(raw: unknown, edgeMember: (id: EdgeId) => EdgeMember | undefined): string | undefined {
    if (typeof raw !== "object" || raw === null) {
        return undefined;
    }

    const target = raw as Record<string, unknown>;
    try {
        if (typeof target.edge === "string") {
            const member = edgeMember(target.edge);
            return member === undefined ? undefined : targetKey({ edge: member });
        }

        if (typeof target.item === "object" && target.item !== null && !Object.hasOwn(target.item, "run")) {
            return runlessKey(target as NoteTarget);
        }

        return targetKey(target as NoteTarget);
    } catch {
        // A value with no canonical form names nothing a note can hold.
        return undefined;
    }
}

/**
 * The key of an item target without its run.
 * @param target - An item target.
 * @returns The key.
 */
function runlessKey(target: NoteTarget): string {
    const { item } = target as { readonly item: { readonly result: string; readonly key: unknown } };
    return `item:${canonicalize({ result: item.result, key: item.key })}`;
}

/**
 * Newest first: by time, compared as instants, then by id.
 * @param left - One note.
 * @param right - The other.
 * @returns The order.
 */
function newestFirst(left: Note, right: Note): number {
    const by = Date.parse(right.time) - Date.parse(left.time);
    if (by !== 0 || left.id === right.id) {
        return by;
    }

    return left.id < right.id ? 1 : -1;
}

/**
 * What happened to a note between two reads of the slice.
 * @param before - The record before, if any.
 * @param after - The record after, if any.
 * @returns The change.
 */
function changeOf(before: Note | undefined, after: Note | undefined): NoteChange["change"] {
    if (before === undefined) {
        return "created";
    }

    return after === undefined ? "removed" : "updated";
}

/**
 * The rows each note's node and edge targets bind in a snapshot, with one edge binding pass for
 * all of them.
 * @param notes - The notes.
 * @param snapshot - The snapshot.
 * @returns Per note, per target: the row, negative when unbound, undefined for other kinds.
 */
function rowsOf(notes: readonly Note[], snapshot: GraphSnapshot): (number | undefined)[][] {
    const binds = notes.map(bindable);
    const edges = notes.flatMap((note, at) =>
        note.targets.flatMap((target, index) => (binds[at][index] && "edge" in target ? [target.edge] : [])),
    );
    const edgeRows = edgeRowsOf(snapshot, edges);
    let next = 0;
    return notes.map((note, at) =>
        note.targets.map((target, index) => {
            if (!binds[at][index]) {
                return undefined;
            }

            return "node" in target ? nodeRowOf(snapshot, target.node) : edgeRows[next++];
        }),
    );
}

/**
 * Build `session.notes`.
 * @param dependencies - The dispatcher and what the reads look at.
 * @returns The notes.
 */
export function createNotesApi(dependencies: NotesDependencies): NotesApi {
    const { dispatcher } = dependencies;
    const entries = (): ReadonlyMap<NoteId, NoteEntry> => dispatcher.state.notes;
    const notes = (): Note[] => [...entries().values()].map((entry) => entry.note);
    // Into the transaction open around the call, when there is one; a refusal throws here.
    const dispatch = (command: NoteCommand): void => {
        void dispatcher.dispatchNow(command);
    };
    // The id the last `note.add` minted, and what the last `note.merge` did, told by their bodies.
    let added: NoteId | undefined;
    let merged: Omit<NotesReport, "missing"> | undefined;
    dispatcher.services.notes = {
        edgeMember: (id: EdgeId) => dependencies.edgeMember(id),
        result: (id: ResultId) => dependencies.status.result(id),
        added: (id: NoteId) => {
            added = id;
        },
        merged: (report) => {
            merged = report;
        },
    };

    // `note:changed`: the diff of the slice since the listeners were last told.
    let told = new Map(entries());
    let { position } = dispatcher.history;
    const beside = dispatcher.events.project;
    dispatcher.events.project = (change) => {
        beside?.(change);
        if (!change.slices.includes("notes")) {
            return;
        }

        const was = told;
        told = new Map(entries());
        const moved = dispatcher.history.position < position ? "undo" : "redo";
        ({ position } = dispatcher.history);
        if (change.cause === "rollback") {
            return;
        }

        const cause = change.cause === "restore" ? moved : change.cause;
        for (const id of new Set([...was.keys(), ...told.keys()])) {
            const before = was.get(id)?.note;
            const after = told.get(id)?.note;
            if (before === after) {
                continue;
            }

            const fields =
                before === undefined || after === undefined
                    ? []
                    : (["text", "targets", "cites", "mediaType", "extensions"] as const).filter(
                          (field) => before[field] !== after[field],
                      );
            if (before !== undefined && after !== undefined && fields.length === 0) {
                continue;
            }

            const event: NoteChange = Object.freeze({
                id,
                change: changeOf(before, after),
                fields: Object.freeze(fields),
                note: after ?? null,
                cause,
            });
            try {
                dependencies.onChange(event);
            } catch {
                // A listener's failure is the listener's; the write has committed.
            }
        }
    };

    const api: NotesApi = {
        list(options = {}) {
            let found = notes();
            if (options.target !== undefined) {
                const wanted = new Set(
                    (Array.isArray(options.target) ? options.target : [options.target]).map((target: unknown) =>
                        filterKey(target, (edge) => dependencies.edgeMember(edge)),
                    ),
                );
                found = found.filter((note) =>
                    note.targets.some(
                        (target) =>
                            supportedTarget(target) &&
                            (wanted.has(targetKey(target)) || ("item" in target && wanted.has(runlessKey(target)))),
                    ),
                );
            }

            if (options.targetKind !== undefined) {
                found = found.filter((note) => note.targets.some((target) => kindOf(target) === options.targetKind));
            }

            if (options.cites !== undefined) {
                found = found.filter((note) => note.cites?.some((cite) => cite.result === options.cites) === true);
            }

            if (options.author !== undefined) {
                found = found.filter((note) => note.author === options.author);
            }

            if (options.missing !== undefined) {
                // ponytail: one edge binding pass per note with edge targets; batch through
                // `rowsOf` if a notes panel filters thousands of edge notes this way.
                const wantMissing = options.missing;
                const held = entries();
                found = found.filter(
                    (note) =>
                        statusOf(held.get(note.id) ?? { note }, dependencies.status).targets.some(
                            (target) => target.state === "missing",
                        ) === wantMissing,
                );
            }

            return Object.freeze(found.sort(newestFirst));
        },

        get: (id) => entries().get(id)?.note,

        status(id) {
            const entry = entries().get(id);
            if (entry === undefined) {
                throw refuseNote("E_BAD_COMMAND", "unknown-id", `No note has the id ${JSON.stringify(id)}.`, { id });
            }

            return statusOf(entry, dependencies.status);
        },

        authors() {
            const authors = new Set<string>();
            for (const note of notes().sort(newestFirst).reverse()) {
                if (note.author !== undefined) {
                    authors.add(note.author);
                }
            }

            return Object.freeze([...authors]);
        },

        counts() {
            const all = notes();
            const snapshot = dependencies.status.snapshot();
            const nodes = new Set<number>();
            const edges = new Set<number>();
            rowsOf(all, snapshot).forEach((rows, at) => {
                rows.forEach((row, index) => {
                    if (row !== undefined && row >= 0) {
                        ("node" in all[at].targets[index] ? nodes : edges).add(row);
                    }
                });
            });

            return Object.freeze({ notes: all.length, nodes: nodes.size, edges: edges.size });
        },

        add(input: NoteInput): NoteId {
            added = undefined;
            dispatch({ op: "note.add", note: input });
            if (added === undefined) {
                throw new GraphtyError({
                    code: "E_INTERNAL",
                    message: "note.add did not write a note as it was dispatched.",
                    source: "data",
                });
            }

            return added;
        },

        update(id: NoteId, patch: NotePatch): void {
            dispatch({ op: "note.update", id, patch });
        },

        remove(id: NoteId): void {
            dispatch({ op: "note.remove", id });
        },

        toDocument: (options = {}) => writeMember(notes(), options),

        mergeDocument(document, options) {
            merged = undefined;
            dispatch({ op: "note.merge", document, ...(options === undefined ? {} : { options }) });
            // Set by the merge's body during the dispatch, which flow analysis cannot see.
            const report = merged as Omit<NotesReport, "missing"> | undefined;
            if (report === undefined) {
                throw new GraphtyError({
                    code: "E_INTERNAL",
                    message: "note.merge did not report as it was dispatched.",
                    source: "data",
                });
            }

            const held = entries();
            const missing = [...report.added, ...report.replaced].filter((id) => {
                const entry = held.get(id);
                return (
                    entry !== undefined &&
                    statusOf(entry, dependencies.status).targets.some((target) => target.state === "missing")
                );
            }).length;
            const freeze = <T>(list: readonly T[]): readonly T[] => Object.freeze([...list]);
            return Object.freeze({
                added: freeze(report.added),
                unchanged: report.unchanged,
                renamed: freeze(report.renamed.map((pair) => Object.freeze({ ...pair }))),
                older: freeze(report.older),
                replaced: freeze(report.replaced),
                kept: freeze(report.kept),
                missing,
                skipped: freeze(report.skipped),
                notices: freeze(report.notices),
            });
        },
    };

    return Object.freeze(api);
}
