// Keeps master green (design/ci/ci-cd-plan.md section 12). Run by .github/workflows/master-guard.yml when
// CI or Hosts finishes on master, with the finished run in GITHUB_EVENT_PATH.
//
// - CI red on a master commit: freeze the Mergify queue (pull requests labelled priority:critical still
//   merge, so the fix can land), open a revert of the commit when its parent was green (a batch merge's
//   revert takes out the whole batch, and its title lists the pull requests), and open a
//   priority:critical issue -- or, when a red-master issue is already open (one cause, such as an audit
//   advisory, turns several commits red), add the commit to that issue instead.
//   When the failure looks external (outsideCause: an outside service's error, a lost runner, or the same
//   job failing on an earlier commit), it neither freezes nor reverts: it re-runs the failed jobs once and
//   files the issue with the evidence.
// - CI green on a commit at or after a frozen red commit: lift that freeze.
// - Either way, close the guard's own open revert pull requests that are no longer needed (staleReverts).
// - Hosts red on master (the nightly; a push to master no longer runs Hosts): open (or add to) a
//   priority:critical issue naming the merges since the lane's last green run. A hardware lane never freezes the queue; release.yml already
//   refuses to release a commit whose lanes are not green. The T4 GPU lane (gpu.yml) runs only in the
//   release train, which files its own "Release held" issue, so a GPU run is never this script's business.
//
// Every step is attempted even when an earlier one fails; the run then exits 1 so the failure is seen.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const FREEZE_PREFIX = "Red master: CI failed on ";
const FAILED = new Set(["failure", "timed_out"]);
// Jobs that only report on the others: they fail whenever another job fails.
const SUMMARY_JOBS = new Set(["All Checks Pass", "Queue Checks Pass"]);
// A log line naming an outside service's failure: an HTTP 5xx (lychee prints "[502] <url> | ..."), a network
// error, or a runner GitHub lost or abandoned.
const OUTSIDE = [
    /^\[5\d\d\]/,
    /\b5\d\d (?:Bad Gateway|Service Unavailable|Gateway Time-?out|Internal Server Error)\b/i,
    /\bE5\d\d\b|ERR_PNPM_FETCH_5\d\d/,
    /\b(?:ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND)\b|Could not resolve host|socket hang up/i,
    /runner has received a shutdown signal|lost communication with the server|was not acquired by Runner/i,
    /\babandoned\b/i,
];
const isOutside = (line) => OUTSIDE.some((re) => re.test(line));
// A log line naming a failure of the commit's own: a dead link that is not a 5xx, a type error, a dead
// Storybook link, an error annotation other than the exit code.
// ponytail: line patterns, not a parse of each tool's report; add a pattern when a misread shows up
const OWN = [
    /^\[(?:[1-46-9]\d\d|ERROR)\]/,
    /\berror TS\d+/,
    /\b[1-9]\d* dead\b/,
    /^##\[error\](?!Process completed with exit code)/,
];
// How long before a red run an earlier red run of the same job still counts as the same cause.
const WINDOW_MS = 3 * 60 * 60 * 1000;
const MERGIFY = "https://api.mergify.com/v1";
const json = (method, body) => ({ method, body: JSON.stringify(body) });

/**
 * The guard's open issues whose title starts with a prefix, oldest first. Read through the issues API, not
 * search: search's index lags, so two runs seconds apart would each miss the other's issue.
 * @param gh - Calls the repository's REST API: gh(path, init).
 * @param prefix - The title prefix.
 * @returns The issues.
 */
export async function openIssues(gh, prefix) {
    const issues = await gh("/issues?state=open&labels=priority:critical&sort=created&direction=asc&per_page=100");
    return issues.filter((i) => !i.pull_request && i.title.startsWith(prefix));
}

/**
 * Report on the one open issue for a cause: comment on it when it is open, otherwise open it. Two runs racing
 * can both open one, so after opening, the newer of the two is closed as a duplicate of the older.
 * @param gh - Calls the repository's REST API: gh(path, init).
 * @param issue - The issue.
 * @param issue.prefix - What every issue for this cause starts with.
 * @param issue.title - A new issue's title.
 * @param issue.labels - A new issue's labels.
 * @param issue.body - A new issue's body.
 * @param issue.comment - The report added to an issue already open.
 * @returns The number of the issue the report landed on.
 */
