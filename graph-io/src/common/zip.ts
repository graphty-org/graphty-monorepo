/**
 * A zip reader with no dependency (design `design/graph-io/cytoscape-and-obo/design.md` section
 * 3.3; PKWARE APPNOTE 6.3.10, https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT), for
 * the Cytoscape session importer.
 *
 * The whole archive is in memory: every Cytoscape-written entry has a data descriptor and zero
 * sizes in its local header, so the sizes come from the central directory at the end. The end
 * record is searched in the last 65,557 bytes (a comment can be 65,535 bytes long); the zip64
 * locator and the `0x0001` extra field are followed; bytes prepended to the archive (a
 * self-extracting stub) are tolerated by the shift between the directory's stated and actual
 * offsets. Deflate (method 8) is inflated by wrapping the raw deflate bytes in a gzip member
 * (header, data, the directory's CRC-32 and size) and passing it to `DecompressionStream("gzip")`,
 * which every supported runtime has (Node 18, unlike `"deflate-raw"`) and which checks the CRC and
 * the length itself; stored entries (method 0) are checked against a CRC-32 table here. Every
 * other method, and encryption, is refused by name. Entry names are decoded by `decodeEntryName()`
 * (the one place bytes become text) and are matching keys only, never paths.
 */

import { decodeEntryName, throwIfAborted } from "./input.js";

/** Why a zip could not be read; the importer maps each kind to its own issue code. */
type ZipErrorKind = "not-zip" | "corrupt" | "unsupported" | "too-large";

/** A zip that cannot be read, or an entry that cannot be inflated. */
export class ZipError extends Error {
    /** What went wrong. */
    readonly kind: ZipErrorKind;

    /**
     * Create the error.
     * @param kind - what went wrong
     * @param message - a plain-ASCII message
     */
    constructor(kind: ZipErrorKind, message: string) {
        super(message);
        this.name = "ZipError";
        this.kind = kind;
    }
}

/** One entry of the central directory. */
export interface ZipEntry {
    /** The name, decoded, as the central directory spells it. */
    readonly name: string;
    /** The compression method (0 stored, 8 deflate, ...). */
    readonly method: number;
    /** The general purpose bit flags. */
    readonly flags: number;
    /** The CRC-32 of the uncompressed data. */
    readonly crc32: number;
    /** The compressed size in bytes. */
    readonly compressedSize: number;
    /** The uncompressed size in bytes. */
    readonly size: number;
    /** The offset of the local header in the archive bytes (the prepended-data shift applied). */
    readonly localOffset: number;
    /** The name ends in `/`: a directory entry, which holds no data. */
    readonly directory: boolean;
}

/** How one entry is read. */
export interface ReadEntryOptions {
    /** The cancellation signal. */
    readonly signal?: AbortSignal | null | undefined;
    /** Called with the bytes inflated so far by this call. */
    readonly onBytes?: ((inflated: number) => void) | undefined;
    /** The most uncompressed bytes this entry may have (the import's remaining budget). */
    readonly maxBytes: number;
    /** The largest uncompressed-to-compressed ratio allowed (above `RATIO_FLOOR` bytes). */
    readonly maxRatio: number;
}

/** A per-entry size under which the ratio limit does not apply (tiny entries compress well). */
export const RATIO_FLOOR = 1024 * 1024;

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_SIZE = 22;
const MAX_COMMENT = 65535;
const CENTRAL_SIZE = 46;
const LOCAL_SIZE = 30;
const ZIP64_EOCD_SIZE = 56;
const ZIP64_LOCATOR_SIZE = 20;
const U16_MAX = 0xffff;
const U32_MAX = 0xffffffff;
/** General purpose bit 11: the name is UTF-8. */
const UTF8_FLAG = 0x800;
/** Bytes between two cancellation checks while a stored entry's CRC is computed. */
const CRC_SLICE = 1024 * 1024;

