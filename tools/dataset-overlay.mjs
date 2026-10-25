#!/usr/bin/env node
// The dataset overlay of a production promotion (design/ci/channels-pipeline/channels.md, section 2).
//
// Every published graph-samples downloads from https://graphty.app/data/graph-samples/v1/, and npm's
// next and latest carry the same version, so production's /data/ is append-only: a promotion lays the
// promoted build's datasets over the ones production already serves, by file type:
//
//   index.json   merged: the union of entries by name; for a name in both, the promoted entry wins only
//                when its url points at a path production does not serve yet
//   *.webp       thumbnails: the promoted file replaces production's
//   *.gsnp.gz    production's file is kept when the gunzipped bytes are equal (a zlib or level change
//                moves nothing); different gunzipped bytes at an existing path FAIL, naming the dataset:
//                a real content change needs a new path (a new name or a v2 directory)
//   anything     else: kept from production when only production has it; a byte difference fails
//
// Files only production has are kept. Nothing is written unless the whole overlay is valid.
//
//   node tools/dataset-overlay.mjs <production-dir> <promoted-dir>
//
// <production-dir> holds what production serves at /data/graph-samples/v1/; <promoted-dir> is the
// promoted build's copy of that directory, and receives the result (it is the one that is deployed).
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const pathOf = (url) => new URL(url, "https://graphty.app/").pathname;

/**
 * Merges two index.json arrays.
 * @param production - production's entries
 * @param promoted - the promoted build's entries
 * @returns production's entries in their order (each replaced by the promoted entry when that one points
 *   at a path new to production), then the promoted entries for names production does not have
 */
export function mergeIndex(production, promoted) {
    const servedPaths = new Set(production.map((e) => pathOf(e.url ?? `${e.name}.gsnp.gz`)));
    const byName = new Map(promoted.map((e) => [e.name, e]));
    const merged = production.map((old) => {
        const next = byName.get(old.name);
        return next?.url !== undefined && !servedPaths.has(pathOf(next.url)) ? next : old;
    });
    const names = new Set(production.map((e) => e.name));
    return [...merged, ...promoted.filter((e) => !names.has(e.name))];
}

/**
 * Judges one file both directories hold.
 * @param file - its name
 * @param old - production's bytes
 * @param next - the promoted build's bytes
 * @returns keep (take production's file), note, or problem (the overlay must fail)
 */
function judge(file, old, next) {
    if (sha(old) === sha(next)) return {};
    if (file.endsWith(".webp")) return { note: `${file}: thumbnail replaced` };
    if (!file.endsWith(".gsnp.gz")) {
        return { problem: `${file}: differs from production's and is not a dataset or a thumbnail` };
    }
    if (sha(gunzipSync(old)) === sha(gunzipSync(next))) {
        return { keep: true, note: `${file}: same snapshot, gzip differs; production's file kept` };
    }
    return {
        problem:
            `dataset ${file.slice(0, -".gsnp.gz".length)}: ${file} has different content than production serves; ` +
            "a changed dataset needs a new path (a new name or a v2 directory), never an overwrite",
    };
}

/**
 * Plans the overlay without writing anything.
 * @param productionDir - what production serves
 * @param promotedDir - the promoted build's data directory
 * @returns copies (files to take from production), index (the merged index, or null when production has
 *   none), problems and notes (what happened to each file both have)
 */
export function planOverlay(productionDir, promotedDir) {
    const copies = [];
    const problems = [];
    const notes = [];
    for (const file of readdirSync(productionDir).sort()) {
        if (file === "index.json") continue;
        const target = join(promotedDir, file);
        const verdict = existsSync(target)
            ? judge(file, readFileSync(join(productionDir, file)), readFileSync(target))
            : { keep: true, note: `${file}: kept from production` };
        if (verdict.keep) copies.push(file);
        if (verdict.note) notes.push(verdict.note);
        if (verdict.problem) problems.push(verdict.problem);
    }
    let index = null;
    const oldIndex = join(productionDir, "index.json");
    if (existsSync(oldIndex)) {
        const newIndex = join(promotedDir, "index.json");
        const promoted = existsSync(newIndex) ? JSON.parse(readFileSync(newIndex, "utf8")) : [];
        index = mergeIndex(JSON.parse(readFileSync(oldIndex, "utf8")), promoted);
    }
    return { copies, index, problems, notes };
}

/**
 * Lays production's datasets under the promoted build's, in place in promotedDir.
 * @param productionDir - what production serves
 * @param promotedDir - the promoted build's data directory, which receives the result
 * @returns the plan; throws listing every problem, before writing anything, when there is one
 */
export function overlay(productionDir, promotedDir) {
    const plan = planOverlay(productionDir, promotedDir);
    if (plan.problems.length > 0) throw new Error(`dataset overlay refused:\n  ${plan.problems.join("\n  ")}`);
    for (const file of plan.copies) copyFileSync(join(productionDir, file), join(promotedDir, file));
    if (plan.index !== null) writeFileSync(join(promotedDir, "index.json"), `${JSON.stringify(plan.index, null, 2)}\n`);
    return plan;
}

function main([productionDir, promotedDir]) {
    if (!productionDir || !promotedDir) {
        console.error("usage: dataset-overlay.mjs <production-dir> <promoted-dir>");
        return 2;
    }
    try {
        const plan = overlay(productionDir, promotedDir);
        for (const note of plan.notes) console.log(note);
        console.log(
            `overlay done: ${plan.copies.length} files from production, ${plan.index?.length ?? 0} index entries`,
        );
        return 0;
    } catch (err) {
        console.error(err.message);
        return 1;
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    process.exitCode = main(process.argv.slice(2));
}
