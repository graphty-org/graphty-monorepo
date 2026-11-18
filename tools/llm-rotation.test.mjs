// node --test tools/llm-rotation.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

import { AI_PATHS } from "./bisect-ci.mjs";
import { caseResults, nextState, planSelection, ROTATION_PATHS } from "./llm-rotation.mjs";

const state = { sha: "b".repeat(40), slice: 1, slices: 4, lastFull: "a".repeat(40), failed: [] };
const plan = (o) => planSelection({ state, slices: 4, full: false, runNumber: 7, changed: [], ...o });

describe("planSelection", () => {
    it("takes the slice after the last recorded run's, wrapping at the slice count", () => {
        assert.equal(plan().slice, 2);
        assert.equal(plan().full, false);
        assert.equal(plan({ state: { ...state, slice: 3 } }).slice, 0);
    });

    it("walks every slice in K runs, whatever the run numbers", () => {
        const seen = new Set();
        let s = state;
        for (let run = 0; run < 4; run++) {
            const p = plan({ state: s, runNumber: run * 2 });
            seen.add(p.slice);
            s = nextState({ prev: s, selection: p, results: [], sha: s.sha, run: "r" });
        }
        assert.deepEqual([...seen].sort(), [0, 1, 2, 3]);
    });

    it("starts from the run number with no record, and runs every case", () => {
        const p = plan({ state: null, runNumber: 7 });
        assert.equal(p.slice, 3);
        assert.equal(p.full, true);
        assert.match(p.why, /no earlier LLM run/);
    });

    it("runs every case when FULL is asked for", () => {
        assert.equal(plan({ full: true }).full, true);
    });

    it("runs every case when the AI code changed since the last full run, or that cannot be told", () => {
        const p = plan({ changed: ["graphty-element/src/ai/AiManager.ts"] });
        assert.equal(p.full, true);
        assert.match(p.why, /src\/ai\/AiManager\.ts/);
        assert.equal(plan({ changed: null }).full, true);
        assert.equal(plan({ state: { ...state, lastFull: "" } }).full, true);
    });

    it("always adds the cases that failed the last time they ran, with the run they failed in", () => {
        const failed = [{ name: "test/ai/llm-regression/x.test.ts > a > b", run: "https://run/1" }];
        const p = plan({ state: { ...state, failed } });
        assert.deepEqual(p.also, [failed[0].name]);
        assert.deepEqual(p.extras, [{ name: failed[0].name, why: "failed in https://run/1" }]);
    });
});

describe("ROTATION_PATHS", () => {
    it("covers every path an LLM-lane bisect takes a candidate for, so a green slice run never hides a candidate's break", () => {
        for (const path of AI_PATHS) assert.ok(ROTATION_PATHS.includes(path), path);
    });
});

describe("caseResults", () => {
    it("names each executed case as vitest's task.fullName does, leaving skipped ones out", () => {
        const report = {
            testResults: [
                {
                    name: "/w/graphty-element/test/ai/llm-regression/x.test.ts",
                    assertionResults: [
                        { ancestorTitles: ["outer", "inner"], title: "runs", status: "passed" },
                        { ancestorTitles: ["outer"], title: "breaks", status: "failed" },
                        { ancestorTitles: ["outer"], title: "rests", status: "skipped" },
                    ],
                },
            ],
        };
        assert.deepEqual(caseResults(report, "/w/graphty-element"), [
            { name: "test/ai/llm-regression/x.test.ts > outer > inner > runs", status: "passed" },
            { name: "test/ai/llm-regression/x.test.ts > outer > breaks", status: "failed" },
        ]);
    });
});

describe("nextState", () => {
    const selection = { full: false, slice: 2, slices: 4 };

    it("keeps a failed case until a run executes it and it passes", () => {
        const prev = {
            ...state,
            failed: [
                { name: "old", run: "r1" },
                { name: "fixed", run: "r1" },
            ],
        };
        const results = [
            { name: "fixed", status: "passed" },
            { name: "new", status: "failed" },
        ];
        const next = nextState({ prev, selection, results, sha: "c", run: "r2" });
        assert.deepEqual(next.failed, [
            { name: "old", run: "r1" },
            { name: "new", run: "r2" },
        ]);
        assert.equal(next.slice, 2);
        assert.equal(next.lastFull, state.lastFull);
    });

    it("records a full run's commit as the last full run", () => {
        assert.equal(
            nextState({ prev: state, selection: { ...selection, full: true }, results: [], sha: "c", run: "r" })
                .lastFull,
            "c",
        );
    });
});

