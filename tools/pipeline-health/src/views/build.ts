// Every payload the page fetches (web/src/contract.ts), built from the rollups and one evaluate() result: the
// status, the overview and each page at 1 h, 6 h and 24 h, Costs at 7 d and 28 d, and the slow sections at 7 d and
// 28 d. States, setters and episodes are the engine's; this only lays them out and reads values for each range.

import type {
    CategoryStatus,
    Episode,
    Fact,
    Member,
    MemberId,
    MemberRef,
    OverviewResponse,
    PageId,
    PageResponse,
    Range,
    Section,
    SectionResponse,
    SlowRange,
    SourceAge,
    SourceId,
    StatusResponse,
} from "../../web/src/contract.js";
import type { Store } from "../model/store.js";
import { SLAS, type SlaConfig } from "../sla/config.js";
import { categoryOf, type Evaluation, type MemberStatus, type SourceStatus } from "../sla/engine.js";
import type { ViewRoute } from "./keys.js";
import { CATEGORY, iso, LOCAL, localMember, memberAt, Reads, sourceState, SPEC } from "./members.js";
import { benchmarksTable, chronicTable, nonGatingTable } from "./job-sections.js";
import { lanesTable, ownerTable, prTime, quarantineTable, trainsTable, workflowsTable } from "./snapshot-sections.js";
import {
    causes,
    dimBars,
    holders,
    hotspots,
    jobs,
    masterStrip,
    moneyTable,
    NOT_COLLECTED,
    notCollected,
    notSetUpTable,
    redSpans,
    shards,
    shared,
    sourcesTable,
    stressTable,
    runnerMinutes,
    unitCosts,
    byWorkflow,
    superseded,
} from "./sections.js";

export type ViewBody = StatusResponse | OverviewResponse | PageResponse | SectionResponse;
export interface View {
    route: ViewRoute;
    body: ViewBody;
}

export const RANGES: Range[] = ["1h", "6h", "24h"];
export const SLOW_RANGES: SlowRange[] = ["7d", "28d"];
type CategoryPage = (typeof CATEGORY)[string];

/** The members of Runners (section 2.6): the runner rows of CI. */
/**
 * Members another category judges, also shown on a page because they are one of its sources: the Flaky page
 * names every flaky source (4.4), so it shows CI's rerun rate and the stress run. They never set its state.
 */
const ALSO_SHOWN: Partial<Record<PageId, string[]>> = { flaky: ["ci.reruns", "data.stress_run"] };

const RUNNERS = new Set([
    "ci.runner_wait",
    "ci.longest_queued",
    "ci.saturated_time",
    "ci.runners_not_assigned",
    "ci.superseded_running",
]);
/** The Data sources headline is "Sources past their age limit" under its own id. */
const HEADLINE_ID: Record<string, MemberId> = { "data.sources_age": "data-sources.sources_not_ok" };

/** A Local runs member's state from the local source's: a writing source is informational. */
const LOCAL_STATE: Record<SourceStatus["state"], Member["state"]> = {
    ok: "info",
    "not set up": "notsetup",
    idle: "idle",
    stale: "nodata",
    error: "nodata",
    thin: "nodata",
};

/**
 * The Local runs page's state from the local source's. Its members are informational and out of the rollup, so a
 * writing source gives a gray IDLE, never OK (3.2: OK names only an SLA state); a broken source is NO DATA.
 */
const LOCAL_PAGE: Record<SourceStatus["state"], PageResponse["state"]> = {
    ok: "idle",
    "not set up": "idle",
    idle: "idle",
    stale: "nodata",
    error: "nodata",
    thin: "nodata",
};

const f = (code: string, params?: Fact["params"]): Fact => (params ? { code, params } : { code });

const CATEGORY_STATE: Record<Evaluation["categories"][number]["state"], CategoryStatus["state"]> = {
    OK: "ok",
    WARNING: "warn",
    FAILING: "bad",
    "NO DATA": "nodata",
    IDLE: "idle",
};

/** Members of one page, in config order, one row per contract id. */
function membersOf(ev: Evaluation, page: CategoryPage | "runners"): MemberStatus[] {
    const seen = new Set<string>();
    return ev.members.filter((m) => {
        const spec = SPEC[m.id];
        const mine = page === "runners" ? RUNNERS.has(m.id) : CATEGORY[m.category] === page;
        if (!spec || !mine || seen.has(spec.id)) {
            return false;
        }
        seen.add(spec.id);
        return true;
    });
}

const refOf = (m: Member): MemberRef => ({ member: m.id, state: m.state, value: m.value });

class Builder {
    private readonly rows = new Map<string, Promise<Member>>();

    readonly reads: Reads;

    /**
     * @param reads
     */
    constructor(reads: Reads) {
        this.reads = reads;
    }

