/**
 * @file Version 2 framing (spec 2, 3, 8.5, 9): what form a file is, the wrapper and the section
 * header, `$schema`, `created` and `modified`, kind and key agreement, and the sections a reader
 * cannot load, held verbatim and written back. Section content is the codecs'.
 *
 * The size and depth limits are today's open-time checks, applied by `project.open` before a file
 * reaches this module. Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import type { GraphSession } from "../types";
import { canonicalJson } from "./codecs/dataRefs";
import { projectMemory, watchBoundaries } from "./memory";
import { migrateSection } from "./migration";
import {
    type BindsTo,
    type CodecRegistry,
    DOCUMENT_SECTIONS,
    type DocumentProblem,
    type DocumentSection,
    HEADER_MEMBERS,
    type JsonObject,
    type ReadSection,
    type SectionCodec,
    type SectionHeader,
    type SectionWrite,
} from "./types";

/** The wrapper's kind and the only wrapper version this reader knows. */
const WRAPPER_KIND = "graphty-document";
const WRAPPER_VERSION = 2;

/** The first version of each section kind that is a version 2 section (spec 9 rule 2). */
const FIRST_VERSION: Readonly<Record<DocumentSection, number>> = {
    data: 2,
    style: 2,
    recipe: 2,
    settings: 1,
    results: 2,
    notes: 2,
    view: 1,
};

/**
 * Why a section is held (spec 8.5); `unknown` is an unknown `sections` key and `malformed` a
 * section whose kind or version disagrees with its key, kept the same way (versions rule 3).
 */
type HeldReason = "version" | "extension" | "data" | "unknown" | "malformed";

/** A section kept verbatim and written back on save. */
export interface HeldSection {
    readonly value: unknown;
    readonly reason: HeldReason;
}

/** A file read as version 2: its form, its wrapper, the sections to load and the ones held. */
export interface ParsedDocument {
    readonly form: "full" | "section";
    /** A full file's wrapper members other than `sections`, in file order; empty for a section file. */
    readonly wrapper: Readonly<JsonObject>;
    /** The sections a codec can load, by name. */
    readonly sections: ReadonlyMap<DocumentSection, ReadSection>;
    /** The sections no codec loads, by key, verbatim. */
    readonly held: ReadonlyMap<string, HeldSection>;
    readonly problems: readonly DocumentProblem[];
}

/**
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
export function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The `$schema` a writer writes for a kind at a version (spec 3.2).
 * @param kind - The kind, `graphty-document` or `graphty-<section>`.
 * @param version - Its version.
 * @returns The URL.
 */
export function schemaUrl(kind: string, version: number): string {
    return `https://graphty.app/schema/documents/${kind}/v${String(version)}.json`;
}

/**
 * The section a kind names, when it names one of the seven.
 * @param kind - The kind.
 * @returns The section, or undefined.
 */
function sectionOfKind(kind: unknown): DocumentSection | undefined {
    if (typeof kind !== "string" || !kind.startsWith("graphty-")) {
        return undefined;
    }

    const name = kind.slice("graphty-".length);
    return (DOCUMENT_SECTIONS as readonly string[]).includes(name) ? (name as DocumentSection) : undefined;
}

/**
 * Whether a parsed file is a version 2 document: a version 2 wrapper, or a section file of a
 * section kind at a version 2 section version or later. Anything else (a version 1 document, a
 * version 1 member, a data file) is read as before.
 * @param value - The parsed file.
 * @returns True for a version 2 full or section file.
 */
export function isVersion2(value: unknown): value is JsonObject {
    if (!isJsonObject(value) || !Number.isInteger(value.version)) {
        return false;
    }

    if (value.kind === WRAPPER_KIND) {
        return (value.version as number) >= WRAPPER_VERSION;
    }

    const section = sectionOfKind(value.kind);
    return section !== undefined && (value.version as number) >= FIRST_VERSION[section];
}

/**
 * A JSON pointer token (RFC 6901).
 * @param name - The member name.
 * @returns The escaped token.
 */
function token(name: string): string {
    return name.replaceAll("~", "~0").replaceAll("/", "~1");
}

/**
 * The refusal of a malformed document.
 * @param details - What was wrong.
 * @returns The error.
 */
