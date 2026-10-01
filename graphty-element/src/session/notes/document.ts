/**
 * @file The saved form of notes (design/documents/notes.md): reading a `graphty-notes` member
 * into checked records, working out what merging them into the session's notes does, and writing
 * the session's notes back out.
 *
 * A member is refused whole for what breaks the member (its kind, version, shape, limits, a
 * `__proto__` anywhere); a note that fails the schema is skipped alone and never repaired. A
 * target or cite of a form this release does not name is kept as read and reads `unsupported`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import type { NoteEntry } from "../project/state";
import { canonicalize } from "../runs/runId";
import type { Note, NoteId, NoteMergeOptions, NotesDocument, Problem } from "./types";
import {
    checkExtensions,
    checkMediaType,
    checkText,
    codePoints,
    isPlain,
    NOTE_LIMITS,
    recordOf,
    unknownFields,
} from "./validate";

/** How deep a member may nest (design/documents/README.md, "Limits"). */
const MAX_DEPTH = 64;

/** The member fields version 1 names. */
const MEMBER_FIELDS: ReadonlySet<string> = new Set(["kind", "version", "name", "description", "notes", "extensions"]);

/** The schema's `noteId` pattern. */
const NOTE_ID = /^note_[0-9A-Za-z_-]{1,64}$/;

/** The schema's `timestamp` pattern: RFC 3339 with an explicit offset. */
const TIMESTAMP =
    /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]+)?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/;

/** A day, in milliseconds: how far past the moment of opening a time may be before it is noted. */
const DAY = 86_400_000;

/**
 * A refusal of the whole member.
 * @param code - The code.
 * @param message - What is wrong.
 * @param details - What names it.
 * @returns The error to throw.
 */
function refuseMember(
    code: "E_BAD_DOCUMENT" | "E_UNSUPPORTED_VERSION" | "E_TOO_LARGE",
    message: string,
    details: Readonly<Record<string, unknown>> = {},
): GraphtyError {
    return new GraphtyError({ code, message, source: "data", details });
}

/**
 * One segment of a JSON pointer.
 * @param key - The key.
 * @returns It, escaped.
 */
function pointerSegment(key: string): string {
    return key.replaceAll("~", "~0").replaceAll("/", "~1");
}

/**
 * Copy a member before anything reads it, so every later check reads the copy and never the
 * caller's object: each own property is read once, through its descriptor. Refuses an accessor
 * (it could answer a check one way and the store another), an object reached twice (JSON cannot
 * share objects, and walking a shared tree as a tree is exponential), `__proto__` anywhere, and
 * nesting past the limit (notes.md, "Opening"). An object that is not a plain object or array is
 * kept as it is, for the note checks to refuse.
 * @param value - The value.
 * @param depth - Its nesting level.
 * @param seen - The objects copied so far.
 * @returns The copy, frozen.
 */
function memberCopy(value: unknown, depth: number, seen: Set<object>): unknown {
    if (typeof value !== "object" || value === null || (!Array.isArray(value) && !isPlain(value))) {
        return value;
    }

    if (depth > MAX_DEPTH) {
        throw refuseMember("E_BAD_DOCUMENT", "The notes member is nested more than 64 levels deep.");
    }

    if (seen.has(value)) {
        throw refuseMember("E_BAD_DOCUMENT", "The notes member reaches one object twice, which JSON cannot.");
    }

    seen.add(value);
    const copy: Record<string, unknown> = Array.isArray(value) ? ([] as unknown as Record<string, unknown>) : {};
    for (const key of Reflect.ownKeys(value)) {
        if (key === "__proto__") {
            throw refuseMember("E_BAD_DOCUMENT", "The notes member holds a member named __proto__.");
        }

        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (typeof key === "symbol" || descriptor === undefined || (Array.isArray(value) && key === "length")) {
            continue;
        }

        if (!("value" in descriptor)) {
            throw refuseMember("E_BAD_DOCUMENT", "The notes member holds an accessor, which JSON cannot.");
        }

        if (descriptor.enumerable === true) {
            // `__proto__` was refused above, so plain assignment is safe.
            copy[key] = memberCopy(descriptor.value, depth + 1, seen);
        }
    }

    return Object.freeze(copy);
}

/**
 * A frozen copy of a JSON value read from a member.
 * @param value - The value, from the member's copy: no `__proto__`, no accessor, not too deep.
 * @returns The copy.
 * @throws When the value is not plain JSON.
 */
