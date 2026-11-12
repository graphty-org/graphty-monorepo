import { describe, expect, it } from "vitest";

import { SNAPSHOT } from "../../src/collector/snapshots.js";
import { putRaw, setCursor } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { Reads } from "../../src/views/members.js";
import { causes, holders, shared, superseded } from "../../src/views/sections.js";
import type { BarsSection, TableSection } from "../../web/src/contract.js";
import { MIN, run, T0 } from "../model/helpers.js";

async function reads(store: MemoryStore, snaps: Record<string, unknown> = {}) {
    for (const [k, v] of Object.entries(snaps)) {
        await setCursor(store, k, JSON.stringify(v), T0);
    }
    await recompute(store, T0);
    return new Reads(store, T0, await evaluate(store, T0), SLAS);
}

describe("sections from the collector's snapshots", () => {
    it("says not collected without a snapshot, and empty with an empty one", async () => {
        const r = await reads(new MemoryStore());
        for (const s of await Promise.all([shared(r), holders(r), superseded(r)])) {
            expect(s).toMatchObject({ kind: "empty", fact: { code: "section.no_detail" } });
        }
        expect(await causes(r, "1h")).toMatchObject({ kind: "empty", fact: { code: "section.no_events" } });
        const e = await reads(new MemoryStore(), {
            [SNAPSHOT.shared]: { at: T0, rows: [], merges: [] },
            [SNAPSHOT.superseded]: { at: T0, rows: [] },
        });
        expect(await shared(e)).toMatchObject({ kind: "empty", fact: { code: "master.no_shared" } });
        expect(await superseded(e)).toMatchObject({ kind: "empty", fact: { code: "runners.no_superseded" } });
    });

    it("builds the shared table, active rows first", async () => {
        const r = await reads(new MemoryStore(), {
            [SNAPSHOT.shared]: {
                at: T0,
                merges: [],
                rows: [
                    {
                        check: "Docs",
                        bins: 1,
                        alone: true,
                        prs: [5],
                        since: T0 - 90 * MIN,
                        end: T0 - 60 * MIN,
                        suspects: [],
                    },
                    {
                        check: "Test (graphty-*)",
                        bins: 3,
                        alone: false,
                        prs: [3, 2, 1],
                        since: T0 - 30 * MIN,
                        suspects: [{ pr: 9, title: "x", at: T0 - HOUR_MS }],
                    },
                ],
            },
        });
        const t = (await shared(r)) as TableSection;
        expect(t.rows.map((x) => x.past ?? false)).toEqual([false, true]);
        expect(t.rows[0].cells.check).toMatchObject({ t: "sub", sub: { fact: { code: "check.family" } } });
        expect(t.rows[0].cells.suspects).toMatchObject({
            t: "list",
            items: [{ fact: { code: "suspect", params: { pr: 9 } } }],
        });
        expect(t.rows[1].cells.since).toMatchObject({ t: "span" });
    });

    it("counts first-attempt causes in the range", async () => {
        const store = new MemoryStore();
        await putRaw(
            store,
            [
                run(1, { cause: "change", conclusion: "failure" }),
                run(2, { cause: "shared_check", conclusion: "failure" }),
                run(3, { cause: "change", conclusion: "failure" }),
            ],
            T0,
        );
        const b = (await causes(await reads(store), "1h")) as BarsSection;
        expect(b.sub).toEqual({ code: "ci.causes.sub", params: { suites: 3 } });
        const n = Object.fromEntries(b.groups[0].items.map((i) => [(i.label as { code: string }).code, i.n]));
        expect(n).toMatchObject({ "cause.change": 2, "cause.shared_check": 1, "cause.flaky": 0 });
    });

    it("builds the holders bars with a note per run with no job, and the superseded table", async () => {
        const r = await reads(new MemoryStore(), {
            [SNAPSHOT.holders]: {
                at: T0,
                holders: {
                    "CI, pull_request": { running: 4, queued: 2, macos: 1 },
                    "CodeQL, push": { running: 1, queued: 0, macos: 0 },
                },
                noJobs: { "CI, push": { runs: 2, since: T0 - 10 * MIN } },
                saturated: [],
            },
            [SNAPSHOT.superseded]: { at: T0, rows: [{ workflow: "CodeQL", runId: 7, pr: 3, newerAt: T0 - MIN }] },
        });
        const b = (await holders(r)) as BarsSection;
        expect(b.groups.map((g) => g.head)).toEqual([
            { code: "runners.running_now", params: { jobs: 5 } },
            { code: "runners.queued_now", params: { jobs: 2 } },
        ]);
        expect(b.groups[0].items[0]).toMatchObject({ n: 4, detail: { fact: { code: "runners.macos" } } });
        expect(b.notes?.[0]).toMatchObject({
            code: "runners.queued_runs",
            params: { runs: 2, workflow: "CI", event: "push" },
        });
        const t = (await superseded(r)) as TableSection;
        expect(t.rows[0].cells).toMatchObject({ run: { v: "CodeQL" }, pr: { n: 3 } });
    });
});

const HOUR_MS = 60 * MIN;
