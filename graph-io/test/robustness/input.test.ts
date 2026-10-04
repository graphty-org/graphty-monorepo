/**
 * Robustness of the shared input layer (src/common/input.ts) that every text importer reads
 * through: byte order marks, BOM-less UTF-16, the windows-1252 fallback and its limits, binary
 * data, truncation, control characters, the input shapes a caller may pass by mistake, streams
 * that stall or error, cancellation and progress. The CSV importer stands in for every format.
 */

import { Readable } from "node:stream";
import { runInNewContext } from "node:vm";

import { GraphBuilder, GraphFormatError } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { LineReader } from "../../src/common/input.js";
import { ImportReportBuilder, isAbortError } from "../../src/common/report.js";
import { csvImporter } from "../../src/formats/csv/index.js";
import { importGraph } from "../../src/registry.js";
import { type ImportInput } from "../../src/types.js";
import { byteChunks } from "../helpers/corpus.js";
import { bytesOf, codes, importFailure, rejection, stalledStream, utf16 } from "./helpers.js";

const E_ACUTE = String.fromCharCode(0xe9);
const EDGES = "source,target\na,b\nb,c\n";

/** Import CSV through the registry with the format named. */
async function csv(input: ImportInput, options: Record<string, unknown> = {}): ReturnType<typeof importGraph> {
    return importGraph(input, { format: "csv", ...options });
}

function ids(snapshot: { ids: { toArray(): unknown[] } }): unknown[] {
    return snapshot.ids.toArray();
}

describe("robustness: byte order marks and BOM-less UTF-16", () => {
    it("refuses BOM-less UTF-16LE with E_INVALID_ENCODING naming the option, by name or with no hints; the option reads it", async () => {
        const bytes = utf16(EDGES, true, false);
        for (const options of [{ filename: "g.csv" }, { format: "csv" }]) {
            const err = await importFailure(importGraph(bytes, options));
            expect(codes(err.report)).toEqual(["E_INVALID_ENCODING"]);
            expect(err.message).toContain("utf-16le");
            expect(err.message).toContain("encoding option");
            expect(err.details.byteOffset).toBe(0);
        }
        const { snapshot, report } = await csv(bytes, { encoding: "utf-16le" });
        expect(ids(snapshot)).toEqual(["a", "b", "c"]);
        expect(snapshot.edgeCount).toBe(2);
        expect(report.issues).toEqual([]);
    });

    it("never imports BOM-less UTF-16 with no hints at all: no format claims it, or the decoder refuses it", async () => {
        const err = await importFailure(importGraph(utf16(EDGES, true, false)));
        expect(["E_UNKNOWN_FORMAT", "E_INVALID_ENCODING"]).toContain(err.details.code);
    });

    it("refuses a UTF-32LE byte order mark (FF FE 00 00) instead of reading it as UTF-16LE", async () => {
        const body = new Uint8Array(4 * EDGES.length);
        const view = new DataView(body.buffer);
        for (let i = 0; i < EDGES.length; i++) {
            view.setUint32(4 * i, EDGES.charCodeAt(i), true);
        }
        const err = await importFailure(importGraph(bytesOf([0xff, 0xfe, 0x00, 0x00], body), { filename: "g.csv" }));
        expect(codes(err.report)).toEqual(["E_INVALID_ENCODING"]);
        expect(err.message).toContain("UTF-32LE");
    });

    it("refuses a UTF-32BE byte order mark (00 00 FE FF) instead of reading NUL-filled UTF-8", async () => {
        const body = new Uint8Array(4 * EDGES.length);
        const view = new DataView(body.buffer);
        for (let i = 0; i < EDGES.length; i++) {
            view.setUint32(4 * i, EDGES.charCodeAt(i), false);
        }
        const err = await importFailure(csv(bytesOf([0x00, 0x00, 0xfe, 0xff], body)));
        expect(codes(err.report)).toEqual(["E_INVALID_ENCODING"]);
        expect(err.message).toContain("UTF-32BE");
    });

    it("lets a UTF-8 BOM win over a contradicting encoding option, warning, so the BOM never becomes header text", async () => {
        const bytes = bytesOf([0xef, 0xbb, 0xbf], `source,target\ncaf${E_ACUTE},b\n`);
        const { snapshot, report } = await csv(bytes, { encoding: "windows-1252" });
        expect(codes(report)).toEqual(["W_ENCODING_CONFLICT"]);
        expect(report.issues[0].message).toContain("byte order mark says utf-8");
        expect(ids(snapshot)).toEqual([`caf${E_ACUTE}`, "b"]);
    });

    it("lets a UTF-16LE BOM win over encoding utf-16be with a warning, never a U+FFFE id", async () => {
        const { snapshot, report } = await csv(utf16(EDGES, true, true), { encoding: "utf-16be" });
        expect(codes(report)).toEqual(["W_ENCODING_CONFLICT"]);
        expect(ids(snapshot)).toEqual(["a", "b", "c"]);
    });

    it("strips a doubled UTF-8 BOM (a tool that prepends one to a file that has one)", async () => {
        const { snapshot, report } = await csv(bytesOf([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf], EDGES));
        expect(report.issues).toEqual([]);
        expect(ids(snapshot)).toEqual(["a", "b", "c"]);
    });
});

