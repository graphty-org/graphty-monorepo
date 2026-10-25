#!/usr/bin/env node
/**
 * Proves a release commit changes nothing but versions. Every file it touches must be a
 * CHANGELOG.md, a package.json whose only change is its "version" field, or a version plan nx
 * consumed (deleted from .nx/version-plans/). release.yml runs it on the version commit when it
 * makes it, and again before it pushes it to master: the packages ship the build
 * of the commit below it, which every lane tested, so anything else in the commit would never have
 * been tested.
 *
 * With --accept-merges it also allows anything under visual-baselines/ and visual-review-approvals/
 * (an accept merge): the full run uses that to judge a commit by inheritance, when every merge since
 * the last judged commit is a release-version merge or an accept merge (channels design, section 5).
 *
 * Usage: node tools/release-diff.mjs [--accept-merges] <from> <to>   (exit 1 naming each other change)
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ACCEPT_DIRS = ["visual-baselines/", "visual-review-approvals/"];

const withoutVersion = (text) => {
    const manifest = JSON.parse(text);
    delete manifest.version;
    return JSON.stringify(manifest);
};

/**
 * Every change between two trees that is not a version bump.
 * @param files - the paths that differ
 * @param before - reads a path in the older tree; null when it is absent
 * @param after - reads a path in the newer tree; null when it is absent
 * @param [options] - the options
 * @param [options.acceptMerges] - also allow screenshot baselines and approvals
 * @returns one message per stray change; empty when only versions and changelogs changed
 */
export function strayChanges(files, before, after, { acceptMerges = false } = {}) {
    const out = [];
    for (const file of files) {
        if (acceptMerges && ACCEPT_DIRS.some((dir) => file.startsWith(dir))) continue;
        if (/(^|\/)CHANGELOG\.md$/.test(file)) continue;
        // read the trees only where the verdict needs them: one git show per file is the whole cost on a code range
        if (file.startsWith(".nx/version-plans/") && after(file) === null) continue;
        if (!/(^|\/)package\.json$/.test(file)) {
            out.push(`${file}: not a package.json or a CHANGELOG.md`);
            continue;
        }
        const old = before(file);
        const now = after(file);
        if (old === null || now === null) {
            out.push(`${file}: added or deleted`);
        } else if (withoutVersion(old) !== withoutVersion(now)) {
            out.push(`${file}: changes more than "version"`);
        }
    }
    return out;
}

/**
 * The stray changes between two commits of a repository.
 * @param from - the older commit
 * @param to - the newer commit
 * @param [options] - the options
 * @param [options.acceptMerges] - also allow screenshot baselines and approvals
 * @param [options.cwd] - the repository (default: the current directory)
 * @returns the changed paths and one message per stray change
 */
export function diffCommits(from, to, { acceptMerges = false, cwd } = {}) {
    const git = (...args) =>
        execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] });
    const read = (rev) => (path) => {
        try {
            return git("show", `${rev}:${path}`);
        } catch {
            return null;
        }
    };
    // --no-renames: a rename is its delete and its add, so a file renamed to CHANGELOG.md still names its old path
    const files = git("diff", "--name-only", "--no-renames", from, to).split("\n").filter(Boolean);
    return { files, stray: strayChanges(files, read(from), read(to), { acceptMerges }) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const acceptMerges = args[0] === "--accept-merges";
    const [from, to] = acceptMerges ? args.slice(1) : args;
    if (!from || !to) {
        console.error("usage: node tools/release-diff.mjs [--accept-merges] <from> <to>");
        process.exit(2);
    }
    const { files, stray: found } = diffCommits(from, to, { acceptMerges });
    for (const p of found) console.error(`::error::${p}`);
    if (found.length > 0) process.exit(1);
    console.log(
        `${from}..${to} changes only versions and changelogs${acceptMerges ? " (and screenshot approvals)" : ""} (${files.length} files)`,
    );
}
