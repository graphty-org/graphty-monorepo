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
 * issues, it never dispatches. A merge that says it fixes the issue (`Fixes`, `Closes`, `Resolves`) also cancels
 * the red run that issue names, if it is still in progress: the full run files the red issue the moment a lane ends
 * red, while its other lanes may run for hours, and release.yml's concurrency group would keep the restart pending
 * behind it. A `Refs` or `Part of` merge cancels nothing, so the red run still reaches its verdict, its bisect and
 * its record in the results store. Only runs the issue names are cancelled, never one testing another commit, and a
 * note on the Release status issue keeps release-watch from announcing the cancel as a release that ended badly.
 *
 * Not yet: resuming an approved awaiting candidate, which needs the results store.
 *
 * Usage: node tools/release-due.mjs [--dry-run]
 *   env GH_TOKEN, GITHUB_REPOSITORY; the checkout is the master commit, with its parents.
 */

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { listRedIssues, RED_TITLE } from "./full-run.mjs";
import { LABEL } from "./release-status.mjs";

// how long after its close a red issue still restarts: the merge that closed it ran this job minutes later
const CLOSED_WITHIN_MS = 60 * 60 * 1000;

/**
 * The red issue a merge references, if any: open, or closed in the last hour (by this merge's `Fixes`).
 * @param redIssues the issues, as listRedIssues returns them; one with no state is open
 * @param messages the merge's commit messages, joined
 * @param [now] milliseconds
 * @returns the dispatch to make ({ mode, issue, cancel }), or null when nothing is due; `cancel` when the merge says
 *   it fixes the issue, not only refers to it
 */
export function due(redIssues, messages, now = Date.now()) {
    const keywords = new Map();
    for (const m of messages.matchAll(/\b(refs|fix(?:es|ed)?|close[sd]?|resolve[sd]?|part of)\s+#(\d+)/gi)) {
        const n = Number(m[2]);
        keywords.set(n, [...(keywords.get(n) ?? []), m[1].toLowerCase()]);
    }
    const live = (i) =>
        (i.state ?? "OPEN") === "OPEN" || (i.closedAt && now - Date.parse(i.closedAt) <= CLOSED_WITHIN_MS);
    const red = redIssues.find((i) => i.title.startsWith(RED_TITLE) && keywords.has(i.number) && live(i));
    if (!red) return null;
    const cancel = keywords.get(red.number).some((k) => !["refs", "part of"].includes(k));
    return { mode: "restart", issue: red.number, cancel };
}

/**
 * The release.yml runs a restart cancels: full and restart runs (run-name `Release (full)`, `Release (restart)`)
 * that the red issue names (its body and comments link each run that filed or updated it), never a shadow or legacy
 * release and never a run testing another commit.
 * @param runs `gh run list --json databaseId,displayTitle` of the in-progress runs
 * @param issueText the red issue's body and comments, joined
 * @returns their ids
 */
export function toCancel(runs, issueText) {
    const named = new Set([...issueText.matchAll(/\/actions\/runs\/(\d+)/g)].map((m) => Number(m[1])));
    return runs
        .filter((r) => /^Release \((full|restart)\)$/.test(r.displayTitle) && named.has(r.databaseId))
        .map((r) => r.databaseId);
}

/**
 * The note on the Release status issue that a cancelled red run was not a release ending badly: it is a failure
 * report of that run attempt as release-status.mjs's reportsFailure reads one, so release-watch posts nothing.
 * @param issue the red issue
 * @param url the run's URL
 * @param attempt the run attempt
 * @returns the comment
 */
export function cancelNote(issue, url, attempt) {
    const rerun = attempt > 1 ? ` (re-run, attempt ${attempt})` : "";
    return `**Full run red**${rerun}: see #${issue}. This run was cancelled to restart on a merge that fixes it.\n\nRun: ${url}`;
}

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();

function cancelRedRun(issue, dryRun) {
    const inProgress = JSON.parse(
        run("gh", [
            "run",
            "list",
            "--workflow",
            "release.yml",
            "--status",
            "in_progress",
            "--json",
            "databaseId,displayTitle,url,attempt",
        ]),
    );
    const issueText = run("gh", [
        "issue",
        "view",
        String(issue),
        "--json",
        "body,comments",
        "-q",
        '[.body, .comments[].body] | join("\\n")',
    ]);
    for (const id of toCancel(inProgress, issueText)) {
        const r = inProgress.find((x) => x.databaseId === id);
        console.log(`release-due: cancelling release.yml run ${id}, the red run #${issue} names`);
        if (dryRun) continue;
        // the note first, so release-watch finds it when the cancelled run completes; its failure never skips the cancel
        try {
            const status = run("gh", [
                "issue",
                "list",
                "--label",
                LABEL,
                "--state",
                "open",
                "--json",
                "number",
                "-q",
                ".[0].number",
            ]);
            if (status) run("gh", ["issue", "comment", status, "--body", cancelNote(issue, r.url, r.attempt)]);
        } catch (error) {
            console.log(
                `::warning::the note on the Release status issue failed: ${String(error.message).split("\n")[0]}`,
            );
        }
        try {
            run("gh", ["run", "cancel", String(id)]);
        } catch (error) {
            // a run that ended meanwhile cannot be cancelled; the restart still goes ahead
            console.log(`::warning::cancelling run ${id} failed: ${String(error.message).split("\n")[0]}`);
        }
    }
}

function main() {
    const dryRun = process.argv.includes("--dry-run");
    // the open ones, and those closed in the last hour (by this merge's Fixes)
    const issues = [
        ...listRedIssues("open"),
        ...listRedIssues("closed", new Date(Date.now() - CLOSED_WITHIN_MS).toISOString()),
    ];
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
    // Best effort: a failure here (a 5xx, a rate limit) must never stop the restart dispatch below.
    try {
        if (plan.cancel) cancelRedRun(plan.issue, dryRun);
    } catch (error) {
        console.log(`::warning::cancelling the red run failed: ${String(error.message).split("\n")[0]}`);
    }
    if (!dryRun) {
        run("gh", ["workflow", "run", "release.yml", "--ref", "master", "-f", `mode=${plan.mode}`]);
    }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
