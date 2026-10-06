// Keeps master green (design/ci/ci-cd-plan.md section 12). Run by .github/workflows/master-guard.yml when
// CI or Hosts finishes on master, with the finished run in GITHUB_EVENT_PATH.
//
// - CI red on a master commit: freeze the Mergify queue (pull requests labelled priority:critical still
//   merge, so the fix can land), open a revert of the commit when its parent was green, and open a
//   priority:critical issue -- or, when a red-master issue is already open (one cause, such as an audit advisory,
//   turns several commits red), add the commit to that issue instead.
// - CI green on a commit at or after a frozen red commit: lift that freeze.
// - Hosts red on master (the nightly; a push to master no longer runs Hosts): open (or add to) a
//   priority:critical issue naming the merges since the lane's last green run. A hardware lane never freezes the queue; release.yml already
//   refuses to release a commit whose lanes are not green. The T4 GPU lane (gpu.yml) runs only in the
//   release train, which files its own "Release held" issue, so a GPU run is never this script's business.
//
// Every step is attempted even when an earlier one fails; the run then exits 1 so the failure is seen.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const FREEZE_PREFIX = "Red master: CI failed on ";
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
 * The pull request a merge commit landed.
 * @param message - The commit message ("Merge pull request #12 from ...").
 * @returns The pull request number, or null for another commit.
 */
export function mergedPr(message) {
    const m = /^Merge pull request #(\d+) /.exec(message);
    return m ? Number(m[1]) : null;
}

/**
 * The title of a revert pull request; conventional, so Lint PR Title passes it.
 * @param sha - The reverted commit.
 * @param pr - The pull request it landed, if any.
 * @returns The title.
 */
export function revertTitle(sha, pr) {
    return pr
        ? `revert: pull request #${pr}, master CI red at ${sha.slice(0, 7)}`
        : `revert: ${sha.slice(0, 7)}, master CI red`;
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
        return res.status === 204 ? null : res.json();
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
        await attempt("freeze the merge queue", async () => {
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
                const pr = mergedPr(commit.commit.message);
                const branch = `revert/${short}`;
                const mainline = commit.parents.length > 1 ? ["-m", "1"] : [];
                const git = (...args) => execFileSync("git", args, { stdio: "inherit" });
                git("config", "user.name", "github-actions[bot]");
                git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
                git("fetch", "origin", "master", sha);
                git("switch", "-c", branch, "origin/master");
                const by = ["git revert", ...mainline, sha].join(" ");
                const manual = `git fetch origin && git switch -c ${branch} origin/master && ${by} && git push -u origin HEAD && gh pr create --title "${revertTitle(sha, pr)}" --label priority:critical --body "Reverts ${sha}."`;
                try {
                    git("revert", ...mainline, "--no-edit", sha);
                    git("push", "origin", `HEAD:refs/heads/${branch}`);
                } catch {
                    return { note: `The revert did not apply or push cleanly. By hand:\n\n    ${manual}` };
                }
                const landed = pr ? ` (#${pr})` : "";
                const body = `${sha} turned master's CI red: ${run.html_url}\n\nIts parent was green, so this reverts it. The pull request it landed${landed} re-enters once its author has found the cause.`;
                const token = process.env.PR_TOKEN || process.env.GITHUB_TOKEN;
                try {
                    const opened = await gh(
                        "/pulls",
                        json("POST", { title: revertTitle(sha, pr), head: branch, base: "master", body }),
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
                        note: `The revert is pushed to \`${branch}\`, but the pull request could not be opened. Open it:\n\n    gh pr create --head ${branch} --title "${revertTitle(sha, pr)}" --label priority:critical --body "Reverts ${sha}."`,
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
                        "The Mergify queue is frozen: nothing merges except pull requests labelled `priority:critical`. The freeze lifts by itself on the next green CI run on master at or after this commit, including a re-run of the failed run.",
                        "",
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
                    .filter((c) => mergedPr(c.commit.message))
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
