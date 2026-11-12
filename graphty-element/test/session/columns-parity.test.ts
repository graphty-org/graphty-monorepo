/**
 * @file The typed door against the record doors on real graphs (design/rendering/cosmos-gap.md,
 * G8): every graph-io corpus file, every graph-samples generator and every dataset in the
 * repository, loaded once, is read back as records and as columns, and
 * `session.data.importColumns` makes the graph, the counts and the graph-level values that
 * `addNodes` and `addEdges` make from the same rows, on both render paths.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join, resolve } from "node:path";

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { DATASET_DESCRIPTORS, GENERATOR_DESCRIPTORS } from "../../catalog";
import type { GraphSession, ImportColumnsInput } from "../../src/session";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { dataDigest } from "../../src/session/project/digest";
import type { GraphRecord } from "../../src/session/project/state";

/** graph-io's committed corpus, one directory per format. */
const CORPUS = resolve(__dirname, "../../../graph-io/test/corpus");

/**
 * The element's reader for each corpus directory. `malformed` and `styles` are other tests', and the
 * element has no reader for `neo4j`.
 */
const READERS: Readonly<Record<string, string>> = {
    csv: "csv",
    cx: "cx",
    cx2: "cx2",
    cys: "cys",
    dot: "dot",
    gexf: "gexf",
    gml: "gml",
    graphml: "graphml",
    json: "json",
    obo: "obo",
    pajek: "pajek",
    xgmml: "xgmml",
};

/** graph-samples' built dataset files, served the way graphty.app serves them. */
const DATA = resolve(__dirname, "../../../graph-samples/dist/data/v1");

/**
 * Every dataset converted into the repository (one source directory each under graph-samples), each
 * served as `<name>.gsnp.gz`. The hosted ones have no data in the repository and are not compared.
 */
const DATASETS = DATASET_DESCRIPTORS.map(({ name }) => name).filter((name) =>
    existsSync(resolve(__dirname, "../../../graph-samples/src/datasets", name)),
);

/** What a load leaves that the comparison reads. */
interface Held {
    digest: string;
    count: { nodes: number; edges: number };
    values: string;
}

/**
 * What a session holds.
 * @param session - The session.
 * @returns Its digest, counts and graph-level values.
 */
function held(session: GraphSession): Held {
    const { graph } = dispatcherOf(session).state;
    return {
        digest: dataDigest(graph, () => session.data.snapshot()),
        count: session.data.count(),
        values: JSON.stringify([...graph.values.keys()].sort()), // NOSONAR(S2871): code-unit order, the same in every locale
    };
}

/**
 * One column per field named by any record, `undefined` where a record lacks it.
 * @param records - The records.
 * @param skip - The fields left out.
 * @returns The columns by name.
 */
function columnsOf(records: readonly GraphRecord[], skip: ReadonlySet<string>): Record<string, unknown[]> {
    const names = new Set(records.flatMap((record) => Object.keys(record)).filter((name) => !skip.has(name)));
    return Object.fromEntries([...names].map((name) => [name, records.map((record) => record[name])]));
}

/**
 * The records of a loaded graph, without the fields a column would add as `undefined`, so each
 * door is handed the same rows.
 * @param records - The records.
 * @param names - Every field some record has.
 * @returns Records holding every field, `undefined` where the original lacked it.
 */
function filled(records: readonly GraphRecord[], names: readonly string[]): Record<string, unknown>[] {
    return records.map((record) => Object.fromEntries(names.map((name) => [name, record[name]])));
}

/** The endpoint spellings the record doors look for, in their order. */
const ENDPOINTS = [
    ["source", "target"],
    ["src", "dst"],
    ["from", "to"],
] as const;

/**
 * An edge record with its endpoints named `source` and `target`, the names the typed door writes.
 * @param record - The edge record as the load kept it.
 * @returns The record, endpoints renamed.
 */
function sourceTarget(record: GraphRecord): GraphRecord {
    const [from, to] = ENDPOINTS.find(([s, t]) => s in record && t in record) ?? ENDPOINTS[0];
    const { [from]: source, [to]: target, ...rest } = record;
    return { source, target, ...rest };
}

