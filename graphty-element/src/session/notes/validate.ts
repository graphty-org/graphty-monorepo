/**
 * @file Every input check of a note write (design/notes/notes-design.md sections 5.4 and 8.4),
 * and the frozen record a write stores.
 *
 * Fields are read by own name only, and what is kept is copied: targets into fresh frozen objects
 * in their saved form, `extensions` into frozen null-prototype objects. Lengths count code points,
 * as JSON Schema's `maxLength` does. A refused input throws before anything is written.
 */

import type { EdgeId, EdgeMember, NodeId, ResultId, SetId } from "../../catalog/types";
import { GraphtyError } from "../../errors/GraphtyError";
import { canonicalize } from "../runs/runId";
import type { Note, NoteCite, NoteId, NoteTarget } from "./types";

/** The version 1 limits. */
const NOTE_LIMITS = Object.freeze({
    notes: 10_000,
    targets: 64,
    cites: 64,
    text: 65_536,
    noteBytes: 262_144,
    extensionBytes: 65_536,
    extensionDepth: 32,
    extensionKeys: 256,
    mediaType: 255,
    idPart: 256,
});

/** The fields graphty-element stamps itself, which an input may not carry. */
const ELEMENT_FIELDS = ["id", "time", "author", "edited"] as const;

/** The fields `add` takes. */
const INPUT_FIELDS: ReadonlySet<string> = new Set(["text", "targets", "cites", "mediaType", "extensions"]);

/** The schema's `mediaType` pattern. */
const MEDIA_TYPE = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*( *;[\x20-\x7E]*)?$/;

/** The schema's `extensions` key pattern: a reverse-domain name, or `graphty`. */
const EXTENSION_KEY = /^([a-z0-9]+(-[a-z0-9]+)*)(\.[a-z0-9]+(-[a-z0-9]+)*)+$|^graphty$/;

/** What a note write reads of the session, beside the input. */
export interface NoteContext {
    /** How many notes the session holds. */
    readonly count: number;
    /** Whether the session holds a kept set, and its name. */
    set(id: SetId): { readonly name: string } | undefined;
    /** The stable form of a session edge id, or undefined when the graph does not hold it. */
    edgeMember(id: EdgeId): EdgeMember | undefined;
    /**
     * A result: undefined when the session holds no result or run by that id; otherwise the token
     * of its current finished run, undefined while it has none.
     */
    result(id: ResultId): { readonly execution: string | undefined } | undefined;
}

/**
 * A refusal.
 * @param code - `E_BAD_COMMAND` or `E_TOO_LARGE`.
 * @param reason - The typed reason.
 * @param message - What is wrong.
 * @param details - What names it.
 * @returns The error to throw.
 */
export function refuseNote(
    code: "E_BAD_COMMAND" | "E_TOO_LARGE",
    reason: string,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
): GraphtyError {
    return new GraphtyError({ code, message, source: "data", details: { ...details, reason } });
}

/**
 * Whether a value is a plain object: `{...}` or one with a null prototype.
 * @param value - The value.
 * @returns True when it is.
 */
function isPlain(value: unknown): value is Readonly<Record<string, unknown>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    const proto: unknown = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/**
 * Whether an object's own keys are all among the allowed ones, and the required ones are there.
 * @param value - The object.
 * @param allowed - The keys it may have.
 * @param required - The keys it must have.
 * @returns True when they are.
 */
function hasKeys(
    value: Readonly<Record<string, unknown>>,
    allowed: readonly string[],
    required: readonly string[],
): boolean {
    const keys = Reflect.ownKeys(value);
    return (
        keys.every((key) => typeof key === "string" && allowed.includes(key)) &&
        required.every((key) => Object.hasOwn(value, key))
    );
}

/**
 * Whether a value is a node id: a string, or a finite number.
 * @param value - The value.
 * @returns True when it is.
 */
function isNodeId(value: unknown): value is NodeId {
    return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

/**
 * Whether a value is a string of 1 to 256 code points.
 * @param value - The value.
 * @returns True when it is.
 */
function isShortString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0 && codePoints(value) <= NOTE_LIMITS.idPart;
}

/**
 * How many code points a string holds.
 * @param text - The string.
 * @returns The count; a lone surrogate counts one.
 */
export function codePoints(text: string): number {
    let count = 0;
    // Iterating a string visits its code points; a lone surrogate is one.
    for (const _ of text) {
        count++;
    }

    return count;
}

