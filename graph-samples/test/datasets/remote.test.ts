import { coordinateSystemOf, equalsTopology, fromEdgeArrays } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { DEFAULT_DATASET_BASE_URL, fetchDataset } from "../../src/datasets/remote.js";
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
        const snapshot = await fetchDataset("karate", { fetch: fake as typeof fetch });
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
        await fetchDataset("road-ny", { baseUrl: "https://example.org/mirror", fetch: fake as typeof fetch });
        await fetchDataset("road-ny", { baseUrl: "https://example.org/mirror/", fetch: fake as typeof fetch });
        expect(urls).toEqual([
            "https://example.org/mirror/road-ny.gsnp.gz",
            "https://example.org/mirror/road-ny.gsnp.gz",
        ]);
    });

    it("rejects an HTTP error and a name that is not a plain dataset name", async () => {
        const missing = (): Promise<Response> => Promise.resolve(new Response("nope", { status: 404 }));
        await expect(fetchDataset("absent", { fetch: missing })).rejects.toThrow(/HTTP 404/);
        await expect(fetchDataset("../secrets", { fetch: missing })).rejects.toThrow(RangeError);
        await expect(fetchDataset("", { fetch: missing })).rejects.toThrow(RangeError);
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

    it("leaves a dataset without positions as it was", async () => {
        const snapshot = await fetchDataset("karate", {
            fetch: () => Promise.resolve(new Response(fromEdgeArrays(karate()).toBytes().slice())),
        });
        expect(snapshot.nodes.byRole("position")).toBeNull();
    });
});