function frozenCopy(value: unknown): unknown {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (Array.isArray(value)) {
        return Object.freeze(value.map(frozenCopy));
    }

    if (!isPlain(value)) {
        throw new Error("not plain JSON");
    }

    // Own keys only; a `__proto__` key was refused by the scan, so plain assignment is safe.
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        copy[key] = frozenCopy(entry);
    }

    return Object.freeze(copy);
}

/**
 * Whether a string is at most so many code points, and not empty.
 * @param value - The value.
 * @param max - The limit.
 * @returns True when it is.
 */
function isString(value: unknown, max: number): value is string {
    return typeof value === "string" && value.length > 0 && (value.length <= max || codePoints(value) <= max);
}

/**
 * Whether a value is a node id as a file holds one.
 * @param value - The value.
 * @returns True when it is.
 */
function isId(value: unknown): boolean {
    return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

/**
 * Whether an object's own keys are exactly some of the allowed ones, with the required ones.
 * @param value - The object.
 * @param allowed - Its allowed keys.
 * @param required - Its required keys.
 * @returns True when they are.
 */
function keysAre(value: object, allowed: readonly string[], required: readonly string[] = allowed): boolean {
    const keys = Object.keys(value);
    return keys.every((key) => allowed.includes(key)) && required.every((key) => Object.hasOwn(value, key));
}

/**
 * Whether an edge is in one of its named forms: its ends, plus its id or its ordinal and among.
 * @param edge - The edge.
 * @returns True when it is.
 */
function isEdgeForm(edge: unknown): boolean {
    if (!isPlain(edge) || !keysAre(edge, ["source", "target", "id", "ordinal", "among"], ["source", "target"])) {
        return false;
    }

    if (!isId(edge.source) || !isId(edge.target)) {
        return false;
    }

    if (Object.hasOwn(edge, "id")) {
        return isId(edge.id) && !Object.hasOwn(edge, "ordinal") && !Object.hasOwn(edge, "among");
    }

    return (
        Number.isInteger(edge.ordinal) &&
        (edge.ordinal as number) >= 0 &&
        Number.isInteger(edge.among) &&
        (edge.among as number) >= 1
    );
}

/**
 * Whether a target is in one of the forms version 1 names. A target that is not reads
 * `unsupported`: never bound by ignoring part of it.
 * @param target - The target.
 * @returns True when it is.
 */
function isTargetForm(target: object): boolean {
    const t = target as Record<string, unknown>;
    if (keysAre(t, ["graph"])) {
        return t.graph === true;
    }

    if (keysAre(t, ["node"])) {
        return isId(t.node);
    }

    if (keysAre(t, ["edge"])) {
        return isEdgeForm(t.edge);
    }

    if (keysAre(t, ["set", "name"], ["set"])) {
        return (
            isString(t.set, 256) &&
            t.set.startsWith("set_") &&
            t.set.length > 4 &&
            (!Object.hasOwn(t, "name") || isString(t.name, 1024))
        );
    }

    if (keysAre(t, ["result"])) {
        return isString(t.result, 256);
    }

    if (keysAre(t, ["item"]) && isPlain(t.item) && keysAre(t.item, ["result", "run", "key"])) {
        const { item } = t as { item: Record<string, unknown> };
        const { key } = item;
        return (
            isString(item.result, 256) &&
            isString(item.run, 256) &&
            isPlain(key) &&
            keysAre(key, ["field", "value"]) &&
            isString(key.field, 256) &&
            (typeof key.value === "string" || typeof key.value === "boolean" || isId(key.value))
        );
    }

    return false;
}

/**
 * Whether a cite is in its named form, `{ result, run }`.
 * @param cite - The cite.
 * @returns True when it is.
 */
function isCiteForm(cite: object): boolean {
    const c = cite as Record<string, unknown>;
    return keysAre(c, ["result", "run"]) && isString(c.result, 256) && isString(c.run, 256);
}

/** An edge id graphty-element mints for an edge added in a session (`mintedEdgeId`). */
const SESSION_EDGE_ID = /^graphty:e\d+$/;

/**
 * Whether an edge id is one graphty-element made up for an edge added in a session.
 * @param id - The id.
 * @returns True when it is.
 */
export function isSessionEdgeId(id: unknown): boolean {
    return typeof id === "string" && SESSION_EDGE_ID.test(id);
}

/**
 * Edge targets read from a file that name an edge by a session-made id. That id means nothing in
 * this session, so the target binds nothing (notes.md, "Binding" rule 2). Kept per frozen target,
 * so a renamed copy or a text edit keeps it, and new targets written by `update` drop it.
 */
const sessionEdgesFromFiles = new WeakSet();

/**
 * Whether a target was read from a file and names an edge by a session-made id.
 * @param target - The target.
 * @returns True when it binds nothing.
 */
export function namesForeignSessionEdge(target: object): boolean {
    return sessionEdgesFromFiles.has(target);
}

const supportedTargets = new WeakMap<object, boolean>();
const supportedCites = new WeakMap<object, boolean>();

/**
 * Whether this release knows a target's form. Remembered per frozen target.
 * @param target - The target.
 * @returns True when it does.
 */
export function supportedTarget(target: object): boolean {
    let known = supportedTargets.get(target);
    if (known === undefined) {
        known = isTargetForm(target);
        supportedTargets.set(target, known);
    }

    return known;
}

/**
 * Whether this release knows a cite's form. Remembered per frozen cite.
 * @param cite - The cite.
 * @returns True when it does.
 */
export function supportedCite(cite: object): boolean {
    let known = supportedCites.get(cite);
    if (known === undefined) {
        known = isCiteForm(cite);
        supportedCites.set(cite, known);
    }

    return known;
}

/**
 * The instant a time names, or NaN when it is not a real RFC 3339 date and time with an offset.
 * @param value - The time.
 * @returns Milliseconds since the epoch.
 */
function instantOf(value: unknown): number {
    const match = typeof value === "string" ? TIMESTAMP.exec(value) : null;
    if (match === null) {
        return Number.NaN;
    }

    // The pattern lets 2026-02-30 through; a real date has that day in that month.
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDate() !== day) {
        return Number.NaN;
    }

    return Date.parse(value as string);
}

