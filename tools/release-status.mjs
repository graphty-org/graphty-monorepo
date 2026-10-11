#!/usr/bin/env node
// Announces each release OUTCOME (release.yml) as a comment on one long-lived issue, "Release status"
// (label `release-status`), that @-mentions the people in the repository variable RELEASE_NOTIFY (e.g.
// "@apowers313"). Release runs are started by a GitHub App, a dispatch or a merge, never by the owner, so
// GitHub's own Actions notifications never reach them; an @-mention notifies whatever the watch settings.
//
// Outcomes, one comment each:
//   opened          the train passed and opened the release pull request (publishes when it merges)
//   held            a train attempt failed and the release is held (a restart that fails again too)
//   published       the publish job tagged every package and every version is on npm
//   publish-failed  the publish job failed (a re-run of it reports again, success or failure)
//   run-ended       a backstop (release-watch.yml): a release run ended badly (--what is its conclusion) and no
//                   failure comment here names that run and attempt -- it never reached its own announce step
//   dequeued        the release pull request (--pr URL, head --sha) left the merge queue without merging
//                   (release-dequeued.yml): the reason, the failing checks and the queue run come from the
//                   "Mergify Merge Queue" check run on its head, once per dequeue
// Attempts that do nothing (nothing releasable, a release pending, a hold open) are not outcomes and
// never call this.
//
// Each outcome the issue gets (and only when it gets it, so a run-ended or dequeued already reported is not sent
// twice) is also pushed to the owner's phone through Pushover, as is one notice the issue does not get:
//   started         a train attempt began testing a releasable candidate; "Release RETRYING" when it is a restart
//                   after a fix (--restart), or a re-run (--attempt > 1, --what says which and why)
// Pushover needs PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY; without them (a fork, a local run) it logs one line and
// sends nothing. A Pushover failure is logged, never fatal.
//
// Usage: node tools/release-status.mjs <outcome> [--sha S] [--run URL] [--attempt N] [--issue N|URL]
//            [--pr URL] [--what TEXT] [--tags a@1,b@2] [--restart] [--fix TEXT] [--since ISO-TIME]
// Needs GITHUB_TOKEN (issues: write; run-ended also actions: read, dequeued also checks: read) and
// GITHUB_REPOSITORY (started needs neither); RELEASE_NOTIFY is optional. run-ended reads only the comments made
// since --since (the attempt's start).
import { parseArgs } from "node:util";

export const LABEL = "release-status";
export const TITLE = "Release status";

const ref = (issue) => (/^\d+$/.test(issue ?? "") ? `#${issue}` : issue || 'the "Release held" issue');
const list = (tags) => (tags ?? "").split(",").filter(Boolean).join(", ");

/**
 * The comment for one release outcome.
 * @param outcome - opened, held, published, publish-failed or run-ended
 * @param f - sha, run (URL), attempt, issue, pr, what, tags (comma separated name@version), restart
 * @param notify - who to mention, e.g. "@apowers313" (empty: no mention)
 * @returns the comment's Markdown
 */
export function statusComment(outcome, f, notify = "") {
    const sha = (f.sha ?? "").slice(0, 7);
    const rerun = Number(f.attempt) > 1 ? ` (re-run, attempt ${f.attempt})` : "";
    const restart = f.restart ? " after a restart following a fix" : "";
    let text;
    switch (outcome) {
        case "opened":
            text = `**Release train passed** on ${sha}${restart}${rerun}: release pull request ${f.pr} is open for ${list(f.tags) || "the versioned packages"}. It publishes when Mergify merges it; a second comment here says whether that worked.`;
            break;
        case "held":
            text = `**Release held**: ${f.what || "the release train"} failed on ${sha}${restart}${rerun}. Nothing was published. Details: ${ref(f.issue)}.`;
            break;
        case "published":
            text = `**Released**${rerun}: ${list(f.tags) || "every versioned package"} tagged and on npm.`;
            break;
        case "publish-failed":
            text = `**Publish failed**${rerun} on ${sha}: not every version is tagged and on npm. Details: ${ref(f.issue)}. Re-running the failed jobs of the run publishes what is missing.`;
            break;
        case "run-ended":
            text = `**Release run ended ${f.what || "badly"}**${rerun} on ${sha}, and no comment here reported a failure for it: it stopped before announcing its outcome. Read the run; re-running its failed jobs retries it.`;
            break;
        case "dequeued":
            text = `**Release pull request dequeued**: ${dequeueKey(f.pr, f.left)} without merging (${f.what || "no reason given"}), on ${sha}. Nothing was published. Failing checks: ${f.checks || "none named"}. Queue run: ${f.queue || "see the pull request's Mergify Merge Queue check"}. The next train attempt closes it and cuts a new one from master's newest commit.`;
            break;
        default:
            throw new Error(
                `unknown outcome "${outcome}" (opened, held, published, publish-failed, run-ended, dequeued)`,
            );
    }
    const mention = notify.trim() ? notify.trim() + " " : "";
    return `${mention}${text}\n\nRun: ${f.run}`;
}

