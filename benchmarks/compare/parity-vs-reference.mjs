// Differential run of graphty-element against the build from before the renderer optimizations (57c0ee700e):
// finds regressions shared by both render paths, which no same-build parity test can see. Run by hand before a
// release; never in CI. See PARITY-VS-REFERENCE.md for what each stage checks and how to read its output.
//
//   node parity-vs-reference.mjs build     [--head-checkout <dir>]   worktrees, element builds, benchmark pages
//   node parity-vs-reference.mjs pictures  [--stories <prefix,...>]  HEAD's Storybook against the reference baselines
//   node parity-vs-reference.mjs behavior  [<test file> ...]         the same test files on both builds, outcomes diffed
//   node parity-vs-reference.mjs loosened  [--only <regex>]          the reference's older test files run on HEAD
//   REFDIFF_REF_URL=<page> REFDIFF_HEAD_URL=<page> node parity-vs-reference.mjs frames [--only <regex>]
//   node parity-vs-reference.mjs report                              prints every stage's findings as Markdown
//
// Everything lands in REFDIFF_OUT (default <main checkout>/tmp/parity/refdiff): ref/ and head/ (detached scratch
// worktrees), and one directory per stage. A stage exits 1 when it found a difference to review.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const git = (cwd, ...args) => {
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- a local tool, run from the owner's PATH
    const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout;
};
const MAIN = dirname(git(HERE, "rev-parse", "--path-format=absolute", "--git-common-dir").trim());
export const REF = process.env.REFDIFF_REF ?? "57c0ee700e";
const OUT = process.env.REFDIFF_OUT ?? join(MAIN, "tmp/parity/refdiff");
const LOCK = process.env.PERF_LOCK ?? join(MAIN, "tmp/cosmos-impl/gpu-bench.lock");
const CORES = join(MAIN, "tmp/bench-cores/bench-cores.sh");
const REF_DIR = join(OUT, "ref");

/** The checkout HEAD's stages run in: --head-checkout, or the scratch worktree `build` made. */
function headDir(args) {
    const i = args.indexOf("--head-checkout");
    if (i >= 0) return args[i + 1];
    const saved = join(OUT, "head-checkout");
    return existsSync(saved) ? readFileSync(saved, "utf8").trim() : join(OUT, "head");
}
const flag = (args, name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
};

function run(cmd, args, opts = {}) {
    console.log(`$ ${cmd} ${args.join(" ")}`);
    const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
    return r.status ?? 1;
}

// ------------------------------------------------------------------ build
const PAGE = (label) => `refdiff-${label}`;
function build(args) {
    mkdirSync(OUT, { recursive: true });
    const head = headDir(args);
    if (args.includes("--head-checkout")) writeFileSync(join(OUT, "head-checkout"), head);
    const trees = [
        [REF_DIR, REF],
        [head, "origin/master"],
    ];
    for (const [dir, commit] of trees) {
        if (!existsSync(dir)) {
            git(MAIN, "fetch", "-q", "origin", "master");
            git(MAIN, "worktree", "add", "--detach", dir, commit);
        }
        if (run("pnpm", ["install", "--frozen-lockfile"], { cwd: dir, env: { ...process.env, HUSKY: "0" } })) return 1;
        // graphty-element with every workspace package it needs, in dependency order (nx works it out)
        const nx = ["tools/low-priority.sh", "pnpm", "exec", "nx", "run", "graphty-element:build", "--skip-nx-cache"];
        if (run(nx[0], nx.slice(1), { cwd: dir })) return 1;
    }
    // The benchmark pages: this checkout's page code over each build's dist (main.js falls back to old APIs).
    if (run("pnpm", ["install", "--frozen-lockfile", "--ignore-workspace"], { cwd: HERE })) return 1;
    for (const [label, src] of [
        ["ref", REF_DIR],
        ["head", head],
    ]) {
        const env = { ...process.env, BENCH_LABEL: PAGE(label), BENCH_SOURCE: src };
        if (run("pnpm", ["exec", "vite", "build"], { cwd: HERE, env })) return 1;
    }
    console.log(`\nServe each page through servherd (RUNBOOK.md, section 2) with BENCH_LABEL=${PAGE("ref")} and`);
    console.log(`BENCH_LABEL=${PAGE("head")}, then export REFDIFF_REF_URL and REFDIFF_HEAD_URL for the frames stage.`);
    return 0;
}

