import { describe, expect, it } from "vitest";

import { type CostItem, type RawItem } from "../../src/model/items.js";
import { putRaw, setCursor } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { Reads } from "../../src/views/members.js";
import { byWorkflow, stressTable, unitCosts } from "../../src/views/sections.js";
import type { BarsSection, TableSection } from "../../web/src/contract.js";
import { HOUR, job, MIN, pr, run, T0 } from "../model/helpers.js";

const DAY = 24 * HOUR;
const cost = (id: string, line: string, workflow: string, usd: number, day = T0 - DAY): CostItem => ({
    kind: "cost",
    id,
    attempt: 1,
    line,
    workflow,
    day: Math.floor(day / DAY) * DAY,
    usd,
});

async function reads(items: RawItem[]) {
    const store = new MemoryStore();
    await putRaw(store, items, T0);
    await recompute(store, T0);
    return { store, reads: new Reads(store, T0, await evaluate(store, T0), SLAS) };
}

describe("Costs and Data sources sections", () => {
    it("unit costs: money per tested train and list-price value per merged pull request", async () => {
        const { reads: r } = await reads([
            cost("t4#1", "t4", "release.yml", 1.5),
            cost("llm#1", "llm", "release.yml", 0.94),
            cost("t4#2", "t4", "gpu-weekly-paired.yml", 9), // not a train's
            run(10, { workflow: "release.yml", tested: true, completedAt: T0 - DAY }),
            run(11, { workflow: "release.yml", tested: true, completedAt: T0 - DAY + HOUR }),
            run(12, { workflow: "release.yml", tested: false, completedAt: T0 - DAY + HOUR }),
            // 10 linux minutes (9.5 rounded up) and 2 macos minutes
            job(1, { os: "linux", startedAt: T0 - 2 * HOUR, completedAt: T0 - 2 * HOUR + 9.5 * MIN }),
            job(2, { os: "macos", startedAt: T0 - 2 * HOUR, completedAt: T0 - 2 * HOUR + 2 * MIN }),
            pr(1, { mergedAt: T0 - 3 * HOUR }),
            pr(2, { mergedAt: T0 - 3 * HOUR }),
        ]);
        const s = (await unitCosts(r, "7d")) as TableSection;
        expect(s.kind).toBe("table");
        const v = Object.fromEntries(s.rows.map((x) => [(x.cells.measure as { code: string }).code, x.cells.value]));
        expect(v["unit.train"]).toMatchObject({ n: 1.22, unit: "usd" }); // (1.5 + 0.94) / 2
        expect(v["unit.pr_value"]).toMatchObject({ n: 0.09, unit: "usd" }); // (10 * 0.006 + 2 * 0.062) / 2
    });

    it("unit costs with nothing recorded say so, never 0", async () => {
        const { reads: r } = await reads([]);
        expect((await unitCosts(r, "28d")).kind).toBe("empty");
    });

    it("by workflow: money and list-price value as two sorted lists", async () => {
        const { reads: r } = await reads([
            cost("t4#1", "t4", "release.yml", 3),
            cost("llm#1", "llm", "release.yml", 0.94),
            cost("t4#2", "t4", "gpu-weekly-paired.yml", 9),
            job(1, { os: "linux", startedAt: T0 - 5 * HOUR, completedAt: T0 - 5 * HOUR + 200 * MIN }),
            job(2, { os: "windows", workflow: "codeql.yml", startedAt: T0 - 2 * HOUR, completedAt: T0 - HOUR }),
            job(3, { startedAt: T0 - 2 * HOUR, completedAt: T0 - HOUR }), // self-hosted: no OS, no list price
        ]);
        const s = (await byWorkflow(r)) as BarsSection;
        expect(s.kind).toBe("bars");
        const names = (g: BarsSection["groups"][number]) => g.items.map((i) => [(i.label as { v: string }).v, i.n]);
        expect(names(s.groups[0])).toEqual([
            ["gpu-weekly-paired.yml", 9],
            ["release.yml", 3],
            ["release.yml, LLM step", 0.94],
        ]);
        expect(names(s.groups[1])).toEqual([
            ["ci.yml", 1.2],
            ["codeql.yml", 0.6],
        ]);
        expect(s.groups[1].items.every((i) => i.tone === "value")).toBe(true);
    });

    it("stress table: newest first, a broken run marked, older runs muted", async () => {
        const { store, reads: r } = await reads([]);
        expect((await stressTable(r)).kind).toBe("empty");
        await setCursor(
            store,
            "stress",
            JSON.stringify({
                1: { state: 0, foundFailures: false, at: T0 - 14 * DAY, runId: 1 },
                3: { state: 2, foundFailures: true, failedJob: "File the load-sensitive tests", at: T0, runId: 3 },
                2: { state: 0, foundFailures: true, at: T0 - 7 * DAY, runId: 2 },
            }),
            T0,
        );
        const s = (await stressTable(r)) as TableSection;
        expect(s.rows.map((x) => x.past ?? false)).toEqual([false, true, true]);
        expect(s.rows[0].cells.result).toMatchObject({ t: "mark", state: "bad" });
        expect(s.rows[1].cells.result).toMatchObject({ fact: { code: "stress.found_filed" } });
        expect(s.rows[1].cells.filed).toEqual({ t: "none" });
        expect(s.rows[2].cells.filed).toEqual({ t: "num", n: 0 });
    });
});
