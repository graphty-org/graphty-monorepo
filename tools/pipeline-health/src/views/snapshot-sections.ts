// Sections built from the collector's "now" lists (src/model/snapshots.ts) and the pull request stage rollup:
// Pull requests (time, owner), Flaky tests (quarantine) and Releases (lanes, trains, workflows). A list the
// collector has not written yet is "not collected", never an empty table.

import type { Cell, Fact, Range, Section, TableRow } from "../../web/src/contract.js";
import { quantile } from "../model/histogram.js";
import { MIN } from "../model/items.js";
import { type LaneJob, readSnapshot, type ReleaseSeen, type WorkflowState } from "../model/snapshots.js";
import { iso, type Reads } from "./members.js";
import { notCollected } from "./sections.js";

const f = (code: string, params?: Fact["params"]): Fact => (params ? { code, params } : { code });
const none: Cell = { t: "none" };
const fact = (code: string, params?: Fact["params"]): Cell => ({ t: "fact", fact: f(code, params) });
const STAGES = ["runners", "checks", "red", "merging"] as const;
/** Merged pull requests a window needs before its medians mean anything; fewer widens to the next range. */
export const MIN_MERGED = 3;
const WIDER: Partial<Record<Range, Range>> = { "1h": "6h", "6h": "24h" };

/**
 * Where the time goes (4.2): median minutes per stage of the pull requests merged in the range, widened while
 * the window holds fewer than MIN_MERGED.
 * @param reads
 * @param range
 */
export async function prTime(reads: Reads, range: Range): Promise<Section> {
    const count = async (r: Range) => {
        const { total } = await reads.window("pr.stage_time", r);
        return { total, n: total.dims?.runners?.n ?? 0 };
    };
    const first = await count(range);
    let at = range;
    let got = first;
    while (got.n < MIN_MERGED && WIDER[at]) {
        at = WIDER[at] as Range;
        got = await count(at);
    }
    if (!got.n) return { kind: "empty", id: "time", fact: f("section.no_events", { metric: "pr.stage_time" }) };
    const items = STAGES.map((s) => {
        const a = got.total.dims?.[s];
        const med = a?.hist ? (quantile(a.hist, 0.5) ?? 0) : 0;
        return { label: { t: "label", code: `stage.${s}` } as Cell, n: Math.round(med / MIN), unit: "min" as const };
    });
    return {
        kind: "bars",
        id: "time",
        groups: [{ items }],
        ...(at === range ? {} : { widened: { from: range, to: at, n: first.n, nTo: got.n } }),
    };
}

/**
 * Waiting on the owner (4.2): open pull requests with auto-merge off by rule, oldest first, each naming the
 * failing release workflow it would fix (its title names the workflow file).
 * @param reads
 */
export async function ownerTable(reads: Reads): Promise<Section> {
    const list = await readSnapshot(reads.store, "owner-wait");
    if (!list) return notCollected("owner");
    const failing = ((await readSnapshot(reads.store, "release-workflows")) ?? []).filter((w) => w.inRow > 0);
    const rows: TableRow[] = list
        .toSorted((a, b) => a.since - b.since)
        .map((p) => {
            const why: Cell[] = [];
            if (p.paths.length) why.push(fact("owner.why", { paths: p.paths }));
            if (p.breaking) why.push(fact("owner.breaking"));
            for (const l of p.labels) why.push(fact("owner.label", { label: l }));
            const fixes = failing.find((w) => p.title.includes(w.workflow));
            if (fixes) why.push({ t: "mark", state: "bad", cell: fact("owner.fixes", { workflow: fixes.workflow }) });
            return {
                cells: {
                    pr: {
                        t: "list",
                        items: [
                            { t: "pr", n: p.number },
                            { t: "name", v: p.title },
                        ],
                        sep: "space",
                    },
                    why: why.length ? { t: "list", items: why, sep: "comma" } : none,
                    waiting: { t: "dur", s: Math.round((reads.now - p.since) / 1000) },
                },
            };
        });
    return { kind: "table", id: "owner", rows };
}

/**
 * The committed quarantine list (tools/test-quarantine.json on master).
 * @param reads
 */
export async function quarantineTable(reads: Reads): Promise<Section> {
    const list = await readSnapshot(reads.store, "quarantine");
    if (!list) return notCollected("quarantine");
    if (!list.length) return { kind: "empty", id: "quarantine", fact: f("flaky.quarantine.empty") };
    const rows: TableRow[] = list.map((q) => ({
        cells: {
            test: {
                t: "list",
                items: [
                    { t: "name", v: q.file },
                    { t: "name", v: q.name },
                ],
                sep: "line",
            },
            family: q.family ? { t: "name", v: q.family } : none,
            issue: q.issue ? { t: "issue", n: q.issue } : none,
            since: q.since ? { t: "time", at: q.since } : none,
            expires: q.expires ? { t: "time", at: q.expires } : none,
        },
    }));
    return { kind: "table", id: "quarantine", rows };
}

const attempts = (seen: Record<string, ReleaseSeen>) =>
    Object.values(seen).toSorted((a, b) => (b.created ?? b.at) - (a.created ?? a.at));

const laneJobCell = (j: LaneJob | undefined): Cell => {
    if (!j) return none;
    return j.n > 1 ? fact("lane.jobs", { workflow: j.job, jobs: j.n }) : fact("lane.job", { job: j.job, s: j.s });
};

