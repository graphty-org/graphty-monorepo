/**
 * @file The `graphty-sources` member of a project file, version 2 (design/documents/sources.md):
 * one entry per load still in the graph, written from `data.sources()`, the network load records
 * and the facts each load left; read back closed, entry by entry; and version 1, the experimental
 * shape graphty-element 3.x wrote for network loads only, upgraded on read.
 *
 * Nothing here holds a secret: a load that used a credential is written as the name of the slot it
 * filled, and a URL loses its user name, password, fragment and every query parameter whose name
 * marks a credential.
 */

import type { NodeId, SourceKey } from "../../catalog/types";
import type { GraphtyErrorCode, GraphtyWarningCode } from "../../errors/codes";
import type { CodedFact } from "../shared";
import type { LoadedSource } from "../types";
import { SOURCE_RECORD_MEMBER, SOURCES_MEMBER_VERSION } from "./ids";
import type { SourceLoadRecord } from "./types";

/** The member's kind. */
const KIND = SOURCE_RECORD_MEMBER;

/** The slot a credential fills for a source that declares none (sources.md, "Credential slots"). */
const DEFAULT_SLOT = "default";

/** The names an entry's `options` never holds (sources.md, "Options" rules 1 and 2). */
const FORBIDDEN_OPTIONS = ["data", "file", "url", "credential", "write", "signal", "fetch", "cursor", "retry"];

/** A query parameter whose name marks a credential (sources.md, "URLs" rule 2). */
const SECRET_PARAM = /^(key|apikey|api_key|api-key|token|access_token|auth|password|secret|signature|sig|x-amz-.*)$/i;

/** An entry id: 1 to 64 of [A-Za-z0-9._-], starting with a letter or digit. */
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** RFC 3339 with an explicit offset. */
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** SHA-256 as lower-case hex. */
const SHA256 = /^[0-9a-f]{64}$/;

/** The limits of version 2 (sources.md, "Limits"). */
const LIMITS = {
    entries: 1000,
    expansions: 10_000,
    seeds: 1000,
    bytes: 16 * 1024 * 1024,
    map: 262_144,
    extensions: 65_536,
} as const;

/** What an entry's kind part is, by kind. */
const PARTS = ["file", "url", "source", "sample"] as const;

/** A code the member reports. */
type ProblemCode = GraphtyErrorCode | GraphtyWarningCode;

/** A problem with the member, as a code and the values it is about. */
export type SourcesProblem = CodedFact<ProblemCode>;

/** What the session keeps about one load beside `data.sources()`: what an entry records that a listed load does not. */
export interface LoadFacts {
    /** When the load finished, RFC 3339, as read or as `toISOString()` wrote it. */
    readonly loadedAt: string;
    /** Whether it emptied the graph first. */
    readonly mode: "replace" | "merge";
    /** The bytes a file load read. */
    readonly file?: {
        readonly name?: string;
        readonly size: number;
        readonly sha256?: string;
        readonly mediaType?: string;
    };
    /** What a URL load read; its address is the listed load's `config.url`. */
    readonly url?: {
        readonly sha256?: string;
        readonly fetchedAt: string;
        readonly etag?: string;
        readonly lastModified?: string;
        readonly dropped?: readonly string[];
    };
    /** What a generated graph or a dataset was. */
    readonly sample?: Readonly<Record<string, unknown>>;
    /** The import options given beside the source's own configuration (a draft's mapping). */
    readonly options?: Readonly<Record<string, unknown>>;
    /** The credential slot a network load filled, as an opened file said. */
    readonly credentialSlot?: string;
    /** An entry read from a file that cannot run: written back exactly as read. */
    readonly kept?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------------------------

/**
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A JSON copy: objects, arrays, strings, finite numbers, booleans and null, nothing else (a file, a
 * function or a signal is left out).
 * @param value - The value.
 * @returns The copy, or undefined for a value JSON cannot hold.
 */
function jsonOf(value: unknown): unknown {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }

    if (Array.isArray(value)) {
        return value.map((each) => jsonOf(each) ?? null);
    }

    if (isObject(value) && Object.getPrototypeOf(value) === Object.prototype) {
        return Object.fromEntries(
            Object.entries(value).flatMap(([name, each]) => {
                const copy = jsonOf(each);
                return copy === undefined ? [] : [[name, copy]];
            }),
        );
    }

    return undefined;
}

/**
 * An object without the members whose value is undefined.
 * @param value - The object.
 * @returns The copy.
 */
function defined(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(value).filter(([, each]) => each !== undefined));
}

/**
 * The size of a value as JSON text, in UTF-8 bytes.
 * @param value - The value.
 * @returns The bytes.
 */
function jsonBytes(value: unknown): number {
    return new TextEncoder().encode(JSON.stringify(value) ?? "").length;
}

/**
 * A URL as an entry writes it: no user name, password or fragment, and none of the query
 * parameters whose names mark a credential.
 * @param raw - The URL as the load read it.
 * @returns The address and the parameter names left out.
 */
export function redactUrl(raw: string): { address: string; dropped: string[] } {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        // ponytail: a relative URL is written as given, without its fragment; resolve it against
        // the page if a relative URL load ever needs its credentials stripped.
        return { address: raw.split("#")[0] ?? raw, dropped: [] };
    }

    url.username = "";
    url.password = "";
    url.hash = "";
    const dropped = [...new Set(url.searchParams.keys())].filter((name) => SECRET_PARAM.test(name));
    for (const name of dropped) {
        url.searchParams.delete(name);
    }

    return { address: url.toString(), dropped };
}

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

/** What the writer reads. */
export interface SourcesWriteInput {
    /** `data.sources()`: every load still in the graph, oldest first. */
    readonly sources: readonly LoadedSource[];
    /** `data.loads()`: the network load records the graph holds rows of. */
    readonly loads: readonly SourceLoadRecord[];
    /** The facts each load left, by its key; a load without any is given them now. */
    readonly facts: Map<SourceKey, LoadFacts>;
}

/** What a save writes about the loads. */
export interface SourcesWrite {
    /** The member, or null when the session holds no load. */
    readonly member: Record<string, unknown> | null;
    /** What the save left out: `W_SOURCE_URL_REDACTED` with `{ id, names }`. */
    readonly problems: readonly SourcesProblem[];
    /**
     * The `_source.loads` value a record's own value is saved as: a network load's key as its
     * entry's id, an expansion's as `<entry>/x<n>`, anything else as it is.
     */
    readonly idOf: (value: string) => string;
    /** Where an id sits in the member, for writing a record's loads oldest first; unknown ids last. */
    readonly rank: (id: string) => number;
}

