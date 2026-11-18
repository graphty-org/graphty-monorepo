/**
 * @file Reading a version 2 data section's referenced sources again before an open builds it
 * (spec/README.md 4.1.2, 8.3): each `file` or `url` source saved without its copy is fetched (or
 * taken from a file the caller picked), digested, and read through graphty-element's own load in a
 * scratch session with the record's `format`, `options` and roles, so its rows are the ones the
 * original load made, the columns it made from the file's styles included. The rows are kept by
 * the record object for the data codec's `holds` and `read`, which run synchronously inside the
 * open. Experimental (`save-files-v2`).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { sha256HexSync } from "@graphty/graph-io";

import { fetchBytes } from "../../../data/source-bytes";
import { isGraphtyError } from "../../../errors/GraphtyError";
import type { GraphSession, LoadChoices, TableMapping } from "../../types";
import type { JsonObject } from "../types";
import { copyTables, isPlainObject, isReserved, repeatedEdgeRows } from "./dataRefs";

/**
 * Why a referenced source supplied nothing: unreachable, no location to read it from, unreadable,
 * over the open's size limit, or a fetch the caller did not allow.
 */
export type UnavailableReason = "unreachable" | "needs-file" | "read" | "too-large" | "consent";

/** A referenced source read again: its tables in copy form and its bytes' digest, or why not. */
export type Refetched =
    | { readonly copyId: string; readonly tables: JsonObject; readonly columns: JsonObject }
    | { readonly unavailable: UnavailableReason };

/** What an open gives the fetch. */
export interface RefetchOptions {
    /** The URL of the file being opened, which a relative `url` or `path` resolves against. */
    readonly location?: string;
    /** Files the caller picked, by source id: read in place of fetching. */
    readonly files?: Readonly<Record<string, Blob>>;
    readonly signal?: AbortSignal;
    /** Whether the caller lets the open fetch: a file cannot approve its own fetches. */
    readonly fetch: boolean;
    /** The most bytes one source may hold. */
    readonly limit: number;
    /**
     * Whether the open builds the data section: asked only when a source would be fetched, so a
     * file never makes an open fetch for a section it then refuses.
     */
    readonly builds: () => boolean;
    /** A scratch session to read a source in, disposed by the caller of this module. */
    readonly scratch: () => GraphSession;
}

/** Each referenced record read again, by the record object the codec sees. */
const REFETCHED = new WeakMap<object, Refetched>();

/**
 * What a referenced source record was read again as, if an open fetched it.
 * @param record - The record.
 * @returns The rows or why there are none, or undefined when no open tried.
 */
export function refetchedOf(record: object): Refetched | undefined {
    return REFETCHED.get(record);
}

/**
 * The bytes of a referenced source: a file the caller picked, else its `url`, else its `path`,
 * each resolved against the location of the file being opened.
 * @param record - The record.
 * @param how - The open's options.
 * @returns The bytes, `needs-file` when nothing says where they are, `too-large` for a picked
 *     file over the limit, or `consent` for a fetch the caller did not allow.
 */
async function bytesOf(
    record: JsonObject,
    how: RefetchOptions,
): Promise<Uint8Array | "needs-file" | "too-large" | "consent"> {
    const picked = how.files?.[String(record.id)];
    if (picked !== undefined) {
        return picked.size > how.limit ? "too-large" : new Uint8Array(await picked.arrayBuffer());
    }

    const origin = record.origin as JsonObject;
    const where = [origin.url, origin.path].find((each): each is string => typeof each === "string");
    let resolved: URL;
    try {
        // A relative address with no location to resolve against throws, and so needs a file.
        resolved = new URL(where ?? "", how.location);
    } catch {
        return "needs-file";
    }

    // ponytail: a `file:` location (Node) is not fetched; reading the disk would need a Node path.
    if (where === undefined || !["http:", "https:", "blob:"].includes(resolved.protocol)) {
        return "needs-file";
    }

    return how.fetch ? fetchBytes(resolved.href, how.signal, how.limit) : "consent";
}