export async function fileIssue(gh, { prefix, title, labels, body, comment }) {
    const addTo = async (n) => {
        await gh(`/issues/${n}/comments`, json("POST", { body: comment }));
        console.log(`added to #${n}`);
        return n;
    };
    const [open] = await openIssues(gh, prefix);
    if (open) {
        return addTo(open.number);
    }
    const created = await gh("/issues", json("POST", { title, labels, body }));
    const [oldest] = await openIssues(gh, prefix);
    if (!oldest || oldest.number >= created.number) {
        console.log(`opened #${created.number}`);
        return created.number;
    }
    await gh(`/issues/${created.number}/comments`, json("POST", { body: `Duplicate of #${oldest.number}.` }));
    await gh(`/issues/${created.number}`, json("PATCH", { state: "closed", state_reason: "not_planned" }));
    return addTo(oldest.number);
}

/**
 * What to do about a finished workflow run.
 * @param run - The workflow_run payload's run.
 * @returns The action.
 */
export function decide(run) {
    const failed = run.conclusion === "failure" || run.conclusion === "timed_out";
    if (run.name === "CI") {
        if (run.event !== "push") {
            return "none";
        }
        if (failed) {
            return "red";
        }
        return run.conclusion === "success" ? "green" : "none";
    }
    if (run.name === "Hosts" && failed && run.event === "schedule") {
        return "hardware-red";
    }
    return "none";
}

/**
 * The red commit a freeze was made for.
 * @param reason - The freeze's reason.
 * @returns The commit, or null for a freeze this script did not make.
 */
export function frozenSha(reason) {
    const m = new RegExp(`^${FREEZE_PREFIX}([0-9a-f]{40})`).exec(reason ?? "");
    return m ? m[1] : null;
}

/**
 * The pull requests a merge commit landed: one for GitHub's "Merge pull request #12 from ...", every one for a
 * Mergify merge-batch commit ("Merged #42, #43, #44"; .mergify.yml).
 * @param message - The commit message.
 * @returns The pull request numbers; empty for another commit.
 */
