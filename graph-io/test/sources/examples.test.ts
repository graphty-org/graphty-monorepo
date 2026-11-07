/**
 * The built-in sources' examples (`descriptor.examples`), offline: each one's catalog data is
 * well formed, and the SPARQL examples load from their recorded answers with the counts they
 * declare. Whether the public servers still answer is scripts/live-examples.ts's job.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ImportReportBuilder } from "../../src/common/report.js";
import { listSources, loadFromSource, type Recording, replayFetch } from "../../src/index.js";
import { checkParams } from "../../src/sources/define.js";
import { sparqlSource } from "../../src/sources/sparql/index.js";

const sources = listSources().filter((info) => (info.descriptor.examples ?? []).length > 0);

describe("every built-in example", () => {
    it("is offered by the sources that have a dependable public server", () => {
        expect(sources.map((info) => info.id)).toEqual(["ndex", "neo4j", "rest", "openalex", "sparql"]);
    });

    describe.each(sources.map((info) => [info.id, info.descriptor] as const))("%s", (_id, descriptor) => {
        const examples = descriptor.examples ?? [];

        it("has ids unique within its source", () => {
            const ids = examples.map((example) => example.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it.each(examples.map((example) => [example.id, example] as const))("%s is well formed", (_name, example) => {
            // params the source's own check accepts
            expect(() => {
                checkParams(example.params, descriptor, new ImportReportBuilder("source", 1));
            }).not.toThrow();
            // a secure endpoint: https, or bolt+s for a Bolt example
            const endpoint = new URL(example.endpoint ?? descriptor.defaultEndpoint ?? "");
            const bolt = example.params.transport === "bolt";
            expect(endpoint.protocol).toBe(bolt ? "bolt+s:" : "https:");
            expect(example.counts?.nodes).toBeGreaterThan(0);
            // one too big to load whole says where to start
            if (example.whole === false) {
                expect(example.firstPage !== undefined || example.params.ids !== undefined).toBe(true);
            }
        });
    });
});

describe("the SPARQL examples, recorded on 2026-11-07", () => {
    it.each((sparqlSource.descriptor?.examples ?? []).map((example) => [example.id, example] as const))(
        "%s loads its declared counts",
        async (id, example) => {
            const recordings = JSON.parse(
                readFileSync(new URL(`./sparql/recordings/${id}.json`, import.meta.url), "utf8"),
            ) as Recording[];
            const { snapshot } = await loadFromSource(sparqlSource, example.params, {
                endpoint: example.endpoint,
                fetch: replayFetch(recordings),
            });
            expect([snapshot.nodeCount, snapshot.edgeCount]).toEqual([example.counts?.nodes, example.counts?.edges]);
        },
    );
});