describe("release.yml's LLM job", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const steps = parseYaml(readFileSync(join(root, ".github/workflows/release.yml"), "utf8")).jobs.llm.steps;
    const step = (name) => steps.find((x) => x.name === name);

    it("passes the plan to the tests and records each run for the next, as the steps run on a runner", () => {
        const pick = step("Pick this run's LLM regression cases");
        const tests = step("LLM regression tests");
        const record = step("Record which LLM regression cases ran and failed");
        assert.match(tests.env.LLM_REGRESSION_SELECTION, /llm-selection\.json$/);
        assert.match(tests.run, /--reporter=json[^\n]*\n[^\n]*--outputFile\.json="\$RUNNER_TEMP\/llm-report\.json"/);
        assert.match(
            pick.env.FULL,
            /inputs\.mode == 'shadow' \|\| inputs\.mode == 'legacy' \|\| inputs\.llm_full == true/,
        );
        assert.match(record.if, /steps\.llm\.outputs\.owner_item == ''/, "a refused account records nothing");

        const dir = mkdtempSync(join(tmpdir(), "llm-rotation-"));
        const head = execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: root,
            encoding: "utf8",
            env: isolatedGitEnv(),
        }).trim();
        // gh: the artifact listing prints FAKE_URL (gh applies the --jq), the download prints the zip
        writeFileSync(
            join(dir, "gh"),
            '#!/bin/sh\ncase "$2" in *artifacts\\?name=*) printf "%s" "$FAKE_URL";; *) cat "$FAKE_ZIP";; esac\n',
        );
        chmodSync(join(dir, "gh"), 0o755);
        const env = (more) => ({
            ...isolatedGitEnv(),
            PATH: `${dir}:${process.env.PATH}`,
            RUNNER_TEMP: dir,
            GITHUB_REPOSITORY: "o/r",
            GITHUB_STEP_SUMMARY: join(dir, "summary.md"),
            SLICES: "4",
            FULL: "false",
            RUN_NUMBER: "5",
            ...more,
        });
        const run = (s, cwd, more = {}) =>
            execFileSync("bash", ["-e", "-c", s.run], { cwd, env: env(more), encoding: "utf8" });
        const selection = () => JSON.parse(readFileSync(join(dir, "llm-selection.json"), "utf8"));
        try {
            // the first run finds no record: every case, slice from the run number
            run(pick, root, { FAKE_URL: "" });
            assert.equal(selection().full, true);
            assert.equal(selection().slice, 1);

            const failing = "test/ai/llm-regression/x.test.ts > style > colors";
            const report = {
                testResults: [
                    {
                        name: join(root, "graphty-element/test/ai/llm-regression/x.test.ts"),
                        assertionResults: [
                            { ancestorTitles: ["style"], title: "colors", status: "failed" },
                            { ancestorTitles: ["style"], title: "sizes", status: "passed" },
                        ],
                    },
                ],
            };
            writeFileSync(join(dir, "llm-report.json"), JSON.stringify(report));
            run(record, join(root, "graphty-element"), { SHA: head, RUN_URL: "https://run/1" });
            const state = JSON.parse(readFileSync(join(dir, "llm-record/state.json"), "utf8"));
            assert.deepEqual(state, {
                sha: head,
                slice: 1,
                slices: 4,
                lastFull: head,
                failed: [{ name: failing, run: "https://run/1" }],
            });

            // the next run reads that record: the next slice, the failed case added, no AI change since the full run
            mkdirSync(join(dir, "zip"));
            writeFileSync(join(dir, "zip/state.json"), JSON.stringify(state));
            execFileSync("python3", ["-m", "zipfile", "-c", join(dir, "state.zip"), "state.json"], {
                cwd: join(dir, "zip"),
            });
            rmSync(join(dir, "llm-state"), { recursive: true, force: true });
            run(pick, root, { FAKE_URL: "https://api/zip", FAKE_ZIP: join(dir, "state.zip") });
            assert.deepEqual(selection().full, false);
            assert.equal(selection().slice, 2);
            assert.deepEqual(selection().also, [failing]);
            assert.match(
                readFileSync(join(dir, "summary.md"), "utf8"),
                /Slice 3 of 4[\s\S]*x\.test\.ts > style > colors -- failed in https:\/\/run\/1/,
            );

            // FULL forces every case
            run(pick, root, { FAKE_URL: "https://api/zip", FAKE_ZIP: join(dir, "state.zip"), FULL: "true" });
            assert.equal(selection().full, true);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
