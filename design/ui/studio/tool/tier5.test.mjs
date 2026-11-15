// node --test design/ui/studio/tool/tier5.test.mjs
// The study tool's tier 5 wiring, checked with no browser: item 5's list of tier 5 screens gives a
// MISS line for each screen or planted check a bars run left out, and the gate (real.mjs --gate)
// holds a tier 5 round to its own evidence: --tier 5 bars runs in both themes that reached every
// item 5 screen, every setup started cleanly, a success walk that recorded each layer's painted
// members with no end-state mismatch, and the rating check's four sessions and the calm-first
// write-up. A tier 1 and 2 bars run no longer passes for tier 5. The score, step and end-state
// scripts each catch their planted tier 5 cases.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { BAR5_TIER5, BAR5_TIER5_PLANTS, tier5Gaps } from "./measure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const studio = resolve(here, "..");
const real = join(here, "real.mjs");
const SIZES = ["1440x900", "900x700"];
const fullWalk = () => {
    const each = (list) => Object.fromEntries(SIZES.map((z) => [z, [...list]]));
    return { screens: each(BAR5_TIER5.screens), focus: each([]), typed: each([]), planted: each(BAR5_TIER5_PLANTS) };
};

test("item 5's list gives a MISS line for each tier 5 screen and planted check left out", () => {
    assert.deepEqual(tier5Gaps(fullWalk(), SIZES), []);
    const w = fullWalk();
    w.screens["900x700"] = w.screens["900x700"].filter((x) => x !== "50,000: Selected (N)");
    w.planted["1440x900"] = w.planted["1440x900"].filter((x) => x !== "large lists");
    assert.deepEqual(tier5Gaps(w, SIZES), [
        "MISS the large lists check at 1440x900: its planted failure was not caught",
        "MISS 50,000: Selected (N) at 900x700: not walked (item 5 lists it)",
    ]);
    // both hosts, every editor screen
    for (const host of ["style", "filter"])
        for (const s of ["the Except switch on", "the reference picker, typed", "the read-only outline at rest"])
            assert.ok(BAR5_TIER5.screens.includes(`${host}: ${s}`), `${host}: ${s} is not on item 5's list`);
});

// The tier's own files the gate reads (criteria.md, answers.md, decided.md), planted in a folder of the
// test's own (REAL_TIER_FILES) so the verdict never follows the live study's documents. Complete: the
// frozen build's Build notes, a Path steps number for T70 A, a Reference screenshots section naming a
// file that exists. Incomplete: an unread "the dry run reads" value, Build notes of another build, no
// Path steps, and no decided.md.
const FROZEN = "1e5f0a7e5c";
const REJECTED = "7ca4cae647";
async function tierFixture(files, complete) {
    await rm(files, { recursive: true, force: true });
    await mkdir(files, { recursive: true });
    await writeFile(
        join(files, "criteria.md"),
        `The study runs on build ${FROZEN} served from /x\n\n` +
            `T70 A and T70 B each run once on the build the owner rejected (${REJECTED}, built from source).\n`,
    );
    if (complete) {
        await writeFile(
            join(files, "answers.md"),
            `# Answer key\n\n## Build notes (${FROZEN})\n\nRead on the frozen build.\n\n## T70. Weak links\n\nDone. Path steps: 12 (A)\n`,
        );
        await writeFile(join(files, "ref.png"), "");
        await writeFile(join(files, "decided.md"), "# Decided\n\n## Reference screenshots\n\n- `ref.png`\n");
    } else
        await writeFile(
            join(files, "answers.md"),
            "# Answer key\n\n## Build notes (0123456789)\n\n## T70. Weak links\n\nthe dry run reads the count\n",
        );
}

