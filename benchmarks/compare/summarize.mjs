// node summarize.mjs <results.jsonl>: the tables of section 8.3 of design/ui/framework/research/cosmos-gl.md.
// A cell is the median across runs of each run's own figure, with its range and the number of runs that
// reached it. Rows of a config are pooled per metric, so a -tail run adds to the moving, hover and layout
// cells only. A void row (wrong renderer) is dropped.
import { readFileSync } from "node:fs";
const all = readFileSync(process.argv[2], "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
const rows = all.filter((r) => !r.void);
const S = [10000, 100000],
    M = [100000, 1000000],
    L = [1000000, 1000000];
const med = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor((s.length - 1) / 2)];
};
const nice = (v) => {
    if (Math.abs(v) >= 100) return Math.round(v).toLocaleString("en-US");
    return v.toFixed(Math.abs(v) >= 10 ? 1 : 2);
};
const pick = (cfg) =>
    rows.filter(
        (r) =>
            r.lib === cfg.lib &&
            (cfg.mode === undefined || r.mode === cfg.mode) &&
            (r.accel ?? "on") === (cfg.accel ?? "on") &&
            r.n === cfg.size[0] &&
            r.m === cfg.size[1] &&
            r.dpr === (cfg.dpr ?? 1) &&
            !!r.labels === !!cfg.labels,
    );
const COSMOS = { lib: "cosmos" },
    LEAN = { lib: "graphty", mode: "lean" },
    DEF = { lib: "graphty", mode: "default" };
const hoverMed = (r) => {
    const x = (r.hover?.latMs ?? []).filter((v) => typeof v === "number");
    return x.length ? med(x) : undefined;
};
const rss = (r) =>
    r.memory?.rssMB ? (r.memory.rssMB.renderer ?? 0) + (r.memory.rssMB["gpu-process"] ?? 0) : undefined;
const stepRead = (r) => r.layoutSteps?.stepPlusReadback?.median;
const batched = (r) => (r.layoutSteps?.perStepBatched50 ?? r.layoutSteps?.perStepBatched16)?.median;
const METRICS = [
    ["First frame", (r) => r.load?.firstFrameMs && r.load.firstFrameMs / 1000, null, "s"],
    ["Ready", (r) => r.load?.readyMs && r.load.readyMs / 1000, null, "s"],
    ["Still frame", (r) => r.still?.serial?.median, (r) => r.still?.serial?.p95, "ms", (r) => r.still?.serial?.p99],
    ["Moving frame", (r) => r.orbit?.median, (r) => r.orbit?.p95, "ms", (r) => r.orbit?.p99],
    ["Hover", hoverMed, null, "ms"],
    ["JavaScript heap", (r) => r.memory?.usedMB, null, "MB"],
    ["Renderer and GPU processes", rss, null, "MB"],
    ["Card memory growth", (r) => r.memory?.gpuMBDelta, null, "MB"],
    ["Frame while the layout runs", (r) => r.layoutFps?.median, (r) => r.layoutFps?.p95, "ms", (r) => r.layoutFps?.p99],
    ["One layout step plus readback", stepRead, null, "ms"],
    ["Layout step in a batch", batched, null, "ms"],
    // Last, because `OLD` is read by position and has no figure for it.
    ["Drag frame", (r) => r.drag?.median, (r) => r.drag?.p95, "ms", (r) => r.drag?.p99],
];
const values = (rs, f) => rs.map(f).filter((v) => typeof v === "number");
const cell = (cfg, [, f, p95, unit, p99]) => {
    const rs = pick(cfg),
        v = values(rs, f);
    if (!v.length) return "-";
    const p = p95 ? values(rs, p95) : [];
    const p95Text = p.length ? " / " + nice(med(p)) : "";
    // A row written before the harness reported p99 has none, so its cell keeps the p95 alone.
    const q = p99 ? values(rs, p99) : [];
    const p99Text = q.length ? " / " + nice(med(q)) : "";
    return `${nice(med(v))}${p95Text}${p99Text} ${unit} (${nice(Math.min(...v))}-${nice(Math.max(...v))}, ${v.length} runs)`;
};
const table = (title, cols) => {
    console.log(
        `\n**${title}**\n\n| Measure | ${cols.map((c) => c[0]).join(" | ")} |\n|---|${cols.map(() => "---").join("|")}|`,
    );
    for (const m of METRICS)
        if (cols.some(([, c]) => values(pick(c), m[1]).length))
            console.log(`| ${m[0]} | ${cols.map(([, c]) => cell(c, m)).join(" | ")} |`);
};
const first = all[0];
console.log(`# cosmos.gl and graphty-element, build ${first.info?.build?.label}\n`);
const shas = [...new Set(rows.filter((r) => r.sha).map((r) => r.sha))],
    rend = [...new Set(rows.filter((r) => r.renderer).map((r) => r.renderer))];
