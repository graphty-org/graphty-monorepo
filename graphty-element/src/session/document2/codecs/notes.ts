/**
 * @file The `notes` section codec, version 2: people's notes on the graph, its elements, sets and results (spec 4.6).
 * Experimental (`save-files-v2`).
 *
 * The session keeps notes in their version 1 record form (a node by id, an edge by its stable
 * member). This codec translates targets to and from element references at the file boundary and
 * hands the notes to `notes.mergeDocument` through the open's transaction, so a note is checked,
 * kept and undone exactly as a version 1 note is.
 *
 * A reference that binds nowhere is kept in the session as read (it reads `unsupported` there) and
 * written back unchanged; one that bound when opened but binds nothing at save is written back as
 * it was read (`originals`).
 */

import type { EdgeId, EdgeMember } from "../../../catalog/types";
import { isGraphtyError } from "../../../errors/GraphtyError";
import { dispatcherOf } from "../../dispatchers";
import { supportedCite, supportedTarget } from "../../notes/document";
import type { Note, NoteTarget } from "../../notes/types";
import { unknownFields } from "../../notes/validate";
import { canonicalize } from "../../runs/runId";
import { projectMemory } from "../memory";
import type {
    DocumentProblem,
    ElementRefs,
    JsonObject,
    ReadContext,
    ReadSection,
    SectionCodec,
    SectionHeaderInput,
    WriteContext,
} from "../types";
import { fileIdsOf, fileSetId } from "./viewParts";

