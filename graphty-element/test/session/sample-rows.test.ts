/**
 * @file graph-samples' graphs reach the graph without a JSON text (design/rendering/row-renderer.md,
 * section 4.6, "The typed door"): under the "batched" render path `data.generate` and
 * `data.loadDataset` hand the import the sample's rows, where the "objects" path writes them into a
 * JSON document and reads it back. The graph, its load entry and undo and redo are the same on both.
 */

import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";

import { afterAll, assert, beforeAll, describe, it, vi } from "vitest";

import { GENERATOR_DESCRIPTORS } from "../../catalog";
import type { GraphSession } from "../../src/session";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { dataDigest } from "../../src/session/project/digest";

/** graph-samples' built dataset files, served the way graphty.app serves them. */
const DATA = resolve(__dirname, "../../../graph-samples/dist/data/v1");

/** The datasets compared, each served as `<name>.gsnp.gz`. */
const DATASETS = [
    "karate",
    "les-miserables",
    "florentine-families",
    "davis-southern-women",
    "go-slim-generic",
    "knuth-miles",
];

/**
 * The digest of the session's graph slice and snapshot, and what its load entry says.
 * @param session - The session.
 * @returns Both, as one string.
 */
function state(session: GraphSession): string {
    const loads = session.data.sources().map(({ kind, name, counts }) => ({ kind, name, counts }));
    return `${dataDigest(dispatcherOf(session).state.graph, () => session.data.snapshot())} ${JSON.stringify(loads)}`;
}

/**
 * Load a sample on both render paths and compare what each holds after the load, its undo and its redo.
 * @param load - The load.
 * @returns How many JSON texts holding a whole graph each path wrote.
 */
async function compare(load: (session: GraphSession) => Promise<void>): Promise<{ objects: number; batched: number }> {
    const written = { objects: 0, batched: 0 };
    const seen: string[][] = [];
    for (const batched of [false, true]) {
        const session = createElementSession({}, { batched: () => batched });
        await session.data.generate("path", { n: 3 });
        const stringify = vi.spyOn(JSON, "stringify");
        await load(session);
        written[batched ? "batched" : "objects"] = stringify.mock.results.filter(
            ({ value }) => typeof value === "string" && value.includes('"edges":['),
        ).length;
        stringify.mockRestore();
        const after = [state(session)];
        await session.undo();
        after.push(state(session));
        await session.redo();
        after.push(state(session));
        seen.push(after);
        session.dispose();
    }

    assert.deepStrictEqual(seen[1], seen[0], "the batched path holds what the objects path does");
    return written;
}

describe("graph-samples' graphs on the batched path", () => {
    it("loads every generator's graph as the objects path does, with no JSON text", async () => {
        for (const { name } of GENERATOR_DESCRIPTORS) {
            const written = await compare((session) => session.data.generate(name));
            assert.isAbove(written.objects, 0, `${name}: the objects path still reads a JSON text`);
            assert.strictEqual(written.batched, 0, `${name}: the batched path writes none`);
        }
    });

    it("adds a generated graph to the graph as the objects path does", async () => {
        const written = await compare((session) => session.data.generate("star", { n: 6 }, { mode: "merge" }));
        assert.strictEqual(written.batched, 0);
    });

    describe("datasets", () => {
        /** Each dataset's file, by the path the server answers it at. */
        const files = new Map<string, Buffer>();
        let server: Server;
        let baseUrl = "";

        beforeAll(async () => {
            for (const name of DATASETS) {
                const file = resolve(DATA, `${name}.gsnp.gz`);
                if (existsSync(file)) {
                    files.set(`/${name}.gsnp.gz`, readFileSync(file));
                }
            }

            server = createServer((request, response) => {
                const body = files.get(request.url ?? "");
                if (body === undefined) {
                    response.statusCode = 404;
                }

                response.end(body);
            });
            await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
            baseUrl = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}/`;
        });

        afterAll(async () => {
            await new Promise((done) => server.close(done));
        });

        it("loads a downloaded dataset as the objects path does, with no JSON text", async () => {
            for (const name of DATASETS) {
                if (!files.has(`/${name}.gsnp.gz`)) {
                    continue;
                }

                const written = await compare((session) => session.data.loadDataset(name, { baseUrl }));
                assert.isAbove(written.objects, 0, name);
                assert.strictEqual(written.batched, 0, name);
            }
        });
    });
});