/**
 * The bytes a JSON text takes in UTF-8.
 * @param json - The text.
 * @returns The byte count.
 */
function utf8Bytes(json: string): number {
    return new TextEncoder().encode(json).length;
}

/**
 * Refuse the fields graphty-element stamps, and fields no note write takes.
 * @param input - The input or patch.
 */
function checkFields(input: Readonly<Record<string, unknown>>): void {
    const stamped = ELEMENT_FIELDS.filter((field) => Object.hasOwn(input, field));
    if (stamped.length > 0) {
        throw refuseNote(
            "E_BAD_COMMAND",
            "element-field",
            `A note's ${stamped.join(", ")} ${stamped.length === 1 ? "is" : "are"} stamped by graphty-element; leave ${stamped.length === 1 ? "it" : "them"} out.`,
            { fields: stamped },
        );
    }

    const unknown = Reflect.ownKeys(input).filter((key) => typeof key !== "string" || !INPUT_FIELDS.has(key));
    if (unknown.length > 0) {
        throw refuseNote(
            "E_BAD_COMMAND",
            "unknown-field",
            `A note takes text, targets, cites, mediaType and extensions, not ${unknown.map(String).join(", ")}.`,
            { fields: unknown.map(String) },
        );
    }
}

/**
 * Check a note's text.
 * @param text - The text.
 * @returns It, unchanged.
 */
function checkText(text: unknown): string {
    if (typeof text !== "string" || !/\S/u.test(text)) {
        throw refuseNote("E_BAD_COMMAND", "empty-text", "A note's text is empty or only white space.");
    }

    // Only a string longer than the limit in UTF-16 units can be over it in code points.
    if (text.length > NOTE_LIMITS.text && codePoints(text) > NOTE_LIMITS.text) {
        throw refuseNote("E_BAD_COMMAND", "text-too-long", "A note's text is longer than 65,536 characters.", {
            length: codePoints(text),
        });
    }

    return text;
}

/**
 * Check a media type.
 * @param mediaType - The media type.
 * @returns It, unchanged.
 */
function checkMediaType(mediaType: unknown): string {
    if (typeof mediaType !== "string" || mediaType.length > NOTE_LIMITS.mediaType || !MEDIA_TYPE.test(mediaType)) {
        throw refuseNote(
            "E_BAD_COMMAND",
            "bad-media-type",
            `A media type is "type/subtype", optionally with parameters in visible ASCII, at most 255 characters; ${JSON.stringify(mediaType)} is not.`,
        );
    }

    return mediaType;
}

/**
 * A frozen null-prototype copy of plain JSON, or a refusal.
 * @param value - The value.
 * @param depth - Its nesting level; the `extensions` object is level 1.
 * @returns The copy.
 */
function plainJson(value: unknown, depth: number): unknown {
    const bad = (why: string): GraphtyError =>
        refuseNote("E_BAD_COMMAND", "bad-extensions", `A note's extensions must be plain JSON: ${why}.`);
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        if (!Number.isFinite(value)) {
            throw bad("a number is not finite");
        }

        return value;
    }

    if (depth > NOTE_LIMITS.extensionDepth) {
        throw bad("it is nested more than 32 levels deep");
    }

    if (Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype) {
        const keys = Reflect.ownKeys(value);
        if (keys.length !== value.length + 1) {
            throw bad("an array has holes or extra properties");
        }

        return Object.freeze(Array.from(value, (entry: unknown) => plainJson(entry, depth + 1)));
    }

    if (!isPlain(value)) {
        throw bad(`a ${typeof value === "object" ? (value.constructor?.name ?? "object") : typeof value} is not`);
    }

    const copy = Object.create(null) as Record<string, unknown>;
    for (const key of Reflect.ownKeys(value)) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (typeof key !== "string" || key === "__proto__" || descriptor === undefined || !("value" in descriptor)) {
            throw bad(`the key ${String(key)} is not a plain data member`);
        }

        copy[key] = plainJson(descriptor.value, depth + 1);
    }

    return Object.freeze(copy);
}

/**
 * Check and copy a note's extensions.
 * @param extensions - The extensions.
 * @returns A frozen null-prototype copy.
 */
