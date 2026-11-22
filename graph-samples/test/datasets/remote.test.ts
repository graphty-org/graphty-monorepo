import { readFileSync } from "node:fs";

import { coordinateSystemOf, equalsTopology, fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { HOSTED_DATASETS } from "../../src/datasets/hosted.js";
import { HOSTED_DATASET_SHA256 } from "../../src/datasets/hosted-names.js";
import { PACKED } from "../../src/datasets/packed.js";
import { DatasetError, DEFAULT_DATASET_BASE_URL, fetchDataset } from "../../src/datasets/remote.js";
import { toElementData } from "../../src/element.js";
import { karate, openflights, wikipathwaysSenescenceAutophagy } from "../helpers/datasets.js";

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
        expect(published.length).toBe(PACKED.karate.bytes);
        expect((await fetchDataset("karate", { fetch: serve(published) })).nodeCount).toBe(34);

        const tampered = await gzip(fromEdgeArrays(karate()).toBytes());
        const error = await fetchDataset("karate", { fetch: serve(tampered) }).catch((e: unknown) => e);
        expect(error).toBeInstanceOf(DatasetError);
        expect(error).toMatchObject({
            code: "E_DATASET_CHECKSUM",
            details: { url: `${DEFAULT_DATASET_BASE_URL}karate.gsnp.gz`, expected: PACKED.karate.sha256 },
        });
        expect((await fetchDataset("karate", { fetch: serve(tampered), verify: false })).nodeCount).toBe(34);
        // the large datasets' checksums, kept apart from their metadata, are the metadata's
        expect(HOSTED_DATASET_SHA256).toEqual(Object.fromEntries(HOSTED_DATASETS.map((m) => [m.name, m.sha256])));
        // a name graphty.app does not publish has no checksum to check
        expect((await fetchDataset("my-own", { fetch: serve(tampered) })).nodeCount).toBe(34);
    });

    it("rejects a download, or what it unzips to, larger than maxBytes", async () => {
        const wire = fromEdgeArrays(karate()).toBytes();
        const serve = (body: Uint8Array) => (): Promise<Response> => Promise.resolve(new Response(body.slice()));
        const zipped = await gzip(wire);
        const maxBytes = wire.length - 1;
        const tooBig = { code: "E_DATASET_TOO_LARGE", details: { maxBytes } };
        // the gzip file fits, the bytes it unzips to do not: a gzip bomb stops at the cap
        expect(zipped.length).toBeLessThan(maxBytes);
        await expect(fetchDataset("my-own", { fetch: serve(zipped), maxBytes })).rejects.toMatchObject(tooBig);
        await expect(fetchDataset("my-own", { fetch: serve(wire), maxBytes })).rejects.toMatchObject(tooBig);
        expect((await fetchDataset("my-own", { fetch: serve(zipped), maxBytes: wire.length })).nodeCount).toBe(34);
    });

    it("rejects an HTTP error and a name that is not a plain dataset name, with codes", async () => {
        const missing = (): Promise<Response> => Promise.resolve(new Response("nope", { status: 404 }));
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

    it("gives openflights a geographic position column and WP615 a y-up one, beside their plain columns", async () => {
        const serve = (bytes: Uint8Array) => (): Promise<Response> => Promise.resolve(new Response(bytes.slice()));
        const flights = await fetchDataset("openflights", { fetch: serve(fromEdgeArrays(openflights()).toBytes()) });
        const geo = flights.nodes.byRole("position");
        expect(geo === null ? null : coordinateSystemOf(geo.meta)).toMatchObject({
            kind: "geographic",
            dims: 2,
            units: "degrees",
            datum: "WGS84",
            order: ["longitude", "latitude", "altitude"],
        });
        const i = flights.ids.indexOf("LHR");
        expect(Array.from(geo?.value(i) as ArrayLike<number>)).toEqual([
            flights.nodes.get("longitude")?.value(i),
            flights.nodes.get("latitude")?.value(i),
            0,
        ]);
        const pathway = await fetchDataset("wikipathways-senescence-autophagy", {
            fetch: serve(fromEdgeArrays(wikipathwaysSenescenceAutophagy()).toBytes()),
        });
        const drawn = pathway.nodes.byRole("position");
        expect(drawn === null ? null : coordinateSystemOf(drawn.meta)).toMatchObject({
            kind: "cartesian",
            yAxis: "up",
            dims: 2,
        });
        expect(pathway.nodes.has("x") && pathway.nodes.has("y")).toBe(true);
        // the records a graph is loaded from keep the plain columns, not the position they repeat
        expect(Object.keys(toElementData(pathway).nodes[0])).not.toContain("position");
    });

    it("gives every dataset with a saved drawing a y-up position column (issue #9281)", async () => {
        const drawn = fromEdgeArrays({
            directed: true,
            nodeCount: 2,
            src: Uint32Array.of(0),
            dst: Uint32Array.of(1),
            nodeColumns: { x: Float64Array.of(1, 2), y: Float64Array.of(3, 4) },
        }).toBytes();
        for (const name of ["bioplex3-hct116", "stelzl-interactome", "yeast-perturbation"]) {
            const snapshot = await fetchDataset(name, { fetch: () => Promise.resolve(new Response(drawn.slice())) });
            const position = snapshot.nodes.byRole("position");
            expect(position === null ? null : coordinateSystemOf(position.meta), name).toMatchObject({
                kind: "cartesian",
                yAxis: "up",
            });
            expect(Array.from(position?.value(1) as ArrayLike<number>), name).toEqual([2, 4, 0]);
        }
    });

    it("leaves a dataset without positions as it was", async () => {
        const snapshot = await fetchDataset("karate", {
            fetch: () => Promise.resolve(new Response(fromEdgeArrays(karate()).toBytes().slice())),
        });
        expect(snapshot.nodes.byRole("position")).toBeNull();
    });
});
