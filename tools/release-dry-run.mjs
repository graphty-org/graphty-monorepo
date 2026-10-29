#!/usr/bin/env node
// The pre-push gate's "Release dry run" (tools/prepush-source-checks.sh): when a push adds or changes a
// package.json, a project.json, nx.json or release-hold.json, run `nx release --dry-run --skip-publish`
// in the checkout and fail the push when it fails, so a change the release train cannot version is
// stopped at its push, not at the next release attempt. 2026-10-23: two private projects tier 3 added,
// one with no "version" and no tag, held every release for days ("Unable to resolve the current version
// from git tag ... and there is no version on disk to fall back to"; #3318).
//
// CI=true matters: without it nx answers that error with an interactive question, takes "no" on a
// non-terminal stdin, and exits 0. Writes nothing: a dry run neither commits, tags nor edits files.
//
// The push's changes are measured from its merge base with the branch it merges into
// (tools/push-base.mjs). RELEASE_DRY_RUN_COMMAND replaces the nx command (the tests use it).
//
// Usage: node tools/release-dry-run.mjs      (exit 1 when the dry run fails)
import { execFileSync, spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { pushBase } from "./push-base.mjs";

const RELEASE_FILES = /(^|\/)(package|project)\.json$|^(nx|release-hold)\.json$/;
const COMMAND = "pnpm exec nx release --dry-run --skip-publish";
// nx asks GitHub for the repository's releases; a 403 or a rate limit there is this machine's GitHub
// budget running out, not a change the release train cannot version (26 gate failures on 2026-10-24).
const GITHUB_REFUSED = /status code (403|429)|rate limit/i;

/**
 * Whether a push's changed files can change what the release train versions.
 * @param files - repo-relative paths
 * @returns true when one is a package.json, a project.json, nx.json or release-hold.json
 */
export function touchesRelease(files) {
    return files.some((f) => RELEASE_FILES.test(f));
}

/**
 * Runs the dry run when the push needs it.
 * @param files - the push's changed files
 * @param env - the environment
 * @param log - where the report goes
 * @returns the exit code
 */
export function check(files, env = process.env, log = console.log) {
    if (!touchesRelease(files)) {
        log("No package.json, project.json, nx.json or release-hold.json changed; no release dry run needed.");
        return 0;
    }
    const command = env.RELEASE_DRY_RUN_COMMAND || COMMAND;
    const run = spawnSync("sh", ["-c", command], {
        env: { ...env, CI: "true", HUSKY: "0" },
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
    });
    if (run.status === 0) {
        log(`${command}: passed`);
        return 0;
    }
    const tail = `${run.stdout ?? ""}${run.stderr ?? ""}`.trimEnd().split("\n").slice(-40).join("\n");
    log(tail);
    if (GITHUB_REFUSED.test(tail)) {
        log(
            `\nWARNING: ${command} was refused by GitHub (a 403 or a rate limit, above): this machine's failure, ` +
                "not the change's, so the push is not stopped. The release dry run did NOT check this push.",
        );
        return 0;
    }
    log(
        `\n${command} failed (exit ${run.status ?? run.signal}): the release train would fail on this change. ` +
            `A project nx releases needs a "version" in its package.json or a {projectName}@{version} tag.`,
    );
    return 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const base = pushBase();
    // Only the manifests matter, and a long-lived branch's whole file list overflows the default buffer.
    const manifests = [
        "--",
        "package.json",
        "**/package.json",
        "project.json",
        "**/project.json",
        "nx.json",
        "release-hold.json",
    ];
    const files = execFileSync("git", ["diff", "--name-only", base, "HEAD", ...manifests], {
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
    })
        .split("\n")
        .filter(Boolean);
    process.exitCode = check(files);
}