describe("robustness: invalid UTF-8, binary data and truncation", () => {
    it("names the exact byte of invalid UTF-8 after valid UTF-8, also beyond the first 256 KiB", async () => {
        const head = `source,target\ncaf${E_ACUTE},x\n`;
        const small = bytesOf(head, "a,", [0xe9], "\n");
        const at = new TextEncoder().encode(head).byteLength + 2;
        let err = await importFailure(csv(small));
        expect(codes(err.report)).toEqual(["E_INVALID_UTF8"]);
        expect(err.details.byteOffset).toBe(at);
        expect(err.message).toContain(`at byte ${at}`);
        const filler = "x,y\n".repeat(80_000);
        const big = bytesOf("source,target\n", filler, `caf${E_ACUTE},z\n`, "a,", [0xe9], "\n");
        const farAt = big.byteLength - 2;
        err = await importFailure(csv(big));
        expect(err.details.byteOffset).toBe(farAt);
    });

    it("reports binary data (a C0 control byte, no NUL needed) as E_INVALID_UTF8 naming the byte, not as windows-1252", async () => {
        const bytes = bytesOf("source,target\na,b", [0x01, 0x02, 0x80, 0x81], "\n");
        const err = await importFailure(csv(bytes));
        expect(codes(err.report)).toEqual(["E_INVALID_UTF8"]);
        expect(err.message).toContain("binary data");
        expect(err.details.byteOffset).toBe(17);
    });

    it("reports a stray NUL after Latin-1 text as binary data at its real offset (the message claimed valid UTF-8 at byte 0)", async () => {
        const bytes = bytesOf("source,target\ncaf", [0xe9], ",b\nc,d", [0x00], "\n");
        const err = await importFailure(csv(bytes));
        expect(codes(err.report)).toEqual(["E_INVALID_UTF8"]);
        expect(err.message).toContain("control byte 0x00");
        expect(err.details.byteOffset).toBe(bytes.byteLength - 2);
    });

    it("treats a UTF-8 sequence cut at the end of undeclared input as truncation, in every input shape", async () => {
        const bytes = bytesOf("source,target\na,b", [0xf0, 0x9f, 0x98]);
        for (const input of [bytes, byteChunks(bytes, 1)]) {
            const err = await importFailure(csv(input));
            expect(codes(err.report)).toEqual(["E_INVALID_UTF8"]);
            expect(err.message).toContain("middle of a UTF-8 sequence");
            expect(err.details.byteOffset).toBe(17);
        }
    });

    it("still reads Latin-1 that ends in one high byte as windows-1252 (not truncation)", async () => {
        const { snapshot, report } = await csv(bytesOf("source,target\nb,caf", [0xe9]));
        expect(codes(report)).toEqual(["W_ENCODING_FALLBACK"]);
        expect(ids(snapshot)).toEqual(["b", `caf${E_ACUTE}`]);
    });

    it("says a UTF-16 file of odd length is truncated", async () => {
        const bytes = utf16(EDGES, true, true);
        const err = await importFailure(csv(bytes.subarray(0, bytes.byteLength - 1)));
        expect(codes(err.report)).toEqual(["E_INVALID_ENCODING"]);
        expect(err.message).toContain("half a utf-16le code unit");
    });

    it("falls back once after more than 256 KiB of ASCII and keeps every row", async () => {
        const rows = 70_000;
        let text = "source,target\n";
        for (let i = 0; i < rows; i++) {
            text += `n${i},m${i}\n`;
        }
        const bytes = bytesOf(text, "caf", [0xe9], ",end\n");
        expect(bytes.byteLength).toBeGreaterThan(256 * 1024);
        const { snapshot, report } = await csv(bytes);
        expect(codes(report)).toEqual(["W_ENCODING_FALLBACK"]);
        expect(snapshot.edgeCount).toBe(rows + 1);
        expect(snapshot.nodeCount).toBe(2 * rows + 2);
        const all = ids(snapshot);
        expect(all[0]).toBe("n0");
        expect(all.at(-2)).toBe(`caf${E_ACUTE}`);
    });

    it("reports the C1 control a windows-1252-undefined byte (0x81) decodes to", async () => {
        const { snapshot, report } = await csv(bytesOf("source,target\nx", [0x81], ",b\n"));
        expect(codes(report)).toEqual(["W_ENCODING_FALLBACK", "W_CONTROL_CHARACTER"]);
        expect(report.issues[1].element).toBe("U+0081");
        expect(ids(snapshot)).toEqual([`x${String.fromCharCode(0x81)}`, "b"]);
    });
});

