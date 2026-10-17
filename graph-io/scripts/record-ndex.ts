/**
 * The NDEx source against the live www.ndexbio.org: an opt-in check, never run by CI.
 *
 *   pnpm exec tsx scripts/record-ndex.ts           # load the samples live and check their counts
 *   pnpm exec tsx scripts/record-ndex.ts --write   # also rewrite test/sources/ndex/recordings/
 *
 * Every exchange is recorded through `recordingFrom`, which keeps no request header and only the
 * response's Content-Type, so a recording holds no credential.
 */

import { writeFileSync } from "node:fs";

import {
    credentials,
    expandFromSource,
    ImportError,
    listFromSource,
    loadFromSource,
    probeSource,
    type Recording,
    recordingFrom,
} from "../src/index.js";
import { ndexSource } from "../src/sources/ndex/index.js";

const WP5483 = "86719f5b-1439-11f0-9806-005056ae3c32";
const PCNET = "8b4b54fa-e87d-11ee-9621-005056ae23aa";
const EZH2 = 1245568;
const OUT = new URL("../test/sources/ndex/recordings/", import.meta.url);
const write = process.argv.includes("--write");
const failures: string[] = [];

/**
 * A fetch that records every exchange it makes.
 * @returns the fetch and what it recorded
 */
function recorder(): { fetch: typeof fetch; recordings: Recording[] } {
    const recordings: Recording[] = [];
    const record = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const request = new Request(input, init);
        const response = await fetch(request.clone());
        recordings.push(await recordingFrom(request.clone(), response.clone()));
        return response;
    };
    return { fetch: record as typeof fetch, recordings };
}

/**
 * Check one fact, remembering a failure.
 * @param what - what is checked
 * @param ok - whether it holds
 * @param seen - what was seen
 */
function check(what: string, ok: boolean, seen: unknown): void {
    console.log(`${ok ? "ok  " : "FAIL"} ${what}: ${JSON.stringify(seen)}`);
    if (!ok) {
        failures.push(what);
    }
}

/**
 * Run one case and save its recordings.
 * @param name - the recordings file name
 * @param run - the case, given a recording fetch
 */
async function recordCase(name: string, run: (f: typeof fetch) => Promise<void>): Promise<void> {
    const { fetch: f, recordings } = recorder();
    await run(f);
    if (write) {
        writeFileSync(new URL(`${name}.json`, OUT), `${JSON.stringify(recordings, null, 4)}\n`);
    }
}

/**
 * The issue a failed call rejected with.
 * @param promise - the call
 * @returns its code and params
 */
async function issueOf(promise: Promise<unknown>): Promise<unknown> {
    const err: unknown = await promise.then(
        () => null,
        (e: unknown) => e,
    );
    return err instanceof ImportError ? { code: err.issue?.code, params: err.issue?.params } : String(err);
}

await recordCase("wp5483-cx2", async (f) => {
    const { snapshot, format, report } = await loadFromSource(ndexSource, { uuid: WP5483 }, { fetch: f });
    check("WP5483 as CX2", snapshot.nodeCount === 57 && snapshot.edgeCount === 34 && format === "cx2", [
        snapshot.nodeCount,
        snapshot.edgeCount,
        format,
        report.source?.validators,
    ]);
});

await recordCase("wp5483-cx", async (f) => {
    const { snapshot, format } = await loadFromSource(ndexSource, { uuid: WP5483, format: "cx" }, { fetch: f });
    check("WP5483 as CX", snapshot.nodeCount === 57 && snapshot.edgeCount === 34 && format === "cx", [
        snapshot.nodeCount,
        snapshot.edgeCount,
    ]);
});

await recordCase("search", async (f) => {
    const listing = await listFromSource(ndexSource, { params: {}, search: "WP5483", size: 5 }, { fetch: f });
    check(
        "search WP5483",
        listing.items.some((i) => i.params.uuid === WP5483),
        listing.items.map((i) => i.params.uuid),
    );
});

await recordCase("expand", async (f) => {
    const { snapshot } = await expandFromSource(
        ndexSource,
        { params: { uuid: WP5483 }, ids: [EZH2], depth: 1 },
        { fetch: f },
    );
    check("expand EZH2", snapshot.ids.has(EZH2) && snapshot.nodeCount === 2, [...snapshot.ids]);
});

await recordCase("pcnet-summary", async (f) => {
    const probe = await probeSource(ndexSource, { uuid: PCNET }, { fetch: f });
    check("PCNet probe", probe.counts?.edges === 3_323_928, probe.counts);
    const issue = await issueOf(loadFromSource(ndexSource, { uuid: PCNET }, { fetch: f, limits: { maxBytes: 1e8 } }));
    check("PCNet over maxBytes", JSON.stringify(issue).includes("E_SOURCE_LIMIT"), issue);
});

await recordCase("not-found", async (f) => {
    const issue = await issueOf(
        loadFromSource(ndexSource, { uuid: "00000000-0000-0000-0000-000000000000" }, { fetch: f }),
    );
    check("unknown network", JSON.stringify(issue).includes("E_SOURCE_NOT_FOUND"), issue);
});

await recordCase("auth", async (f) => {
    const issue = await issueOf(
        loadFromSource(ndexSource, { uuid: WP5483 }, { fetch: f, credential: credentials.basic("no-such-user", "x") }),
    );
    check("an unknown user", JSON.stringify(issue).includes("E_SOURCE_AUTH"), issue);
});

// a route NDEx does not have answers 500 with a Java stack trace; the tests replay that body
await recordCase("server-error", async (f) => {
    const response = await f(`https://www.ndexbio.org/v3/networks/${WP5483}/no-such-route`);
    check("an unknown route", response.status === 500, response.status);
});

if (failures.length > 0) {
    console.log(`${String(failures.length)} check(s) failed`);
    process.exitCode = 1;
}