console.log(
    `- Commit: ${shas.join(", ")} (working tree ${rows.some((r) => r.dirty) ? "DIRTY" : "clean"})\n- Source: ${[...new Set(rows.map((r) => r.source))].join(", ")}\n- Render path: ${[...new Set(rows.filter((r) => r.lib === "graphty").map((r) => r.renderPath ?? "default"))].join(", ")}\n- WebGL renderer: ${rend.join(" | ")}\n- Browser: ${first.info?.ua.match(/HeadlessChrome\/[\d.]+/)?.[0]}\n- Rows: ${all.length} (${all.length - rows.length} void), ${rows[0].at} to ${rows.at(-1).at}\n- Load average when a run began: ${nice(Math.min(...rows.map((r) => r.loadavgBefore ?? 99)))}-${nice(Math.max(...rows.map((r) => r.loadavgBefore ?? 0)))}\n`,
);
console.log(
    "A cell is the median across runs of each run's median, then the medians of each run's 95th and 99th percentiles after slashes where the row has them, then the range of the run medians and how many runs reached that stage.\n\n## Results at device pixel ratio 1",
);
const three = (size, dpr) => [
    ["cosmos.gl", { ...COSMOS, size, dpr }],
    ["graphty-element 2D lean", { ...LEAN, size, dpr }],
    ["graphty-element 3D default", { ...DEF, size, dpr }],
];
table("10,000 nodes, 100,000 edges", three(S, 1));
table("100,000 nodes, 1,000,000 edges", three(M, 1));
table("1,000,000 nodes, 1,000,000 edges", [["cosmos.gl", { ...COSMOS, size: L }]]);
console.log(
    '\n## Results at device pixel ratio 2\n\nBoth libraries draw 2400 x 1800; graphty-element runs with pixel-ratio="device". No layout in these runs.',
);
table("10,000 nodes, 100,000 edges, ratio 2", three(S, 2));
table("100,000 nodes, 1,000,000 edges, ratio 2", three(M, 2));
table("1,000,000 nodes, 1,000,000 edges, ratio 2", [["cosmos.gl", { ...COSMOS, size: L, dpr: 2 }]]);
console.log("\n## Labels\n\ngraphty-element 2D lean with `node.label` bound to each node's id, ratio 1, no layout.");
table("Labels on against labels off, 10,000 nodes", [
    ["labels off", { ...LEAN, size: S }],
    ["labels on", { ...LEAN, size: S, labels: true }],
]);
table("Labels on, 100,000 nodes", [
    ["labels off", { ...LEAN, size: M }],
    ["labels on", { ...LEAN, size: M, labels: true }],
]);
console.log(
    "\n## CPU layout (acceleration off)\n\n| Configuration | Frame while the layout runs | One CPU step |\n|---|---|---|",
);
for (const [name, c] of [
    ["2D lean, 10,000", { ...LEAN, accel: "off", size: S }],
    ["3D default, 10,000", { ...DEF, accel: "off", size: S }],
    ["2D lean, 100,000", { ...LEAN, accel: "off", size: M }],
])
    console.log(
        `| ${name} | ${cell(c, METRICS[8])} | ${cell(c, ["", (r) => r.layoutSteps?.stepCpu?.median, null, "ms"])} |`,
    );
