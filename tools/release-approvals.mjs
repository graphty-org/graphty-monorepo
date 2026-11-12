#!/usr/bin/env node
/**
 * The release's owner go for a major or a first publish (design/ci/channels-pipeline/channels.md, "A planned
 * major or a first publish"; issue #3455).
 *
 * release.yml's version_dry_run job versions the candidate locally (tools/release-version.sh) and runs
 * `dry-run` on that version commit. Every project the commit releases is compared with its last
 * `{projectName}@{version}` tag reachable from the candidate: a higher major number is a major, and a package
 * npm has no version of is a first publish, tagged or not (npm sets `latest` on a package's first publish whatever
 * the dist-tag; @graphty/graphty and @graphty/githerd were versioned and tagged for months without ever reaching
 * npm), as is one with no tag at all. Each needs an
 * entry in the code-owned release-approvals.json, so the pull request adding it is the owner's approval:
 *
 *   { "approve": [{ "project": "graphty-element", "kind": "major", "merge": "<sha>",
 *                   "approval": "<url of the owner's approving review>", "since": "2026-11-02" }] }
 *
 * `kind` is "major" or "first"; `merge` is the commit that brought the change to master and must be in the
 * candidate's history. A project without an entry fails the dry run, names itself, and is written to the
 * job's `held` output (comma separated), so the version job can hold that project alone.
 * ponytail: an entry is not yet consumed by the publish that uses it; the promotion's version job removes it.
 *
 * Usage: node tools/release-approvals.mjs check                     (exit 1 when release-approvals.json is invalid)
 *        node tools/release-approvals.mjs dry-run <candidate> <version-commit>   (exit 1 on an unapproved one)
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readPolicy } from "./release-hold.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KINDS = new Set(["major", "first"]);

/**
 * Everything wrong with a parsed release-approvals.json.
 * @param file - the parsed file
 * @returns one message per problem; empty when the file is valid
 */
