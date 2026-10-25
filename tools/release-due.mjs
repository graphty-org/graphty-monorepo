#!/usr/bin/env node
/**
 * release-due.mjs -- whether a green master build should start release.yml now.
 *
 * ci.yml's last job on a master push (`release-due`) runs this. release.yml has no workflow_run
 * trigger, so this is the one place a master merge can start a release run
 * (design/ci/channels-pipeline/channels.md section 5, "Restart on fix" and "Concurrency"):
 * while a "Full run red: <lane> on <sha>" issue is open, a merge whose commits reference it
 * (`Refs #N`, `Fixes #N`, `Closes #N`, `Resolves #N`, `Part of #N`) dispatches release.yml with
 * `mode: restart`. Every other merge waits for the next 6-hour slot. Until the full run files such
 * issues, it never dispatches.
 *
 * Not yet: resuming an approved awaiting candidate, which needs the results store.
 *
 * Usage: node tools/release-due.mjs [--dry-run]
 *   env GH_TOKEN, GITHUB_REPOSITORY; the checkout is the master commit, with its parents.
 */

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RED_TITLE = "Full run red:";

/**
 * The open red issue a merge references, if any.
 * @param redIssues the open issues, as `gh issue list --json number,title` prints them
 * @param messages the merge's commit messages, joined
 * @returns the dispatch to make ({ mode, issue }), or null when nothing is due
 */
export function due(redIssues, messages) {
    const referenced = new Set(
        [...messages.matchAll(/\b(?:refs|fixes|closes|resolves|part of)\s+#(\d+)/gi)].map((m) => Number(m[1])),
    );
    const red = redIssues.find((i) => i.title.startsWith(RED_TITLE) && referenced.has(i.number));
    return red ? { mode: "restart", issue: red.number } : null;
}

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();

function main() {
    const dryRun = process.argv.includes("--dry-run");
    const issues = JSON.parse(
        run("gh", [
            "issue",
            "list",
            "--state",
            "open",
            "--search",
            `"${RED_TITLE}" in:title`,
            "--json",
            "number,title",
        ]),
    );
    // A merge commit brings in HEAD^1..HEAD; a plain commit is only itself.
    let range = ["-1", "HEAD"];
    try {
        run("git", ["rev-parse", "--verify", "--quiet", "HEAD^2"]);
        range = ["HEAD^1..HEAD"];
    } catch {
        // not a merge
    }
    const plan = due(issues, run("git", ["log", "--format=%B", ...range]));
    if (!plan) {
        console.log("release-due: nothing due (no open red issue referenced by this merge)");
        return;
    }
    console.log(`release-due: this merge references red issue #${plan.issue}: release.yml mode=${plan.mode}`);
    if (!dryRun) {
        run("gh", ["workflow", "run", "release.yml", "--ref", "master", "-f", `mode=${plan.mode}`]);
    }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