test("the gate holds a tier 5 round to tier 5's evidence", async () => {
    const tier = join(studio, "tier5/rounds");
    const rd = join(tier, "round-97");
    const pass = join(tier, "r97");
    const files = await mkdtemp(join(tmpdir(), "tier5-files-"));
    const frozen = FROZEN;
    const walk = async (half, name, { json = {}, setup = "volunteers.txt", painted = false, setupLog = "" } = {}) => {
        const d = join(pass, "pilot", half, name);
        await rm(d, { recursive: true, force: true });
        await mkdir(d, { recursive: true });
        await writeFile(join(d, "session.json"), JSON.stringify({ commit: frozen, keyboardOnlyMode: false, ...json }));
        await writeFile(join(d, "01.png"), "");
        await writeFile(join(d, "setup.log"), setupLog);
        await writeFile(join(d, "route.jsonl"), JSON.stringify({ start: `setup:/x/setups/${setup}` }) + "\n");
        if (painted) {
            await writeFile(
                join(d, "data.json"),
                JSON.stringify({ counts: {}, sources: [], columns: [], filters: [], filter: null, window: null }),
            );
            const layer = {
                id: "l1",
                name: "Layer 1",
                kind: "custom",
                enabled: true,
                target: "node",
                selector: { match: "rule" },
                counts: { matched: 4, noValue: 0, painted: { "node.color": 4 } },
            };
            const members = painted === "wrong" ? 6 : 4;
            await writeFile(
                join(d, "styles.json"),
                JSON.stringify({
                    changes: { gone: [], added: ["l1"], changed: [] },
                    start: { layers: [] },
                    end: {
                        layers: [layer],
                        painted: {
                            showingBranches: false,
                            workspaceOpen: false,
                            unreadable: 0,
                            layers: { l1: { members, wins: { "node.color": 4 } } },
                        },
                    },
                }),
            );
        }
    };
    const bars = async (name, over = {}) => {
        const d = join(rd, name);
        await mkdir(d, { recursive: true });
        await writeFile(
            join(d, "bars.json"),
            JSON.stringify({
                build: `${frozen.slice(0, 12)} graphty@0`,
                tier: "5",
                scheme: name === "bars-light" ? "light" : "dark",
                untrusted: [],
                log: ["ok   x"],
                walked: fullWalk(),
                ...over,
            }),
        );
        await writeFile(join(d, "spoken.json"), JSON.stringify({ x: { names: ["Done"] } }));
        await writeFile(join(d, "vocabulary.json"), JSON.stringify({ x: { words: ["Done"] } }));
    };
    const gate = () =>
        spawnSync(process.execPath, [real, "--gate", rd], {
            encoding: "utf8",
            env: { ...process.env, REAL_TIER: "", REAL_TIER_FILES: files },
        });
    const clean = () => Promise.all([rd, pass].map((d) => rm(d, { recursive: true, force: true })));
    const good = async () => {
        await clean();
        await tierFixture(files, true);
        await mkdir(rd, { recursive: true });
        await writeFile(join(rd, "plan.md"), "| r97-s01 | T70 | A: volunteers | Grace | `setup:volunteers.txt` |\n");
        await walk("T70A", "success", { painted: true });
        await walk("T70A", "detour-1");
        await walk("T70A", "rating-frozen");
        await walk("T70B", "rating-frozen");
        await walk("T70A", "rating-rejected", { json: { commit: REJECTED } });
        await walk("T70B", "rating-rejected", { json: { commit: REJECTED } });
        await writeFile(join(rd, "calm-first-rejected.md"), "# Calm-first check on the rejected build\n");
        await bars("bars");
        await bars("bars-light");
    };
    const lines = () => gate().stdout;
    try {
        await good();
        const r = gate();
        assert.equal(r.status, 0, `the planted complete tier 5 round was refused: ${r.stdout}${r.stderr}`);
        assert.match(r.stdout, /^gate passed: /m, r.stdout);
        // the tier's own documents still owing their evidence (item 2, 6 and 7) hold the round back
        await good();
        await tierFixture(files, false);
        let out = lines();
        for (const re of [
            /FAIL: \S+answers\.md still holds "the dry run reads"/,
            /FAIL: \S+answers\.md: "Build notes \(0123456789\)" names a build other than the frozen/,
            /FAIL: answers\.md has no "Path steps" number for T70A/,
            /FAIL: \S+decided\.md has no "Reference screenshots" section/,
        ])
            assert.match(out, re, `the incomplete tier 5 files were not refused: ${out}`);
        const refused = async (what, plant, why) => {
            await good();
            await plant();
            out = lines();
            assert.match(out, why, `the gate did not refuse ${what}: ${out}`);
        };
        await refused(
            "a tier 1 and 2 bars run in place of a tier 5 one",
            () =>
                writeFile(join(rd, "bars/bars.json"), JSON.stringify({ build: `${frozen} graphty@0`, untrusted: [] })),
            /bars\/bars\.json is not a --tier 5 run/,
        );
        await refused(
            "a bars run that left out a 50,000-node screen",
            () => bars("bars-light", { walked: { ...fullWalk(), screens: { "1440x900": [], "900x700": [] } } }),
            /bars-light\/bars\.json leaves out \d+ of item 5's checks/,
        );
        await refused(
            "a setup whose step failed",
            async () => {
                await walk("T70A", "success", { painted: true, setupLog: 'nothing on screen is called "Layer"' });
                await walk("T70A", "detour-1", { json: { setupOk: false } });
                await walk("T70A", "rating-frozen", { setup: "other.txt" });
            },
            /FAIL: setup volunteers\.txt: no walk on build \S+ started from it with every setup step working/,
        );
        await refused(
            "a success walk recorded before the layers' painted members",
            () => walk("T70A", "success"),
            /no success walk on build \S+ recorded each layer's painted members/,
        );
        await refused(
            "a success walk whose layer paints more than its count",
            () => walk("T70A", "success", { painted: "wrong" }),
            /end-state check on T70A .*it says it selects 4 nodes with a value, but the element paints 6/,
        );
        await refused(
            "no rating session on the rejected build",
            () => rm(join(pass, "pilot/T70B/rating-rejected"), { recursive: true }),
            /rating check: no T70B session "rating-rejected"/,
        );
        await refused(
            "no calm-first write-up",
            () => rm(join(rd, "calm-first-rejected.md")),
            /no calm-first check on the rejected build/,
        );
        await refused(
            "a reference screenshot listed in decided.md that is not on disk",
            () => rm(join(files, "ref.png")),
            /decided\.md lists reference screenshots that do not exist: ref\.png/,
        );
    } finally {
        await clean();
        await rm(files, { recursive: true, force: true });
    }
});