function checkExtensions(extensions: unknown): Readonly<Record<string, unknown>> {
    if (!isPlain(extensions)) {
        throw refuseNote(
            "E_BAD_COMMAND",
            "bad-extensions",
            "A note's extensions are an object of reverse-domain keys.",
        );
    }

    const keys = Reflect.ownKeys(extensions);
    const badKey = keys.find((key) => typeof key !== "string" || !EXTENSION_KEY.test(key));
    if (badKey !== undefined || keys.length > NOTE_LIMITS.extensionKeys) {
        throw refuseNote(
            "E_BAD_COMMAND",
            "bad-extensions",
            badKey === undefined
                ? "A note's extensions hold at most 256 keys."
                : `An extensions key is a reverse-domain name you own ("com.example.app"), not ${JSON.stringify(String(badKey))}.`,
        );
    }

    const copy = plainJson(extensions, 1) as Readonly<Record<string, unknown>>;
    if (utf8Bytes(JSON.stringify(copy)) > NOTE_LIMITS.extensionBytes) {
        throw refuseNote("E_BAD_COMMAND", "bad-extensions", "A note's extensions are larger than 64 KB saved.");
    }

    return copy;
}

/**
 * Check one target and make its saved form.
 * @param raw - The target as given.
 * @param index - Its position, for the refusal.
 * @param context - The session.
 * @returns The saved form, frozen.
 */
function targetOf(raw: unknown, index: number, context: NoteContext): NoteTarget {
    const bad = (why: string): GraphtyError =>
        refuseNote("E_BAD_COMMAND", "bad-target", `Target ${String(index)} ${why}.`, { index });
    const unknown = (what: string): GraphtyError =>
        refuseNote(
            "E_BAD_COMMAND",
            "unknown-target",
            `Target ${String(index)} names ${what} this session does not hold.`,
            {
                index,
            },
        );
    if (!isPlain(raw)) {
        throw bad("is not an object");
    }

    if (hasKeys(raw, ["graph"], ["graph"])) {
        if (raw.graph !== true) {
            throw bad("is { graph: true } or nothing");
        }

        return Object.freeze({ graph: true });
    }

    if (hasKeys(raw, ["node"], ["node"])) {
        if (!isNodeId(raw.node)) {
            throw bad("names a node by a string or a finite number");
        }

        return Object.freeze({ node: raw.node });
    }

    if (hasKeys(raw, ["edge"], ["edge"])) {
        const { edge } = raw;
        if (typeof edge === "string") {
            const member = context.edgeMember(edge);
            if (member === undefined) {
                throw bad(`names the edge "${edge}", which the graph does not hold`);
            }

            return Object.freeze({ edge: Object.freeze({ ...member }) });
        }

        if (!isPlain(edge) || !hasKeys(edge, ["source", "target", "id", "ordinal", "among"], ["source", "target"])) {
            throw bad("is an edge: its source and target, plus its id or its ordinal and among");
        }

        if (!isNodeId(edge.source) || !isNodeId(edge.target)) {
            throw bad("names an edge's ends by node id");
        }

        const byId = Object.hasOwn(edge, "id");
        const byPosition = Object.hasOwn(edge, "ordinal") || Object.hasOwn(edge, "among");
        if (byId && !byPosition && isNodeId(edge.id)) {
            return Object.freeze({ edge: Object.freeze({ source: edge.source, target: edge.target, id: edge.id }) });
        }

        if (
            !byId &&
            Number.isInteger(edge.ordinal) &&
            Number.isInteger(edge.among) &&
            (edge.ordinal as number) >= 0 &&
            (edge.among as number) >= 1
        ) {
            return Object.freeze({
                edge: Object.freeze({
                    source: edge.source,
                    target: edge.target,
                    ordinal: edge.ordinal as number,
                    among: edge.among as number,
                }),
            });
        }

        throw bad("names an edge by exactly one of its id, or its ordinal with among");
    }

    if (hasKeys(raw, ["set", "name"], ["set"])) {
        if (typeof raw.set !== "string" || (Object.hasOwn(raw, "name") && typeof raw.name !== "string")) {
            throw bad("names a set by its id");
        }

        const held = context.set(raw.set);
        if (held === undefined) {
            throw unknown(`the set "${raw.set}", which`);
        }

        return Object.freeze(held.name === "" ? { set: raw.set } : { set: raw.set, name: held.name });
    }

    if (hasKeys(raw, ["result"], ["result"])) {
        if (!isShortString(raw.result)) {
            throw bad("names a result by its id");
        }

        if (context.result(raw.result) === undefined) {
            throw unknown(`the result "${raw.result}", which`);
        }

        return Object.freeze({ result: raw.result });
    }

    if (hasKeys(raw, ["item"], ["item"])) {
        const { item } = raw;
        if (
            !isPlain(item) ||
            !hasKeys(item, ["result", "run", "key"], ["result", "key"]) ||
            !isShortString(item.result) ||
            (Object.hasOwn(item, "run") && !isShortString(item.run)) ||
            !isPlain(item.key) ||
            !hasKeys(item.key, ["field", "value"], ["field", "value"]) ||
            !isShortString(item.key.field) ||
            !(
                typeof item.key.value === "string" ||
                typeof item.key.value === "boolean" ||
                (typeof item.key.value === "number" && Number.isFinite(item.key.value))
            )
        ) {
            throw bad("is an item: a result id, its run when pinned, and a key { field, value }");
        }

        const result = context.result(item.result);
        if (result === undefined) {
            throw unknown(`the result "${item.result}", which`);
        }

        const run = Object.hasOwn(item, "run") ? (item.run as string) : result.execution;
        if (run === undefined) {
            throw refuseNote(
                "E_BAD_COMMAND",
                "not-finished",
                `Target ${String(index)} is an item of "${item.result}", which has no finished run to pin it to.`,
                { index },
            );
        }

        return Object.freeze({
            item: Object.freeze({
                result: item.result,
                run,
                key: Object.freeze({ field: item.key.field, value: item.key.value }),
            }),
        });
    }

    throw bad("is not a kind of target this release knows: graph, node, edge, set, result or item");
}

