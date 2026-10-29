#!/usr/bin/env node
// compact-mantine is locked to its Figma spec (owner, 2026-10-23): it draws and behaves exactly as Figma
// does, and the only departures are the owner-approved rows of compact-mantine/design/figma-spec.md
// section 14. This check refuses a push that changes what defines or proves that look -- the spec, the
// Figma tests and their expected values, the measuring harness, the theme's token values -- unless the
// commit that makes the change carries a `Figma-Approved: <reason>` trailer, which only the owner adds.
//
//   node tools/check-figma-lock.mjs   (pnpm run check:figma-lock; tools/prepush-source-checks.sh, ci.yml's Checks job)
//
// Every commit from the push base (tools/push-base.mjs) to HEAD is judged on its own for each locked file
// the push changes, so an approval survives a landing's merge commit and an unapproved commit cannot hide
// behind an approved one. A merge
// is judged on what it changes beyond its parents, so a conflict resolution that edits a locked file needs
// the trailer too; a locked file the merge leaves exactly as one parent has it, or exactly as git's own
// conflict-free merge of the parents makes it, brings nothing new and is not judged (those changes are
// judged on the commits that made them). A locked file the push leaves exactly as the base has it is not
// judged at all, since the push changes nothing in it (a commit's edit that a later commit, such as an
// owner-approved one already on master, replaced). An approved commit may also carry `Figma-Approves: <sha>[,
// <sha>...]`, which approves each named commit of the same push (an empty commit the owner adds to approve
// a commit already made); without its own Figma-Approved line it approves nothing. Commits that are ancestors of APPROVED_BASE -- the design the
// owner approved, before the lock existed -- are not judged.
//
// The tests read compact-mantine/tests/figma/figma-fixture.json, the part of the Figma study
// (design/ui/figma, outside git, not in CI) they compare with. When the study is present, its captures
// must hash to compact-mantine/tests/figma/figma-study.sha256 and every value in the fixture (and in
// figma-variables.json beside it) must equal the study's (compact-mantine/tests/figma/figma-fixture.mjs
// check); all of them are locked.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkFixture } from "../compact-mantine/tests/figma/figma-fixture.mjs";
import { pushBase } from "./push-base.mjs";

export const LOCKED = [
    "compact-mantine/design/figma-spec.md",
    "compact-mantine/tests/figma/", // the Figma tests, their expected values and figma-study.sha256
    "compact-mantine/tests/figma/figma-fixture.json", // what the tests read of the study (also under the line above)
    "compact-mantine/tests/figma/figma-variables.json", // Figma's CSS variables, for the token tests (likewise)
    "compact-mantine/tests/harness/figma.ts", // reads the study's captures
    "compact-mantine/tests/harness/measure.ts", // compares what is drawn with them
    "compact-mantine/src/theme/tokens.ts", // Figma's colors, type, spacing, radii, elevations
    "compact-mantine/src/theme/colors.ts", // Mantine's ramps pointed at Figma's colors
    "compact-mantine/src/theme/styles/size-scale.ts", // Figma's control sizes per Mantine size
];
// golden with the owner-approved design (fix/compact-mantine-figma-drift) merged, just before the lock.
export const APPROVED_BASE = "aa4e9ae9635e1f49c30aa26f0866d8e0531fdb9c";
export const STUDY_DIGEST = "compact-mantine/tests/figma/figma-study.sha256";
export const FIXTURE = "compact-mantine/tests/figma/figma-fixture.json";
const TRAILER = "Figma-Approved";
const APPROVES = "Figma-Approves";

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
    // A locked file the push leaves exactly as the base has it is not judged: the push changes nothing in it.
    const changed = new Set(
        git(["-c", "core.quotePath=false", "diff", "--no-relative", "--name-only", "--no-renames", base, "HEAD"])
            .split("\n")
            .filter(isLocked),
    );
    if (changed.size === 0) return [];
    const log = git([
        "-c",
        "core.quotePath=false",
        "log",
        "--cc",
        "--no-relative",
        "--name-only",
        "--no-renames",
        `--format=%x01%H %h %s%x02%P%x02%(trailers:key=${TRAILER},valueonly,separator=%x20)%x02%(trailers:key=${APPROVES},valueonly,separator=%x2C)`,
        `${base}..HEAD`,
        ...(known ? [`^${approvedBase}`] : []),
    ]);
    const commits = log
        .split("\x01")
        .slice(1)
        .map((chunk) => {
            const [head, ...rest] = chunk.split("\n");
            const [title, parents, approval, approves] = head.split("\x02");
            const [sha, short, ...subject] = title.split(" ");
            const approved = approval.trim() !== "";
            const named = approved ? approves.split(/[\s,]+/).filter((s) => s.length >= 7) : [];
            return {
                sha,
                short,
                subject: subject.join(" "),
                approved,
                named,
                files: rest.filter((f) => f && isLocked(f)),
                parents: parents.split(" ").filter(Boolean),
            };
        });
    for (const c of commits) {
        c.files = c.files.filter((f) => changed.has(f));
        if (c.parents.length > 1 && c.files.length && !c.approved) c.files = newInMerge(git, c, c.files);
    }
    const named = commits.flatMap((c) => c.named);
    const approvedBy = (sha) => named.some((s) => sha.startsWith(s.toLowerCase()));
    return commits
        .filter((c) => c.files.length && !c.approved && !approvedBy(c.sha))
        .map((c) => ({ commit: c.short, subject: c.subject, files: c.files }));
}

/**
 * The locked files of a merge that hold content its parents did not give it: a file equal to one parent's
 * version, or (two parents) to git's automatic merge of them with no conflict in that file, is dropped.
 * @param git runs git in the checkout
 * @param c the merge: `{ sha, parents }`
 * @param files its locked files
 * @returns the files still to judge
 */
function newInMerge(git, c, files) {
    const blob = (rev, f) => {
        try {
            return git(["rev-parse", "--verify", "-q", `${rev}:${f}`]).trim();
        } catch {
            return null; // not in that tree
        }
    };
    let auto = null; // git's own merge of the parents, and the files it could not merge
    if (c.parents.length === 2) {
        let out = null;
        try {
            out = git(["merge-tree", "--write-tree", "--name-only", "--no-messages", ...c.parents]);
        } catch (e) {
            if (e.status === 1) out = String(e.stdout); // conflicts: listed after the tree
        }
        if (out) {
            const [tree, ...conflicted] = out.split("\n").filter(Boolean);
            auto = { tree, conflicted: new Set(conflicted) };
        }
    }
    return files.filter((f) => {
        const mine = blob(c.sha, f);
        if (c.parents.some((p) => blob(p, f) === mine)) return false;
        return !(auto && !auto.conflicted.has(f) && blob(auto.tree, f) === mine);
    });
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
    "to the commit that makes it, or adds a commit carrying it and `Figma-Approves: <sha>`. " +
    "Never add either trailer yourself.";

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
        if (existsSync(join(cwd, FIXTURE))) {
            lines.push(...checkFixture(dir, join(cwd, FIXTURE)).map((b) => `${FIXTURE}: ${b}`));
        }
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