/**
 * The options an entry records: the importer's own, never the data, where it came from or a call's state.
 * @param values - The options as given.
 * @returns The options, or undefined when none is left.
 */
function optionsOf(values: Readonly<Record<string, unknown>> | undefined): Record<string, unknown> | undefined {
    const copy = Object.entries(jsonOf(values ?? {}) as Record<string, unknown>).filter(
        ([name]) => !FORBIDDEN_OPTIONS.includes(name),
    );
    return copy.length === 0 ? undefined : Object.fromEntries(copy);
}

/**
 * A record's validators, as the schema lists them.
 * @param values - The validators.
 * @returns The ones an entry holds.
 */
function validatorsOf(values: unknown): Record<string, unknown> {
    const held = isObject(values) ? values : {};
    return Object.fromEntries(
        (["etag", "lastModified", "modified", "serverVersion", "contentHash"] as const).flatMap((name) =>
            typeof held[name] === "string" ? [[name, held[name]]] : [],
        ),
    );
}

/**
 * The network part of an entry.
 * @param record - The load's record.
 * @param id - The entry's id.
 * @param slot - The credential slot it filled, when one did.
 * @param rename - Collects each expansion's key and the id it is written as.
 * @returns The part.
 */
function sourcePart(
    record: SourceLoadRecord,
    id: string,
    slot: string | undefined,
    rename: Map<string, string>,
): Record<string, unknown> {
    const expansions = record.expansions.map((expansion, at) => {
        const written = `${id}/x${String(at + 1)}`;
        rename.set(expansion.key, written);
        return defined({
            id: written,
            ids: [...expansion.ids],
            depth: expansion.depth,
            direction: expansion.direction,
            limit: expansion.limit,
            at: expansion.at,
            next: jsonOf(expansion.next) ?? null,
            validators: validatorsOf(expansion.validators),
        });
    });
    return defined({
        id: record.source,
        sourceVersion: record.version,
        endpoint: record.endpoint,
        params: jsonOf(record.config) ?? {},
        credentialSlot: record.credential === null ? slot : DEFAULT_SLOT,
        pages: Math.max(1, record.pages),
        next: jsonOf(record.next) ?? null,
        validators: validatorsOf(record.validators),
        expand: record.expand === undefined ? undefined : jsonOf(record.expand),
        expansions,
    });
}

/** One entry as written, and what writing it found. */
interface Written {
    readonly entry: Record<string, unknown>;
    readonly dropped: readonly string[];
}

/**
 * The kind part and kind of an entry that is no network load.
 * @param load - The listed load.
 * @param facts - Its facts.
 * @returns The kind, the part, and the query parameters a URL left out.
 */
function localPart(
    load: LoadedSource,
    facts: LoadFacts,
): { kind: string; part: Record<string, unknown>; dropped: readonly string[] } {
    const url = load.config?.url;
    if (load.kind === "sample") {
        return { kind: "sample", part: { ...(facts.sample ?? { dataset: load.name ?? "sample" }) }, dropped: [] };
    }

    if (typeof url === "string") {
        const { address, dropped } = redactUrl(url);
        const names = [...new Set([...(facts.url?.dropped ?? []), ...dropped])];
        const part = defined({
            address,
            sha256: facts.url?.sha256,
            fetchedAt: facts.url?.fetchedAt ?? facts.loadedAt,
            etag: facts.url?.etag,
            lastModified: facts.url?.lastModified,
            dropped: names.length === 0 ? undefined : names,
        });
        return { kind: "url", part, dropped };
    }

    const { file } = facts;
    return {
        kind: "file",
        part: defined({
            name: file?.name,
            size: file?.size ?? load.size ?? 0,
            sha256: file?.sha256,
            mediaType: file?.mediaType,
        }),
        dropped: [],
    };
}

/**
 * One entry, in the order sources.md, "Writing" rule 1 lists its members.
 * @param load - The listed load.
 * @param facts - Its facts.
 * @param record - Its network record, for a network load.
 * @param rename - Collects each network key and the id it is written as.
 * @returns The entry and the parameters its URL left out.
 */
function entryOf(
    load: LoadedSource,
    facts: LoadFacts,
    record: SourceLoadRecord | undefined,
    rename: Map<string, string>,
): Written {
    const network = record !== undefined;
    if (network) {
        rename.set(record.key, load.key);
    }

    const local = network ? undefined : localPart(load, facts);
    const kind = local?.kind ?? "source";
    const part = local?.part ?? sourcePart(record as SourceLoadRecord, load.key, facts.credentialSlot, rename);
    const { mode: _mode, ...recorded } = record?.options ?? {};
    const options = optionsOf(network ? recorded : { ...load.config, ...facts.options });
    const entry = defined({
        id: load.key,
        kind,
        name: load.name,
        loadedAt: facts.loadedAt,
        mode: facts.mode,
        format: network || load.type === undefined ? undefined : load.type,
        [kind]: part,
        options,
        tables: load.tables.length === 0 ? undefined : [...load.tables],
        tableRows: load.tableRows === undefined ? undefined : [...load.tableRows],
        joinedOnto: load.joinedOnto,
        added: { nodes: load.added.nodes, edges: load.added.edges },
        total: record?.total === undefined ? undefined : { nodes: record.total },
    });
    return { entry, dropped: local?.dropped ?? [] };
}

/**
 * The mode of a load the file or the session does not say: a load listed after another one added
 * to it, because a replacing load would have emptied the list.
 * @param at - Its position in the list.
 * @returns Its mode.
 */
function listedMode(at: number): "replace" | "merge" {
    return at === 0 ? "replace" : "merge";
}

/**
 * The facts of a load, given now to one that has none, so the same session saves the same bytes.
 * @param input - What the writer reads.
 * @param load - The load.
 * @param at - Its position.
 * @param record - Its network record, for a network load.
 * @returns The facts.
 */
