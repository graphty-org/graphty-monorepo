/**
 * Records the live Wikidata responses the SPARQL source tests replay: the sparql source's sample
 * query, capped so it takes two loads (a first page pair and a Load more), and one expansion of the
 * first node. Writes test/sources/sparql/recordings/wikidata-advisors.json. Run it by hand when
 * Wikidata's answers change:
 *
 *     pnpm exec tsx scripts/record-sparql.ts
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expandFromSource, loadFromSource, type Recording, recordingFrom } from "../src/index.js";
import { sparqlSource } from "../src/sources/sparql/index.js";

const OUT = fileURLToPath(new URL("../test/sources/sparql/recordings/wikidata-advisors.json", import.meta.url));

const recordings: Recording[] = [];
const recording: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const response = await fetch(request.clone());
    recordings.push(await recordingFrom(request, response.clone()));
    return response;
};

const sample = sparqlSource.descriptor?.samples?.[0];
if (sample === undefined) {
    throw new Error("the sparql source has no sample");
}
const options = { endpoint: sample.endpoint, fetch: recording, userAgent: "graphty-tests/0.1 (https://graphty.app)" };
const first = await loadFromSource(sparqlSource, sample.params, { ...options, limits: { maxNodes: 150 } });
await loadFromSource(sparqlSource, sample.params, {
    ...options,
    limits: { maxNodes: 150 },
    cursor: first.report.source?.next,
});
await expandFromSource(sparqlSource, { params: sample.params, ids: [first.snapshot.ids.idOf(0)], limit: 40 }, options);
writeFileSync(OUT, `${JSON.stringify(recordings, null, 4)}\n`);
process.stdout.write(`${String(recordings.length)} responses -> ${OUT}\n`);
