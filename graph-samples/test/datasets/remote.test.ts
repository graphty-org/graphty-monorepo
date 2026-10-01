import { equalsTopology, fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { karate } from "../../src/datasets/karate/index.js";
import { DEFAULT_DATASET_BASE_URL, fetchDataset } from "../../src/datasets/remote.js";

/**
 * Gzip bytes the way the hosted files are written.
 * @param bytes - the raw bytes
 * @returns the gzipped bytes
 */
async function gzip(bytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
    const stream = new Blob([bytes.slice()]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

describe("fetchDataset", () => {
    it("fetches <base><name>.gsnp.gz and decodes the snapshot", async () => {
        const original = fromEdgeArrays(karate());
        const body = await gzip(original.toBytes());
        const urls: string[] = [];
        const fake = (input: URL): Promise<Response> => {
            urls.push(input.href);
            return Promise.resolve(new Response(body));
        };
        const snapshot = await fetchDataset("karate", { fetch: fake as typeof fetch });
        expect(urls).toEqual([`${DEFAULT_DATASET_BASE_URL}karate.gsnp.gz`]);
        expect(equalsTopology(snapshot, original)).toBe(true);
        expect(snapshot.nodes.get("club")?.value(33)).toBe("Officer");
    });

    it("honours a base URL with or without a trailing slash", async () => {
        const body = await gzip(fromEdgeArrays(karate()).toBytes());
        const urls: string[] = [];
        const fake = (input: URL): Promise<Response> => {
            urls.push(input.href);
            return Promise.resolve(new Response(body));
        };
        await fetchDataset("road-ny", { baseUrl: "https://example.org/mirror", fetch: fake as typeof fetch });
        await fetchDataset("road-ny", { baseUrl: "https://example.org/mirror/", fetch: fake as typeof fetch });
        expect(urls).toEqual([
            "https://example.org/mirror/road-ny.gsnp.gz",
            "https://example.org/mirror/road-ny.gsnp.gz",
        ]);
    });

    it("rejects an HTTP error and a name that is not a plain dataset name", async () => {
        const missing = (): Promise<Response> => Promise.resolve(new Response("nope", { status: 404 }));
        await expect(fetchDataset("absent", { fetch: missing as typeof fetch })).rejects.toThrow(/HTTP 404/);
        await expect(fetchDataset("../secrets", { fetch: missing as typeof fetch })).rejects.toThrow(RangeError);
        await expect(fetchDataset("", { fetch: missing as typeof fetch })).rejects.toThrow(RangeError);
    });
});
