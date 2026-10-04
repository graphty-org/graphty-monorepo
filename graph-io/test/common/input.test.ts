import { GraphFormatError } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    ENCODING_CONFLICT_CODE,
    ENCODING_FALLBACK_CODE,
    INVALID_ENCODING_CODE,
    OPTION_IGNORED_CODE,
    UNKNOWN_ENCODING_CODE,
} from "../../src/common/codes.js";
import {
    canonicalEncoding,
    decodeEntryName,
    inputLength,
    INVALID_UTF8_CODE,
    isImportInput,
    LineReader,
    readText,
    textChunks,
    throwIfAborted,
} from "../../src/common/input.js";
import { ImportReportBuilder } from "../../src/common/report.js";
import { xmlDeclaredEncoding } from "../../src/common/xml.js";
import { ImportError, type ImportInput } from "../../src/types.js";
import { byteChunks, byteStream, textChunksOf } from "../helpers/corpus.js";

const encoder = new TextEncoder();

// 2-byte (e-acute), 3-byte (CJK), 4-byte (emoji) sequences built from code points so the source stays ASCII
const MULTIBYTE = `caf${String.fromCodePoint(0xe9)} ${String.fromCodePoint(0x4e2d, 0x6587)} ${String.fromCodePoint(0x1f600)} end`;

function report(): ImportReportBuilder {
    return new ImportReportBuilder("test", 100);
}

async function collect(input: ImportInput, r = report(), options = {}): Promise<string[]> {
    const out: string[] = [];
    for await (const chunk of textChunks(input, r, options)) {
        out.push(chunk);
    }
    return out;
}

async function linesOf(
    input: ImportInput,
    r = report(),
    options = {},
): Promise<{ lines: string[]; numbers: number[] }> {
    const reader = new LineReader(input, r, options);
    const lines: string[] = [];
    const numbers: number[] = [];
    for await (const line of reader) {
        lines.push(line);
        numbers.push(reader.line);
    }
    return { lines, numbers };
}

describe("isImportInput / inputLength", () => {
    it("recognises every member of the union", () => {
        expect(isImportInput("x")).toBe(true);
        expect(isImportInput(new Uint8Array(2))).toBe(true);
        expect(isImportInput(byteStream(new Uint8Array(2), 1))).toBe(true);
        expect(isImportInput(byteChunks(new Uint8Array(2), 1))).toBe(true);
        expect(isImportInput(42)).toBe(false);
        expect(isImportInput(null)).toBe(false);
        expect(isImportInput({})).toBe(false);
    });

    it("knows the length of in-memory input only", () => {
        expect(inputLength("abc")).toBe(3);
        expect(inputLength(new Uint8Array(5))).toBe(5);
        expect(inputLength(byteStream(new Uint8Array(5), 1))).toBeNull();
        expect(inputLength(byteChunks(new Uint8Array(5), 1))).toBeNull();
    });
});

