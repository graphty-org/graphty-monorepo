/**
 * Records the live SPARQL responses the SPARQL source tests replay. Run it by hand when the
 * servers' answers change:
 *
 *     pnpm exec tsx scripts/record-sparql.ts [--write]
 *
 * - The paging case: Wikidata's physics laureates and their advisors, capped so it takes two loads
 *   (a first page and a Load more), and one expansion of the first node:
 *   test/sources/sparql/recordings/wikidata-advisors.json.
 * - Every example of the sparql source's descriptor, loaded whole:
 *   test/sources/sparql/recordings/<example id>.json.
 *
 * Without `--write` it loads everything and prints the counts, writing nothing.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expandFromSource, loadFromSource, type Recording, recordingFrom } from "../src/index.js";
import { sparqlSource } from "../src/sources/sparql/index.js";
import { WIKIDATA_ADVISORS, WIKIDATA_ENDPOINT } from "../test/sources/sparql/advisors.js";

const WRITE = process.argv.includes("--write");
// Wikidata answers 403 to a request without a descriptive User-Agent.
const USER_AGENT = "graphty-tests/0.1 (https://graphty.app)";

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
 * Write one recording file when asked to.
 * @param name - the file name, without extension
 * @param recordings - the recordings
 */
function save(name: string, recordings: readonly Recording[]): void {
    const out = fileURLToPath(new URL(`../test/sources/sparql/recordings/${name}.json`, import.meta.url));
    if (WRITE) {
        writeFileSync(out, `${JSON.stringify(recordings, null, 4)}\n`);
    }
    const where = WRITE ? `-> ${out}` : "";
    process.stdout.write(`${String(recordings.length)} responses ${where}\n`);
}

{
    const r = recorder();
    const options = { endpoint: WIKIDATA_ENDPOINT, fetch: r.fetch, userAgent: USER_AGENT };
    const first = await loadFromSource(sparqlSource, WIKIDATA_ADVISORS, { ...options, limits: { maxNodes: 150 } });
    await loadFromSource(sparqlSource, WIKIDATA_ADVISORS, {
        ...options,
        limits: { maxNodes: 150 },
        cursor: first.report.source?.next,
    });
    await expandFromSource(
        sparqlSource,
        { params: WIKIDATA_ADVISORS, ids: [first.snapshot.ids.idOf(0)], limit: 40 },
        options,
    );
    save("wikidata-advisors", r.recordings);
}

for (const example of sparqlSource.descriptor?.examples ?? []) {
    const r = recorder();
    const { snapshot } = await loadFromSource(sparqlSource, example.params, {
        endpoint: example.endpoint,
        fetch: r.fetch,
        userAgent: USER_AGENT,
    });
    process.stdout.write(`${example.id}: ${String(snapshot.nodeCount)} nodes / ${String(snapshot.edgeCount)} edges, `);
    save(example.id, r.recordings);
}
