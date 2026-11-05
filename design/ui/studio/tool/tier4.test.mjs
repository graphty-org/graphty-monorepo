// node --test design/ui/studio/tool/tier4.test.mjs
// The study tool's tier 4 wiring, checked with no browser: the gate (real.mjs --gate) finds a round's
// pilot walks in its dry run's passes (rN, rNd1, ...), never counts a detour named for where it goes
// as the success walk, and holds tier 4's bars runs to bar 5 (both themes, every data screen at both
// sizes, the wording check's vocabulary); the bars walk's bar 5 list gives a MISS line for each screen
// left out; the end-state and step-count checks pass their own planted cases.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { BAR5_TIER4, BAR5_TIER4_PLANTS, tier4Gaps } from "./measure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const studio = resolve(here, "..");
const real = join(here, "real.mjs");
const SIZES = ["1440x900", "900x700"];
const fullWalk = () => {
    const each = (list) => Object.fromEntries(SIZES.map((z) => [z, [...list]]));
    return { screens: each(BAR5_TIER4.screens), focus: each([]), typed: each([]), planted: each(BAR5_TIER4_PLANTS) };
};
const without = (walk, kind, size, name) => ({
    ...walk,
    [kind]: { ...walk[kind], [size]: walk[kind][size].filter((x) => x !== name) },
});

test("bar 5's list gives a MISS line for each tier 4 screen and planted check left out, at each size", () => {
    assert.deepEqual(tier4Gaps(fullWalk(), SIZES), []);
    assert.deepEqual(tier4Gaps(without(fullWalk(), "screens", "900x700", "the join screen"), SIZES), [
        "MISS the join screen at 900x700: not walked (bar 5 lists it)",
    ]);
    assert.deepEqual(tier4Gaps(without(fullWalk(), "planted", "1440x900", "axe"), SIZES), [
        "MISS the axe check at 1440x900: its planted failure was not caught",
    ]);
    assert.equal(tier4Gaps({}, SIZES).length, 2 * (BAR5_TIER4.screens.length + BAR5_TIER4_PLANTS.length));
});

test("the gate reads a round's walks from its dry run's passes, a detour never as the success walk, and tier 4's bars", async () => {
    const tier = join(studio, "tier4/rounds");
    const rd = join(tier, "round-97");
    const passes = ["r97", "r97d1", "r97d2"].map((p) => join(tier, p));
    // the frozen build's commit: walks on it count
    const frozen = readFileSync(join(studio, "tier4/criteria.md"), "utf8").match(/build ([0-9a-f]{7,40})/)[1];
    const walk = async (pass, half, name, json = {}) => {
        const d = join(tier, pass, "pilot", half, name);
        await mkdir(d, { recursive: true });
        await writeFile(join(d, "session.json"), JSON.stringify({ commit: frozen, keyboardOnlyMode: false, ...json }));
        await writeFile(join(d, "01.png"), "");
    };
    const bars = async (name, over = {}, { spoken = true, vocab = true } = {}) => {
        const d = join(rd, name);
        await mkdir(d, { recursive: true });
        await writeFile(
            join(d, "bars.json"),
            JSON.stringify({
                build: `${frozen.slice(0, 12)} graphty@0.8.92`,
                tier: "4",
                scheme: name === "bars-light" ? "light" : "dark",
                untrusted: [],
                log: ["ok   x"],
                walked: fullWalk(),
                ...over,
            }),
        );
        if (spoken) await writeFile(join(d, "spoken.json"), JSON.stringify({ "the join screen": { names: ["Join"] } }));
        if (vocab)
            await writeFile(join(d, "vocabulary.json"), JSON.stringify({ "the join screen": { words: ["Join"] } }));
    };
    const plan = [
        "| r97-s01 | T61 | A: food bank | Grace | `empty` |",
        "| r97-s02 | T61 | A: food bank | Sam | `empty --keys` |",
        "| r97-s03 | T67 | A: food bank | Alex | `setup:pantries.txt` |",
    ].join("\n");
    const gate = () =>
        spawnSync(process.execPath, [real, "--gate", rd], { encoding: "utf8", env: { ...process.env, REAL_TIER: "" } });
    const clean = () => Promise.all([rd, ...passes].map((d) => rm(d, { recursive: true, force: true })));
    const good = async () => {
        await clean();
        await mkdir(rd, { recursive: true });
        await writeFile(join(rd, "plan.md"), plan + "\n");
        // the walks of one half spread over the dry run's passes, none in the round's own folder
        await walk("r97d1", "T61A", "n1-success");
        await walk("r97d2", "T61A", "d1-main-menu");
        await walk("r97", "T61A", "k1-keyboard", { keyboardOnlyMode: true });
        await walk("r97d2", "T67A", "x1-path");
        await walk("r97d2", "T67A", "x2a-table");
        await bars("bars");
        await bars("bars-light");
    };
    try {
        await good();
        let r = gate();
        assert.equal(r.status, 0, `the planted good round was refused: ${r.stdout}${r.stderr}`);
        const evidence = readFileSync(join(rd, "plan.md"), "utf8");
        assert.match(evidence, /pilot T67A: success \S+r97d2\/pilot\/T67A\/x1-path\/, detours \S+x2a-table\//);
        const refused = async (what, plant, why) => {
            await good();
            await plant();
            r = gate();
            assert.equal(r.status, 1, `the gate passed ${what}: ${r.stdout}`);
            assert.match(r.stdout, why, `the gate refused ${what} for another reason: ${r.stdout}`);
            assert.doesNotMatch(readFileSync(join(rd, "plan.md"), "utf8"), /Gate evidence/);
        };
        await refused(
            "a half whose only other walk is a detour named for where it goes",
            () => rm(join(tier, "r97d2/pilot/T67A/x1-path"), { recursive: true }),
            /T67A: no success walk/,
        );
        await refused(
            "a half whose walks are on another app build",
            () => walk("r97d1", "T61A", "n1-success", { commit: "0ffeae2ef5" }),
            /T61A: no success walk .*n1-success: build 0ffeae2ef5 has app code other than/,
        );
        await refused(
            "a tier 2 bars run in place of a tier 4 one",
            () =>
                writeFile(join(rd, "bars/bars.json"), JSON.stringify({ build: `${frozen} graphty@0`, untrusted: [] })),
            /bars\/bars\.json is not a --tier 4 run/,
        );
        await refused(
            "a light-theme folder holding a dark run",
            () => bars("bars-light", { scheme: "dark" }),
            /bars-light\/bars\.json is not a light-theme run/,
        );
        await refused(
            "a bars run that left out the join screen at 900 x 700",
            () => bars("bars", { walked: without(fullWalk(), "screens", "900x700", "the join screen") }),
            /bars\/bars\.json leaves out 1 of bar 5's checks, the first: MISS the join screen at 900x700/,
        );
        await refused(
            "a bars run that wrote no vocabulary.json",
            () => rm(join(rd, "bars-light/vocabulary.json")),
            /no screen words: \S+bars-light\/vocabulary\.json/,
        );
        await refused(
            "a round with no light-theme bars run",
            () => rm(join(rd, "bars-light"), { recursive: true }),
            /no bars run: \S+bars-light\/bars\.json is missing/,
        );
    } finally {
        await clean();
    }
});

test("the end-state check and the step count each catch their planted cases", () => {
    for (const script of ["endstate.mjs", "steps.mjs"]) {
        const r = spawnSync(process.execPath, [join(here, script), "--self-test"], { encoding: "utf8" });
        assert.equal(r.status, 0, `${script} --self-test: ${r.stdout}${r.stderr}`);
    }
});