/**
 * A list of 1 to 64 non-empty objects, each copied as read.
 * @param value - The list.
 * @param what - What it is, for the reason.
 * @returns The copies, frozen.
 */
function objectsOf(value: unknown, what: string): readonly object[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > 64) {
        throw new Error(`its ${what} are not a list of 1 to 64`);
    }

    return Object.freeze(
        value.map((entry: unknown) => {
            if (!isPlain(entry) || Object.keys(entry).length === 0 || Object.keys(entry).length > 64) {
                throw new Error(`one of its ${what} is not an object of 1 to 64 members`);
            }

            return frozenCopy(entry) as object;
        }),
    );
}

/**
 * Read one note of a member: checked as the schema checks it, copied as read.
 * @param raw - The note.
 * @param at - Its pointer.
 * @param now - The moment of opening.
 * @param notices - Where notices go.
 * @returns The record, frozen.
 * @throws With the reason the note is skipped.
 */
function readNote(raw: unknown, at: string, now: number, notices: Problem[]): Note {
    if (!isPlain(raw)) {
        throw new Error("it is not an object");
    }

    if (Object.keys(raw).length > 64) {
        throw new Error("it has more than 64 fields");
    }

    if (typeof raw.id !== "string" || !NOTE_ID.test(raw.id)) {
        throw new Error("its id is not note_ followed by 1 to 64 letters, digits, - or _");
    }

    const { time } = raw;
    if (Number.isNaN(instantOf(time))) {
        throw new Error("its time is missing or not a real date and time with an offset");
    }

    const { edited } = raw;
    if (edited !== undefined && Number.isNaN(instantOf(edited))) {
        throw new Error("its edited is not a real date and time with an offset");
    }

    const { author } = raw;
    if (author !== undefined && (!isString(author, 256) || !/\S/u.test(author))) {
        throw new Error("its author is empty, only white space, or longer than 256 characters");
    }

    const targets = objectsOf(raw.targets, "targets");
    for (const target of targets) {
        const { edge } = target as { edge?: unknown };
        if (isPlain(edge) && isSessionEdgeId(edge.id)) {
            sessionEdgesFromFiles.add(target);
        }
    }

    const cites = raw.cites === undefined ? undefined : objectsOf(raw.cites, "cites");
    // The note checks shared with `add` throw a GraphtyError whose message says why.
    const text = checkText(raw.text);
    const mediaType = raw.mediaType === undefined ? undefined : checkMediaType(raw.mediaType);
    const extensions = raw.extensions === undefined ? undefined : checkExtensions(raw.extensions);

    const extra = frozenCopy(unknownFields(raw)) as Record<string, unknown>;
    for (const key of Object.keys(extra)) {
        notices.push(
            Object.freeze({
                what: `${at}/${pointerSegment(key)}`,
                reason: `The note field ${JSON.stringify(key.slice(0, 256))} is not one this release knows; it is kept and written back.`,
                code: "W_UNKNOWN_MEMBER" as const,
            }),
        );
    }

    for (const [field, value] of [
        ["time", time],
        ["edited", edited],
    ] as const) {
        if (value !== undefined && instantOf(value) > now + DAY) {
            notices.push(
                Object.freeze({
                    what: `${at}/${field}`,
                    reason: `The note's ${field} is more than a day after it was opened; it is kept as written.`,
                    code: "W_FUTURE_TIME" as const,
                }),
            );
        }
    }

    return recordOf(
        {
            id: raw.id,
            time: time as string,
            targets: targets as Note["targets"],
            text,
            mediaType,
            author: author,
            edited: edited as string | undefined,
            cites: cites as Note["cites"],
            extensions,
        },
        extra,
    );
}