    /**
     * @param id
     * @param range
     * @param as
     */
    member(id: string, range: Range, as?: MemberId): Promise<Member> {
        const key = `${id}:${range}:${as ?? ""}`;
        let p = this.rows.get(key);
        if (!p) {
            const s = this.reads.ev.members.find((m) => m.id === id);
            if (!s) {
                throw new Error(`evaluate() returned no member ${id}`);
            }
            p = memberAt(this.reads, s, range, as);
            this.rows.set(key, p);
        }
        return p;
    }

    /**
     * @param c
     * @param range
     */
    async category(c: Evaluation["categories"][number], range: Range): Promise<CategoryStatus> {
        const id = CATEGORY[c.id];
        const head = c.headline ?? membersOf(this.reads.ev, id)[0]?.id;
        const ref = async (mid: string) => refOf(await this.member(mid, "1h"));
        return {
            id,
            state: CATEGORY_STATE[c.state],
            ...(c.setBy ? { setBy: await ref(c.setBy) } : {}),
            others: await Promise.all(c.others.map(ref)),
            headline: await this.member(head, range, HEADLINE_ID[head]),
        };
    }

    /**
     * @param range
     */
    async categories(range: Range): Promise<CategoryStatus[]> {
        return Promise.all(this.reads.ev.categories.map((c) => this.category(c, range)));
    }

    episodes(): Episode[] {
        return this.reads.ev.episodes
            .filter((e) => SPEC[e.member])
            .map((e) => {
                const spec = SPEC[e.member];
                const c = this.reads.config(e.member);
                const peak = e.peak === undefined ? undefined : Math.round(e.peak * (spec.k ?? 1) * 100) / 100;
                return {
                    id: `${spec.id}@${iso(e.start)}`,
                    category: CATEGORY[c.category],
                    member: spec.id,
                    worst: e.worst === "FAILING" ? "bad" : "warn",
                    start: iso(e.start),
                    end: e.endedAt === undefined ? null : iso(e.endedAt),
                    fact: f("ep.past_threshold", {
                        member: spec.id,
                        ...(peak === undefined ? {} : { peak, ...(spec.unit ? { unit: spec.unit } : {}) }),
                    }),
                    link: spec.link,
                };
            });
    }

    sources(): SourceAge[] {
        const ID: Record<string, SourceId> = { release: "releases" };
        const known = new Set<string>([
            "collector",
            "ci-results",
            "ci-timings",
            "releases",
            "npm",
            "stress",
            "hosts",
            "billing",
            "flaky-feed",
            "benchmarks",
            "local",
        ]);
        return this.reads.ev.sources
            .map((s) => ({ s, id: ID[s.id] ?? s.id }))
            .filter((x): x is { s: SourceStatus; id: SourceId } => known.has(x.id))
            .map(({ s, id }) => {
                const limit = this.reads.cfg.sources[s.id]?.yellowAfterMs;
                return {
                    id,
                    lastWrite: s.lastOkAt === undefined ? null : iso(s.lastOkAt),
                    limitS: limit === undefined ? null : limit / 1000,
                    state: sourceState(s),
                };
            });
    }

    async status(): Promise<StatusResponse> {
        return {
            generated: iso(this.reads.now),
            categories: await this.categories("1h"),
            episodes: this.episodes(),
            sources: this.sources(),
        };
    }

    /**
     * The three Local runs members: informational, read from the local writer's rollups (members.ts, LOCAL).
     * @param range
     */
    async local(range: Range): Promise<{ state: PageResponse["state"]; members: Member[] }> {
        const src = this.reads.ev.sources.find((s) => s.id === "local");
        const state: Member["state"] = src ? LOCAL_STATE[src.state] : "notsetup";
        const reason = src?.reason ? { code: `reason.${src.reason.code}`, params: { source: "local" } } : undefined;
        return {
            state: src ? LOCAL_PAGE[src.state] : "idle",
            members: await Promise.all(
                Object.keys(LOCAL).map((id) => localMember(this.reads, id, range, state, reason)),
            ),
        };
    }

