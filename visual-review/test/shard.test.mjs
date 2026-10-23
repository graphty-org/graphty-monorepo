/*
 * capture --shard and --merge without a browser: the split of the stories, what each part plans
 * against what one unsharded capture plans, and joining the parts' outputs.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { plan } from "../capture/capture.mjs";
import { mergeShards, parseShard, shardFilter } from "../capture/shard.mjs";

import { FIXTURE, tempDir } from "./helpers.mjs";

describe("parseShard", () => {
    it("reads <i>/<n>", () => {
        expect(parseShard("1/1")).toEqual({ index: 1, count: 1 });
        expect(parseShard("3/4")).toEqual({ index: 3, count: 4 });
    });

    it.each(["0/2", "3/2", "1/0", "a/b", "1.5/2", "1", "/2", "1/2/3", "-1/2", " 1/2", ""])(
        "refuses %j with what a good value looks like",
        (bad) => {
            expect(() => parseShard(bad)).toThrow(/--shard must be <i>\/<n> with 1 <= i <= n/);
        },
    );
});

const IDS = Array.from({ length: 23 }, (_, k) => `story-${String(k).padStart(2, "0")}--x`);
const parts = (ids, count) =>
    Array.from({ length: count }, (_, k) => ids.filter(shardFilter(ids, { index: k + 1, count })));

describe("shardFilter", () => {
    it("puts every story in exactly one part, none empty while there are at least n stories", () => {
        for (let count = 1; count <= IDS.length; count++) {
            const split = parts(IDS, count);
            expect(split.flat().sort()).toEqual(IDS);
            expect(split.every((p) => p.length > 0)).toBe(true);
            // Balanced: part sizes differ by at most one.
            const sizes = split.map((p) => p.length);
            expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        }
    });

    it("splits the same stories the same way whatever order they come in", () => {
        const shuffled = [...IDS].reverse();
        shuffled.push(shuffled.shift());
        expect(parts(shuffled, 4).map((p) => p.sort())).toEqual(parts(IDS, 4));
    });

    it("gives what no story owns to part 1, and everything to a missing shard", () => {
        expect(shardFilter(IDS, { index: 1, count: 3 })("gone--story")).toBe(true);
        expect(shardFilter(IDS, { index: 2, count: 3 })("gone--story")).toBe(false);
        expect(shardFilter(IDS, null)("anything")).toBe(true);
    });

    it("leaves parts beyond the number of stories empty", () => {
        expect(parts(["a--1", "b--1"], 3).map((p) => p.length)).toEqual([1, 1, 0]);
    });
});

describe("plan", () => {
    const ids = ["a--one", "b--modes", "c--excluded", "d--newly-excluded", "e--renamed", "f--plain", "g--plain"];
    const params = {
        "b--modes": { chromatic: { modes: { light: { theme: "light" }, dark: { theme: "dark" } } } },
        "c--excluded": { chromatic: { disableSnapshot: true } },
        "d--newly-excluded": { chromatic: { disableSnapshot: true } },
    };
    const existing = new Set([
        "a--one.png",
        "b--modes.light.png",
        "d--newly-excluded.png",
        "old--name.png",
        "gone--story.png",
        "gone--other.dark.png",
        "broken--old.png",
    ]);
    const renames = new Map([
        ["e--renamed", "old--name"],
        ["missing--new", "broken--old"],
    ]);
    const input = (shard) => ({
        allIds: ids,
        ids,
        params,
        baselines: tempDir("vr-plan-"),
        renames,
        existing,
        stories: null,
        base: "http://x/",
        shard,
    });
    const files = (p) => ({
        items: p.items.map((i) => i.file).sort(),
        jobs: p.jobs.map((j) => j.file).sort(),
        gone: [...p.gone].sort(),
    });

    it("plans every item of the unsharded capture in exactly one part, for any number of parts", async () => {
        const whole = await plan(input(null));
        expect(files(whole)).toEqual({
            items: ["c--excluded.png", "missing--new.png"],
            jobs: [
                "a--one.png",
                "b--modes.dark.png",
                "b--modes.light.png",
                "e--renamed.png",
                "f--plain.png",
                "g--plain.png",
            ],
            gone: ["d--newly-excluded.png", "gone--other.dark.png", "gone--story.png"],
        });
        for (let count = 1; count <= ids.length + 1; count++) {
            const split = await Promise.all(
                Array.from({ length: count }, (_, k) => plan(input({ index: k + 1, count }))),
            );
            const joined = { items: [], jobs: [], gone: [] };
            for (const p of split) {
                joined.items.push(...p.items);
                joined.jobs.push(...p.jobs);
                joined.gone.push(...p.gone);
            }
            // The same items, jobs (with their rename) and removed baselines, each once.
            expect(files(joined)).toEqual(files(whole));
            const byFile = (list) => Object.fromEntries(list.map((x) => [x.file, x]));
            expect(byFile(joined.jobs)).toEqual(byFile(whole.jobs));
            expect(byFile(joined.items)).toEqual(byFile(whole.items));
            // Each part still knows every newly excluded story, to give its removed item the reason.
            expect(split.every((p) => p.newlyExcluded.has("d--newly-excluded.png"))).toBe(true);
        }
    });

    it("keeps the rename's old baseline out of removed in every part", async () => {
        const split = await Promise.all([1, 2, 3].map((index) => plan(input({ index, count: 3 }))));
        expect(split.flatMap((p) => p.gone)).not.toContain("old--name.png");
        expect(split.flatMap((p) => p.jobs).find((j) => j.file === "e--renamed.png").from).toBe("old--name");
    });
});

/**
 * Splits a finished capture's output into n parts as `capture --shard` writes them.
 * @param {string} whole the unsharded capture's directory
 * @param {number} count the number of parts
 * @param {(r: object, index: number) => object} [edit] changes one part's results.json
 * @returns {string[]} the parts' directories
 */