/** The compression methods other tools write, by number, for the refusal message. */
const METHOD_NAMES: Readonly<Record<number, string>> = {
    1: "shrink",
    6: "implode",
    9: "deflate64",
    12: "bzip2",
    14: "LZMA",
    93: "zstd",
    95: "xz",
    96: "JPEG",
    97: "WavPack",
    98: "PPMd",
    99: "AES encryption",
};

/**
 * Whether bytes start with a local file header signature (`PK\x03\x04`).
 * @param bytes - the bytes
 * @returns true for the start of a zip
 */
export function startsLikeZip(bytes: Uint8Array): boolean {
    return bytes.byteLength >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4;
}

/**
 * Read the central directory.
 * @param bytes - the whole archive
 * @returns the entries in directory order; ZipError "not-zip" when there is no end record and the
 * bytes do not start like a zip, "corrupt" for an end record or directory that does not fit,
 * "unsupported" for a split archive
 */
export function readZipDirectory(bytes: Uint8Array): ZipEntry[] {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocd = findEndRecord(bytes, view);
    if (eocd < 0) {
        throw startsLikeZip(bytes)
            ? new ZipError("corrupt", "the archive has no end of central directory record (truncated?)")
            : new ZipError("not-zip", "the input is not a zip archive");
    }
    let disk = view.getUint16(eocd + 4, true);
    let directoryDisk = view.getUint16(eocd + 6, true);
    let count = view.getUint16(eocd + 10, true);
    let directorySize = view.getUint32(eocd + 12, true);
    let directoryOffset = view.getUint32(eocd + 16, true);
    let directoryEnd = eocd;
    const locator = eocd - ZIP64_LOCATOR_SIZE;
    if (locator >= 0 && view.getUint32(locator, true) === ZIP64_LOCATOR_SIGNATURE) {
        const record = zip64EndRecord(view, locator);
        disk = view.getUint32(record + 16, true);
        directoryDisk = view.getUint32(record + 20, true);
        count = readU64(view, record + 32);
        directorySize = readU64(view, record + 40);
        directoryOffset = readU64(view, record + 48);
        directoryEnd = record;
    } else if (count === U16_MAX || directorySize === U32_MAX || directoryOffset === U32_MAX) {
        throw new ZipError("corrupt", "the end record needs a zip64 record the archive does not have");
    }
    if (disk !== 0 || directoryDisk !== 0) {
        throw new ZipError("unsupported", "a split (multi-disk) archive cannot be read");
    }
    const start = directoryEnd - directorySize;
    if (start < 0 || directoryOffset > bytes.byteLength) {
        throw new ZipError("corrupt", "the central directory lies outside the archive");
    }
    // data prepended to the archive moves every offset by the same amount
    const shift = start - directoryOffset;
    if (shift < 0) {
        throw new ZipError("corrupt", "the central directory offset does not match its position");
    }
    const entries: ZipEntry[] = [];
    let at = start;
    for (let i = 0; i < count; i++) {
        if (at + CENTRAL_SIZE > directoryEnd || view.getUint32(at, true) !== CENTRAL_SIGNATURE) {
            throw new ZipError("corrupt", `central directory entry ${i + 1} of ${count} is damaged`);
        }
        const nameLength = view.getUint16(at + 28, true);
        const extraLength = view.getUint16(at + 30, true);
        const commentLength = view.getUint16(at + 32, true);
        const next = at + CENTRAL_SIZE + nameLength + extraLength + commentLength;
        if (next > directoryEnd) {
            throw new ZipError("corrupt", `central directory entry ${i + 1} runs past the directory`);
        }
        const flags = view.getUint16(at + 8, true);
        const name = decodeEntryName(
            bytes.subarray(at + CENTRAL_SIZE, at + CENTRAL_SIZE + nameLength),
            (flags & UTF8_FLAG) === 0,
        );
        let compressedSize = view.getUint32(at + 20, true);
        let size = view.getUint32(at + 24, true);
        let localOffset = view.getUint32(at + 42, true);
        if (compressedSize === U32_MAX || size === U32_MAX || localOffset === U32_MAX) {
            ({ compressedSize, size, localOffset } = zip64Extra(view, at + CENTRAL_SIZE + nameLength, extraLength, {
                compressedSize,
                size,
                localOffset,
            }));
        }
        entries.push(
            Object.freeze({
                name,
                method: view.getUint16(at + 10, true),
                flags,
                crc32: view.getUint32(at + 16, true),
                compressedSize,
                size,
                localOffset: localOffset + shift,
                directory: name.endsWith("/"),
            }),
        );
        at = next;
    }
    if (at + 4 <= directoryEnd && view.getUint32(at, true) === CENTRAL_SIGNATURE) {
        throw new ZipError(
            "corrupt",
            `the end record counts ${count} entries but the central directory holds more; entries would go unread`,
        );
    }
    checkOverlap(entries, view);
    return entries;
}

