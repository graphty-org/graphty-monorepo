// The performance matrix of graphty-element on both render paths ("objects" and "batched"): graph sizes, layouts
// and style properties, and a regression gate against a committed baseline. See PERF-MATRIX.md.
//
//   node perf-matrix.mjs list [--gate-set] [--only <regex>]
//   BENCH_URL=<page> node perf-matrix.mjs run <results.jsonl> [--gate-set] [--only <regex>] [--reps <k>]
//                                                               [--paths objects,batched]
//   node perf-matrix.mjs gate <results.jsonl> [--baseline <file>]      exits 1 when a metric got worse
//   node perf-matrix.mjs baseline <results.jsonl> [--baseline <file>]  writes the baseline from a run
//   node perf-matrix.mjs report <results.jsonl>                        prints the results as Markdown tables
//
// `run` runs each scenario on each path in a fresh browser through run.mjs, one at a time: it holds the machine's GPU
// lock (PERF_LOCK) for each run and starts the run only once the one-minute load average is at most PERF_MAX_LOAD (12).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MAIN = dirname(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- a local measuring tool, run from the owner's PATH
    spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: HERE })
        .stdout.toString()
        .trim(),
);
const TOOLS = process.env.BENCH_TOOLS ?? join(HERE, "../..");
const LOCK = process.env.PERF_LOCK ?? join(MAIN, "tmp/cosmos-impl/gpu-bench.lock");
const MAX_LOAD = Number(process.env.PERF_MAX_LOAD ?? 12);
const BASELINE = join(HERE, "perf-baseline.json");
const PATHS = ["objects", "batched"];

// ------------------------------------------------------------------ the matrix
function K(n) {
    if (n >= 1000000) return `${n / 1000000}m`;
    return n >= 1000 ? `${n / 1000}k` : String(n);
}
const SIZES = {
    small: [
        [100, 1000],
        [1000, 10000],
    ],
    medium: [
        [10000, 100000],
        [50000, 500000],
    ],
    large: [
        [100000, 1000000],
        [1000000, 1000000],
    ],
};
const STYLES = [
    "node-color",
    "node-size",
    "node-shape",
    "node-border",
    "node-opacity",
    "node-label",
    "node-image",
    "edge-color",
    "edge-width",
    "edge-opacity",
    "edge-arrow",
    "edge-dash",
    "edge-curve",
    "hover-layer",
    "select",
    "pin",
];
// The styles that stress the paths at 50k: a node look that leaves the batch, labels, and the three edge kinds.
const STYLES_50K = ["node-color", "node-border", "node-label", "edge-arrow", "edge-curve"];
// ngraph-cpu is ngraph with acceleration off; ngraph with it on is the GPU force layout.
const LAYOUTS = ["ngraph", "ngraph-cpu", "d3", "forceatlas2", "circular", "grid", "random", "circular-glide"];

/** The scenarios gated on every check: the axes' corners, three runs each. */
const GATE_SET = new Set([
    "size-plain-1k",
    "size-plain-10k",
    "size-default-10k",
    "size-plain-100k",
    "style-node-color-10k",
    "style-node-border-10k",
    "style-node-label-10k",
    "style-edge-arrow-10k",
    "style-edge-curve-10k",
    "style-hover-layer-10k",
    "style-select-10k",
    "layout-ngraph-3d-10k",
    "layout-d3-3d-10k",
    "layout-circular-glide-3d-10k",
]);

function scenario(id, { mode = "plain", accel = "on", n, m, flags = [], deadline }) {
    // Every row of the matrix measures the same stages: load, restyle (if any), still, moving, drag, hover, one edit,
    // and the layout (if any). allow-objects records rows that leave the batch instead of failing the run.
    const all = ["skip-layout", "frames=60", "edit", "allow-objects", ...flags];
    return {
        id,
        mode,
        accel,
        n,
        m,
        flags: all,
        deadline: deadline ?? (n >= 100000 ? 570 : 240),
        gate: GATE_SET.has(id),
    };
}