function badDocument(details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_DOCUMENT",
        message: "The graphty document is malformed.",
        source: "data",
        details,
    });
}

/** What reading one section gave: a section to load or a section to hold. */
type SectionOutcome = { readonly load: ReadSection } | { readonly hold: HeldSection };

/**
 * The extension names a section's `dependencies.extensions` lists (spec 3.6 rule 4).
 * @param header - The section's header.
 * @returns The names; every one is one this reader lacks, since it knows none.
 */
function requiredExtensions(header: SectionHeader): string[] {
    const listed = header.dependencies?.extensions;
    if (!Array.isArray(listed)) {
        return [];
    }

    return listed.map((entry) => (isJsonObject(entry) && typeof entry.name === "string" ? entry.name : String(entry)));
}

/**
 * Check one section against its key and sort it: load, hold, or refuse.
 * @param name - The section it must be.
 * @param value - What the file holds.
 * @param pointer - Where it is in the file.
 * @param codec - The codec for its section.
 * @param problems - Collects the reports.
 * @returns What to do with it.
 */
function readSection(
    name: DocumentSection,
    value: unknown,
    pointer: string,
    codec: SectionCodec,
    problems: DocumentProblem[],
): SectionOutcome {
    if (
        !isJsonObject(value) ||
        value.kind !== `graphty-${name}` ||
        !Number.isInteger(value.version) ||
        (value.version as number) < 1
    ) {
        // Refused, and kept as it is: the next save writes it back rather than dropping it.
        problems.push({ code: "E_BAD_DOCUMENT", params: { section: name } });
        return { hold: { value, reason: "malformed" } };
    }

    if ((value.version as number) < Math.min(...codec.reads)) {
        const upgraded = migrateSection(name, value, problems);
        if (upgraded !== undefined && codec.reads.includes(upgraded.version as number)) {
            return readSection(name, upgraded, pointer, codec, problems);
        }
    }

    const header = value as unknown as SectionHeader;
    const { version } = header;
    if (value.$schema !== undefined && value.$schema !== schemaUrl(header.kind, version)) {
        problems.push({
            code: "W_SCHEMA_MISMATCH",
            params: {
                section: name,
                schema: typeof value.$schema === "string" ? value.$schema : JSON.stringify(value.$schema),
            },
        });
    }

    if (version > Math.max(...codec.reads) || !codec.reads.includes(version)) {
        // Newer than this reader knows, or an older version its migration did not upgrade: held
        // as it is.
        problems.push({ code: "W_SECTION_KEPT", params: { section: name, version, reason: "version" } });
        return { hold: { value, reason: "version" } };
    }

    const extensions = requiredExtensions(header);
    if (extensions.length > 0) {
        for (const extension of extensions) {
            problems.push({ code: "W_EXTENSION_REQUIRED", params: { section: name, extension } });
        }

        problems.push({ code: "W_SECTION_KEPT", params: { section: name, version, reason: "extension" } });
        return { hold: { value, reason: "extension" } };
    }

    return { load: { header, body: bodyOf(name, value, pointer, codec, problems), pointer } };
}

/**
 * A section's body: every member that is not a header member, the ones its codec does not know
 * reported as `W_UNKNOWN_MEMBER` and kept.
 * @param name - The section.
 * @param value - The section as read.
 * @param pointer - Where it is in the file.
 * @param codec - Its codec.
 * @param problems - Collects the reports.
 * @returns The body, in file order.
 */
function bodyOf(
    name: DocumentSection,
    value: Readonly<JsonObject>,
    pointer: string,
    codec: SectionCodec,
    problems: DocumentProblem[],
): JsonObject {
    const known = new Set<string>([...HEADER_MEMBERS, ...codec.members]);
    const body: JsonObject = {};
    for (const [member, each] of Object.entries(value)) {
        if ((HEADER_MEMBERS as readonly string[]).includes(member)) {
            continue;
        }

        body[member] = each;
        if (!known.has(member)) {
            problems.push({
                code: "W_UNKNOWN_MEMBER",
                params: { section: name, pointer: `${pointer}/${token(member)}` },
            });
        }
    }

    return body;
}