console.log(
    "\n## Every run\n\n| Library | Mode | Accel | Nodes | Ratio | Labels | Flags | Stages reached | Failure | Runs | Load when each began |\n|---|---|---|---|---|---|---|---|---|---|---|",
);
const stages = ["load", "still", "orbit", "memory", "hover", "layoutFps", "layoutSteps"];
const groups = new Map();
for (const r of all) {
    const reached = stages.filter((s) => r[s] && !r[s].error).join(" ");
    const k = [
        r.lib,
        r.mode,
        r.accel,
        r.n.toLocaleString("en-US"),
        r.dpr,
        r.labels ? "on" : "off",
        (r.flags ?? []).join(" "),
        reached,
        String(r.failure ?? "")
            .split("\n")[0]
            .slice(0, 90),
    ].join(" | ");
    groups.set(k, [...(groups.get(k) ?? []), r.loadavgBefore]);
}
for (const [k, loads] of groups)
    console.log(`| ${k} | ${loads.length} | ${loads.map((l) => nice(l ?? 0)).join(", ")} |`);
// The figures of section 8.3 (cosmos.gl: middle of its range; hover for graphty-element: the "on golden" row).
const OLD = {
    "cosmos.gl": {
        s: [0.205, 0.205, 3.95, 3.85, 7.4, 22, 430, null, 7.05, 7.25, 4.8],
        m: [0.695, 0.695, 28.45, 28.7, 16.7, 160, 616, null, 19, 9.1, 3.85],
        l: [1.74, 1.74, 29.2, 29.4, 23.35, 270, 800, null, 32.7, 43.9, 30.95],
    },
    "2D lean": {
        s: [1.36, 3.3, 33.4, 40.6, 12.65, 345, 791, null, 117.6, 27.3, 2.7],
        m: [28.3, 52.7, 86.1, 126.2, 103, 3045, 3762, null, 1575, 394, 23.4],
    },
    "3D default": {
        s: [3.08, 6.76, 30, 47.8, 12.65, 289, 733, null, 215.4, 2.9, 2.3],
        m: [30.3, 49.8, 110.9, 211.3, 103, 2466, 3215, null, 2276, 489, 30.5],
    },
};
console.log(
    '\n## Against section 8.3\n\nThe new median over the 8.3 figure: above 1.00 is more than before. For a range in 8.3 the middle is used; graphty-element\'s hover is compared with its "on golden" row. Every 8.3 graphty-element figure except hover comes from the 2026-10-17 build.',
);
for (const [size, key, cfgs] of [
    [
        "10,000 nodes",
        "s",
        [
            ["cosmos.gl", COSMOS],
            ["2D lean", LEAN],
            ["3D default", DEF],
        ],
    ],
    [
        "100,000 nodes",
        "m",
        [
            ["cosmos.gl", COSMOS],
            ["2D lean", LEAN],
            ["3D default", DEF],
        ],
    ],
    ["1,000,000 nodes", "l", [["cosmos.gl", COSMOS]]],
]) {
    const sz = { s: S, m: M, l: L }[key];
    console.log(
        `\n**${size}**\n\n| Measure | ${cfgs.map((c) => c[0] + ": 8.3 -> now (ratio)").join(" | ")} |\n|---|${cfgs.map(() => "---").join("|")}|`,
    );
    METRICS.forEach((m, i) => {
        if (m[0] === "Card memory growth") return;
        console.log(
            `| ${m[0]} | ${cfgs
                .map(([name, c]) => {
                    const v = values(pick({ ...c, size: sz }), m[1]),
                        o = OLD[name][key][i];
                    if (!v.length || o === undefined) return "-";
                    const x = med(v);
                    return `${nice(o)} -> ${nice(x)} ${m[3]} (${(x / o).toFixed(2)})`;
                })
                .join(" | ")} |`,
        );
    });
}
