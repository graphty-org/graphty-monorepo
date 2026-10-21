/**
 * Live check of the Cypher source against the public services of design section 12.5, never run
 * in CI: loads the Neo4j demo `movies` database over the Query API and Metformin's neighborhood
 * from Hetionet over Bolt, and fails when either differs from what the samples say.
 *
 * Usage: `GRAPH_IO_LIVE=1 pnpm exec tsx scripts/live-cypher.ts [--record <dir>]`. With `--record`,
 * every Query API exchange is written to `<dir>/<name>.json` as replayFetch recordings: request
 * headers are never kept, so the published demo login is not either.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
    credentials,
    ImportError,
    loadFromSource,
    probeSource,
    type Recording,
    recordingFrom,
    type SourceCursor,
} from "../src/index.js";

const DEMO = "https://demo.neo4jlabs.com:7473";
const HETIONET = "bolt+s://neo4j.het.io:7687";

if (process.env.GRAPH_IO_LIVE !== "1") {
    process.stdout.write("set GRAPH_IO_LIVE=1 to call the live services\n");
    process.exit(0);
}

const recordAt = process.argv.indexOf("--record");
const recordDir = recordAt === -1 ? null : process.argv[recordAt + 1];

/**
 * A fetch that keeps a recording of every exchange.
 * @returns the fetch and what it recorded
 */
function recorder(): { fetch: typeof fetch; recordings: Recording[] } {
    const recordings: Recording[] = [];
    const record: typeof fetch = async (input, init) => {
        const request = new Request(input, init);
        const response = await fetch(request.clone());
        recordings.push(await recordingFrom(request, response.clone()));
        return response;
    };
    return { fetch: record, recordings };
}

/**
 * Write recordings when asked to.
 * @param name - the file name, without extension
 * @param recordings - the recordings
 */
function save(name: string, recordings: readonly Recording[]): void {
    if (recordDir === null || recordDir === undefined) {
        return;
    }
    mkdirSync(recordDir, { recursive: true });
    const scrubbed = recordings.map((r) => ({ ...r, body: typeof r.body === "string" ? JSON.parse(r.body) : r.body }));
    // one recording per line: small, and a diff shows which exchange changed
    writeFileSync(join(recordDir, `${name}.json`), `[\n${scrubbed.map((x) => JSON.stringify(x)).join(",\n")}\n]\n`);
}

/**
 * Check one fact, failing the run when it is false.
 * @param ok - the fact
 * @param what - what was checked
 */
function check(ok: boolean, what: string): void {
    process.stdout.write(`${ok ? "ok  " : "FAIL"} ${what}\n`);
    if (!ok) {
        process.exitCode = 1;
    }
}

const login = (): ReturnType<typeof credentials.basic> => credentials.basic("movies", "movies");

// 1. movies, whole, over the Query API
{
    const { snapshot, report } = await loadFromSource(
        "neo4j",
        { database: "movies", mode: "all" },
        { endpoint: DEMO, credential: login() },
    );
    check(
        snapshot.nodeCount === 171 && snapshot.edgeCount === 253,
        `movies: ${snapshot.nodeCount} nodes / ${snapshot.edgeCount} edges`,
    );
    check(report.source?.next === null, "movies: complete in one load");
}

// 2. movies in pages of 100, for the cursor test
{
    const r = recorder();
    let cursor: SourceCursor | null | undefined;
    let nodes = 0;
    for (let i = 0; i < 20; i++) {
        const part = await loadFromSource(
            "neo4j",
            { database: "movies", mode: "all", pageSize: 100 },
            { endpoint: DEMO, credential: login(), fetch: r.fetch, limits: { maxNodes: 1 }, cursor },
        );
        nodes += part.snapshot.nodeCount;
        cursor = part.report.source?.next ?? null;
        if (cursor === null) {
            break;
        }
    }
    check(nodes > 171, `movies paged: ${nodes} node rows over the pages (ends included)`);
    save("movies-paged", r.recordings);
}

// 3. a user query, a neighborhood, a syntax error and a probe
{
    const r = recorder();
    const options = { endpoint: DEMO, credential: login(), fetch: r.fetch };
    const hanks = await loadFromSource(
        "neo4j",
        {
            database: "movies",
            query: "MATCH p = (:Person {name: $name})-[:ACTED_IN]->() RETURN p",
            parameters: { name: "Tom Hanks" },
        },
        options,
    );
    check(hanks.snapshot.nodeCount === 13, `Tom Hanks' movies: ${hanks.snapshot.nodeCount} nodes`);
    // movies keys people by name and movies by title, so the neighborhood starts from an element id
    const keanu = await loadFromSource(
        "neo4j",
        { database: "movies", query: "MATCH (k:Person {name: $name}) RETURN k", parameters: { name: "Keanu Reeves" } },
        options,
    );
    const near = await loadFromSource(
        "neo4j",
        { database: "movies", mode: "neighborhood", ids: [...keanu.snapshot.ids], depth: 1 },
        options,
    );
    check(near.snapshot.nodeCount > 1, `Keanu Reeves' neighborhood: ${near.snapshot.nodeCount} nodes`);
    const err: unknown = await loadFromSource(
        "neo4j",
        { database: "movies", query: "MATCH (n RETURN n" },
        options,
    ).catch((e: unknown) => e);
    const params = err instanceof ImportError ? err.issue?.params : undefined;
    check(
        params?.line === 1 && params.column === 10,
        `syntax error at line ${String(params?.line)}, column ${String(params?.column)}`,
    );
    const scalars: unknown = await loadFromSource(
        "neo4j",
        { database: "movies", query: "RETURN 1 AS one" },
        options,
    ).catch((e: unknown) => e);
    check(
        scalars instanceof ImportError && scalars.issue?.code === "E_SOURCE_NOT_A_GRAPH",
        "a scalar result is not a graph",
    );
    const probe = await probeSource("neo4j", { database: "movies" }, options);
    check(
        probe.server?.product === "Neo4j" && typeof probe.server.version === "string",
        `probe: ${JSON.stringify(probe.server)}`,
    );
    save("movies-queries", r.recordings);
}

// 4. Metformin's neighborhood from Hetionet (Neo4j 3.5) over Bolt
{
    const { snapshot, report } = await loadFromSource(
        "neo4j",
        { mode: "neighborhood", idProperty: "name", ids: ["Metformin"], depth: 1 },
        { endpoint: HETIONET },
    );
    check(
        snapshot.nodeCount === 230 && snapshot.edgeCount === 229,
        `Metformin: ${snapshot.nodeCount} nodes / ${snapshot.edgeCount} edges`,
    );
    check(
        report.source?.server?.version?.startsWith("3.5") === true,
        `Hetionet: ${JSON.stringify(report.source?.server)}`,
    );
}