// ------------------------------------------------------------------ pictures
/**
 * Splits a capture's items (visual-review results.json) by what they mean here: a story whose source file
 * changed since the reference is listed apart, since a different picture is then expected.
 * @param {object[]} items - results.json items: { file, id, status }.
 * @param {Map<string, string>} importPathOf - story id to its stories file, from storybook-static/index.json.
 * @param {Set<string>} changedFiles - files changed between the reference and HEAD.
 * @returns {{ regressions: object[], storyChanged: object[], unchanged: number, other: object[] }}
 */
export function classifyPictures(items, importPathOf, changedFiles) {
    const out = { regressions: [], storyChanged: [], unchanged: 0, other: [] };
    for (const it of items) {
        if (it.status === "unchanged" || it.status === "moved") {
            out.unchanged++;
            continue;
        }
        const src = importPathOf.get(it.id)?.replace(/^\.\//, "graphty-element/");
        const row = { id: it.id, file: it.file, status: it.status, source: src ?? null };
        // An unstable story (two shots of one build differ) says nothing about the build: listed with the rest.
        if (it.status === "changed") (src && changedFiles.has(src) ? out.storyChanged : out.regressions).push(row);
        else out.other.push(row);
    }
    return out;
}

/** Builds a checkout's Storybook unless it is there, and captures every story into `out` with no baselines. */
function captureAll(checkout, tools, out, stories) {
    const storybook = join(checkout, "graphty-element/storybook-static");
    if (!existsSync(join(storybook, "index.json"))) {
        const nx = ["tools/low-priority.sh", "pnpm", "exec", "nx", "run", "graphty-element:build-storybook"];
        if (run(nx[0], nx.slice(1), { cwd: checkout })) return 1;
    }
    // An empty baselines directory: every story is "new", so each is shot twice (an unstable one is told apart)
    // and every picture is kept.
    const none = join(OUT, "pictures/no-baselines");
    mkdirSync(none, { recursive: true });
    const cli = ["visual-review/trusted/cli.mjs", "capture", "--project", "graphty-element", "--out", out];
    cli.push("--baselines", none, "--storybook", storybook, ...(stories ? ["--stories", stories] : []));
    return run("tools/low-priority.sh", ["node", ...cli], { cwd: tools });
}

/**
 * Pictures. Both builds' Storybooks are captured here, by HEAD's capture tool on this machine, and compared with
 * each other: the reference's committed baselines were made by CI in another setup, so a capture made here differs
 * from them, and from HEAD's own baselines, in most stories whatever the build. --with-baselines also compares
 * HEAD's capture with the reference's committed baselines (read only, from its checkout), for reading.
 */
function pictures(args) {
    const head = headDir(args);
    const stories = flag(args, "--stories");
    const dir = join(OUT, "pictures");
    for (const [checkout, name] of [
        [REF_DIR, "ref-shots"],
        [head, "head-shots"],
    ])
        if (captureAll(checkout, head, join(dir, name), stories)) return 1;
    if (args.includes("--with-baselines")) {
        const cli = ["visual-review/trusted/cli.mjs", "capture", "--project", "graphty-element", "--out"];
        cli.push(
            join(dir, "vs-baselines"),
            "--baselines",
            join(REF_DIR, "visual-baselines/graphty-element"),
            "--storybook",
            join(head, "graphty-element/storybook-static"),
        );
        if (run("tools/low-priority.sh", ["node", ...cli], { cwd: head })) return 1;
    }
    return summarizePictures(head);
}

function summarizePictures(head) {
    const dir = join(OUT, "pictures");
    // visual-review compare: one JSON line per file that is not unchanged, then a summary line
    const r = spawnSync(
        process.execPath,
        ["visual-review/trusted/cli.mjs", "compare", "--baselines", join(dir, "ref-shots")].concat([
            "--captures",
            join(dir, "head-shots"),
        ]),
        { cwd: head, encoding: "utf8", maxBuffer: 1 << 26 },
    );
    const lines = r.stdout
        .split("\n")
        .filter((l) => l.startsWith("{"))
        .map((l) => JSON.parse(l));
    const items = lines.filter((l) => l.file).map((l) => ({ ...l, id: l.file.replace(/\.png$/, "") }));
    const unstable = new Set();
    for (const side of ["ref-shots", "head-shots"]) {
        const res = join(dir, side, "results.json");
        if (existsSync(res))
            for (const it of JSON.parse(readFileSync(res, "utf8")).items)
                if (it.status === "unstable") unstable.add(it.file);
    }
    for (const it of items) if (unstable.has(it.file)) it.status = "unstable";
    const index = JSON.parse(readFileSync(join(head, "graphty-element/storybook-static/index.json"), "utf8"));
    const importPathOf = new Map(Object.values(index.entries).map((e) => [e.id, e.importPath]));
    const headSha = git(head, "rev-parse", "HEAD").trim();
    const changed = new Set(git(MAIN, "diff", "--name-only", REF, headSha, "--", "graphty-element").split("\n"));
    const summary = lines.find((l) => l.summary)?.summary ?? {};
    const c = classifyPictures(items, importPathOf, changed);
    writeFileSync(
        join(dir, "summary.json"),
        JSON.stringify({ ref: REF, head: headSha, compare: summary, ...c }, null, 2),
    );
    console.log(
        `pictures: ${summary.unchanged ?? 0} the same on both builds, ${c.regressions.length} changed with the story ` +
            `unchanged, ${c.storyChanged.length} changed with the story changed, ${c.other.length} only on one build`,
    );
    return c.regressions.length ? 1 : 0;
}

// ------------------------------------------------------------------ behavior
/** Existing tests of the reported risks, run when no files are named (suite files join it once they land). */
export const BEHAVIOR_FILES = [
    "test/browser/edges-follow-running-layout.test.ts",
    "test/browser/transitions/layout-transition.test.ts",
    "test/browser/element-at.test.ts",
    "test/browser/edge-pick-row-lines.test.ts",
    "test/browser/drawn-invariants.test.ts",
    "test/interactions/pick-parity.test.ts",
    "test/interactions/node-gesture-edges.test.ts",
    "test/interactions/pointer-on-rows.test.ts",
    "test/interactions/union-hover.test.ts",
    "test/interactions/hover-ends-on-leave.test.ts",
    "test/contracts/consumer-scene.test.ts",
];

/** Every test's outcome in a vitest JSON report, by "<file> > <full name>". */
export function outcomes(report, root) {
    const m = new Map();
    for (const f of report.testResults ?? []) {
        const file = relative(root, f.name);
        if (!f.assertionResults?.length) m.set(`${file} > (file)`, { status: "failed", message: f.message ?? "" });
        for (const t of f.assertionResults ?? [])
            m.set(`${file} > ${t.fullName}`, {
                status: t.status,
                message: (t.failureMessages ?? []).join("\n").split("\n").slice(0, 6).join("\n"),
            });
    }
    return m;
}

/**
 * Pairs each test's outcome on the reference with HEAD's.
 * @returns {{ regressed: object[], failBoth: object[], fixedOrNew: object[], same: number }} regressed: passed on
 *     the reference, failed on HEAD; failBoth: failed on both; fixedOrNew: failed or missing on the reference only
 *     (a file needing an API the reference lacks fails to load there).
 */
export function diffOutcomes(ref, head) {
    const out = { regressed: [], failBoth: [], fixedOrNew: [], same: 0 };
    for (const [name, h] of head) {
        const r = ref.get(name);
        if (h.status === "failed" && r?.status === "passed") out.regressed.push({ name, head: h.message });
        else if (h.status === "failed" && r?.status === "failed")
            out.failBoth.push({ name, ref: r.message, head: h.message });
        else if (h.status === "passed" && r?.status !== "passed")
            out.fixedOrNew.push({ name, ref: r?.status ?? "absent" });
        else out.same++;
    }
    return out;
}

function vitest(dir, files, projects, reportFile) {
    const args = ["npx", "vitest", "run", ...projects.map((p) => `--project=${p}`), "--reporter=json"];
    args.push(`--outputFile=${reportFile}`, ...files);
    run("../tools/low-priority.sh", args, { cwd: join(dir, "graphty-element") });
    return existsSync(reportFile) ? JSON.parse(readFileSync(reportFile, "utf8")) : { testResults: [] };
}

function behavior(args) {
    const head = headDir(args);
    const named = args.filter((a) => a.endsWith(".test.ts"));
    const files = (named.length ? named : BEHAVIOR_FILES).filter((f) => existsSync(join(head, "graphty-element", f)));
    const out = join(OUT, "behavior");
    mkdirSync(out, { recursive: true });
    const projects = ["browser", "interactions"];
    // HEAD's test files and helpers run on the reference's build: copied over its checkout, put back after.
    const el = (d) => join(d, "graphty-element");
    try {
        for (const f of files) {
            mkdirSync(dirname(join(el(REF_DIR), f)), { recursive: true });
            copyFileSync(join(el(head), f), join(el(REF_DIR), f));
        }
        run("cp", ["-r", join(el(head), "test/helpers/."), join(el(REF_DIR), "test/helpers/")]);
        run("cp", [
            "-r",
            join(el(head), "test/interactions/helpers/."),
            join(el(REF_DIR), "test/interactions/helpers/"),
        ]);
        const ref = vitest(REF_DIR, files, projects, join(out, "ref.json"));
        const h = vitest(head, files, projects, join(out, "head.json"));
        const hb = vitest(head, files, ["forced-batched"], join(out, "head-batched.json"));
        const d = diffOutcomes(outcomes(ref, el(REF_DIR)), outcomes(h, el(head)));
        const db = diffOutcomes(outcomes(ref, el(REF_DIR)), outcomes(hb, el(head)));
        writeFileSync(join(out, "summary.json"), JSON.stringify({ files, objects: d, batched: db }, null, 2));
        for (const [path, x] of [
            ["objects", d],
            ["batched", db],
        ])
            console.log(
                `behavior ${path}: ${x.regressed.length} passed on the reference and fail on HEAD, ` +
                    `${x.failBoth.length} fail on both, ${x.fixedOrNew.length} pass on HEAD only, ${x.same} same`,
            );
        return d.regressed.length + db.regressed.length ? 1 : 0;
    } finally {
        git(REF_DIR, "checkout", "--", "graphty-element/test");
        git(REF_DIR, "clean", "-fdq", "--", "graphty-element/test");
    }
}

// ------------------------------------------------------------------ loosened
/** Lines of a unified diff that removed an assertion. */
export function removedAssertions(diff) {
    return diff
        .split("\n")
        .filter(
            (l) =>
                /^-[^-]/.test(l) &&
                /expect\(|assert[.(]|\.toBe|\.toEqual|toBeLessThan|toBeGreaterThan|toBeCloseTo/.test(l),
        );
}
// Tests of things the renderer work did not touch: AI commands, screenshots and video, the package's exports.
const LOOSENED_SKIP = /\/(ai|screenshot|video)\/|exports\.test/;

function loosened(args) {
    const head = headDir(args);
    const headSha = git(head, "rev-parse", "HEAD").trim();
    const only = flag(args, "--only");
    const out = join(OUT, "loosened");
    mkdirSync(out, { recursive: true });
    const names = git(
        MAIN,
        "diff",
        "--name-status",
        REF,
        headSha,
        "--",
        "graphty-element/test/browser",
        "graphty-element/test/interactions",
    )
        .split("\n")
        .filter((l) => l.startsWith("M\t") && l.endsWith(".test.ts"))
        .map((l) => l.slice(2))
        .filter((f) => !LOOSENED_SKIP.test(f) && (!only || new RegExp(only).test(f)));
    const picked = [];
    for (const f of names) {
        const removed = removedAssertions(git(MAIN, "diff", REF, headSha, "--", f));
        if (removed.length) picked.push({ file: f, removed: removed.length });
    }
    // Each reference version sits beside HEAD's under another name, so its relative imports resolve the same way.
    const copies = picked.map((p) => {
        const copy = join(head, p.file.replace(/\.test\.ts$/, ".refcopy.test.ts"));
        writeFileSync(copy, git(MAIN, "show", `${REF}:${p.file}`));
        return relative(join(head, "graphty-element"), copy);
    });
    try {
        const el = join(head, "graphty-element");
        const objects = outcomes(vitest(head, copies, ["browser", "interactions"], join(out, "objects.json")), el);
        const batched = outcomes(vitest(head, copies, ["forced-batched"], join(out, "batched.json")), el);
        const failures = (m) => [...m].filter(([, v]) => v.status === "failed").map(([name, v]) => ({ name, ...v }));
        const s = { ref: REF, head: headSha, files: picked, objects: failures(objects), batched: failures(batched) };
        writeFileSync(join(out, "summary.json"), JSON.stringify(s, null, 2));
        console.log(
            `loosened: ${picked.length} files ran in their reference version; ${s.objects.length} failures on objects, ` +
                `${s.batched.length} on batched (each to be read against HEAD's version of the test)`,
        );
        return s.objects.length + s.batched.length ? 1 : 0;
    } finally {
        for (const c of copies) rmSync(join(head, "graphty-element", c), { force: true });
    }
}

// ------------------------------------------------------------------ frames
/** The layout scenarios of the performance matrix the per-frame probe runs: [id, accel, n, m, flags]. */
export const FRAME_SCENARIOS = [
    ["ngraph-2d-1k", "on", 1000, 10000, ["dim=2d", "layout=ngraph"]],
    ["ngraph-cpu-2d-10k", "off", 10000, 100000, ["dim=2d", "layout=ngraph"]],
    ["ngraph-2d-10k", "on", 10000, 100000, ["dim=2d", "layout=ngraph"]],
    ["ngraph-3d-10k", "on", 10000, 100000, ["dim=3d", "layout=ngraph"]],
    ["d3-2d-10k", "on", 10000, 100000, ["dim=2d", "layout=d3"]],
    ["forceatlas2-2d-10k", "on", 10000, 100000, ["dim=2d", "layout=forceatlas2"]],
    ["forceatlas2-3d-10k", "on", 10000, 100000, ["dim=3d", "layout=forceatlas2"]],
    ["ngraph-3d-100k", "on", 100000, 1000000, ["dim=3d", "layout=ngraph"]],
];
const BUILDS = [
    ["ref", "objects"],
    ["head", "objects"],
    ["head", "batched"],
];
const mean = (xs) => {
    const v = xs.filter((x) => typeof x === "number");
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/**
 * Compares the per-frame probe of HEAD (each path) with the reference's objects path, scenario by scenario.
 *
 * The verdict reads edges that moved at least 5 px across their own line within the last 30 drawn frames: is the
 * marker color at the midpoint of the edge's ends in this frame (cur), or at its midpoint in that earlier frame
 * (prev)? An edge that follows its nodes has cur well above prev; an edge left behind has prev at or above cur.
 * Builds are compared by follow = (cur - prev) / cur: crowding and nodes drawn over the edges hide both points
 * alike, so it holds across builds whose layouts spread and whose cameras frame differently. An edge updated
 * only every 15th frame drops follow from about 0.5 to 0.17 at 1,000 nodes. The lift (marker on the segment,
 * against 8 px beside it) is reported for reading only.
 * @param {object[]} rows - run.mjs rows with `refdiff: { scenario, build, path }` and `frameCheck`.
 * @returns {object[]} one finding per scenario and HEAD path: { scenario, path, ref, head, verdict }.
 */
export function compareFrames(rows) {
    const stat = (r) => {
        const fc = r?.frameCheck;
        if (!fc || fc.error || r.failure) return { error: r?.failure ?? fc?.error ?? "no row" };
        const lift = fc.edgeInkRate.map((e, i) =>
            e === null || fc.ctrlInkRate[i] === null ? null : e - fc.ctrlInkRate[i],
        );
        // frames with at least five moving marker edges
        const idx = (fc.movingEdges ?? []).map((n, i) => (n >= 5 ? i : -1)).filter((i) => i >= 0);
        const margins = idx.map((i) => fc.curInkRate[i] - fc.prevInkRate[i]);
        return {
            meanLift: mean(lift),
            movingFrames: idx.length,
            cur: mean(idx.map((i) => fc.curInkRate[i])),
            prev: mean(idx.map((i) => fc.prevInkRate[i])),
            margin: mean(margins),
            // the share of the marker seen on this frame's midpoint that is not also seen on the old one: crowding
            // and nodes drawn over the edges hide both alike, so this compares across builds that frame differently
            follow: null,
            behindFrames: margins.filter((m) => m <= 0).length,
            nodeInk: mean(fc.nodeInkRate),
            frames: fc.frames,
        };
    };
    const pick = (s, build, path) =>
        rows.findLast((r) => r.refdiff?.scenario === s && r.refdiff.build === build && r.refdiff.path === path);
    const withFollow = (x) => (x.error || !x.cur ? x : { ...x, follow: (x.cur - x.prev) / x.cur });
    const out = [];
    for (const [s] of FRAME_SCENARIOS) {
        const ref = withFollow(stat(pick(s, "ref", "objects")));
        for (const path of ["objects", "batched"]) {
            const head = withFollow(stat(pick(s, "head", path)));
            out.push({ scenario: s, path, ref, head, verdict: frameVerdict(ref, head) });
        }
    }
    return out;
}

function frameVerdict(ref, head) {
    if (head.error) return `head did not run: ${head.error}`;
    if (head.movingFrames < 3) return "too few frames with moving edges: nothing checked";
    // the marker edges seldom seen at all (buried under nodes): nothing to read either way
    if (head.cur < 0.05 && head.prev < 0.05) return "marker edges hidden under other rows: nothing checked";
    if (head.margin <= 0) return "edges drawn where their nodes were frames before";
    const comparable = !ref.error && ref.movingFrames >= 3 && Math.max(ref.cur, ref.prev) >= 0.05;
    if (!comparable) return "same as HEAD's own invariant; reference not comparable";
    if (head.follow < ref.follow - 0.25) return "edges behind their nodes more often than on the reference";
    return "same";
}

/** One frame check of one scenario on one build, appended to the results with the scenario and build named. */
function frameRun([id, accel, n, m, fl], build, path, url, count, out) {
    const tmp = join(out, "row.jsonl");
    rmSync(tmp, { force: true });
    const env = { ...process.env, BENCH_URL: url, BENCH_RESULTS: tmp, BENCH_SCENARIO: id };
    env.BENCH_DEADLINE_S = n >= 100000 ? "570" : "240";
    // The reference build has no renderPath option: its only path is objects.
    if (build === "head") env.BENCH_RENDER_PATH = path;
    else delete env.BENCH_RENDER_PATH;
    const cmd = [
        "node",
        join(HERE, "run.mjs"),
        "graphty",
        "lean",
        accel,
        n,
        m,
        1,
        "frame-check",
        ...fl,
        `frames=${count}`,
    ];
    const wrap = existsSync(CORES) ? [LOCK, CORES, "run", ...cmd] : [LOCK, ...cmd];
    run("flock", wrap.map(String), { cwd: HERE, env });
    if (!existsSync(tmp)) return;
    const row = JSON.parse(readFileSync(tmp, "utf8").trim().split("\n").pop());
    row.refdiff = { scenario: id, build, path };
    writeFileSync(join(out, "results.jsonl"), JSON.stringify(row) + "\n", { flag: "a" });
}

function frames(args) {
    const urls = { ref: process.env.REFDIFF_REF_URL, head: process.env.REFDIFF_HEAD_URL };
    if (!urls.ref || !urls.head) throw new Error("set REFDIFF_REF_URL and REFDIFF_HEAD_URL (see build)");
    const only = flag(args, "--only");
    const count = flag(args, "--frames") ?? "60";
    const out = join(OUT, "frames");
    mkdirSync(out, { recursive: true });
    for (const scenario of FRAME_SCENARIOS)
        if (!only || new RegExp(only).test(scenario[0]))
            for (const [build, path] of BUILDS) frameRun(scenario, build, path, urls[build], count, out);
    return reportFrames();
}

function reportFrames() {
    const results = join(OUT, "frames/results.jsonl");
    const rows = readFileSync(results, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));
    const ran = new Set(rows.map((r) => r.refdiff?.scenario));
    const f = compareFrames(rows).filter((x) => ran.has(x.scenario));
    writeFileSync(join(OUT, "frames/summary.json"), JSON.stringify(f, null, 2));
    for (const x of f)
        console.log(
            `${x.scenario} ${x.path}: ${x.verdict} (follow: ` +
                `reference ${x.ref.follow?.toFixed(3) ?? "-"}, HEAD ${x.head.follow?.toFixed(3) ?? "-"}; ` +
                `HEAD frames behind ${x.head.behindFrames ?? "-"} of ${x.head.movingFrames ?? "-"})`,
        );
    return f.some((x) => /^edges|^nodes/.test(x.verdict)) ? 1 : 0;
}

// ------------------------------------------------------------------ report
const readSummary = (stage) => {
    const p = join(OUT, stage, "summary.json");
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
};
const fence = (text) => [
    "  ```",
    ...String(text)
        .split("\n")
        .map((l) => `  ${l}`),
    "  ```",
];

function reportPictures(pic) {
    if (!pic) return [];
    const lines = ["## Story pictures", "", `${pic.compare?.unchanged ?? 0} the same on both builds.`];
    lines.push("", "Changed with the story source unchanged:", "");
    for (const r of pic.regressions) lines.push(`- ${r.id} (${r.file})`);
    const changed = pic.storyChanged.map((r) => r.id).join(", ") || "none";
    lines.push("", `Changed with the story source changed: ${changed}`, "");
    return lines;
}

function reportBehavior(beh) {
    if (!beh) return [];
    const lines = [];
    for (const path of ["objects", "batched"]) {
        lines.push(`## Behavior, HEAD ${path} against the reference`, "");
        for (const r of beh[path].regressed) lines.push(`- REGRESSED ${r.name}`, ...fence(r.head));
        for (const r of beh[path].failBoth) lines.push(`- fails on both: ${r.name}`);
        lines.push("");
    }
    return lines;
}

function reportLoosened(loose) {
    if (!loose) return [];
    const lines = [];
    for (const path of ["objects", "batched"]) {
        lines.push(`## Reference versions of changed tests on HEAD, ${path}`, "");
        for (const r of loose[path]) lines.push(`- ${r.name}`, ...fence(r.message));
        lines.push("");
    }
    return lines;
}

function reportFramesTable(fr) {
    if (!fr) return [];
    const lines = ["## Edges on their nodes while a layout runs", ""];
    lines.push(
        "| scenario | path | verdict | follow reference | follow HEAD | HEAD frames behind |",
        "|---|---|---|---|---|---|",
    );
    const n = (v) => (typeof v === "number" ? v.toFixed(3) : "-");
    for (const x of fr)
        lines.push(
            `| ${x.scenario} | ${x.path} | ${x.verdict} | ${n(x.ref.follow)} | ${n(x.head.follow)} | ` +
                `${x.head.behindFrames ?? "-"}/${x.head.movingFrames ?? "-"} |`,
        );
    return lines;
}

function report() {
    const lines = [`# graphty-element against ${REF}`, ""];
    lines.push(
        ...reportPictures(readSummary("pictures")),
        ...reportBehavior(readSummary("behavior")),
        ...reportLoosened(readSummary("loosened")),
        ...reportFramesTable(readSummary("frames")),
    );
    console.log(lines.join("\n"));
    return 0;
}

const STAGES = {
    build,
    pictures,
    behavior,
    loosened,
    frames,
    report,
    "frames-report": reportFrames,
    "pictures-report": (args) => summarizePictures(headDir(args)),
};
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [stage, ...args] = process.argv.slice(2);
    if (!STAGES[stage]) {
        console.error(`usage: node parity-vs-reference.mjs ${Object.keys(STAGES).join("|")} [options]`);
        process.exit(2);
    }
    process.exit(STAGES[stage](args));
}
