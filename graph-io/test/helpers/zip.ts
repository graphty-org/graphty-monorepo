/**
 * A small zip writer for tests: stored or deflated entries, optional data descriptors, zip64
 * records, an archive comment and bytes prepended to the archive, so the zip reader and the
 * session importer can be tested on archives built in the test itself.
 */

import { deflateRawSync } from "node:zlib";

import { crc32 } from "../../src/common/zip.js";

/** One entry to write. */
export interface ZipInput {
    /** The name. */
    readonly name: string;
    /** The data (text is UTF-8 encoded). */
    readonly data: string | Uint8Array;
    /** 0 stored, 8 deflate (default), or any other number written as is (the data stored raw). */
    readonly method?: number;
    /** Extra general purpose flags (bit 0 encrypted, bit 11 UTF-8). */
    readonly flags?: number;
    /** Write a data descriptor and zero sizes in the local header, as Java does. */
    readonly descriptor?: boolean;
    /** Override the CRC-32 the directory states. */
    readonly crc?: number;
    /** Override the uncompressed size the directory states. */
    readonly size?: number;
    /** The name as raw bytes (a legacy code page), instead of the UTF-8 of `name`. */
    readonly nameBytes?: Uint8Array;
}

/** Archive-level choices. */
interface ZipOptions {
    /** Write zip64 end records and extra fields. */
    readonly zip64?: boolean;
    /** The archive comment. */
    readonly comment?: string;
    /** Bytes before the archive (a self-extracting stub). */
    readonly prepend?: Uint8Array;
    /** Bytes after the end record. */
    readonly append?: Uint8Array;
}

const encoder = new TextEncoder();

/**
 * Build a zip archive.
 * @param inputs - the entries
 * @param options - archive-level choices
 * @returns the archive bytes
 */
export function makeZip(inputs: readonly ZipInput[], options: ZipOptions = {}): Uint8Array {
    const parts: number[][] = [];
    const central: number[][] = [];
    const prepend = options.prepend ?? new Uint8Array(0);
    let offset = 0;
    for (const input of inputs) {
        const raw = typeof input.data === "string" ? encoder.encode(input.data) : input.data;
        const method = input.method ?? 8;
        const data = method === 8 ? new Uint8Array(deflateRawSync(raw)) : raw;
        const crc = input.crc ?? crc32(raw);
        const size = input.size ?? raw.byteLength;
        const name = input.nameBytes ?? encoder.encode(input.name);
        const flags = (input.flags ?? 0) | (input.descriptor === true ? 8 : 0);
        const local = [
            ...u32(0x04034b50),
            ...u16(20),
            ...u16(flags),
            ...u16(method),
            ...u32(0),
            ...u32(input.descriptor === true ? 0 : crc),
            ...u32(input.descriptor === true ? 0 : data.byteLength),
            ...u32(input.descriptor === true ? 0 : size),
            ...u16(name.byteLength),
            ...u16(0),
            ...name,
            ...data,
        ];
        if (input.descriptor === true) {
            local.push(...u32(0x08074b50), ...u32(crc), ...u32(data.byteLength), ...u32(size));
        }
        const extra =
            options.zip64 === true
                ? [...u16(1), ...u16(24), ...u64(size), ...u64(data.byteLength), ...u64(offset)]
                : [];
        central.push([
            ...u32(0x02014b50),
            ...u16(45),
            ...u16(20),
            ...u16(flags),
            ...u16(method),
            ...u32(0),
            ...u32(crc),
            ...u32(options.zip64 === true ? 0xffffffff : data.byteLength),
            ...u32(options.zip64 === true ? 0xffffffff : size),
            ...u16(name.byteLength),
            ...u16(extra.length),
            ...u16(0),
            ...u16(0),
            ...u16(0),
            ...u32(0),
            ...u32(options.zip64 === true ? 0xffffffff : offset),
            ...name,
            ...extra,
        ]);
        parts.push(local);
        offset += local.length;
    }
    const directory = central.flat();
    const comment = encoder.encode(options.comment ?? "");
    const tail: number[] = [];
    if (options.zip64 === true) {
        const record = offset + directory.length;
        tail.push(
            ...u32(0x06064b50),
            ...u64(44),
            ...u16(45),
            ...u16(45),
            ...u32(0),
            ...u32(0),
            ...u64(inputs.length),
            ...u64(inputs.length),
            ...u64(directory.length),
            ...u64(offset),
        );
        tail.push(...u32(0x07064b50), ...u32(0), ...u64(record), ...u32(1));
    }
    tail.push(
        ...u32(0x06054b50),
        ...u16(0),
        ...u16(0),
        ...u16(options.zip64 === true ? 0xffff : inputs.length),
        ...u16(options.zip64 === true ? 0xffff : inputs.length),
        ...u32(options.zip64 === true ? 0xffffffff : directory.length),
        ...u32(options.zip64 === true ? 0xffffffff : offset),
        ...u16(comment.byteLength),
        ...comment,
    );
    const body = [...parts.flat(), ...directory, ...tail];
    const append = options.append ?? new Uint8Array(0);
    const out = new Uint8Array(prepend.byteLength + body.length + append.byteLength);
    out.set(prepend, 0);
    out.set(body, prepend.byteLength);
    out.set(append, prepend.byteLength + body.length);
    return out;
}

function u16(n: number): number[] {
    return [n & 0xff, (n >>> 8) & 0xff];
}

function u32(n: number): number[] {
    return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

function u64(n: number): number[] {
    return [...u32(n % 0x100000000), ...u32(Math.floor(n / 0x100000000))];
}
