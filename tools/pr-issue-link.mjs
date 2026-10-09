#!/usr/bin/env node
/**
 * Checks that a pull request's description names its issue, or says it has none. Run by
 * .github/workflows/pr-issue-link.yml (the "Link PR Issue" check) with the description in PR_BODY.
 *
 * A description passes when it holds a closing keyword (`Fixes #12`, `Closed: #12`,
 * `resolves owner/repo#12`), an explicit reference (`Refs #12`, `Ref: #12`, `Part of #12`), or a
 * line that is only `No issue`. The references are the forms githerd counts (`explicitRefs` in
 * githerd/lib/merged.mjs), so the check and githerd agree on what a link is. A bare `#12` in prose
 * names an issue without claiming any work on it, and does not pass.
 *
 * Pull requests githerd already handles pass without a link: the release train's (branch
 * `release/train-*`, opened by github-actions[bot] in this repository) and Dependabot's. Mergify's
 * merge-queue drafts never reach the script: the workflow skips that job, as pr-title.yml does.
 *
 * Usage: PR_BODY=... HEAD_REF=... PR_AUTHOR=... SAME_REPO=true|false node tools/pr-issue-link.mjs
 * (exit 1 with what to add)
 */
import { fileURLToPath } from "node:url";

const KEYWORDS = new Set([
    "close",
    "closes",
    "closed",
    "fix",
    "fixes",
    "fixed",
    "resolve",
    "resolves",
    "resolved",
    "ref",
    "refs",
    "part of",
]);
const EXPLICIT = /\b([a-z]+(?:\s+of)?):?\s+(?:[\w.-]+\/[\w.-]+)?#(\d+)\b/gi;
const NO_ISSUE = /^[ \t]*no issue[ \t]*\r?$/im;

export const MESSAGE =
    "The pull request description names no issue. Add 'Fixes #123' (or Closes/Resolves), " +
    "'Refs #123' (or 'Part of #123'), or a line 'No issue' to the pull request description.";

/**
 * Whether a pull request description names its issue or says it has none.
 * @param body - the description; undefined or empty when there is none
 * @returns true when it links an issue or has a `No issue` line
 */
export function linksIssue(body = "") {
    if (NO_ISSUE.test(body)) return true;
    return [...body.matchAll(EXPLICIT)].some((m) => KEYWORDS.has(m[1].toLowerCase().replace(/\s+/, " ")));
}

/**
 * Why a pull request needs no issue link, when it does not.
 * @param pr - the pull request
 * @param pr.headRef - its head branch
 * @param pr.author - its author's login
 * @param pr.sameRepo - whether its head branch is in this repository
 * @returns the reason it is skipped; null when it must name its issue
 */
export function skipReason({ headRef, author, sameRepo }) {
    if (author === "dependabot[bot]") return "a Dependabot pull request";
    if (sameRepo && author === "github-actions[bot]" && headRef?.startsWith("release/train-")) {
        return "the release train's pull request";
    }
    return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const env = process.env;
    const skip = skipReason({ headRef: env.HEAD_REF, author: env.PR_AUTHOR, sameRepo: env.SAME_REPO === "true" });
    if (skip) {
        console.log(`Skipped: ${skip} needs no issue link.`);
        process.exit(0);
    }
    if (!linksIssue(env.PR_BODY)) {
        console.error(`::error title=Link PR Issue::${MESSAGE}`);
        process.exit(1);
    }
    console.log("The pull request description names its issue (or says No issue).");
}
