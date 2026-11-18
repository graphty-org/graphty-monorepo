// node --test tools/test-rotation.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

import { AI_PATHS } from "./bisect-ci.mjs";
import {
    caseResults,
    fileResults,
    isSelected,
    LANES,
    nextState,
    planSelection,
    sliceOf,
    t4Env,
} from "./test-rotation.mjs";

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

describe("the LLM lane's paths", () => {
    it("covers every path an LLM-lane bisect takes a candidate for, so a green slice run never hides a candidate's break", () => {
        for (const path of AI_PATHS) assert.ok(LANES.llm.paths.includes(path), path);
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
        assert.match(tests.run, /--reporter=json[^\n]*--outputFile\.json="?\$RUNNER_TEMP\/llm-report\.json/);
        assert.match(
            pick.env.FULL,
            /inputs\.mode == 'shadow' \|\| inputs\.mode == 'legacy' \|\| inputs\.llm_full == true/,
        );
        assert.match(record.if, /steps\.llm\.outputs\.owner_item == ''/, "a refused account records nothing");

        const dir = mkdtempSync(join(tmpdir(), "test-rotation-"));
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

describe("the T4 lane", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const files = execFileSync("git", ["ls-files", "--", "webgpu-graph-algorithms/test/*.test.ts"], {
        cwd: root,
        encoding: "utf8",
        env: isolatedGitEnv(),
    })
        .split("\n")
        .filter(Boolean);
    const t4 = (o) => planSelection({ state, slices: 4, full: false, runNumber: 0, changed: [], lane: LANES.t4, ...o });

    it("puts every test file in exactly one slice, the same one each time, and no slice is empty", () => {
        const counts = new Map();
        for (let slice = 0; slice < 4; slice++) {
            const picked = files.filter((f) => isSelected(f, { full: false, slice, slices: 4, also: [] }));
            assert.ok(picked.length > 0, `slice ${slice} is empty`);
            for (const f of picked) counts.set(f, (counts.get(f) ?? 0) + 1);
        }
        assert.equal(counts.size, files.length);
        assert.ok([...counts.values()].every((n) => n === 1));
        // FNV-1a, as graphty-element/test/helpers/llm-regression-rotation.ts computes it: a changed hash reshuffles
        // every slice
        assert.equal(
            sliceOf("webgpu-graph-algorithms/test/limits/layout-1m.test.ts", 4),
            sliceOf("webgpu-graph-algorithms/test/limits/layout-1m.test.ts", 4),
        );
        assert.equal(sliceOf("a", 1_000_000), 0xe40c292c % 1_000_000);
    });

    it("passes the slice's files to vitest package-relative, adds the failed ones, and passes none for every file", () => {
        const failed = files.find((f) => sliceOf(f, 4) !== 2);
        const plan = t4({ state: { ...state, failed: [{ name: failed, run: "https://run/1" }] } });
        assert.equal(plan.slice, 2);
        const env = t4Env(plan, files);
        const args = env.T4_ARGS.split(" ");
        assert.equal(args[0], "--passWithNoTests");
        assert.ok(args.includes(failed.replace("webgpu-graph-algorithms/", "")), "a failed file is always added");
        assert.ok(args.slice(1).every((a) => a.startsWith("test/")));
        assert.equal(env.count, args.length - 1);
        assert.equal(
            env.T4_BROWSER,
            String(args.some((a) => a.startsWith("test/browser/"))),
            "the browser smoke runs only with a browser file",
        );
        assert.deepEqual(t4Env(t4({ full: true }), files), { T4_ARGS: "", T4_BROWSER: "true", count: files.length });
    });

    it("runs every file when the GPU code changed since the last full run", () => {
        const p = t4({ changed: ["webgpu-graph-algorithms/src/kernel/batch.ts"] });
        assert.equal(p.full, true);
        assert.match(p.why, /GPU code or its tests changed[\s\S]*batch\.ts/);
    });

    it("runs every file when anything the sliced files load changed: the package's workspace dependencies too", () => {
        const pkg = JSON.parse(readFileSync(join(root, "webgpu-graph-algorithms/package.json"), "utf8"));
        const workspace = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })
            .filter(([, v]) => String(v).startsWith("workspace:"))
            .map(([n]) => n.replace("@graphty/", ""));
        for (const dir of ["webgpu-graph-algorithms", "pnpm-lock.yaml", ".github/workflows/gpu.yml", ...workspace])
            assert.ok(LANES.t4.paths.includes(dir), dir);
    });

    it("reads each GPU test file's outcome from the JUnit reports, leaving other packages and all-skipped files out", () => {
        const dir = mkdtempSync(join(tmpdir(), "t4-junit-"));
        const xml = (cases) => `<testsuites>${cases}</testsuites>`;
        try {
            writeFileSync(
                join(dir, "junit-webgpu-graph-algorithms-run1-11.xml"),
                xml(
                    '<testcase classname="test/a.test.ts" name="x"/>' +
                        '<testcase classname="test/b.test.ts" name="y"><failure message="no"/></testcase>' +
                        '<testcase classname="test/b.test.ts" name="z"/>' +
                        '<testcase classname="test/c.test.ts" name="s"><skipped/></testcase>',
                ),
            );
            writeFileSync(
                join(dir, "junit-graph-format-12.xml"),
                xml('<testcase classname="test/g.test.ts" name="g"/>'),
            );
            assert.deepEqual(fileResults(dir), [
                { name: "webgpu-graph-algorithms/test/a.test.ts", status: "passed" },
                { name: "webgpu-graph-algorithms/test/b.test.ts", status: "failed" },
            ]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe("gpu.yml's T4 job", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const gpu = parseYaml(readFileSync(join(root, ".github/workflows/gpu.yml"), "utf8"));
    const steps = gpu.jobs["test-gpu"].steps;
    const step = (name) => steps.find((x) => x.name === name || x.id === name);

    it("slices every webgpu-graph-algorithms test step, and runs the canary, the element, the screenshots and the benchmarks every time", () => {
        const sliced = steps.filter(
            (x) => /run-(node-shard|browser-project)\.js/.test(x.run ?? "") && x.if !== "${{ inputs.files }}",
        );
        assert.equal(sliced.length, 6);
        for (const x of sliced) assert.match(x.run, /\$T4_ARGS"/, x.run);
        for (const name of [
            "graph-format GPU audit on NVIDIA (canary)",
            "Large-graph story screenshots on NVIDIA against the reference images",
            "bench",
        ])
            assert.doesNotMatch(`${step(name).if} ${step(name).run}`, /T4_/, name);
        assert.doesNotMatch(steps.find((x) => /webgpu-layout\.test\.ts/.test(x.run ?? "")).run, /T4_/);
        assert.equal(gpu.on.workflow_call.inputs.full.default, false);
        assert.equal(gpu.on.workflow_dispatch.inputs.full.default, true, "a run by hand runs every file");
        assert.equal(gpu.jobs["test-gpu"].permissions.actions, "read");
        // the shadow and legacy runs are release.yml dispatches, whose inputs reach this called workflow
        const modes = parseYaml(readFileSync(join(root, ".github/workflows/release.yml"), "utf8")).on.workflow_dispatch
            .inputs.mode.options;
        assert.ok(modes.includes("shadow") && modes.includes("legacy"));
        assert.match(
            step("Pick this run's T4 test files").env.FULL,
            /inputs\.full \|\| github\.event\.inputs\.mode == 'shadow' \|\| github\.event\.inputs\.mode == 'legacy'/,
        );
        const record = step("t4-record");
        assert.match(record.if, /!inputs\.bisect_point/, "a bisect point keeps no record");
        assert.match(record.if, /!contains\(github\.workflow_ref, '\/gpu\.yml@'\)/, "a run by hand keeps no record");
        assert.match(record.if, /steps\.t4-node\.outcome == 'success' \|\| steps\.t4-node\.outcome == 'failure'/);
    });

    it("finds the record, picks the slice and records each run for the next, as the steps run on a runner", () => {
        const find = step("t4-state");
        const pick = step("Pick this run's T4 test files");
        const record = step("t4-record");
        const dir = mkdtempSync(join(tmpdir(), "t4-rotation-"));
        const ws = join(dir, "ws");
        // the steps read and write tmp/ and test-results/ under the workspace, and git from the checkout
        mkdirSync(join(ws, "tmp/t4-state"), { recursive: true });
        mkdirSync(join(ws, "test-results"), { recursive: true });
        symlinkSync(join(root, "tools"), join(ws, "tools"));
        const head = execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: root,
            encoding: "utf8",
            env: isolatedGitEnv(),
        }).trim();
        // git: the checkout's own, whatever directory the step runs in
        const realGit = execFileSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).trim();
        writeFileSync(join(dir, "git"), `#!/bin/sh\nexec "${realGit}" -C "${root}" "$@"\n`);
        writeFileSync(join(dir, "curl"), '#!/bin/sh\nprintf "%s" "$FAKE_LISTING"\n');
        chmodSync(join(dir, "git"), 0o755);
        chmodSync(join(dir, "curl"), 0o755);
        const env = (more) => ({
            ...isolatedGitEnv(),
            PATH: `${dir}:${process.env.PATH}`,
            GITHUB_API_URL: "https://api",
            GITHUB_REPOSITORY: "o/r",
            GITHUB_OUTPUT: join(dir, "output"),
            GITHUB_ENV: join(dir, "env"),
            GITHUB_STEP_SUMMARY: join(dir, "summary.md"),
            SLICES: "4",
            FULL: "false",
            RUN_NUMBER: "5",
            ...more,
        });
        const run = (s, more = {}) =>
            execFileSync("bash", ["-e", "-c", s.run], { cwd: ws, env: env(more), encoding: "utf8" });
        const selection = () => JSON.parse(readFileSync(join(ws, "tmp/t4-selection.json"), "utf8"));
        const lastEnv = () =>
            Object.fromEntries(
                readFileSync(join(dir, "env"), "utf8")
                    .trim()
                    .split("\n")
                    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
            );
        try {
            // the listing names the newest unexpired record's run
            const artifacts = {
                artifacts: [
                    { expired: true, workflow_run: { id: 1 } },
                    { expired: false, workflow_run: { id: 42 } },
                ],
            };
            run(find, { FAKE_LISTING: JSON.stringify(artifacts) });
            assert.match(readFileSync(join(dir, "output"), "utf8"), /^run=42$/m);

            // the first run finds no record: every file, slice from the run number
            run(pick);
            assert.equal(selection().full, true);
            assert.equal(selection().slice, 1);
            assert.equal(lastEnv().T4_ARGS, "");
            assert.match(
                readFileSync(join(dir, "summary.md"), "utf8"),
                /Every test file runs: no earlier T4 run's record/,
            );

            const failing = "webgpu-graph-algorithms/test/limits/layout-1m.test.ts";
            writeFileSync(
                join(ws, "test-results/junit-webgpu-graph-algorithms-r-1.xml"),
                '<testsuites><testcase classname="test/limits/layout-1m.test.ts" name="lays out"><failure message="x"/></testcase>' +
                    '<testcase classname="test/index.test.ts" name="exports"/></testsuites>',
            );
            run(record, { SHA: head, RUN_URL: "https://run/1" });
            const recorded = JSON.parse(readFileSync(join(ws, "tmp/t4-record/state.json"), "utf8"));
            assert.deepEqual(recorded, {
                sha: head,
                slice: 1,
                slices: 4,
                lastFull: head,
                failed: [{ name: failing, run: "https://run/1" }],
            });

            // the next run reads that record (download-artifact put it in tmp/t4-state): the next slice, the failed
            // file added, no GPU change since the full run
            writeFileSync(join(ws, "tmp/t4-state/state.json"), JSON.stringify(recorded));
            run(pick);
            assert.equal(selection().full, false);
            assert.equal(selection().slice, 2);
            assert.deepEqual(selection().also, [failing]);
            assert.match(lastEnv().T4_ARGS, /^--passWithNoTests .*test\/limits\/layout-1m\.test\.ts/);
            assert.match(
                readFileSync(join(dir, "summary.md"), "utf8"),
                /Slice 3 of 4 \(each test file runs at least once every 4 T4 runs\)\. \d+ of \d+ test files\.[\s\S]*layout-1m\.test\.ts -- failed in https:\/\/run\/1/,
            );

            // FULL forces every file
            run(pick, { FULL: "true" });
            assert.equal(selection().full, true);
            assert.equal(lastEnv().T4_ARGS, "");
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