/**
 * Read a parsed version 2 file into the sections to load and the ones held (spec 2, 8.5).
 * @param value - The parsed file, already within the size and depth limits.
 * @param codecs - The codecs, by section.
 * @returns The document.
 * @throws A `GraphtyError` with `E_UNSUPPORTED_VERSION` for a wrapper newer than version 2, and
 *     `E_BAD_DOCUMENT` for a wrapper whose `sections` is not an object.
 */
export function parseDocument(value: JsonObject, codecs: CodecRegistry): ParsedDocument {
    const problems: DocumentProblem[] = [];
    const sections = new Map<DocumentSection, ReadSection>();
    const held = new Map<string, HeldSection>();
    const sort = (key: string, each: unknown, pointer: string): void => {
        const name = (DOCUMENT_SECTIONS as readonly string[]).includes(key) ? (key as DocumentSection) : undefined;
        const codec = name === undefined ? undefined : codecs[name];
        if (name === undefined || codec === undefined) {
            problems.push({ code: "W_UNKNOWN_KIND", params: { section: key } });
            held.set(key, { value: each, reason: "unknown" });
            return;
        }

        const outcome = readSection(name, each, pointer, codec, problems);
        if ("hold" in outcome) {
            held.set(key, outcome.hold);
        } else if (codec.holds?.(outcome.load, problems) === true) {
            // Known, but it cannot be applied whole (a data section this reader cannot build):
            // held before anything is applied, so an open never half-replaces the project.
            problems.push({
                code: "W_SECTION_KEPT",
                params: { section: name, version: outcome.load.header.version, reason: "data" },
            });
            held.set(key, { value: each, reason: "data" });
        } else {
            sections.set(name, outcome.load);
        }
    };

    if (value.kind !== WRAPPER_KIND) {
        const name = sectionOfKind(value.kind) ?? String(value.kind);
        sort(name, value, "");
        return { form: "section", wrapper: {}, sections, held, problems };
    }

    if (value.version !== WRAPPER_VERSION) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED_VERSION",
            message: `This graphty document is version ${String(value.version)}; this graphty-element reads version ${String(WRAPPER_VERSION)}.`,
            source: "data",
            details: { kind: WRAPPER_KIND, found: value.version as number, reads: [1, WRAPPER_VERSION] },
        });
    }

    const { sections: listed, ...wrapper } = value;
    if (!isJsonObject(listed)) {
        throw badDocument({ member: "sections" });
    }

    for (const [key, each] of Object.entries(listed)) {
        sort(key, each, `/sections/${token(key)}`);
    }

    return { form: "full", wrapper, sections, held, problems };
}

// ---------------------------------------------------------------------------------------------
// What a session remembers between an open and the next save
// ---------------------------------------------------------------------------------------------

/** When a section first existed and last changed, and a digest of its content then. */
interface Stamp {
    /** Absent for a section read without one: a write back does not invent it. */
    readonly created?: string;
    readonly modified: string;
    readonly digest: string;
}

/** What one session remembers of the version 2 files it opened and saved. */
export interface DocumentState {
    /** The open data's id (spec 3.3); minted on first need. */
    dataId?: string;
    /** Sections no codec loaded, by key, written back on save (spec 8.5). */
    readonly held: Map<string, HeldSection>;
    /** Each loaded section's unknown top-level members, written back after its body. */
    readonly kept: Map<DocumentSection, JsonObject>;
    /** Each loaded section's `extensions`, written back. */
    readonly extensions: Map<DocumentSection, JsonObject>;
    /** Each section's `created` and `modified`. */
    readonly stamps: Map<DocumentSection, Stamp>;
    /**
     * The opened project's wrapper members this writer does not write itself, its `created`, and
     * its `extensions`, written back under the caller's.
     */
    wrapper: { readonly created?: string; readonly kept: JsonObject; readonly extensions?: JsonObject };
    /**
     * Each section an open loaded: what its codec wrote right after the open (canonical JSON),
     * and the section as read. A save whose codec writes the same again writes the section as
     * read, so what this release cannot represent is not lost (`document.ts`).
     */
    readonly opened: Map<
        DocumentSection,
        { readonly baseline: string; readonly read: SectionWrite; readonly bindsTo?: BindsTo }
    >;
}

/** Forgotten at every project boundary (`memory.ts`), so one project's state never reaches the next. */
const STATES = projectMemory<DocumentState>();

