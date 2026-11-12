#!/usr/bin/env node
// Runs the style harness over the full local style corpus: every downloaded file whatever its license (yFiles demo
// files and unlicensed files included, which are never committed), the generated adversarial inputs, optionally
// their mutants and large synthetic graphs. Local only, never in CI. Each file is checked in a process of its own
// (test/styles/isolated.ts) and killed after --timeout seconds: a hang fails that file, not the run.
//
//   node scripts/styles-corpus.mjs [--root <dir>] [--out <dir>] [--timeout <s>] [--jobs <n>] [--only <text>]
//                                  [--mutants] [--synthetic]
//
// --root defaults to the main checkout's tmp/style-import (wild/, wild/round2/, final-check/adv*/, spike/fuzz*/).
// Writes <out>/results.json and <out>/RESULTS.md (default out: <root>/corpus-run) and exits 1 when any file fails.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = resolve(HERE, "..");
const ISOLATED = join(PACKAGE, "test/styles/isolated.ts");

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const flag = (name) => args.includes(name);

const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: PACKAGE })
    .toString()
    .trim();
const ROOT = resolve(opt("--root", join(dirname(commonDir), "tmp/style-import")));
const OUT = resolve(opt("--out", join(ROOT, "corpus-run")));
const TIMEOUT_S = Number(opt("--timeout", "300"));
const JOBS = Number(opt("--jobs", "4"));
const ONLY = opt("--only", null);

/** File extension to the harness's format name. */
const FORMAT_OF = {
    gexf: "gexf",
    graphml: "graphml",
    xml: "graphml",
    xgmml: "xgmml",
    cx: "cx",
    cx2: "cx2",
    cys: "cys",
    dot: "dot",
    gv: "dot",
    gml: "gml",
    net: "pajek",
    paj: "pajek",
    json: "json",
    cyjs: "cyjs",
};
const SKIP = /\/(spec|src-refs|archives|gml-doc|latex)\/|\.summary\.json$|SOURCES\.md$/;

function walk(dir) {
    if (!existsSync(dir)) {
        return [];
    }
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        return e.isDirectory() ? walk(p) : [p];
    });
}

/** Every file under the subfolders of `parent` whose names match `pattern`. */
function walkSets(parent, pattern) {
    return readdirSync(parent)
        .filter((d) => pattern.test(d))
        .flatMap((d) => walk(join(parent, d)));
}

function inputs() {
    const byExtension = (path) => FORMAT_OF[extname(path).slice(1).toLowerCase()];
    const found = [
        ...walk(join(ROOT, "wild")).map((path) => ({ path, format: byExtension(path) })),
        ...walkSets(join(ROOT, "final-check"), /^adv\d*$/).map((path) => ({ path, format: byExtension(path) })),
    ];
    if (flag("--mutants")) {
        // spike/fuzz*/<format>/<file>: the format is the folder's
        const mutants = walkSets(join(ROOT, "spike"), /^fuzz\d*$/).filter((path) => extname(path) !== ".tsv");
        found.push(...mutants.map((path) => ({ path, format: basename(dirname(path)) })));
    }
    if (flag("--synthetic")) {
        found.push(...synthetic().map((path) => ({ path, format: "json" })));
    }
    return found.filter(
        ({ path, format }) => format !== undefined && !SKIP.test(path) && (ONLY === null || path.includes(ONLY)),
    );
}

// Large synthetic graphs as graphology JSON: two properties, one by a 12-value category, one per element, beside an
// all-distinct integer column (the shape that once overflowed the stack when spread into Math.max).
function synthetic() {
    const dir = join(tmpdir(), "graphty-styles-synthetic");
    mkdirSync(dir, { recursive: true });
    const palette = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"];
    const paths = [];
    for (const n of [300_000, 1_000_000]) {
        const path = join(dir, `big-${n}.json`);
        if (!existsSync(path)) {
            writeFileSync(path, syntheticGraph(n, palette));
        }
        paths.push(path);
    }
    return paths;
}

/** A graphology document of `n` nodes in a ring, with the columns synthetic() describes. */
function syntheticGraph(n, palette) {
    const nodes = Array.from({ length: n }, (_, i) => {
        const a = { cls: i % 12, suid: 1000 + i, color: palette[i % 9], size: 1 + (i % 12) * 0.5 };
        return `{"key":"n${i}","attributes":${JSON.stringify(a)}}`;
    });
    const edges = Array.from({ length: n }, (_, i) => `{"source":"n${i}","target":"n${(i + 1) % n}"}`);
    return `{"attributes":{},"options":{"type":"undirected","multi":false},"nodes":[${nodes.join(",")}],"edges":[${edges.join(",")}]}`;
}

function check({ path, format }) {
    return new Promise((done) => {
        const child = spawn(process.execPath, ["--import", "tsx", ISOLATED, "check", format, path], { cwd: PACKAGE });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => (stdout += d));
        child.stderr.on("data", (d) => (stderr += d));
        // the hang detector: a file that has not finished by now is killed and fails
        const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_S * 1000);
        child.on("close", (code, signal) => {
            clearTimeout(timer);
            const name = `${format}/${relative(ROOT, path)}`;
            if (signal === "SIGKILL") {
                return done({ name, status: `hang (killed after ${TIMEOUT_S} s)` });
            }
            const line = stdout.trim().split("\n").pop() ?? "";
            try {
                const parsed = JSON.parse(line);
                const failures = [...parsed.failures, ...parsed.roundTripFailures];
                return done({
                    name,
                    status: failures.length ? "failed" : "ok",
                    failures,
                    result: { ...parsed.result, name },
                });
            } catch {
                return done({
                    name,
                    status: `crashed (exit ${code})`,
                    failures: [stderr.trim().split("\n").slice(-3).join(" | ")],
                });
            }
        });
    });
}

const queue = inputs();
console.log(`${queue.length} files from ${ROOT}`);
const done = [];
await Promise.all(
    Array.from({ length: JOBS }, async () => {
        while (queue.length > 0) {
            const r = await check(queue.shift());
            done.push(r);
            if (r.status !== "ok") {
                console.log(`${r.status.toUpperCase()} ${r.name}: ${(r.failures ?? []).slice(0, 3).join(" / ")}`);
            }
        }
    }),
);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "results.json"), JSON.stringify(done, null, 1));
const results = join(OUT, "results-table.json");
writeFileSync(results, JSON.stringify(done.filter((r) => r.result).map((r) => r.result)));
const table = execFileSync(process.execPath, ["--import", "tsx", ISOLATED, "table", results], { cwd: PACKAGE });
writeFileSync(join(OUT, "RESULTS.md"), table);
const bad = done.filter((r) => r.status !== "ok");
console.log(`${done.length} files, ${bad.length} not ok; results in ${OUT}`);
process.exitCode = bad.length > 0 ? 1 : 0;