/**
 * The key two targets that name the same thing share: node ids compare by their text.
 * @param target - The target.
 * @returns The key.
 */
export function targetKey(target: NoteTarget): string {
    if ("node" in target) {
        return `node:${String(target.node)}`;
    }

    if ("edge" in target) {
        return canonicalize({
            edge: { ...target.edge, source: String(target.edge.source), target: String(target.edge.target) },
        });
    }

    if ("set" in target) {
        return canonicalize({ set: target.set });
    }

    return canonicalize(target);
}

/**
 * Check a list of targets and make their saved forms, duplicates collapsed to the first.
 * @param raw - The targets as given.
 * @param context - The session.
 * @returns The saved forms, frozen.
 */
function targetsOf(raw: unknown, context: NoteContext): readonly NoteTarget[] {
    if (!Array.isArray(raw) || raw.length === 0) {
        throw refuseNote("E_BAD_COMMAND", "no-targets", "A note is about at least one target.");
    }

    if (raw.length > NOTE_LIMITS.targets) {
        throw refuseNote("E_BAD_COMMAND", "too-many", "A note has at most 64 targets.", { field: "targets" });
    }

    const kept = new Map<string, NoteTarget>();
    raw.forEach((each: unknown, index) => {
        const target = targetOf(each, index, context);
        const key = targetKey(target);
        if (!kept.has(key)) {
            kept.set(key, target);
        }
    });

    return Object.freeze([...kept.values()]);
}

/**
 * Check a list of cites and pin each to its result's current finished run, or to the run a held
 * cite of the same result already pins.
 * @param raw - The cites as given.
 * @param context - The session.
 * @param held - The cites the note holds now, whose pins are kept.
 * @returns The pinned cites, frozen; undefined for none.
 */
function citesOf(raw: unknown, context: NoteContext, held: readonly NoteCite[] = []): readonly NoteCite[] | undefined {
    if (!Array.isArray(raw)) {
        throw refuseNote("E_BAD_COMMAND", "unknown-cite", "A note's cites are a list of { result }.");
    }

    if (raw.length > NOTE_LIMITS.cites) {
        throw refuseNote("E_BAD_COMMAND", "too-many", "A note has at most 64 cites.", { field: "cites" });
    }

    const kept = new Map<string, NoteCite>();
    raw.forEach((each: unknown, index) => {
        if (!isPlain(each) || !hasKeys(each, ["result"], ["result"]) || !isShortString(each.result)) {
            throw refuseNote("E_BAD_COMMAND", "unknown-cite", `Cite ${String(index)} is not { result }.`, { index });
        }

        const id = each.result;
        if (kept.has(id)) {
            return;
        }

        const pinned = held.find((cite) => cite.result === id);
        if (pinned !== undefined) {
            kept.set(id, pinned);
            return;
        }

        const result = context.result(id);
        if (result === undefined) {
            throw refuseNote(
                "E_BAD_COMMAND",
                "unknown-cite",
                `Cite ${String(index)} names the result "${id}", which this session does not hold.`,
                {
                    index,
                },
            );
        }

        if (result.execution === undefined) {
            throw refuseNote(
                "E_BAD_COMMAND",
                "not-finished",
                `Cite ${String(index)} names "${id}", which has no finished run.`,
                {
                    index,
                },
            );
        }

        kept.set(id, Object.freeze({ result: id, run: result.execution }));
    });

    return kept.size === 0 ? undefined : Object.freeze([...kept.values()]);
}