function sizeScenarios() {
    const out = [...SIZES.small, ...SIZES.medium].flatMap(([n, m]) => [
        scenario(`size-plain-${K(n)}`, { n, m }),
        scenario(`size-default-${K(n)}`, { mode: "default", n, m }),
    ]);
    // Large: the plain look only. The default look's arrowheads make every edge an object on both paths, which at a
    // million edges does not finish; the audit of the batched path measured that once.
    return [...out, ...SIZES.large.map(([n, m]) => scenario(`size-plain-${K(n)}`, { n, m }))];
}

function styleScenarios() {
    const style = (s, n, m) => scenario(`style-${s}-${K(n)}`, { n, m, flags: [`style=${s}`] });
    return [
        ...[SIZES.small[1], SIZES.medium[0]].flatMap(([n, m]) => STYLES.map((s) => style(s, n, m))),
        ...STYLES_50K.map((s) => style(s, 50000, 500000)),
        // Large: one node look and the curve table (the GPU's texture size limit) at 100k, one node look at 1M.
        style("node-color", 100000, 1000000),
        style("edge-curve", 100000, 1000000),
        style("node-color", 1000000, 1000000),
    ];
}

function layoutScenarios() {
    const [n, m] = SIZES.medium[0];
    const out = ["2d", "3d"].flatMap((dim) =>
        LAYOUTS.map((l) => {
            const cpu = l === "ngraph-cpu";
            return scenario(`layout-${l}-${dim}-10k`, {
                n,
                m,
                accel: cpu ? "off" : "on",
                flags: [`dim=${dim}`, `layout=${cpu ? "ngraph" : l}`],
            });
        }),
    );
    // Large: the GPU force layout's landings at 100k nodes and 1M edges.
    out.push(scenario("layout-ngraph-3d-100k", { n: 100000, m: 1000000, flags: ["dim=3d", "layout=ngraph"] }));
    return out;
}

const matrix = () => [...sizeScenarios(), ...styleScenarios(), ...layoutScenarios()];

// ------------------------------------------------------------------ metrics
const median = (xs) => {
    const s = xs.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
    return s.length ? s[Math.floor((s.length - 1) / 2)] : undefined;
};
const hoverMs = (r) => median((r.hover?.latMs ?? []).map((v) => (typeof v === "number" ? v : 180000)));

/** Each metric: how it is read from a row, and the slack added to the margin (noise at small values). */
const METRICS = {
    firstFrameMs: { read: (r) => r.load?.firstFrameMs, slack: 50 },
    readyMs: { read: (r) => r.load?.readyMs, slack: 50 },
    restyleMs: { read: (r) => r.restyle?.ms, slack: 50 },
    stillMs: { read: (r) => r.still?.serial?.median, slack: 1 },
    orbitMs: { read: (r) => r.orbit?.median, slack: 1 },
    dragMs: { read: (r) => r.drag?.median, slack: 1 },
    hoverMs: { read: hoverMs, slack: 10 },
    editMs: { read: (r) => r.edit?.ms, slack: 50 },
    layoutStartMs: { read: (r) => r.layoutRun?.firstLandingMs ?? r.layoutRun?.applyMs, slack: 50 },
    layoutFrameMs: { read: (r) => r.layoutRun?.frame?.median, slack: 1 },
    landingMs: { read: (r) => r.layoutRun?.landingIntervalMs, slack: 2 },
    heapMB: { read: (r) => r.memory?.usedMB, slack: 20 },
    // Counted, not timed: rows off the fast path after the load and the restyle. No margin.
    objectNodes: { read: (r) => lastCounts(r)?.objectNodes, slack: 0, counted: true },
    objectEdges: { read: (r) => lastCounts(r)?.objectEdges, slack: 0, counted: true },
};
const lastCounts = (r) => (r.renderPath === "batched" ? (r.restyle?.rowCounts ?? r.rowCounts) : undefined);
/** How much worse a timed metric may get before the gate fails: 25%, or PERF_MARGIN. */
const MARGIN = Number(process.env.PERF_MARGIN ?? 0.25);