/** The header members this codec owns, kept as read so a re-save writes them back. */
const OWN_HEADER = [
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

/** Each session's notes header as last read. */
const headers = projectMemory<SectionHeaderInput>();

/** A note opened from a version 2 file, by its session record: its targets as the file held them. */
const originals = new WeakMap<Note, readonly unknown[]>();

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * A reference that binds nowhere.
 * @param pointer - Where it is.
 * @param ref - The reference.
 * @returns The problem.
 */
const unbound = (pointer: string, ref: unknown): DocumentProblem => ({
    code: "W_REFERENCE_UNBOUND",
    params: { section: "notes", pointer, ref: canonicalize(ref) },
});

/**
 * A target the session kept as read (a version 2 reference that did not bind then, or a kind this
 * release does not know): rebound if the data now holds it, else as read.
 * @param target - The target.
 * @param refs - The element references.
 * @returns The target to write.
 */
function rebound(target: NoteTarget, refs: ElementRefs): unknown {
    const raw = target as Record<string, unknown>;
    if (Object.keys(raw).length !== 1) {
        return target;
    }

    if (isObject(raw.node)) {
        const id = refs.node(raw.node);
        const ref = id === undefined ? undefined : refs.nodeRef(id);
        return ref === undefined ? target : { node: ref };
    }

    if (isObject(raw.edge) && Object.hasOwn(raw.edge, "load")) {
        const id = refs.edge(raw.edge);
        const ref = id === undefined ? undefined : refs.edgeRef(id);
        return ref === undefined ? target : { edge: ref };
    }

    return target;
}

/**
 * One session target as a version 2 target.
 * @param target - The session target.
 * @param refs - The element references.
 * @param edgeId - The session id of an edge target's edge, worked out beforehand.
 * @param session - The session, for the file id of a set.
 * @returns The target, or undefined when it names an element the graph does not hold.
 */
function targetOut(target: NoteTarget, refs: ElementRefs, edgeId: EdgeId | undefined, session: object): unknown {
    if (!supportedTarget(target)) {
        return rebound(target, refs);
    }

    if ("node" in target) {
        const ref = refs.nodeRef(target.node);
        return ref === undefined ? undefined : { node: ref };
    }

    if ("edge" in target) {
        const ref = edgeId === undefined ? undefined : refs.edgeRef(edgeId);
        return ref === undefined ? undefined : { edge: ref };
    }

    if ("set" in target) {
        // A set is named by its file id, `set_` plus a ULID (spec 4.6).
        return { set: fileSetId(session, target.set) };
    }

    if ("item" in target) {
        // Version 2 items name the run by the result's run id; the pinned run is not written.
        return { item: { result: target.item.result, key: target.item.key } };
    }

    return target;
}

/**
 * Whether a written target still names an element by a reference that binds nowhere.
 * @param target - The target as written.
 * @param refs - The element references.
 * @returns True when it does.
 */
function isUnboundRef(target: unknown, refs: ElementRefs): boolean {
    if (!isObject(target) || Object.keys(target).length !== 1) {
        return false;
    }

    if (isObject(target.node)) {
        return refs.node(target.node) === undefined;
    }

    return isObject(target.edge) && Object.hasOwn(target.edge, "load") && refs.edge(target.edge) === undefined;
}

/**
 * One session note as a version 2 note.
 * @param note - The note.
 * @param at - Its pointer in the section.
 * @param refs - The element references.
 * @param edgeIds - The session ids of its edge targets, by target index.
 * @param problems - Where unbound references are reported.
 * @param session - The session, for set file ids.
 * @returns The note, or undefined when none of its targets can be written.
 */
function noteOut(
    note: Note,
    at: string,
    refs: ElementRefs,
    edgeIds: ReadonlyMap<number, EdgeId | undefined>,
    problems: DocumentProblem[],
    session: object,
): JsonObject | undefined {
    const read = originals.get(note);
    const was = read?.length === note.targets.length ? read : undefined;
    const targets: unknown[] = [];
    note.targets.forEach((target, t) => {
        const out = targetOut(target, refs, edgeIds.get(t), session) ?? was?.[t];
        if (out === undefined) {
            // A session target on an element gone from the graph has no reference to write.
            problems.push(unbound(`${at}/targets/${String(t)}`, target));
            return;
        }

        if (isUnboundRef(out, refs)) {
            problems.push(unbound(`${at}/targets/${String(targets.length)}`, out));
        }

        targets.push(out);
    });
    if (targets.length === 0) {
        return undefined;
    }

    const cites = note.cites?.map((cite) => (supportedCite(cite) ? { result: cite.result } : cite));
    const out: JsonObject = {
        id: note.id,
        time: new Date(note.time).toISOString(),
        ...(note.edited === undefined ? {} : { edited: new Date(note.edited).toISOString() }),
        targets,
        text: note.text,
        ...(note.mediaType === undefined ? {} : { mediaType: note.mediaType }),
        ...(note.author === undefined ? {} : { author: note.author }),
        ...(note.done === undefined ? {} : { done: new Date(note.done).toISOString() }),
        ...(cites === undefined ? {} : { cites }),
        ...(note.extensions === undefined ? {} : { extensions: note.extensions }),
        ...unknownFields(note),
    };
    return out;
}

/**
 * Write the session's notes, oldest first (by time, then id).
 * @param context - The save.
 * @returns The section's header members and body.
 */
function write(context: WriteContext): Promise<{ header: SectionHeaderInput; body: JsonObject }> {
    const { session, problems } = context;
    const refs = context.refs();
    const notes = session.notes.toDocument().notes.map((saved) => session.notes.get(saved.id) ?? saved);
    // Every edge target of every note, bound to session edge ids in one pass.
    const at: { note: number; target: number }[] = [];
    const members: EdgeMember[] = [];
    notes.forEach((note, n) => {
        note.targets.forEach((target, t) => {
            if ("edge" in target && supportedTarget(target)) {
                at.push({ note: n, target: t });
                members.push(target.edge);
            }
        });
    });
    const ids = members.length === 0 ? [] : (dispatcherOf(session).services.edgeIdentity?.idsOf(members) ?? []);
    const edgeIds = notes.map(() => new Map<number, EdgeId | undefined>());
    at.forEach((place, k) => edgeIds[place.note].set(place.target, ids[k]));

    const out: JsonObject[] = [];
    notes.forEach((note, n) => {
        const pointer = `/notes/${String(out.length)}`;
        const written = noteOut(note, pointer, refs, edgeIds[n], problems, session);
        if (written === undefined) {
            problems.push(unbound(pointer, { note: note.id }));
        } else {
            out.push(written);
        }
    });
    return Promise.resolve({ header: headers.get(session) ?? {}, body: { notes: out } });
}

/**
 * One version 2 target as the session holds it: a bound reference as the element's id, anything
 * else as read.
 * @param target - The target as read.
 * @param pointer - Where it is.
 * @param context - The open.
 * @returns The session target.
 */
function targetIn(target: unknown, pointer: string, context: ReadContext): unknown {
    if (!isObject(target) || Object.keys(target).length !== 1) {
        return target;
    }

    if (typeof target.set === "string") {
        // A file set id binds to the session set opened under it; any other stays as read.
        const opened = [...fileIdsOf(context.session).sets].find(([, file]) => file === target.set);
        return opened === undefined ? target : { set: opened[0] };
    }

    const refs = context.refs();
    if (isObject(target.node)) {
        const id = refs.node(target.node);
        if (id === undefined) {
            context.problems.push(unbound(pointer, target.node));
            return target;
        }

        return { node: id };
    }

    if (isObject(target.edge)) {
        const id = refs.edge(target.edge);
        const member = id === undefined ? undefined : dispatcherOf(context.session).services.edgeIdentity?.member(id);
        if (member === undefined) {
            context.problems.push(unbound(pointer, target.edge));
            return target;
        }

        return { edge: member };
    }

    return target;
}

/**
 * One note as read, its targets in the session's form.
 * @param note - The note as the file holds it.
 * @param at - Its pointer.
 * @param context - The open.
 * @returns The note.
 */
function noteIn(note: unknown, at: string, context: ReadContext): unknown {
    if (!isObject(note) || !Array.isArray(note.targets)) {
        return note;
    }

    const targets = note.targets.map((target: unknown, t) => targetIn(target, `${at}/targets/${String(t)}`, context));
    return { ...note, targets };
}

/**
 * Report what the merge skipped (`E_BAD_DOCUMENT`) and the unknown members it found.
 * @param report - The merge's report.
 * @param report.skipped - What it skipped.
 * @param report.notices - What it noticed.
 * @param pointer - The section's pointer.
 * @param problems - Where to report.
 */
function reportMerge(
    report: {
        readonly skipped: readonly { what: string }[];
        readonly notices: readonly { code: string; what: string }[];
    },
    pointer: string,
    problems: DocumentProblem[],
): void {
    for (const skipped of report.skipped) {
        problems.push({ code: "E_BAD_DOCUMENT", params: { section: "notes", pointer: `${pointer}${skipped.what}` } });
    }

    for (const notice of report.notices) {
        if (notice.code === "W_UNKNOWN_MEMBER") {
            problems.push({
                code: "W_UNKNOWN_MEMBER",
                params: { section: "notes", pointer: `${pointer}${notice.what}` },
            });
        }
    }
}

/**
 * Apply a notes section: every note added through the open's transaction.
 * @param section - The section.
 * @param context - The open.
 * @returns When the notes are added.
 */
function read(section: ReadSection, context: ReadContext): Promise<void> {
    const { session, problems } = context;
    headers.set(
        session,
        Object.fromEntries(
            OWN_HEADER.flatMap((member) =>
                section.header[member] === undefined ? [] : [[member, section.header[member]]],
            ),
        ),
    );
    const base = `${section.pointer}/notes`;
    const { notes } = section.body;
    if (!Array.isArray(notes)) {
        problems.push({ code: "E_BAD_DOCUMENT", params: { section: "notes", pointer: base } });
        return Promise.resolve();
    }

    const translated = notes.map((note: unknown, n) => noteIn(note, `${base}/${String(n)}`, context));
    // An edge bound by position or by a made-up id is written by its place among its pair, as a
    // load of this graph counts it, so the merge binds it.
    const notesOf = dispatcherOf(session).services.notes?.saved(translated as Note[]) ?? (translated as Note[]);

    let report;
    try {
        report = context.tx.notes.mergeDocument({ kind: "graphty-notes", version: 1, notes: notesOf });
    } catch (error) {
        if (!isGraphtyError(error)) {
            throw error;
        }

        problems.push({ code: "E_BAD_DOCUMENT", params: { section: "notes", pointer: base, reason: error.code } });
        return Promise.resolve();
    }

    reportMerge(report, section.pointer, problems);

    // The targets each written note was read with, for a save after its element goes.
    const read = new Map<string, readonly unknown[]>();
    for (const note of notes) {
        if (isObject(note) && typeof note.id === "string" && Array.isArray(note.targets)) {
            read.set(note.id, note.targets);
        }
    }

    const from = new Map(report.renamed.map((pair) => [pair.to, pair.from]));
    for (const id of [...report.added, ...report.replaced]) {
        const note = context.tx.notes.get(id);
        const targets = read.get(from.get(id) ?? id);
        if (note !== undefined && targets !== undefined) {
            originals.set(note, targets);
        }
    }

    context.restored.add("notes");
    return Promise.resolve();
}

/** The `graphty-notes` section, version 2. */
export const notesCodec: SectionCodec = {
    section: "notes",
    version: 2,
    reads: [2],
    bound: true,
    members: ["notes"],
    write,
    read,
};
