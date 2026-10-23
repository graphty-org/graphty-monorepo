// node --test design/ui/studio/tool/tier3.test.mjs
// The study tool's tier wiring and the style-tree dump, checked with no browser: a folder under tier3/
// is briefed from tier 3's tasks and roster (a tier 2 folder still from tier 2's), a first-time
// persona's briefing says so, a keyboard-only start reaches the command, a briefing points at no
// study file, the dump's comparison catches a planted removal, the gate (real.mjs --gate) refuses
// each planted gap preflight 3 names, and the bars walk's list of bar 6 gives a MISS line for each
// screen and typing check a run leaves out.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { BAR6, BAR6_PLANTS, bar6Gaps, styleChanges, styleContent } from "./measure.mjs";

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

test("a briefing points the participant at no study file (the persona's hypotheses line)", () => {
    const dir = join(studio, "tier3/rounds/zz-tool-test/sessions/t2");
    const r = brief(dir, "--task", "T39A", "--persona", "Elena");
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const text = readFileSync(join(scratchOf(dir), "briefing.md"), "utf8");
    assert.match(text, /What would delight her/i, "Elena's persona is not in her briefing");
    assert.match(text, /When she gives up she does not announce it/, "a playing rule was dropped with the pointer");
    assert.doesNotMatch(text, /study\/hypotheses|hypotheses file/, "the briefing points at team files");
});

// round 1's tool dry run 2: four persona files ended in stray markup, and "Evidence limits" told the
// study team how to weight the persona's findings; both reached the participant. Dry run 3: Sam's "Why
// this persona exists" (the studio's keyboard bar, another persona) and Nadia's "Do not show her the
// design's hypotheses" are for the team too
test("a briefing holds no stray markup and no note to the study team", () => {
    for (const [i, [task, p]] of [
        ["T39A", "Sam"],
        ["T40A", "Ruth"],
        ["T47A", "Grace"],
        ["T48B", "Nadia"],
        ["T39B", "Dev"],
        ["T40B", "Maren"],
        ["T38A", "Alex"],
        ["T39A", "Tom"],
        ["T39A", "Elena"],
    ].entries()) {
        const dir = join(studio, `tier3/rounds/zz-tool-test/sessions/m${i}`);
        const r = brief(dir, "--task", task, "--persona", p);
        assert.equal(r.status, 0, r.stdout + r.stderr);
        const text = readFileSync(join(scratchOf(dir), "briefing.md"), "utf8");
        assert.doesNotMatch(text, /<\/?(content|invoke)>/, `${p}'s briefing carries markup`);
        assert.doesNotMatch(
            text,
            /Evidence limits|Weight findings|findings about import|finding may rest|finding as a lead|study team|Why this persona exists|keyboard bar|design'?s? hypothes/i,
            `${p}'s briefing carries the team's note`,
        );
    }
});

// every bar 6 check reached at both sizes, as bars.json's "walked" records it
const SIZES = ["1440x900", "900x700"];
const fullWalk = () => {
    const each = (list) => Object.fromEntries(SIZES.map((z) => [z, [...list]]));
    return {
        screens: each(BAR6.screens),
        focus: each(BAR6.focus),
        typed: each(BAR6.typed),
        planted: each(BAR6_PLANTS),
    };
};
const without = (walk, kind, size, name) => ({
    ...walk,
    [kind]: { ...walk[kind], [size]: walk[kind][size].filter((x) => x !== name) },
});

