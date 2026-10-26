#!/usr/bin/env node
/**
 * release-due.mjs -- whether a green master build should start release.yml now.
 *
 * ci.yml's last job on a master push (`release-due`) runs this. release.yml has no workflow_run
 * trigger, so this is the one place a master merge can start a release run
 * (design/ci/channels-pipeline/channels.md section 5, "Restart on fix" and "Concurrency"):
 * while a "Full run red: <lane> on <sha>" issue is open, a merge whose commits reference it
 * (`Refs #N`, `Fixes #N`, `Closes #N`, `Resolves #N`, `Part of #N`) dispatches release.yml with
 * `mode: restart`. A `Fixes` closes the issue as the merge lands, before this job runs, so an issue
 * closed in the last hour counts as open. Every other merge waits for the next 6-hour slot. Until the full run files such
 * issues, it never dispatches. Before the dispatch it cancels every full or restart run still in progress: the full
 * run files the red issue the moment a lane ends red, while its other lanes may run for hours, and release.yml's
 * concurrency group would keep the restart pending behind it. Each such run tests a commit without this fix.
 *
 * Not yet: resuming an approved awaiting candidate, which needs the results store.
 *
 * Usage: node tools/release-due.mjs [--dry-run]
 *   env GH_TOKEN, GITHUB_REPOSITORY; the checkout is the master commit, with its parents.
 */

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { RED_TITLE } from "./full-run.mjs";

// how long after its close a red issue still restarts: the merge that closed it ran this job minutes later
const CLOSED_WITHIN_MS = 60 * 60 * 1000;

/**
 * The red issue a merge references, if any: open, or closed in the last hour (by this merge's `Fixes`).
 * @param redIssues the issues, as `gh issue list --json number,title,state,closedAt` prints them; one with no
 *   state is open
 * @param messages the merge's commit messages, joined
 * @param [now] milliseconds
 * @returns the dispatch to make ({ mode, issue }), or null when nothing is due
 */
export function due(redIssues, messages, now = Date.now()) {
    const referenced = new Set(
        [...messages.matchAll(/\b(?:refs|fixes|closes|resolves|part of)\s+#(\d+)/gi)].map((m) => Number(m[1])),
    );
    const live = (i) =>
        (i.state ?? "OPEN") === "OPEN" || (i.closedAt && now - Date.parse(i.closedAt) <= CLOSED_WITHIN_MS);
    const red = redIssues.find((i) => i.title.startsWith(RED_TITLE) && referenced.has(i.number) && live(i));
    return red ? { mode: "restart", issue: red.number } : null;
}

/**
 * The release.yml runs a restart cancels: full and restart runs (run-name `Release (full)`, `Release (restart)`),
 * never a shadow or legacy release.
 * @param runs `gh run list --json databaseId,displayTitle` of the in-progress runs
 * @returns their ids
 */
export function toCancel(runs) {
    return runs.filter((r) => /^Release \((full|restart)\)$/.test(r.displayTitle)).map((r) => r.databaseId);
}

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();

function main() {
    const dryRun = process.argv.includes("--dry-run");
    const issues = JSON.parse(
        run("gh", [
            "issue",
            "list",
            "--state",
            "all",
            "--search",
            `"${RED_TITLE}" in:title`,
            "--json",
            "number,title,state,closedAt",
            "--limit",
            "30",
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
    const inProgress = JSON.parse(
        run("gh", [
            "run",
            "list",
            "--workflow",
            "release.yml",
            "--status",
            "in_progress",
            "--json",
            "databaseId,displayTitle",
        ]),
    );
    for (const id of toCancel(inProgress)) {
        console.log(`release-due: cancelling release.yml run ${id}, which tests a commit without this fix`);
        if (dryRun) continue;
        try {
            run("gh", ["run", "cancel", String(id)]);
        } catch (error) {
            // a run that ended meanwhile cannot be cancelled; the restart still goes ahead
            console.log(`::warning::cancelling run ${id} failed: ${String(error.message).split("\n")[0]}`);
        }
    }
    if (!dryRun) {
        run("gh", ["workflow", "run", "release.yml", "--ref", "master", "-f", `mode=${plan.mode}`]);
    }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
