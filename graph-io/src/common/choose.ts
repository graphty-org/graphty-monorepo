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
    const replay = await replayable(input);
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
 * The input as a string or bytes that can be read twice.
 * @param input - the input
 * @returns the same text or bytes, or the stream's bytes
 */
async function replayable(input: ImportInput): Promise<string | Uint8Array> {
    if (typeof input === "string" || input instanceof Uint8Array) {
        return input;
    }
    const parts: Uint8Array[] = [];
    const encoder = new TextEncoder();
    if (typeof (input as ReadableStream<Uint8Array>).getReader === "function") {
        const reader = (input as ReadableStream<Uint8Array>).getReader();
        for (let r = await reader.read(); !r.done; r = await reader.read()) {
            parts.push(r.value);
        }
    } else {
        for await (const chunk of input as AsyncIterable<string | Uint8Array>) {
            parts.push(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
        }
    }
    const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.byteLength;
    }
    return out;
}
