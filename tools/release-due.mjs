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
 * A merge of the owner's screenshot approval (design/ci/channels-pipeline.md section 5, "Approval gates nightly"):
 * its accept commit A, subject "<prefix>: approve visual baselines at <sha12>", parented on the candidate H, dispatches
 * release.yml `mode: promote-nightly` with `candidate` H and `accept` P, the pull request's head (A and the commit
 * holding the owner's signed approval on it; the merge's second parent), when H is the held head (or nothing is held)
 * and its latest verdict is green-images (tools/channel/resume.mjs). An approval for a head that is no longer the
 * held one dispatches nothing and says so on the hold issue. A store that does not answer dispatches anyway: the
 * run's own check decides.
 *
 * A fix forward into the held candidate (design/ci/channels-pipeline.md section 3): a merge whose branch is named for
 * the hold issue, or whose commits or pull request description reference it, dispatches release.yml
 * `mode: candidate`, which merges the fix into branch channel/candidate (tools/channel/candidate-fix.mjs) and re-tests
 * the new head. Every full and restart run merges waiting fixes first too, so a candidate run that another dispatch
 * replaces while pending loses nothing.
 *
 * A newer master push cancels an unfinished older build (ci.yml's concurrency), and this job runs only in a green
 * build, so it reads every merge since the last green master build, not only this one: a cancelled build's `Fixes #N`
 * or `Refs #N` still restarts (lastGreenBuild), and a cancelled build's approval merge still promotes (approvalsIn).
 *
 * Usage: node tools/release-due.mjs [--dry-run]
 *   env GH_TOKEN, GITHUB_REPOSITORY, RESULTS_URL and the job's OIDC token; the checkout is the master commit, with
 *   its parents.
 */

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { referencesHold } from "./channel/candidate-fix.mjs";
import { acceptsIn, resumeDecision } from "./channel/resume.mjs";
import { listRedIssues, RED_TITLE, runsOnTitleCommit } from "./full-run.mjs";
import { LABEL } from "./release-status.mjs";
import { call, config } from "./results/client.mjs";

// how long after its close a red issue still restarts: the merge that closed it ran this job minutes later
const CLOSED_WITHIN_MS = 60 * 60 * 1000;

// A red or hold issue open longer than this no longer starts a re-test of its own: each one pays for the paid lanes
// (the T4 GPU lane on machine.dev), and a blocker left that long is not fixed by testing it again. The scheduled
// 6-hour full run still tests master and merges waiting fixes, so a fix is never left untested.
export const PAID_RETEST_MAX_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Whether an issue is too old to start a re-test on the paid lanes.
 * @param openedAt when it was opened: milliseconds or an ISO date; unknown is never too old
 * @param [now] milliseconds
 * @returns true past PAID_RETEST_MAX_MS
 */
export function tooOldToRetest(openedAt, now = Date.now()) {
    const t = typeof openedAt === "number" ? openedAt : Date.parse(openedAt ?? "");
    return Number.isFinite(t) && now - t > PAID_RETEST_MAX_MS;
}

/**
 * A run attempt as read from GitHub: a positive integer, else 1 (an older gh has no `attempt` field).
 * @param raw the field's value or the command's output
 * @returns the attempt
 */
export function attemptOf(raw) {
    const n = Number.parseInt(String(raw ?? ""), 10);
    return Math.max(n || 1, 1);
}

/**
 * The restart's dispatch: it tests `sha`, the commit of the green master build this job runs in, never master's
 * tip at dispatch time, which may be a newer merge whose build is still running or red.
 * @param mode the plan's mode
 * @param sha the green build's commit
 * @returns the `gh` arguments
 */
export function restartDispatch(mode, sha) {
    return ["workflow", "run", "release.yml", "--ref", "master", "-f", `mode=${mode}`, "-f", `sha=${sha}`];
}

/**
 * The red issue a merge references, if any: open, or closed in the last hour (by this merge's `Fixes`).
 * @param redIssues the issues, as listRedIssues returns them; one with no state is open
 * @param messages the merge's commit messages, joined
 * @param [now] milliseconds
 * @param [closedSince] milliseconds: an issue closed at or after this still counts (by default an hour before now; a
 *   cancelled build's merge may have closed it earlier)
 * @returns the dispatch to make ({ mode, issue, cancel, stale }), or null when nothing is due; `cancel` when the merge
 *   says it fixes the issue, not only refers to it; `stale` when the issue is too old to re-test (tooOldToRetest),
 *   which dispatches nothing
 */
export function due(redIssues, messages, now = Date.now(), closedSince = now - CLOSED_WITHIN_MS) {
    const keywords = new Map();
    for (const m of messages.matchAll(
        /\b(refs|fix(?:es|ed)?|close[sd]?|resolve[sd]?|part of):?\s+(?:(?:https:\/\/github\.com\/)?graphty-org\/graphty-monorepo(?:\/issues\/|#)|#)(\d+)/gi,
    )) {
        const n = Number(m[2]);
        keywords.set(n, [...(keywords.get(n) ?? []), m[1].toLowerCase()]);
    }
    const live = (i) => (i.state ?? "OPEN") === "OPEN" || (i.closedAt && Date.parse(i.closedAt) >= closedSince);
    const reds = redIssues.filter((i) => i.title.startsWith(RED_TITLE) && keywords.has(i.number) && live(i));
    const red = reds.find((i) => !tooOldToRetest(i.createdAt, now)) ?? reds[0];
    if (!red) return null;
    if (tooOldToRetest(red.createdAt, now)) return { mode: "restart", issue: red.number, cancel: false, stale: true };
    const cancel = keywords.get(red.number).some((k) => !["refs", "part of"].includes(k));
    return { mode: "restart", issue: red.number, cancel };
}

/**
 * The release.yml runs a restart cancels: full and restart runs (run-name `Release (full)`, `Release (restart)`)
 * that the red issue names as testing the commit its title is on (runsOnTitleCommit: each filing pairs a run with
 * the commit it tested), never a shadow or legacy release and never a run testing another commit. A run's headSha is
 * master's tip when it was dispatched, not the commit its pick tested, so the issue's own pairing is the check.
 * @param runs `gh run list --json databaseId,displayTitle` of the in-progress runs
 * @param title the red issue's title
 * @param issueText the red issue's body and comments, joined
 * @returns their ids
 */
export function toCancel(runs, title, issueText) {
    const named = runsOnTitleCommit(title, issueText);
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

/**
 * The approvals the merges since the last green build bring in, one per candidate: a newer push cancels an unfinished
 * older build, so an approval merge's own build may never run this job, and the next green build promotes it.
 * @param merges `[{ approval, commits }]`, newest first: each master commit, its pull request's head (the merge's second
 *   parent; the commit itself when it is not a merge) and the commits it brought in, `[{ sha, parents, subject }]`
 * @returns `[{ candidate, accept }]`: for each candidate the newest merge's approval, which promote-nightly checks
 *   holds only accept-only commits on the candidate
 */
export function approvalsIn(merges) {
    const byCandidate = new Map();
    for (const m of merges) {
        for (const { candidate } of acceptsIn(m.commits)) {
            if (!byCandidate.has(candidate)) byCandidate.set(candidate, m.approval);
        }
    }
    return [...byCandidate].map(([candidate, accept]) => ({ candidate, accept }));
}

/**
 * The promotions the merges' accept commits start (design/ci/channels-pipeline.md section 5).
 * @param merges as approvalsIn takes them
 * @param store `GET /v1/candidate`'s answer (hold, recent), or null when the store did not answer
 * @returns `[{ candidate, accept, run, why, comment }]`: run, dispatch promote-nightly; comment, the hold issue to
 *   tell why not
 */
export function resumesDue(merges, store) {
    return approvalsIn(merges).map(({ candidate, accept }) => {
        if (!store) return { candidate, accept, run: true, why: "the results store did not answer: the run decides" };
        const latest = (store.recent ?? []).find((v) => v.sha === candidate) ?? null;
        const d = resumeDecision({ candidate, accept, hold: store.hold ?? null, latest });
        return { candidate, accept, ...d };
    });
}

/**
 * The last green master build before this one: every merge after it is this job's to read, because a build in
 * between was cancelled by a newer push or ended red, and this job ran in neither.
 * @param head this build's commit
 * @param greenShas the head commits of master's green push builds, newest first
 * @param isAncestor (sha) => whether that commit is in head's history
 * @returns the commit, or null when none is (this job then reads only its own merge)
 */
export function lastGreenBuild(head, greenShas, isAncestor) {
    return greenShas.find((sha) => sha !== head && isAncestor(sha)) ?? null;
}

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();
// a failed command's cause: gh's own error line ("HTTP 403: API rate limit exceeded ..."), not "Command failed: <argv>"
const cause = (error) =>
    String(error?.stderr || error?.message)
        .trim()
        .split("\n")[0];

/**
 * A release.yml dispatch. One that fails (the job's token is the repository's Actions token, whose hourly budget every
 * workflow shares and which ran out on 2026-10-29, #4318) is an error that fails the job and is told on `issue`, so
 * it is never missed; ci.yml keeps the master build green. It does not wait for the rate limit's reset: this job runs
 * inside the master build, which holds master's build queue until it ends. The next 6-hour full run catches up on a
 * missed promotion (tools/channel/resume.mjs), fix forward or restart.
 * @param args the `gh` arguments
 * @param issue the hold or red issue to tell, or null
 * @returns whether it was dispatched
 */
function dispatchRelease(args, issue) {
    try {
        run("gh", args);
        return true;
    } catch (error) {
        const why = String(error.stderr || error.message).trim();
        console.log(`::error::gh ${args.join(" ")} failed: ${why.replaceAll("\n", " ")}`);
        process.exitCode = 1;
        if (issue) tellFailed(issue, args, why);
        return false;
    }
}

function tellFailed(issue, args, why) {
    const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: id } = process.env;
    const where = id ? ` (${server}/${repo}/actions/runs/${id})` : "";
    const body = `release-due could not dispatch release.yml${where}: \`${why.split("\n")[0]}\`. The next 6-hour full run catches up; to start it now: \`gh ${args.join(" ")}\``;
    try {
        run("gh", ["issue", "comment", String(issue), "--body", body]);
    } catch (error) {
        console.log(`::warning::telling #${issue} failed: ${cause(error)}`);
    }
}

// the run's attempt through the REST API (`gh run list --json attempt` needs gh 2.48 or later); 1 when unreadable
function runAttempt(id) {
    try {
        return attemptOf(run("gh", ["api", `repos/{owner}/{repo}/actions/runs/${id}`, "--jq", ".run_attempt"]));
    } catch {
        return 1;
    }
}

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
            "databaseId,displayTitle,url",
        ]),
    );
    const red = JSON.parse(run("gh", ["issue", "view", String(issue), "--json", "title,body,comments"]));
    const issueText = [red.body, ...(red.comments ?? []).map((c) => c.body)].join("\n");
    for (const id of toCancel(inProgress, red.title, issueText)) {
        const r = inProgress.find((x) => x.databaseId === id);
        console.log(`release-due: cancelling release.yml run ${id}, the red run #${issue} names`);
        if (dryRun) continue;
        cancelWithNote(id, () => {
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
            return status
                ? run("gh", ["issue", "comment", status, "--body", cancelNote(issue, r.url, runAttempt(id))])
                : "";
        });
    }
}