/**
 * Refuse entries whose local header and data overlap (several directory entries naming one local
 * header is a known zip bomb: each inflates the same bytes again). An entry spans its local
 * header, its local name and extra field, and its compressed data; a trailing data descriptor is
 * not counted, since overlapping it inflates nothing twice. A damaged local header counts as a bare
 * header here and is refused when the entry is read.
 * @param entries - the entries
 * @param view - the archive
 */
function checkOverlap(entries: readonly ZipEntry[], view: DataView): void {
    const sorted = [...entries].sort((a, b) => a.localOffset - b.localOffset);
    const end = (entry: ZipEntry): number => {
        const at = entry.localOffset;
        const intact = at + LOCAL_SIZE <= view.byteLength && view.getUint32(at, true) === LOCAL_SIGNATURE;
        const lengths = intact ? view.getUint16(at + 26, true) + view.getUint16(at + 28, true) : 0;
        return at + LOCAL_SIZE + lengths + entry.compressedSize;
    };
    for (let i = 1; i < sorted.length; i++) {
        const before = sorted[i - 1];
        if (sorted[i].localOffset < end(before)) {
            throw new ZipError("corrupt", `the entries ${before.name} and ${sorted[i].name} overlap`);
        }
    }
}

/**
 * The position of the end of central directory record: the last signature whose comment length
 * fits the archive, else the last signature at all (an archive with bytes after its comment).
 * @param bytes - the archive
 * @param view - a view of it
 * @returns the offset, or -1
 */
function findEndRecord(bytes: Uint8Array, view: DataView): number {
    const lowest = Math.max(0, bytes.byteLength - EOCD_SIZE - MAX_COMMENT);
    let fallback = -1;
    for (let at = bytes.byteLength - EOCD_SIZE; at >= lowest; at--) {
        if (view.getUint32(at, true) !== EOCD_SIGNATURE) {
            continue;
        }
        if (at + EOCD_SIZE + view.getUint16(at + 20, true) === bytes.byteLength) {
            return at;
        }
        if (fallback < 0) {
            fallback = at;
        }
    }
    return fallback;
}

/**
 * The zip64 end of central directory record a locator points at (or, when the archive has bytes
 * prepended, the one right before the locator).
 * @param view - the archive
 * @param locator - the locator's offset
 * @returns the record's offset
 */
function zip64EndRecord(view: DataView, locator: number): number {
    const stated = readU64(view, locator + 8);
    for (const at of [stated, locator - ZIP64_EOCD_SIZE]) {
        if (at >= 0 && at + ZIP64_EOCD_SIZE <= locator && view.getUint32(at, true) === ZIP64_EOCD_SIGNATURE) {
            return at;
        }
    }
    throw new ZipError("corrupt", "the zip64 end record the locator names is missing");
}

/**
 * The zip64 extended information extra field (header id 0x0001) of a central entry: the 64-bit
 * values of the fields whose 32-bit slot is 0xFFFFFFFF, in the order APPNOTE 4.5.3 gives.
 * @param view - the archive
 * @param at - the start of the extra field
 * @param length - its length
 * @param fields - the 32-bit values
 * @param fields.compressedSize - the compressed size slot
 * @param fields.size - the uncompressed size slot
 * @param fields.localOffset - the local header offset slot
 * @returns the resolved values
 */
