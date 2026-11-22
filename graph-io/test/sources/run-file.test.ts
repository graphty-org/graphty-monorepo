/**
 * The file path: a body read by the format importers, streamed, gunzipped, unzipped, detected or
 * named, with byte progress, into a builder or a caller's sink.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { writeZip } from "../../src/common/zip.js";
import { createRegistry, defineSource, GraphBuilder, loadFromSource, replayFetch } from "../../src/index.js";
import { rejection } from "./helpers.js";

const GML = readFileSync(new URL("../../docs/samples/got.gml", import.meta.url), "utf8");
const API = "https://files.example.com";

/**
 * A file source that downloads one path.
 * @param path - the path
 * @param extra - format, filename and MIME type hints
 * @returns the source
 */
function download(path: string, extra: { format?: string; filename?: string; mimeType?: string } = {}) {
    return defineSource({
        id: "download",
        async file(_params: Record<string, never>, ctx) {
            return { body: await ctx.fetch(path), ...extra };
        },
    });
}

/**
 * Gzip some text.
 * @param text - the text
 * @returns the gzipped bytes
 */
async function gzip(text: string): Promise<Uint8Array> {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

describe("file sources", () => {
    it("streams a named format through its importer and counts bytes", async () => {
        const progress: string[] = [];
        const fetch = replayFetch([{ url: `${API}/got.gml`, body: GML }]);
        const { snapshot, format, report } = await loadFromSource(
            download("/got.gml", { format: "gml" }),
            {},
            {
                endpoint: API,
                fetch,
                onProgress: (_d, _t, unit) => progress.push(String(unit)),
            },
        );
        expect(format).toBe("gml");
        expect(snapshot.nodeCount).toBeGreaterThan(10);
        expect(report.source).toMatchObject({
            id: "download",
            requests: 1,
            bytes: new TextEncoder().encode(GML).length,
        });
        expect(new Set(progress)).toEqual(new Set(["bytes"]));
    });

    it("detects the format from the file name and the content", async () => {
        const fetch = replayFetch([{ url: `${API}/x`, body: GML }]);
        const { format } = await loadFromSource(download("/x", { filename: "got.gml" }), {}, { endpoint: API, fetch });
        expect(format).toBe("gml");
    });

    it("gunzips a .gz file", async () => {
        const bytes = await gzip(GML);
        const fetch = (): Promise<Response> => Promise.resolve(new Response(bytes as Uint8Array<ArrayBuffer>));
        const { format, snapshot } = await loadFromSource(
            download("/got.gml.gz", { filename: "got.gml.gz" }),
            {},
            { endpoint: API, fetch },
        );
        expect([format, snapshot.nodeCount > 10]).toEqual(["gml", true]);
    });

    it("reads the graph file inside a .zip", async () => {
        const parts = [
            ...writeZip([
                { name: "readme.txt", data: new TextEncoder().encode("hi") },
                { name: "got.gml", data: new TextEncoder().encode(GML) },
            ]),
        ];
        const zip = new Uint8Array(await new Blob(parts as BlobPart[]).arrayBuffer());
        const source = defineSource({
            id: "zipped",
            file: () => Promise.resolve({ body: zip, filename: "graphs.zip" }),
        });
        const { format } = await loadFromSource(source, {});
        expect(format).toBe("gml");
    });

    it("fails with E_SOURCE_LIMIT when maxBytes cuts a file short, which keeps nothing", async () => {
        const fetch = replayFetch([{ url: `${API}/got.gml`, body: GML }]);
        const err = await rejection(
            loadFromSource(
                download("/got.gml", { format: "gml" }),
                {},
                { endpoint: API, fetch, limits: { maxBytes: 100 } },
            ),
        );
        expect(err.issue?.code).toBe("E_SOURCE_LIMIT");
        expect(err.issue?.params).toMatchObject({ limit: "maxBytes" });
        expect(err.report.source?.id).toBe("download");
    });

    it("holds what a .gz inflates to to maxBytes", async () => {
        const bytes = await gzip(GML);
        const fetch = (): Promise<Response> => Promise.resolve(new Response(bytes as Uint8Array<ArrayBuffer>));
        const err = await rejection(
            loadFromSource(
                download("/got.gml.gz", { filename: "got.gml.gz" }),
                {},
                {
                    endpoint: API,
                    fetch,
                    limits: { maxBytes: bytes.byteLength + 1 },
                },
            ),
        );
        expect([err.issue?.code, err.issue?.params]).toMatchObject(["E_SOURCE_LIMIT", { limit: "maxBytes" }]);
    });

    it("holds a .zip entry to maxBytes and codes a damaged zip", async () => {
        const parts = [...writeZip([{ name: "got.gml", data: new TextEncoder().encode(GML) }])];
        const zip = new Uint8Array(await new Blob(parts as BlobPart[]).arrayBuffer());
        const zipped = (body: Uint8Array) =>
            defineSource({ id: "zipped", file: () => Promise.resolve({ body, filename: "graphs.zip" }) });
        const big = await rejection(loadFromSource(zipped(zip), {}, { limits: { maxBytes: 100 } }));
        expect([big.issue?.code, big.issue?.params]).toEqual([
            "E_SOURCE_LIMIT",
            { limit: "maxBytes", value: GML.length },
        ]);
        const damaged = await rejection(loadFromSource(zipped(zip.subarray(0, zip.byteLength - 30)), {}));
        expect([damaged.issue?.code, damaged.issue?.params]).toEqual([
            "E_SOURCE_RESPONSE",
            { origin: null, expected: "graph-file", contentType: null },
        ]);
        const none = [...writeZip([{ name: "readme.txt", data: new TextEncoder().encode("hi") }])];
        const empty = new Uint8Array(await new Blob(none as BlobPart[]).arrayBuffer());
        expect((await rejection(loadFromSource(zipped(empty), {}))).issue?.code).toBe("E_SOURCE_RESPONSE");
    });

    it("refuses a body in no format", async () => {
        const source = defineSource({ id: "junk", file: () => Promise.resolve({ body: "\u0001\u0002 not a graph" }) });
        const err = await rejection(loadFromSource(source, {}));
        expect(err.issue?.code).toBe("E_SOURCE_RESPONSE");
    });

    it("writes into a caller's sink with an idPrefix", async () => {
        const fetch = replayFetch([{ url: `${API}/got.gml`, body: GML }]);
        const builder = new GraphBuilder({ directed: false, addMissingNodes: true });
        await createRegistry().importFromSource(download("/got.gml", { format: "gml" }), {}, builder, {
            endpoint: API,
            fetch,
            idPrefix: "got:",
        });
        expect([...builder.freeze().ids].every((id) => String(id).startsWith("got:"))).toBe(true);
    });
});
