// Checks of perf-matrix.mjs that need no GPU: what the gate passes and fails, and what each run is handed.
//   node --test benchmarks/compare/perf-matrix.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "perf-matrix.mjs");
const dir = mkdtempSync(join(tmpdir(), "perf-matrix-test-"));

function matrix(args, env = {}) {
    const r = spawnSync(process.execPath, [SCRIPT, ...args], { env: { ...process.env, ...env }, encoding: "utf8" });
    return { code: r.status, out: r.stdout + r.stderr };
}

/** A results row of a gate-set scenario: a first frame and a hover latency, the rest left out. */
function row(scenario, renderPath, firstFrameMs, hoverMs) {
    const r = { scenario, renderPath, cpus: "8-15", sha: "abc", load: { firstFrameMs }, hover: { latMs: [hoverMs] } };
    return JSON.stringify(r);
}
function file(name, rows) {
    const path = join(dir, name);
    writeFileSync(path, rows.join("\n") + "\n");
    return path;
}
const runs = (scenario, path, firsts, hover) => firsts.map((f) => row(scenario, path, f, hover));

// The baseline: two gate-set scenarios on both paths, three runs each; one first frame spread out (100 to 200 ms).
const baseRows = [
    ...runs("size-plain-1k", "objects", [100, 150, 200], 5),
    ...runs("size-plain-1k", "batched", [100, 101, 102], 2),
    ...runs("size-plain-10k", "objects", [500, 510, 520], 5),
    ...runs("size-plain-10k", "batched", [300, 305, 310], 2),
];
const baseline = join(dir, "baseline.json");
assert.equal(matrix(["baseline", file("base.jsonl", baseRows), "--baseline", baseline]).code, 0);
const gate = (rows) => matrix(["gate", file("now.jsonl", rows), "--baseline", baseline]);

test("the same runs pass", () => {
    const r = gate(baseRows);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /no metric got worse/);
});

test("a 1.4x slowdown fails even where the baseline's runs were spread out", () => {
    const rows = baseRows.filter((l) => !l.includes('"size-plain-1k","renderPath":"objects"'));
    const r = gate([...rows, ...runs("size-plain-1k", "objects", [140, 210, 280], 5)]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /WORSE size-plain-1k\|objects firstFrameMs: 140 > 135/);
});

test("a 1.6x slower hover of a few milliseconds fails", () => {
    const rows = baseRows.filter((l) => !l.includes('"size-plain-10k","renderPath":"batched"'));
    const r = gate([...rows, ...runs("size-plain-10k", "batched", [300, 305, 310], 3.2)]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /WORSE size-plain-10k\|batched hoverMs/);
});

test("a gate-set scenario missing from the results fails", () => {
    const r = gate(baseRows.filter((l) => !l.includes('"size-plain-10k","renderPath":"batched"')));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /WORSE size-plain-10k\|batched: 0 of the 3 runs/);
});

test("a gate-set scenario with a void run (another renderer) fails", () => {
    const rows = baseRows.slice(0, -1);
    const voided = JSON.stringify({ ...JSON.parse(baseRows.at(-1)), void: "SwiftShader" });
    const r = gate([...rows, voided]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /WORSE size-plain-10k\|batched: 2 of the 3 runs/);
});

test("a run past the shipped node ceiling asks the batched path to raise it", () => {
    // A stand-in for the browser slot that writes down what the run was handed instead of starting a browser.
    const tools = join(dir, "tools");
    mkdirSync(join(tools, "tools"), { recursive: true });
    const seen = join(dir, "seen.txt");
    const fake = join(tools, "tools/with-browser.sh");
    writeFileSync(fake, `#!/bin/sh\necho "$BENCH_RENDER_PATH \${BENCH_LIMITS:-none}" >> "${seen}"\n`);
    chmodSync(fake, 0o755);
    const env = { BENCH_URL: "http://unused", BENCH_TOOLS: tools, PERF_LOCK: join(dir, "lock"), PERF_WRAP: "env" };
    const r = matrix(["run", join(dir, "r.jsonl"), "--only", "^size-plain-(1m|100k)$"], env);
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(readFileSync(seen, "utf8").trim().split("\n"), [
        "objects none",
        "batched none",
        "objects none",
        'batched {"renderCeiling":1000000}',
    ]);
});