const keyOf = (r) => `${r.scenario}|${r.renderPath ?? "objects"}`;
function readRows(file) {
    return readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
        .filter((r) => r.scenario && !r.void);
}
/** One entry per scenario and path: each metric's median over its runs, and the failures. */
function summarize(rows) {
    const by = new Map();
    for (const r of rows) (by.get(keyOf(r)) ?? by.set(keyOf(r), []).get(keyOf(r))).push(r);
    const out = {};
    for (const [key, rs] of by) {
        const e = { runs: rs.length, metrics: {} };
        for (const [name, { read }] of Object.entries(METRICS)) {
            const v = median(rs.map((r) => read(r)));
            if (v !== undefined) e.metrics[name] = v;
        }
        const failures = rs.map((r) => r.failure).filter(Boolean);
        if (failures.length) e.failures = failures.map((f) => f.slice(0, 160));
        e.sha = rs[0].sha;
        out[key] = e;
    }
    return out;
}

// ------------------------------------------------------------------ commands
const args = process.argv.slice(2);
const opt = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? undefined : args[i + 1];
};
const selected = () => {
    const only = opt("--only") ? new RegExp(opt("--only")) : null;
    return matrix().filter((s) => (!args.includes("--gate-set") || s.gate) && (!only || only.test(s.id)));
};

function run(results) {
    if (!process.env.BENCH_URL) throw new Error("set BENCH_URL to the bench page (RUNBOOK.md, section 2)");
    const reps = Number(opt("--reps") ?? 1);
    const paths = (opt("--paths") ?? PATHS.join(",")).split(",");
    for (const s of selected())
        for (let rep = 0; rep < reps; rep++)
            // Alternate which path goes first, so neither always runs on a warmer machine.
            for (const path of rep % 2 ? paths.toReversed() : paths) {
                console.log(`=== ${s.id} ${path} run ${rep + 1}`);
                runOne(s, path, results);
            }
}

/**
 * One scenario on one path in a fresh browser, its row appended to the results.
 * @param {object} s - The scenario.
 * @param {string} path - The render path.
 * @param {string} results - The results file.
 */
function runOne(s, path, results) {
    // The lock is held while the load is waited out, so no other GPU run starts in between.
    const wait = `while awk '{exit !($1 > ${MAX_LOAD})}' /proc/loadavg; do sleep 5; done; exec "$@"`;
    const command = [
        LOCK,
        "bash",
        "-c",
        wait,
        "_",
        join(TOOLS, "tools/with-browser.sh"),
        "node",
        join(HERE, "run.mjs"),
    ];
    const r = spawnSync(
        "flock", // eslint-disable-line sonarjs/no-os-command-from-path -- a local measuring tool, run from the owner's PATH
        [...command, "graphty", s.mode, s.accel, String(s.n), String(s.m), "1", ...s.flags],
        {
            stdio: ["ignore", "pipe", "inherit"],
            env: {
                ...process.env,
                BENCH_RESULTS: results,
                BENCH_RENDER_PATH: path,
                BENCH_SCENARIO: s.id,
                BENCH_DEADLINE_S: String(s.deadline),
            },
        },
    );
    const keep = /^(load|restyle|still|orbit|hover|edit|layoutRun|memory|failure|crash|pageerror) /;
    for (const line of r.stdout.toString().split("\n")) if (keep.test(line)) console.log(line.slice(0, 220));
}

/**
 * Compares one scenario's metrics with its baseline entry.
 * @param {string} key - The scenario and path.
 * @param {object} cur - The current entry.
 * @param {object} b - The baseline entry.
 * @returns {{ compared: number, worse: string[] }} How many metrics were compared, and the ones that got worse.
 */