/**
 * The roles a table's rows are read with, from a referenced record's `mapping`: its key, or its
 * ends and edge-id column.
 * @param mapping - The record's mapping.
 * @returns The table's mapping.
 */
function tableMappingOf(mapping: JsonObject): TableMapping {
    const { nodes, edges } = mapping;
    if (isPlainObject(edges)) {
        return {
            rowsAre: "edges",
            source: String(edges.source),
            target: String(edges.target),
            ...(typeof edges.edgeId === "string" ? { edgeId: edges.edgeId } : {}),
        };
    }

    return { rowsAre: "nodes", ...(isPlainObject(nodes) && typeof nodes.key === "string" ? { key: nodes.key } : {}) };
}

/**
 * The saved name of a column the read named fresh: a column a load made from a file's styles is
 * named `<name> (<format>[ N])` when another load took `<name>` first, which a read into an empty
 * graph does not repeat. The saved name wins when it is the one saved column of that form the
 * read lacks.
 * @param fresh - The read's column names.
 * @param saved - The saved column names.
 * @param format - The source's format.
 * @returns Each renamed column, read name to saved name.
 */
function savedNames(fresh: readonly string[], saved: readonly string[], format: string): Map<string, string> {
    const renamed = new Map<string, string>();
    const lacking = saved.filter((name) => !fresh.includes(name));
    const tag = format.replaceAll(".", "_");
    for (const name of fresh.filter((each) => !saved.includes(each))) {
        // ponytail: told by the name's form, not kept on the load; keep the fresh name on the load
        // and write it as `mapping.renamed` if two sources' looks can ever share a form.
        const base = name.replaceAll(".", "_");
        const matches = lacking.filter(
            (each) => each.startsWith(`${base} (${tag}`) && /^ \d+\)$|^\)$/.test(each.slice(`${base} (${tag}`.length)),
        );
        if (matches.length === 1) {
            renamed.set(name, matches[0]);
        }
    }

    return renamed;
}

/**
 * Rows with the saved names in place of the read ones.
 * @param rows - The rows.
 * @param saved - The saved columns of the table, if any.
 * @param format - The source's format.
 * @returns The rows.
 */
function withSavedNames(rows: JsonObject[], saved: unknown, format: string): JsonObject[] {
    if (!isPlainObject(saved)) {
        return rows;
    }

    const fresh = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const renamed = savedNames(fresh, Object.keys(saved), format);
    if (renamed.size === 0) {
        return rows;
    }

    return rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([key, value]) => [renamed.get(key) ?? key, value])),
    );
}

/**
 * A record without graphty-element's own provenance columns.
 * @param record - The record.
 * @returns The record.
 */
function ownColumns(record: Readonly<Record<string, unknown>>): JsonObject {
    return Object.fromEntries(Object.entries(record).filter(([name]) => !isReserved(name)));
}

/** A source's bytes parsed, whose saved roles no longer apply to them. */
class RolesGone extends Error {}

/**
 * Read a referenced source's bytes as its load read them: in a scratch session, with the record's
 * format, options (the style choices among them) and roles, into an empty graph, as a copy writes
 * the rows that load made.
 * @param record - The record.
 * @param bytes - Its bytes.
 * @param how - The open's options.
 * @returns The tables and their declarations.
 * @throws {RolesGone} When the bytes parse but the saved roles do not read them; what the
 *     parse throws when they do not parse.
 */
