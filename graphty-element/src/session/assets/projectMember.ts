/**
 * @file The `graphty-assets` member of a project file: the model files a style layer or an
 * encoding names, embedded exactly as given (base64), one copy per digest
 * (design/documents/assets.md, design/rendering/node-models.md section 7.3).
 *
 * Reading one puts every file set back through `session.assets.add`, so an embedded model passes
 * the same checks and limits as a dropped file, after its bytes are checked against the digest the
 * file records.
 */

import type { LayerId } from "../../catalog/types";
import type { GraphtyErrorCode, GraphtyWarningCode } from "../../errors/codes";
import { GraphtyError } from "../../errors/GraphtyError";
import type { CodedFact } from "../shared";
import type { GraphSession } from "../types";
import { type AssetId, isAssetId, SAMPLE_PREFIX } from "./assetId";
import type { AssetRecord, AssetsApiInternal } from "./AssetsApi";
import { digestFileSet } from "./digest";
import { normalizePath, roleOfName } from "./references";

/** The member's kind. */
export const ASSETS_MEMBER = "graphty-assets";

/** The member's version. */
const VERSION = 1;

/** The most file bytes one document embeds: 64 MB. */
export const MAX_DOCUMENT_ASSET_BYTES = 64 * 1024 * 1024;

/** A problem about the member, as the project file reports it. */
type Problem = CodedFact<GraphtyErrorCode | GraphtyWarningCode>;

/** One embedded file. */
interface SavedFile {
    readonly path: string;
    readonly mediaType: string;
    readonly byteLength: number;
    readonly data: string;
}

/** The members an entry and a file may have; anything else refuses the entry. */
const MEMBER_KEYS = new Set(["kind", "version", "assets", "extensions"]);
const ENTRY_KEYS = new Set(["id", "sha256", "format", "main", "source", "stored", "files", "skipped"]);
const FILE_KEYS = new Set(["path", "mediaType", "byteLength", "data"]);

/** Media types by file ending; anything else is application/octet-stream. */
const MEDIA_TYPES: Readonly<Record<string, string>> = {
    glb: "model/gltf-binary",
    gltf: "model/gltf+json",
    obj: "model/obj",
    mtl: "model/mtl",
    stl: "model/stl",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    zip: "application/zip",
};

/**
 * The assets API behind a session. Internal: every session is a `GraphSession` built by the element.
 * @param session - The session.
 * @returns Its assets API with the internal members.
 */
function assetsOf(session: GraphSession): AssetsApiInternal {
    return session.assets as AssetsApiInternal;
}

/**
 * Base64 of bytes, in chunks so a large file does not overflow the argument list.
 * @param bytes - The bytes.
 * @returns Base64.
 */
function toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let at = 0; at < bytes.length; at += 0x8000) {
        binary += String.fromCodePoint(...bytes.subarray(at, at + 0x8000));
    }

    return btoa(binary);
}

/**
 * The base64 length of a number of bytes.
 * @param bytes - The byte count.
 * @returns Its length as padded base64.
 */
function base64Length(bytes: number): number {
    return 4 * Math.ceil(bytes / 3);
}

/**
 * Every model a node layer names, with the layers naming it: `node.model` set literally, and every
 * string an encoding of `node.model` lists.
 * @param session - The session.
 * @returns Ref to layer ids, in the order first named.
 */
function modelRefs(session: GraphSession): Map<string, LayerId[]> {
    const refs = new Map<string, LayerId[]>();
    const note = (ref: string, layer: LayerId): void => {
        const layers = refs.get(ref) ?? [];
        if (!layers.includes(layer)) {
            layers.push(layer);
        }

        refs.set(ref, layers);
    };
    const walk = (value: unknown, layer: LayerId, literal: boolean): void => {
        if (typeof value === "string") {
            if (literal || isAssetId(value) || assetsOf(session).urlRecord(value) !== undefined) {
                note(value, layer);
            }
        } else if (typeof value === "object" && value !== null) {
            Object.values(value).forEach((each) => {
                walk(each, layer, false);
            });
        }
    };
    for (const layer of session.styles.list()) {
        if (layer.target === "node") {
            for (const channel of ["node.model", "node.texture"] as const) {
                walk(layer.set?.[channel], layer.id, true);
                walk(layer.encode?.[channel], layer.id, false);
            }
        }
    }

    return refs;
}