export function problems(file) {
    if (!Array.isArray(file?.approve)) {
        return ['release-approvals.json must be { "approve": [ ... ] }'];
    }
    const checks = [
        ["project", (v) => typeof v === "string" && v.length > 0, "an nx project name"],
        ["kind", (v) => KINDS.has(v), '"major" or "first"'],
        ["merge", (v) => /^[0-9a-f]{40}$/.test(v), "a full 40-character commit id"],
        ["approval", (v) => typeof v === "string" && v.startsWith("https://github.com/"), "a github.com review URL"],
        ["since", (v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "a YYYY-MM-DD date"],
    ];
    return file.approve.flatMap((entry, i) =>
        checks.filter(([key, ok]) => !ok(entry?.[key])).map(([key, , want]) => `approve[${i}].${key}: must be ${want}`),
    );
}

/**
 * The projects a version commit releases, from nx's `- project: <name> <version>` lines.
 * @param body - the version commit's message body
 * @returns [{ project, version }]
 */
export function released(body) {
    return [...body.matchAll(/^- project: (\S+) (\S+)$/gm)].map(([, project, version]) => ({ project, version }));
}

/**
 * Whether releasing `version` after `previous` needs the owner's go. A "major" is a breaking bump: the major
 * number rises, or, below 1.0.0, the minor number does (nx.json sets adjustSemverBumpsForZeroMajorVersion, so
 * a breaking change to 0.3.48 releases 0.4.0, which a `^0.3.48` range does not accept).
 * @param version - the version the commit gives the project
 * @param previous - the version of its last tag, or null when it has none
 * @returns "first", "major" or null
 */
export function kindOf(version, previous) {
    if (previous === null) {
        return "first";
    }
    const [major, minor] = version.split(".").map((n) => Number.parseInt(n, 10));
    const [lastMajor, lastMinor] = previous.split(".").map((n) => Number.parseInt(n, 10));
    return major > lastMajor || (lastMajor === 0 && minor > lastMinor) ? "major" : null;
}

/**
 * The releases that need an approval and have none.
 * @param plan - [{ project, version, previous }]
 * @param approvals - the parsed release-approvals.json
 * @param inHistory - whether an entry's merge is in the candidate's history
 * @returns [{ project, version, previous, kind }]
 */
export function unapproved(plan, approvals, inHistory) {
    return plan
        .map((r) => ({ ...r, kind: kindOf(r.version, r.previous) }))
        .filter(
            (r) =>
                r.kind &&
                !approvals.approve.some((a) => a.project === r.project && a.kind === r.kind && inHistory(a.merge)),
        );
}

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

/**
 * The version of a project's highest `{project}@{version}` tag reachable from a commit.
 * @param project - the nx project name
 * @param candidate - the commit
 * @returns the version, or null when the project has no tag
 */
function lastTagged(project, candidate) {
    const tag = git("tag", "--list", "--merged", candidate, "--sort=-v:refname", `${project}@*`).split("\n")[0];
    return tag ? tag.slice(project.length + 1) : null;
}

/**
 * Whether npm has any version of a package. Only npm's 404 means none: any other failure (the network, the
 * registry) throws, so the dry run fails rather than guess.
 * @param name - the npm package name
 * @param [view] - (name) => `npm view <name> versions --json`'s output; throws like execFileSync
 * @returns boolean
 */
export function onNpm(name, view = npmVersions) {
    try {
        return JSON.parse(view(name) || "[]").length > 0;
    } catch (error) {
        if (/E404|404 Not Found/.test(`${error.stderr ?? ""}${error.stdout ?? ""}${error.message}`)) return false;
        throw error;
    }
}
const npmVersions = (name) =>
    execFileSync("npm", ["view", name, "versions", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/**
 * The npm package name of each nx project: the workspace's top-level folders with a package.json, named by their
 * project.json (else the package name without its scope).
 * @param [root] - the repository
 * @returns Map of project name to package name
 */
export function packageNames(root = ROOT) {
    const out = new Map();
    for (const dir of readdirSync(root, { withFileTypes: true })) {
        const pkgFile = join(root, dir.name, "package.json");
        if (!dir.isDirectory() || !existsSync(pkgFile)) continue;
        const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
        const projectFile = join(root, dir.name, "project.json");
        const project = existsSync(projectFile) ? JSON.parse(readFileSync(projectFile, "utf8")).name : undefined;
        out.set(project ?? pkg.name.replace(/^@[^/]+\//, ""), pkg.name);
    }
    return out;
}

function readApprovals() {
    const file = readPolicy("release-approvals.json");
    const wrong = problems(file);
    if (wrong.length) {
        for (const p of wrong) console.error(`::error::${p}`);
        process.exit(1);
    }
    return file;
}

function dryRun(candidate, commit) {
    const approvals = readApprovals();
    const names = packageNames();
    const plan = released(git("log", "-1", "--format=%b", commit)).map((r) => ({
        ...r,
        // a package npm never had is a first publish whatever its tags say
        previous: onNpm(names.get(r.project) ?? r.project) ? lastTagged(r.project, candidate) : null,
    }));
    const inHistory = (sha) => {
        try {
            git("merge-base", "--is-ancestor", sha, candidate);
            return true;
        } catch {
            return false;
        }
    };
    for (const r of plan) console.log(`${r.project}: ${r.previous ?? "(first publish)"} -> ${r.version}`);
    const missing = unapproved(plan, approvals, inHistory);
    if (process.env.GITHUB_OUTPUT) {
        appendFileSync(process.env.GITHUB_OUTPUT, `held=${missing.map((r) => r.project).join(",")}\n`);
    }
    for (const r of missing) {
        const what = r.kind === "first" ? "its first publish" : `a major (${r.previous} -> ${r.version})`;
        console.log(
            `::error::${r.project} would publish ${what} with no release-approvals.json entry ` +
                `{ "project": "${r.project}", "kind": "${r.kind}", "merge": ..., "approval": ..., "since": ... }`,
        );
    }
    return missing.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [mode = "check", candidate, commit] = process.argv.slice(2);
    if (mode === "check") {
        readApprovals();
        console.log("release-approvals.json is valid");
    } else if (mode === "dry-run" && candidate && commit) {
        process.exit(dryRun(candidate, commit));
    } else {
        console.error("usage: release-approvals.mjs check | dry-run <candidate> <version-commit>");
        process.exit(2);
    }
}
