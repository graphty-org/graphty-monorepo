import { describe, expect, it } from "vitest";

import type { ShardRunItem, TestItem } from "../../src/model/items.js";
import { putRaw, setCursor } from "../../src/model/raw.js";
import { recompute } from "../../src/model/rollup.js";
import { MemoryStore } from "../../src/model/store.js";
import { SLAS } from "../../src/sla/config.js";
import { evaluate } from "../../src/sla/engine.js";
import { Reads } from "../../src/views/members.js";
import { hotspots } from "../../src/views/sections.js";
import type { TreeNode, TreeSection } from "../../web/src/contract.js";
import { HOUR, T0 } from "../model/helpers.js";

// Shapes as the live table holds them (read 2026-10-29 from graphty-health): pull request and full-run shard runs
// are stored under their variant, `<family>|flags=off|<shape>`, with [file, passed, failed, skipped, ms] rows; a
// flaky test from a full run or the annotation backfill names the bare family (`graphty`), one from a pull
// request's shard the variant, and a screenshot run's family ends in `-shots`.
const FILE = "graphty/src/workspace/layout/__tests__/LayoutSeed.real-element.test.tsx";
const OTHER = "graphty/src/workspace/start/__tests__/StartScreen.test.tsx";
const STORY = "graphty/src/workspace/graph-place/GraphPlace.stories.tsx";

const shardRun = (id: string, variant: string, files: string[], attempt = 1): ShardRunItem => ({
    kind: "shard_run",
    id,
    attempt,
    source: "ci",
    variant,
    family: variant,
    bin: true,
    full: false,
    sha: "a".repeat(40),
    outcome: "passed",
    startedAt: T0 - 2 * HOUR,
    endedAt: T0 - HOUR,
    secs: 600,
    files: files.map((f) => [f, 5, 0, 0, 1000]),
});

const flaky = (id: string, family: string, file: string, name: string): TestItem => ({
    kind: "test",
    id,
    attempt: 1,
    source: "ci",
    invocation: id,
    family,
    file,
    name,
    outcome: "flaky",
    status: "fail",
    signature: "",
    seenAt: T0 - HOUR,
});

async function tree(quarantine?: unknown): Promise<TreeSection> {
    const store = new MemoryStore();
    const runs: ShardRunItem[] = [];
    // FILE ran 40 times: 30 in selected bins, 10 in whole runs; OTHER 50 times. A retry (attempt 2) never counts.
    for (let i = 0; i < 30; i++) runs.push(shardRun(`s${i}`, "graphty|flags=off|selected", [FILE, OTHER]));
    for (let i = 0; i < 10; i++) runs.push(shardRun(`w${i}`, "graphty|flags=off|whole", [FILE, OTHER]));
    for (let i = 0; i < 10; i++) runs.push(shardRun(`o${i}`, "graphty|flags=off|selected", [OTHER]));
    runs.push(shardRun("s0", "graphty|flags=off|selected", [FILE], 2));
    for (let i = 0; i < 20; i++) runs.push(shardRun(`v${i}`, "graphty-storybook-shots|flags=off|shots", [STORY]));
    const tests = [
        flaky("40906925253.1.test.graphty-3.1#a", "graphty", FILE, "keeps the seed"),
        flaky("40906925254.1.test.graphty-3.1#a", "graphty", FILE, "keeps the seed"),
        flaky("p1.1.test.graphty-2.1#b", "graphty|flags=off|whole", FILE, "draws once"),
        flaky("40906925253.1.story-tests.graphty-storybook.1#c", "graphty-storybook-shots", STORY, "Graph Place"),
    ];
    await putRaw(store, [...runs, ...tests], T0);
    if (quarantine !== undefined) await setCursor(store, "quarantine", JSON.stringify(quarantine), T0);
    await recompute(store, T0);
    return (await hotspots(new Reads(store, T0, await evaluate(store, T0), SLAS), "7d")) as TreeSection;
}

const find = (nodes: TreeNode[], name: string) => nodes.find((n) => n.name === name) as TreeNode;

describe("flake hotspots", () => {
    it("gives the rate per 1,000 runs at every level, the families of runs and tests matched", async () => {
        const t = await tree();
        expect(t.nodes.map((n) => n.name).sort()).toEqual(["graphty", "graphty-storybook-shots"]);
        const graphty = find(t.nodes, "graphty");
        // 3 flaky events over the family's 90 file runs (40 runs of 2 files, 10 of 1; the retry left out).
        expect(graphty.per1000).toBe(33.33);
        const file = find(graphty.children ?? [], FILE);
        expect(file.events).toBe(3);
        expect(file.per1000).toBe(75); // 3 events over FILE's 40 runs
        const seed = find(file.children ?? [], "keeps the seed");
        expect(seed.per1000).toBe(50); // 2 over 40
        expect(find(file.children ?? [], "draws once").per1000).toBe(25);
        const story = find(find(t.nodes, "graphty-storybook-shots").children ?? [], STORY);
        expect(story.per1000).toBe(50); // 1 over 20
        // No quarantine list collected yet: unknown, never 0.
        expect(file.quarantined).toBeNull();
    });

    it("counts quarantined tests from the committed list at the test, file and family", async () => {
        const t = await tree([{ file: FILE, name: "keeps the seed", issue: 4170 }]);
        const graphty = find(t.nodes, "graphty");
        const file = find(graphty.children ?? [], FILE);
        expect(graphty.quarantined).toBe(1);
        expect(file.quarantined).toBe(1);
        expect(find(file.children ?? [], "keeps the seed").quarantined).toBe(1);
        expect(find(file.children ?? [], "draws once").quarantined).toBe(0);
        expect(find(t.nodes, "graphty-storybook-shots").quarantined).toBe(0);
    });
});
