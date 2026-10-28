// The CI page's job sections (design/ci/health-dashboard.md, section 4.3): chronically failing jobs, the jobs allowed
// to fail with their pass rates, and benchmark trends. Each reads its own record, never a lane's verdict.

import type { Cell, Fact, Section, TableRow } from "../../web/src/contract.js";
import { isJob } from "../collector/jobs.js";
import { readBenches, trend } from "../model/benchmarks.js";
import { readSnapshot } from "../model/snapshots.js";
import { iso, type Reads } from "./members.js";
import { notCollected } from "./sections.js";

const f = (code: string, params?: Fact["params"]): Fact => (params ? { code, params } : { code });
const none: Cell = { t: "none" };
const name = (v: string): Cell => ({ t: "name", v });
const pct = (n: number): number => Math.round(n * 100);
const jobCell = (workflow: string, job: string): Cell => ({ t: "sub", main: name(job), sub: name(workflow) });

/**
 * Chronically failing jobs: each with its failures in its newest runs, its last pass and its issue; one with no
 * open issue is marked red.
 * @param reads
 */
export async function chronicTable(reads: Reads): Promise<Section> {
    const list = await readSnapshot(reads.store, "chronic-jobs");
    if (!list) return notCollected("chronic");
    if (!list.length) return { kind: "empty", id: "chronic", fact: f("ci.no_chronic") };
    const rows: TableRow[] = list.map((j) => ({
        cells: {
            job: jobCell(j.workflow, j.job),
            failed: { t: "num", n: j.failed, of: j.runs },
            rate: { t: "num", n: pct(j.failed / j.runs), unit: "pct" },
            pass:
                j.lastPassAt === undefined
                    ? { t: "fact", fact: f("ci.no_pass", { days: 14 }) }
                    : { t: "ago", at: iso(j.lastPassAt) },
            issue:
                j.issue === undefined
                    ? { t: "mark", state: "bad", cell: { t: "fact", fact: f("ci.no_issue") } }
                    : { t: "issue", n: j.issue },
        },
    }));
    return { kind: "table", id: "chronic", rows };
}

/**
 * Allowed to fail, and failing: every job ci.yml lets fail (job-level continue-on-error) with its pass rate over 7
 * days, in every run kind, worst first; failing in half its runs or more is marked red.
 * @param reads
 */
export async function nonGatingTable(reads: Reads): Promise<Section> {
    const jobs = await readSnapshot(reads.store, "non-gating");
    if (!jobs) return notCollected("non-gating");
    const dims = Object.entries((await reads.window("ci.job_outcome", "7d")).total.dims ?? {});
    const rows = jobs.map((pattern) => {
        let n = 0;
        let failed = 0;
        for (const [dim, a] of dims) {
            const [, job] = JSON.parse(dim) as [string, string];
            if (!isJob(pattern, job)) continue;
            n += a.n;
            failed += a.sum;
        }
        return { pattern, n, failed };
    });
    rows.sort(
        (a, b) => (b.n ? b.failed / b.n : -1) - (a.n ? a.failed / a.n : -1) || a.pattern.localeCompare(b.pattern),
    );
    return {
        kind: "table",
        id: "non-gating",
        rows: rows.map(({ pattern, n, failed }) => {
            const rate: Cell = n ? { t: "num", n: pct((n - failed) / n), unit: "pct" } : none;
            return {
                cells: {
                    job: name(pattern),
                    runs: { t: "num", n },
                    failed: { t: "num", n: failed },
                    rate: n && failed * 2 >= n ? { t: "mark", state: "bad", cell: rate } : rate,
                },
                ...(n ? {} : { past: true }),
            };
        }),
    };
}

/**
 * Benchmark trends: each benchmark's newest results, the median of the last 3 against the 10 before them, and its
 * results as a line (one point per run); a sustained regression is marked red, and listed first.
 * @param reads
 */
export async function benchmarksTable(reads: Reads): Promise<Section> {
    const benches = await readBenches(reads.store, reads.now);
    if (!benches.length) return { kind: "empty", id: "benchmarks", fact: f("ci.no_benchmarks") };
    const rows = benches.map((b) => ({ b, t: trend(b.points) }));
    rows.sort((x, y) => (y.t.ratio ?? 0) - (x.t.ratio ?? 0) || x.b.benchmark.localeCompare(y.b.benchmark));
    return {
        kind: "table",
        id: "benchmarks",
        rows: rows.map(({ b, t }) => {
            const v = b.points.map((p) => p.v);
            const ratio: Cell =
                t.ratio === undefined ? none : { t: "num", n: Math.round(t.ratio * 100) / 100, unit: "x" };
            return {
                cells: {
                    benchmark: name(b.benchmark),
                    latest: { t: "num", n: Math.round(v.at(-1) ?? 0), unit: "ms" },
                    ratio: t.regressed ? { t: "mark", state: "bad", cell: ratio } : ratio,
                    spark: {
                        t: "spark",
                        spark: {
                            step: "1d",
                            ctx: [],
                            trend: v,
                            breach: v.map(() => null),
                        },
                    },
                    runs: { t: "num", n: b.points.length },
                },
            };
        }),
    };
}