describe("textChunks", () => {
    it("reads a string as one chunk; an empty input is E_EMPTY_INPUT unless the format allows it", async () => {
        expect(await collect("hello")).toEqual(["hello"]);
        expect(await collect("", report(), { allowEmpty: true })).toEqual([]);
        await expect(collect("")).rejects.toMatchObject({ details: { code: "E_EMPTY_INPUT" } });
    });

    it("decodes bytes, streams, byte iterables and text iterables to the same text", async () => {
        const bytes = encoder.encode(MULTIBYTE);
        expect((await collect(bytes)).join("")).toBe(MULTIBYTE);
        expect((await collect(byteStream(bytes, 3))).join("")).toBe(MULTIBYTE);
        expect((await collect(byteChunks(bytes, 2))).join("")).toBe(MULTIBYTE);
        expect((await collect(textChunksOf(MULTIBYTE, 2))).join("")).toBe(MULTIBYTE);
    });

    it("decodes multi-byte characters split across every chunk boundary", async () => {
        const bytes = encoder.encode(MULTIBYTE);
        for (let size = 1; size <= 5; size++) {
            expect((await collect(byteChunks(bytes, size))).join("")).toBe(MULTIBYTE);
            expect((await collect(byteStream(bytes, size))).join("")).toBe(MULTIBYTE);
        }
    });

    it("finishes a pending byte sequence when a text chunk follows in a mixed iterable", async () => {
        const bytes = encoder.encode(String.fromCodePoint(0x1f600));
        async function* mixed(): AsyncGenerator<string | Uint8Array> {
            yield bytes.subarray(0, 2);
            yield bytes.subarray(2);
            yield " text";
            await Promise.resolve();
        }
        expect((await collect(mixed())).join("")).toBe(`${String.fromCodePoint(0x1f600)} text`);
    });

    it("strips a leading BOM from text and from bytes but keeps a later one", async () => {
        const bom = String.fromCharCode(0xfeff);
        expect((await collect(`${bom}abc`)).join("")).toBe("abc");
        expect((await collect(encoder.encode(`${bom}abc`))).join("")).toBe("abc");
        expect((await collect(byteChunks(encoder.encode(`${bom}abc`), 1))).join("")).toBe("abc");
        expect((await collect(textChunksOf(`${bom}abc`, 2))).join("")).toBe("abc");
        expect((await collect(`a${bom}bc`)).join("")).toBe(`a${bom}bc`);
        expect(await collect(bom, report(), { allowEmpty: true })).toEqual([]);
    });

    it("reports invalid UTF-8 as a parse-error and aborts with ImportError", async () => {
        const r = report();
        let caught: unknown;
        try {
            await collect(new Uint8Array([0x61, 0xff, 0x62]), r, { encoding: "utf-8" });
        } catch (err) {
            caught = err;
        }
        expect(caught).toBeInstanceOf(ImportError);
        const err = caught as ImportError;
        expect(err.report.issues).toHaveLength(1);
        expect(err.report.issues[0]).toMatchObject({
            category: "parse-error",
            severity: "error",
            code: INVALID_UTF8_CODE,
        });
        expect(err.details.code).toBe(INVALID_UTF8_CODE);
        expect(r.errorCount).toBe(1);
    });

    it("reports a truncated multi-byte sequence at end of input", async () => {
        const bytes = encoder.encode(String.fromCodePoint(0x1f600)).subarray(0, 3);
        const strict = { encoding: "utf-8" };
        await expect(collect(bytes, report(), strict)).rejects.toBeInstanceOf(ImportError);
        await expect(collect(byteChunks(bytes, 1), report(), strict)).rejects.toBeInstanceOf(ImportError);
        await expect(collect(byteStream(bytes, 2), report(), strict)).rejects.toBeInstanceOf(ImportError);
    });

    it("never substitutes U+FFFD", async () => {
        // an overlong encoding of "/" that a lenient decoder would map to U+FFFD
        const bytes = new Uint8Array([0x61, 0xc0, 0xaf, 0x62]);
        await expect(collect(bytes, report(), { encoding: "utf-8" })).rejects.toBeInstanceOf(ImportError);
    });

    it("rejects a chunk that is neither a string nor a Uint8Array", async () => {
        async function* bad(): AsyncGenerator<string | Uint8Array> {
            yield 42 as unknown as string;
            await Promise.resolve();
        }
        let caught: unknown;
        try {
            await collect(bad());
        } catch (err) {
            caught = err;
        }
        expect(caught).toBeInstanceOf(GraphFormatError);
        expect((caught as GraphFormatError).code).toBe("E_UNSUPPORTED");
    });

    it("reports progress with a total for in-memory input", async () => {
        const calls: [number, number | undefined][] = [];
        const onProgress = (done: number, total?: number): void => {
            calls.push([done, total]);
        };
        await collect("abcd", report(), { onProgress });
        expect(calls).toEqual([[4, 4]]);
        calls.length = 0;
        await collect(encoder.encode("abcd"), report(), { onProgress });
        expect(calls).toEqual([[4, 4]]);
        calls.length = 0;
        await collect(new Uint8Array(0), report(), { onProgress, allowEmpty: true });
        expect(calls).toEqual([[0, 0]]);
        calls.length = 0;
        await collect(byteChunks(encoder.encode("abcdef"), 4), report(), { onProgress });
        expect(calls).toEqual([
            [4, undefined],
            [6, undefined],
            [6, 6],
        ]);
    });

    it("throws the abort reason before reading when the signal is already aborted", async () => {
        const controller = new AbortController();
        controller.abort();
        let caught: unknown;
        try {
            await collect("abc", report(), { signal: controller.signal });
        } catch (err) {
            caught = err;
        }
        expect((caught as { name: string }).name).toBe("AbortError");
    });

    it("stops a stream between chunks when the signal fires and cancels the stream", async () => {
        const controller = new AbortController();
        let cancelled = false;
        let pulls = 0;
        const stream = new ReadableStream<Uint8Array>({
            pull(c): void {
                pulls++;
                c.enqueue(encoder.encode("chunk\n"));
                if (pulls === 2) {
                    controller.abort(new Error("user cancelled"));
                }
            },
            cancel(): void {
                cancelled = true;
            },
        });
        const seen: string[] = [];
        let caught: unknown;
        try {
            for await (const chunk of textChunks(stream, report(), { signal: controller.signal })) {
                seen.push(chunk);
            }
        } catch (err) {
            caught = err;
        }
        expect(caught).toBeInstanceOf(Error);
        expect((caught as Error).message).toBe("user cancelled");
        expect(seen.length).toBeLessThan(4);
        expect(cancelled).toBe(true);
    });

    it("cancels a stream when the consumer stops early", async () => {
        let cancelled = false;
        const stream = new ReadableStream<Uint8Array>({
            pull(c): void {
                c.enqueue(encoder.encode("x"));
            },
            cancel(): void {
                cancelled = true;
            },
        });
        for await (const chunk of textChunks(stream, report())) {
            // the first bytes are held back for the BOM check
            expect(chunk).toMatch(/^x+$/);
            break;
        }
        expect(cancelled).toBe(true);
    });

    it("throwIfAborted rethrows the signal's reason as it is, whatever its type (the platform contract)", () => {
        expect(() => throwIfAborted(null)).not.toThrow();
        expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
        const withString = new AbortController();
        withString.abort("because");
        try {
            throwIfAborted(withString.signal);
            throw new Error("did not throw");
        } catch (err) {
            expect(err).toBe(withString.signal.reason);
            expect(err).toBe("because");
        }
        const withError = new AbortController();
        const reason = new Error("boom");
        withError.abort(reason);
        expect(() => throwIfAborted(withError.signal)).toThrow(reason);
        const plain = new AbortController();
        plain.abort();
        try {
            throwIfAborted(plain.signal);
            throw new Error("did not throw");
        } catch (err) {
            expect((err as Error).name).toBe("AbortError");
        }
    });
});