/**
 * Cancels one run, posting the cancel note first so release-watch finds it when the cancelled run completes. The
 * note's failure never skips the cancel; a failed cancel deletes the note, since the run goes on and may end badly
 * for a real reason the note would hide.
 * @param id the run
 * @param postNote () => the note comment's URL (gh issue comment prints it), or empty when none was posted
 * @param [gh] (args) => gh's output
 */
export function cancelWithNote(id, postNote, gh = (args) => run("gh", args)) {
    let note = "";
    try {
        note = postNote();
    } catch (error) {
        console.log(`::warning::the note on the Release status issue failed: ${cause(error)}`);
    }
    try {
        gh(["run", "cancel", String(id)]);
    } catch (error) {
        // a run that ended meanwhile cannot be cancelled; the restart still goes ahead
        console.log(`::warning::cancelling run ${id} failed: ${cause(error)}`);
        const comment = /#issuecomment-(\d+)/.exec(note ?? "")?.[1];
        if (!comment) return;
        try {
            gh(["api", "-X", "DELETE", `repos/{owner}/{repo}/issues/comments/${comment}`]);
        } catch (deleteError) {
            console.log(`::warning::deleting the cancel note ${note} failed: ${cause(deleteError)}`);
        }
    }
}

// each master commit (newest first), its pull request's head and the commits it brought in
function approvalMerges(shas) {
    return shas.map((sha) => {
        const parents = run("git", ["rev-list", "--parents", "-1", sha]).split(" ").slice(1);
        const range = parents.length > 1 ? [`${sha}^1..${sha}`] : ["-1", sha];
        const commits = run("git", ["log", "--format=%H %P%x09%s", ...range])
            .split("\n")
            .filter(Boolean)
            .map((line) => {
                const [ids, subject] = line.split("\t");
                const [c, ...ps] = ids.split(" ");
                return { sha: c, parents: ps, subject };
            });
        return { approval: parents.length > 1 ? parents[1] : sha, commits };
    });
}

