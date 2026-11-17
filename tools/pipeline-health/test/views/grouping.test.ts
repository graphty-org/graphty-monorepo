// Issue-grouping members on Pull requests (design/ci/issue-grouping.md section 9): issues closed per merged pull
// request, the share closing 2+, runner-minutes per issue closed (from the collector), and the grouping ledger's
// daily reading (from the local writer).
import { describe, expect, it } from "vitest";

import type { RawItem } from "../../src/model/items.js";
import { putRaw, recordSource } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { evaluate } from "../../src/sla/engine.js";
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
    return (id: string) => ev.members.find((m) => m.id === id)!;
}

describe("issue-grouping members", () => {
    it("count the issues merged pull requests close, and the runner-minutes per issue", async () => {
        const prs = Array.from({ length: 20 }, (_, i) =>
            // 16 close one issue, 4 close three: 28 issues over 20 merges.
            pr(i + 1, { mergedAt: T0 - 2 * HOUR - i * MIN, closes: i < 4 ? 3 : 1 }),
        );
        const m = await members(
            [
                ...prs,
                pr(90, { mergedAt: T0 - 2 * HOUR }), // stored before `closes` was read: left out
                pr(91, { mergedAt: T0 - 2 * HOUR, closes: 5, base: "feat/x" }), // not into master
                job(1, { load: "pr", startedAt: T0 - 3 * HOUR - 280 * MIN, completedAt: T0 - 3 * HOUR }),
            ],
            ["collector"],
        );
        expect(m("pr.issues_per_merge")).toMatchObject({ value: 1.4, n: 20 });
        expect(m("pr.multi_issue_share")).toMatchObject({ value: 0.2, n: 20 });
        expect(m("pr.runner_minutes_per_issue")).toMatchObject({ value: 10, n: 28 });
    });

    it("show the ledger's newest reading, and say not set up before its first", async () => {
        const reading = [
            obs("issues.group_released_share", 0.2, T0 - 2 * DAY),
            obs("issues.groups_ready", 9, T0 - 2 * DAY),
            obs("issues.group_released_share", 0.003, T0 - DAY),
            obs("issues.groups_ready", 16, T0 - DAY),
        ];
        const m = await members(reading, ["grouping-ledger"]);
        expect(m("pr.group_released_share")).toMatchObject({ value: 0.003, state: "OK" });
        expect(m("pr.groups_ready")).toMatchObject({ value: 16 });
        expect((await members([], []))("pr.groups_ready").state).toBe("NOT SET UP");
    });
});
