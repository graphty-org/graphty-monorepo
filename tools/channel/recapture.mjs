#!/usr/bin/env node
// The full run's same-commit re-capture (design/ci/channels-pipeline.md section 3, "Same-commit re-run, once"):
// release.yml's recapture job shoots again, on a fresh runner, only the stories the CI lane's capture found changed
// or new, and builds the run's one gated capture, visual-final-<project>, from both.
//
//   node tools/channel/recapture.mjs plan --project <p> --captures <dir>
//       the newest visual-<p>-<attempt> capture in <dir>; writes dir=<it> and stories=<ids, comma separated> to
//       GITHUB_OUTPUT (stories empty: nothing to shoot again)
//   node tools/channel/recapture.mjs merge --first <dir> --second <dir> --out <dir>
//       the final capture: the first capture with each re-shot story's verdict replaced, and flaky.json listing the
//       stories the two shots disagree on
//
// A story stays changed (or new) only when the second shot draws the same picture as the first. One that matches
// its baseline the second time was a flake and is unchanged; one that draws a third picture is `unstable`
// (nondeterministic rendering, never approvable). Both are listed in flaky.json, which the verdict files.
import {
    appendFileSync,
    copyFileSync,
    cpSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const RESHOOT = new Set(["changed", "new"]);
const BASELINE_MATCH = new Set(["unchanged", "moved"]);

/**
 * The newest capture of a project in a directory of downloaded visual-<project>-<attempt> artifacts.
 * @param dir the directory
 * @param project the project
 * @returns its directory, or null
 */
export function newestCapture(dir, project) {
    let best = null;
    for (const name of existsSync(dir) ? readdirSync(dir) : []) {
        const m = /^visual-(.+)-(\d+)$/.exec(name);
        if (m?.[1] === project && Number(m[2]) >= (best?.attempt ?? 0)) best = { attempt: Number(m[2]), name };
    }
    return best ? join(dir, best.name) : null;
}

/**
 * The story ids a first capture found changed or new.
 * @param results its results.json
 * @returns ids, sorted, each once
 */
export const reshootIds = (results) =>
    [...new Set((results?.items ?? []).filter((i) => RESHOOT.has(i.status)).map((i) => i.id))].sort();

/**
 * The final verdict of one story shot twice on two runners.
 * @param o the inputs
 * @param o.first the first capture's item
 * @param o.second the second capture's item for the same file, or undefined
 * @param o.same () => whether the two captures draw the same picture
 * @returns `{ item, take, flaky }`: the item to keep, which capture's files to copy (first, second or both: the
 *   first as the capture and the second as its other shot), and why it is flaky, or null
 */
export function finalOf({ first, second, same }) {
    if (!RESHOOT.has(first.status) || !second || second.status === "failed")
        return { item: first, take: "first", flaky: null };
    if (BASELINE_MATCH.has(second.status)) {
        return { item: second, take: "second", flaky: "matched its baseline when shot again on a fresh runner" };
    }
    if (RESHOOT.has(second.status) && same()) return { item: first, take: "first", flaky: null };
    return {
        item: { ...first, status: "unstable", flaky: false },
        take: "both",
        flaky: "drew a different picture when shot again on a fresh runner",
    };
}

const copyIfThere = (from, to) => {
    if (!existsSync(from)) return;
    mkdirSync(dirname(to), { recursive: true });
    copyFileSync(from, to);
};

/**
 * Builds the final capture.
 * @param o the directories
 * @param o.first the CI lane's capture (results.json and its images)
 * @param o.second the re-capture of the changed and new stories, or null when there was nothing to shoot again
 * @param o.out where the final capture goes
 * @returns the flaky stories, `[{ file, why }]`
 */
export async function merge({ first, second, out }) {
    // only a re-capture needs the image comparison, and with it visual-review's dependencies installed
    const { compareImages } = second ? await import("../../visual-review/trusted/lib/compare.mjs") : {};
    cpSync(first, out, { recursive: true });
    const results = JSON.parse(readFileSync(join(first, "results.json"), "utf8"));
    const again =
        second && existsSync(join(second, "results.json"))
            ? new Map(JSON.parse(readFileSync(join(second, "results.json"), "utf8")).items.map((i) => [i.file, i]))
            : new Map();
    const flaky = [];
    results.items = results.items.map((item) => {
        const other = again.get(item.file);
        const same = () =>
            compareImages(readFileSync(join(first, item.file)), readFileSync(join(second, other.file)), item).status ===
            "unchanged";
        const f = finalOf({ first: item, second: other, same });
        if (f.take === "second") {
            for (const sub of ["", "second", "baselines"])
                copyIfThere(join(second, sub, item.file), join(out, sub, item.file));
        } else if (f.take === "both") {
            copyIfThere(join(second, item.file), join(out, "second", item.file));
        }
        if (f.flaky) flaky.push({ file: item.file, why: f.flaky });
        return f.item;
    });
    writeFileSync(join(out, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
    writeFileSync(join(out, "flaky.json"), `${JSON.stringify(flaky, null, 2)}\n`);
    return flaky;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const [cmd, ...rest] = process.argv.slice(2);
    const { values } = parseArgs({
        args: rest,
        options: Object.fromEntries(
            ["project", "captures", "first", "second", "out"].map((k) => [k, { type: "string" }]),
        ),
    });
    if (cmd === "plan") {
        const dir = newestCapture(values.captures, values.project);
        const file = dir && join(dir, "results.json");
        const stories = file && existsSync(file) ? reshootIds(JSON.parse(readFileSync(file, "utf8"))) : [];
        const lines = `dir=${dir ?? ""}\nstories=${stories.join(",")}\n`;
        if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines);
        process.stdout.write(lines);
    } else if (cmd === "merge") {
        const flaky = await merge({ first: values.first, second: values.second || null, out: values.out });
        for (const f of flaky) console.log(`::warning::flaky story ${f.file}: ${f.why}`);
    } else {
        console.error("usage: node tools/channel/recapture.mjs plan | merge (see the head of the file)");
        process.exit(2);
    }
}
