// The two drill-downs answered from index items rather than precomputed pages (items.ts, indexKeys): one run with
// its jobs (GET /v1/run/<id>) and one test file's or test's failures (GET /v1/test-history).

import type { RunResponse, TestHistoryResponse } from "../../web/src/contract.js";
import { DAY, skTime, type JobItem, type RunItem, type ShardRunItem, type TestItem } from "./items.js";
import { isLive, type Store } from "./store.js";

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
const isoOrNull = (t: number | undefined) => (t === undefined ? null : iso(t));
const CANCEL: Record<string, RunResponse["cancel"]> = { superseded: "superseded", "by-hand": "by-hand", red: "other" };

/** The newest attempt of a run and that attempt's jobs, or undefined when the run was never stored. */
export async function runDrill(store: Store, runId: number, nowMs: number): Promise<RunResponse | undefined> {
    const rows = (await store.query(`RUN#${runId}`)).filter((i) => isLive(i, nowMs));
    const runs = rows.filter((i) => i.sk.startsWith("run#")) as unknown as RunItem[];
    const run = runs.sort((a, b) => b.attempt - a.attempt)[0];
    if (!run) return undefined;
    const jobs = (rows.filter((i) => i.sk.startsWith("job#")) as unknown as JobItem[])
        .filter((j) => j.attempt === run.attempt)
        .sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name));
    return {
        generated: iso(nowMs),
        id: run.runId,
        repo: run.repo,
        workflow: run.workflow,
        event: run.event,
        sha: run.sha,
        ...(run.pr === undefined ? {} : { pr: run.pr }),
        attempt: run.attempt,
        created: iso(run.createdAt),
        conclusion: run.status === "completed" ? ((run.conclusion ?? null) as RunResponse["conclusion"]) : null,
        ...(run.cancelClass ? { cancel: CANCEL[run.cancelClass] } : {}),
        jobs: jobs.map((j) => ({
            name: j.name,
            conclusion: j.conclusion ?? null,
            created: iso(j.createdAt),
            started: isoOrNull(j.startedAt),
            completed: isoOrNull(j.completedAt),
        })),
    };
}

/**
 * A file's (or one test's) failed and flaky results in the range, newest first, joined to their shard runs for the
 * pull request, commit and kind; undefined when there are none.
 */
export async function testHistory(
    store: Store,
    q: { file: string; test?: string; range: "7d" | "28d" },
    nowMs: number,
): Promise<TestHistoryResponse | undefined> {
    const from = nowMs - (q.range === "28d" ? 28 : 7) * DAY;
    const live = (await store.query(`TESTH#${q.file}`, { from: skTime(from) })).filter((i) => isLive(i, nowMs));
    const tests = (live as unknown as TestItem[])
        .filter((t) => q.test === undefined || t.name === q.test)
        .sort((a, b) => b.seenAt - a.seenAt);
    if (!tests.length) return undefined;
    const shards = new Map<string, ShardRunItem | undefined>();
    for (const t of tests)
        if (!shards.has(t.invocation))
            shards.set(
                t.invocation,
                ((await store.query(`R#shard_run#${t.invocation}`)) as unknown as ShardRunItem[]).at(-1),
            );
    return {
        generated: iso(nowMs),
        range: q.range,
        file: q.file,
        ...(q.test === undefined ? {} : { test: q.test }),
        family: tests[0].family,
        events: tests.map((t) => {
            const s = shards.get(t.invocation);
            // A CI invocation id starts "<run id>.<run attempt>." (ingest.ts, runPrefix); a local one "local.".
            const [run, attempt] = t.invocation.split(".").map(Number);
            return {
                at: iso(t.seenAt),
                kind: t.source === "local" ? ("local" as const) : s?.full ? ("full" as const) : ("pr" as const),
                ...(s?.pr === undefined ? {} : { pr: s.pr }),
                run: Number.isFinite(run) ? run : 0,
                attempt: Number.isFinite(attempt) ? attempt : t.attempt,
                sha: s?.sha ?? "",
                outcome: t.outcome,
                ...(t.signature ? { signature: t.signature.slice(0, 200) } : {}),
            };
        }),
    };
}