const ORDER: Record<string, number> = { failed: 0, running: 1, passed: 2 };

/**
 * Lanes on the candidate (4.5): each lane of the newest attempt that tested, failed first; skipped lanes in one
 * muted row.
 * @param reads
 */
export async function lanesTable(reads: Reads): Promise<Section> {
    const seen = await readSnapshot(reads.store, "release");
    const a = seen && attempts(seen).find((x) => x.tested && x.lanes);
    if (!a?.lanes) return notCollected("lanes");
    const entries = Object.entries(a.lanes).filter(([, r]) => r !== "absent" && r !== "not in this mode");
    const ran = entries
        .filter(([, r]) => r !== "skipped")
        .toSorted(([, x], [, y]) => (ORDER[x] ?? 3) - (ORDER[y] ?? 3));
    const skipped = entries.filter(([, r]) => r === "skipped").map(([l]) => l);
    const rows: TableRow[] = ran.map(([lane, r]) => {
        const j = a.jobs?.[lane];
        return {
            cells: {
                lane: { t: "name", v: lane },
                result: r === "failed" ? { t: "mark", state: "bad", cell: fact("lane.failed") } : fact(`lane.${r}`),
                since: j?.redAt ? { t: "time", at: iso(j.redAt) } : none,
                job: laneJobCell(j),
            },
        };
    });
    if (skipped.length) {
        rows.push({
            past: true,
            cells: { lane: { t: "name", v: skipped.join(", ") }, result: fact("lane.skipped"), since: none, job: none },
        });
    }
    return {
        kind: "table",
        id: "lanes",
        sub: f("releases.lanes.sub", { sha: a.sha.slice(0, 9), run: a.run ?? 0, at: iso(a.created ?? a.at) }),
        rows,
    };
}

/** One attempt's outcome as a fact code and params. */
function outcome(a: ReleaseSeen, testedShas: Set<string>): { code: string; params?: Fact["params"] } {
    if (a.tested && a.red.length) return { code: "train.tested_failed", params: { lanes: a.red } };
    if (a.tested) return { code: "train.tested_passed" };
    if (a.ok === false && a.failedJob) return { code: "train.failed_before", params: { job: a.failedJob } };
    return testedShas.has(a.sha) ? { code: "train.nothing_new" } : { code: "train.untested" };
}

/**
 * Train attempts (4.5): the newest release.yml attempts read, newest first; runs of "nothing new" fold into one
 * muted row.
 * @param reads
 */
export async function trainsTable(reads: Reads): Promise<Section> {
    const seen = await readSnapshot(reads.store, "release");
    if (!seen) return notCollected("trains");
    const all = attempts(seen);
    const tested = new Set(all.filter((a) => a.tested).map((a) => a.sha));
    const rows: (TableRow & { code: string })[] = [];
    for (const a of all) {
        const o = outcome(a, tested);
        const time: Cell = { t: "time", at: iso(a.created ?? a.at) };
        const sha: Cell = { t: "sha", v: a.sha };
        const prev = rows.at(-1);
        if (o.code === "train.nothing_new" && prev?.code === o.code) {
            const at = prev.cells.attempt as Extract<Cell, { t: "list" }>;
            const shas = prev.cells.candidate as Extract<Cell, { t: "list" }>;
            at.items.push(time);
            if (!shas.items.some((c) => c.t === "sha" && c.v === a.sha)) shas.items.push(sha);
            continue;
        }
        const lanes = fact(o.code, o.params);
        rows.push({
            code: o.code,
            ...(o.code === "train.nothing_new" ? { past: true } : {}),
            cells: {
                attempt: { t: "list", items: [time], sep: "comma" },
                candidate: { t: "list", items: [sha], sep: "comma" },
                lanes: o.code === "train.untested" ? { t: "mark", state: "warn", cell: lanes } : lanes,
            },
        });
    }
    return { kind: "table", id: "trains", rows: rows.map(({ code: _c, ...r }) => r) };
}

/**
 * Release workflows (4.5): release.yml, promote.yml and release-watch.yml, the last hour's runs and a failing
 * streak. ponytail: no cause column yet (needs the failed run's log); add when a writer records it.
 * @param reads
 */
export async function workflowsTable(reads: Reads): Promise<Section> {
    const list = await readSnapshot(reads.store, "release-workflows");
    if (!list) return notCollected("workflows");
    const runs = (w: WorkflowState): Cell => {
        if (!w.failed && !w.inRow) return { t: "num", n: w.runs };
        const items: Cell[] = [];
        if (w.failed)
            items.push({ t: "mark", state: "bad", cell: fact("wf.failed_of", { failed: w.failed, runs: w.runs }) });
        if (w.inRow) items.push(fact("wf.in_a_row", { n: w.inRow }));
        return { t: "list", items, sep: "comma" };
    };
    const rows: TableRow[] = list
        .toSorted((a, b) => b.inRow - a.inRow)
        .map((w) => ({
            ...(w.inRow || w.runs ? {} : { past: true }),
            cells: {
                workflow: { t: "name", v: w.workflow },
                runs: runs(w),
                since: w.since ? { t: "time", at: iso(w.since) } : none,
                cause: none,
            },
        }));
    return { kind: "table", id: "workflows", rows };
}