export function mergedPrs(message) {
    const single = /^Merge pull request #(\d+) /.exec(message);
    if (single) {
        return [Number(single[1])];
    }
    const title = message.split("\n")[0];
    return title.startsWith("Merged #") ? [...title.matchAll(/#(\d+)/g)].map((m) => Number(m[1])) : [];
}

/**
 * The title of a revert pull request; conventional, so Lint PR Title passes it.
 * @param sha - The reverted commit.
 * @param prs - The pull requests it landed (a batch merge lands several).
 * @returns The title.
 */
export function revertTitle(sha, prs) {
    const at = sha.slice(0, 7);
    if (!prs.length) {
        return `revert: ${at}, master CI red`;
    }
    const list = prs.map((n) => `#${n}`).join(", ");
    return prs.length === 1
        ? `revert: pull request ${list}, master CI red at ${at}`
        : `revert: batch ${list}, master CI red at ${at}`;
}

/**
 * The body of a revert pull request: what the revert takes out, and how the reverted work comes back.
 * @param sha - The reverted commit.
 * @param url - The red CI run.
 * @param prs - The pull requests it landed (a batch merge lands several).
 * @returns The body.
 */
export function revertBody(sha, url, prs) {
    const list = prs.map((n) => `#${n}`).join(", ");
    // A merged pull request cannot re-enter the queue: its commits are already in master's history, so merging
    // them again changes nothing. The way back is a revert of this revert (or a new pull request).
    const back =
        "To bring the reverted work back, open a pull request that reverts this revert (git revert <the revert commit of this pull request>) together with the fix, or that reverts it minus the culprit's changes.";
    if (prs.length > 1) {
        // A batch merge is one commit whose tree is exactly the tree "Queue Checks Pass" passed, so a red master
        // run on it more likely means a job that runs only on master, or a flake, than one culprit among them.
        return `${sha} turned master's CI red: ${url}\n\nIts parent was green, so this reverts it. It landed a batch of ${prs.length} pull requests (${list}), and the revert takes out all of them. The merge queue had already passed this exact tree, so look first at the jobs that run only on master and at flakes; if the cause is one pull request of the batch, the others are innocent.\n\n${back}`;
    }
    const landed = prs.length ? ` (${list})` : "";
    return `${sha} turned master's CI red: ${url}\n\nIts parent was green, so this reverts it, together with the pull request it landed${landed}.\n\n${back}`;
}

/**
 * The lines a step printed, out of its job's log (each log line starts with its time).
 * @param log - The job's log.
 * @param step - The step (the jobs API).
 * @returns The lines, without their times.
 */
function stepLines(log, step) {
    const from = Date.parse(step.started_at);
    const to = Date.parse(step.completed_at) + 1000; // the API gives whole seconds
    return log.split("\n").flatMap((line) => {
        const m = /^(\S+Z) (.*)$/.exec(line);
        const t = m ? Date.parse(m[1]) : Number.NaN;
        return t >= from && t < to ? [m[2]] : [];
    });
}

/**
 * Why a red run looks external rather than caused by its commit. It does when every failed job (the summary
 * jobs aside) failed the same way on an earlier commit, or failed with no failed step (GitHub lost or
 * abandoned its runner), or has failed steps that printed an outside service's error and nothing of the
 * commit's own.
 * @param jobs - The run's jobs (the jobs API).
 * @param logs - The failed jobs' logs, by job id.
 * @param earlier - Jobs that failed on earlier master commits: job name to commit.
 * @returns One line of evidence per failed job, or null when any of them may be the commit's.
 */
export function outsideCause(jobs, logs, earlier) {
    const failed = jobs.filter((j) => FAILED.has(j.conclusion) && !SUMMARY_JOBS.has(j.name));
    if (!failed.length) {
        return null;
    }
    const evidence = [];
    for (const job of failed) {
        if (earlier[job.name]) {
            evidence.push(`${job.name} also failed on the earlier master commit ${earlier[job.name]}.`);
            continue;
        }
        const steps = (job.steps ?? []).filter((s) => s.conclusion === "failure");
        if (!steps.length && job.conclusion === "failure") {
            evidence.push(`${job.name} failed with no failed step: GitHub lost or abandoned its runner.`);
            continue;
        }
        const lines = steps.flatMap((s) => stepLines(logs[job.id] ?? "", s));
        const outside = lines.filter(isOutside);
        if (!outside.length || lines.some((l) => OWN.some((re) => re.test(l)) && !isOutside(l))) {
            return null;
        }
        const more = outside.length > 1 ? ` (and ${outside.length - 1} more like it)` : "";
        evidence.push(`${job.name}: \`${outside[0].trim()}\`${more}`);
    }
    return evidence;
}

/**
 * Read what outsideCause needs about a red CI run: its jobs, the failed jobs' logs, and the jobs that failed on
 * master in the hours before it.
 * @param gh - Calls the repository's REST API: gh(path, init); a log comes back as text.
 * @param run - The workflow_run payload's run.
 * @returns The failed jobs' names, and the evidence that the failure is external (null when it may not be).
 */
export async function examineRed(gh, run) {
    const { jobs } = await gh(`/actions/runs/${run.id}/attempts/${run.run_attempt ?? 1}/jobs?per_page=100`);
    const failed = jobs.filter((j) => FAILED.has(j.conclusion) && !SUMMARY_JOBS.has(j.name));
    const logs = {};
    for (const j of failed) {
        logs[j.id] = await gh(`/actions/jobs/${j.id}/logs`).catch(() => "");
    }
    const earlier = {};
    const since = Date.parse(run.created_at) - WINDOW_MS;
    const { workflow_runs: runs } = await gh(
        "/actions/workflows/ci.yml/runs?branch=master&event=push&status=completed&per_page=20",
    );
    const reds = runs.filter(
        (r) =>
            r.head_sha !== run.head_sha &&
            FAILED.has(r.conclusion) &&
            Date.parse(r.created_at) < Date.parse(run.created_at) &&
            Date.parse(r.created_at) >= since,
    );
    for (const r of reds) {
        for (const j of (await gh(`/actions/runs/${r.id}/jobs?per_page=100`)).jobs) {
            if (FAILED.has(j.conclusion)) {
                earlier[j.name] ??= r.head_sha;
            }
        }
    }
    return { failed: failed.map((j) => j.name), outside: outsideCause(jobs, logs, earlier) };
}

// A revert pull request's body names the reverted commit first and the jobs that failed last (revertBody and
// the marker main appends).
const REVERTED = /^([0-9a-f]{40}) turned master's CI red/;
const JOBS_MARK = /<!-- master-guard failed jobs: (\[.*?\]) -->/;

/**
 * Why a revert of `reverted` is no longer needed after a master CI run, if it is not.
 * @param reverted - The reverted commit.
 * @param at - The finished master CI run.
 * @param at.sha - Its commit.
 * @param at.url - Its page.
 * @param at.green - Whether it passed.
 * @param at.jobs - The jobs that failed both there and at `reverted`.
 * @param at.outside - Whether its failure looks external.
 * @param contains - Whether the run's commit contains `reverted`.
 * @returns The reason, or undefined.
 */
function whyStale(reverted, { sha, url, green, jobs, outside }, contains) {
    if (green) {
        return contains
            ? `Master CI is green at ${sha} (${url}), which contains ${reverted}, so that commit does not turn CI red.`
            : undefined;
    }
    if (contains && !outside) {
        return undefined;
    }
    const where = contains ? "from an outside cause" : `on a commit without ${reverted}`;
    return `${jobs.join(", ")} failed again at ${sha} (${url}), ${where}, so ${reverted} is not shown to be the cause.`;
}

/**
 * The guard's open revert pull requests that no longer need to merge: master CI is green on a commit that
 * contains the reverted one, or a job that failed there failed again where the reverted commit cannot be
 * the cause (on a commit without it, or from an outside cause).
 * @param gh - Calls the repository's REST API: gh(path, init).
 * @param at - The finished master CI run.
 * @param at.sha - Its commit.
 * @param at.url - Its page.
 * @param at.green - Whether it passed.
 * @param at.failed - The jobs that failed in it.
 * @param at.outside - Whether its failure looks external.
 * @returns Each revert to close: number, branch and why.
 */
export async function staleReverts(gh, { sha, url, green, failed = [], outside = false }) {
    const stale = [];
    for (const pull of await gh("/pulls?state=open&base=master&per_page=100")) {
        const reverted = REVERTED.exec(pull.body ?? "")?.[1];
        if (!reverted || !pull.head.ref.startsWith("revert/")) {
            continue;
        }
        const jobs = JSON.parse(JOBS_MARK.exec(pull.body)?.[1] ?? "[]").filter((j) => failed.includes(j));
        if (!green && !jobs.length) {
            continue;
        }
        const { status } = await gh(`/compare/${reverted}...${sha}`);
        const why = whyStale(
            reverted,
            { sha, url, green, jobs, outside },
            status === "ahead" || status === "identical",
        );
        if (why) {
            stale.push({ number: pull.number, branch: pull.head.ref, why });
        }
    }
    return stale;
}

/**
 * Close the guard's revert pull requests that are no longer needed (staleReverts), each with a comment saying
 * why, and delete their branches.
 * @param gh - Calls the repository's REST API: gh(path, init).
 * @param at - The finished master CI run (see staleReverts).
 * @returns The closed pull requests' numbers.
 */
export async function closeStaleReverts(gh, at) {
    const closed = [];
    for (const { number, branch, why } of await staleReverts(gh, at)) {
        await gh(`/issues/${number}/comments`, json("POST", { body: `${why} Closing this revert.` }));
        await gh(`/pulls/${number}`, json("PATCH", { state: "closed" }));
        await gh(`/git/refs/heads/${branch}`, { method: "DELETE" });
        console.log(`revert #${number} closed`);
        closed.push(number);
    }
    return closed;
}

async function main() {
    const { workflow_run: run } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    const repo = process.env.GITHUB_REPOSITORY;
    const errors = [];
    const attempt = async (what, fn) => {
        try {
            return await fn();
        } catch (e) {
            console.log(`::error::${what}: ${e.message}`);
            errors.push(what);
            return undefined;
        }
    };
    const call = async (base, token, path, init = {}) => {
        const res = await fetch(`${base}${path}`, {
            ...init,
            headers: {
                authorization: `Bearer ${token}`,
                accept: "application/vnd.github+json",
                "content-type": "application/json",
            },
        });
        if (!res.ok) {
            throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
        }
        if (res.status === 204) {
            return null;
        }
        // a job's log is text (fetch drops the authorization header on the redirect to the log's storage)
        return res.headers.get("content-type")?.includes("json") ? res.json() : res.text();
    };
    const gh = (path, init, token = process.env.GITHUB_TOKEN) =>
        call("https://api.github.com", token, `/repos/${repo}${path}`, init);
    const mergify = (path, init) => call(MERGIFY, process.env.MERGIFY_API_KEY, `/repos/${repo}${path}`, init);
    const ourFreezes = async () =>
        (await mergify("/scheduled_freeze")).scheduled_freezes.filter((f) => frozenSha(f.reason));
    const labels = (effort) => ["bug", "priority:critical", `effort:${effort}`];

    const action = decide(run);
    const sha = run.head_sha;
    const short = sha.slice(0, 7);
    console.log(`${run.name} ${run.conclusion} on ${sha} (${run.event}): ${action}`);

    if (action === "red") {
        const examined = await attempt("look for an outside cause", () => examineRed(gh, run));
        const outside = examined?.outside;
        if (examined) {
            await attempt("close reverts no longer needed", () =>
                closeStaleReverts(gh, {
                    sha,
                    url: run.html_url,
                    green: false,
                    failed: examined.failed,
                    outside: !!outside,
                }),
            );
        }
        if (outside && (run.run_attempt ?? 1) === 1) {
            // the freeze is skipped, so nothing waits on this re-run; it brings master (and the deploy) back
            await attempt("re-run the failed jobs", () =>
                gh(`/actions/runs/${run.id}/rerun-failed-jobs`, json("POST", {})),
            );
        }
        await attempt("freeze the merge queue", async () => {
            if (outside) {
                return console.log("the failure looks external: no freeze");
            }
            if ((await ourFreezes()).some((f) => frozenSha(f.reason) === sha)) {
                return console.log("already frozen for this commit");
            }
            await mergify(
                "/scheduled_freeze",
                json("POST", {
                    reason: `${FREEZE_PREFIX}${sha} (${run.html_url}). Lifted by the next green CI run on master.`,
                    start: null,
                    timezone: "UTC",
                    exclude_conditions: ["label=priority:critical"],
                }),
            );
            console.log("merge queue frozen; priority:critical pull requests still merge");
        });

        const title = `${FREEZE_PREFIX}${short}`;
        // A re-run of a commit already reported (as the issue or a comment on it) neither reverts nor reports again.
        const reported = await attempt("look for an existing issue", async () => {
            const [open] = await openIssues(gh, FREEZE_PREFIX);
            if (!open) {
                return false;
            }
            const comments = await gh(`/issues/${open.number}/comments?per_page=100`);
            return open.title === title || comments.some((c) => c.body.includes(sha));
        });
        if (reported) {
            console.log("already reported");
        } else {
            const revert = await attempt("open a revert", async () => {
                if (outside) {
                    return {
                        note: [
                            "The failure looks external, not caused by the commit, so the merge queue is not frozen and no revert was made. The evidence:",
                            "",
                            ...outside.map((e) => `- ${e}`),
                            "",
                            `${(run.run_attempt ?? 1) === 1 ? "The failed jobs were re-run once. " : ""}If the evidence is wrong, revert ${sha} by hand.`,
                        ].join("\n"),
                    };
                }
                const commit = await gh(`/commits/${sha}`);
                // The nearest first-parent ancestor CI ran on: a release commit carries [skip ci] and has no run.
                let parent = commit.parents[0].sha;
                for (let i = 0; i < 5; i++) {
                    const p = await gh(`/commits/${parent}`);
                    if (!p.commit.message.includes("[skip ci]")) {
                        break;
                    }
                    parent = p.parents[0].sha;
                }
                const runs = await gh(`/actions/workflows/ci.yml/runs?head_sha=${parent}&per_page=1`);
                const parentRun = runs.workflow_runs[0];
                const parentCi = parentRun?.conclusion ?? parentRun?.status ?? "no run";
                if (parentCi !== "success") {
                    return {
                        note: `Its parent ${parent} has CI \`${parentCi}\`, so the culprit is not certain and no revert was made.`,
                    };
                }
                const prs = mergedPrs(commit.commit.message);
                const branch = `revert/${short}`;
                const mainline = commit.parents.length > 1 ? ["-m", "1"] : [];
                const git = (...args) => execFileSync("git", args, { stdio: "inherit" });
                git("config", "user.name", "github-actions[bot]");
                git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
                git("fetch", "origin", "master", sha);
                git("switch", "-c", branch, "origin/master");
                const by = ["git revert", ...mainline, sha].join(" ");
                const manual = `git fetch origin && git switch -c ${branch} origin/master && ${by} && git push -u origin HEAD && gh pr create --title "${revertTitle(sha, prs)}" --label priority:critical --body "Reverts ${sha}."`;
                try {
                    git("revert", ...mainline, "--no-edit", sha);
                    git("push", "origin", `HEAD:refs/heads/${branch}`);
                } catch {
                    return { note: `The revert did not apply or push cleanly. By hand:\n\n    ${manual}` };
                }
                const failedJobs = JSON.stringify(examined?.failed ?? []);
                const body = `${revertBody(sha, run.html_url, prs)}\n\n<!-- master-guard failed jobs: ${failedJobs} -->`;
                const token = process.env.PR_TOKEN || process.env.GITHUB_TOKEN;
                try {
                    const opened = await gh(
                        "/pulls",
                        json("POST", { title: revertTitle(sha, prs), head: branch, base: "master", body }),
                        token,
                    );
                    await gh(`/issues/${opened.number}/labels`, json("POST", { labels: ["priority:critical"] }), token);
                    const ci = process.env.PR_TOKEN
                        ? ""
                        : " It was opened with the workflow token, so its checks do not start by themselves: close and reopen it to start them.";
                    return { note: `Revert: #${opened.number} (branch \`${branch}\`).${ci}` };
                } catch (e) {
                    console.log(`::warning::could not open the revert pull request: ${e.message}`);
                    return {
                        note: `The revert is pushed to \`${branch}\`, but the pull request could not be opened. Open it:\n\n    gh pr create --head ${branch} --title "${revertTitle(sha, prs)}" --label priority:critical --body "Reverts ${sha}."`,
                    };
                }
            });
            const note = revert?.note ?? "No revert was attempted (see the master-guard run).";
            await attempt("open or update the issue", () =>
                fileIssue(gh, {
                    prefix: FREEZE_PREFIX,
                    title,
                    labels: labels("low"),
                    body: [
                        `CI failed on master at ${sha}: ${run.html_url}`,
                        "",
                        ...(outside
                            ? []
                            : [
                                  "The Mergify queue is frozen: nothing merges except pull requests labelled `priority:critical`. The freeze lifts by itself on the next green CI run on master at or after this commit, including a re-run of the failed run.",
                                  "",
                              ]),
                        note,
                        "",
                        "If the failure does not reproduce, follow the flaky-test policy (design/ci/ci-cd-plan.md section 9).",
                    ].join("\n"),
                    comment: `CI also failed on master at ${sha}: ${run.html_url}\n\n${note}`,
                }),
            );
        }
    }

    if (action === "green") {
        await attempt("lift the freeze", async () => {
            for (const f of await ourFreezes()) {
                const red = frozenSha(f.reason);
                const { status } = await gh(`/compare/${red}...${sha}`);
                if (status !== "ahead" && status !== "identical") {
                    console.log(`${sha} does not contain ${red}: freeze ${f.id} stays`);
                    continue;
                }
                await mergify(
                    `/scheduled_freeze/${f.id}`,
                    json("DELETE", { delete_reason: `CI green on ${sha}: ${run.html_url}` }),
                );
                console.log(`freeze ${f.id} for ${red} lifted`);
            }
        });
        await attempt("close reverts no longer needed", () =>
            closeStaleReverts(gh, { sha, url: run.html_url, green: true }),
        );
    }

    if (action === "hardware-red") {
        await attempt("open or update the lane's issue", async () => {
            const file = run.path.split("/").pop();
            const green = await gh(`/actions/workflows/${file}/runs?branch=master&status=success&per_page=1`);
            const last = green.workflow_runs[0]?.head_sha;
            let since = "No earlier green run on master was found.";
            if (last) {
                // ponytail: compare lists at most 250 commits; a lane red that long has bigger problems
                const { commits } = await gh(`/compare/${last}...${sha}`);
                const merges = commits // the pull requests that landed, not the branch merges inside them
                    .filter((c) => mergedPrs(c.commit.message).length)
                    .map((c) => `- ${c.sha.slice(0, 7)} ${c.commit.message.split("\n")[0]}`);
                since = `Merges since its last green run (${last.slice(0, 7)}):\n\n${merges.join("\n") || "- none: the lane went red on a commit it had passed before (a flake, or the hardware)"}`;
            }
            const report = `${run.name} failed on master at ${sha} (${run.event}): ${run.html_url}\n\n${since}`;
            const title = `${run.name} lane red on master`;
            await fileIssue(gh, {
                prefix: title,
                title,
                labels: labels("medium"),
                body: `${report}\n\nThe merge queue is not frozen (a hardware lane never freezes it), but no release goes out until this lane is green again. Bisect the lane between the commits above and fix or revert.`,
                comment: report,
            });
        });
    }

    if (errors.length) {
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