/**
 * A session's version 2 document state.
 * @param session - The session.
 * @returns Its state, created empty on first use.
 */
export function documentStateOf(session: GraphSession): DocumentState {
    watchBoundaries(session);
    let state = STATES.get(session);
    if (state === undefined) {
        state = {
            held: new Map(),
            kept: new Map(),
            extensions: new Map(),
            stamps: new Map(),
            wrapper: { kept: {} },
            opened: new Map(),
        };
        STATES.set(session, state);
    }

    return state;
}

/**
 * A fresh id: 128 random bits in hex (`randomUUID` exists only in secure contexts).
 * @returns The id.
 */
export function newDocumentId(): string {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The hex SHA-256 of a text.
 * @param text - The text.
 * @returns The digest.
 */
async function digestOf(text: string): Promise<string> {
    const bytes = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Members that change on every save, or that the framing derives, and say nothing about content.
 */
const UNSTAMPED = new Set(["$schema", "kind", "version", "created", "modified", "generator"]);

/**
 * The digest of a section's content: every member but the ones a save always rewrites.
 * @param section - The section.
 * @returns The digest.
 */
function contentDigest(section: Readonly<JsonObject>): Promise<string> {
    // Canonical, so a member order a file chose does not count as a change.
    return digestOf(
        canonicalJson(Object.fromEntries(Object.entries(section).filter(([member]) => !UNSTAMPED.has(member)))),
    );
}

/** Members wrapper code writes itself; any other wrapper member read is written back. */
const WRAPPER_OWN = new Set([
    "$schema",
    "kind",
    "version",
    "id",
    "name",
    "created",
    "modified",
    "generator",
    "sections",
    "extensions",
]);

/**
 * Remember what an open read, so the next save writes it back: each loaded section's unknown
 * members, extensions and times and, when the open replaced the project, the held and unknown
 * sections and the wrapper's own members. An additive open (a kit, a section file) reports what it
 * held and records none of it: a held section is never the project's own section of its kind.
 * @param state - The session's document state, fresh when the open replaced the project.
 * @param parsed - What was read.
 * @param loaded - The sections that loaded.
 * @param held - The sections the open holds as the project's, when it replaced the project.
 */
export async function rememberOpened(
    state: DocumentState,
    parsed: ParsedDocument,
    loaded: ReadonlySet<DocumentSection>,
    held?: ReadonlyMap<string, HeldSection>,
): Promise<void> {
    if (held !== undefined) {
        state.held.clear();
        for (const [key, each] of held) {
            state.held.set(key, each);
        }

        if (parsed.form === "full") {
            const kept = Object.fromEntries(
                Object.entries(parsed.wrapper).filter(([member]) => !WRAPPER_OWN.has(member)),
            );
            const { created, extensions } = parsed.wrapper;
            state.wrapper = {
                ...(typeof created === "string" ? { created } : {}),
                kept,
                ...(isJsonObject(extensions) ? { extensions } : {}),
            };
        }
    }

    for (const name of loaded) {
        const section = parsed.sections.get(name);
        if (section === undefined) {
            continue;
        }

        state.held.delete(name);
        const { header } = section;
        state.extensions.set(name, header.extensions ?? {});
        const stampNow = new Date().toISOString();
        // The header is the section as read, body included: a save that writes it back unchanged
        // keeps its `modified`.
        state.stamps.set(name, {
            ...(header.created === undefined ? {} : { created: header.created }),
            modified: header.modified ?? stampNow,
            digest: await contentDigest(header as unknown as JsonObject),
        });
    }
}

/**
 * Remember which body members of a loaded section its codec did not know, to write them back.
 * @param state - The session's document state.
 * @param name - The section.
 * @param section - The section as read.
 * @param codec - Its codec.
 */
export function rememberUnknownMembers(
    state: DocumentState,
    name: DocumentSection,
    section: ReadSection,
    codec: SectionCodec,
): void {
    const known = new Set(codec.members);
    state.kept.set(name, Object.fromEntries(Object.entries(section.body).filter(([member]) => !known.has(member))));
}

/**
 * A section as a writer writes it: the header in spec order, then the codec's body, then the
 * members an earlier file held that this version does not know.
 * @param name - The section.
 * @param codec - Its codec.
 * @param written - What the codec wrote.
 * @param framed - The header members the framing owns.
 * @param framed.generator - The writing software.
 * @param framed.id - The section's id when the framing owns it (the data section's).
 * @param framed.bindsTo - The `bindsTo` of a bound section.
 * @param state - The session's document state, whose times it updates.
 * @param now - The time of this save.
 * @returns The section.
 */
export async function assembleSection(
    name: DocumentSection,
    codec: SectionCodec,
    written: SectionWrite,
    framed: { readonly generator: JsonObject; readonly id?: string; readonly bindsTo?: JsonObject },
    state: DocumentState,
    now: string,
): Promise<JsonObject> {
    const kind = `graphty-${name}`;
    const header: JsonObject = {
        ...written.header,
        ...(framed.id === undefined ? {} : { id: framed.id }),
        ...(framed.bindsTo === undefined ? {} : { bindsTo: framed.bindsTo }),
    };
    const extensions = state.extensions.get(name);
    if (extensions !== undefined && Object.keys(extensions).length > 0) {
        header.extensions = extensions;
    }

    const kept = state.kept.get(name) ?? {};
    const content: JsonObject = {};
    for (const member of HEADER_MEMBERS) {
        if (header[member] !== undefined) {
            content[member] = header[member];
        }
    }

    Object.assign(content, written.body);
    for (const [member, value] of Object.entries(kept)) {
        if (!(member in written.body)) {
            content[member] = value;
        }
    }

    const digest = await contentDigest(content);
    const was = state.stamps.get(name);
    const created = was === undefined ? now : was.created;
    const stamp: Stamp = {
        ...(created === undefined ? {} : { created }),
        modified: was?.digest === digest ? was.modified : now,
        digest,
    };
    state.stamps.set(name, stamp);

    return framedSection(content, {
        $schema: schemaUrl(kind, codec.version),
        kind,
        version: codec.version,
        created: stamp.created,
        modified: stamp.modified,
        generator: framed.generator,
    });
}

/**
 * A section in spec order: the header members, the framing's own in place, then the body.
 * @param content - The codec's header members and body, and the members kept from the open.
 * @param own - The header members the framing writes.
 * @returns The section.
 */
function framedSection(content: Readonly<JsonObject>, own: Readonly<JsonObject>): JsonObject {
    const section: JsonObject = {};
    for (const member of HEADER_MEMBERS) {
        const value = member in own ? own[member] : content[member];
        if (value !== undefined) {
            section[member] = value;
        }
    }

    for (const [member, value] of Object.entries(content)) {
        if (!(member in section)) {
            section[member] = value;
        }
    }

    return section;
}

/**
 * The wrapper's `extensions` member, absent when empty.
 * @param extensions - The opened file's extensions under the caller's.
 * @returns The member, or nothing.
 */
function extensionsOf(extensions: Readonly<JsonObject>): JsonObject {
    return Object.keys(extensions).length === 0 ? {} : { extensions };
}

/**
 * The full file around its sections (spec 2.2).
 * @param state - The session's document state, for the wrapper members an earlier file held.
 * @param members - The wrapper members this writer writes.
 * @param members.id - The project's id.
 * @param members.name - The project's name, or null.
 * @param members.generator - The writing software.
 * @param members.extensions - The caller's extensions.
 * @param sections - The sections, by key, in file order.
 * @param now - The time of this save.
 * @returns The wrapper.
 */
export function assembleWrapper(
    state: DocumentState,
    members: {
        readonly id: string;
        readonly name: string | null;
        readonly generator: JsonObject;
        readonly extensions: Readonly<JsonObject>;
    },
    sections: JsonObject,
    now: string,
): JsonObject {
    const created = state.wrapper.created ?? now;
    state.wrapper = { ...state.wrapper, created };
    return {
        $schema: schemaUrl(WRAPPER_KIND, WRAPPER_VERSION),
        kind: WRAPPER_KIND,
        version: WRAPPER_VERSION,
        id: members.id,
        ...(members.name === null ? {} : { name: members.name }),
        created,
        modified: now,
        generator: members.generator,
        ...state.wrapper.kept,
        sections,
        ...extensionsOf({ ...state.wrapper.extensions, ...members.extensions }),
    };
}
