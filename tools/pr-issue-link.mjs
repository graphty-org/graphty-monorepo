#!/usr/bin/env node
/**
 * Checks that a pull request's description names its issue, or says it has none. Run by
 * .github/workflows/pr-issue-link.yml (the "Link PR Issue" check). It reads the description from the
 * event file GitHub writes (GITHUB_EVENT_PATH), never from an environment variable: the golden pull
 * request's description lists every landed branch and grew past Linux's 128 KiB limit on one
 * variable, and the runner could not start the step at all ("Argument list too long",
 * run 40001752947). PR_BODY, when set, takes its place (the tests).
 *
 * A description passes when it holds a closing keyword (`Fixes #12`, `Closed: #12`,
 * `resolves owner/repo#12`), an explicit reference (`Refs #12`, `Ref: #12`, `Part of #12`), or a
 * line that is only `No issue`. The references are the forms githerd counts (`explicitRefs` in
 * githerd/lib/merged.mjs), so the check and githerd agree on what a link is. A bare `#12` in prose
 * names an issue without claiming any work on it, and does not pass.
 *
 * Dependabot's pull requests pass without a link: githerd already handles them. Mergify's
 * merge-queue drafts never reach the script: the workflow skips that job, as pr-title.yml does.
 *
 * Usage: PR_AUTHOR=... node tools/pr-issue-link.mjs   (in Actions; or PR_BODY=... locally)
 * (exit 1 with what to add)
 */
import { readFileSync } from "node:fs";
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
 * The pull request description to check.
 * @param env - the environment: PR_BODY, else the pull request event at GITHUB_EVENT_PATH
 * @returns the description; undefined when there is none
 */
export function bodyFrom(env) {
    if (env.PR_BODY !== undefined) return env.PR_BODY;
    if (!env.GITHUB_EVENT_PATH) return undefined;
    return JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8")).pull_request?.body ?? undefined;
}

/**
 * Why a pull request needs no issue link, when it does not.
 * @param pr - the pull request
 * @param pr.author - its author's login
 * @returns the reason it is skipped; null when it must name its issue
 */
export function skipReason({ author }) {
    if (author === "dependabot[bot]") return "a Dependabot pull request";
    return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const env = process.env;
    const skip = skipReason({ author: env.PR_AUTHOR });
    if (skip) {
        console.log(`Skipped: ${skip} needs no issue link.`);
        process.exit(0);
    }
    if (!linksIssue(bodyFrom(env))) {
        console.error(`::error title=Link PR Issue::${MESSAGE}`);
        process.exit(1);
    }
    console.log("The pull request description names its issue (or says No issue).");
}
