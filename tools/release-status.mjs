#!/usr/bin/env node
// Announces each release OUTCOME (release.yml) as a comment on one long-lived issue, "Release status"
// (label `release-status`), that @-mentions the people in the repository variable RELEASE_NOTIFY (e.g.
// "@apowers313"). Release runs are started by a GitHub App, a dispatch or a master push, never by the owner, so
// GitHub's own Actions notifications never reach them; an @-mention notifies whatever the watch settings.
//
// Outcomes, one comment each:
//   held            a train attempt failed and the release is held (a restart that fails again too)
//   published       the train landed the release on master and every version is on npm
//   publish-failed  the publish job failed (a re-run of it reports again, success or failure)
//   red             a full run's verdict is red: --what names the lanes, --issue the "Full run red" issue
//   owner-item      a full run failed for a reason no code change fixes (--what says which)
//   nightly         a full run's candidate was promoted: npm `next` holds --tags and nightly.graphty.app serves it
//   nightly-failed  the nightly site job failed after npm `next` moved: --issue names the "Nightly site deploy
//                   failed" issue
//   nightly-held    a full run promoted but versioning or landing failed (--what): nothing moved; --issue names
//                   the "Nightly promotion failed" issue
//   run-ended       a backstop (release-watch.yml): a release run ended badly (--what is its conclusion) and no
//                   failure comment here names that run and attempt -- it never reached its own announce step
// Attempts that do nothing (nothing releasable, a release pending, a hold open) are not outcomes and
// never call this.
//
// Each outcome the issue gets (and only when it gets it, so a run-ended already reported is not sent
// twice) is also pushed to the owner's phone through Pushover, as is one notice the issue does not get:
//   started         a train attempt began testing a releasable candidate; "Release RETRYING" when it is a restart
//                   after a fix (--restart), or a re-run (--attempt > 1, --what says which and why)
// Pushover needs PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY; without them (a fork, a local run) it logs one line and
// sends nothing. A Pushover failure is logged, never fatal.
//
// Usage: node tools/release-status.mjs <outcome> [--sha S] [--run URL] [--attempt N] [--issue N|URL]
//            [--what TEXT] [--tags a@1,b@2] [--restart] [--fix TEXT] [--since ISO-TIME] [--hold ACTION]
// Needs GITHUB_TOKEN (issues: write; run-ended also actions: read) and
// GITHUB_REPOSITORY (started needs neither); RELEASE_NOTIFY is optional. run-ended reads only the comments made
// since --since (the attempt's start).
import { parseArgs } from "node:util";

export const LABEL = "release-status";
export const TITLE = "Release status";
/**
 * Where the owner reviews a held candidate's changed screenshots (CLAUDE.md, "Visual review"). Here, not in
 * channel/nightly.mjs: release.yml's held job checks out this file alone.
 */
export const REVIEW_PAGE =
    "the review page (servherd `visual-review-v3`, `node visual-review/trusted/cli.mjs serve --candidate next`): the tokenized URL its log prints, plus `&target=master`";

/**
 * Whether a green-images run held its commit for the owner's review (the hold step's action, #5052).
 * @param f the outcome's fields; hold is the hold step's action
 * @returns true when it holds a candidate he can review now
 */
const heldForReview = (f) => f.hold === "start" || f.hold === "update";

const ref = (issue) => (/^\d+$/.test(issue ?? "") ? `#${issue}` : issue || 'the "Release held" issue');
const list = (tags) => (tags ?? "").split(",").filter(Boolean).join(", ");

/**
 * The comment for one release outcome.
 * @param outcome - held, published, publish-failed or run-ended
 * @param f - sha, run (URL), attempt, issue, what, tags (comma separated name@version), restart
 * @param notify - who to mention, e.g. "@apowers313" (empty: no mention)
 * @returns the comment's Markdown
 */