/**
 * Does this comment report a failure of that run attempt? A held, publish-failed or run-ended comment does; an
 * opened or published one does not, as the run can still fail after it (the advisory Coverage job, a later step).
 * @param body - a comment on the Release status issue
 * @param run - the run's URL
 * @param attempt - the run attempt
 * @returns true when the comment already told the owner this attempt failed
 */
export function reportsFailure(body, run, attempt) {
    const n = /\(re-run, attempt (\d+)\)/.exec(body)?.[1] ?? "1";
    return (
        body.trimEnd().endsWith(`Run: ${run}`) &&
        n === String(attempt || 1) &&
        /\*\*(Release held|Publish failed|Release run ended)\b/.test(body)
    );
}

/**
 * The words that identify one dequeue of one pull request in its comment, so a re-run never posts it twice.
 * @param pr - the pull request's URL
 * @param left - when it left the queue (the check run's completed_at)
 * @returns the key
 */
export const dequeueKey = (pr, left) => `${pr} left the merge queue at ${left || "an unknown time"}`;

/**
 * The facts of a dequeue, from the "Mergify Merge Queue" check run on the pull request's head. Its title is the
 * reason ("Dequeued -- checks failed"); its summary lists the failing checks (`- X [`Name`](url)`) and the draft
 * the queue checked the batch on ("on draft #1841"). Mergify posts no pull request comments here.
 * @param run - the check run (REST shape: title or output.title, output.summary, completed_at, details_url)
 * @param repo - owner/name
 * @returns what (the reason), checks, queue (a link) and left (a time)
 */
export function dequeueFacts(run, repo) {
    const summary = run?.output?.summary ?? "";
    const failing = summary.split(/\nFailing checks:\n/)[1] ?? "";
    const checks = [...failing.matchAll(/^- \S+ \[`([^`]+)`\]\(([^)]+)\)/gm)].map(
        ([, name, url]) => `${name} (${url})`,
    );
    const draft = /on draft #(\d+)/.exec(summary)?.[1];
    return {
        what: (run?.output?.title ?? "").replaceAll("\u2014", "--"),
        checks: checks.join(", "),
        queue: draft ? `https://github.com/${repo}/pull/${draft}` : (run?.details_url ?? ""),
        left: run?.completed_at ?? "",
    };
}

/**
 * Was this run cancelled before any of its jobs started? That is a pending run the release-train concurrency
 * group replaced with a newer one (cancel-in-progress is off, but GitHub keeps one pending run per group): not
 * news. A run a person cancelled after it started has jobs.
 * @param opts - the run
 * @param opts.request - (method, path, body) => parsed JSON
 * @param opts.repo - owner/name
 * @param opts.run - the run's URL
 * @param opts.attempt - the run attempt
 * @param opts.conclusion - the run's conclusion
 * @returns true when there is nothing to announce
 */
export async function replacedWhilePending({ request, repo, run, attempt, conclusion }) {
    if (conclusion !== "cancelled") {
        return false;
    }
    const id = /\/runs\/(\d+)/.exec(run ?? "")?.[1];
    const jobs = await request("GET", `/repos/${repo}/actions/runs/${id}/attempts/${attempt || 1}/jobs?per_page=1`);
    return jobs.total_count === 0;
}