async function promoteApproved(shas, dryRun) {
    const merges = approvalMerges(shas);
    if (approvalsIn(merges).length === 0) return;
    const cfg = config(process.env);
    const r = cfg ? await call(cfg, "GET", "/v1/candidate") : { ok: false };
    for (const p of resumesDue(merges, r.ok ? r.data : null)) {
        console.log(`release-due: the approval ${p.accept} of ${p.candidate}: ${p.why}`);
        if (dryRun) continue;
        if (p.run) {
            const args = ["workflow", "run", "release.yml", "--ref", "master", "-f", "mode=promote-nightly"];
            args.push("-f", `candidate=${p.candidate}`, "-f", `accept=${p.accept}`);
            dispatchRelease(args, r.ok ? (r.data?.hold?.issue ?? null) : null);
        } else if (p.comment) {
            run("gh", [
                "issue",
                "comment",
                String(p.comment),
                "--body",
                `The approval ${p.accept} merged, but nothing was promoted: ${p.why}.`,
            ]);
        }
    }
}

/**
 * Whether a merge fixes the held candidate forward.
 * @param merge `{ subject, messages }`: the merge's subject, and its commits' messages and pull request description
 * @param store `GET /v1/candidate`'s answer, or null
 * @returns the hold issue's number, or null
 */
