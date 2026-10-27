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
//   node tools/channel/recapture.mjs nest --captures <dir> --prefix <visual- or visual-final->
//       after actions/download-artifact with a pattern: when exactly one artifact matched, the action extracts it
//       straight into <dir> (no <name>/ directory, since v5); this moves it into <prefix><project>-0, the layout
//       every reader here expects. Several matches are left as they are.
//   node tools/channel/recapture.mjs accepted --captures <dir> --head <sha>
//       release.yml's resume job: rewrites each capture's results.json in <dir> so a story whose captured PNG is the
//       head's (the owner's accept-only pull request's) baseline byte for byte is unchanged; the gate then judges
//       the approved head as a fresh capture of it would. Reads visual-review.config.json's baselines directory.
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
    renameSync,
    writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
    if (!RESHOOT.has(first.status)) return { item: first, take: "first", flaky: null };
    // shot again, but no confirming second picture: never approvable as changed
    if (!second || second.status === "failed") {
        const why = second ? "its second shot failed" : "its second shot is missing";
        return { item: { ...first, status: "failed", reason: `not confirmed: ${why}` }, take: "first", flaky: null };
    }
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
 * Puts one capture that actions/download-artifact extracted straight into a directory (a pattern that matched one
 * artifact) into its own <prefix><project>-0 directory, as it does for two or more matches.
 * @param dir the download directory
 * @param prefix the artifact name's prefix before the project, such as "visual-" or "visual-final-"
 * @returns the directory it made, or null when there was nothing to move
 */
export function nestSingle(dir, prefix) {
    const file = join(dir, "results.json");
    if (!existsSync(file)) return null;
    const { project } = JSON.parse(readFileSync(file, "utf8"));
    const to = join(dir, `${prefix}${project}-0`);
    const tmp = `${dir}.nest-${process.pid}`;
    renameSync(dir, tmp);
    mkdirSync(dir, { recursive: true });
    renameSync(tmp, to);
    return to;
}

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
        // no re-capture at all: nothing was found to shoot again
        const f = second ? finalOf({ first: item, second: other, same }) : { item, take: "first", flaky: null };
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

const APPROVABLE = new Set(["changed", "moved", "new", "unseeded"]);

/**
 * A judged capture read against the owner's approved baselines: each changed, moved, new or unseeded story whose captured
 * PNG is byte for byte the head's baseline (the accept commit copies the captured bytes) becomes unchanged, as a
 * capture of the head would find it, and a removed story whose baseline the head deleted is dropped. Anything else
 * keeps its status, so the gate still refuses it.
 * @param results a final capture's results.json
 * @param oidOf (file) => the SHA-256 of the head's baseline of that file, or null when it has none
 * @returns the number of stories now unchanged; results.items is rewritten in place
 */
export function acceptedBy(results, oidOf) {
    const before = results.items.length;
    let n = 0;
    // a removed story whose baseline the owner deleted is gone, as from a fresh capture
    results.items = results.items.filter((i) => i.status !== "removed" || oidOf(i.file) !== null);
    results.items = results.items.map((i) => {
        if (!APPROVABLE.has(i.status) || !i.capture || oidOf(i.file) !== i.capture) return i;
        n++;
        return { ...i, status: "unchanged", baseline: i.capture };
    });
    return n + before - results.items.length;
}

/**
 * The SHA-256 of a baseline at a commit: the oid of its Git LFS pointer, or of its bytes when it is stored plain.
 * @param head the commit
 * @param path the baseline's path in the repository
 * @returns the hash, or null when the commit has no such file
 */
function baselineOid(head, path) {
    let bytes;
    try {
        bytes = execFileSync("git", ["cat-file", "blob", `${head}:${path}`], { stdio: ["ignore", "pipe", "ignore"] });
    } catch {
        return null;
    }
    const oid = /^oid sha256:([0-9a-f]{64})$/m.exec(bytes.subarray(0, 300).toString("latin1"))?.[1];
    return oid ?? createHash("sha256").update(bytes).digest("hex");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const [cmd, ...rest] = process.argv.slice(2);
    const { values } = parseArgs({
        args: rest,
        options: Object.fromEntries(
            ["project", "captures", "first", "second", "out", "head", "prefix"].map((k) => [k, { type: "string" }]),
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
    } else if (cmd === "nest") {
        const to = nestSingle(values.captures, values.prefix);
        if (to) console.log(`one artifact was extracted straight into ${values.captures}: moved to ${to}`);
    } else if (cmd === "accepted") {
        const root = JSON.parse(readFileSync("visual-review.config.json", "utf8")).baselines;
        for (const name of readdirSync(values.captures)) {
            const file = join(values.captures, name, "results.json");
            if (!existsSync(file)) continue;
            const results = JSON.parse(readFileSync(file, "utf8"));
            const n = acceptedBy(results, (f) => baselineOid(values.head, `${root}/${results.project}/${f}`));
            writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
            console.log(`${name}: ${n} ${n === 1 ? "story matches" : "stories match"} the approved baselines`);
        }
    } else {
        console.error(
            "usage: node tools/channel/recapture.mjs plan | merge | nest | accepted (see the head of the file)",
        );
        process.exit(2);
    }
}