describe("robustness: what the decoded text holds", () => {
    it("warns about a U+FEFF inside the text (two files concatenated); the id keeps it", async () => {
        const bom = String.fromCharCode(0xfeff);
        const { snapshot, report } = await csv(`source,target\n${bom}a,b\na,c\n`);
        expect(codes(report)).toEqual(["W_CONTROL_CHARACTER"]);
        expect(report.issues[0].element).toBe("U+FEFF");
        expect(ids(snapshot)).toEqual([`${bom}a`, "b", "a", "c"]);
    });

    it("drops a trailing Ctrl-Z end-of-file marker with a warning; the last id stays intact", async () => {
        const sub = String.fromCharCode(0x1a);
        for (const input of [`${EDGES}${sub}`, bytesOf(EDGES, [0x1a]), byteChunks(bytesOf(EDGES, [0x1a]), 1)]) {
            const { snapshot, report } = await csv(input);
            expect(codes(report)).toEqual(["W_CONTROL_CHARACTER"]);
            expect(report.issues[0].message).toContain("Ctrl-Z");
            expect(ids(snapshot)).toEqual(["a", "b", "c"]);
        }
    });

    it("never splits a line at U+2028, U+2029 or NEL: only CR and LF end a line", async () => {
        const seps = [0x2028, 0x2029, 0x85].map((c) => String.fromCharCode(c));
        const reader = new LineReader(`a${seps[0]}b${seps[1]}c\nd${seps[2]}e`, new ImportReportBuilder("test", 10));
        const lines: string[] = [];
        for await (const line of reader) {
            lines.push(line);
        }
        expect(lines).toEqual([`a${seps[0]}b${seps[1]}c`, `d${seps[2]}e`]);
    });

    it("reports an encoding option given with text input as ignored", async () => {
        const { snapshot, report } = await csv(EDGES, { encoding: "utf-16le" });
        expect(codes(report)).toEqual(["W_OPTION_IGNORED"]);
        expect(report.issues[0].element).toBe("encoding");
        expect(ids(snapshot)).toEqual(["a", "b", "c"]);
    });

    it("decodes bytes that follow a text chunk as data, never as a BOM", async () => {
        async function* mixed(): AsyncGenerator<string | Uint8Array> {
            yield "source,target\n";
            yield new Uint8Array([0xff, 0xfe, 0x2c, 0x62, 0x0a]);
            await Promise.resolve();
        }
        const { snapshot, report } = await csv(mixed());
        expect(codes(report)).toEqual(["W_ENCODING_FALLBACK"]);
        expect(ids(snapshot)).toEqual([String.fromCharCode(0xff, 0xfe), "b"]);
    });
});