export function statusComment(outcome, f, notify = "") {
    const sha = (f.sha ?? "").slice(0, 7);
    const rerun = Number(f.attempt) > 1 ? ` (re-run, attempt ${f.attempt})` : "";
    const restart = f.restart ? " after a restart following a fix" : "";
    let text;
    switch (outcome) {
        case "held":
            text = `**Release held**: ${f.what || "the release train"} failed on ${sha}${restart}${rerun}. Nothing was published. Details: ${ref(f.issue)}.`;
            break;
        case "published":
            text = `**Released**${rerun}: ${list(f.tags) || "every versioned package"} tagged and on npm.`;
            break;
        case "publish-failed":
            text = `**Publish failed**${rerun} on ${sha}: not every version is tagged and on npm. Details: ${ref(f.issue)}. Re-running the failed jobs of the run publishes what is missing.`;
            break;
        case "red":
            // the bisect's own sentence: a lane with no bisect, no green run before, or a failed dispatch says so
            text = `**Full run red**${rerun}: ${f.what || "a lane"} failed on ${sha}. Nothing was published. ${f.bisect || "See the issue for the bisect."} Details: ${ref(f.issue)}.`;
            break;
        case "owner-item":
            text = `**Owner item**${rerun}: the full run on ${sha} failed for a reason no code change fixes: ${f.what || "see the run"}.`;
            break;
        case "green-images":
            // a held green-images candidate waits for the owner's review, and the run ends green: he must hear of it.
            // One that held nothing (another candidate is held) has nothing to review, so it never asks (#5052)
            text = heldForReview(f)
                ? `**Screenshots changed**${rerun}: the full run on ${sha} passed every lane, but ${f.what || "screenshots differ from master's baselines"}, so nightly.graphty.app waits for your review of ${sha}, which is now the held candidate. Review it on ${REVIEW_PAGE}; its Finish opens the pull request that approves them. Or fix forward.\n\nACTION NEEDED: review the changed screenshots of the held candidate ${sha}`
                : `**Screenshots changed**${rerun}: the full run on ${sha} passed every lane, but ${f.what || "screenshots differ from master's baselines"}. It is not held (another candidate is), so there is nothing new to review; nightly.graphty.app does not move.`;
            break;
        case "nightly":
            text = `**Nightly promoted**${rerun}: ${sha} is on nightly.graphty.app${list(f.tags) ? " and npm `next` holds " + list(f.tags) : " (no package changed, so npm `next` did not move)"}.`;
            break;
        case "nightly-failed":
            text = `**Nightly site deploy failed**${rerun} on ${sha}: npm \`next\` and nightly.graphty.app now differ. Details: ${ref(f.issue)}. Re-running the failed jobs of the run retries the deploy.`;
            break;
        case "nightly-held":
            text = `**Nightly promotion failed**${rerun} on ${sha}: ${f.what || "versioning or landing"} did not finish, so nothing reached master, npm \`next\` or nightly.graphty.app. Details: ${ref(f.issue)}. Re-running the failed jobs of the run retries it.`;
            break;
        case "run-ended":
            text = `**Release run ended ${f.what || "badly"}**${rerun} on ${sha}, and no comment here reported a failure for it: it stopped before announcing its outcome. Read the run; re-running its failed jobs retries it.`;
            break;
        default:
            throw new Error(
                `unknown outcome "${outcome}" (held, published, publish-failed, red, owner-item, green-images, nightly, nightly-failed, nightly-held, run-ended)`,
            );
    }
    const mention = notify.trim() ? notify.trim() + " " : "";
    return `${mention}${text}\n\nRun: ${f.run}`;
}

/**
 * Does this comment report a failure of that run attempt? A held, publish-failed or run-ended comment does; a
 * published one does not, as the run can still fail after it (the advisory Coverage job, a later step).
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
        /\*\*(Release held|Publish failed|Release run ended|Full run red|Owner item|Nightly site deploy failed|Nightly promotion failed)\b/.test(
            body,
        )
    );
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

/**
 * When a green-images outcome is old news. The same changed screenshots stay changed on every full run until master's
 * baselines move, so a run that only re-finds them says it once a week. A run that holds its commit for the owner's
 * review (--hold start or update) always says it: that held candidate is what he reviews, and an earlier comment on
 * another commit with the same counts did not tell him it is waiting (#4630).
 * @param f - the outcome's fields: what, hold (the hold step's action: start, update or none)
 * @param now - the time in ms
 * @returns announce's unlessReported, or undefined to always announce
 */
