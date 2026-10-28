// post-benchmarks.mjs -- sends a benchmark job's numbers to the pipeline health API, which keeps each benchmark's
// trend and flags a sustained regression (design/ci/health-dashboard.md, section 4.3).
//
//   node tools/results/post-benchmarks.mjs <source> <results file>...
//
// Reads the newest session of each file, in either shape the repository writes:
//   - algorithms' benchmark-results/benchmark-sessions-<platform>-<type>.json: [{ results: [{ algorithm, graphSize,
//     executionTime }] }], one row per algorithm and graph size;
//   - the benchmark harness of webgpu-graph-algorithms (benchmarks/out/<runner class>.json): [{ results: [{ group,
//     name, medianMs }] }], one row per group and name.
// Fire and forget: a missing file, an unreadable one or an API that does not answer is a line on stderr, and the
// exit code is always 0, so the numbers never fail the job that measured them.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { flushHealth, postBenchmarks } from "./client.mjs";

/**
 * The rows of one results file's newest session.
 * @param data the parsed file: a session or a list of them
 * @returns `{ name, value }` rows in milliseconds
 */
export function benchmarkRows(data) {
    const sessions = Array.isArray(data) ? data : [data];
    const results = sessions.at(-1)?.results ?? [];
    return results.flatMap((r) => {
        if (typeof r.algorithm === "string" && Number.isFinite(r.executionTime))
            return [{ name: `${r.algorithm} n=${r.graphSize}`, value: r.executionTime }];
        if (typeof r.name === "string" && Number.isFinite(r.medianMs))
            return [{ name: r.group ? `${r.group} / ${r.name}` : r.name, value: r.medianMs }];
        return [];
    });
}

async function main(argv, env) {
    const [source, ...files] = argv;
    if (!source || !files.length) {
        console.error("usage: post-benchmarks.mjs <source> <results file>...");
        return;
    }
    const rows = [];
    for (const f of files) {
        try {
            rows.push(...benchmarkRows(JSON.parse(readFileSync(f, "utf8"))));
        } catch (e) {
            console.error(`post-benchmarks: ${f}: ${e instanceof Error ? e.message : e}`);
        }
    }
    const sent = postBenchmarks(env, source, rows);
    console.error(`post-benchmarks: ${rows.length} ${source} results${sent ? " sent" : ", not sent (no health API)"}`);
    await flushHealth();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv.slice(2), process.env);
