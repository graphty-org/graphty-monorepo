// node --test design/ui/studio/tool/tier3.test.mjs
// The study tool's tier wiring and the style-tree dump, checked with no browser: a folder under tier3/
// is briefed from tier 3's tasks and roster (a tier 2 folder still from tier 2's), a first-time
// persona's briefing says so, a keyboard-only start reaches the command, and the dump's comparison
// catches a planted removal.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { styleChanges, styleContent } from "./measure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const studio = resolve(here, "..");
const repo = resolve(studio, "../../..");
const real = join(here, "real.mjs");
const scratchOf = (dir) => join(repo, "tmp/studio-sessions", dir.slice(studio.length + 1));
const brief = (...a) =>
    spawnSync(process.execPath, [real, "--brief", ...a], { encoding: "utf8", env: { ...process.env, REAL_TIER: "" } });

test("a tier 3 folder is briefed from tier 3's files, as a first-time user", () => {
    const dir = join(studio, "tier3/rounds/zz-tool-test/sessions/t1");
    const r = brief(dir, "--task", "T40B", "--persona", "Maren");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const text = readFileSync(join(scratchOf(dir), "briefing.md"), "utf8");
    assert.match(text, /yeast-galactose\.graphml/, "not tier 3's T40 B prompt");
    assert.match(text, /## Your experience with this program\n\n"This is your first time/);
    assert.doesNotMatch(text, /earlier sessions/);
    assert.match(text, /REAL_TIER=3 node \S+real\.mjs --start /);
    assert.doesNotMatch(text, /Words avoided|Kept on purpose|answers\.md/);
});

test("a tier 2 folder is still briefed from tier 2's files (the planted wrong tier)", () => {
    const dir = join(studio, "tier2/rounds/zz-tool-test/sessions/t1");
    const r = brief(dir, "--task", "T20A", "--persona", "Grace");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const text = readFileSync(join(scratchOf(dir), "briefing.md"), "utf8");
    assert.match(text, /REAL_TIER=2 /);
    assert.doesNotMatch(text, /This is your first time using this program, and it has just opened/);
});

test("every planned tier 3 row in a plan briefs, and a keyboard-only start keeps --keys", async () => {
    const rd = join(studio, "tier3/rounds/zz-tool-test");
    await mkdir(rd, { recursive: true });
    const roster = readFileSync(join(studio, "tier3/roster.md"), "utf8");
    // one row per task half of the roster's allocation table, with each persona named first there
    const rows = [...roster.matchAll(/^\| (T\d+) [^|]*\(([AB])\)\s*\|\s*\d+\s*\|\s*([^|]+?)\s*\|$/gm)].flatMap(
        ([, task, half, who]) => who.split(/,\s*/).map((p) => [task, half, p]),
    );
    assert.equal(rows.length, 56, `the roster allocates ${rows.length} sessions, not 56`);
    const plan = rows.map(
        ([task, half, p], i) =>
            `| r9-s${String(i + 1).padStart(2, "0")} | ${task} | ${half}: data | ${p} | \`${p === "Sam" ? "empty --keys" : "empty"}\` |`,
    );
    await writeFile(join(rd, "plan.md"), plan.join("\n") + "\n");
    try {
        for (const [i, [task, half, p]] of rows.entries()) {
            const id = `r9-s${String(i + 1).padStart(2, "0")}`;
            const r = brief(join(rd, "sessions", id));
            assert.equal(r.status, 0, `${id} (${task}${half}, ${p}) did not brief: ${r.stdout}${r.stderr}`);
            if (p === "Sam") {
                const text = readFileSync(join(scratchOf(join(rd, "sessions", id)), "briefing.md"), "utf8");
                assert.match(text, /--start \S+ empty --keys/, `${id}: Sam's start lost --keys`);
            }
        }
    } finally {
        await rm(rd, { recursive: true, force: true });
        await rm(scratchOf(rd), { recursive: true, force: true });
    }
});

test("the style-tree comparison catches a planted removal and a changed color, not a new id", () => {
    const layer = (id, color, row = id) => ({
        id,
        row,
        name: "Layer",
        selector: { match: "everything" },
        set: { "node.color": color },
        counts: { matched: 3 },
    });
    const start = { tree: [], layers: [layer("a_1", "#111111"), layer("b_1", "#222222")] };
    const removed = { tree: [], layers: [layer("a_1", "#111111")] };
    assert.deepEqual(styleChanges(start, removed), { gone: ["b_1"], added: [], changed: [] });
    const recolored = { tree: [], layers: [layer("a_1", "#111111"), layer("b_1", "#FF0000")] };
    assert.deepEqual(styleChanges(start, recolored).changed, ["b_1"]);
    // the same looks under new ids and rows read the same; a count alone is no change
    const renumbered = {
        tree: [],
        layers: [layer("a_9", "#111111", "r_9"), { ...layer("b_9", "#222222"), counts: { matched: 9 } }],
    };
    assert.equal(styleContent(start), styleContent(renumbered));
});