export function screenshotsReported(f, now = Date.now()) {
    if (f.hold === "start" || f.hold === "update") {
        return undefined;
    }
    return {
        since: new Date(now - 7 * 24 * 3_600_000).toISOString(),
        reported: (b) => b.includes("**Screenshots changed**") && b.includes(f.what ?? ""),
    };
}

export const PUSHOVER_URL = "https://api.pushover.net/1/messages.json";

/**
 * The phone notification for one release outcome: a lock-screen title that starts with the state word, one or two
 * short lines, a link, and a priority and sound by kind (failures loud, a release cheerful, progress silent).
 * @param outcome - started, held, published, publish-failed or run-ended
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
    const fail = { priority: 1, sound: "siren" };
    const quiet = { priority: -1, sound: "none" };
    const kinds = {
        started: {
            title: retry ? "Release RETRYING" : "Release STARTED",
            lines: [`${tags || "Release"} on ${sha}`, f.what || retry || "Full suite, T4, Hosts and audit running"],
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
        red: {
            title: "Full run RED",
            lines: [`${f.what || "A lane"} failed on ${sha}`, retry || `Bisecting; see ${ref(f.issue)}`],
            ...fail,
        },
        "owner-item": {
            title: "Full run OWNER ITEM",
            lines: [`${f.what || "A lane"} on ${sha}`, "No code change fixes it"],
            priority: 0,
            sound: "pushover",
        },
        "green-images": {
            title: "Full run SCREENSHOTS CHANGED",
            lines: [
                `${f.what || "Screenshots differ"} (${sha})`,
                heldForReview(f) ? "Nightly waits for your review on the review page" : "Not held: nothing to review",
            ],
            priority: 0,
            sound: "pushover",
        },
        nightly: {
            title: "Nightly PROMOTED",
            lines: [`${sha} on nightly.graphty.app`, tags ? `npm next: ${tags}` : "No package changed", retry],
            priority: 0,
            sound: "cashregister",
        },
        "nightly-failed": {
            title: "Nightly DEPLOY FAILED",
            lines: [`Site deploy failed on ${sha}; see ${ref(f.issue)}`, retry || "Re-run its failed jobs to retry"],
            ...fail,
        },
        "nightly-held": {
            title: "Nightly PROMOTION FAILED",
            lines: [
                `${f.what || "Landing"} failed on ${sha}; see ${ref(f.issue)}`,
                retry || "Re-run its failed jobs to retry",
            ],
            ...fail,
        },
        // the rolling screenshot slices (design/visual-testing/early-capture.md, 4d): told by story-slices.yml's bins
        "rolling-queue": {
            title: "Screenshots CHANGED on master",
            lines: [f.what || "Pictures changed on master", "Review them on the master rolling target"],
            priority: 0,
            sound: "pushover",
        },
        "rolling-slot": {
            title: "Screenshots WAITING for review",
            lines: [f.what || "Pictures wait for review", "Approve them before the slot so nightly can promote"],
            priority: 0,
            sound: "pushover",
        },
        "run-ended": {
            title: "Release RUN ENDED BADLY",
            lines: [`Run ${f.what || "failed"} on ${sha} before announcing`, retry],
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
        url: f.run,
        url_title: f.urlTitle ?? "Open run",
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
            ["sha", "run", "attempt", "issue", "what", "tags", "since", "fix", "bisect", "hold"]
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
    if (positionals[0] === "green-images") {
        unlessReported = screenshotsReported(values);
    }
    const body = statusComment(positionals[0], values, process.env.RELEASE_NOTIFY ?? "");
    const number = await announce({ request, repo, body, unlessReported });
    console.log(number ? `announced on #${number}:\n${body}` : `already reported:\n${body}`);
    if (number) {
        await push(positionals[0], values);
    }
}
