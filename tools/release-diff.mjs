#!/usr/bin/env node
/**
 * Proves a release commit changes nothing but versions. Every file it touches must be a
 * CHANGELOG.md, a package.json whose only change is its "version" field, or a version plan nx
 * consumed (deleted from .nx/version-plans/). release.yml runs it on the version commit before it
 * opens the release pull request, and again before it publishes one: the packages ship the build
 * of the commit below it, which every lane tested, so anything else in the commit would never have
 * been tested.
 *
 * Usage: node tools/release-diff.mjs <from> <to>   (exit 1 naming each other change)
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
 * @returns one message per stray change; empty when only versions and changelogs changed
 */
export function strayChanges(files, before, after) {
    const out = [];
    for (const file of files) {
        const old = before(file);
        const now = after(file);
        if (/(^|\/)CHANGELOG\.md$/.test(file)) continue;
        if (file.startsWith(".nx/version-plans/") && now === null) continue;
        if (!/(^|\/)package\.json$/.test(file)) {
            out.push(`${file}: not a package.json or a CHANGELOG.md`);
        } else if (old === null || now === null) {
            out.push(`${file}: added or deleted`);
        } else if (withoutVersion(old) !== withoutVersion(now)) {
            out.push(`${file}: changes more than "version"`);
        }
    }
    return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [from, to] = process.argv.slice(2);
    if (!from || !to) {
        console.error("usage: node tools/release-diff.mjs <from> <to>");
        process.exit(2);
    }
    const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const read = (rev) => (path) => {
        try {
            return git("show", `${rev}:${path}`);
        } catch {
            return null;
        }
    };
    const files = git("diff", "--name-only", from, to).split("\n").filter(Boolean);
    const found = strayChanges(files, read(from), read(to));
    for (const p of found) console.error(`::error::${p}`);
    if (found.length > 0) process.exit(1);
    console.log(`${from}..${to} changes only versions and changelogs (${files.length} files)`);
}