describe("readText", () => {
    it("returns the whole text for every input shape, BOM removed", async () => {
        const bom = String.fromCharCode(0xfeff);
        const text = `${bom}${MULTIBYTE}\nsecond line`;
        const bytes = encoder.encode(text);
        const expected = `${MULTIBYTE}\nsecond line`;
        expect(await readText(text, report())).toBe(expected);
        expect(await readText(bytes, report())).toBe(expected);
        expect(await readText(byteChunks(bytes, 3), report())).toBe(expected);
        expect(await readText(byteStream(bytes, 5), report())).toBe(expected);
        expect(await readText(textChunksOf(text, 4), report())).toBe(expected);
    });

    it("honours the signal and reports progress for a string", async () => {
        const controller = new AbortController();
        controller.abort();
        await expect(readText("abc", report(), { signal: controller.signal })).rejects.toMatchObject({
            name: "AbortError",
        });
        const calls: [number, number | undefined][] = [];
        await readText("abc", report(), { onProgress: (d, t): void => void calls.push([d, t]) });
        expect(calls).toEqual([[3, 3]]);
    });
});

describe("LineReader", () => {
    it("splits on LF, CRLF and lone CR with 1-based line numbers", async () => {
        const { lines, numbers } = await linesOf("a\nb\r\nc\rd");
        expect(lines).toEqual(["a", "b", "c", "d"]);
        expect(numbers).toEqual([1, 2, 3, 4]);
    });

    it("keeps empty lines and drops nothing but terminators", async () => {
        const blank = { allowEmpty: true };
        expect((await linesOf("a\n\nb\n")).lines).toEqual(["a", "", "b"]);
        expect((await linesOf("\n", report(), blank)).lines).toEqual([""]);
        expect((await linesOf("\r\n", report(), blank)).lines).toEqual([""]);
        expect((await linesOf("\r", report(), blank)).lines).toEqual([""]);
        expect((await linesOf("", report(), blank)).lines).toEqual([]);
        expect((await linesOf("no newline")).lines).toEqual(["no newline"]);
        expect((await linesOf("trailing\r")).lines).toEqual(["trailing"]);
        expect((await linesOf("a\n\r\n")).lines).toEqual(["a", ""]);
    });

    it("gives the same lines whatever the chunk boundaries, CRLF split included", async () => {
        const text = `${MULTIBYTE}\r\nline two\nline three\r\n\r\nlast`;
        const bytes = encoder.encode(text);
        const expected = [MULTIBYTE, "line two", "line three", "", "last"];
        expect((await linesOf(text)).lines).toEqual(expected);
        expect((await linesOf(bytes)).lines).toEqual(expected);
        for (let size = 1; size <= 7; size++) {
            expect((await linesOf(byteChunks(bytes, size))).lines).toEqual(expected);
            expect((await linesOf(textChunksOf(text, size))).lines).toEqual(expected);
        }
        expect((await linesOf(byteStream(bytes, 4))).lines).toEqual(expected);
    });

    it("counts lines across chunks and starts at 0 before iteration", async () => {
        const reader = new LineReader(textChunksOf("a\nb\nc", 1), report());
        expect(reader.line).toBe(0);
        const seen: string[] = [];
        for await (const line of reader) {
            seen.push(`${reader.line}:${line}`);
        }
        expect(seen).toEqual(["1:a", "2:b", "3:c"]);
        expect(reader.line).toBe(3);
    });

    it("surfaces a decode error as ImportError", async () => {
        // valid non-ASCII UTF-8 first, so the truncated sequence cannot fall back to windows-1252
        await expect(linesOf(new Uint8Array([0xc3, 0xa9, 0x0a, 0xc3]))).rejects.toBeInstanceOf(ImportError);
    });
});

