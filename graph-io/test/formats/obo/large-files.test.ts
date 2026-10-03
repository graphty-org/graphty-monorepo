/**
 * The Gene Ontology itself, too large to commit (design section 6.4): go-basic.obo, go.obo and
 * go-basic.json of the 2026-07-26 release, pinned by URL and SHA-256, downloaded once into the
 * monorepo's tmp/graph-io-large/. Opt-in: set GRAPH_IO_LARGE_FIXTURES=1. The counts are the OBO
 * research's measurements (research-obo.md sections 4.9 and 8.1), which fastobo reproduces.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { importGraph } from "../../../src/registry.js";

const CACHE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "tmp", "graph-io-large");
const RELEASE = "https://release.geneontology.org/2026-08-05/ontology";

interface LargeFile {
    readonly name: string;
    readonly sha256: string;
    readonly format: string;
    readonly nodes: number;
    readonly edges: number;
    readonly obsolete: number;
}

const FILES: readonly LargeFile[] = [
    {
        name: "go-basic.obo",
        sha256: "b08d45b268b8c24ccb2513dbbbc7d4df9f6521c099b413f79eb31e06e0fa3bcc",
        format: "obo",
        nodes: 48_340,
        edges: 71_496,
        obsolete: 10_248,
    },
    {
        name: "go.obo",
        sha256: "d3593751d885ca160b2ab7baf6c7eccd88ca3c4599f79436c674bad661095ff0",
        format: "obo",
        nodes: 48_340,
        edges: 73_634,
        obsolete: 10_248,
    },
    {
        // 52,048 nodes less the 62 PROPERTY nodes kept as metadata; 71,498 edges less 2 subPropertyOf
        name: "go-basic.json",
        sha256: "531d85b2e7a6d4b91290093b487f228994123cec3f45a50136cad2c4b91862ac",
        format: "json",
        nodes: 51_986,
        edges: 71_496,
        obsolete: 10_248 + 3_646,
    },
];

/**
 * The bytes of a pinned file, downloaded on first use and checked against its SHA-256.
 * @param file - the file
 * @returns the bytes
 */
async function bytesOf(file: LargeFile): Promise<Uint8Array> {
    const path = join(CACHE, file.name);
    if (!existsSync(path)) {
        mkdirSync(CACHE, { recursive: true });
        const response = await fetch(`${RELEASE}/${file.name}`);
        expect(response.ok, `download ${file.name}`).toBe(true);
        writeFileSync(path, new Uint8Array(await response.arrayBuffer()));
    }
    const bytes = new Uint8Array(readFileSync(path));
    expect(createHash("sha256").update(bytes).digest("hex"), `${file.name} checksum`).toBe(file.sha256);
    return bytes;
}

describe.runIf(process.env.GRAPH_IO_LARGE_FIXTURES === "1")("the Gene Ontology release files", () => {
    for (const file of FILES) {
        it(`${file.name}: ${file.nodes} nodes and ${file.edges} edges`, async () => {
            const { snapshot, report } = await importGraph(await bytesOf(file), { filename: file.name });
            expect(report.format).toBe(file.format);
            expect(report.errorCount).toBe(0);
            expect(snapshot.nodeCount).toBe(file.nodes);
            expect(snapshot.edgeCount).toBe(file.edges);
            const obsolete = snapshot.nodes.require("is_obsolete");
            let count = 0;
            for (let i = 0; i < snapshot.nodeCount; i++) {
                if (obsolete.isSet(i) && obsolete.value(i) === true) {
                    count++;
                }
            }
            expect(count).toBe(file.obsolete);
            const go = snapshot.ids.indexOf("GO:0008150");
            expect(snapshot.nodes.require("name").value(go)).toBe("biological_process");
            expect(snapshot.nodes.require("namespace").value(go)).toBe("biological_process");
        }, 300_000);
    }
});