function splitCapture(whole, count, edit = (r) => r) {
    const r = JSON.parse(readFileSync(join(whole, "results.json"), "utf8"));
    const ids = [...new Set(r.items.map((i) => i.id))];
    return Array.from({ length: count }, (_, k) => {
        const index = k + 1;
        const mine = shardFilter(ids, { index, count });
        const dir = tempDir(`vr-part-${index}-`);
        const items = r.items.filter((i) => mine(i.id));
        for (const sub of ["", "second", "baselines"]) {
            mkdirSync(join(dir, sub), { recursive: true });
            for (const { file } of items) {
                try {
                    cpSync(join(whole, sub, file), join(dir, sub, file));
                } catch {
                    // This item has no file there.
                }
            }
        }
        const part = { ...r, complete: false, shard: { index, count, finished: true }, expected: items.length, items };
        writeFileSync(join(dir, "results.json"), JSON.stringify(edit(part, index)));
        return dir;
    });
}

const listing = (dir) =>
    readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
        .sort();

describe("mergeShards", () => {
    const whole = join(FIXTURE, "compact-mantine");
    const original = JSON.parse(readFileSync(join(whole, "results.json"), "utf8"));
    const expected = { ...original, items: [...original.items].sort((a, b) => (a.file < b.file ? -1 : 1)) };

    it("joins the parts into what the unsharded capture wrote, item for item and file for file", async () => {
        for (const count of [1, 2, 3, 7]) {
            const out = tempDir("vr-merged-");
            const dirs = splitCapture(whole, count).reverse();
            expect(await mergeShards(dirs, out)).toEqual(expected);
            expect(JSON.parse(readFileSync(join(out, "results.json"), "utf8"))).toEqual(expected);
            expect(listing(out)).toEqual(listing(whole));
        }
    });

    it("takes the latest attempt and the earliest start of its parts", async () => {
        const dirs = splitCapture(whole, 2, (r, index) =>
            index === 2 ? { ...r, runAttempt: 2, capturedAt: "2026-09-27T11:00:00Z" } : r,
        );
        const merged = await mergeShards(dirs, tempDir("vr-merged-"));
        expect(merged.runAttempt).toBe(2);
        expect(merged.capturedAt).toBe("2026-09-27T11:00:00Z");
    });

    it("refuses a missing, repeated or unfinished part", async () => {
        const dirs = splitCapture(whole, 3);
        await expect(mergeShards(dirs.slice(0, 2), tempDir("vr-merged-"))).rejects.toThrow(
            /every part 1\/n to n\/n exactly once; got 1\/3, 2\/3/,
        );
        await expect(mergeShards([dirs[0], dirs[1], dirs[1]], tempDir("vr-merged-"))).rejects.toThrow(/exactly once/);
        const unfinished = splitCapture(whole, 2, (r, index) =>
            index === 2 ? { ...r, shard: { ...r.shard, finished: false } } : r,
        );
        await expect(mergeShards(unfinished, tempDir("vr-merged-"))).rejects.toThrow(/not a finished part/);
        await expect(mergeShards([whole], tempDir("vr-merged-"))).rejects.toThrow(/not a finished part/);
    });

    it("refuses parts of different captures, an unreadable part, and writing into a part", async () => {
        const other = splitCapture(whole, 2, (r, index) => (index === 2 ? { ...r, commit: "3".repeat(40) } : r));
        await expect(mergeShards(other, tempDir("vr-merged-"))).rejects.toThrow(/differ in commit/);
        const browsers = splitCapture(whole, 2, (r, index) =>
            index === 2 ? { ...r, environment: { ...r.environment, chromium: "other" } } : r,
        );
        await expect(mergeShards(browsers, tempDir("vr-merged-"))).rejects.toThrow(/differ in environment/);
        const cpus = splitCapture(whole, 2, (r, index) =>
            index === 2 ? { ...r, environment: { ...r.environment, cpu: "another runner" } } : r,
        );
        await expect(mergeShards(cpus, tempDir("vr-merged-"))).resolves.toMatchObject({ complete: true });
        await expect(mergeShards([tempDir("vr-empty-")], tempDir("vr-merged-"))).rejects.toThrow(
            /no readable results\.json/,
        );
        const dirs = splitCapture(whole, 2);
        await expect(mergeShards(dirs, dirs[0])).rejects.toThrow(/--out must be a new directory/);
    });

    it("refuses two parts holding the same item or the same file", async () => {
        const [first] = splitCapture(whole, 2);
        // An item of part 1 that has a capture file, claimed by part 2 as well.
        const item = JSON.parse(readFileSync(join(first, "results.json"), "utf8")).items.find((i) =>
            existsSync(join(first, i.file)),
        );
        const twice = splitCapture(whole, 2, (r, index) =>
            index === 2 ? { ...r, items: [...r.items, item], expected: r.expected + 1 } : r,
        );
        cpSync(join(twice[0], item.file), join(twice[1], item.file));
        await expect(mergeShards(twice, tempDir("vr-merged-"))).rejects.toThrow(/EEXIST/);
        rmSync(join(twice[1], item.file));
        await expect(mergeShards(twice, tempDir("vr-merged-"))).rejects.toThrow(/duplicate/);
    });
});