function zip64Extra(
    view: DataView,
    at: number,
    length: number,
    fields: { compressedSize: number; size: number; localOffset: number },
): { compressedSize: number; size: number; localOffset: number } {
    const out = { ...fields };
    for (let p = at; p + 4 <= at + length; ) {
        const id = view.getUint16(p, true);
        const dataLength = view.getUint16(p + 2, true);
        if (id === 1) {
            let q = p + 4;
            const end = q + dataLength;
            for (const key of ["size", "compressedSize", "localOffset"] as const) {
                if (fields[key] === U32_MAX) {
                    if (q + 8 > end) {
                        throw new ZipError("corrupt", "a zip64 extra field is too short");
                    }
                    out[key] = readU64(view, q);
                    q += 8;
                }
            }
            return out;
        }
        p += 4 + dataLength;
    }
    throw new ZipError("corrupt", "an entry needs a zip64 extra field it does not have");
}

/**
 * An unsigned 64-bit little-endian integer as a number (exact up to 2^53).
 * @param view - the bytes
 * @param at - the offset
 * @returns the value; ZipError "unsupported" beyond 2^53
 */
function readU64(view: DataView, at: number): number {
    const high = view.getUint32(at + 4, true);
    if (high >= 0x200000) {
        throw new ZipError("unsupported", "a zip64 size or offset beyond 2^53 cannot be read");
    }
    return high * 0x100000000 + view.getUint32(at, true);
}

/**
 * Read one entry's data: stored entries are sliced and CRC-checked, deflated ones inflated.
 * @param bytes - the whole archive
 * @param entry - the entry
 * @param options - cancellation, progress and the size limits
 * @returns the uncompressed bytes; ZipError for a damaged, encrypted, unsupported or oversized entry
 */
export async function readZipEntry(bytes: Uint8Array, entry: ZipEntry, options: ReadEntryOptions): Promise<Uint8Array> {
    if ((entry.flags & 1) !== 0 || entry.method === 99) {
        throw new ZipError("unsupported", `${entry.name}: the entry is encrypted`);
    }
    if (entry.method !== 0 && entry.method !== 8) {
        const name = METHOD_NAMES[entry.method] ?? `method ${entry.method}`;
        throw new ZipError(
            "unsupported",
            `${entry.name}: compression ${name} is not supported (only stored and deflate)`,
        );
    }
    if (entry.size > options.maxBytes) {
        throw new ZipError(
            "too-large",
            `${entry.name}: ${entry.size} uncompressed bytes exceed the limit of ${options.maxBytes}`,
        );
    }
    if (entry.size > RATIO_FLOOR && entry.size > options.maxRatio * Math.max(entry.compressedSize, 1)) {
        throw new ZipError(
            "too-large",
            `${entry.name}: ${entry.size} bytes from ${entry.compressedSize} is a compression ratio above ${options.maxRatio}:1`,
        );
    }
    const data = entryData(bytes, entry);
    if (entry.method === 0) {
        if (data.byteLength !== entry.size) {
            throw new ZipError("corrupt", `${entry.name}: a stored entry's sizes disagree`);
        }
        let crc = 0xffffffff;
        for (let at = 0; at < data.byteLength; at += CRC_SLICE) {
            throwIfAborted(options.signal);
            crc = crcUpdate(crc, data.subarray(at, Math.min(at + CRC_SLICE, data.byteLength)));
            options.onBytes?.(Math.min(at + CRC_SLICE, data.byteLength));
        }
        if ((crc ^ 0xffffffff) >>> 0 !== entry.crc32) {
            throw new ZipError("corrupt", `${entry.name}: the data does not match its CRC-32`);
        }
        return data;
    }
    return inflate(data, entry, options);
}

/**
 * The compressed bytes of an entry, located through its local header (whose name and extra
 * lengths can differ from the central directory's).
 * @param bytes - the archive
 * @param entry - the entry
 * @returns exactly compressedSize bytes
 */
