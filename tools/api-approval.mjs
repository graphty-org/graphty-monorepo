#!/usr/bin/env node
/**
 * Fails a pull request that changes a committed API report (<package>/api/*.api.md) unless it
 * carries the `api-approved` label. Only the owner applies that label; agents never apply or
 * remove it (CLAUDE.md, "Public API review").
 *
 * The labels and the changed files are read from the GitHub API at run time, not from the event
 * that started the run, so a re-run sees the labels as they are now. ci.yml runs on `labeled`
 * and `unlabeled`, so adding or removing the label re-runs this check.
 *
 * Usage (in CI): GH_TOKEN=... GITHUB_REPOSITORY=owner/repo PR=<number> node tools/api-approval.mjs
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const LABEL = "api-approved";

/**
 * Whether a pull request may merge as far as its public API is concerned.
 * @param files - the paths the pull request changes
 * @param labels - the pull request's label names
 * @returns ok, and the line to print
 */
export function decide(files, labels) {
    const reports = files.filter((f) => /^[^/]+\/api\/[^/]+\.api\.md$/.test(f));
    if (reports.length === 0) {
        return { ok: true, message: "no committed API report changed" };
    }
    if (labels.includes(LABEL)) {
        return { ok: true, message: `the public API change is approved (${LABEL}): ${reports.join(", ")}` };
    }
    return {
        ok: false,
        message:
            `this pull request changes the public API (${reports.join(", ")}); it merges only after ` +
            `the owner reviews the report diff and adds the ${LABEL} label`,
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { GITHUB_REPOSITORY: repo, PR: pr } = process.env;
    const api = (path, jq) =>
        execFileSync("gh", ["api", "--paginate", path, "--jq", jq], { encoding: "utf8" }).split("\n").filter(Boolean);
    const { ok, message } = decide(
        api(`repos/${repo}/pulls/${pr}/files?per_page=100`, ".[].filename"),
        api(`repos/${repo}/issues/${pr}/labels?per_page=100`, ".[].name"),
    );
    console.log(ok ? message : `::error::${message}`);
    process.exit(ok ? 0 : 1);
}