describe("robustness: input shapes a caller may pass by mistake", () => {
    async function unsupported(input: unknown): Promise<GraphFormatError> {
        const err = await rejection(importGraph(input as ImportInput, { format: "csv" }));
        expect(err).toBeInstanceOf(GraphFormatError);
        expect((err as GraphFormatError).code).toBe("E_UNSUPPORTED");
        return err as GraphFormatError;
    }

    it("names an ArrayBuffer, a Blob, a fetch Response, null and other typed arrays, with the fix", async () => {
        expect((await unsupported(new ArrayBuffer(4))).message).toContain("new Uint8Array(buffer)");
        expect((await unsupported(new Blob([EDGES]))).message).toContain("blob.stream()");
        expect((await unsupported(new Response(EDGES))).message).toContain("response.body");
        expect((await unsupported(null)).message).toContain("the input is null");
        expect((await unsupported(undefined)).message).toContain("the input is undefined");
        expect((await unsupported(new Int8Array(4))).message).toContain("Int8Array");
        expect((await unsupported(new DataView(new ArrayBuffer(4)))).message).toContain("DataView");
        // the same through the importer, with no registry in between
        const err = await rejection(csvImporter.import(null as unknown as ImportInput, new GraphBuilder({ directed: true })));
        expect((err as GraphFormatError).code).toBe("E_UNSUPPORTED");
        // and when the registry has to sniff
        expect(await rejection(importGraph(new ArrayBuffer(2) as unknown as ImportInput))).toBeInstanceOf(GraphFormatError);
    });

    it("accepts a Uint8Array from another realm as the whole input", async () => {
        const foreign = runInNewContext("new Uint8Array(bytes)", { bytes: [...new TextEncoder().encode(EDGES)] }) as Uint8Array;
        expect(foreign instanceof Uint8Array).toBe(false);
        const { snapshot } = await csv(foreign);
        expect(ids(snapshot)).toEqual(["a", "b", "c"]);
        const sniffed = await importGraph(foreign);
        expect(sniffed.format).toBe("csv");
    });

    it("reads a Node.js Readable of Buffers", async () => {
        const buffers = [Buffer.from("source,tar"), Buffer.from("get\na,b\n")];
        const { snapshot } = await importGraph(Readable.from(buffers), { filename: "g.csv" });
        expect(ids(snapshot)).toEqual(["a", "b"]);
    });

    it("refuses a locked stream with E_UNSUPPORTED before reading anything", async () => {
        const stream = new Blob([EDGES]).stream();
        const reader = stream.getReader();
        for (const options of [{ format: "csv" }, {}]) {
            const err = await rejection(importGraph(stream, options));
            expect(err).toBeInstanceOf(GraphFormatError);
            expect((err as GraphFormatError).message).toContain("locked");
        }
        reader.releaseLock();
    });

    it("reports a stream read a second time as an empty input", async () => {
        const stream = new Blob([EDGES]).stream();
        await csv(stream);
        const err = await importFailure(csv(stream));
        expect(codes(err.report)).toEqual(["E_EMPTY_INPUT"]);
    });

    it("decodes a view of shared memory from a private copy", async () => {
        const encoded = new TextEncoder().encode(EDGES);
        const shared = new Uint8Array(new SharedArrayBuffer(encoded.byteLength));
        shared.set(encoded);
        const { snapshot } = await csv(shared);
        expect(ids(snapshot)).toEqual(["a", "b", "c"]);
    });

    it("refuses a buffer detached during the import instead of reading it as ended", async () => {
        const text = `source,target\n${"x,y\n".repeat(100_000)}`;
        const bytes = new TextEncoder().encode(text);
        const err = await rejection(
            csv(bytes, {
                onProgress: (): void => {
                    if (bytes.byteLength > 0) {
                        structuredClone(bytes.buffer, { transfer: [bytes.buffer] });
                    }
                },
            }),
        );
        expect(err).toBeInstanceOf(GraphFormatError);
        expect((err as GraphFormatError).message).toContain("detached");
    });
});