async function reimport(
    record: JsonObject,
    bytes: Uint8Array,
    how: RefetchOptions,
): Promise<{ tables: JsonObject; columns: JsonObject }> {
    const scratch = how.scratch();
    try {
        const options = isPlainObject(record.options) ? record.options : {};
        const draft = await scratch.data.prepare(
            {
                ...(typeof record.format === "string" ? { type: record.format } : {}),
                config: { ...options, data: bytes },
            },
            how.signal === undefined ? {} : { signal: how.signal },
        );
        const settings = isPlainObject(record.settings) ? record.settings : {};
        const mapping = isPlainObject(record.mapping) ? record.mapping : {};
        // A graph file's format sets its roles; a table's are the record's.
        const fixed = draft.tables.every((table) => table.fixed);
        try {
            await draft.load({
                ...(fixed ? {} : { mapping: tableMappingOf(mapping) }),
                ...(settings as Pick<LoadChoices, "unmatched" | "duplicateIds">),
            });
        } catch {
            how.signal?.throwIfAborted();
            throw new RolesGone();
        }

        how.signal?.throwIfAborted();
        const format = typeof record.format === "string" ? record.format : "file";
        const columns = isPlainObject(record.columns) ? record.columns : {};
        const edges = isPlainObject(mapping.edges) ? mapping.edges : {};
        const edgeId = typeof edges.edgeId === "string" ? edges.edgeId : undefined;
        const edgeRows = scratch.data.edges({ scope: "graph" }).map(({ id: _id, ...edge }) => ownColumns(edge));
        const repeated = repeatedEdgeRows(edgeRows, edgeId, settings.duplicateIds === "merge");
        return copyTables(
            withSavedNames(
                scratch.data.nodes({ scope: "graph" }).map((node) => ownColumns(node)),
                columns.nodes,
                format,
            ),
            withSavedNames(
                edgeRows.map((edge, row) =>
                    repeated.has(row) && edgeId !== undefined ? { ...edge, [edgeId]: undefined } : edge,
                ),
                columns.edges,
                format,
            ),
        );
    } finally {
        scratch.dispose();
    }
}

/**
 * Read one referenced record again, remembering what it gave.
 * @param record - The record.
 * @param how - The open's options.
 */
async function refetch(record: JsonObject, how: RefetchOptions): Promise<void> {
    let bytes: Awaited<ReturnType<typeof bytesOf>>;
    try {
        bytes = await bytesOf(record, how);
    } catch (error) {
        how.signal?.throwIfAborted();
        const large = isGraphtyError(error) && error.code === "E_TOO_LARGE";
        REFETCHED.set(record, { unavailable: large ? "too-large" : "unreachable" });
        return;
    }

    if (typeof bytes === "string") {
        REFETCHED.set(record, { unavailable: bytes });
        return;
    }

    const copyId = `sha256:${sha256HexSync(bytes)}`;
    try {
        const { tables, columns } = await reimport(record, bytes, how);
        REFETCHED.set(record, { copyId, tables, columns });
    } catch (error) {
        how.signal?.throwIfAborted();
        // Bytes that changed since the save and parse, but lack the columns the saved roles name,
        // are a refresh that supplied no rows (spec 8.3 rules 1 and 2): reported changed, every
        // saved column left out. The same bytes unreadable, or bytes that do not parse, are `read`.
        const changed = error instanceof RolesGone && copyId !== (record.origin as JsonObject).copy;
        REFETCHED.set(record, changed ? { copyId, tables: {}, columns: {} } : { unavailable: "read" });
    }
}

/**
 * Read every referenced `file` and `url` source of a version 2 file's data section again, in
 * parallel, before the open builds it. A source that cannot be read is remembered with why, and the
 * open reports it; an abort rejects with the caller's reason before anything is applied.
 * @param value - The parsed file: a full file, or a data section file.
 * @param how - The open's options.
 * @returns Settles once every source is read or known unavailable.
 */
export async function refetchSources(value: JsonObject, how: RefetchOptions): Promise<void> {
    // A full file holds its sections by name; a section file is the section itself.
    const body = isPlainObject(value.sections) ? value.sections.data : value;
    if (!isPlainObject(body) || !Array.isArray(body.sources)) {
        return;
    }

    const referenced = (body.sources as unknown[]).filter(
        (record): record is JsonObject =>
            isPlainObject(record) &&
            record.copy === undefined &&
            (record.kind === "file" || record.kind === "url") &&
            isPlainObject(record.origin),
    );
    if (referenced.length === 0 || !how.builds()) {
        return;
    }

    await Promise.all(referenced.map((record) => refetch(record, how)));
}