function compareEntry(key, cur, b) {
    const worse = cur.failures && !b.failures ? [`${key}: failed: ${cur.failures[0]}`] : [];
    let compared = 0;
    for (const [name, was] of Object.entries(b.metrics)) {
        const metric = METRICS[name];
        if (!metric) continue;
        compared++;
        const is = cur.metrics[name];
        const limit = metric.counted ? was : was * (1 + MARGIN) + metric.slack;
        if (is === undefined && !cur.failures) worse.push(`${key} ${name}: missing (was ${was})`);
        else if (is > limit) worse.push(`${key} ${name}: ${is} > ${+limit.toFixed(2)} (baseline ${was})`);
    }
    return { compared, worse };
}

function gate(results) {
    const file = opt("--baseline") ?? BASELINE;
    const base = JSON.parse(readFileSync(file, "utf8"));
    const now = summarize(readRows(results));
    const worse = [];
    let compared = 0;
    for (const [key, cur] of Object.entries(now)) {
        if (!base.entries[key]) continue;
        const c = compareEntry(key, cur, base.entries[key]);
        compared += c.compared;
        worse.push(...c.worse);
    }
    console.log(`${compared} metrics compared with ${file} (margin ${MARGIN * 100}% plus each metric's slack)`);
    if (compared === 0) {
        console.log("nothing to compare: no scenario of the results is in the baseline");
        process.exit(1);
    }
    for (const w of worse) console.log("WORSE", w);
    if (worse.length) process.exit(1);
    console.log("no metric got worse");
}

function baseline(results) {
    const file = opt("--baseline") ?? BASELINE;
    const old = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).entries : {};
    const entries = { ...old, ...summarize(readRows(results)) };
    const sorted = Object.fromEntries(
        Object.keys(entries)
            .sort()
            .map((k) => [k, entries[k]]),
    );
    const doc = {
        about:
            "Medians per scenario and render path from benchmarks/compare/perf-matrix.mjs; `gate` fails when a timed " +
            "metric is more than the margin (25%) plus its slack worse, or a counted one is any higher. RTX 4070 SUPER, " +
            "WebGL through ANGLE on Vulkan, Chromium from the checkout's Playwright.",
        written: new Date().toISOString(),
        entries: sorted,
    };
    writeFileSync(file, JSON.stringify(doc, null, 1) + "\n");
    console.log(`wrote ${Object.keys(sorted).length} entries to ${file}`);
}

function report(results) {
    const now = summarize(readRows(results));
    const names = Object.keys(METRICS);
    const ids = [...new Set(Object.keys(now).map((k) => k.split("|")[0]))];
    const order = new Map(matrix().map((s, i) => [s.id, i]));
    ids.sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9));
    const cell = (v) => (v === undefined ? "" : String(+v.toFixed(v >= 100 ? 0 : 1)));
    console.log(`| scenario | path | runs | ${names.join(" | ")} | failure |`);
    console.log(`|${" --- |".repeat(names.length + 4)}`);
    for (const id of ids)
        for (const p of PATHS) {
            const e = now[`${id}|${p}`];
            if (!e) continue;
            const f = (e.failures?.[0] ?? "").replaceAll("|", "/").slice(0, 80);
            console.log(`| ${id} | ${p} | ${e.runs} | ${names.map((n) => cell(e.metrics[n])).join(" | ")} | ${f} |`);
        }
}

const [cmd, file] = args;
if (cmd === "list")
    for (const s of selected()) console.log(s.id, s.gate ? "(gate)" : "", s.mode, s.accel, s.n, s.m, s.flags.join(" "));
else if (cmd === "run" && file) run(file);
else if (cmd === "gate" && file) gate(file);
else if (cmd === "baseline" && file) baseline(file);
else if (cmd === "report" && file) report(file);
else {
    console.error(
        "usage: node perf-matrix.mjs list|run|gate|baseline|report [<results.jsonl>] (see the head of this file)",
    );
    process.exit(2);
}
