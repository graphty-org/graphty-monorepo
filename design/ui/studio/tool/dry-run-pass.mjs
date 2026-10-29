#!/usr/bin/env node
/**
 * dry-run-pass.mjs -- the scripted half of a design studio dry-run pass, with no model in the loop.
 *
 * Runs the app's dry run (graphty/dry-run/run.mjs: every scripted route, on the GPU, outcome checks
 * through graphty-element's public API) on a frozen build, keeps the screen each route ended on, and
 * compares its interface (the screen with the drawing and the status bar covered, <route>.ui.png) with the same route's in
 * the newest earlier pass beside this one. The drawing is not compared as pixels: it may still be
 * settling when a route ends, and what it shows is what the outcome checks read. A route whose
 * interface changed is run once more: if its two screens on this same build differ, it is "unstable",
 * not a change of the build.
 *
 *   node design/ui/studio/tool/dry-run-pass.mjs --dist <frozen build> --out <walks>/<tag>/script [--only t42,t43]
 *
 * --out is the pass's folder: <walks>/<tag>/script. The earlier pass is the newest
 * <walks>/<other tag>/script/summary.json. Writes <out>/summary.json:
 *   { dist, prev, wallMs, routes: [{ id, task, feature, result, reason, shot, ui, prevShot, aria, change, diffFrac, diffImage }] }
 * task is the study task the route walks ("T42A"); change is "same", "changed", "new" (no earlier
 * screen) or "unstable". Exit 0 when every route passed, 1 when one failed, 2 on a usage error.
 * See README.md beside this file, "The scripted dry run".
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");
const RUN = join(repo, "graphty/dry-run/run.mjs");
const OUT = join(repo, "tmp/dry-run");

/**
 * The study task a route walks, from its `from` ("T42 A" -> "T42A").
 * @param from the route's from
 * @returns the task id
 */
export const taskOf = (from) => String(from || "").replace(/\s+/g, "");

/**
 * The newest earlier pass's summary beside this pass's folder.
 * @param out this pass's folder, <walks>/<tag>/script
 * @returns the earlier pass's script folder, or null
 */
export function previousPass(out) {
    const walks = dirname(dirname(out));
    if (!existsSync(walks)) return null;
    const found = readdirSync(walks)
        .map((tag) => join(walks, tag, "script"))
        .filter((d) => resolve(d) !== resolve(out) && existsSync(join(d, "summary.json")))
        .map((d) => ({ d, t: statSync(join(d, "summary.json")).mtimeMs }))
        .sort((a, b) => b.t - a.t);
    return found[0]?.d ?? null;
}

/**
 * Compare two screenshots with tools/pixel-diff.mjs.
 * @param a the earlier screen
 * @param b the new screen
 * @param diffOut where the diff image goes
 * @returns null when they match, else the share of pixels that changed (1 when the size changed)
 */
function differs(a, b, diffOut) {
    const r = spawnSync(process.execPath, [join(repo, "tools/pixel-diff.mjs"), a, b, "--out", diffOut], {
        encoding: "utf8",
    });
    if (r.status === 0) return null;
    if (r.status === 1) return JSON.parse(r.stdout).changedFrac;
    return 1;
}

const runRoutes = (dist, only) =>
    spawnSync(process.execPath, [RUN, "--dist", dist, ...(only ? ["--only", only] : [])], { stdio: "inherit" });

function main() {
    let v;
    try {
        ({ values: v } = parseArgs({
            options: { dist: { type: "string" }, out: { type: "string" }, only: { type: "string" } },
        }));
    } catch (err) {
        v = { error: err.message };
    }
    if (v.error || !v.dist || !v.out) {
        console.error(`${v.error ?? "--dist and --out are required"}; see the comment at the top of this file`);
        process.exit(2);
    }
    const dist = resolve(v.dist);
    const out = resolve(v.out);
    mkdirSync(out, { recursive: true });
    const started = Date.now();
    const first = runRoutes(dist, v.only);
    if (first.status === 2 || !existsSync(join(OUT, "report.json"))) process.exit(2);
    const report = JSON.parse(readFileSync(join(OUT, "report.json"), "utf8"));
    const prev = previousPass(out);
    const routes = report.results.map((r) => {
        const keep = (f) =>
            existsSync(join(OUT, f)) ? (copyFileSync(join(OUT, f), join(out, f)), join(out, f)) : null;
        const shot = keep(`${r.id}.png`);
        const ui = keep(`${r.id}.ui.png`);
        const aria = keep(`${r.id}.aria.txt`);
        const prevShot = prev && existsSync(join(prev, `${r.id}.png`)) ? join(prev, `${r.id}.png`) : null;
        const prevUi = prev && existsSync(join(prev, `${r.id}.ui.png`)) ? join(prev, `${r.id}.ui.png`) : null;
        let change = "new";
        let diffFrac = null;
        if (ui && prevUi) {
            const frac = differs(prevUi, ui, join(out, `${r.id}.diff.png`));
            change = frac === null ? "same" : "changed";
            diffFrac = frac;
        }
        const { id, from, feature, result, reason } = r;
        const diffImage = diffFrac === null ? null : join(out, `${r.id}.diff.png`);
        return {
            id,
            task: taskOf(from),
            feature,
            result,
            reason,
            shot,
            ui,
            prevShot,
            aria,
            change,
            diffFrac,
            diffImage,
        };
    });
    // A changed screen is run once more on the same build: a screen that differs between two runs of
    // one build is the drawing moving, not the build changing.
    const changed = routes.filter((r) => r.change === "changed");
    if (changed.length) {
        runRoutes(dist, changed.map((r) => r.id).join(","));
        for (const r of changed) {
            const again = join(OUT, `${r.id}.ui.png`);
            if (!existsSync(again)) continue;
            const kept = join(out, `${r.id}.again.ui.png`);
            copyFileSync(again, kept);
            if (differs(r.ui, kept, join(out, `${r.id}.again.diff.png`)) !== null) r.change = "unstable";
        }
    }
    const summary = { dist, prev, wallMs: Date.now() - started, routes };
    writeFileSync(join(out, "summary.json"), JSON.stringify(summary, null, 1) + "\n");
    const n = (c) => routes.filter((r) => r.change === c).length;
    const failed = routes.filter((r) => r.result !== "pass");
    console.log(
        `scripted pass: ${routes.length - failed.length} of ${routes.length} routes passed; screens ${n("same")} same, ` +
            `${n("changed")} changed, ${n("new")} new, ${n("unstable")} unstable (earlier pass: ${prev ?? "none"}). ` +
            `${join(out, "summary.json")}`,
    );
    process.exit(failed.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
