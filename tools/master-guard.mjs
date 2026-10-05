// Keeps master green (design/ci/ci-cd-plan.md section 12). Run by .github/workflows/master-guard.yml when
// CI, GPU or Hosts finishes on master, with the finished run in GITHUB_EVENT_PATH.
//
// - CI red on a master commit: freeze the Mergify queue (pull requests labelled priority:critical still
//   merge, so the fix can land), open a revert of the commit when its parent was green (a batch merge's
//   revert takes out the whole batch, and its title lists the pull requests), and open a
//   priority:critical issue.
// - CI green on a commit at or after a frozen red commit: lift that freeze.
// - GPU or Hosts red on master (a push or the nightly): open (or add to) a priority:critical issue naming
//   the merges since the lane's last green run. A hardware lane never freezes the queue; release.yml already
//   refuses to release a commit whose lanes are not green.
//
// Every step is attempted even when an earlier one fails; the run then exits 1 so the failure is seen.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const FREEZE_PREFIX = "Red master: CI failed on ";
const MERGIFY = "https://api.mergify.com/v1";

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
    if ((run.name === "GPU" || run.name === "Hosts") && failed && ["push", "schedule"].includes(run.event)) {
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
    const json = (method, body) => ({ method, body: JSON.stringify(body) });
    const ourFreezes = async () =>
        (await mergify("/scheduled_freeze")).scheduled_freezes.filter((f) => frozenSha(f.reason));
    // The newest open issue with exactly this title, so a re-run never opens a second one.
    const openIssue = async (title) => {
        const q = encodeURIComponent(`repo:${repo} is:issue is:open in:title "${title}"`);
        const res = await call("https://api.github.com", process.env.GITHUB_TOKEN, `/search/issues?q=${q}`);
        return res.items.find((i) => i.title === title);
    };
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

        const title = `Red master: CI failed on ${short}`;
        if (await attempt("look for an existing issue", () => openIssue(title))) {
            console.log("issue already open");
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
                const list = prs.map((n) => `#${n}`).join(", ");
                // A batch merge is one commit, so its revert takes out every pull request in the batch: the
                // queue tested them only together, and the culprit is not known yet.
                const landed =
                    prs.length > 1
                        ? `It landed a batch of ${prs.length} pull requests (${list}); the revert takes out all of them. Each re-enters the queue once its author has checked it against the failure.`
                        : `The pull request it landed${prs.length ? ` (${list})` : ""} re-enters once its author has found the cause.`;
                const body = `${sha} turned master's CI red: ${run.html_url}\n\nIts parent was green, so this reverts it. ${landed}`;
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
            await attempt("open the issue", () =>
                gh(
                    "/issues",
                    json("POST", {
                        title,
                        labels: labels("low"),
                        body: [
                            `CI failed on master at ${sha}: ${run.html_url}`,
                            "",
                            "The Mergify queue is frozen: nothing merges except pull requests labelled `priority:critical`. The freeze lifts by itself on the next green CI run on master at or after this commit, including a re-run of the failed run.",
                            "",
                            revert?.note ?? "No revert was attempted (see the master-guard run).",
                            "",
                            "If the failure does not reproduce, follow the flaky-test policy (design/ci/ci-cd-plan.md section 9).",
                        ].join("\n"),
                    }),
                ),
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
                    .filter((c) => mergedPrs(c.commit.message).length)
                    .map((c) => `- ${c.sha.slice(0, 7)} ${c.commit.message.split("\n")[0]}`);
                since = `Merges since its last green run (${last.slice(0, 7)}):\n\n${merges.join("\n") || "- none: the lane went red on a commit it had passed before (a flake, or the hardware)"}`;
            }
            const report = `${run.name} failed on master at ${sha} (${run.event}): ${run.html_url}\n\n${since}`;
            const title = `${run.name} lane red on master`;
            const existing = await openIssue(title);
            if (existing) {
                await gh(`/issues/${existing.number}/comments`, json("POST", { body: report }));
                return console.log(`added to #${existing.number}`);
            }
            await gh(
                "/issues",
                json("POST", {
                    title,
                    labels: labels("medium"),
                    body: `${report}\n\nThe merge queue is not frozen (a hardware lane never freezes it), but no release goes out until this lane is green again. Bisect the lane between the commits above and fix or revert.`,
                }),
            );
        });
    }

    if (errors.length) {
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
