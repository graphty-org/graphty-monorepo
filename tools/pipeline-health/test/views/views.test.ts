import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import type {
    Member,
    OverviewResponse,
    PageResponse,
    SectionResponse,
    StatusResponse,
} from "../../web/src/contract.js";
import { DAY, type RawItem, type ShardRunItem, type TestItem } from "../../src/model/items.js";
import { oldestAt, putRaw, recordSource } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { evaluate } from "../../src/sla/engine.js";
import { buildViews, MAX_VIEW_BYTES, readViewJson, type View, viewKey, writeViews } from "../../src/views/index.js";
import { HOUR, job, MIN, obs, T0 } from "../model/helpers.js";

const LIVE = ["collector", "ci-results", "release", "npm", "billing", "stress", "hosts"];

async function world(items: RawItem[], now = T0, fresh = LIVE) {
    const store = new MemoryStore();
    for (const s of fresh) {
        await recordSource(store, s, now - 7 * HOUR, { ok: true });
        await recordSource(store, s, now, { ok: true });
    }
    await putRaw(store, items, now);
    await recompute(store, now);
    return store;
}

const views = async (store: MemoryStore, now = T0) => buildViews(store, now, await evaluate(store, now));

/** The fixture file the page reads for the same route. */
function fixtureName(v: View): string {
    const r = v.route;
    if (r.kind === "status") return "status";
    if (r.kind === "page") return `${r.page}.${r.range}`;
    return `${r.page}.${r.section}${r.runKind ? `.${r.runKind}` : ""}.${r.range}`;
}
const fixture = (name: string): Record<string, unknown> =>
    JSON.parse(readFileSync(new URL(`../../web/fixtures/${name}.json`, import.meta.url), "utf8"));

/** Keys present whatever the state: setBy appears only when a category is not OK. */
const keysOf = (o: object) =>
    Object.keys(o)
        .filter((k) => k !== "setBy")
        .sort();

const pages = (vs: View[]) =>
    vs.filter((v) => v.route.kind === "page" && v.route.page !== "overview").map((v) => v.body as PageResponse);
const allMembers = (vs: View[]): Member[] => [
    ...pages(vs).flatMap((p) => p.members),
    ...vs
        .filter((v) => v.route.kind === "status" || (v.route.kind === "page" && v.route.page === "overview"))
        .flatMap((v) => (v.body as StatusResponse).categories.map((c) => c.headline)),
];

/** Members whose value is a fact about the dashboard's own store (rows today, sources' ages), not a source's data. */
const SELF_IDS = new Set([
    "data-sources.write_budget",
    "data-sources.past_age",
    "data-sources.sources_not_ok",
    "data-sources.thin",
    "data-sources.collector",
]);