/** A member read and checked, ready to merge. */
interface ReadMember {
    /** The member's name, when it has one. */
    readonly name: string | undefined;
    /** The notes that passed, in member order. */
    readonly notes: readonly Note[];
    /** The notes that did not, each with its pointer. */
    readonly skipped: readonly Problem[];
    /** Unknown fields and future times. */
    readonly notices: readonly Problem[];
}

/**
 * Read a `graphty-notes` member.
 * @param input - The member, parsed from JSON.
 * @param now - The moment of opening.
 * @returns The member's notes, checked.
 * @throws A `GraphtyError` for a member refused whole.
 */
export function readMember(input: unknown, now: number): ReadMember {
    // Everything below reads this copy, never the caller's object.
    const document = memberCopy(input, 1, new Set());
    if (!isPlain(document) || document.kind !== "graphty-notes") {
        throw refuseMember("E_BAD_DOCUMENT", 'A notes member is an object whose kind is "graphty-notes".', {
            kind: isPlain(document) ? document.kind : undefined,
        });
    }

    const { version } = document;
    if (!Number.isInteger(version) || (version as number) < 1) {
        throw refuseMember("E_BAD_DOCUMENT", "A notes member's version is a positive whole number.");
    }

    if (version !== 1) {
        throw refuseMember(
            "E_UNSUPPORTED_VERSION",
            `This release reads notes members of version 1, not ${String(version)}.`,
            {
                kind: "graphty-notes",
                found: version,
                reads: [1],
            },
        );
    }

    const { notes, name, description, extensions } = document;
    if (!Array.isArray(notes)) {
        throw refuseMember("E_BAD_DOCUMENT", "A notes member's notes are a list.");
    }

    if (notes.length > NOTE_LIMITS.notes) {
        throw refuseMember("E_TOO_LARGE", "A notes member holds at most 10,000 notes.", {
            reason: "notes",
            count: notes.length,
        });
    }

    if (
        (name !== undefined && (typeof name !== "string" || codePoints(name) > 1024)) ||
        (description !== undefined && (typeof description !== "string" || codePoints(description) > 65_536))
    ) {
        throw refuseMember("E_BAD_DOCUMENT", "A notes member's name or description is not text within its limit.");
    }

    if (extensions !== undefined) {
        try {
            checkExtensions(extensions);
        } catch {
            throw refuseMember(
                "E_BAD_DOCUMENT",
                "A notes member's extensions are not plain JSON under reverse-domain keys.",
            );
        }
    }

    const notices: Problem[] = [];
    for (const key of Object.keys(document)) {
        if (!MEMBER_FIELDS.has(key)) {
            notices.push(
                Object.freeze({
                    what: `/${pointerSegment(key)}`,
                    reason: `The member field ${JSON.stringify(key.slice(0, 256))} is not one this release knows; it is ignored.`,
                    code: "W_UNKNOWN_MEMBER" as const,
                }),
            );
        }
    }

    const read: Note[] = [];
    const skipped: Problem[] = [];
    notes.forEach((raw: unknown, index) => {
        const at = `/notes/${String(index)}`;
        const own: Problem[] = [];
        try {
            read.push(readNote(raw, at, now, own));
            notices.push(...own);
        } catch (error) {
            const why = (error instanceof Error ? error.message : String(error)).replace(/\.$/, "");
            skipped.push(
                Object.freeze({ what: at, reason: `The note is skipped: ${why}.`, code: "E_BAD_DOCUMENT" as const }),
            );
        }
    });

    return { name: typeof name === "string" ? name : undefined, notes: read, skipped, notices };
}