function factsOf(input: SourcesWriteInput, load: LoadedSource, at: number, record?: SourceLoadRecord): LoadFacts {
    const held = input.facts.get(load.key);
    if (held !== undefined) {
        return held;
    }

    const mode = record?.options.mode;
    const facts: LoadFacts = {
        loadedAt: record?.loadedAt ?? new Date().toISOString(),
        mode: mode === "replace" || mode === "merge" ? mode : listedMode(at),
    };
    input.facts.set(load.key, facts);
    return facts;
}

/**
 * The record of a network load the session lists without one (a recovered session whose records
 * were lost): its source and params, as the listed load says, and nothing more.
 * @param load - The listed load.
 * @returns The record.
 */
function stubRecord(load: LoadedSource): SourceLoadRecord {
    return {
        key: load.key,
        source: (load.type ?? "").replace(/^source:/, ""),
        version: 1,
        config: load.config ?? {},
        endpoint: null,
        options: {},
        loadedAt: new Date().toISOString(),
        pages: 1,
        next: null,
        validators: {},
        credential: null,
        expansions: [],
    };
}

/**
 * The `graphty-sources` member a save writes, and how each record's `_source.loads` is written.
 * @param input - The listed loads, their records and their facts.
 * @returns The member, what the save left out, and the id and rank of a record's value.
 */
export function writeSourcesMember(input: SourcesWriteInput): SourcesWrite {
    const rename = new Map<string, string>();
    const problems: SourcesProblem[] = [];
    const records = new Map(input.loads.map((record) => [record.key, record]));
    const loads = input.sources.map((load, at) => {
        const record = load.kind === "server" ? (records.get(load.loadKey ?? "") ?? stubRecord(load)) : undefined;
        const facts = factsOf(input, load, at, record);
        if (facts.kept !== undefined) {
            return jsonOf(facts.kept) as Record<string, unknown>;
        }

        const { entry, dropped } = entryOf(load, facts, record, rename);
        if (dropped.length > 0) {
            problems.push({ code: "W_SOURCE_URL_REDACTED", params: { id: load.key, names: [...dropped] } });
        }

        return entry;
    });
    const order = new Map<string, number>();
    loads.forEach((entry, at) => order.set(String(entry.id), at));
    return {
        member: loads.length === 0 ? null : { kind: KIND, version: SOURCES_MEMBER_VERSION, loads },
        problems,
        idOf: (value) => rename.get(value) ?? value,
        rank: (id) => {
            const [entry, expansion] = id.split("/x");
            const at = order.get(entry ?? "");
            return at === undefined ? Number.POSITIVE_INFINITY : at * (LIMITS.expansions + 1) + Number(expansion ?? 0);
        },
    };
}

/**
 * The `_source.loads` value a record is saved with: the loads that supplied it, then the keys its
 * own value names, each once, oldest first.
 * @param supplied - The entries that supplied it (`data.sourcesOf`).
 * @param own - Its own `_source.loads` value, in the session's keys.
 * @param write - The writer's ids and ranks.
 * @returns The value, or undefined when it names nothing.
 */
export function savedLoads(
    supplied: readonly string[],
    own: readonly string[],
    write: Pick<SourcesWrite, "idOf" | "rank">,
): string[] | undefined {
    const ids = [...new Set([...supplied, ...own.map(write.idOf)])];
    if (ids.length === 0) {
        return undefined;
    }

    // A stable sort: values naming nothing in the member keep their order, after the rest.
    return ids
        .map((id, at) => ({ id, at, rank: write.rank(id) }))
        .sort((a, b) => (a.rank === b.rank ? a.at - b.at : a.rank - b.rank))
        .map((each) => each.id);
}

// ---------------------------------------------------------------------------------------------
// Reading: the checks
// ---------------------------------------------------------------------------------------------

/** A value's check: true when it is of the right type and range. */
type Check = (value: unknown) => boolean;

/** A closed object's members and which are required. */
interface Shape {
    readonly fields: Readonly<Record<string, Check | Shape | ShapeList>>;
    readonly required?: readonly string[];
}

/** An array of closed objects. */
interface ShapeList {
    readonly items: Shape;
    readonly max: number;
}

/**
 * The number of Unicode code points in a string.
 * @param text - The string.
 * @returns The count.
 */
function codePoints(text: string): number {
    let count = 0;
    for (const _ of text) {
        count++;
    }

    return count;
}

const text =
    (min: number, max: number): Check =>
    (value) =>
        typeof value === "string" && codePoints(value) >= min && codePoints(value) <= max;
const integer =
    (min: number, max = Number.MAX_SAFE_INTEGER): Check =>
    (value) =>
        Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const oneOf =
    (...values: readonly unknown[]): Check =>
    (value) =>
        values.includes(value);
const pattern =
    (form: RegExp): Check =>
    (value) =>
        typeof value === "string" && form.test(value);
const time: Check = (value) => pattern(TIME)(value) && !Number.isNaN(Date.parse(value as string));
const openMap: Check = isObject;
const cursor: Check = (value) => value === null || isObject(value);
const names: Check = (value) => Array.isArray(value) && value.length <= 256 && value.every(text(1, 1024));
const count = integer(0);
const direction = oneOf("out", "in", "both");

const VALIDATORS: Shape = {
    fields: {
        etag: text(0, 1024),
        lastModified: text(0, 1024),
        modified: text(0, 1024),
        serverVersion: text(0, 1024),
        contentHash: pattern(SHA256),
    },
};

const EXPAND: Shape = {
    fields: {
        trigger: oneOf("none", "click", "double-click"),
        depth: integer(1, 10),
        direction,
        limit: integer(1),
        relationshipTypes: names,
        layout: oneOf("continue", "none"),
    },
};

const EXPANSION: Shape = {
    fields: {
        id: pattern(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}\/x[1-9]\d*$/),
        ids: (value) =>
            Array.isArray(value) &&
            value.length >= 1 &&
            value.every((id) => typeof id === "string" || typeof id === "number"),
        depth: integer(1, 10),
        direction,
        limit: integer(1),
        relationshipTypes: names,
        at: time,
        next: cursor,
        validators: VALIDATORS,
    },
    required: ["id", "ids", "depth", "direction", "at", "next", "validators"],
};

const COUNTS: Shape = { fields: { nodes: count, edges: count } };

