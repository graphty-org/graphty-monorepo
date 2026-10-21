/**
 * Records the live responses the REST source tests replay: runs each case against the public
 * service with a fetch that keeps every request and response, and writes them to
 * test/sources/rest/recordings/<case>.json. No credential is used, and api_key is removed from
 * every recorded URL. Run it by hand when a service changes shape:
 *
 *     pnpm exec tsx scripts/record-rest.ts [case ...]
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expandFromSource, loadFromSource, type Recording, recordingFrom } from "../src/index.js";
import { DEPS_DEV_MAPPING, openalexSource, restMappingSource, STRING_MAPPING } from "../src/sources/rest/index.js";

const OUT = fileURLToPath(new URL("../test/sources/rest/recordings/", import.meta.url));

/** Response headers worth keeping: paging, validators and the budget. */
const KEEP = ["link", "etag", "last-modified", "x-ratelimit-remaining", "x-ratelimit-reset"];

/** What the cases share: a fetch that records. */
type Run = (fetch: typeof globalThis.fetch) => Promise<unknown>;

const CASES: Record<string, Run> = {
    // the seed, the first page of citing works, and the keyless second page's 401
    "openalex-w2112090702": (fetch) => loadFromSource(openalexSource, { work: "W2112090702" }, { fetch }),
    // the full records of three referenced works (stubs of the load above)
    "openalex-hydrate": (fetch) =>
        expandFromSource(
            openalexSource,
            { params: {}, ids: ["W111157985", "W201336350", "W584762224"], depth: 0 },
            { fetch },
        ),
    // the co-authors of Gephi's first author
    "openalex-coauthors": (fetch) =>
        loadFromSource(openalexSource, { author: "A5055156518", graph: "coauthorship" }, { fetch }),
    "string-tp53": (fetch) =>
        loadFromSource(
            restMappingSource,
            { mapping: STRING_MAPPING, identifiers: "TP53", species: "9606", add_nodes: "20" },
            { fetch },
        ),
    "deps-dev-webpack": (fetch) =>
        loadFromSource(
            restMappingSource,
            { mapping: DEPS_DEV_MAPPING, system: "npm", package: "webpack", version: "5.90.0" },
            { fetch },
        ),
};

/**
 * Record one case.
 * @param name - the case
 * @param run - what it loads
 */
async function record(name: string, run: Run): Promise<void> {
    const recordings: Recording[] = [];
    const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const request = new Request(input, init);
        const response = await globalThis.fetch(request.clone());
        const rec = await recordingFrom(request, response.clone(), { keepHeaders: KEEP, secretQuery: ["api_key"] });
        let { body } = rec;
        try {
            body = JSON.parse(String(rec.body)) as unknown;
        } catch {
            // not JSON: kept as text
        }
        recordings.push({ ...rec, body });
        return response;
    };
    await run(fetch).catch((err: unknown) => {
        process.stdout.write(`${name}: ${err instanceof Error ? err.message : String(err)}\n`);
    });
    // one recording per line: small diffs when a service changes one answer
    writeFileSync(`${OUT}${name}.json`, `[\n${recordings.map((r) => JSON.stringify(r)).join(",\n")}\n]\n`);
    process.stdout.write(`${name}: ${String(recordings.length)} responses\n`);
}

mkdirSync(OUT, { recursive: true });
const wanted = process.argv.slice(2);
for (const [name, run] of Object.entries(CASES)) {
    if (wanted.length === 0 || wanted.includes(name)) {
        await record(name, run);
    }
}