describe("byte decoding: BOM, declaration, option, windows-1252 fallback", () => {
    const E_ACUTE = String.fromCharCode(0xe9);
    const LATIN1 = new Uint8Array([0x63, 0x61, 0x66, 0xe9, 0x0a, 0x62]); // "cafe\nb" with e-acute as 0xE9

    async function decoded(
        input: ImportInput,
        options: Record<string, unknown> = {},
    ): Promise<{ text: string; codes: string[] }> {
        const r = report();
        const text = (await collect(input, r, options)).join("");
        return { text, codes: r.issues.map((i) => i.code) };
    }

    function utf16(text: string, littleEndian: boolean): Uint8Array {
        const out = new Uint8Array(2 + text.length * 2);
        const view = new DataView(out.buffer);
        view.setUint16(0, 0xfeff, littleEndian);
        for (let i = 0; i < text.length; i++) {
            view.setUint16(2 + i * 2, text.charCodeAt(i), littleEndian);
        }
        return out;
    }

    it("reads undeclared bytes that are not UTF-8 as windows-1252, with one warning, in every input shape", async () => {
        for (const input of [LATIN1, byteChunks(LATIN1, 1), byteStream(LATIN1, 2)]) {
            const { text, codes } = await decoded(input);
            expect(text).toBe(`caf${E_ACUTE}\nb`);
            expect(codes).toEqual([ENCODING_FALLBACK_CODE]);
        }
        // 0x80-0x9F are the windows-1252 letters, not C1 controls
        expect((await decoded(new Uint8Array([0x93, 0x61, 0x94]))).text).toBe(
            `${String.fromCharCode(0x201c)}a${String.fromCharCode(0x201d)}`,
        );
    });

    it("keeps invalid UTF-8 fatal after valid non-ASCII UTF-8, after a UTF-8 BOM, and for binary data", async () => {
        const mixed = new Uint8Array([...encoder.encode(`${E_ACUTE}\n`), 0xe9]);
        await expect(decoded(mixed)).rejects.toBeInstanceOf(ImportError);
        await expect(decoded(new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0xe9]))).rejects.toBeInstanceOf(ImportError);
        const binary = new Uint8Array([0x61, 0xff, 0xfe, 0x00, 0x62]);
        const err = await decoded(binary).then(
            () => null,
            (e: unknown) => e as ImportError,
        );
        expect(err?.report.issues.map((i) => i.code)).toEqual([INVALID_UTF8_CODE]);
    });

    it("decodes UTF-16LE and UTF-16BE announced by a BOM, also split across one-byte chunks", async () => {
        const text = `a,b\n${E_ACUTE},${String.fromCodePoint(0x1f600)}`;
        for (const littleEndian of [true, false]) {
            const bytes = utf16(text, littleEndian);
            expect(await decoded(bytes)).toEqual({ text, codes: [] });
            expect(await decoded(byteChunks(bytes, 1))).toEqual({ text, codes: [] });
        }
        // a lone surrogate is not valid UTF-16
        const lone = utf16(String.fromCharCode(0xd800), true);
        const err = await decoded(lone).then(
            () => null,
            (e: unknown) => e as ImportError,
        );
        expect(err?.report.issues.map((i) => i.code)).toEqual([INVALID_ENCODING_CODE]);
    });

    it("honours an encoding the input declares, and ignores one it cannot decode or a BOM-less UTF-16", async () => {
        const declaredEncoding = (head: string): string | null => /enc=(\S+)/.exec(head)?.[1] ?? null;
        const latin = new Uint8Array([...encoder.encode("enc=iso-8859-1 "), 0xe9]);
        expect(await decoded(latin, { declaredEncoding })).toEqual({ text: `enc=iso-8859-1 ${E_ACUTE}`, codes: [] });
        const unknown = await decoded(encoder.encode("enc=klingon x"), { declaredEncoding });
        expect(unknown).toEqual({ text: "enc=klingon x", codes: [UNKNOWN_ENCODING_CODE] });
        // a declared UTF-16 over bytes that are not UTF-16 is read as UTF-8, no longer silently
        expect(await decoded(encoder.encode("enc=utf-16 x"), { declaredEncoding })).toEqual({
            text: "enc=utf-16 x",
            codes: [ENCODING_CONFLICT_CODE],
        });
    });

    // this test pinned the option silently winning over a BOM (the BOM became the text "i>>?" glued
    // to the first cell); a BOM now wins, and every disagreement is a W_ENCODING_CONFLICT warning
    it("lets a BOM win over the encoding option and the option over the declaration, warning on each conflict", async () => {
        const declaredEncoding = (): string => "utf-16le";
        const bytes = encoder.encode(`${String.fromCharCode(0xfeff)}${E_ACUTE}`);
        expect(await decoded(bytes, { encoding: "windows-1252", declaredEncoding })).toEqual({
            text: E_ACUTE,
            codes: [ENCODING_CONFLICT_CODE, ENCODING_CONFLICT_CODE],
        });
        const latin = (): string => "iso-8859-1";
        expect(await decoded(encoder.encode(E_ACUTE), { encoding: "utf-8", declaredEncoding: latin })).toEqual({
            text: E_ACUTE,
            codes: [ENCODING_CONFLICT_CODE],
        });
    });

    it("reports an encoding option given with text input as ignored (the text is already decoded)", async () => {
        expect(await decoded(`x${E_ACUTE}`, { encoding: "utf-16be" })).toEqual({
            text: `x${E_ACUTE}`,
            codes: [OPTION_IGNORED_CODE],
        });
    });

    it("reads a prolog's encoding and a canonical encoding name", () => {
        expect(xmlDeclaredEncoding(`<?xml version="1.0" encoding='ISO-8859-1'?><graphml/>`)).toBe("ISO-8859-1");
        expect(xmlDeclaredEncoding(`<?xml version="1.0"?><graphml/>`)).toBeNull();
        expect(xmlDeclaredEncoding(` <?xml version="1.0" encoding="latin1"?>`)).toBeNull();
        expect(canonicalEncoding(" Latin1 ")).toBe("windows-1252");
        expect(canonicalEncoding("klingon")).toBeNull();
    });
});

describe("decodeEntryName (zip entry names)", () => {
    it("reads UTF-8 names, and names that are not UTF-8 as windows-1252", () => {
        expect(decodeEntryName(encoder.encode("CytoscapeSession/networks/a.xgmml"))).toBe(
            "CytoscapeSession/networks/a.xgmml",
        );
        expect(decodeEntryName(encoder.encode(`tables/${MULTIBYTE}.cytable`))).toBe(`tables/${MULTIBYTE}.cytable`);
        // 0xe9 alone is not UTF-8: the windows-1252 e-acute
        expect(decodeEntryName(new Uint8Array([0x63, 0x61, 0x66, 0xe9]))).toBe(`caf${String.fromCharCode(0xe9)}`);
        // 0x80 is the euro sign in windows-1252, not a C1 control
        expect(decodeEntryName(new Uint8Array([0x80]))).toBe(String.fromCharCode(0x20ac));
        expect(decodeEntryName(new Uint8Array(0))).toBe("");
    });
});
