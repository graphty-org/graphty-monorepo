/**
 * Shared helpers of the robustness suite: byte builders, failure capture, code lists and a sink
 * that refuses to grow.
 */

import { GraphBuilder, GraphFormatError } from "@graphty/graph-format";

import { ImportError, type ImportReport } from "../../src/types.js";

const encoder = new TextEncoder();

/**
 * Bytes from parts: a string is UTF-8 encoded, an array is taken as raw bytes.
 * @param parts - the parts in order
 * @returns the concatenated bytes
 */
export function bytesOf(...parts: (string | readonly number[] | Uint8Array)[]): Uint8Array {
    const arrays = parts.map((p) => (typeof p === "string" ? encoder.encode(p) : Uint8Array.from(p)));
    const out = new Uint8Array(arrays.reduce((n, a) => n + a.byteLength, 0));
    let at = 0;
    for (const a of arrays) {
        out.set(a, at);
        at += a.byteLength;
    }
    return out;
}

/**
 * ASCII text as UTF-16 code units, with or without a byte order mark.
 * @param text - the text (any BMP characters)
 * @param littleEndian - the byte order
 * @param bom - whether to write the mark first
 * @returns the bytes
 */
export function utf16(text: string, littleEndian: boolean, bom: boolean): Uint8Array {
    const start = bom ? 2 : 0;
    const out = new Uint8Array(start + text.length * 2);
    const view = new DataView(out.buffer);
    if (bom) {
        view.setUint16(0, 0xfeff, littleEndian);
    }
    for (let i = 0; i < text.length; i++) {
        view.setUint16(start + i * 2, text.charCodeAt(i), littleEndian);
    }
    return out;
}

/**
 * The ImportError a promise rejects with; any other outcome fails the test.
 * @param promise - the import
 * @returns the error
 */
export async function importFailure(promise: Promise<unknown>): Promise<ImportError> {
    try {
        await promise;
    } catch (err) {
        if (err instanceof ImportError) {
            return err;
        }
        throw err;
    }
    throw new Error("the import resolved; an ImportError was expected");
}

/**
 * The value a promise rejects with; resolving fails the test.
 * @param promise - the operation
 * @returns the rejection
 */
export async function rejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (err) {
        return err;
    }
    throw new Error("the promise resolved; a rejection was expected");
}

/**
 * The issue codes of a report, in order.
 * @param report - the report
 * @returns the codes
 */
export function codes(report: ImportReport): string[] {
    return report.issues.map((i) => i.code);
}

/**
 * A builder that throws GraphFormatError E_TOO_LARGE once it holds `limit` nodes, as a sink with a
 * capacity does.
 * @param limit - the most nodes it takes
 * @returns the sink
 */
export function cappedSink(limit: number): GraphBuilder {
    const sink = new GraphBuilder({ directed: true, weightDtype: "f64" });
    const addNode = sink.addNode.bind(sink);
    sink.addNode = (...args: Parameters<GraphBuilder["addNode"]>): ReturnType<GraphBuilder["addNode"]> => {
        if (sink.indexOf(args[0]) < 0 && sink.nodeCount >= limit) {
            throw new GraphFormatError("E_TOO_LARGE", `the sink holds at most ${limit} nodes`);
        }
        return addNode(...args);
    };
    const addEdge = sink.addEdge.bind(sink);
    sink.addEdge = (...args: Parameters<GraphBuilder["addEdge"]>): ReturnType<GraphBuilder["addEdge"]> => {
        const fresh = new Set([args[0], args[1]].filter((id) => sink.indexOf(id) < 0)).size;
        if (sink.nodeCount + fresh > limit) {
            throw new GraphFormatError("E_TOO_LARGE", `the sink holds at most ${limit} nodes`);
        }
        return addEdge(...args);
    };
    return sink;
}

/**
 * A ReadableStream that delivers the given chunks and then never delivers again nor closes (a
 * stalled network body), recording how it was cancelled.
 * @param chunks - the chunks delivered first
 * @returns the stream and its cancellation record
 */
export function stalledStream(chunks: readonly Uint8Array[]): {
    stream: ReadableStream<Uint8Array>;
    cancelled: { reason: unknown; called: boolean };
} {
    const cancelled = { reason: undefined as unknown, called: false };
    let next = 0;
    const stream = new ReadableStream<Uint8Array>({
        pull(controller): Promise<void> | void {
            if (next < chunks.length) {
                controller.enqueue(chunks[next++]);
                return undefined;
            }
            return new Promise<void>(() => undefined);
        },
        cancel(reason: unknown): void {
            cancelled.called = true;
            cancelled.reason = reason;
        },
    });
    return { stream, cancelled };
}