/** Each kind part's shape. */
const PART_SHAPES: Readonly<Record<(typeof PARTS)[number], Shape | Check>> = {
    file: {
        fields: { name: text(1, 1024), size: count, sha256: pattern(SHA256), mediaType: text(0, 255) },
        required: ["size"],
    },
    url: {
        fields: {
            address: text(1, 8192),
            sha256: pattern(SHA256),
            fetchedAt: time,
            etag: text(0, 1024),
            lastModified: text(0, 1024),
            dropped: names,
        },
        required: ["address", "fetchedAt"],
    },
    source: {
        fields: {
            id: text(1, 128),
            sourceVersion: integer(1),
            endpoint: (value) => value === null || text(0, 8192)(value),
            params: openMap,
            credentialSlot: pattern(ID),
            pages: integer(1),
            next: cursor,
            validators: VALIDATORS,
            expand: EXPAND,
            expansions: { items: EXPANSION, max: LIMITS.expansions },
        },
        required: ["id", "sourceVersion", "endpoint", "params", "pages", "next", "validators", "expansions"],
    },
    sample: (value) =>
        isObject(value) &&
        ((text(1, 128)(value.generator) &&
            openMap(value.params) &&
            Object.keys(value).every((name) => name === "generator" || name === "params")) ||
            (text(1, 128)(value.dataset) &&
                (value.baseUrl === undefined || text(1, 8192)(value.baseUrl)) &&
                Object.keys(value).every((name) => name === "dataset" || name === "baseUrl"))),
};

const ENTRY: Shape = {
    fields: {
        id: pattern(ID),
        kind: text(1, 128),
        name: text(0, 1024),
        graph: pattern(ID),
        loadedAt: time,
        mode: oneOf("replace", "merge"),
        format: text(1, 128),
        options: openMap,
        tables: names,
        tableRows: (value) =>
            Array.isArray(value) && value.length <= 256 && value.every((rows) => rows === "nodes" || rows === "edges"),
        joinedOnto: pattern(ID),
        added: { ...COUNTS, required: ["nodes", "edges"] },
        total: COUNTS,
        file: PART_SHAPES.file,
        url: PART_SHAPES.url,
        source: PART_SHAPES.source,
        sample: PART_SHAPES.sample,
        extensions: openMap,
    },
    required: ["id", "kind", "loadedAt", "mode", "added"],
};

/**
 * Check a value against a closed shape, collecting the pointer of every member it does not list
 * and every value of the wrong type.
 * @param value - The value.
 * @param shape - Its shape.
 * @param pointer - Where it is.
 * @param out - Collects the pointers.
 */
function checkShape(value: unknown, shape: Shape | Check | ShapeList, pointer: string, out: string[]): void {
    if (typeof shape === "function") {
        if (!shape(value)) {
            out.push(pointer);
        }

        return;
    }

    if ("items" in shape) {
        if (!Array.isArray(value) || value.length > shape.max) {
            out.push(pointer);
            return;
        }

        value.forEach((each, at) => {
            checkShape(each, shape.items, `${pointer}/${String(at)}`, out);
        });
        return;
    }

    if (!isObject(value)) {
        out.push(pointer);
        return;
    }

    for (const name of shape.required ?? []) {
        if (value[name] === undefined) {
            out.push(`${pointer}/${name}`);
        }
    }

    for (const [name, each] of Object.entries(value)) {
        const field = shape.fields[name];
        if (field === undefined) {
            out.push(`${pointer}/${name}`);
        } else {
            checkShape(each, field, `${pointer}/${name}`, out);
        }
    }
}

/**
 * The limit a member is past, if any (sources.md, "Limits").
 * @param member - The member.
 * @param loads - Its entries.
 * @returns The limit's name, or undefined.
 */
function overLimit(member: Record<string, unknown>, loads: readonly unknown[]): string | undefined {
    if (loads.length > LIMITS.entries) {
        return "entries";
    }

    const parts = loads.filter(isObject);
    const expansions = parts.flatMap((entry) => {
        const { source } = entry;
        return isObject(source) && Array.isArray(source.expansions) ? (source.expansions as unknown[]) : [];
    });
    if (expansions.length > LIMITS.expansions) {
        return "expansions";
    }

    if (expansions.some((each) => isObject(each) && Array.isArray(each.ids) && each.ids.length > LIMITS.seeds)) {
        return "seeds";
    }

    const maps = parts.flatMap((entry) => {
        const source = isObject(entry.source) ? entry.source : {};
        const sample = isObject(entry.sample) ? entry.sample : {};
        return [
            entry.options,
            source.params,
            source.next,
            sample.params,
            ...expansions.map((each) => (each as { next?: unknown }).next),
        ];
    });
    if (maps.some((each) => each !== undefined && jsonBytes(each) > LIMITS.map)) {
        return "options";
    }

    const extensions = [member.extensions, ...parts.map((entry) => entry.extensions)];
    if (extensions.some((each) => each !== undefined && jsonBytes(each) > LIMITS.extensions)) {
        return "extensions";
    }

    return jsonBytes(member) > LIMITS.bytes ? "bytes" : undefined;
}

// ---------------------------------------------------------------------------------------------
// Reading: the entries
// ---------------------------------------------------------------------------------------------

/** What the reader is told about the file it reads. */
export interface SourcesReadContext {
    /** The member's JSON pointer in the file: `/members/<n>`. */
    readonly pointer: string;
    /** The data member, for its legacy `sources` and `provenance` (version 1 only). */
    readonly data: Readonly<Record<string, unknown>>;
    /** The data member's node records. */
    readonly nodes: readonly Record<string, unknown>[];
    /** Its link records. */
    readonly links: readonly Record<string, unknown>[];
    /** Whether a source id is registered in this release. */
    readonly isRegistered: (source: string) => boolean;
    /** Whether a name is one of the catalogue's generators. */
    readonly isGenerator: (name: string) => boolean;
    /** The time of opening, RFC 3339. */
    readonly now: string;
}

/** What the reader found. */
export interface SourcesRead {
    /** What it reports: codes and their params, each naming the member's `kind` and a `pointer`. */
    readonly problems: readonly SourcesProblem[];
    /**
     * The data member's records with `_source.loads` read, and the loads in the shape the data
     * member's legacy fields have, when a member was read; absent when there was none, or it was
     * skipped, so the legacy fields apply.
     */
    readonly graph?: {
        readonly nodes: readonly Record<string, unknown>[];
        readonly links: readonly Record<string, unknown>[];
        readonly source: Record<string, unknown> | undefined;
        readonly sources: readonly Record<string, unknown>[];
        readonly provenance: Record<string, { nodes: NodeId[]; edges: number[] }>;
    };
    /** The network loads that can run, as the session records them. */
    readonly records: readonly SourceLoadRecord[];
    /** Each entry's facts, by id. */
    readonly facts: ReadonlyMap<SourceKey, LoadFacts>;
    /** The member as the file held it, when it was skipped: written back in place. */
    readonly skipped?: Readonly<Record<string, unknown>>;
}