describe("visual-review capture --shard / --merge", () => {
    const cli = fileURLToPath(new URL("../trusted/cli.mjs", import.meta.url));
    const run = (...args) => spawnSync(process.execPath, [cli, "capture", ...args], { encoding: "utf8" });

    it("rejects a bad --shard before reading any config", () => {
        const r = run("--project", "x", "--out", tempDir("vr-out-"), "--shard", "5/4");
        expect(r.status).toBe(2);
        expect(r.stderr).toContain('--shard must be <i>/<n> with 1 <= i <= n, such as 1/4; got "5/4"');
    });

    it("asks for --out and the parts with --merge, and says why a merge is refused", () => {
        expect(run("--merge", "--out", tempDir("vr-out-")).status).toBe(2);
        expect(run("--out", tempDir("vr-out-"), "somewhere").status).toBe(2);
        const r = run("--merge", "--out", tempDir("vr-out-"), tempDir("vr-empty-"));
        expect(r.status).toBe(1);
        expect(r.stderr).toMatch(/^visual-review capture --merge: .*no readable results\.json/);
    });

    it("joins the parts on the command line", () => {
        const out = join(tempDir("vr-out-"), "joined");
        const r = run("--merge", "--out", out, ...splitCapture(join(FIXTURE, "compact-mantine"), 3));
        expect(r.status).toBe(0);
        expect(JSON.parse(readFileSync(join(out, "results.json"), "utf8")).complete).toBe(true);
    });
});