/**
 * Post one outcome on the "Release status" issue, opening the issue (and its label) on first use.
 * @param opts - what to post where
 * @param opts.request - (method, path, body) => parsed JSON; throws on an HTTP error
 * @param opts.repo - owner/name
 * @param opts.body - the comment
 * @param opts.unlessReported - { since, reported(body) }: post nothing when a comment since `since` is one
 *   `reported` says already tells this news
 * @returns the issue number, or null when nothing was posted
 */
export async function announce({ request, repo, body, unlessReported }) {
    const [found] = await request("GET", `/repos/${repo}/issues?labels=${LABEL}&state=open&per_page=1`);
    let number = found?.number;
    if (number && unlessReported) {
        const { since, reported } = unlessReported;
        const query = since ? `since=${encodeURIComponent(since)}&per_page=100` : "per_page=100";
        const comments = await request("GET", `/repos/${repo}/issues/${number}/comments?${query}`);
        if (comments.some((c) => reported(c.body ?? ""))) {
            return null;
        }
    }
    if (!number) {
        await request("POST", `/repos/${repo}/labels`, { name: LABEL, color: "0e8a16" }).catch(() => {}); // exists already
        const opened = await request("POST", `/repos/${repo}/issues`, {
            title: TITLE,
            labels: [LABEL],
            body: "Every release outcome (released, held, publish failed) is announced here by release.yml (tools/release-status.mjs), mentioning the people in the RELEASE_NOTIFY repository variable. Keep this issue open.",
        });
        number = opened.number;
    }
    await request("POST", `/repos/${repo}/issues/${number}/comments`, { body });
    return number;
}

export const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";

/**
 * The phone notification for one release outcome: a lock-screen title that starts with the state word, one or two
 * short lines, a link, and a priority and sound by kind (failures loud, a release cheerful, progress silent).
 * @param outcome - started, opened, held, published, publish-failed, run-ended or dequeued
 * @param f - the same fields as statusComment, plus fix (the subject of the commit a restart tests)
 * @returns Pushover's title, message, url, url_title, priority and sound
 */