export function fixForwardDue(merge, store) {
    const issue = store?.hold?.issue;
    return issue && referencesHold(merge, issue) ? issue : null;
}

/**
 * The fix merges among the merges since the last green build: each merge is judged on its own subject, messages and
 * pull request description, so a newer unrelated merge is never named for an older fix.
 * @param merges `[{ subject, messages }]`, one per master commit
 * @param store `GET /v1/candidate`'s answer, or null
 * @param [now] milliseconds
 * @returns `{ issue, prs, stale }` (the fixes' pull request numbers; stale when the hold is too old to re-test, which
 *   dispatches nothing), or null
 */
export function fixForwardMerges(merges, store, now = Date.now()) {
    const fixes = merges.filter((m) => fixForwardDue(m, store));
    if (!fixes.length) return null;
    const prs = fixes.map((m) => /^Merge pull request #(\d+) /.exec(m.subject ?? "")?.[1]).filter(Boolean);
    if (tooOldToRetest(store.hold.at, now)) return { issue: store.hold.issue, prs, stale: true };
    return { issue: store.hold.issue, prs };
}

/**
 * The dispatch of a fix forward's candidate run, naming the fixes' pull requests (`fix_pr`, comma-separated):
 * release.yml's candidate_fix job takes their merges as fixes even when only a description references the hold issue.
 * @param prs the fixes' pull request numbers
 * @returns the `gh` arguments
 */
export function fixForwardDispatch(prs) {
    return [
        "workflow",
        "run",
        "release.yml",
        "--ref",
        "master",
        "-f",
        "mode=candidate",
        ...(prs.length ? ["-f", `fix_pr=${prs.join(",")}`] : []),
    ];
}

async function dispatchFixForward(merges, dryRun) {
    const cfg = config(process.env);
    const r = cfg ? await call(cfg, "GET", "/v1/candidate") : { ok: false };
    const due = fixForwardMerges(merges, r.ok ? r.data : null);
    if (!due) return;
    if (due.stale) {
        console.log(
            `release-due: the hold #${due.issue} is over 30 days old: no candidate re-test of its own (it would pay for the T4 GPU lane); the scheduled full run merges the fixes`,
        );
        return;
    }
    console.log(`release-due: these merges fix the held candidate forward (#${due.issue}): release.yml mode=candidate`);
    if (!dryRun) dispatchRelease(fixForwardDispatch(due.prs), due.issue);
}

// the last green master build HEAD descends from, or null
function lastGreenBase(head) {
    try {
        const green = JSON.parse(
            run("gh", [
                "run",
                "list",
                "--workflow",
                "ci.yml",
                "--branch",
                "master",
                "--event",
                "push",
                "--status",
                "success",
                "--limit",
                "30",
                "--json",
                "headSha",
            ]),
        ).map((r) => r.headSha);
        return lastGreenBuild(head, green, (sha) => {
            try {
                run("git", ["merge-base", "--is-ancestor", sha, head]);
                return true;
            } catch {
                return false;
            }
        });
    } catch (error) {
        console.log(`::warning::finding the last green master build failed: ${cause(error)}`);
    }
    return null;
}

// each master commit's pull request description (one call each), and each commit on its own for the fix forward
function readMerges(commits) {
    let bodies = "";
    const merges = []; // each master commit on its own, for the fix forward
    for (const sha of commits) {
        let body = "";
        try {
            const path = `repos/{owner}/{repo}/commits/${sha}/pulls`;
            body = run("gh", ["api", path, "--jq", ".[].body // empty"]);
        } catch (error) {
            console.log(`::warning::reading the merged pull request failed: ${cause(error)}`);
        }
        bodies += body + "\n";
        const own =
            run("git", ["rev-list", "--parents", "-1", sha]).split(" ").length > 2 ? [`${sha}^1..${sha}`] : ["-1", sha];
        merges.push({
            subject: run("git", ["log", "-1", "--format=%s", sha]),
            messages: `${run("git", ["log", "--format=%B", ...own])}\n${body}`,
        });
    }
    return { bodies, merges };
}

async function main() {
    const dryRun = process.argv.includes("--dry-run");
    const now = Date.now();
    const head = run("git", ["rev-parse", "HEAD"]);
    const base = lastGreenBase(head);
    // Every merge since the last green build; without one, a merge commit brings in HEAD^1..HEAD and a plain commit
    // is only itself.
    let range = ["-1", "HEAD"];
    if (base) {
        range = [`${base}..HEAD`];
    } else {
        try {
            run("git", ["rev-parse", "--verify", "--quiet", "HEAD^2"]);
            range = ["HEAD^1..HEAD"];
        } catch {
            // not a merge
        }
    }
    // an issue a merge since the base closed still counts, however long the cancelled builds took
    const baseAt = base ? Number(run("git", ["log", "-1", "--format=%ct", base])) * 1000 : now;
    const closedSince = Math.min(now - CLOSED_WITHIN_MS, baseAt);
    const issues = [...listRedIssues("open"), ...listRedIssues("closed", new Date(closedSince).toISOString())];
    // GitHub closes an issue from the pull request's description too, which the merge commit does not carry.
    // ponytail: one call per master commit since the base, capped; a longer run of cancelled builds reads the newest 20
    const commits = base ? run("git", ["rev-list", "--first-parent", "-20", `${base}..HEAD`]).split("\n") : [head];
    const { bodies, merges } = readMerges(commits);
    // an approval merge promotes its candidate whatever the red issues say; its failure never stops the restart
    try {
        await promoteApproved(commits, dryRun);
    } catch (error) {
        console.log(`::error::the approval check failed: ${cause(error)}`);
        process.exitCode = 1;
    }
    const messages = `${run("git", ["log", "--format=%B", ...range])}\n${bodies}`;
    // its failure never stops the restart below
    try {
        await dispatchFixForward(merges, dryRun);
    } catch (error) {
        console.log(`::error::the fix-forward check failed: ${cause(error)}`);
        process.exitCode = 1;
    }
    if (base) console.log(`release-due: reading every merge since the last green master build ${base.slice(0, 7)}`);
    const plan = due(issues, messages, now, closedSince);
    if (!plan) {
        console.log("release-due: nothing due (no open red issue referenced by these merges)");
        return;
    }
    if (plan.stale) {
        console.log(
            `release-due: red issue #${plan.issue} is over 30 days old: no restart of its own (it would pay for the T4 GPU lane); the scheduled full run tests the fix`,
        );
        return;
    }
    console.log(`release-due: this merge references red issue #${plan.issue}: release.yml mode=${plan.mode}`);
    // Best effort: a failure here (a 5xx, a rate limit) must never stop the restart dispatch below.
    try {
        if (plan.cancel) cancelRedRun(plan.issue, dryRun);
    } catch (error) {
        console.log(`::warning::cancelling the red run failed: ${cause(error)}`);
    }
    if (!dryRun) dispatchRelease(restartDispatch(plan.mode, head), plan.issue);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