function entryData(bytes: Uint8Array, entry: ZipEntry): Uint8Array {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const at = entry.localOffset;
    if (at + LOCAL_SIZE > bytes.byteLength || view.getUint32(at, true) !== LOCAL_SIGNATURE) {
        throw new ZipError("corrupt", `${entry.name}: the local header is missing`);
    }
    const nameLength = view.getUint16(at + 26, true);
    const localName = decodeEntryName(
        bytes.subarray(at + LOCAL_SIZE, Math.min(bytes.byteLength, at + LOCAL_SIZE + nameLength)),
        (entry.flags & UTF8_FLAG) === 0,
    );
    if (localName !== entry.name) {
        throw new ZipError(
            "corrupt",
            `${entry.name}: the local header names the entry ${JSON.stringify(localName)}, the central directory ${JSON.stringify(entry.name)}`,
        );
    }
    const start = at + LOCAL_SIZE + nameLength + view.getUint16(at + 28, true);
    const end = start + entry.compressedSize;
    if (end > bytes.byteLength) {
        throw new ZipError("corrupt", `${entry.name}: the entry's data runs past the end of the archive (truncated?)`);
    }
    return bytes.subarray(start, end);
}

/**
 * Inflate a deflate stream through `DecompressionStream("gzip")`, wrapped in a gzip member that
 * carries the directory's CRC-32 and size, so the platform checks both.
 * @param data - the raw deflate bytes
 * @param entry - the entry
 * @param options - cancellation, progress and limits
 * @returns the bytes
 */
async function inflate(data: Uint8Array, entry: ZipEntry, options: ReadEntryOptions): Promise<Uint8Array> {
    if (typeof DecompressionStream !== "function") {
        throw new ZipError(
            "unsupported",
            "this runtime has no DecompressionStream, so deflated entries cannot be read",
        );
    }
    const member = new Uint8Array(10 + data.byteLength + 8);
    member.set([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 0xff]);
    member.set(data, 10);
    const trailer = new DataView(member.buffer, 10 + data.byteLength, 8);
    trailer.setUint32(0, entry.crc32, true);
    trailer.setUint32(4, entry.size % 0x100000000, true);
    const source = new ReadableStream<BufferSource>({
        start(controller): void {
            controller.enqueue(member);
            controller.close();
        },
    });
    const reader = source.pipeThrough(new DecompressionStream("gzip")).getReader();
    const parts: Uint8Array[] = [];
    let total = 0;
    try {
        for (;;) {
            throwIfAborted(options.signal);
            let chunk: ReadableStreamReadResult<Uint8Array>;
            try {
                chunk = await reader.read();
            } catch {
                throw new ZipError(
                    "corrupt",
                    `${entry.name}: the deflate data is damaged or does not match its CRC-32 and size`,
                );
            }
            if (chunk.done) {
                break;
            }
            total += chunk.value.byteLength;
            if (total > entry.size) {
                throw new ZipError("corrupt", `${entry.name}: the data is longer than its directory size`);
            }
            parts.push(chunk.value);
            options.onBytes?.(total);
        }
    } finally {
        await reader.cancel().catch(() => undefined);
    }
    if (total !== entry.size) {
        throw new ZipError("corrupt", `${entry.name}: the data is shorter than its directory size`);
    }
    if (parts.length === 1) {
        return parts[0];
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const part of parts) {
        out.set(part, at);
        at += part.byteLength;
    }
    return out;
}

/** The CRC-32 table (polynomial 0xEDB88320). */
const CRC_TABLE = ((): Uint32Array => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

/**
 * Continue a CRC-32 over more bytes.
 * @param crc - the running value (start with 0xFFFFFFFF)
 * @param bytes - the bytes
 * @returns the running value (XOR with 0xFFFFFFFF to finish)
 */
function crcUpdate(crc: number, bytes: Uint8Array): number {
    let c = crc;
    for (const byte of bytes) {
        c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
    }
    return c >>> 0;
}

/**
 * The CRC-32 of bytes.
 * @param bytes - the bytes
 * @returns the checksum
 */
export function crc32(bytes: Uint8Array): number {
    return (crcUpdate(0xffffffff, bytes) ^ 0xffffffff) >>> 0;
}