/** One entry as read. */
interface ReadEntry {
    readonly id: string;
    readonly raw: Record<string, unknown>;
    readonly runnable: boolean;
    readonly loaded: Record<string, unknown>;
    readonly facts: LoadFacts;
    readonly record?: SourceLoadRecord;
}

/**
 * The listed load an entry is: what `data.sources()` reports for it.
 * @param raw - The entry.
 * @returns The load, in the data member's legacy `sources` shape.
 */
function loadedOf(raw: Record<string, unknown>): Record<string, unknown> {
    const kinds: Readonly<Record<string, string>> = { file: "file", url: "file", source: "server", sample: "sample" };
    const kind = typeof raw.kind === "string" ? raw.kind : "file";
    const { size } = partOf(raw, "file");
    const joinedOnto = typeof raw.joinedOnto === "string" ? raw.joinedOnto : undefined;
    return defined({
        ...describedOf(raw, kind === "source"),
        name: typeof raw.name === "string" ? raw.name : undefined,
        size: typeof size === "number" ? size : undefined,
        key: raw.id,
        kind: joinedOnto === undefined ? (kinds[kind] ?? kind) : "join",
        joinedOnto,
        tables: Array.isArray(raw.tables) ? raw.tables : [],
        tableRows: Array.isArray(raw.tableRows) ? raw.tableRows : undefined,
        added: countsOf(raw.added),
    });
}

/**
 * An entry's member that is an object.
 * @param raw - The entry.
 * @param name - The member.
 * @returns It, or an empty object.
 */
function partOf(raw: Record<string, unknown>, name: string): Record<string, unknown> {
    const part = raw[name];
    return isObject(part) ? part : {};
}

/**
 * The type and configuration a listed load reports for an entry: a network load's source and
 * params, else the format and the options, a URL's address among them.
 * @param raw - The entry.
 * @param network - Whether it is a network load.
 * @returns `{ type, config }`.
 */
function describedOf(raw: Record<string, unknown>, network: boolean): Record<string, unknown> {
    const source = partOf(raw, "source");
    if (network) {
        return { type: `source:${String(source.id)}`, config: isObject(source.params) ? source.params : {} };
    }

    const { address } = partOf(raw, "url");
    return {
        type: typeof raw.format === "string" ? raw.format : undefined,
        config: { ...partOf(raw, "options"), ...(typeof address === "string" ? { url: address } : {}) },
    };
}

/**
 * Node and edge counts, a missing one as 0.
 * @param value - The counts as read.
 * @returns The counts.
 */
function countsOf(value: unknown): { nodes: number; edges: number } {
    const counts = isObject(value) ? value : {};
    return {
        nodes: typeof counts.nodes === "number" ? counts.nodes : 0,
        edges: typeof counts.edges === "number" ? counts.edges : 0,
    };
}

/**
 * An entry's facts.
 * @param raw - The entry.
 * @param now - The time of opening, for an entry with no time of its own.
 * @returns The facts.
 */
function readFacts(raw: Record<string, unknown>, now: string): LoadFacts {
    const file = raw.file as LoadFacts["file"] & Record<string, unknown>;
    const url = raw.url as Record<string, unknown> | undefined;
    const source = raw.source as Record<string, unknown> | undefined;
    return defined({
        loadedAt: typeof raw.loadedAt === "string" ? raw.loadedAt : now,
        mode: raw.mode === "merge" ? "merge" : "replace",
        file: isObject(file) ? file : undefined,
        url: isObject(url) ? defined({ ...url, address: undefined }) : undefined,
        sample: isObject(raw.sample) ? raw.sample : undefined,
        credentialSlot: typeof source?.credentialSlot === "string" ? source.credentialSlot : undefined,
    }) as unknown as LoadFacts;
}

/**
 * The record the session keeps for a network entry that can run.
 * @param raw - The entry.
 * @returns The record.
 */
function recordOf(raw: Record<string, unknown>): SourceLoadRecord {
    const source = raw.source as Record<string, unknown>;
    const total = raw.total as { nodes?: number } | undefined;
    return defined({
        key: raw.id,
        source: source.id,
        version: source.sourceVersion,
        config: source.params,
        endpoint: source.endpoint,
        options: { mode: raw.mode, ...(isObject(raw.options) ? raw.options : {}) },
        loadedAt: raw.loadedAt,
        pages: source.pages,
        next: source.next,
        validators: source.validators,
        credential: null,
        expansions: (source.expansions as Record<string, unknown>[]).map((expansion) => ({
            ...expansion,
            id: undefined,
            key: expansion.id,
        })),
        total: total?.nodes,
        expand: source.expand,
    }) as unknown as SourceLoadRecord;
}

/**
 * Why an entry cannot run: the problems it is reported with. Empty for an entry that can.
 * @param raw - The entry.
 * @param pointer - Its pointer.
 * @param earlier - The ids of the entries before it.
 * @param isRegistered - Whether a source id is registered.
 * @returns The problems.
 */
function entryProblems(
    raw: Record<string, unknown>,
    pointer: string,
    earlier: ReadonlySet<string>,
    isRegistered: (source: string) => boolean,
): SourcesProblem[] {
    const problem = (code: ProblemCode, at: string, more: Record<string, unknown> = {}): SourcesProblem => ({
        code,
        params: { kind: KIND, pointer: at, ...more },
    });
    if (!(PARTS as readonly unknown[]).includes(raw.kind)) {
        return [problem("W_UNKNOWN_KIND", pointer, { found: raw.kind })];
    }

    const bad: string[] = [];
    checkShape(raw, ENTRY, pointer, bad);
    for (const other of PARTS) {
        if (raw[other] !== undefined && other !== raw.kind) {
            bad.push(`${pointer}/${other}`);
        }
    }

    if (raw[raw.kind as string] === undefined) {
        bad.push(`${pointer}/${String(raw.kind)}`);
    }

    const options = isObject(raw.options) ? raw.options : {};
    bad.push(...FORBIDDEN_OPTIONS.filter((name) => name in options).map((name) => `${pointer}/options/${name}`));
    if (typeof raw.joinedOnto === "string" && !earlier.has(raw.joinedOnto)) {
        bad.push(`${pointer}/joinedOnto`);
    }

    const problems = [...new Set(bad)].map((at) => problem("E_BAD_DOCUMENT", at));
    if (raw.graph !== undefined) {
        // Data members carry no ids yet, so any graph an entry names is one the file does not have.
        problems.push(problem("E_BAD_DOCUMENT", `${pointer}/graph`, { id: raw.id, graph: raw.graph }));
    }

    const source = raw.source as Record<string, unknown> | undefined;
    if (problems.length === 0 && raw.kind === "source" && !isRegistered(String(source?.id))) {
        problems.push(problem("E_SOURCE_UNKNOWN", pointer, { id: raw.id, source: source?.id }));
    }

    return problems;
}

