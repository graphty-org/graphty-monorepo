#!/usr/bin/env node
// Lists the screenshots a visual capture marked `flaky: true`: the first shot differed from the
// baseline and the second matched, so the item counts as unchanged although the story drew two
// different pictures in one run -- a timing race in the story. Under GitHub Actions each one is also a
// warning annotation. Report only: it always exits 0, and decides nothing.
//
//   node tools/visual-flaky-report.mjs <dir|results.json>...
//
// A directory is searched for results.json files. Of the artifacts visual-<project>-<attempt>, only
// the highest attempt of each project is read, as the gate reads them.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Every results.json under `path`.
 * @param path a directory, or a results.json itself
 * @returns the results.json files
 */
function resultFiles(path) {
    if (!statSync(path).isDirectory()) return [path];
    return readdirSync(path, { recursive: true })
        .filter((f) => basename(f) === "results.json")
        .map((f) => join(path, f));
}

/**
 * Keeps only the highest attempt of each visual-<project>-<attempt> directory.
 * @param files results.json paths
 * @returns the files of the newest attempts
 */
function newestAttempts(files) {
    const best = new Map();
    for (const file of files) {
        const m = /^visual-(.+)-(\d+)$/.exec(basename(dirname(file)));
        const key = m ? m[1] : file;
        const attempt = m ? Number(m[2]) : 0;
        if (!best.has(key) || best.get(key).attempt < attempt) best.set(key, { file, attempt });
    }
    return [...best.values()].map((b) => b.file);
}

/**
 * The flaky items of the captures under `paths`.
 * @param paths directories or results.json files
 * @returns one { project, id, mode, file, status } per flaky item
 */
export function flakyItems(paths) {
    const out = [];
    for (const file of newestAttempts(paths.flatMap(resultFiles))) {
        let results;
        try {
            results = JSON.parse(readFileSync(file, "utf8"));
        } catch (e) {
            console.log(`${file}: not readable (${e.message})`);
            continue;
        }
        for (const item of results.items ?? []) {
            if (item.flaky === true) {
                out.push({
                    project: results.project,
                    id: item.id,
                    mode: item.mode ?? null,
                    file: item.file,
                    status: item.status,
                });
            }
        }
    }
    return out;
}

function main(paths) {
    const items = flakyItems(paths);
    if (items.length === 0) {
        console.log("No flaky screenshots.");
        return;
    }
    console.log(
        `${items.length} flaky screenshot(s): the first capture differed from the baseline, the second matched.`,
    );
    for (const i of items) {
        const what = `${i.project}: ${i.file} (mode ${i.mode ?? "none"}, ${i.status})`;
        console.log(`  ${what}`);
        if (process.env.GITHUB_ACTIONS === "true") {
            console.log(
                `::warning title=Flaky screenshot::${what} drew two different pictures in one run; the story has a timing race`,
            );
        }
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        main(process.argv.slice(2));
    } catch (e) {
        console.log(`visual-flaky-report: ${e.message}`);
    }
}
