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
// Attempts that do nothing (nothing releasable, a release pending, a hold open) are not outcomes and
// never call this.
//
// Usage: node tools/release-status.mjs <outcome> [--sha S] [--run URL] [--attempt N] [--issue N|URL]
//            [--pr URL] [--what TEXT] [--tags a@1,b@2] [--restart]
// Needs GITHUB_TOKEN (issues: write) and GITHUB_REPOSITORY; RELEASE_NOTIFY is optional.
import { parseArgs } from "node:util";

export const LABEL = "release-status";
export const TITLE = "Release status";

const ref = (issue) => (/^\d+$/.test(issue ?? "") ? `#${issue}` : issue || 'the "Release held" issue');
const list = (tags) => (tags ?? "").split(",").filter(Boolean).join(", ");

/**
 * The comment for one release outcome.
 * @param outcome - opened, held, published or publish-failed
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
        default:
            throw new Error(`unknown outcome "${outcome}" (opened, held, published, publish-failed)`);
    }
    const mention = notify.trim() ? notify.trim() + " " : "";
    return `${mention}${text}\n\nRun: ${f.run}`;
}

/**
 * Post one outcome on the "Release status" issue, opening the issue (and its label) on first use.
 * @param opts - what to post where
 * @param opts.request - (method, path, body) => parsed JSON; throws on an HTTP error
 * @param opts.repo - owner/name
 * @param opts.body - the comment
 * @returns the issue number
 */
export async function announce({ request, repo, body }) {
    const [found] = await request("GET", `/repos/${repo}/issues?labels=${LABEL}&state=open&per_page=1`);
    let number = found?.number;
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

if (import.meta.url === `file://${process.argv[1]}`) {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: Object.fromEntries(
            ["sha", "run", "attempt", "issue", "pr", "what", "tags"]
                .map((k) => [k, { type: "string" }])
                .concat([["restart", { type: "boolean" }]]),
        ),
    });
    const body = statusComment(positionals[0], values, process.env.RELEASE_NOTIFY ?? "");
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
    const number = await announce({ request, repo: process.env.GITHUB_REPOSITORY, body });
    console.log(`announced on #${number}:\n${body}`);
}