export function pushMessage(outcome, f) {
    const sha = (f.sha ?? "").slice(0, 7);
    const attempt = Number(f.attempt) || 1;
    const fix = (f.fix ?? "").match(/#\d+/g)?.join(", ") || "on master";
    const heldIssue = /^\d+$/.test(f.issue ?? "") ? " (held #" + f.issue + ")" : "";
    let retry = "";
    if (f.restart) {
        retry = `Restart after fix ${fix}${heldIssue}`;
    } else if (attempt > 1) {
        retry = `Re-run ${attempt}`;
    }
    const tags = list(f.tags);
    const pr = `PR #${(f.pr ?? "").split("/").pop()}`;
    const fail = { priority: 1, sound: "siren" };
    const quiet = { priority: -1, sound: "none" };
    const kinds = {
        started: {
            title: retry ? "Release RETRYING" : "Release STARTED",
            lines: [`${tags || "Release"} on ${sha}`, f.what || retry || "Full suite, T4, Hosts and audit running"],
            ...quiet,
        },
        opened: {
            title: "Release PR OPENED",
            lines: [
                `${pr}: ${tags || "versioned packages"}`,
                ["Publishes when it merges", retry].filter(Boolean).join("; "),
            ],
            link: "pr",
            ...quiet,
        },
        held: {
            title: "Release HELD",
            lines: [`${f.what || "Release train"} failed on ${sha}`, retry || `Nothing published; see ${ref(f.issue)}`],
            ...fail,
        },
        published: {
            title: "Release PUBLISHED",
            lines: [tags || "Every versioned package", retry],
            priority: 0,
            sound: "cashregister",
        },
        "publish-failed": {
            title: "Release PUBLISH FAILED",
            lines: [
                `Not all versions on npm (${sha}); see ${ref(f.issue)}`,
                retry || "Re-run its failed jobs to retry",
            ],
            ...fail,
        },
        "run-ended": {
            title: "Release RUN ENDED BADLY",
            lines: [`Run ${f.what || "failed"} on ${sha} before announcing`, retry],
            ...fail,
        },
        dequeued: {
            title: "Release DROPPED FROM QUEUE",
            lines: [
                `${pr}: ${f.what || "no reason given"}`,
                f.checks ? `Failing: ${f.checks.replaceAll(/ \([^)]*\)/g, "")}` : "",
            ],
            link: "pr",
            ...fail,
        },
    };
    const k = kinds[outcome];
    if (!k) {
        throw new Error(`unknown outcome "${outcome}"`);
    }
    return {
        title: k.title,
        message: k.lines.filter(Boolean).join("\n").slice(0, 1024),
        url: k.link === "pr" ? f.pr : f.run,
        url_title: k.link === "pr" ? "Open PR" : "Open run",
        priority: String(k.priority),
        sound: k.sound,
    };
}

/**
 * Send one outcome to the owner's phone. Never throws: a Pushover outage must not fail a release job.
 * @param outcome - as pushMessage
 * @param f - as pushMessage
 * @param env - holds PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY (absent: logs one line, sends nothing)
 * @param post - fetch
 * @param log - console.log
 * @returns true when Pushover accepted it
 */
export async function push(outcome, f, env = process.env, post = fetch, log = console.log) {
    const { PUSHOVER_APP_TOKEN: token, PUSHOVER_USER_KEY: user } = env;
    if (!token || !user) {
        log("Pushover: PUSHOVER_APP_TOKEN or PUSHOVER_USER_KEY not set, no phone notification");
        return false;
    }
    const hide = (text) => String(text).replaceAll(token, "***").replaceAll(user, "***");
    try {
        const m = pushMessage(outcome, f);
        const res = await post(PUSHOVER_URL, { method: "POST", body: new URLSearchParams({ token, user, ...m }) });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${await res.text()}`);
        }
        log(`Pushover: sent "${m.title}"`);
        return true;
    } catch (e) {
        log(`::warning::Pushover notification not sent: ${hide(e?.message ?? e)}`);
        return false;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: Object.fromEntries(
            ["sha", "run", "attempt", "issue", "pr", "what", "tags", "since", "fix"]
                .map((k) => [k, { type: "string" }])
                .concat([["restart", { type: "boolean" }]]),
        ),
    });
    const request = async (method, path, data) => {
        const res = await fetch(`https://api.github.com${path}`, {
            method,
            headers: {
                authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                accept: "application/vnd.github+json",
                "content-type": "application/json",
            },
            body: data && JSON.stringify(data),
        });
        if (!res.ok) {
            throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
        }
        return res.json();
    };
    const repo = process.env.GITHUB_REPOSITORY;
    if (positionals[0] === "started") {
        // phone only: the issue logs outcomes, not attempts
        await push("started", values);
        process.exit(0);
    }
    let unlessReported;
    if (positionals[0] === "run-ended") {
        if (
            await replacedWhilePending({
                request,
                repo,
                run: values.run,
                attempt: values.attempt,
                conclusion: values.what,
            })
        ) {
            console.log(`${values.run} was cancelled before any job started (replaced in the concurrency queue)`);
            process.exit(0);
        }
        unlessReported = {
            since: values.since,
            reported: (b) => reportsFailure(b, values.run, values.attempt),
        };
    }
    if (positionals[0] === "dequeued") {
        // Mergify labels the pull request as it finishes the check run; wait up to 2 minutes for the final state
        const path = `/repos/${repo}/commits/${values.sha}/check-runs?check_name=${encodeURIComponent("Mergify Merge Queue")}&filter=latest`;
        let run;
        for (let i = 0; i < 12; i++) {
            [run] = (await request("GET", path)).check_runs;
            if (run?.status === "completed" && /^Dequeued/.test(run.output?.title ?? "")) {
                break;
            }
            await new Promise((r) => setTimeout(r, 10_000));
        }
        Object.assign(values, dequeueFacts(run, repo));
        const key = dequeueKey(values.pr, values.left);
        unlessReported = { since: run?.started_at, reported: (b) => b.includes(key) };
    }
    const body = statusComment(positionals[0], values, process.env.RELEASE_NOTIFY ?? "");
    const number = await announce({ request, repo, body, unlessReported });
    console.log(number ? `announced on #${number}:\n${body}` : `already reported:\n${body}`);
    if (number) {
        await push(positionals[0], values);
    }
}