    /**
     * @param page
     * @param range
     */
    async sections(page: Exclude<PageId, "overview" | "costs">, range: Range): Promise<Section[]> {
        const empty = (NOT_COLLECTED[page] ?? []).map(notCollected);
        switch (page) {
            case "master": {
                const strip = await masterStrip(this.reads, range);
                return [strip ?? notCollected("red"), redSpans(strip, this.reads.now), await shared(this.reads)];
            }
            case "ci":
                return [
                    await causes(this.reads, range),
                    await runnerMinutes(this.reads),
                    await shards(this.reads, "7d", "full"),
                    await chronicTable(this.reads),
                    await nonGatingTable(this.reads),
                    await benchmarksTable(this.reads),
                ];
            case "runners":
                return [await jobs(this.reads, range), await holders(this.reads), await superseded(this.reads)];
            case "flaky":
                // Every flaky source (4.4): CI's detections (hotspots), the committed quarantine list, the stress run.
                return [
                    await hotspots(this.reads, "7d"),
                    await quarantineTable(this.reads),
                    await stressTable(this.reads),
                    ...empty,
                ];
            case "pull-requests":
                return [await prTime(this.reads, range), await ownerTable(this.reads), ...empty];
            case "releases":
                return [
                    await lanesTable(this.reads),
                    await trainsTable(this.reads),
                    await workflowsTable(this.reads),
                    ...empty,
                ];
            case "data-sources":
                return [
                    ...empty,
                    await stressTable(this.reads),
                    sourcesTable(this.reads),
                    notSetUpTable(this.reads, this.reads.ev.members),
                ];
            case "local-runs":
                return [
                    await dimBars(this.reads, "runs", "local.runs", range, "n"),
                    await dimBars(this.reads, "shard-time", "local.shard_time", range, "median"),
                ];
            default:
                return empty;
        }
    }

    /**
     * @param page
     * @param range
     */
    async page(page: Exclude<PageId, "overview" | "costs">, range: Range): Promise<PageResponse> {
        const base = { page, range, generated: iso(this.reads.now), notes: [] as Fact[] };
        if (page === "local-runs") {
            const l = await this.local(range);
            return {
                ...base,
                state: l.state,
                others: [],
                members: l.members,
                sections: await this.sections(page, range),
            };
        }
        // Runners is a view of CI: its state is the rollup of its own members, never a CI member it does not show.
        const cat =
            page === "runners"
                ? await this.category(
                      categoryOf(
                          { id: "ci", label: "Runners" },
                          this.reads.ev.members.filter((m) => RUNNERS.has(m.id)),
                      ),
                      range,
                  )
                : (await this.categories(range)).find((c) => c.id === page);
        const ids = [...membersOf(this.reads.ev, page).map((m) => m.id), ...(ALSO_SHOWN[page] ?? [])];
        const members = await Promise.all(ids.map((id) => this.member(id, range)));
        return {
            ...base,
            state: cat?.state ?? "idle",
            ...(cat?.setBy ? { setBy: cat.setBy } : {}),
            others: cat?.others ?? [],
            members,
            sections: await this.sections(page, range),
        };
    }

    /**
     * Costs, at 7 d or 28 d only (section 7): month-to-date members, the money table.
     * @param range
     */
    async costs(range: SlowRange): Promise<PageResponse> {
        const cat = (await this.categories("1h")).find((c) => c.id === "costs");
        const statuses = membersOf(this.reads.ev, "costs");
        const members = await Promise.all(statuses.map((m) => this.member(m.id, "1h")));
        const byEngineId = new Map(statuses.map((s, i) => [s.id, members[i]]));
        return {
            page: "costs",
            range,
            generated: iso(this.reads.now),
            state: cat?.state ?? "idle",
            ...(cat?.setBy ? { setBy: cat.setBy } : {}),
            others: cat?.others ?? [],
            notes: [],
            members,
            sections: [
                await moneyTable(this.reads, range, byEngineId),
                await unitCosts(this.reads, range),
                await byWorkflow(this.reads),
            ],
        };
    }
}

/**
 * Every view the page reads, for one collector cycle.
 * @param store
 * @param nowMs
 * @param ev the result of evaluate(store, nowMs, cfg)
 * @param cfg
 */
export async function buildViews(store: Store, nowMs: number, ev: Evaluation, cfg: SlaConfig = SLAS): Promise<View[]> {
    const b = new Builder(new Reads(store, nowMs, ev, cfg));
    const status = await b.status();
    const out: View[] = [{ route: { kind: "status" }, body: status }];
    const pages: Exclude<PageId, "overview" | "costs">[] = [
        "master",
        "pull-requests",
        "ci",
        "runners",
        "local-runs",
        "flaky",
        "releases",
        "data-sources",
    ];
    for (const range of RANGES) {
        out.push({
            route: { kind: "page", page: "overview", range },
            body: { ...status, page: "overview", range, categories: await b.categories(range) },
        });
        for (const page of pages) {
            out.push({ route: { kind: "page", page, range }, body: await b.page(page, range) });
        }
    }
    const generated = iso(nowMs);
    for (const range of SLOW_RANGES) {
        out.push({ route: { kind: "page", page: "costs", range }, body: await b.costs(range) });
        for (const runKind of ["full", "pr-bins"] as const) {
            out.push({
                route: { kind: "section", page: "ci", section: "shards", range, runKind },
                body: { page: "ci", range, generated, section: await shards(b.reads, range, runKind) },
            });
        }
        out.push({
            route: { kind: "section", page: "flaky", section: "hotspots", range },
            body: { page: "flaky", range, generated, section: await hotspots(b.reads, range) },
        });
    }
    return out;
}
