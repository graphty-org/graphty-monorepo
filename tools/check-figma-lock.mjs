#!/usr/bin/env node
// compact-mantine is locked to its Figma spec (owner, 2026-10-23): it draws and behaves exactly as Figma
// does, and the only departures are the owner-approved rows of compact-mantine/design/figma-spec.md
// section 14. This check refuses a push that changes what defines or proves that look -- the spec, the
// Figma tests and their expected values, the measuring harness, the theme's token values -- unless the
// commit that makes the change carries a `Figma-Approved: <reason>` trailer, which only the owner adds.
//
//   node tools/check-figma-lock.mjs   (pnpm run check:figma-lock; tools/prepush-source-checks.sh, ci.yml's Checks job)
//
// Every commit from the push base (tools/push-base.mjs) to HEAD is judged on its own, so an approval
// survives a landing's merge commit and an unapproved commit cannot hide behind an approved one. A merge
// is judged on what it changes beyond its parents (its combined diff), so a conflict resolution that
// edits a locked file needs the trailer too. Commits that are ancestors of APPROVED_BASE -- the design the
// owner approved, before the lock existed -- are not judged.
//
// The tests also read the Figma study (design/ui/figma, outside git, not in CI). When it is present,
// its captures must hash to compact-mantine/tests/figma/figma-study.sha256, itself a locked file.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { pushBase } from "./push-base.mjs";

export const LOCKED = [
    "compact-mantine/design/figma-spec.md",
    "compact-mantine/tests/figma/", // the Figma tests, their expected values and figma-study.sha256
    "compact-mantine/tests/harness/figma.ts", // reads the study's captures
    "compact-mantine/tests/harness/measure.ts", // compares what is drawn with them
    "compact-mantine/src/theme/tokens.ts", // Figma's colors, type, spacing, radii, elevations
    "compact-mantine/src/theme/colors.ts", // Mantine's ramps pointed at Figma's colors
    "compact-mantine/src/theme/styles/size-scale.ts", // Figma's control sizes per Mantine size
];
// golden with the owner-approved design (fix/compact-mantine-figma-drift) merged, just before the lock.
export const APPROVED_BASE = "aa4e9ae9635e1f49c30aa26f0866d8e0531fdb9c";
export const STUDY_DIGEST = "compact-mantine/tests/figma/figma-study.sha256";
const TRAILER = "Figma-Approved";

export const isLocked = (f) => LOCKED.some((p) => (p.endsWith("/") ? f.startsWith(p) : f === p));

/**
 * The commits of a push that change a locked file without the trailer.
 * @param opts where to look
 * @param opts.cwd the checkout
 * @param opts.base the commit the push's changes are measured from
 * @param [opts.approvedBase] commits reachable from this one are not judged (skipped when it is not in the repository)
 * @param [opts.env] git's environment
 * @returns one `{ commit, subject, files }` per offending commit
 */
export function unapprovedChanges({ cwd, base, approvedBase = APPROVED_BASE, env = process.env }) {
    const git = (args) => execFileSync("git", args, { cwd, env, encoding: "utf8", maxBuffer: 1 << 30 });
    let known = false;
    try {
        git(["cat-file", "-e", `${approvedBase}^{commit}`]);
        known = true;
    } catch {
        // not in this repository: judge every commit of the push
    }
    const log = git([
        "-c",
        "core.quotePath=false",
        "log",
        "--cc",
        "--name-only",
        "--no-renames",
        `--format=%x01%h %s%x02%(trailers:key=${TRAILER},valueonly,separator=%x20)`,
        `${base}..HEAD`,
        ...(known ? [`^${approvedBase}`] : []),
    ]);
    const bad = [];
    for (const chunk of log.split("\x01").slice(1)) {
        const [head, ...rest] = chunk.split("\n");
        const [title, approval] = head.split("\x02");
        const files = rest.filter((f) => f && isLocked(f));
        if (files.length && !approval.trim()) {
            const at = title.indexOf(" ");
            bad.push({ commit: title.slice(0, at), subject: title.slice(at + 1), files });
        }
    }
    return bad;
}

/**
 * The Figma study's directory: FIGMA_STUDY_DIR, else design/ui/figma in the checkout or a directory
 * above it (a worktree under .worktrees/ finds the main checkout's), as compact-mantine's vitest config does.
 * @param cwd the checkout
 * @param env the environment
 * @returns the directory, or null when the study is not here
 */
export function studyDir(cwd, env = process.env) {
    if (env.FIGMA_STUDY_DIR) return env.FIGMA_STUDY_DIR;
    for (let dir = resolve(cwd); dir !== dirname(dir); dir = dirname(dir)) {
        if (existsSync(join(dir, "design/ui/figma/components.md"))) return join(dir, "design/ui/figma");
    }
    return null;
}

/**
 * One hash over every capture (`*.styles.json`) the Figma tests read: each file's path and content.
 * @param dir the study
 * @returns the hex digest
 */
export function studyDigest(dir) {
    const files = readdirSync(dir, { recursive: true })
        .filter((f) => f.endsWith(".styles.json"))
        .sort((a, b) => a.localeCompare(b));
    const hash = createHash("sha256");
    for (const f of files) hash.update(`${f}\0`).update(readFileSync(join(dir, f)));
    return hash.digest("hex");
}

const HOW =
    "compact-mantine is locked to Figma by the owner (2026-10-23): it draws and behaves exactly as Figma does, " +
    "and the only departures are the owner-approved rows of compact-mantine/design/figma-spec.md section 14. " +
    "Undo the change, or ask the owner to approve it: the owner adds a `Figma-Approved: <reason>` trailer " +
    "to the commit that makes it. Never add the trailer yourself.";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const cwd = process.cwd();
    const bad = unapprovedChanges({ cwd, base: pushBase() });
    const lines = bad.flatMap((b) => [`${b.commit} ${b.subject}`, ...b.files.map((f) => `  ${f}`)]);
    const dir = studyDir(cwd);
    if (dir && !existsSync(join(cwd, STUDY_DIGEST))) {
        console.log(`This checkout has no ${STUDY_DIGEST} yet: the Figma study's captures were not checked.`);
    } else if (dir) {
        const want = readFileSync(join(cwd, STUDY_DIGEST), "utf8").trim();
        const got = studyDigest(dir);
        if (got !== want)
            lines.push(`the Figma study's captures in ${dir} hash to ${got}, not ${STUDY_DIGEST}'s ${want}`);
    } else {
        console.log("The Figma study (design/ui/figma) is not in this checkout: its captures were not checked.");
    }
    if (lines.length === 0) {
        console.log("compact-mantine's Figma lock: no unapproved change to the spec, the Figma tests or the tokens");
        process.exit(0);
    }
    console.error("This push changes what locks compact-mantine to Figma, without the owner's approval:");
    for (const l of lines) console.error(`  ${l}`);
    console.error(HOW);
    process.exit(1);
}