/**
 * A style document with every model and picture a node layer names by asset id written as the id
 * of the accepted asset it resolves to: a model that waited for parts is named by the id it had
 * then, and the file must name the id its `graphty-assets` member embeds it under.
 * @param session - The session.
 * @param document - The style document, as `styles.toDocument()` writes it.
 * @returns The document, rewritten where a name moved on.
 */
export function withAcceptedAssetIds<T extends { readonly layers: readonly unknown[] }>(
    session: GraphSession,
    document: T,
): T {
    const assets = assetsOf(session);
    let moved = false;
    const accepted = (value: unknown): unknown => {
        if (typeof value === "string") {
            const record = isAssetId(value) ? assets.get(value) : undefined;
            if (record?.state === "accepted" && record.id !== value) {
                moved = true;
                return record.id;
            }

            return value;
        }

        if (Array.isArray(value)) {
            return value.map(accepted);
        }

        return typeof value === "object" && value !== null
            ? Object.fromEntries(Object.entries(value).map(([key, each]) => [key, accepted(each)]))
            : value;
    };
    const layers = document.layers.map((layer) => {
        const spec = layer as { target?: string; set?: Record<string, unknown>; encode?: Record<string, unknown> };
        if (spec.target !== "node") {
            return layer;
        }

        const channels = (part: Record<string, unknown> | undefined): Record<string, unknown> | undefined =>
            part === undefined
                ? undefined
                : Object.fromEntries(
                      Object.entries(part).map(([channel, value]) => [
                          channel,
                          channel === "node.model" || channel === "node.texture" ? accepted(value) : value,
                      ]),
                  );
        return {
            ...spec,
            ...(spec.set === undefined ? {} : { set: channels(spec.set) }),
            ...(spec.encode === undefined ? {} : { encode: channels(spec.encode) }),
        };
    });
    return moved ? { ...document, layers } : document;
}

/** How to keep a model or picture a layer names by URL: its bytes in the file, or only its URL and digest. */
export type AssetStorage = "embed" | "url";

/**
 * The `graphty-assets` member: every model and picture a layer names that the session holds,
 * files as given; one a layer names by URL is kept by its URL and digest alone when `storage`
 * says `"url"` for it.
 * @param session - The session.
 * @param storage - By the URL a layer names: `"url"` keeps it by URL. Default: embed.
 * @returns The member, or null when no layer names a held asset; and what could not be embedded.
 */
