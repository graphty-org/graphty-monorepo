#!/usr/bin/env node
/**
 * The owner's rulings that an already-pushed commit marked breaking (`type!:` or a `BREAKING CHANGE:` footer) is
 * not breaking. History is never rewritten to drop the marker; the commit is listed in release-not-breaking.json
 * instead, one entry per ruling:
 *
 *   { "notBreaking": [{ "commit": "<full 40-character id>", "project": "graphty-element",
 *                       "reason": "owner 2026-11-09: ...", "since": "2026-11-09" }] }
 *
 * A listed commit is versioned by its type alone (feat a minor, fix a patch) and its changelog entry loses the
 * breaking section: nx reads this list itself (patches/nx@22.7.12.patch, parseGitCommit). The checks that hold a
 * breaking change for the owner skip it too: pr-title.yml, tools/pr-integrity.mjs and tools/pr-open.sh. Every
 * reader takes the list from master (RELEASE_POLICY_REF in a release, origin/master or the base ref otherwise),
 * so a pull request cannot clear its own breaking commit by adding it here.
 *
 * Usage: node tools/release-not-breaking.mjs check          (exit 1 when release-not-breaking.json is invalid)
 *        node tools/release-not-breaking.mjs list <ref>     (the listed commit ids at <ref>, one per line)
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FILE = "release-not-breaking.json";

/**
 * Everything wrong with a parsed release-not-breaking.json.
 * @param file - the parsed file
 * @returns one message per problem; empty when the file is valid
 */
export function problems(file) {
    if (!Array.isArray(file?.notBreaking)) {
        return [`${FILE} must be { "notBreaking": [ ... ] }`];
    }
    const checks = [
        ["commit", (v) => /^[0-9a-f]{40}$/.test(v), "a full 40-character commit id"],
        ["project", (v) => typeof v === "string" && v.length > 0, "an nx project name"],
        ["reason", (v) => typeof v === "string" && v.trim().length > 0, "the owner's ruling and why"],
        ["since", (v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "a YYYY-MM-DD date"],
    ];
    return file.notBreaking.flatMap((entry, i) =>
        checks
            .filter(([key, ok]) => !ok(entry?.[key]))
            .map(([key, , want]) => `notBreaking[${i}].${key}: must be ${want}`),
    );
}

/**
 * The commit ids ruled not breaking at a git ref; none when the ref has no list (a master from before it).
 * @param ref - the ref whose list counts (origin/master)
 * @param [cwd] - the repository
 * @returns a Set of full commit ids
 */
export function ruledNotBreaking(ref, cwd = ROOT) {
    let text;
    try {
        text = execFileSync("git", ["show", `${ref}:${FILE}`], { cwd, encoding: "utf8", stdio: "pipe" });
    } catch {
        return new Set();
    }
    return new Set(JSON.parse(text).notBreaking.map((e) => e.commit));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [mode = "check", ref] = process.argv.slice(2);
    if (mode === "check") {
        const found = problems(JSON.parse(readFileSync(join(ROOT, FILE), "utf8")));
        for (const p of found) console.error(`::error::${p}`);
        if (found.length) process.exit(1);
        console.log(`${FILE} is valid`);
    } else if (mode === "list" && ref) {
        for (const c of ruledNotBreaking(ref)) console.log(c);
    } else {
        console.error("usage: release-not-breaking.mjs check | list <ref>");
        process.exit(2);
    }
}
