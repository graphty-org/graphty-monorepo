import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { equalsTopology, fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { buildDataset } from "../../data/build.js";
import { DATASETS } from "../../src/datasets/catalog.js";
import { karate, karateMeta } from "../../src/datasets/karate/index.js";
import { PACKED } from "../../src/datasets/packed.js";
import { GENERATOR_CATALOG } from "../../src/generators/catalog.js";
import { SOURCE_DATA } from "../helpers/datasets.js";

const packageRoot = path.resolve(import.meta.dirname, "../..");
const built = path.join(packageRoot, "dist/data/v1");

describe("every dataset", () => {
    it("is remote, with the size and checksum of its published file", () => {
        for (const meta of DATASETS) {
            expect(meta.hosting, meta.name).toBe("remote");
            expect(meta.bytes, meta.name).toBeGreaterThan(0);
            expect(meta.sha256, meta.name).toMatch(/^[0-9a-f]{64}$/);
        }
        expect(Object.keys(PACKED).sort()).toEqual(Object.keys(SOURCE_DATA).sort());
    });
});

/**
 * Checks that a picture tools/render-sample-thumbnails.mjs drew is in thumbnails/: a small WebP.
 * @param file - its file name
 */
function expectPicture(file: string): void {
    const picture = readFileSync(path.join(packageRoot, "thumbnails", file));
    expect(picture.subarray(0, 4).toString("latin1")).toBe("RIFF");
    expect(picture.subarray(8, 12).toString("latin1")).toBe("WEBP");
    // tools/render-sample-thumbnails.mjs draws small pictures, not page-sized ones
    expect(picture.length).toBeLessThan(80_000);
}

describe("a dataset's picture", () => {
    it.each(DATASETS.map((meta) => meta.name))("%s has one, a WebP beside its file", (name) => {
        expect(DATASETS.find((meta) => meta.name === name)?.thumbnail).toBe(`${name}.webp`);
        expectPicture(`${name}.webp`);
        if (name in PACKED) {
            expect(PACKED[name].thumbnail).toBe(`${name}.webp`);
        }
    });
});

describe("a generator's picture", () => {
    it.each(GENERATOR_CATALOG.map((generator) => generator.name))("%s has one, a WebP beside the datasets", (name) => {
        expect(GENERATOR_CATALOG.find((generator) => generator.name === name)?.thumbnail).toBe(
            `generator-${name}.webp`,
        );
        expectPicture(`generator-${name}.webp`);
    });

    it("is published with the datasets by the pack step", () => {
        for (const { thumbnail } of GENERATOR_CATALOG) {
            expect(existsSync(path.join(built, thumbnail ?? "")), thumbnail).toBe(true);
        }
    });
});

describe("a small dataset's subpath", () => {
    it("downloads the dataset through fetchDataset, with the options it is given", async () => {
        const body = readFileSync(path.join(built, "karate.gsnp.gz"));
        const urls: string[] = [];
        const local = (input: URL): Promise<Response> => {
            urls.push(input.href);
            return Promise.resolve(new Response(body));
        };
        const snapshot = await karate({ baseUrl: "https://example.org/v1/", fetch: local as typeof fetch });
        expect(urls).toEqual(["https://example.org/v1/karate.gsnp.gz"]);
        expect(snapshot.nodeCount).toBe(karateMeta.nodes);
        expect(snapshot.nodes.get("club")?.value(33)).toBe("Officer");
    });
});

/**
 * Every node column's values of a snapshot, NaN as null so that two equal columns compare equal.
 * @param snapshot - the snapshot
 * @returns the values by column name
 */
function nodeValues(snapshot: GraphSnapshot): Record<string, unknown[]> {
    const out: Record<string, unknown[]> = {};
    for (const column of snapshot.nodes) {
        out[column.meta.name] = Array.from({ length: snapshot.nodeCount }, (_, i) => {
            const v = column.value(i);
            return typeof v === "number" && Number.isNaN(v) ? null : v;
        });
    }
    return out;
}

// dist/data/v1/ is build output of scripts/pack-datasets.mjs (the last step of npm run build:all)
describe.each(Object.keys(SOURCE_DATA))("packed file %s", (name) => {
    const file = path.join(built, `${name}.gsnp.gz`);

    it.runIf(existsSync(file))("matches the catalogue and holds the repository's data", async () => {
        const bytes = readFileSync(file);
        const meta = DATASETS.find((m) => m.name === name);
        // a change to the data or to graph-format's wire output changes the file: rerun npm run datasets:pack
        const stale = "src/datasets/packed.ts is out of date: run `npm run build:all && npm run datasets:pack`";
        expect(bytes.length, stale).toBe(meta?.bytes);
        expect(createHash("sha256").update(bytes).digest("hex"), stale).toBe(meta?.sha256);
        const index = JSON.parse(readFileSync(path.join(built, "index.json"), "utf8")) as { name: string }[];
        expect(index.find((entry) => entry.name === name)).toMatchObject({ ...meta });
        const { fetchDataset } = await import("../../src/datasets/remote.js");
        const snapshot = await fetchDataset(name, { fetch: () => Promise.resolve(new Response(bytes)) });
        const source = fromEdgeArrays(buildDataset(SOURCE_DATA[name]));
        expect(equalsTopology(snapshot, source)).toBe(true);
        expect(Array.from({ length: snapshot.nodeCount }, (_, i) => snapshot.ids.idOf(i))).toEqual(
            Array.from({ length: source.nodeCount }, (_, i) => source.ids.idOf(i)),
        );
        expect(snapshot.weights).toEqual(source.weights);
        expect(nodeValues(snapshot)).toEqual(nodeValues(source));
    });
});