test("the score, step and end-state scripts each catch their planted tier 5 cases", () => {
    for (const script of ["score.mjs", "steps.mjs", "endstate.mjs"]) {
        const r = spawnSync(process.execPath, [join(here, script), "--self-test"], { encoding: "utf8" });
        assert.equal(r.status, 0, `${script} --self-test: ${r.stdout}${r.stderr}`);
        assert.match(r.stdout, /tier 5|layer/i, `${script} --self-test planted no tier 5 case`);
    }
});

// Tier 5 round 1: every participant quoted the tool's FAIL line ("... plan.md holds no ...") into its
// own transcript.md, and the leak check voided it for opening plan.md. Written text opens nothing.
test("the leak check flags the files a call opens, never the text it writes", async () => {
    const own = await mkdtemp(join(tmpdir(), "leak-check-"));
    const fail = `FAIL: ${studio}/tier5/rounds/round-1/plan.md holds no "Gate evidence" section`;
    const call = (name, input, cwd) => ({
        type: "assistant",
        ...(cwd && { cwd }),
        message: { content: [{ type: "tool_use", name, input }] },
    });
    const leaks = async (...calls) => {
        const t = join(own, "t.jsonl");
        await writeFile(t, calls.map((c) => JSON.stringify(c)).join("\n"));
        return spawnSync(process.execPath, [real, "--leaks", own, t], { encoding: "utf8" });
    };
    try {
        let r = await leaks(
            call("Write", { file_path: join(own, "transcript.md"), content: `${fail}\nsee answers.md` }),
            call("Bash", { command: `cat >> ${own}/transcript.md <<'EOF'\n${fail}\nEOF\nls ${own}` }),
            call("Bash", { command: `cat >> transcript.md <<EOF\nplain text naming tasks.md\nEOF` }),
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
        for (const [c, re] of [
            [call("Read", { file_path: `${studio}/tier5/rounds/round-1/plan.md` }), /a studio file/],
            [call("Bash", { command: `cat ${studio}/tier5/answers.md` }), /a facilitator file, answers\.md/],
            [call("Bash", { command: `cat answers.md <<'EOF'\nx\nEOF` }), /a facilitator file, answers\.md/],
            [call("Bash", { command: `cat > x <<EOF\n$(cat ../tasks.md)\nEOF` }), /a facilitator file, tasks\.md/],
            [call("Write", { file_path: `${studio}/tier5/notes.md`, content: "x" }), /a studio file/],
            // participants run from the repository root, so a path relative to it reaches the studio
            [call("Bash", { command: "cat design/ui/studio/notes/researcher.md" }), /a studio file/],
            [call("Read", { file_path: "design/ui/studio/tier5/report.md" }), /a studio file/],
            [call("Bash", { command: "cat notes/researcher.md" }, `${studio}`), /a studio file/],
            [call("Grep", { pattern: "x", path: "design/ui/studio" }), /a search outside its folder/],
            [call("Glob", { pattern: "**/*.md", path: "design" }), /a search outside its folder/],
        ]) {
            r = await leaks(c);
            assert.equal(r.status, 1, `${JSON.stringify(c.message.content[0].input)} was not flagged: ${r.stdout}`);
            assert.match(r.stdout, re);
        }
    } finally {
        await rm(own, { recursive: true, force: true });
    }
});
