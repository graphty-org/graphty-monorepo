#!/usr/bin/env node
// Refuses a push that adds a pile of images to git outside the places that legitimately hold them.
// Design studio walk screenshots belong in tmp/design-studio/, never in git (owner, 2026-10-21): about
// 10 GB of them (83,000 Git LFS PNGs under design/ui/studio/) once reached master in one landing.
//
//   node tools/check-committed-images.mjs   (pnpm run check:committed-images; tools/prepush-source-checks.sh, ci.yml's Checks job)
//
// "Added" is measured from the push base (tools/push-base.mjs) to HEAD: images that exist at HEAD and
// not at the base. Images under ALLOWED never count. The push fails when the rest are more than
// MAX_FILES files or more than MAX_BYTES bytes (an LFS pointer counts as the size it points at).
//
// The override, for a deliberate case such as a few design mockups: an `Images-Approved: <reason>`
// trailer. On the HEAD commit it approves every image the push adds; on any other commit of the push
// it approves the images that commit adds, so the approval survives a merge (a landing's merge commit).
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { pushBase } from "./push-base.mjs";

export const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
export const MAX_FILES = 20;
export const MAX_BYTES = 20 * 1024 * 1024;
// Folders whose images are part of the product or its tests (every image prefix on golden, 2026-10-23,
// except design/). A new one goes here, with its reason if it is not obvious.
export const ALLOWED = [
    "visual-baselines/", // visual-review's approved screenshots
    "visual-fonts/",
    "visual-review/test/fixtures/",
    "visual-review/trusted/page/",
    "graph-io/test/fidelity/",
    "graph-io/fidelity-stories/references/",
    "graph-samples/thumbnails/",
    "graphty-element/src/shaders/presets/", // each shader preset's gallery thumbnail, shipped in the package
    "graphty-element/examples/assets/",
    "graphty-element/test/helpers/",
    "graphty/public/",
    "docs/public/",
];
const TRAILER = "Images-Approved";

/**
 * The images a push adds that need an approval it does not have.
 * @param opts where to look
 * @param opts.cwd the checkout
 * @param opts.base the commit the push's changes are measured from
 * @param [opts.env] git's environment
 * @returns the unapproved added images (`files`), their size (`bytes`), or the HEAD trailer's reason (`approvedBy`)
 */
export function addedImages({ cwd, base, env = process.env }) {
    const git = (args, input) => execFileSync("git", args, { cwd, env, input, encoding: "utf8", maxBuffer: 1 << 30 });
    const headApproval = git([
        "log",
        "-1",
        `--format=%(trailers:key=${TRAILER},valueonly,separator=%x20)`,
        "HEAD",
    ]).trim();
    if (headApproval) return { files: [], bytes: 0, approvedBy: headApproval };

    const added = git(["diff", "--name-only", "--no-renames", "--diff-filter=A", "-z", base, "HEAD"])
        .split("\0")
        .filter((f) => IMAGE.test(f) && !ALLOWED.some((p) => f.startsWith(p)));
    if (added.length === 0) return { files: [], bytes: 0 };

    // Images added by a commit that carries the trailer.
    const approved = new Set();
    let ok = false;
    const log = git([
        "-c",
        "core.quotePath=false",
        "log",
        "--no-renames",
        "--diff-filter=A",
        "--name-only",
        `--format=%x01%(trailers:key=${TRAILER},valueonly,separator=%x20)`,
        `${base}..HEAD`,
    ]);
    for (const line of log.split("\n")) {
        if (line.startsWith("\x01")) ok = line.slice(1).trim() !== "";
        else if (ok && line) approved.add(line);
    }
    const files = added.filter((f) => !approved.has(f));
    if (files.length === 0) return { files, bytes: 0 };

    // Sizes: the blob's, or for a Git LFS pointer (a small text blob), the size it records.
    const sizes = git(["cat-file", "--batch-check=%(objectsize)"], files.map((f) => `HEAD:${f}`).join("\n") + "\n")
        .trim()
        .split("\n")
        .map(Number);
    // One `git cat-file --batch` for every small blob, parsed as bytes (a small image is binary).
    const small = files.filter((_, i) => sizes[i] < 1024);
    const raw = small.length
        ? execFileSync("git", ["cat-file", "--batch"], {
              cwd,
              env,
              input: small.map((f) => `HEAD:${f}`).join("\n") + "\n",
              maxBuffer: 1 << 30,
          })
        : Buffer.alloc(0);
    const pointerSize = new Map();
    for (let at = 0, k = 0; k < small.length; k++) {
        const nl = raw.indexOf(10, at);
        const size = Number(raw.toString("latin1", at, nl).split(" ")[2]);
        const m = /^version https:\/\/git-lfs[^\n]*\n(?:[^\n]*\n)*?size (\d+)/.exec(
            raw.toString("latin1", nl + 1, nl + 1 + size),
        );
        if (m) pointerSize.set(small[k], Number(m[1]));
        at = nl + 1 + size + 1;
    }
    const bytes = files.reduce((sum, f, i) => sum + (pointerSize.get(f) ?? sizes[i]), 0);
    return { files, bytes };
}

/**
 * The verdict for a set of unapproved added images.
 * @param r addedImages' result
 * @param r.files the unapproved added images
 * @param r.bytes their size
 * @param [r.approvedBy] the reason of the trailer on HEAD
 * @returns the lines to print, and whether the push may go
 */
export function verdict({ files, bytes, approvedBy }) {
    if (approvedBy) return { ok: true, lines: [`Images approved by the ${TRAILER} trailer on HEAD: ${approvedBy}`] };
    const mb = (bytes / 1024 / 1024).toFixed(1);
    if (files.length <= MAX_FILES && bytes <= MAX_BYTES) {
        return {
            ok: true,
            lines: [`${files.length} new image(s), ${mb} MB, outside the allowed folders: within the limit`],
        };
    }
    const byDir = new Map();
    for (const f of files) byDir.set(dirname(f), (byDir.get(dirname(f)) ?? 0) + 1);
    const dirs = [...byDir].sort((a, b) => b[1] - a[1]);
    return {
        ok: false,
        lines: [
            `This push adds ${files.length} images (${mb} MB) to git outside the folders that hold images ` +
                `(limit: ${MAX_FILES} images or ${MAX_BYTES / 1024 / 1024} MB). By folder:`,
            ...dirs.slice(0, 15).map(([d, n]) => `  ${n}\t${d}/`),
            ...(dirs.length > 15 ? [`  ... and ${dirs.length - 15} more folders`] : []),
            "Design studio walk screenshots go to tmp/design-studio/, never into git: remove them from the commits.",
            `A deliberate addition (a few design mockups): add an \`${TRAILER}: <reason>\` trailer to the commit ` +
                "that adds them, or to HEAD.",
        ],
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const base = pushBase();
    const v = verdict(addedImages({ cwd: process.cwd(), base }));
    for (const l of v.lines) (v.ok ? console.log : console.error)(l);
    process.exit(v.ok ? 0 : 1);
}
