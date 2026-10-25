import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { DATASET_DESCRIPTORS, GENERATOR_DESCRIPTORS } from "../../catalog";
import { isGraphtyError } from "../../src/errors/GraphtyError";
import { createGraphSession } from "../../src/session";

/** graph-samples' built dataset files, served the way graphty.app serves them. */
const DATA = resolve(__dirname, "../../../graph-samples/dist/data/v1");

/**
 * The code a promise rejects with.
 * @param promise - The promise.
 * @returns The GraphtyError code, or "none" when it resolved.
 */
async function codeOf(promise: Promise<unknown>): Promise<string> {
    try {
        await promise;
    } catch (error) {
        return isGraphtyError(error) ? error.code : `not a GraphtyError: ${String(error)}`;
    }
    return "none";
}

describe("session.catalog.generators and data.generate", () => {
    it("lists every generator with its parameters as plain data", () => {
        const session = createGraphSession();
        const generators = session.catalog.generators();
        assert.isAbove(generators.length, 50);
        const er = generators.find((each) => each.name === "erdos-renyi");
        assert.deepInclude(er?.params ?? [], { name: "n", plainName: "Nodes", type: "integer", default: 100, min: 0 });
        assert.deepStrictEqual(JSON.parse(JSON.stringify(generators)), generators);
        session.dispose();
    });

    it("names the picture graph-samples publishes of every generator and every dataset", () => {
        for (const entry of [...GENERATOR_DESCRIPTORS, ...DATASET_DESCRIPTORS]) {
            assert.match(entry.thumbnail ?? "", /^[a-z0-9-]+\.webp$/, entry.name);
            assert.isTrue(
                existsSync(resolve(DATA, entry.thumbnail ?? "")),
                `${entry.name}: ${String(entry.thumbnail)}`,
            );
        }
    });

    it("loads a generated graph as one undoable step, defaults filled in", async () => {
        const session = createGraphSession();
        await session.data.generate("barabasi-albert", { n: 40, m: 2 });
        assert.strictEqual(session.data.snapshot().nodeCount, 40);
        assert.strictEqual(session.data.snapshot().edgeCount, 76);
        await session.data.generate("cycle");
        assert.strictEqual(session.data.snapshot().nodeCount, 30, "replaces the graph, with the default size");
        await session.undo();
        assert.strictEqual(session.data.snapshot().nodeCount, 40);
        session.dispose();
    });

    it("gives the same graph for the same seed and a different one for another", async () => {
        const edges = async (seed: number): Promise<string> => {
            const session = createGraphSession();
            await session.data.generate("erdos-renyi", { n: 30, p: 0.2, seed });
            const out = JSON.stringify(session.data.edges().map((edge) => [edge.source, edge.target]));
            session.dispose();
            return out;
        };
        assert.strictEqual(await edges(3), await edges(3));
        assert.notStrictEqual(await edges(3), await edges(4));
    });

    it("refuses an unknown generator, an unknown parameter and a value out of range, loading nothing", async () => {
        const session = createGraphSession();
        assert.strictEqual(await codeOf(session.data.generate("erdos-reny")), "E_UNKNOWN_GENERATOR");
        assert.strictEqual(await codeOf(session.data.generate("cycle", { m: 3 })), "E_UNKNOWN_OPTION");
        assert.strictEqual(await codeOf(session.data.generate("erdos-renyi", { p: 3 })), "E_OPTION_RANGE");
        assert.strictEqual(await codeOf(session.data.generate("barabasi-albert", { n: 2, m: 2 })), "E_OPTION_RANGE");
        assert.strictEqual(session.data.snapshot().nodeCount, 0);
        session.dispose();
    });
});

describe("session.catalog.datasets and data.loadDataset", () => {
    let server: Server;
    let baseUrl = "";

    beforeAll(async () => {
        server = createServer((request, response) => {
            const name = (request.url ?? "").replace(/^\//, "");
            if (!/^[a-z0-9-]+\.gsnp\.gz$/.test(name) || !existsSync(resolve(DATA, name))) {
                response.statusCode = 404;
                response.end();
                return;
            }
            response.end(readFileSync(resolve(DATA, name)));
        });
        await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
        baseUrl = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/`;
    });

    afterAll(async () => {
        await new Promise((done) => server.close(done));
    });

    it("lists every dataset with its size", () => {
        const session = createGraphSession();
        const karate = session.catalog.datasets().find((each) => each.name === "karate");
        assert.strictEqual(karate?.nodes, 34);
        assert.strictEqual(karate?.edges, 78);
        assert.isAbove(session.catalog.datasets().length, 16, "the large hosted ones too");
        session.dispose();
    });

    it("downloads a dataset and loads it", async () => {
        const session = createGraphSession();
        await session.data.loadDataset("karate", { baseUrl });
        assert.strictEqual(session.data.snapshot().nodeCount, 34);
        assert.strictEqual(session.data.snapshot().edgeCount, 78);
        session.dispose();
    });

    it("refuses an unknown dataset, and says so when the download fails", async () => {
        const session = createGraphSession();
        assert.strictEqual(await codeOf(session.data.loadDataset("karat")), "E_UNKNOWN_DATASET");
        assert.strictEqual(await codeOf(session.data.loadDataset("nothing-here", { baseUrl })), "E_FETCH_FAILED");
        assert.strictEqual(session.data.snapshot().nodeCount, 0);
        session.dispose();
    });
});