/**
 * Why a member's ids make it unreadable: two entries with one id, or an expansion whose id is not
 * its entry's id, `/x` and its position.
 * @param loads - The entries.
 * @returns The pointer of the first such id, or undefined.
 */
function badIds(loads: readonly Record<string, unknown>[]): string | undefined {
    const seen = new Set<string>();
    for (const [at, entry] of loads.entries()) {
        if (typeof entry.id !== "string" || !ID.test(entry.id) || seen.has(entry.id)) {
            return `/loads/${String(at)}/id`;
        }

        seen.add(entry.id);
        const { source } = entry;
        const expansions = isObject(source) && Array.isArray(source.expansions) ? (source.expansions as unknown[]) : [];
        const wrong = expansions.findIndex(
            (each, n) => !isObject(each) || each.id !== `${String(entry.id)}/x${String(n + 1)}`,
        );
        if (wrong >= 0) {
            return `/loads/${String(at)}/source/expansions/${String(wrong)}/id`;
        }
    }

    return undefined;
}

/**
 * Why a member is skipped whole: a member it does not list, entries that are not a list, a limit,
 * or its ids (sources.md, "Reading" rules 1 and 5, "Limits").
 * @param member - The member.
 * @param pointer - Its pointer.
 * @returns The problem, or undefined for a member that is read.
 */
function memberProblem(member: Record<string, unknown>, pointer: string): SourcesProblem | undefined {
    const problem = (code: ProblemCode, at: string, more: Record<string, unknown> = {}): SourcesProblem => ({
        code,
        params: { kind: KIND, pointer: `${pointer}${at}`, ...more },
    });
    const unknown = Object.keys(member).find(
        (name) => !["kind", "version", "data", "loads", "extensions"].includes(name),
    );
    if (unknown !== undefined) {
        return problem("E_BAD_DOCUMENT", `/${unknown}`);
    }

    if (!Array.isArray(member.loads) || !member.loads.every(isObject)) {
        return problem("E_BAD_DOCUMENT", "/loads");
    }

    if (member.data !== undefined && member.data !== "embedded" && member.data !== "steps") {
        return problem("E_BAD_DOCUMENT", "/data");
    }

    if (member.extensions !== undefined && !isObject(member.extensions)) {
        return problem("E_BAD_DOCUMENT", "/extensions");
    }

    const limit = overLimit(member, member.loads);
    if (limit !== undefined) {
        return problem("E_TOO_LARGE", "", { limit });
    }

    const ids = badIds(member.loads);
    return ids === undefined ? undefined : problem("E_BAD_DOCUMENT", ids);
}

/**
 * Read each entry of a member that is read.
 * @param loads - The entries.
 * @param ctx - The file.
 * @param problems - Collects what is reported.
 * @returns The entries.
 */
function readEntries(
    loads: readonly Record<string, unknown>[],
    ctx: SourcesReadContext,
    problems: SourcesProblem[],
): ReadEntry[] {
    const earlier = new Set<string>();
    return loads.map((raw, at) => {
        const found = entryProblems(raw, `${ctx.pointer}/loads/${String(at)}`, earlier, ctx.isRegistered);
        problems.push(...found);
        earlier.add(String(raw.id));
        const runnable = found.length === 0;
        const facts = readFacts(raw, ctx.now);
        return {
            id: String(raw.id),
            raw,
            runnable,
            loaded: loadedOf(raw),
            facts: runnable ? facts : { ...facts, kept: structuredClone(raw) },
            ...(runnable && raw.kind === "source" ? { record: recordOf(raw) } : {}),
        };
    });
}

/**
 * The records with their `_source.loads` read: an entry id goes to the provenance; a network entry
 * that runs, and its expansions, stay in the column as the keys the session holds them by; a value
 * naming nothing here stays as data, after the rest.
 * @param rows - The node or link records.
 * @param entries - The entries.
 * @param rename - The version 1 keys and the ids they are read as.
 * @param provenance - Collects what each entry supplied: a node's id, or a link's position.
 * @param target - Whether the rows are nodes or links.
 * @returns The rows, a copy of each one whose column changed.
 */
function readColumn(
    rows: readonly Record<string, unknown>[],
    entries: ReadonlyMap<string, ReadEntry>,
    rename: ReadonlyMap<string, string>,
    provenance: Record<string, { nodes: NodeId[]; edges: number[] }>,
    target: "nodes" | "edges",
): Record<string, unknown>[] {
    const live = (value: string): boolean => entries.get(value.split("/x")[0] ?? "")?.record !== undefined;
    return rows.map((row, at) => {
        const column = row["_source.loads"];
        if (!Array.isArray(column)) {
            return row;
        }

        const values = column.map((value: unknown) =>
            typeof value === "string" ? (rename.get(value) ?? value) : value,
        );
        for (const value of values) {
            if (typeof value === "string" && entries.has(value)) {
                const supplied = (provenance[value] ??= { nodes: [], edges: [] });
                if (target === "nodes") {
                    supplied.nodes.push(row.id as NodeId);
                } else {
                    supplied.edges.push(at);
                }
            }
        }

        const held = values.filter((value) => typeof value === "string" && live(value));
        const other = values.filter((value) => !(typeof value === "string" && (live(value) || entries.has(value))));
        const kept = [...new Set([...held, ...other])];
        const { "_source.loads": _column, ...rest } = row;
        return kept.length === 0 ? rest : { ...rest, "_source.loads": kept };
    });
}