test("the bars walk's bar 6 list gives a MISS line for each of the five screens and Starts with", () => {
    const sizes = SIZES;
    const all = fullWalk();
    assert.deepEqual(bar6Gaps(all, sizes), [], "a walk that reached everything has gaps");
    const added = [
        "the find box, a name typed, its results",
        "a node's inspector, its Memberships",
        "a node's own Style tab, its Fill + and Why this look",
        "the open shape list",
        "a sample just opened, the key switched on",
    ];
    for (const screen of added) {
        const gaps = bar6Gaps(
            { ...all, screens: { ...all.screens, "900x700": all.screens["900x700"].filter((x) => x !== screen) } },
            sizes,
        );
        assert.deepEqual(gaps, [`MISS ${screen} at 900x700: not walked (bar 6 lists it)`]);
    }
    const noStarts = bar6Gaps(without(all, "typed", "1440x900", "a text card after Starts with"), sizes);
    assert.deepEqual(noStarts, [
        "MISS typing into a text card after Starts with at 1440x900: not checked (bar 6 lists it)",
    ]);
    assert.equal(
        bar6Gaps({}, sizes).length,
        2 * (BAR6.screens.length + BAR6.focus.length + BAR6.typed.length + BAR6_PLANTS.length),
    );
});

// tool dry run 2 of round 1: the walk recorded every screen at 900 x 700 while measuring only bar 10
// there, so axe, shared names, focus and typing at 900 x 700 were never read and the gate passed
test("bar 6 is checked at 900 x 700 too: each check left out or unproven there is a MISS line", () => {
    const all = fullWalk();
    assert.deepEqual(bar6Gaps(without(all, "focus", "900x700", "adding a layer"), SIZES), [
        "MISS focus after adding a layer at 900x700: not checked (bar 6 lists it)",
    ]);
    assert.deepEqual(bar6Gaps(without(all, "typed", "900x700", "a new Shape line"), SIZES), [
        "MISS typing into a new Shape line at 900x700: not checked (bar 6 lists it)",
    ]);
    for (const c of BAR6_PLANTS)
        assert.deepEqual(bar6Gaps(without(all, "planted", "900x700", c), SIZES), [
            `MISS the ${c} check at 900x700: its planted failure was not caught`,
        ]);
    // the old record (focus and typed one list, measured at the first size only) leaves 900 x 700 out
    const old = { ...all, focus: [...BAR6.focus], typed: [...BAR6.typed] };
    assert.ok(
        bar6Gaps(old, SIZES).includes("MISS focus after adding a layer at 900x700: not checked (bar 6 lists it)"),
    );
});

