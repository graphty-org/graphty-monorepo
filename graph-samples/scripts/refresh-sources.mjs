#!/usr/bin/env node
/**
 * Fetch every redistributable dataset source (scripts/hosted-sources.mjs) from its ORIGINAL host into
 * a directory, verify each against its recorded SHA-256, and list the ones fetched in SHA256SUMS there.
 * The graph-samples-sources.yml workflow (dispatched by hand) runs it and uploads them to the release
 * graph-samples-sources-v1, the copy that rebuilds use instead of the original hosts.
 *
 *     node scripts/refresh-sources.mjs <dir>
 *
 * A source that cannot be fetched is reported and skipped; the exit status is 1 when any was.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { fetchSource, SOURCES } from "./hosted-sources.mjs";

const dir = path.resolve(process.argv[2] ?? "tmp/graph-samples-sources-refresh");
const sums = [];
let failed = 0;
for (const source of Object.values(SOURCES)) {
    if (!source.redistribute) {
        console.log(`skipping ${source.file}: not redistributable (graph-samples/NOTICE)`);
        continue;
    }
    try {
        await fetchSource(source, dir, { fromOriginalHost: true });
        sums.push(`${source.sha256}  ${source.file}\n`);
    } catch (error) {
        const cause = error.cause ? " (" + error.cause.message + ")" : "";
        console.error(`FAILED ${source.file}: ${error.message}${cause}`);
        failed++;
    }
}
writeFileSync(path.join(dir, "SHA256SUMS"), sums.join(""));
console.log(`${sums.length} sources in ${dir}, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