describe("robustness: streams that stall or fail, and cancellation", () => {
    it("rejects promptly with the reason when the signal fires during a stalled read, and cancels the stream", async () => {
        for (const options of [{ format: "csv" }, { filename: "g.csv" }, {}]) {
            const { stream, cancelled } = stalledStream([new TextEncoder().encode("source,target\na,b\n")]);
            const controller = new AbortController();
            const reason = new Error("user stopped");
            setTimeout(() => controller.abort(reason), 20);
            const err = await rejection(importGraph(stream, { ...options, signal: controller.signal }));
            expect(err).toBe(reason);
            expect(cancelled.called).toBe(true);
            expect(cancelled.reason).toBe(reason);
            expect(stream.locked).toBe(false);
        }
    });

    it("rejects with the TimeoutError of AbortSignal.timeout(), which isAbortError recognises", async () => {
        const { stream } = stalledStream([]);
        const err = await rejection(importGraph(stream, { format: "csv", signal: AbortSignal.timeout(10) }));
        expect((err as Error).name).toBe("TimeoutError");
        expect(isAbortError(err)).toBe(true);
    });

    it("releases the reader when the stream errors before the head is read", async () => {
        const failure = new Error("network down");
        const stream = new ReadableStream<Uint8Array>({
            pull(controller): void {
                controller.error(failure);
            },
        });
        expect(await rejection(importGraph(stream))).toBe(failure);
        expect(stream.locked).toBe(false);
    });

    it("passes the abort reason to a sniffed stream's cancel", async () => {
        let pulls = 0;
        let cancelReason: unknown = "not cancelled";
        const stream = new ReadableStream<Uint8Array>({
            pull(controller): void {
                pulls++;
                controller.enqueue(new TextEncoder().encode(pulls === 1 ? "source,target\n" : `a${pulls},b\n`));
            },
            cancel(reason: unknown): void {
                cancelReason = reason;
            },
        });
        const controller = new AbortController();
        const stop = new Error("stop");
        let calls = 0;
        const err = await rejection(
            importGraph(stream, {
                filename: "g.csv",
                signal: controller.signal,
                onProgress: (): void => {
                    if (++calls === 3) {
                        controller.abort(stop);
                    }
                },
            }),
        );
        expect(err).toBe(stop);
        expect(cancelReason).toBe(stop);
        expect(stream.locked).toBe(false);
    });

    it("lets an onProgress that throws propagate unchanged, cancelling and unlocking the stream", async () => {
        const boom = new Error("progress bar broke");
        const { stream, cancelled } = stalledStream([new TextEncoder().encode(EDGES)]);
        const err = await rejection(
            csv(stream, {
                onProgress: (): void => {
                    throw boom;
                },
            }),
        );
        expect(err).toBe(boom);
        expect(cancelled.called).toBe(true);
        expect(stream.locked).toBe(false);
    });
});

describe("robustness: progress", () => {
    it("reports a large string in steps, in UTF-8 bytes, ending at (total, total)", async () => {
        const text = `source,target\n${`caf${E_ACUTE},b\n`.repeat(200_000)}`;
        const total = new TextEncoder().encode(text).byteLength;
        const calls: [number, number | undefined][] = [];
        await csv(text, { onProgress: (done: number, all?: number): void => void calls.push([done, all]) });
        expect(calls.length).toBeGreaterThan(3);
        expect(calls.at(-1)).toEqual([total, total]);
        for (let i = 1; i < calls.length; i++) {
            expect(calls[i][0]).toBeGreaterThan(calls[i - 1][0]);
            expect(calls[i][1]).toBe(total);
        }
    });

    it("counts text chunks and byte chunks of one iterable in the same unit (bytes)", async () => {
        async function* mixed(): AsyncGenerator<string | Uint8Array> {
            yield `source,target\ncaf${E_ACUTE},b\n`;
            yield new TextEncoder().encode("x,y\n");
            await Promise.resolve();
        }
        const calls: [number, number | undefined][] = [];
        await csv(mixed(), { onProgress: (done: number, all?: number): void => void calls.push([done, all]) });
        expect(calls).toEqual([
            [22, undefined],
            [26, undefined],
            [26, 26],
        ]);
    });
});
