import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { DATASETS } from "../../src/datasets/catalog.js";
import { HOSTED_DATASETS } from "../../src/datasets/hosted.js";
import { fetchDataset } from "../../src/datasets/remote.js";

const packageRoot = path.resolve(import.meta.dirname, "../..");
const publicData = path.join(packageRoot, "public-data/v1");

describe("the hosted datasets", () => {
    it("are in the catalogue, marked remote, with a checksum and a size", () => {
        expect(HOSTED_DATASETS.length).toBeGreaterThanOrEqual(3);
        for (const meta of HOSTED_DATASETS) {
            expect(DATASETS).toContain(meta);
            expect(meta.hosting).toBe("remote");
            expect(meta.name).toMatch(/^[a-z0-9][a-z0-9-]*$/);
            expect(meta.sha256).toMatch(/^[0-9a-f]{64}$/);
            expect(meta.bytes).toBeGreaterThan(0);
            expect(meta.nodes).toBeGreaterThan(5000);
            expect(meta.source).toMatch(/^https?:\/\//);
            expect(meta.showcases.length).toBeGreaterThan(0);
            if (meta.groundTruth !== null) {
                expect(Object.keys(meta.attributes)).toContain(meta.groundTruth);
            }
        }
    });

    it("are not also bundled", () => {
        const names = new Set(HOSTED_DATASETS.map((meta) => meta.name));
        expect(DATASETS.filter((meta) => meta.hosting !== "remote" && names.has(meta.name))).toEqual([]);
    });
});

// The .gsnp.gz files are build output of scripts/build-hosted.mjs (npm run datasets:hosted), not
// committed; each check runs only where that script has been run.
describe.each(HOSTED_DATASETS.map((meta) => [meta.name, meta] as const))("hosted file %s", (name, meta) => {
    const file = path.join(publicData, `${name}.gsnp.gz`);

    it.runIf(existsSync(file))("matches the manifest and round-trips through fetchDataset", async () => {
        const bytes = readFileSync(file);
        expect(bytes.length).toBe(meta.bytes);
        expect(createHash("sha256").update(bytes).digest("hex")).toBe(meta.sha256);
        const local = (input: URL): Promise<Response> => {
            expect(input.href).toBe(`https://example.org/v1/${name}.gsnp.gz`);
            return Promise.resolve(new Response(bytes));
        };
        const snapshot = await fetchDataset(name, {
            baseUrl: "https://example.org/v1/",
            fetch: local as typeof fetch,
        });
        expect(snapshot.nodeCount).toBe(meta.nodes);
        expect(snapshot.edgeCount).toBe(meta.edges);
        expect(snapshot.directed).toBe(meta.directed);
        expect(snapshot.weights !== null).toBe(meta.weighted);
        for (const column of Object.keys(meta.attributes)) {
            expect(snapshot.nodes.get(column)).not.toBeNull();
        }
    });

    it.runIf(existsSync(path.join(publicData, "index.json")))("is listed in the published index", () => {
        const index = JSON.parse(readFileSync(path.join(publicData, "index.json"), "utf8")) as { name: string }[];
        expect(index.find((entry) => entry.name === name)).toMatchObject(meta);
    });
});

/**
 * A built hosted file, decoded the way fetchDataset decodes a download.
 * @param name - the dataset
 * @returns the snapshot
 */
async function loadLocal(name: string): Promise<GraphSnapshot> {
    const bytes = readFileSync(path.join(publicData, `${name}.gsnp.gz`));
    return fetchDataset(name, { fetch: (() => Promise.resolve(new Response(bytes))) as typeof fetch });
}

describe("hosted file contents", () => {
    it.runIf(existsSync(path.join(publicData, "road-ny.gsnp.gz")))(
        "road-ny: every intersection is in New York",
        async () => {
            const snapshot = await loadLocal("road-ny");
            for (const i of [0, 1000, snapshot.nodeCount - 1]) {
                expect(snapshot.nodes.get("longitude")?.value(i)).toBeGreaterThan(-75);
                expect(snapshot.nodes.get("longitude")?.value(i)).toBeLessThan(-72);
                expect(snapshot.nodes.get("latitude")?.value(i)).toBeGreaterThan(40);
                expect(snapshot.nodes.get("latitude")?.value(i)).toBeLessThan(42);
            }
            expect(snapshot.nodes.get("longitude")?.value(0)).toBe(-73.530767);
        },
    );

    it.runIf(existsSync(path.join(publicData, "ogbn-arxiv.gsnp.gz")))("ogbn-arxiv: 40 subjects and years", async () => {
        const snapshot = await loadLocal("ogbn-arxiv");
        const subject = snapshot.nodes.get("subject");
        const year = snapshot.nodes.get("year");
        const subjects = new Set(Array.from({ length: snapshot.nodeCount }, (_, i) => subject?.value(i)));
        expect(subjects.size).toBe(40);
        expect(subjects).toContain("cs.LG");
        expect(year?.value(0)).toBe(2013);
    });
});
