import { deflateRawSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import {
    crc32,
    RATIO_FLOOR,
    type ReadEntryOptions,
    readZipDirectory,
    readZipEntry,
    ZipError,
} from "../../src/common/zip.js";
import { makeZip } from "../helpers/zip.js";

const LIMITS: ReadEntryOptions = { maxBytes: 1 << 30, maxRatio: 1000 };
const decoder = new TextDecoder();

async function texts(bytes: Uint8Array, options: ReadEntryOptions = LIMITS): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (const entry of readZipDirectory(bytes)) {
        if (!entry.directory) {
            out[entry.name] = decoder.decode(await readZipEntry(bytes, entry, options));
        }
    }
    return out;
}

function zipError(fn: () => unknown): ZipError {
    try {
        fn();
    } catch (err) {
        expect(err).toBeInstanceOf(ZipError);
        return err as ZipError;
    }
    throw new Error("expected a ZipError");
}

async function rejected(promise: Promise<unknown>): Promise<ZipError> {
    try {
        await promise;
    } catch (err) {
        expect(err).toBeInstanceOf(ZipError);
        return err as ZipError;
    }
    throw new Error("expected a ZipError");
}

describe("zip reader", () => {
    it("refuses an entry whose local header starts inside the previous entry's local name", () => {
        const zip = makeZip([
            { name: "a-long-name.txt", data: "alpha", method: 0 },
            { name: "b.txt", data: "beta", method: 0 },
        ]);
        const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
        const centrals: number[] = [];
        for (let at = 0; at + 4 <= zip.byteLength; at++) {
            if (view.getUint32(at, true) === 0x02014b50) {
                centrals.push(at);
            }
        }
        // a's header (30 bytes) plus its data, without its 15-byte name: inside a's entry
        view.setUint32(centrals[1] + 42, 30 + 5, true);
        expect(zipError(() => readZipDirectory(zip)).message).toMatch(/overlap/);
    });

    it("reads stored and deflated entries, with and without data descriptors", async () => {
        const zip = makeZip([
            { name: "a.txt", data: "alpha", method: 0 },
            { name: "b.txt", data: "beta ".repeat(100), descriptor: true },
            { name: "dir/", data: "", method: 0 },
            { name: "c.txt", data: "", descriptor: true },
        ]);
        const entries = readZipDirectory(zip);
        expect(entries.map((e) => [e.name, e.method, e.directory])).toEqual([
            ["a.txt", 0, false],
            ["b.txt", 8, false],
            ["dir/", 0, true],
            ["c.txt", 8, false],
        ]);
        expect(await texts(zip)).toEqual({ "a.txt": "alpha", "b.txt": "beta ".repeat(100), "c.txt": "" });
    });

    it("finds the end record behind a comment and tolerates prepended and appended bytes", async () => {
        const comment = "x".repeat(65535);
        const stub = new Uint8Array(1000).fill(7);
        const zip = makeZip([{ name: "a", data: "hello" }], { comment, prepend: stub });
        expect(await texts(zip)).toEqual({ a: "hello" });
        const junk = makeZip([{ name: "a", data: "hello" }], { append: new Uint8Array([1, 2, 3]) });
        expect(await texts(junk)).toEqual({ a: "hello" });
    });

    it("follows the zip64 locator and extra field", async () => {
        const zip = makeZip(
            [
                { name: "a", data: "one" },
                { name: "b", data: "two", method: 0 },
            ],
            { zip64: true },
        );
        const entries = readZipDirectory(zip);
        expect(entries.map((e) => [e.name, e.size])).toEqual([
            ["a", 3],
            ["b", 3],
        ]);
        expect(await texts(zip)).toEqual({ a: "one", b: "two" });
        const prepended = makeZip([{ name: "a", data: "one" }], { zip64: true, prepend: new Uint8Array(17) });
        expect(await texts(prepended)).toEqual({ a: "one" });
    });

    it("refuses what is not a zip and what is cut short", () => {
        expect(zipError(() => readZipDirectory(new TextEncoder().encode("not a zip"))).kind).toBe("not-zip");
        expect(zipError(() => readZipDirectory(new Uint8Array(0))).kind).toBe("not-zip");
        const zip = makeZip([{ name: "a", data: "hello world" }]);
        expect(zipError(() => readZipDirectory(zip.subarray(0, zip.byteLength - 30))).kind).toBe("corrupt");
        const broken = zip.slice();
        // the central directory's signature
        const view = new DataView(broken.buffer);
        const at = broken.byteLength - 22 - 46 - 1;
        view.setUint32(at, 0, true);
        expect(zipError(() => readZipDirectory(broken)).kind).toBe("corrupt");
    });

    it("refuses a split archive and an end record that needs zip64 without one", () => {
        const zip = makeZip([{ name: "a", data: "x" }]);
        const split = zip.slice();
        new DataView(split.buffer).setUint16(split.byteLength - 22 + 4, 1, true);
        expect(zipError(() => readZipDirectory(split)).kind).toBe("unsupported");
        const fake = zip.slice();
        new DataView(fake.buffer).setUint16(fake.byteLength - 22 + 10, 0xffff, true);
        expect(zipError(() => readZipDirectory(fake)).kind).toBe("corrupt");
    });

    it("refuses encryption and unknown methods by name", async () => {
        const zip = makeZip([
            { name: "enc", data: "x", flags: 1 },
            { name: "aes", data: "x", method: 99 },
            { name: "d64", data: "x", method: 9 },
            { name: "bz", data: "x", method: 12 },
            { name: "odd", data: "x", method: 77 },
        ]);
        const [enc, aes, d64, bz, odd] = readZipDirectory(zip);
        expect((await rejected(readZipEntry(zip, enc, LIMITS))).message).toContain("encrypted");
        expect((await rejected(readZipEntry(zip, aes, LIMITS))).message).toContain("encrypted");
        expect((await rejected(readZipEntry(zip, d64, LIMITS))).message).toContain("deflate64");
        expect((await rejected(readZipEntry(zip, bz, LIMITS))).message).toContain("bzip2");
        expect((await rejected(readZipEntry(zip, odd, LIMITS))).message).toContain("method 77");
    });

    it("checks the CRC-32 and the size of stored and deflated data", async () => {
        const zip = makeZip([
            { name: "s", data: "stored", method: 0, crc: 1 },
            { name: "d", data: "deflated".repeat(10), crc: 1 },
            { name: "short", data: "deflated", size: 99 },
        ]);
        const [s, d, short] = readZipDirectory(zip);
        expect((await rejected(readZipEntry(zip, s, LIMITS))).kind).toBe("corrupt");
        expect((await rejected(readZipEntry(zip, d, LIMITS))).kind).toBe("corrupt");
        expect((await rejected(readZipEntry(zip, short, LIMITS))).kind).toBe("corrupt");
    });

    it("refuses truncated deflate data and a local header that is missing", async () => {
        const zip = makeZip([{ name: "a", data: "hello ".repeat(1000) }]);
        const [entry] = readZipDirectory(zip);
        const cut = zip.slice();
        // damage the deflate stream itself
        cut.fill(0xff, 30 + 1, 30 + 1 + 8);
        expect((await rejected(readZipEntry(cut, entry, LIMITS))).kind).toBe("corrupt");
        const moved = { ...entry, localOffset: entry.localOffset + 1 };
        expect((await rejected(readZipEntry(zip, moved, LIMITS))).kind).toBe("corrupt");
        const past = { ...entry, compressedSize: zip.byteLength };
        expect((await rejected(readZipEntry(zip, past, LIMITS))).kind).toBe("corrupt");
    });

    it("enforces the size budget and the compression ratio before inflating", async () => {
        const zeros = new Uint8Array(RATIO_FLOOR * 2);
        const zip = makeZip([{ name: "bomb", data: zeros }]);
        const [bomb] = readZipDirectory(zip);
        expect(bomb.size / bomb.compressedSize).toBeGreaterThan(1000);
        expect((await rejected(readZipEntry(zip, bomb, LIMITS))).kind).toBe("too-large");
        expect((await rejected(readZipEntry(zip, bomb, { maxBytes: 10, maxRatio: 1e9 }))).kind).toBe("too-large");
        expect((await readZipEntry(zip, bomb, { maxBytes: 1 << 30, maxRatio: 1e9 })).byteLength).toBe(zeros.byteLength);
    });

    it("refuses deflate data longer than the directory says", async () => {
        const raw = new TextEncoder().encode("a much longer text than declared");
        const zip = makeZip([{ name: "long", data: raw, size: 3, crc: crc32(raw) }]);
        const [entry] = readZipDirectory(zip);
        expect((await rejected(readZipEntry(zip, entry, LIMITS))).kind).toBe("corrupt");
        // a large entry is stopped while inflating, before the gzip trailer is reached
        const big = new Uint8Array(4 * 1024 * 1024).fill(65);
        const long = makeZip([{ name: "big", data: big, size: 1000, crc: crc32(big) }]);
        const [bigEntry] = readZipDirectory(long);
        expect((await rejected(readZipEntry(long, bigEntry, LIMITS))).message).toContain("longer");
    });

    it("checks the cancellation signal and reports progress while reading", async () => {
        const zip = makeZip([
            { name: "a", data: "x".repeat(5000) },
            { name: "b", data: "y".repeat(5000), method: 0 },
        ]);
        const [a, b] = readZipDirectory(zip);
        const seen: number[] = [];
        await readZipEntry(zip, a, { ...LIMITS, onBytes: (n) => seen.push(n) });
        await readZipEntry(zip, b, { ...LIMITS, onBytes: (n) => seen.push(n) });
        expect(seen.at(-1)).toBe(5000);
        const controller = new AbortController();
        const reason = new Error("stop");
        controller.abort(reason);
        await expect(readZipEntry(zip, a, { ...LIMITS, signal: controller.signal })).rejects.toBe(reason);
        await expect(readZipEntry(zip, b, { ...LIMITS, signal: controller.signal })).rejects.toBe(reason);
    });

    it("decodes UTF-8 and windows-1252 entry names", () => {
        const utf8 = makeZip([{ name: `caf${String.fromCharCode(0xe9)}`, data: "x", flags: 0x800 }]);
        expect(readZipDirectory(utf8)[0].name).toBe(`caf${String.fromCharCode(0xe9)}`);
        const latin = utf8.slice();
        // rewrite the name bytes c3 a9 to e9 20 in the central directory (still two bytes)
        const name = latin.lastIndexOf(0xc3);
        latin[name] = 0xe9;
        latin[name + 1] = 0x20;
        expect(readZipDirectory(latin)[0].name).toBe(`caf${String.fromCharCode(0xe9)} `);
    });

    it("computes the CRC-32 of the reference check value", () => {
        expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
        expect(deflateRawSync(Buffer.from("")).byteLength).toBeGreaterThan(0);
    });
});