// The gate on a planted tier 3 round: a frozen-build walk is any commit whose app code is the
// frozen build's (22cb4d4365 holds 758b8e8081's), never one whose app code differs (31e8c23878)
test("the gate holds a half only with its walks by half folder, and a bars run that covers bar 6", async () => {
    const rd = join(studio, "tier3/rounds/zz-gate-test");
    const frozen = "758b8e8081dc3a8daa2eaf3a8996e989fa2b2a58";
    const walk = async (half, name, json = {}) => {
        const d = join(rd, "pilot", half, name);
        await mkdir(d, { recursive: true });
        await writeFile(join(d, "session.json"), JSON.stringify({ commit: frozen, keyboardOnlyMode: false, ...json }));
        await writeFile(join(d, "01.png"), "");
    };
    const bars = async (name, over = {}, spoken = { "the start screen": { names: ["Open a file"] } }) => {
        const d = join(rd, name);
        await mkdir(d, { recursive: true });
        const walked = fullWalk();
        await writeFile(
            join(d, "bars.json"),
            JSON.stringify({
                build: "758b8e8081dc graphty@0.8.91",
                tier: "3",
                untrusted: [],
                log: ["ok   x"],
                walked,
                ...over,
            }),
        );
        if (spoken) await writeFile(join(d, "spoken.json"), JSON.stringify(spoken));
    };
    const plan = [
        "| r9-s01 | T39 | A: Les Miserables | Elena | `empty` |",
        "| r9-s02 | T39 | A: Les Miserables | Sam | `empty --keys` |",
        "| r9-s03 | T40 | B: yeast genes | Ruth | `empty` |",
    ].join("\n");
    const gate = () =>
        spawnSync(process.execPath, [real, "--gate", rd], { encoding: "utf8", env: { ...process.env, REAL_TIER: "" } });
    const good = async () => {
        await rm(rd, { recursive: true, force: true });
        await mkdir(rd, { recursive: true });
        await writeFile(join(rd, "plan.md"), plan + "\n");
        await walk("T39A", "m-pointer");
        await walk("T39A", "j-detours", { commit: "22cb4d4365" });
        await walk("T39A", "s3-keys", { keyboardOnlyMode: true });
        await walk("T40B", "success");
        await walk("T40B", "detours");
        await bars("bars");
        await bars("bars-light");
    };
    try {
        await good();
        let r = gate();
        assert.equal(r.status, 0, `the planted good round was refused: ${r.stdout}${r.stderr}`);
        assert.match(readFileSync(join(rd, "plan.md"), "utf8"), /^## Gate evidence$/m);
        const refused = async (what, plant, why) => {
            await good();
            await plant();
            r = gate();
            assert.equal(r.status, 1, `the gate passed ${what}: ${r.stdout}`);
            assert.match(r.stdout, why, `the gate refused ${what} for another reason: ${r.stdout}`);
            assert.doesNotMatch(readFileSync(join(rd, "plan.md"), "utf8"), /Gate evidence/);
        };
        await refused(
            "a pilot keyed by its walk's own folder, not its half's",
            async () => {
                await rm(join(rd, "pilot"), { recursive: true });
                await walk("T39A", ".");
                await walk("x", "T40B");
            },
            /T39A: no success, no detours, no keyboard walk[\s\S]*T40B: no success, no detours walk/,
        );
        await refused(
            "a half with no detours walk",
            () => rm(join(rd, "pilot/T40B/detours"), { recursive: true }),
            /FAIL: T40B: no detours walk/,
        );
        await refused(
            "a keyboard-only half with no keyboard walk",
            () => rm(join(rd, "pilot/T39A/s3-keys"), { recursive: true }),
            /FAIL: T39A: no keyboard walk/,
        );
        await refused(
            "a keyboard walk not started --keys",
            () => walk("T39A", "s3-keys", { keyboardOnlyMode: false }),
            /T39A: no keyboard walk .*s3-keys: not started --keys/,
        );
        await refused(
            "a walk on a build whose app code differs",
            () => walk("T40B", "success", { commit: "31e8c23878" }),
            /T40B: no success walk .*success: build 31e8c23878 has app code other than 758b8e8081/,
        );
        await refused(
            "a bars run missing a bar 6 screen",
            () => bars("bars-light", { walked: without(fullWalk(), "screens", "1440x900", "the start screen") }),
            /bars-light\/bars\.json leaves out 1 of bar 6's checks, the first: MISS the start screen at 1440x900/,
        );
        await refused(
            "a bars run with a MISS line",
            () => bars("bars", { log: ["ok   a", "MISS a text card at 900x700: an earlier move missed"] }),
            /bars\.json has 1 MISS lines/,
        );
        await refused(
            "a bars run whose focus check was never proven at 900 x 700",
            () => bars("bars", { walked: without(fullWalk(), "planted", "900x700", "focus") }),
            /bars\/bars\.json leaves out 1 of bar 6's checks, the first: MISS the focus check at 900x700/,
        );
        await refused("a bars run that wrote no spoken.json", () => rm(join(rd, "bars/spoken.json")), /no spoken text/);
        await refused(
            "the stub bars run the tool dry run planted",
            () => writeFile(join(rd, "bars/bars.json"), JSON.stringify({ build: "758b8e8081x", untrusted: [] })),
            /bars\/bars\.json is not a --tier 3 run/,
        );
        await refused(
            "a round with no light-theme bars run",
            () => rm(join(rd, "bars-light"), { recursive: true }),
            /no bars run: \S+bars-light\/bars\.json is missing/,
        );
    } finally {
        await rm(rd, { recursive: true, force: true });
    }
});
