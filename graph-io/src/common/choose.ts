/**
 * The graph choice of an importer that can read every graph of a file (importAll) but has no cheap
 * listing: `graphIndex` / `graphName` passed to its import() directly, as the registry would honor
 * them, so a caller with its own builder is not silently given the first graph.
 */

import { GraphBuilder, type GraphSink } from "@graphty/graph-format";

import {
    type CommonImportOptions,
    type GraphChoiceOptions,
    type GraphImporter,
    type ImportInput,
    type ImportReport,
} from "../types.js";
import { isReadableStream, normalizeInput, streamChunks, throwIfAborted } from "./input.js";
import { chooseGraph } from "./options.js";
import { ImportReportBuilder } from "./report.js";

/**
 * Read the graph `graphIndex` or `graphName` chooses into the sink: every graph is read once into a
 * scratch builder to learn the names (E_GRAPH_NOT_FOUND lists them), then the input again with the
 * chosen graph going to the sink.
 * @param importer - the importer, which has importAll()
 * @param input - the input
 * @param sink - the caller's sink
 * @param options - the import options, with the choice
 * @returns the chosen graph's report
 */
export async function importChosenGraph<O>(
    importer: GraphImporter<O>,
    input: ImportInput,
    sink: GraphSink,
    options: (O & CommonImportOptions & GraphChoiceOptions) | undefined,
): Promise<ImportReport> {
    const importAll = importer.importAll?.bind(importer);
    if (importAll === undefined) {
        return importer.import(input, sink, options);
    }
    const replay = await replayable(normalizeInput(input), options?.signal ?? null);
    const scratch: GraphBuilder[] = [];
    await importAll(replay, (i) => (scratch[i] = new GraphBuilder({ directed: false })), {
        ...options,
        onProgress: undefined,
    } as O & CommonImportOptions);
    const names = scratch.map((b) => {
        try {
            return b.freeze().meta.name;
        } catch {
            return null;
        }
    });
    const chosen = chooseGraph(names, options, new ImportReportBuilder(importer.format, 0));
    const reports = await importAll(
        replay,
        (i) => (i === chosen ? sink : new GraphBuilder({ directed: false })),
        options,
    );
    return reports[chosen];
}

/**
 * The input in a form that can be read twice: a string or bytes as they are, a stream or async
 * iterable as its chunks, replayed unchanged so the importer decodes them exactly as it would the
 * original (text chunks stay text). The signal is checked before every chunk and a stream is
 * canceled when the read stops early.
 * @param input - the input, normalized
 * @param signal - the cancellation signal, or null
 * @returns the string, the bytes, or an async iterable of the same chunks
 */
async function replayable(
    input: ImportInput,
    signal: AbortSignal | null,
): Promise<string | Uint8Array | AsyncIterable<string | Uint8Array>> {
    throwIfAborted(signal);
    if (typeof input === "string" || input instanceof Uint8Array) {
        return input;
    }
    const chunks: (string | Uint8Array)[] = [];
    for await (const chunk of isReadableStream(input) ? streamChunks(input, signal) : input) {
        throwIfAborted(signal);
        chunks.push(chunk);
    }
    return {
        [Symbol.asyncIterator](): AsyncIterator<string | Uint8Array> {
            let position = 0;
            return {
                next: (): Promise<IteratorResult<string | Uint8Array>> =>
                    Promise.resolve(
                        position < chunks.length
                            ? { done: false, value: chunks[position++] }
                            : { done: true, value: undefined },
                    ),
            };
        },
    };
}