const contents = new WeakMap<Note, string>();

/**
 * A note's content: every field but its id, with times as instants and keys sorted.
 * @param note - The note.
 * @returns Its canonical text.
 */
function contentOf(note: Note): string {
    let content = contents.get(note);
    if (content === undefined) {
        content = canonicalize({
            ...note,
            id: undefined,
            time: instantOf(note.time),
            edited: note.edited === undefined ? undefined : instantOf(note.edited),
        });
        contents.set(note, content);
    }

    return content;
}

/** What a merge writes and what it reports, before the missing count. */
interface MergePlan {
    /** The records to write, by id: new notes, renamed copies and replacements. */
    readonly writes: ReadonlyMap<NoteId, Note>;
    readonly added: readonly NoteId[];
    readonly unchanged: number;
    readonly renamed: readonly { readonly from: NoteId; readonly to: NoteId }[];
    readonly older: readonly NoteId[];
    readonly replaced: readonly NoteId[];
    readonly kept: readonly NoteId[];
}

/**
 * Work out what merging read notes into held ones does (notes.md, "Opening" rules 1 to 4).
 * @param incoming - The notes read, in member order.
 * @param held - The session's notes.
 * @param onConflict - What to do on a conflicting id.
 * @param mint - Mints a fresh id for a kept copy.
 * @returns The plan.
 */
export function planMerge(
    incoming: readonly Note[],
    held: ReadonlyMap<NoteId, NoteEntry>,
    onConflict: NonNullable<NoteMergeOptions["onConflict"]>,
    mint: () => NoteId,
): MergePlan {
    const working = new Map<NoteId, Note>([...held].map(([id, entry]) => [id, entry.note]));
    const byContent = new Set([...working.values()].map(contentOf));
    const writes = new Map<NoteId, Note>();
    const plan = { added: [] as NoteId[], unchanged: 0, renamed: [] as { from: NoteId; to: NoteId }[] };
    const older: NoteId[] = [];
    const replaced: NoteId[] = [];
    const kept: NoteId[] = [];
    const write = (note: Note): void => {
        working.set(note.id, note);
        writes.set(note.id, note);
        byContent.add(contentOf(note));
    };

    for (const note of incoming) {
        const now = working.get(note.id);
        if (byContent.has(contentOf(note))) {
            plan.unchanged++;
        } else if (now === undefined) {
            write(note);
            plan.added.push(note.id);
        } else if (onConflict === "replace") {
            write(note);
            replaced.push(note.id);
        } else if (onConflict === "keep-mine") {
            kept.push(note.id);
        } else if (
            instantOf(now.time) === instantOf(note.time) &&
            now.edited !== undefined &&
            (note.edited === undefined || instantOf(now.edited) > instantOf(note.edited))
        ) {
            older.push(note.id);
        } else {
            // Spread keeps the key order, so the copy is written as the original was.
            const copy = Object.freeze({ ...note, id: mint() });
            write(copy);
            plan.added.push(copy.id);
            plan.renamed.push({ from: note.id, to: copy.id });
        }
    }

    return { writes, ...plan, older, replaced, kept };
}

/**
 * The session's notes as a member: oldest first, by time then id.
 * @param notes - The notes.
 * @param options - The member's name and description.
 * @param options.name - Its name.
 * @param options.description - Its description.
 * @returns The member.
 */
export function writeMember(
    notes: readonly Note[],
    options: { readonly name?: unknown; readonly description?: unknown },
): NotesDocument {
    const bad = (field: string, limit: number): GraphtyError =>
        new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `A notes member's ${field} is text of at most ${limit.toLocaleString("en-US")} characters.`,
            source: "data",
            details: { field },
        });
    const { name, description } = options;
    if (name !== undefined && (typeof name !== "string" || codePoints(name) > 1024)) {
        throw bad("name", 1024);
    }

    if (description !== undefined && (typeof description !== "string" || codePoints(description) > 65_536)) {
        throw bad("description", 65_536);
    }

    const ordered = [...notes].sort((left, right) => {
        const by = instantOf(left.time) - instantOf(right.time);
        if (by !== 0) {
            return by;
        }

        return left.id < right.id ? -1 : Number(left.id > right.id);
    });

    return Object.freeze({
        kind: "graphty-notes",
        version: 1,
        ...(name === undefined ? {} : { name }),
        ...(description === undefined ? {} : { description }),
        notes: Object.freeze(ordered),
    }) as NotesDocument;
}
