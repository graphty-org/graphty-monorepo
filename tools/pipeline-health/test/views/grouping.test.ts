// Issue-grouping members on Pull requests (design/ci/issue-grouping.md section 9): the grouping ledger's daily reading
// (from the local writer), and runner-minutes per issue closed (the collector's runner-minutes per merge over it).
import { describe, expect, it } from "vitest";

import type { RawItem } from "../../src/model/items.js";
import { putRaw, recordSource } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { evaluate } from "../../src/sla/engine.js";
import { buildViews } from "../../src/views/index.js";
import type { PageResponse } from "../../web/src/contract.js";
import { HOUR, job, MIN, obs, pr, T0 } from "../model/helpers.js";

const DAY = 24 * HOUR;

async function members(items: RawItem[], sources: string[]) {
    const store = new MemoryStore();
    await putRaw(store, items, T0);
    await recompute(store, T0);
    for (const s of sources) {
        await recordSource(store, s, T0, { ok: true }, T0 - 7 * DAY);
    }
    const ev = await evaluate(store, T0);
    const m = (id: string) => ev.members.find((x) => x.id === id)!;
    const page = async () =>
        (await buildViews(store, T0, ev))
            .map((v) => v.body as PageResponse)
            .find((p) => p.page === "pull-requests" && p.range === "1h")!;
    return Object.assign(m, { page });
}

describe("issue-grouping members", () => {
    it("read issues per merged PR from the ledger, and divide runner-minutes per merge by it", async () => {
        // 12 merges spent 1,680 runner-minutes: 140 per merge; the ledger's newest reading says 1.4 issues per merge.
        const merges = Array.from({ length: 12 }, (_, i) => pr(i + 1, { mergedAt: T0 - 2 * HOUR - i * MIN }));
        const ledger = [
            obs("issues.per_merged_pr", 0.9, T0 - 2 * DAY),
            obs("issues.per_merged_pr", 1.4, T0 - DAY),
            obs("issues.multi_issue_share", 0.155, T0 - DAY),
        ];
        const minutes = job(1, { load: "pr", startedAt: T0 - 3 * HOUR - 1680 * MIN, completedAt: T0 - 3 * HOUR });
        const m = await members([...merges, minutes, ...ledger], ["collector", "grouping-ledger"]);
        expect(m("pr.issues_per_merge")).toMatchObject({ value: 1.4 });
        expect(m("pr.multi_issue_share")).toMatchObject({ value: 0.155, state: "OK" });
        expect(m("pr.runner_minutes_per_issue").value).toBeCloseTo(100);
        expect(m("pr.runner_minutes_per_issue").n).toBe(12);
        // No ledger reading: no value per issue, never a division by nothing.
        const alone = await members([...merges, minutes], ["collector", "grouping-ledger"]);
        expect(alone("pr.runner_minutes_per_issue").value).toBeUndefined();
    });

    it("show the ledger's newest reading, and say not set up before its first", async () => {
        const reading = [
            obs("issues.group_released_share", 0.2, T0 - 2 * DAY),
            obs("issues.groups_ready", 9, T0 - 2 * DAY),
            obs("issues.group_released_share", 0.003, T0 - DAY),
            obs("issues.groups_ready", 16, T0 - DAY),
            obs("issues.groups_combinable", 2, T0 - DAY),
            obs("issues.groups_combinable_branches", 5, T0 - DAY),
        ];
        const m = await members(reading, ["grouping-ledger"]);
        expect(m("pr.group_released_share")).toMatchObject({ value: 0.003, state: "OK" });
        expect(m("pr.groups_ready")).toMatchObject({ value: 16 });
        expect(m("pr.groups_combinable")).toMatchObject({ value: 2 });
        // One row: the families, with the branches they hold under it.
        const row = (await m.page()).members.find((x) => x.id === "pull-requests.groups_combinable");
        expect(row).toMatchObject({ value: { n: 2 }, note: { code: "note.combinable_branches", params: { n: 5 } } });
        expect((await members([], []))("pr.groups_ready").state).toBe("NOT SET UP");
        // An older line without the combinable fields posts neither: no value, never 0.
        const older = await members(reading.slice(0, 4), ["grouping-ledger"]);
        expect(older("pr.groups_combinable").value).toBeUndefined();
        const olderRow = (await older.page()).members.find((x) => x.id === "pull-requests.groups_combinable");
        expect(olderRow?.note).toBeUndefined();
    });
});