describe("views", () => {
    it("an empty store gives gray states, never a judged zero, for every member on every page", async () => {
        const vs = await views(new MemoryStore());
        const gray = new Set(["nodata", "notsetup", "few", "partial", "idle", "info"]);
        for (const m of allMembers(vs)) {
            if (SELF_IDS.has(m.id)) continue;
            expect(gray.has(m.state), `${m.id} is ${m.state}`).toBe(true);
            if (m.state !== "info") expect(m.value, m.id).toBeNull();
        }
        const status = vs[0].body as StatusResponse;
        expect(status.categories.map((c) => c.id)).toEqual([
            "master",
            "pull-requests",
            "ci",
            "flaky",
            "releases",
            "costs",
            "data-sources",
        ]);
        expect(status.sources.every((s) => s.lastWrite === null)).toBe(true);
    });

    it("a seeded hour gives the engine's OK, WARNING and FAILING on the page", async () => {
        const hangs = (k: number) =>
            Array.from({ length: k }, (_, i) =>
                job(100 + i, { hang: true, startedAt: T0 - 21 * MIN, completedAt: T0 - 20 * MIN }),
            );
        const ci = async (items: RawItem[]) => {
            const p = (await views(await world(items))).find(
                (v) => v.route.kind === "page" && v.route.page === "ci" && v.route.range === "1h",
            )!.body as PageResponse;
            return p.members.find((m) => m.id === "ci.hangs")!;
        };
        expect((await ci([job(1)])).state).toBe("ok");
        expect((await ci(hangs(1))).state).toBe("warn");
        const red = await ci(hangs(2));
        expect(red).toMatchObject({
            state: "bad",
            value: { n: 2 },
            sla: { target: { op: "<=", n: 0 }, red: { op: ">=", n: 2 } },
        });
        expect(red.spark?.trend).toHaveLength(24);
        expect(red.spark?.ctx).toHaveLength(18);
        expect(red.spark?.breach).toContain("bad");

        // A stock in minutes, judged now, with the category naming it.
        const store = await world([obs("master.red_span_ms", 20 * MIN, T0 - 2 * MIN)]);
        const vs = await views(store);
        const master = (vs[0].body as StatusResponse).categories.find((c) => c.id === "master")!;
        expect(master.state).toBe("bad");
        expect(master.setBy).toMatchObject({ member: "master.red_now", state: "bad", value: { n: 20, unit: "min" } });
        expect(
            (vs[0].body as StatusResponse).episodes.some((e) => e.member === "master.red_now" && e.end === null),
        ).toBe(true);
    });

    it("every payload has the keys, section ids and member ids of its fixture", async () => {
        const vs = await views(await world([job(1), obs("pr.open", 4, T0 - MIN)]));
        expect(vs).toHaveLength(1 + 3 * 9 + 2 * 4);
        for (const v of vs) {
            const name = fixtureName(v);
            const fx = fixture(name);
            expect(keysOf(v.body), name).toEqual(keysOf(fx));
            if ("sections" in v.body) {
                const ids = (s: { id: string }[]) => s.map((x) => x.id).sort();
                expect(ids(v.body.sections), name).toEqual(ids(fx.sections as { id: string }[]));
                const mids = (m: { id: string }[]) => m.map((x) => x.id).sort();
                expect(mids(v.body.members), name).toEqual(mids(fx.members as { id: string }[]));
            }
            if ("section" in v.body) {
                expect((v.body as SectionResponse).section.id).toBe((fx.section as { id: string }).id);
            }
            if (v.route.kind === "page" && v.route.page === "overview") {
                const o = v.body as OverviewResponse;
                expect(o.categories.map((c) => c.headline.id)).toEqual(
                    (fx.categories as { headline: { id: string } }[]).map((c) => c.headline.id),
                );
            }
        }
    });

    it("writes one gzipped item per view under viewKey, each under DynamoDB's 400 KB with a dense 24 h", async () => {
        const items: RawItem[] = [];
        for (let t = T0 - DAY; t < T0; t += 5 * MIN) {
            for (const m of [
                "master.red_ms",
                "pr.open",
                "ci.jobs_running",
                "ci.jobs_queued",
                "ci.longest_queued_ms",
                "flaky.blocked_prs",
            ]) {
                items.push(obs(m, (t / MIN) % 97, t + MIN));
            }
        }
        for (let i = 0; i < 600; i++) {
            const at = T0 - ((i * 7919) % 7) * DAY - ((i * 104729) % DAY);
            const run: ShardRunItem = {
                kind: "shard_run",
                id: `inv-${i}`,
                attempt: 1,
                source: "ci",
                variant: `shard-${i % 40}`,
                family: `family-${i % 12}`,
                bin: i % 2 === 0,
                full: i % 2 === 1,
                sha: "abc",
                outcome: "passed",
                startedAt: at - 600_000,
                endedAt: at,
                secs: 300 + (i % 400),
                budgetMs: 900_000,
                files: [["a.test.ts", 3, 0, 0, 1000]],
            };
            items.push(run);
        }
        for (let i = 0; i < 1500; i++) {
            const test: TestItem = {
                kind: "test",
                id: `t-${i}`,
                attempt: 1,
                source: "ci",
                invocation: `inv-${i}`,
                family: `family-${i % 12}`,
                file: `packages/some/deep/path/file-${i % 300}.test.ts`,
                name: `a fairly long descriptive test name number ${i}`,
                outcome: "flaky",
                status: "fail",
                signature: "x",
                seenAt: T0 - ((i * 7919) % 6) * DAY - ((i * 104729) % DAY),
            };
            items.push(test);
        }
        const store = await world(items);
        const out = await writeViews(store, T0);
        expect(out.views).toBe(1 + 3 * 9 + 2 * 4);
        expect(out.largest.bytes).toBeLessThan(MAX_VIEW_BYTES);
        expect(viewKey({ kind: "page", page: "ci", range: "6h" })).toEqual({ pk: "PAGE#ci#6h", sk: "-" });
        const item = await store.get(
            viewKey({ kind: "section", page: "ci", section: "shards", range: "7d", runKind: "full" }),
        );
        expect(item?.pk).toBe("PAGE#ci/shards#7d#full");
        const shards = JSON.parse(gunzipSync(item!.gz as Uint8Array).toString("utf8")) as SectionResponse;
        expect(shards.section.kind).toBe("shards");
        const flaky = (await readViewJson(store, {
            kind: "section",
            page: "flaky",
            section: "hotspots",
            range: "28d",
        })) as SectionResponse;
        expect(flaky.section.kind).toBe("tree");
        const runners = (await readViewJson(store, { kind: "page", page: "runners", range: "24h" })) as PageResponse;
        expect(runners.sections[0]).toMatchObject({ kind: "jobs", step: "1h" });
    });

    it("Local runs: an informational page is IDLE, and a posted backlog fills the 24 h trend", async () => {
        const run = (id: string, at: number): RawItem => ({
            kind: "local_run",
            id,
            attempt: 1,
            what: "gate",
            outcome: "passed",
            startedAt: at - 10 * MIN,
            endedAt: at,
        });
        const items = [run("a", T0 - 20 * HOUR), run("b", T0 - 10 * HOUR), run("c", T0 - 30 * MIN)];
        const store = await world([]);
        await putRaw(store, items, T0);
        await recordSource(store, "local", T0, { ok: true }, oldestAt(items));
        await recompute(store, T0);
        const page = pages(await views(store)).find((p) => p.page === "local-runs" && p.range === "24h");
        expect(page?.state).toBe("idle");
        const m = page?.members.find((x) => x.id === "local-runs.local_vs_ci");
        expect(m?.state).toBe("info");
        // One point per hour with a run: the backlog's hours (20 h and 10 h ago) are history, not "no history".
        const points = (m?.spark?.trend ?? []).flatMap((v, i) => (v === null ? [] : [i]));
        expect(points).toEqual([3, 13, 22]);
    });

    it("a page's state names only members the page shows", async () => {
        for (const store of [new MemoryStore(), await world([], T0, ["collector"])]) {
            for (const p of pages(await views(store))) {
                const ids = p.members.map((m) => m.id);
                for (const r of [...(p.setBy ? [p.setBy] : []), ...p.others]) {
                    expect(ids, `${p.page} ${p.range} names ${r.member}`).toContain(r.member);
                }
            }
        }
    });
});