/**
 * Read a version 2 member.
 * @param member - The member, checked to be one that is read.
 * @param ctx - The file.
 * @param problems - Collects what is reported.
 * @param upgrade - For an upgraded version 1 member: the keys it renames and what the data
 *     member's legacy provenance adds.
 * @param upgrade.rename - Each version 1 key and the id it is read as.
 * @param upgrade.provenance - What each entry supplied, as the legacy field says.
 * @returns What the reader found.
 */
function readVersion2(
    member: Record<string, unknown>,
    ctx: SourcesReadContext,
    problems: SourcesProblem[],
    upgrade?: {
        rename: ReadonlyMap<string, string>;
        provenance: Record<string, { nodes: NodeId[]; edges: number[] }>;
    },
): SourcesRead {
    const rename = upgrade?.rename ?? new Map<string, string>();
    const legacy = upgrade?.provenance ?? {};
    if (member.data === "steps") {
        // ponytail: steps-only rebuilds are not built yet; a file that also embeds the graph opens embedded.
        problems.push({
            code: "W_SOURCE_STEPS_IGNORED",
            params: { kind: KIND, pointer: `${ctx.pointer}/data`, graph: null },
        });
    }

    const entries = readEntries(member.loads as Record<string, unknown>[], ctx, problems);
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const provenance: Record<string, { nodes: NodeId[]; edges: number[] }> = {};
    const nodes = readColumn(ctx.nodes, byId, rename, provenance, "nodes");
    const links = readColumn(ctx.links, byId, rename, provenance, "edges");
    for (const [id, supplied] of Object.entries(legacy)) {
        const into = (provenance[id] ??= { nodes: [], edges: [] });
        into.nodes = [...new Set([...into.nodes, ...supplied.nodes])];
        into.edges = [...new Set([...into.edges, ...supplied.edges])];
    }

    // In load order, which is the order `data.sourcesOf` lists an element's loads in.
    const ordered = Object.fromEntries(
        entries.flatMap((entry) => (provenance[entry.id] === undefined ? [] : [[entry.id, provenance[entry.id]]])),
    );
    const last = [...entries].reverse().find((entry) => entry.loaded.kind !== "join");
    const {
        key: _key,
        kind: _kind,
        joinedOnto: _onto,
        tables: _tables,
        tableRows: _rows,
        added: _added,
        ...source
    } = last?.loaded ?? {};
    return {
        problems,
        graph: {
            nodes,
            links,
            source: last === undefined ? undefined : source,
            sources: entries.map((entry) => entry.loaded),
            provenance: ordered,
        },
        records: entries.flatMap((entry) => (entry.record === undefined ? [] : [entry.record])),
        facts: new Map(entries.map((entry) => [entry.id, entry.facts])),
    };
}

// ---------------------------------------------------------------------------------------------
// Reading version 1
// ---------------------------------------------------------------------------------------------

/** A version 1 record, as far as the upgrade reads it. */
interface RecordV1 {
    readonly key: string;
    readonly source: string;
    readonly version?: unknown;
    readonly config?: unknown;
    readonly endpoint?: unknown;
    readonly options?: unknown;
    readonly loadedAt?: unknown;
    readonly pages?: unknown;
    readonly next?: unknown;
    readonly validators?: unknown;
    readonly credential?: unknown;
    readonly expansions: readonly Record<string, unknown>[];
    readonly total?: unknown;
    readonly expand?: unknown;
}

/**
 * Whether a value is a version 1 record.
 * @param value - The value.
 * @returns True when it has a key, a source and its expansions.
 */
function isRecordV1(value: unknown): value is RecordV1 {
    return (
        isObject(value) &&
        typeof value.key === "string" &&
        typeof value.source === "string" &&
        Array.isArray(value.expansions) &&
        value.expansions.every(isObject)
    );
}

/**
 * The network part and options of an entry joined to a version 1 record.
 * @param record - The record.
 * @param id - The entry's id.
 * @param rename - Collects each version 1 key and the id it is read as.
 * @returns The entry's members that come from the record.
 */
function fromRecordV1(record: RecordV1, id: string, rename: Map<string, string>): Record<string, unknown> {
    rename.set(record.key, id);
    const { mode, ...options } = isObject(record.options) ? record.options : {};
    const expansions = record.expansions.map((expansion, at) => {
        const written = `${id}/x${String(at + 1)}`;
        if (typeof expansion.key === "string") {
            rename.set(expansion.key, written);
        }

        return defined({
            id: written,
            ids: expansion.ids,
            depth: expansion.depth,
            direction: expansion.direction,
            limit: expansion.limit,
            at: expansion.at,
            next: expansion.next ?? null,
            validators: validatorsOf(expansion.validators),
        });
    });
    return defined({
        loadedAt: typeof record.loadedAt === "string" ? record.loadedAt : undefined,
        mode: mode === "replace" || mode === "merge" ? mode : undefined,
        source: defined({
            id: record.source,
            sourceVersion: record.version,
            endpoint: record.endpoint ?? null,
            params: isObject(record.config) ? record.config : {},
            credentialSlot: record.credential === null || record.credential === undefined ? undefined : DEFAULT_SLOT,
            pages: record.pages ?? 1,
            next: record.next ?? null,
            validators: validatorsOf(record.validators),
            expand: record.expand,
            expansions,
        }),
        options: optionsOf(options),
        total: typeof record.total === "number" ? { nodes: record.total } : undefined,
    });
}

/**
 * The entry a version 1 data member's `sources` item becomes.
 * @param item - The item.
 * @param at - Its position.
 * @param joined - What its version 1 record gives it, for a network item.
 * @param ctx - The file.
 * @returns The entry.
 */
function entryFromItem(
    item: Record<string, unknown>,
    at: number,
    joined: Record<string, unknown> | undefined,
    ctx: SourcesReadContext,
): Record<string, unknown> {
    const config = isObject(item.config) ? item.config : {};
    const { url: _url, ...options } = config;
    const loadedAt = (joined?.loadedAt as string | undefined) ?? ctx.now;
    const name = typeof item.name === "string" ? item.name : undefined;
    const part = itemPart(item, joined, ctx, loadedAt);
    const kind = Object.keys(part)[0];
    return defined({
        id: item.key,
        kind,
        name,
        loadedAt,
        mode: joined?.mode ?? (at === 0 ? "replace" : "merge"),
        format: kind === "source" || typeof item.type !== "string" ? undefined : item.type,
        ...part,
        options: kind === "source" ? joined?.options : optionsOf(options),
        tables: Array.isArray(item.tables) && item.tables.length > 0 ? item.tables : undefined,
        tableRows: item.tableRows,
        joinedOnto: item.joinedOnto,
        added: item.added,
        total: joined?.total,
    });
}

