import { readFileSync } from "node:fs";

import { equalsTopology, fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { PACKED } from "../../src/datasets/packed.js";
import { DatasetError, DEFAULT_DATASET_BASE_URL, fetchDataset } from "../../src/datasets/remote.js";
import { karate } from "../helpers/datasets.js";

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
        const snapshot = await fetchDataset("karate", { fetch: fake as typeof fetch, verify: false });
        expect(urls).toEqual([`${DEFAULT_DATASET_BASE_URL}karate.gsnp.gz`]);
        expect(equalsTopology(snapshot, original)).toBe(true);
        expect(snapshot.nodes.get("club")?.value(33)).toBe("Officer");
    });

    it("decodes a file the server sent with Content-Encoding: gzip, which arrives unzipped", async () => {
        const original = fromEdgeArrays(karate());
        const fake = (): Promise<Response> => Promise.resolve(new Response(original.toBytes().slice()));
        const snapshot = await fetchDataset("karate", { fetch: fake });
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
        const mirror = { fetch: fake as typeof fetch, verify: false };
        await fetchDataset("road-ny", { ...mirror, baseUrl: "https://example.org/mirror" });
        await fetchDataset("road-ny", { ...mirror, baseUrl: "https://example.org/mirror/" });
        expect(urls).toEqual([
            "https://example.org/mirror/road-ny.gsnp.gz",
            "https://example.org/mirror/road-ny.gsnp.gz",
        ]);
    });

    it("checks a known dataset against its published SHA-256", async () => {
        // the published file, as the build writes it (scripts/pack-datasets.mjs)
        const published = readFileSync(new URL("../../dist/data/v1/karate.gsnp.gz", import.meta.url));
        const serve = (body: Uint8Array) => (): Promise<Response> => Promise.resolve(new Response(body.slice()));
        expect((await fetchDataset("karate", { fetch: serve(published) })).nodeCount).toBe(34);
        expect(published.length).toBe(PACKED.karate.bytes);

        const tampered = await gzip(fromEdgeArrays(karate()).toBytes());
        const error = await fetchDataset("karate", { fetch: serve(tampered) }).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(DatasetError);
        expect(error).toMatchObject({
            code: "E_DATASET_CHECKSUM",
            details: { url: `${DEFAULT_DATASET_BASE_URL}karate.gsnp.gz`, expected: PACKED.karate.sha256 },
        });
        expect((await fetchDataset("karate", { fetch: serve(tampered), verify: false })).nodeCount).toBe(34);
        // a name graphty.app does not publish has no checksum to check
        expect((await fetchDataset("my-own", { fetch: serve(tampered) })).nodeCount).toBe(34);
    });

    it("rejects a download, or an unzipped body, larger than maxBytes", async () => {
        const wire = fromEdgeArrays(karate()).toBytes();
        const serve = (body: Uint8Array) => (): Promise<Response> => Promise.resolve(new Response(body.slice()));
        const zipped = await gzip(wire);
        const tooBig = { code: "E_DATASET_TOO_LARGE", details: { maxBytes: wire.length - 1 } };
        // the gzip file fits, the bytes it unzips to do not: a gzip bomb stops at the cap
        await expect(fetchDataset("my-own", { fetch: serve(zipped), maxBytes: wire.length - 1 })).rejects.toMatchObject(
            tooBig,
        );
        await expect(fetchDataset("my-own", { fetch: serve(wire), maxBytes: wire.length - 1 })).rejects.toMatchObject(
            tooBig,
        );
        expect((await fetchDataset("my-own", { fetch: serve(zipped), maxBytes: wire.length })).nodeCount).toBe(34);
    });

    it("rejects an HTTP error and a name that is not a plain dataset name, with codes", async () => {
        const missing = (): Promise<Response> => Promise.resolve(new Response("nope", { status: 404 }));
        await expect(fetchDataset("absent", { fetch: missing })).rejects.toThrow(/HTTP 404/);
        await expect(fetchDataset("absent", { fetch: missing })).rejects.toMatchObject({
            code: "E_DATASET_HTTP",
            details: { url: `${DEFAULT_DATASET_BASE_URL}absent.gsnp.gz`, status: 404 },
        });
        await expect(fetchDataset("../secrets", { fetch: missing })).rejects.toMatchObject({
            code: "E_DATASET_NAME",
            details: { name: "../secrets" },
        });
        await expect(fetchDataset("", { fetch: missing })).rejects.toBeInstanceOf(DatasetError);
    });
});
