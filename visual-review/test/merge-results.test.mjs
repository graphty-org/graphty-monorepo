import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { cpuModel } from "../capture/capture.mjs";
import { mergeResults } from "../capture/merge-results.mjs";
import { visualStoryTest } from "../capture/story-test.mjs";

import { tempDir } from "./helpers.mjs";
import { context, png, read, report, repo } from "./story-test-fakes.mjs";

describe("merge-results", () => {
    it("merges shards into one capture, reports unshot baselines removed, and refuses a missing shard", async () => {
        const root = repo({ "a--one.png": png(10), "a--gone.png": png(10) });
        const baselines = join(root, "visual-baselines/graphty-element");
        const files = ["a.stories.ts", "b.stories.ts"];
        const shard = async (index, id, shot, count = 2) => {
            const out = tempDir("story-test-shard-");
            const v = visualStoryTest({ project: "graphty-element", out, root });
            const ctx = context([shot, shot]);
            await v.commands.visualPlan(ctx, { id, chromatic: {} });
            const first = await v.commands.visualShot(ctx, { id, mode: null, chromatic: {}, console: [] });
            if (first.again) {
                await v.commands.visualShot(ctx, { id, mode: null, chromatic: {}, console: [] });
            }
            await report(v, root, { shard: { index, count }, files, ran: { [`${id[0]}.stories.ts`]: [id] } });
            return out;
        };
        const one = await shard(1, "a--one", png(10));
        const two = await shard(2, "b--two", png(70));

        const out = tempDir("story-test-merged-");
        const merged = await mergeResults({ project: "graphty-element", baselines, out, dirs: [one, two] });
        expect(merged.problems).toEqual([]);
        expect(read(out).complete).toBe(true);
        expect(merged.results.items.map((i) => [i.id, i.status])).toEqual([
            ["a--gone", "removed"],
            ["a--one", "unchanged"],
            ["b--two", "new"],
        ]);
        expect(readFileSync(join(out, "b--two.png"))).toEqual(png(70));
        // Each shard says which CPU drew it, and the merge keeps every one (#6351).
        const cpu = await cpuModel();
        expect(read(one).environment.cpu).toBe(cpu);
        expect(merged.results.environment.cpu).toBe(cpu);

        const half = await mergeResults({ project: "graphty-element", baselines, out: tempDir("m-"), dirs: [one] });
        expect(half.problems).toEqual([
            "shard 2 of 2: missing",
            "1 story files did not run or failed to load: b.stories.ts",
        ]);
        expect(half.results.complete).toBe(false);
        const twice = await mergeResults({
            project: "graphty-element",
            baselines,
            out: tempDir("m-"),
            dirs: [one, one, two],
        });
        expect(twice.problems).toContain("shard 1 of 2: 2 partials");
        expect(twice.problems).toContain("story files ran in more than one partial: a.stories.ts");

        // A run of only some story files is not a whole capture: the rest would read as removed.
        const filtered = await shard(1, "a--one", png(10), 1);
        const some = await mergeResults({
            project: "graphty-element",
            baselines,
            out: tempDir("m-"),
            dirs: [filtered],
        });
        expect(some.problems).toEqual(["1 story files did not run or failed to load: b.stories.ts"]);
        expect(some.results.complete).toBe(false);
        expect(some.results.items.map((i) => i.status)).toEqual(["unchanged"]);
    });

    it("names every way a set of partials is not one whole capture of the project", async () => {
        const root = repo({ "a--one.png": png(10) });
        const baselines = join(root, "visual-baselines/graphty-element");
        const files = ["a.stories.ts", "b.stories.ts"];
        const shard = async (index, id) => {
            const out = tempDir("story-test-shard-");
            const v = visualStoryTest({ project: "graphty-element", out, root });
            const ctx = context([png(10), png(10)]);
            await v.commands.visualPlan(ctx, { id, chromatic: {} });
            await v.commands.visualShot(ctx, { id, mode: null, chromatic: {}, console: [] });
            await report(v, root, { shard: { index, count: 2 }, files, ran: { [`${id[0]}.stories.ts`]: [id] } });
            return out;
        };
        const one = await shard(1, "a--one");
        const two = await shard(2, "b--two");
        // A copy of a partial with its results.json changed by `edit`.
        const changed = (dir, edit) => {
            const copy = tempDir("story-test-edited-");
            cpSync(dir, copy, { recursive: true });
            const r = read(dir);
            edit(r);
            writeFileSync(join(copy, "results.json"), JSON.stringify(r));
            return copy;
        };
        const merge = async (dirs) =>
            (await mergeResults({ project: "graphty-element", baselines, out: tempDir("m-"), dirs })).problems;

        expect(await merge([one, changed(two, (r) => (r.partial.shard.count = 3))])).toContain(
            "the partials disagree on the number of shards (2, 3)",
        );
        expect(await merge([one, changed(two, (r) => delete r.partial.ran)])).toContain(
            "a partial does not list the project's story files",
        );
        expect(await merge([one, changed(two, (r) => r.partial.files.push("c.stories.ts"))])).toContain(
            "the partials list different story files",
        );
        const other = changed(two, (r) => (r.project = "layout"));
        expect(await merge([one, other])).toContain(`${other}: a capture of layout, not graphty-element`);
        const short = changed(two, (r) => {
            r.partial.reported = false;
            r.partial.missing = ["b--two", "b--three"];
        });
        expect(await merge([one, short])).toContain(`${short}: incomplete: no visual step for b--two, b--three`);
        const unreported = changed(two, (r) => (r.partial.reported = false));
        expect(await merge([one, unreported])).toContain(`${unreported}: incomplete`);
        expect(await merge([one, changed(two, (r) => (r.commit = "f".repeat(40)))])).toContain(
            "the partials come from different commits",
        );
        const again = changed(one, (r) => (r.partial.shard.index = 2));
        expect(await merge([one, again])).toContain(`a--one.png is in ${one} and ${again}`);
        const many = ["c", "d", "e", "f", "g", "h"].map((f) => `${f}.stories.ts`);
        const wide = (dir) => changed(dir, (r) => r.partial.files.push(...many));
        expect(await merge([wide(one), wide(two)])).toContain(
            "6 story files did not run or failed to load: c.stories.ts, d.stories.ts, e.stories.ts, f.stories.ts, g.stories.ts and 1 more",
        );
    });
});