export function assetsMember(
    session: GraphSession,
    storage: Readonly<Record<string, AssetStorage>> = {},
): {
    member: Record<string, unknown> | null;
    leftOut: Problem[];
} {
    const assets = assetsOf(session);
    const leftOut: Problem[] = [];
    const entries: Record<string, unknown>[] = [];
    const written = new Set<string>();
    const digests = new Set<string>();
    let bytes = 0;
    for (const [ref, layerIds] of modelRefs(session)) {
        if (ref.startsWith(SAMPLE_PREFIX)) {
            continue; // Every reader ships the samples.
        }

        const url = !isAssetId(ref);
        const record: AssetRecord | undefined = url ? assets.urlRecord(ref) : assets.get(ref);
        if (record?.state !== "accepted") {
            leftOut.push({ code: "W_MODEL_NOT_EMBEDDED", params: { ref, layerIds } });
            continue;
        }

        const key = `${record.id}\n${url ? ref : ""}`;
        if (written.has(key)) {
            continue;
        }

        // A model whose parts came from several places has no one URL that brings it back.
        const pieced = url && storage[ref] === "url" && assets.assembled(record.id);
        if (pieced) {
            leftOut.push({
                code: "W_MODEL_NOT_KEPT_BY_URL",
                params: { url: ref.split(/[?#]/)[0].slice(0, 256), reason: "parts" },
            });
        }

        if (url && storage[ref] === "url" && !pieced) {
            written.add(key);
            entries.push({
                id: record.id,
                sha256: record.digest,
                format: record.format,
                main: record.path ?? "",
                source: ref,
                stored: "url",
            });
            continue;
        }

        const first = !digests.has(record.digest);
        if (first && bytes + record.byteLength > MAX_DOCUMENT_ASSET_BYTES) {
            leftOut.push({
                code: "E_MODEL_TOO_LARGE",
                params: {
                    what: "documentBytes",
                    found: bytes + record.byteLength,
                    limit: MAX_DOCUMENT_ASSET_BYTES,
                    id: record.id,
                },
            });
            continue;
        }

        written.add(key);
        digests.add(record.digest);
        if (first) {
            bytes += record.byteLength;
        }

        entries.push({
            id: record.id,
            sha256: record.digest,
            format: record.format,
            main: record.path ?? "",
            ...(url ? { source: ref } : {}),
            ...(record.skipped === undefined ? {} : { skipped: [...record.skipped] }),
            // Later entries with the same digest share the first one's files.
            ...(first
                ? {
                      files: [...assets.files(record.id)].map(([path, data]): SavedFile => {
                          const ending = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
                          return {
                              path,
                              mediaType: MEDIA_TYPES[ending] ?? "application/octet-stream",
                              byteLength: data.length,
                              data: toBase64(data),
                          };
                      }),
                  }
                : {}),
        });
    }

    return {
        member: entries.length === 0 ? null : { kind: ASSETS_MEMBER, version: VERSION, assets: entries },
        leftOut,
    };
}

/**
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The first member of an object outside a closed list.
 * @param value - The object.
 * @param keys - The members it may have.
 * @returns The unknown member's name, or undefined.
 */
function unknownKey(value: Record<string, unknown>, keys: ReadonlySet<string>): string | undefined {
    return Object.keys(value).find((key) => !keys.has(key));
}

/**
 * The refusal of a whole assets member, which refuses the file (its kind is in `requires`).
 * @param code - Why.
 * @param details - What names the problem.
 * @returns The error.
 */
function refused(code: "E_BAD_DOCUMENT" | "E_MODEL_TOO_LARGE", details: Record<string, unknown>): GraphtyError {
    return new GraphtyError({
        code,
        message: `The ${ASSETS_MEMBER} member cannot be read: ${code}.`,
        source: "data",
        details: { kind: ASSETS_MEMBER, ...details },
    });
}

/**
 * Check a whole member before anything is decoded: its closed top level and the document cap.
 * @param member - The member.
 * @returns Its entries.
 * @throws A `GraphtyError` with `E_BAD_DOCUMENT` or `E_MODEL_TOO_LARGE`.
 */
function entriesOf(member: Record<string, unknown>): unknown[] {
    const extra = unknownKey(member, MEMBER_KEYS);
    if (extra !== undefined) {
        throw refused("E_BAD_DOCUMENT", { pointer: `/${extra}` });
    }

    if (!Array.isArray(member.assets)) {
        throw refused("E_BAD_DOCUMENT", { pointer: "/assets" });
    }

    let length = 0;
    for (const entry of member.assets as unknown[]) {
        for (const file of isObject(entry) && Array.isArray(entry.files) ? (entry.files as unknown[]) : []) {
            length += isObject(file) && typeof file.data === "string" ? file.data.length : 0;
        }
    }

    if (length > base64Length(MAX_DOCUMENT_ASSET_BYTES)) {
        throw refused("E_MODEL_TOO_LARGE", {
            what: "documentBytes",
            found: Math.floor((length * 3) / 4),
            limit: MAX_DOCUMENT_ASSET_BYTES,
        });
    }

    return member.assets as unknown[];
}

/** A checked entry. */
interface Entry {
    readonly id: AssetId;
    readonly sha256: string;
    readonly main: string;
    readonly source?: string;
    readonly stored?: "url";
    readonly files?: readonly SavedFile[];
    readonly skipped?: readonly string[];
}

/**
 * Whether an entry's `skipped` is absent or a list of normalized paths of pictures and `.mtl` files.
 * @param skipped - The member.
 * @returns True when it may be applied.
 */
function skipsOk(skipped: unknown): boolean {
    return (
        skipped === undefined ||
        (Array.isArray(skipped) &&
            skipped.every(
                (name) =>
                    typeof name === "string" &&
                    name !== "" &&
                    normalizePath(name) === name &&
                    roleOfName(name) !== "geometry",
            ))
    );
}

/**
 * Check an entry's shape, or name its first unknown or malformed member.
 * @param entry - The entry.
 * @returns The entry, or the pointer below the entry that is wrong.
 */
function checkEntry(entry: unknown): Entry | string {
    if (!isObject(entry)) {
        return "";
    }

    const extra = unknownKey(entry, ENTRY_KEYS);
    if (extra !== undefined) {
        return `/${extra}`;
    }

    const { id, sha256, format, main, source, files } = entry;
    if (typeof id !== "string" || !isAssetId(id)) {
        return "/id";
    }

    if (typeof sha256 !== "string" || !/^[0-9a-f]{64}$/.test(sha256)) {
        return "/sha256";
    }

    if (typeof format !== "string" || typeof main !== "string") {
        return typeof format === "string" ? "/main" : "/format";
    }

    if (source !== undefined && typeof source !== "string") {
        return "/source";
    }

    if (!skipsOk(entry.skipped)) {
        return "/skipped";
    }

    if (entry.stored !== undefined && (entry.stored !== "url" || typeof source !== "string" || files !== undefined)) {
        return "/stored";
    }

    if (files !== undefined) {
        if (!Array.isArray(files)) {
            return "/files";
        }

        const bad = (files as unknown[]).findIndex(
            (file) =>
                !isObject(file) ||
                unknownKey(file, FILE_KEYS) !== undefined ||
                typeof file.path !== "string" ||
                typeof file.mediaType !== "string" ||
                typeof file.data !== "string" ||
                !Number.isInteger(file.byteLength) ||
                (file.byteLength as number) < 0,
        );
        if (bad >= 0) {
            return `/files/${String(bad)}`;
        }
    }

    return entry as unknown as Entry;
}

/**
 * Decode an entry's files, checking every length against what the entry declares.
 * @param files - The files.
 * @param maxBytes - The per-model byte limit, checked before anything is decoded.
 * @returns Path to bytes, or the code of the first problem.
 */
function decodeFiles(
    files: readonly SavedFile[],
    maxBytes: number,
): Map<string, Uint8Array> | CodedFact<GraphtyErrorCode> {
    const declared = files.reduce((sum, file) => sum + file.byteLength, 0);
    if (declared > maxBytes) {
        return { code: "E_MODEL_TOO_LARGE", params: { what: "bytes", found: declared, limit: maxBytes } };
    }

    const given = new Map<string, Uint8Array>();
    for (const file of files) {
        // Stored exactly as intake keeps them: normalized paths, no folder every file shares.
        if (
            file.data.length !== base64Length(file.byteLength) ||
            given.has(file.path) ||
            normalizePath(file.path) !== file.path
        ) {
            return { code: "E_MODEL_DIGEST_MISMATCH", params: {} };
        }

        let binary: string;
        try {
            binary = atob(file.data);
        } catch {
            return { code: "E_MODEL_DIGEST_MISMATCH", params: {} };
        }

        if (binary.length !== file.byteLength) {
            return { code: "E_MODEL_DIGEST_MISMATCH", params: {} };
        }

        given.set(
            file.path,
            Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0),
        );
    }

    const top = files[0]?.path.split("/")[0];
    if (files.length > 0 && files.every((file) => file.path.startsWith(`${top}/`))) {
        return { code: "E_MODEL_DIGEST_MISMATCH", params: {} };
    }

    return given;
}

/**
 * Put a `graphty-assets` member's models back into the session: each checked against its digest,
 * then added through `session.assets.add` as a dropped file is, one at a time. A URL entry's
 * `source` resolves to its embedded copy, so naming it fetches nothing.
 * @param session - The session.
 * @param member - The member.
 * @returns A problem per asset that did not come back, each with `kind` and `id`.
 * @throws A `GraphtyError` with `E_BAD_DOCUMENT` or `E_MODEL_TOO_LARGE` for a member that cannot be
 *     read at all, before anything is added.
 */
export async function restoreAssets(session: GraphSession, member: Record<string, unknown>): Promise<Problem[]> {
    const assets = assetsOf(session);
    const entries = entriesOf(member);
    const problems: Problem[] = [];
    const decoded = new Map<string, Map<string, Uint8Array>>();
    for (const [index, raw] of entries.entries()) {
        const entry = checkEntry(raw);
        const at = `/assets/${String(index)}`;
        if (typeof entry === "string") {
            problems.push({ code: "E_BAD_DOCUMENT", params: { kind: ASSETS_MEMBER, pointer: `${at}${entry}` } });
            continue;
        }

        const fail = (fact: CodedFact): void => {
            problems.push({
                code: fact.code as GraphtyErrorCode,
                params: { ...fact.params, kind: ASSETS_MEMBER, id: entry.id },
            });
        };
        if (entry.id.startsWith(SAMPLE_PREFIX)) {
            fail({ code: "E_MODEL_NAME_TAKEN", params: {} });
            continue;
        }

        if (entry.stored === "url") {
            // Kept by URL: it loads from there, as the reader allows, and is checked against this.
            assets.expectDigest(entry.source as string, entry.sha256);
            continue;
        }

        // An unnamed asset's id is its digest: a file cannot claim one id for other bytes.
        if (/^asset:[0-9a-f]{64}$/.test(entry.id) && entry.id !== `asset:${entry.sha256}`) {
            fail({ code: "E_MODEL_DIGEST_MISMATCH", params: {} });
            continue;
        }

        let given: Map<string, Uint8Array> | CodedFact<GraphtyErrorCode> | undefined = decoded.get(entry.sha256);
        if (entry.files !== undefined) {
            given = decodeFiles(entry.files, assets.limits().maxBytes);
        } else if (given === undefined) {
            problems.push({ code: "E_BAD_DOCUMENT", params: { kind: ASSETS_MEMBER, pointer: `${at}/files` } });
            continue;
        }

        if (!(given instanceof Map)) {
            fail(given);
            continue;
        }

        if ((await digestFileSet(given)) !== entry.sha256) {
            fail({ code: "E_MODEL_DIGEST_MISMATCH", params: {} });
            continue;
        }

        const record = await assets.add(
            { files: given, ...(entry.main === "" ? {} : { main: entry.main }) },
            {
                name: entry.id,
                ...(entry.skipped === undefined ? {} : { skipped: entry.skipped }),
            },
        );
        if (record.state !== "accepted") {
            fail(record.problems[0] ?? { code: "E_MODEL_PARSE", params: {} });
            continue;
        }

        if (record.digest !== entry.sha256) {
            fail({ code: "E_MODEL_DIGEST_MISMATCH", params: {} });
            continue;
        }

        decoded.set(entry.sha256, given);
        if (entry.source !== undefined) {
            assets.bindUrl(entry.source, record.id);
        }
    }

    return problems;
}
