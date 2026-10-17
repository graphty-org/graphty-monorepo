// Characterization test for textChunks(): pins, for every input shape, the exact chunks it yields,
// the progress calls, the issues recorded and the error thrown, so a refactor cannot change them.
import { describe, expect, it } from "vitest";

import { type ReadOptions, textChunks } from "../../src/common/input.js";
import { ImportReportBuilder } from "../../src/common/report.js";
import type { ImportInput } from "../../src/types.js";
import { byteChunks, byteStream, textChunksOf } from "../helpers/corpus.js";

const encoder = new TextEncoder();
const SLICE = 256 * 1024;
const BOM = "﻿";
const EMOJI = String.fromCodePoint(0x1f600);
const E_ACUTE = String.fromCharCode(0xe9);

interface Outcome {
    chunks: string[];
    progress: (number | undefined)[][];
    issues: string[];
    error: string | null;
}

/** Shorten a long chunk to its length and ends, so the snapshot stays readable. */
function show(chunk: string): string {
    const text =
        chunk.length > 64 ? `[${chunk.length}] ${quote(chunk.slice(0, 8))}...${quote(chunk.slice(-8))}` : quote(chunk);
    return text;
}

/** JSON-quote text with every non-ASCII code unit escaped, so the snapshot file stays ASCII. */
function quote(text: string): string {
    return JSON.stringify(text).replaceAll(
        /[^\x20-\x7e]/g,
        (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
    );
}

async function run(makeInput: () => unknown, options: Partial<ReadOptions> = {}): Promise<Outcome> {
    const report = new ImportReportBuilder("test", 100);
    const progress: (number | undefined)[][] = [];
    const chunks: string[] = [];
    let error: string | null = null;
    try {
        const all = {
            ...options,
            onProgress: (done: number, total?: number): void => void progress.push([done, total]),
        };
        for await (const chunk of textChunks(makeInput() as ImportInput, report, all)) {
            chunks.push(show(chunk));
        }
    } catch (err) {
        const e = err as { name?: string; code?: string; message?: string };
        error = `${e.name}: ${e.code ?? ""}: ${e.message}`;
    }
    const issues = report.issues.map((i) => quote(`${i.severity} ${i.code} ${i.message}`));
    return { chunks, progress: progress.length > 20 ? [[progress.length]] : progress, issues, error };
}

async function* mixed(...parts: unknown[]): AsyncGenerator<unknown, void, undefined> {
    for (const part of parts) {
        yield part;
        await Promise.resolve();
    }
}

const TEXTS: Record<string, string> = {
    empty: "",
    whitespace: " \n\t ",
    plain: "a,b\nc,d\n",
    bom: `${BOM}x`,
    twoBoms: `${BOM}${BOM}x`,
    onlyBom: BOM,
    ctrlZEnd: "abc\u001a",
    ctrlZMiddle: "a\u001ab",
    control: "ab\u0001cd",
    multibyte: `caf${E_ACUTE} ${EMOJI} end`,
    foreignZip: "PK\u0003\u0004rest",
    large: "a".repeat(SLICE - 1) + EMOJI + "b".repeat(SLICE + 5),
};

describe("textChunks golden", () => {
    for (const [name, text] of Object.entries(TEXTS)) {
        const bytes = encoder.encode(text);
        it(`string: ${name}`, async () => {
            expect(await run(() => text)).toMatchSnapshot();
        });
        it(`bytes: ${name}`, async () => {
            expect(await run(() => bytes)).toMatchSnapshot();
        });
        it(`stream of 1-byte chunks: ${name}`, async () => {
            expect(
                await run(() => (bytes.byteLength > 1000 ? byteStream(bytes, 4096) : byteStream(bytes, 1))),
            ).toMatchSnapshot();
        });
        it(`iterable of 3-byte chunks: ${name}`, async () => {
            expect(await run(() => byteChunks(bytes, bytes.byteLength > 1000 ? 70000 : 3))).toMatchSnapshot();
        });
        it(`iterable of 2-char strings: ${name}`, async () => {
            expect(await run(() => textChunksOf(text, text.length > 1000 ? 100000 : 2))).toMatchSnapshot();
        });
    }

    it("string with an encoding option", async () => {
        expect(await run(() => "x", { encoding: "utf-8" })).toMatchSnapshot();
    });

    it("latin-1 bytes in every shape", async () => {
        const latin = new Uint8Array([0x63, 0x61, 0x66, 0xe9, 0x0a, 0x62]);
        expect(await run(() => latin)).toMatchSnapshot();
        expect(await run(() => byteStream(latin, 2))).toMatchSnapshot();
        expect(await run(() => byteChunks(latin, 1))).toMatchSnapshot();
    });

    it("invalid UTF-8 when UTF-8 is required", async () => {
        const bad = new Uint8Array([0x61, 0xff, 0x62]);
        expect(await run(() => bad, { encoding: "utf-8" })).toMatchSnapshot();
        expect(await run(() => byteStream(bad, 1), { encoding: "utf-8" })).toMatchSnapshot();
    });

    it("declared encoding read from a head split across small chunks", async () => {
        const declaredEncoding = (head: string): string | null => /enc=(\S+)/.exec(head)?.[1] ?? null;
        const latin = new Uint8Array([...encoder.encode("enc=iso-8859-1 "), 0xe9]);
        expect(await run(() => byteStream(latin, 2), { declaredEncoding })).toMatchSnapshot();
        expect(await run(() => byteChunks(latin, 3), { declaredEncoding, declarationBytes: 8 })).toMatchSnapshot();
        expect(await run(() => latin, { declaredEncoding })).toMatchSnapshot();
    });

    it("bytes and strings mixed in one iterable", async () => {
        const cut = encoder.encode(EMOJI);
        expect(await run(() => mixed(encoder.encode("ab"), "cd", encoder.encode("ef")))).toMatchSnapshot();
        expect(await run(() => mixed("ab", encoder.encode(`c${E_ACUTE}`), "d"))).toMatchSnapshot();
        expect(await run(() => mixed(encoder.encode(BOM), "x"))).toMatchSnapshot();
        expect(await run(() => mixed(encoder.encode("abcdef"), cut.subarray(0, 2), "x"))).toMatchSnapshot();
        expect(await run(() => mixed(cut.subarray(0, 2), "x"))).toMatchSnapshot();
        expect(await run(() => mixed("x", encoder.encode(BOM), "y"))).toMatchSnapshot();
        expect(await run(() => mixed())).toMatchSnapshot();
        expect(await run(() => mixed("", ""))).toMatchSnapshot();
    });

    it("a chunk that is neither a string nor bytes", async () => {
        expect(await run(() => mixed("ab", 42))).toMatchSnapshot();
        expect(await run(() => mixed(new Uint16Array(2)))).toMatchSnapshot();
    });

    it("an input that is not an import input", async () => {
        expect(await run(() => new ArrayBuffer(4))).toMatchSnapshot();
        expect(await run(() => null)).toMatchSnapshot();
    });

    it("an already-aborted signal, in every shape", async () => {
        const signal = AbortSignal.abort(new Error("stop"));
        for (const make of [
            () => "abc",
            () => encoder.encode("abc"),
            () => byteStream(encoder.encode("abc"), 1),
            () => mixed("abc"),
        ]) {
            expect(await run(make, { signal })).toMatchSnapshot();
        }
    });

    it("a signal aborted between chunks", async () => {
        const controller = new AbortController();
        async function* thenAbort(): AsyncGenerator<string, void, undefined> {
            yield "ab";
            await Promise.resolve();
            controller.abort(new Error("later"));
            yield "cd";
        }
        expect(await run(() => thenAbort(), { signal: controller.signal })).toMatchSnapshot();
    });

    it("allowEmpty accepts empty input in every shape", async () => {
        for (const make of [() => "", () => new Uint8Array(0), () => byteStream(new Uint8Array(0), 1), () => mixed()]) {
            expect(await run(make, { allowEmpty: true })).toMatchSnapshot();
        }
    });
});
