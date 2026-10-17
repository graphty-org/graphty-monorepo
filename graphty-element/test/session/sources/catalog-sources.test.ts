/**
 * `sourceDescriptors()` from `./catalog` lists every network source with its descriptor and its
 * public samples, graph-samples' datasets among them, loading no source's code; and the
 * `graph-samples` source, written with the public `defineSource`, loads a dataset.
 */

import { readFileSync } from "node:fs";

import { assert, describe, it } from "vitest";

import { sourceDescriptors } from "../../../catalog";
import { createGraphSession } from "../../../session";

/** graph-samples' own build of the karate club dataset, as graphty.app serves it. */
const KARATE = readFileSync(new URL("../../../../graph-samples/dist/data/v1/karate.gsnp.gz", import.meta.url));

describe("sourceDescriptors()", () => {
    it("lists the built-in sources and graph-samples with their samples, loading no source code", () => {
        const infos = sourceDescriptors();
        const ids = infos.map((info) => info.id);
        for (const id of ["ndex", "cypher", "neo4j", "neptune", "rest", "openalex", "graph-samples"]) {
            assert.include(ids, id);
        }

        for (const info of infos.filter((each) => each.id !== "graph-samples" && !each.id.startsWith("people"))) {
            assert.isFalse(info.loaded, `${info.id}'s code was loaded`);
        }

        const samples = infos.find((info) => info.id === "graph-samples")?.descriptor.samples ?? [];
        const karate = samples.find((sample) => sample.params.dataset === "karate");
        assert.deepEqual(karate?.counts, { nodes: 34, edges: 78 });
        assert.isAbove(infos.find((info) => info.id === "ndex")?.descriptor.samples?.length ?? 0, 0);
    });
});

describe("the graph-samples source", () => {
    it("loads a dataset through session.data.import, with a counted fetch", async () => {
        const session = createGraphSession();
        try {
            const asked: string[] = [];
            const fetch = (input: string | URL | Request): Promise<Response> => {
                asked.push(String(input instanceof Request ? input.url : input));
                return Promise.resolve(new Response(KARATE, { headers: { "content-type": "application/gzip" } }));
            };
            await session.data.import({ source: "graph-samples", config: { dataset: "karate" } }, { fetch });
            assert.deepEqual(asked, ["https://graphty.app/data/graph-samples/v1/karate.gsnp.gz"]);
            assert.strictEqual(session.data.nodes().length, 34);
            assert.strictEqual(session.data.edges().length, 78);
            assert.strictEqual(session.data.loads()[0].source, "graph-samples");
        } finally {
            session.dispose();
        }
    });

    it("refuses a dataset it does not list before any request", async () => {
        const session = createGraphSession();
        try {
            let calls = 0;
            const fetch = (): Promise<Response> => {
                calls++;
                return Promise.resolve(new Response(""));
            };
            const error = await session.data
                .import({ source: "graph-samples", config: { dataset: "no-such-dataset" } }, { fetch })
                .then(
                    () => null,
                    (e: unknown) => e as { code?: string },
                );
            assert.strictEqual(error?.code, "E_SOURCE_PARAM");
            assert.strictEqual(calls, 0);
        } finally {
            session.dispose();
        }
    });
});