/** The parts of a note, in their saved key order. */
interface NoteParts {
    readonly id: NoteId;
    readonly time: string;
    readonly targets: readonly NoteTarget[];
    readonly text: string;
    readonly mediaType: string | undefined;
    readonly author: string | undefined;
    readonly edited: string | undefined;
    readonly cites: readonly NoteCite[] | undefined;
    readonly extensions: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Assemble a frozen record in the saved key order, leaving out what has no value, and refuse one
 * larger than 256 KB saved.
 * @param parts - The parts.
 * @returns The record.
 */
function recordOf(parts: NoteParts): Note {
    const record: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parts)) {
        if (value !== undefined) {
            record[key] = value;
        }
    }

    const json = JSON.stringify(record);
    // UTF-8 takes at most three bytes per UTF-16 unit, so only a long text needs counting.
    if (json.length * 3 > NOTE_LIMITS.noteBytes && utf8Bytes(json) > NOTE_LIMITS.noteBytes) {
        throw refuseNote("E_TOO_LARGE", "note-size", "The note, saved as JSON, would be larger than 256 KB.");
    }

    return Object.freeze(record) as unknown as Note;
}

/**
 * Check an `add` input and make the record it writes.
 * @param input - The input, as the caller gave it.
 * @param minted - The id and time graphty-element stamps, and the author setting.
 * @param minted.id - The id.
 * @param minted.time - The time.
 * @param minted.author - The author setting; undefined when none is set.
 * @param context - The session.
 * @returns The record, frozen.
 */
export function buildNote(
    input: unknown,
    minted: { readonly id: NoteId; readonly time: string; readonly author: string | undefined },
    context: NoteContext,
): Note {
    const given = isPlain(input) ? input : {};
    checkFields(given);
    const text = checkText(given.text);
    const targets = targetsOf(given.targets, context);
    const cites = given.cites === undefined ? undefined : citesOf(given.cites, context);
    const mediaType = given.mediaType === undefined ? undefined : checkMediaType(given.mediaType);
    const extensions = given.extensions === undefined ? undefined : checkExtensions(given.extensions);
    if (context.count >= NOTE_LIMITS.notes) {
        throw refuseNote("E_TOO_LARGE", "notes", "A session holds at most 10,000 notes.");
    }

    return recordOf({ ...minted, targets, text, mediaType, edited: undefined, cites, extensions });
}

/**
 * Check an `update` patch and make the record it writes.
 * @param held - The note now.
 * @param patch - The patch, as the caller gave it.
 * @param edited - The time to stamp.
 * @param context - The session.
 * @returns The record, frozen, keeping every unchanged part as the same object; null when the
 *     patch changes nothing.
 */
export function patchNote(held: Note, patch: unknown, edited: string, context: NoteContext): Note | null {
    const given = isPlain(patch) ? patch : {};
    checkFields(given);
    const same = <T>(next: T, now: T): T => (canonicalize(next) === canonicalize(now) ? now : next);
    const text = given.text === undefined ? held.text : checkText(given.text);
    const targets = given.targets === undefined ? held.targets : same(targetsOf(given.targets, context), held.targets);
    const cites = given.cites === undefined ? held.cites : same(citesOf(given.cites, context, held.cites), held.cites);
    // An optional field: left out is unchanged, `null` clears it.
    const optional = <T>(value: unknown, now: T | undefined, check: (value: unknown) => T): T | undefined => {
        if (value === undefined) {
            return now;
        }

        return value === null ? undefined : same(check(value), now);
    };
    const mediaType = optional(given.mediaType, held.mediaType, checkMediaType);
    const extensions = optional(given.extensions, held.extensions, checkExtensions);
    if (
        text === held.text &&
        targets === held.targets &&
        cites === held.cites &&
        mediaType === held.mediaType &&
        extensions === held.extensions
    ) {
        return null;
    }

    return recordOf({
        id: held.id,
        time: held.time,
        targets,
        text,
        mediaType,
        author: held.author,
        edited,
        cites,
        extensions,
    });
}