/**
 * Load a graph, read it back, and load the read rows through both doors on one render path.
 * @param load - The load.
 * @param batched - Whether the session takes the batched path.
 * @returns What the record doors and the typed door each made, or null when the load is refused.
 */
async function bothDoors(
    load: (session: GraphSession) => Promise<void>,
    batched: boolean,
): Promise<{ records: Held; columns: Held } | null> {
    const source = createElementSession({}, { batched: () => batched });
    try {
        await load(source);
    } catch {
        // A file the element's own reader refuses (a corpus file kept to test refusal) has no rows to compare.
        source.dispose();
        return null;
    }

    const { graph } = dispatcherOf(source).state;
    const ids = [...graph.nodes.keys()];
    const nodes = [...graph.nodes.values()];
    const edges = [...graph.edges.values()].map(sourceTarget);
    source.dispose();

    const row = new Map(ids.map((id, at) => [id, at]));
    const nodeNames = [...new Set(nodes.flatMap((record) => Object.keys(record)))];
    const edgeNames = [...new Set(edges.flatMap((record) => Object.keys(record)))];
    const nodeRecords = filled(nodes, nodeNames);
    const edgeRecords = filled(edges, edgeNames);

    const byRecords = createElementSession({}, { batched: () => batched });
    await byRecords.transaction("records", async (tx) => {
        await tx.data.addNodes(nodeRecords);
        await tx.data.addEdges(edgeRecords);
    });

    const columns: ImportColumnsInput = {
        nodeCount: ids.length,
        ids,
        sources: edges.map((edge) => row.get(edge.source as string | number) ?? -1),
        targets: edges.map((edge) => row.get(edge.target as string | number) ?? -1),
        attributes: {
            nodes: columnsOf(nodes, new Set(["id"])),
            edges: columnsOf(edges, new Set(["source", "target"])),
        },
    };
    const byColumns = createElementSession({}, { batched: () => batched });
    await byColumns.data.importColumns(columns);

    const out = { records: held(byRecords), columns: held(byColumns) };
    byRecords.dispose();
    byColumns.dispose();
    return out;
}

/**
 * Compare the two doors on both render paths.
 * @param name - What is loaded, for the message.
 * @param load - The load.
 * @returns False when the load is refused.
 */
async function compare(name: string, load: (session: GraphSession) => Promise<void>): Promise<boolean> {
    for (const batched of [false, true]) {
        const both = await bothDoors(load, batched);
        if (both === null) {
            return false;
        }

        const { records, columns } = both;
        assert.isAbove(records.count.nodes, 0, `${name}: the load made a graph`);
        assert.deepStrictEqual(columns, records, `${name} on the ${batched ? "batched" : "objects"} path`);
    }

    return true;
}

/**
 * Every graph file under a corpus directory.
 * @param dir - The directory.
 * @returns The paths, sorted.
 */
function graphFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            out.push(...graphFiles(path));
        } else if (!name.endsWith(".md") && name !== "manifest.json") {
            out.push(path);
        }
    }

    return out;
}

describe("the typed door against the record doors", () => {
    for (const [dir, type] of Object.entries(READERS)) {
        it(`makes the graph the record doors make from every ${dir} corpus file`, async () => {
            let compared = 0;
            for (const path of graphFiles(join(CORPUS, dir))) {
                const name = path.slice(CORPUS.length + 1);
                const bytes = readFileSync(path);
                const data = type === "cys" ? new Uint8Array(bytes) : bytes.toString("utf8");
                if (await compare(name, (session) => session.data.import({ type, name, config: { data } }))) {
                    compared++;
                }
            }

            assert.isAbove(compared, 0, `some ${dir} file loads`);
        });
    }

    it("makes the graph the record doors make from every generator's graph", async () => {
        for (const { name } of GENERATOR_DESCRIPTORS) {
            assert.isTrue(await compare(name, (session) => session.data.generate(name)), name);
        }
    });

    describe("datasets", () => {
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

        it("makes the graph the record doors make from every sample dataset", async () => {
            assert.isAbove(DATASETS.length, 0, "the datasets in the repository are found");
            for (const name of DATASETS) {
                assert.isTrue(files.has(`/${name}.gsnp.gz`), `graph-samples builds ${name}`);
                assert.isTrue(await compare(name, (session) => session.data.loadDataset(name, { baseUrl })), name);
            }
        });
    });
});