/**
 * The kind part a version 1 data member's `sources` item becomes.
 * @param item - The item.
 * @param joined - What its version 1 record gives it, for a network item.
 * @param ctx - The file.
 * @param loadedAt - When it loaded.
 * @returns `{ <kind>: part }`.
 */
function itemPart(
    item: Record<string, unknown>,
    joined: Record<string, unknown> | undefined,
    ctx: SourcesReadContext,
    loadedAt: string,
): Record<string, unknown> {
    const config = isObject(item.config) ? item.config : {};
    const name = typeof item.name === "string" ? item.name : "sample";
    if (item.kind === "server") {
        return {
            source: joined?.source ?? {
                id: (typeof item.type === "string" ? item.type : "").replace(/^source:/, ""),
                sourceVersion: 1,
                endpoint: null,
                params: config,
                pages: 1,
                next: null,
                validators: {},
                expansions: [],
            },
        };
    }

    if (item.kind === "sample") {
        return { sample: ctx.isGenerator(name) ? { generator: name, params: {} } : { dataset: name } };
    }

    if (typeof config.url === "string") {
        return { url: { address: redactUrl(config.url).address, fetchedAt: loadedAt } };
    }

    return {
        file: defined({
            name: typeof item.name === "string" ? item.name : undefined,
            size: typeof item.size === "number" ? item.size : 0,
        }),
    };
}

/**
 * How many node and link records carry a key in `_source.loads`.
 * @param ctx - The file.
 * @param key - The key.
 * @returns The counts.
 */
function carrying(ctx: SourcesReadContext, key: string): { nodes: number; edges: number } {
    const has = (row: Record<string, unknown>): boolean =>
        Array.isArray(row["_source.loads"]) && (row["_source.loads"] as unknown[]).includes(key);
    return { nodes: ctx.nodes.filter(has).length, edges: ctx.links.filter(has).length };
}

/**
 * Upgrade a version 1 member, joined with the data member's legacy `sources` and `provenance`
 * (sources.md, "Reading version 1").
 * @param member - The member.
 * @param ctx - The file.
 * @param problems - Collects what is reported.
 * @returns What the reader found.
 */
function upgradeVersion1(
    member: Record<string, unknown>,
    ctx: SourcesReadContext,
    problems: SourcesProblem[],
): SourcesRead {
    const records = Array.isArray(member.loads) ? member.loads : undefined;
    if (records?.every(isRecordV1) !== true) {
        problems.push({ code: "E_BAD_DOCUMENT", params: { kind: KIND, pointer: `${ctx.pointer}/loads` } });
        return { problems, records: [], facts: new Map(), skipped: member };
    }

    const items = (Array.isArray(ctx.data.sources) ? ctx.data.sources : []).filter(isObject);
    const legacy = isObject(ctx.data.provenance) ? ctx.data.provenance : {};
    const rows = new Map(ctx.nodes.map((row) => [String(row.id), row]));
    const claims = (item: Record<string, unknown>, key: string): boolean => {
        const supplied = legacy[String(item.key)];
        const ids = isObject(supplied) && Array.isArray(supplied.nodes) ? (supplied.nodes as unknown[]) : [];
        return ids.some((id) => {
            const loads = rows.get(String(id))?.["_source.loads"];
            return Array.isArray(loads) && loads.includes(key);
        });
    };
    const rename = new Map<string, string>();
    const claimed = new Set<string>();
    const loads = items.map((item, at) => {
        const record =
            item.kind === "server"
                ? records.find((each) => !claimed.has(each.key) && claims(item, each.key))
                : undefined;
        if (record !== undefined) {
            claimed.add(record.key);
        }

        const joined = record === undefined ? undefined : fromRecordV1(record, String(item.key), rename);
        return entryFromItem(item, at, joined, ctx);
    });
    for (const record of records.filter((each) => !claimed.has(each.key))) {
        const joined = fromRecordV1(record, record.key, rename);
        loads.push(
            defined({
                id: record.key,
                kind: "source",
                ...joined,
                loadedAt: joined.loadedAt ?? ctx.now,
                mode: joined.mode ?? (loads.length === 0 ? "replace" : "merge"),
                added: carrying(ctx, record.key),
            }),
        );
    }

    const provenance: Record<string, { nodes: NodeId[]; edges: number[] }> = {};
    for (const [key, supplied] of Object.entries(legacy)) {
        if (isObject(supplied) && Array.isArray(supplied.nodes) && Array.isArray(supplied.edges)) {
            provenance[key] = {
                nodes: supplied.nodes as NodeId[],
                edges: (supplied.edges as unknown[]).filter((at): at is number => typeof at === "number"),
            };
        }
    }

    problems.push({ code: "W_VERSION_UPGRADED", params: { kind: KIND, pointer: ctx.pointer, found: 1, version: 2 } });
    const upgraded = { kind: KIND, version: SOURCES_MEMBER_VERSION, loads };
    const skipped = memberProblem(upgraded, ctx.pointer);
    if (skipped !== undefined) {
        problems.push(skipped);
        return { problems, records: [], facts: new Map(), skipped: member };
    }

    return readVersion2(upgraded, ctx, problems, { rename, provenance });
}

/**
 * Read a project file's `graphty-sources` member: version 2 as it is, version 1 upgraded.
 * @param member - The member, or undefined when the file holds none.
 * @param ctx - The file.
 * @returns What the reader found; with no `graph` when there was no member or it was skipped.
 */
export function readSourcesMember(member: Record<string, unknown> | undefined, ctx: SourcesReadContext): SourcesRead {
    const problems: SourcesProblem[] = [];
    if (member === undefined) {
        return { problems, records: [], facts: new Map() };
    }

    if (member.version === 1) {
        return upgradeVersion1(member, ctx, problems);
    }

    const skipped = memberProblem(member, ctx.pointer);
    if (skipped !== undefined) {
        problems.push(skipped);
        return { problems, records: [], facts: new Map(), skipped: member };
    }

    return readVersion2(member, ctx, problems);
}
