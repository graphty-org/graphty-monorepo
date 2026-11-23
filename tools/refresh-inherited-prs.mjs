#!/usr/bin/env node
// refresh-inherited-prs.mjs -- brings the pull requests a master break held up to date with master once its issue
// closes (.github/workflows/refresh-inherited-prs.yml; .claude/skills/pipeline-round/shared.md "Inherited failures").
//
//   node tools/refresh-inherited-prs.mjs        (reads the closed issue from GITHUB_EVENT_PATH)
//
// A pull request run tests the merge of its head with master as master was at its push, so one red on a master
// break stays red after the break's fix lands, and a re-run keeps the stale merge commit. When an issue titled as a
// master break (`Red master: ...`, `Full run red: ...`, `Failing on master ...`, `Flaky test: ...`,
// `Flaky test quarantined: ...`, `... lane red on master`) closes as completed, this reads every open pull request
// with one GraphQL query and, for each whose newest commit has a failed check annotated on a test file the issue
// names (run-group.mjs annotates each [FAIL] and [NEW-FLAKY] test's file), asks GitHub to merge master into it
// (PUT pulls/<n>/update-branch), which starts its checks on the new merge. Only those: a pull request red for a
// reason of its own is left alone (CI load: master is merged into an open pull request only on conflict or for
// an inherited break). Never fails the job: a pull request that cannot be updated is a warning.
// Needs GH_TOKEN that may push to the pull requests' branches; a GITHUB_TOKEN push would start no checks.

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const MASTER_BREAK =
    /(^(?:Red master:|Full run red:|Failing on master\b|Flaky test(?: quarantined)?:))|(\blane red on master\b)/i;
// a test file: one path-like token of an issue's text (split first, so the match never backtracks)
const TEST_FILE = /^[\w@.-]+(?:\/[\w@.-]+)*\.(?:test|spec|stories)\.[cm]?[jt]sx?$/;

/**
 * The test files an issue names, in its title and body.
 * @param issue `{ title, body }`
 * @returns file paths, distinct
 */
export function filesOf(issue) {
    const tokens = `${issue.title ?? ""}\n${issue.body ?? ""}`.split(/[^\w@./-]+/);
    return [...new Set(tokens.filter((t) => TEST_FILE.test(t)))];
}

// GitHub Actions' app id: its check suites are the CI runs
const QUERY = `query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    pullRequests(states: OPEN, first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { number headRefOid commits(last: 1) { nodes { commit { checkSuites(first: 5, filterBy: { appId: 15368 }) {
        nodes { checkRuns(first: 20, filterBy: { conclusions: [FAILURE] }) { nodes { annotations(first: 20) { nodes { path } } } } }
      } } } } }
    }
  }
}`;

/**
 * The open pull requests whose newest commit failed a check annotated on one of the files.
 * @param data the GraphQL answer
 * @param files test file paths
 * @returns `{ number, head }`
 */
export function heldBy(data, files) {
    const wanted = new Set(files);
    const out = [];
    for (const pr of data?.data?.repository?.pullRequests?.nodes ?? []) {
        const suites = (pr.commits?.nodes ?? []).flatMap((c) => c.commit?.checkSuites?.nodes ?? []);
        const runs = suites.flatMap((s) => s.checkRuns?.nodes ?? []);
        const paths = runs.flatMap((r) => r.annotations?.nodes ?? []).map((a) => a.path);
        if (paths.some((p) => wanted.has(p))) out.push({ number: pr.number, head: pr.headRefOid });
    }
    return out;
}

/**
 * Updates the pull requests the closed issue's break held.
 * @param issue the closed issue (`number`, `title`, `body`, `state_reason`)
 * @param gh `(args) => stdout`, the GitHub CLI
 * @param repo `owner/name`
 * @returns the pull request numbers updated
 */
export function refresh(issue, gh, repo) {
    if (!MASTER_BREAK.test(issue.title ?? "") || issue.state_reason === "not_planned") {
        console.log(`#${issue.number} is not a fixed master break: nothing to refresh`);
        return [];
    }
    const files = filesOf(issue);
    if (files.length === 0) {
        console.log(`#${issue.number} names no test file: nothing to refresh`);
        return [];
    }
    const [owner, name] = repo.split("/");
    const data = JSON.parse(
        gh(["api", "graphql", "-F", `owner=${owner}`, "-F", `name=${name}`, "-f", `query=${QUERY}`]),
    );
    const updated = [];
    for (const pr of heldBy(data, files)) {
        try {
            gh([
                "api",
                "-X",
                "PUT",
                `repos/${repo}/pulls/${pr.number}/update-branch`,
                "-f",
                `expected_head_sha=${pr.head}`,
            ]);
            updated.push(pr.number);
            console.log(`#${pr.number}: master merged in; its checks run on the fix of #${issue.number}`);
        } catch (e) {
            console.log(`::warning::#${pr.number} not brought up to date (${e.message.split("\n")[0]})`);
        }
    }
    console.log(`${updated.length} pull request(s) held by #${issue.number} (${files.join(", ")}) brought up to date`);
    return updated;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const { issue } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
    const gh = (args) => execFileSync("gh", args, { encoding: "utf8" });
    try {
        refresh(issue, gh, process.env.GITHUB_REPOSITORY);
    } catch (e) {
        console.log(`::warning::no pull request refreshed (${e.message.split("\n")[0]})`);
    }
}
