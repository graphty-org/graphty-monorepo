#!/usr/bin/env node
// The waits a person sat through, read from route.jsonl (real.mjs writes each step's timings there as
// "ms"): for T79's path at 50,000 nodes, bar 9 of ../tier5/criteria.md counts each wait of more than
// 10 s with a sign of work but no progress. This lists every step whose wait passed the limit, with
// its screenshot (and the glance screenshot when the session took one), so a person judges from them
// whether the screen showed work under way; it does not judge that itself.
//
// A step's wait is its actions plus the time until the page stopped changing after them
// (ms.act + ms.settleDom): the page answers no script while it is busy, so a blocked page shows up
// there. The canvas's own settle check and the screenshot are the tool's time, not the person's. A
// step of several actions is marked, since its wait is their sum. Input delay is ms.firstFrame: from
// the step's first press or key to the next frame the browser painted.
//
//   node waits.mjs <route.jsonl | walks folder>... [--over <seconds>] [--build <sha or build dir>]
//                                       exit 1 when a wait passed the limit (default 10 s), or when no
//                                       timed step was read; --build keeps only the routes walked on
//                                       that build (the route's head names its build folder)
//   node waits.mjs --self-test          plants a route with a 12 s wait, one with none, and none at all
import assert from "node:assert/strict";
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const ACTIONS = /^--(click|rclick|dblclick|shift-click|ctrl-click|alt-click|click-at|key|type|upload|drop|drag|wheel)/;
// every route.jsonl under the paths given; a walk kept as <walk>-diverged is a copy, left out
function routes(paths) {
    const found = [];
    const look = (p) => {
        if (!existsSync(p)) return;
        if (statSync(p).isFile()) return found.push(p);
        if (existsSync(join(p, "route.jsonl"))) found.push(join(p, "route.jsonl"));
        for (const f of readdirSync(p, { withFileTypes: true }))
            if (f.isDirectory() && !f.name.endsWith("-diverged")) look(join(p, f.name));
    };
    for (const p of paths) look(resolve(p));
    return [...new Set(found)];
}
export function waits(paths, overMs = 10000, build = null) {
    const long = [];
    let timed = 0,
        untimed = 0,
        longest = null;
    const files = routes(paths);
    for (const file of files) {
        const lines = readFileSync(file, "utf8")
            .split("\n")
            .filter(Boolean)
            .map((l) => JSON.parse(l));
        if (build && !String(lines[0]?.dist ?? "").includes(build)) continue;
        for (const [i, rec] of lines.entries()) {
            if (!rec.steps) continue; // the route's head
            if (!rec.ms) {
                untimed++;
                continue;
            }
            timed++;
            const wait = (rec.ms.act ?? 0) + (rec.ms.settleDom ?? 0);
            const acts = rec.steps.filter((s) => ACTIONS.test(s)).length;
            const at = {
                file,
                step: i,
                steps: rec.steps.join(" "),
                acts,
                wait,
                input: rec.ms.firstFrame ?? null,
                shot: join(dirname(file), rec.shot ?? ""),
                glance: rec.shot ? join(dirname(file), rec.shot.replace(/\.png$/, "-glance.png")) : null,
            };
            if (!longest || wait > longest.wait) longest = at;
            if (wait > overMs) long.push(at);
        }
    }
    return {
        files: files.filter((f) => !build || readFileSync(f, "utf8").split("\n")[0].includes(build)).length,
        timed,
        untimed,
        long,
        longest,
    };
}
const sec = (ms) => `${(ms / 1000).toFixed(1)} s`;
function report(r, overMs) {
    const lines = [];
    for (const w of r.long)
        lines.push(
            `OVER ${sec(overMs)}: ${sec(w.wait)} on step ${w.step} (${w.steps})${w.acts > 1 ? `, the sum of ${w.acts} actions` : ""}; input delay ${w.input === null ? "not timed" : `${w.input} ms`}; ${w.shot}${w.glance && existsSync(w.glance) ? `, glance ${w.glance}` : ""}`,
        );
    if (!r.timed)
        lines.push(
            `FAIL: no timed step read (${r.files} route${r.files === 1 ? "" : "s"}, ${r.untimed} step${r.untimed === 1 ? "" : "s"} with no "ms"): nothing measured`,
        );
    else
        lines.push(
            `${r.timed} timed steps in ${r.files} routes${r.untimed ? ` (${r.untimed} with no timings left out)` : ""}; longest ${sec(r.longest.wait)} (${r.longest.shot}); ${r.long.length} over ${sec(overMs)}`,
        );
    return { lines, code: !r.timed || r.long.length ? 1 : 0 };
}

function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), "waits-test-"));
    try {
        const head = JSON.stringify({ start: "setup:staff-50k.txt", dist: "/b/tier5-1e123d7d33" });
        const step = (steps, act, settleDom) =>
            JSON.stringify({ steps, shot: "02.png", ms: { act, settleDom, settleCanvas: 700, firstFrame: 30 } });
        const plant = (name, ...recs) => {
            const d = join(dir, name);
            mkdirSync(d, { recursive: true });
            writeFileSync(join(d, "route.jsonl"), [head, ...recs].join("\n") + "\n");
            return d;
        };
        const slow = plant("slow", step(["--click", "Done"], 500, 11800), step(["--type", "s"], 200, 300));
        const quick = plant("quick", step(["--click", "Done"], 2000, 4900));
        const bare = plant("bare", JSON.stringify({ steps: ["--click", "Done"], shot: "02.png" }));
        let r = waits([slow]);
        assert.equal(r.long.length, 1, "a 12.3 s wait was not listed");
        assert.equal(r.long[0].step, 1);
        assert.equal(report(r, 10000).code, 1);
        // the canvas settle (700 ms) is the tool's, so 6.9 s stays under
        r = waits([quick]);
        assert.equal(r.long.length, 0);
        assert.equal(report(r, 10000).code, 0);
        // a walks folder holds both; a copy kept as -diverged is left out
        plant("slow-diverged", step(["--click", "Done"], 500, 30000));
        r = waits([dir]);
        assert.equal(r.long.length, 1);
        assert.equal(r.files, 3);
        // --build keeps only that build's walks
        assert.equal(waits([dir], 10000, "1e123d7d33").long.length, 1);
        assert.equal(waits([dir], 10000, "0c163f54bf").timed, 0);
        // nothing timed, or nothing at all: the script read zero items and fails
        assert.equal(report(waits([bare]), 10000).code, 1);
        assert.match(report(waits([join(dir, "none")]), 10000).lines.join("\n"), /no timed step read/);
        console.log("self-test: every planted case caught");
        return 0;
    } catch (e) {
        console.log(`self-test FAILED: ${e.message}`);
        return 1;
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
const args = process.argv.slice(2);
if (args[0] === "--self-test") process.exit(selfTest());
const oi = args.indexOf("--over");
const overMs = oi >= 0 ? Number(args[oi + 1]) * 1000 : 10000;
const bi = args.indexOf("--build");
const build = bi >= 0 ? args[bi + 1] : null;
const valued = ["--over", "--build"];
const paths = args.filter((a, i) => !valued.includes(a) && !valued.includes(args[i - 1]));
if (!paths.length || !(overMs > 0)) {
    console.error("usage: waits.mjs <route.jsonl | walks folder>... [--over <seconds>] | --self-test");
    process.exit(2);
}
const r = report(waits(paths, overMs, build), overMs);
for (const l of r.lines) console.log(l);
process.exit(r.code);
