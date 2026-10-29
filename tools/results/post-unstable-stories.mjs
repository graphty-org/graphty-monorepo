// post-unstable-stories.mjs -- sends a pull request Stories bin's unstable stories (two shots on the same inputs drew
// different pictures, results.json status `unstable`) to the pipeline health API as flaky detections, so they reach
// the dashboard's Flaky tests members the way the full run's story tests do (issue #4373).
//
//   node tools/results/post-unstable-stories.mjs <project> <bin> <results.json> <Storybook index.json> <files JSON>
//
// <files JSON> is the bin's story files (ci.yml's matrix.files: repository-relative, "<file>#<k>/<n>" for a part).
// Each story is named as a story test names it: its repository-relative file and its name in the Storybook, family
// "<project>-stories". Fire and forget: anything unreadable is a line on stderr, and the exit code is always 0.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { flushHealth, postFlaky } from "./client.mjs";

/**
 * The unstable stories of one capture, once per story (a story with two modes is one test).
 * @param results the capture's results.json
 * @param index the built Storybook's index.json
 * @param files the bin's story files, repository-relative
 * @returns `{ file, name, message }` per story
 */
export function unstableStories(results, index, files) {
    const roots = files.map((f) => f.split("#")[0]);
    const out = new Map();
    for (const item of results.items ?? []) {
        if (item.status !== "unstable" || out.has(item.id)) continue;
        const entry = index.entries?.[item.id];
        // as ci.yml's "Pick the selected stories" step matches an entry to a bin file
        const p = String(entry?.importPath ?? "").replace(/^(\.\.?\/)+/, "");
        const file = (p && roots.find((f) => f === p || f.endsWith(`/${p}`))) || p || item.file;
        out.set(item.id, {
            file,
            name: entry?.name ?? item.id,
            message: `visual-review: ${item.file} is unstable (two renders drew different pictures)`,
        });
    }
    return [...out.values()];
}

async function main(argv, env) {
    const [project, bin, resultsFile, indexFile, filesJson] = argv;
    try {
        const read = (f) => JSON.parse(readFileSync(f, "utf8"));
        const stories = unstableStories(read(resultsFile), read(indexFile), JSON.parse(filesJson ?? "[]"));
        postFlaky(env, bin, `${project}-stories`, stories);
        console.error(`post-unstable-stories: ${stories.length} unstable ${project} stories`);
        await flushHealth();
    } catch (e) {
        console.error(`post-unstable-stories: ${e instanceof Error ? e.message : e}`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv.slice(2), process.env);
