#!/usr/bin/env node
/**
 * pr-status-broker.mjs -- every open pull request's state and checks, in a local file agents read.
 *
 * Agents polling GitHub one pull request at a time ran the shared account's 5,000-requests-an-hour
 * limit out twice on 2026-10-04. This process asks once a minute, in ONE GraphQL query, for every
 * open pull request's labels, draft and merge state and check runs, and writes the answer to
 * tmp/pr-status/status.json (atomically: a reader never sees half a file). However many agents read
 * it, GitHub sees one query a minute. The query nests labels, commits and check runs under up to 100
 * pull requests, so by GitHub's cost formula it costs about 3 points: about 180 of the 5,000 GraphQL
 * points an hour, more as open pull requests grow. Each answer's cost is logged and kept in the file.
 *
 * Run it under servherd from the main checkout (it needs no port; `gh` must be logged in):
 *   servherd_start({ name: "pr-status-broker", cwd: "<repo>", command: "node tools/pr-status-broker.mjs" })
 * Once, for a look: node tools/pr-status-broker.mjs --once
 *
 * The file: { fetchedAt, rateLimit: { remaining, resetAt, cost }, truncated?, error?, pullRequests:
 * [{ number, title, head, base, draft, mergeable, labels: [...], state, checks: { "<check name>":
 * "<conclusion or status>" }, checksTruncated? }] }. A head commit can carry several check runs of one
 * name (a re-run, or a draft run and the run that started when it was marked ready); `checks` keeps the
 * newest by start time. `truncated` (more than 100 open pull requests) and `checksTruncated` (more than
 * 100 checks) say the list is incomplete. `state` is GitHub's rollup (SUCCESS, FAILURE, PENDING, ...). When a fetch fails
 * the last good list stays and `error` says why; a rate limit waits for its reset.
 */

import { execFile } from "node:child_process";
import { mkdirSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const OUT = "tmp/pr-status/status.json";
const INTERVAL_MS = 60_000;
const RETRY_MS = 10 * 60_000;

const QUERY = `{
  rateLimit { remaining resetAt cost }
  repository(owner: "graphty-org", name: "graphty-monorepo") {
    pullRequests(states: OPEN, first: 100) { pageInfo { hasNextPage } nodes {
      number title headRefName baseRefName isDraft mergeable
      labels(first: 20) { nodes { name } }
      commits(last: 1) { nodes { commit { statusCheckRollup { state
        contexts(first: 100) { pageInfo { hasNextPage }
          nodes { ... on CheckRun { name status conclusion startedAt } } } } } } }
    } }
  }
}`;

/**
 * The file's pull request list from a GraphQL answer.
 * @param data the query's `data`
 * @returns one compact record per open pull request
 */
export function summarize(data) {
    return data.repository.pullRequests.nodes.map((pr) => {
        const rollup = pr.commits.nodes[0]?.commit.statusCheckRollup;
        const checks = {};
        const started = {};
        for (const c of rollup?.contexts.nodes ?? []) {
            // A run not yet started (no startedAt) is a queued one, so it counts as the newest.
            const at = c.startedAt ?? "9999";
            if (c.name && !(started[c.name] > at)) {
                checks[c.name] = c.conclusion ?? c.status;
                started[c.name] = at;
            }
        }
        const record = {
            number: pr.number,
            title: pr.title,
            head: pr.headRefName,
            base: pr.baseRefName,
            draft: pr.isDraft,
            mergeable: pr.mergeable,
            labels: pr.labels.nodes.map((l) => l.name),
            state: rollup?.state ?? null,
            checks,
        };
        if (rollup?.contexts.pageInfo?.hasNextPage) {
            record.checksTruncated = true;
        }
        return record;
    });
}

function write(record) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(`${OUT}.tmp`, `${JSON.stringify(record, null, 1)}\n`);
    renameSync(`${OUT}.tmp`, OUT);
}

/**
 * One fetch and write.
 * @param last the previous record, kept when this fetch fails
 * @returns what was written and when to ask again
 */
async function poll(last) {
    const fetchedAt = new Date().toISOString();
    try {
        const { stdout } = await promisify(execFile)("gh", ["api", "graphql", "-f", `query=${QUERY}`], {
            maxBuffer: 64 * 1024 * 1024,
        });
        const { data } = JSON.parse(stdout);
        const record = { fetchedAt, rateLimit: data.rateLimit, pullRequests: summarize(data) };
        if (data.repository.pullRequests.pageInfo?.hasNextPage) {
            record.truncated = true;
        }
        write(record);
        return { record, waitMs: INTERVAL_MS };
    } catch (err) {
        const message = String(err.stderr || err.message).trim();
        const record = { ...last, error: { at: fetchedAt, message } };
        write(record);
        // A rate limit (403 or "rate limit") waits for the reset when the last answer said when it is.
        const reset = Date.parse(last.rateLimit?.resetAt ?? "");
        const limited = /rate limit|403/i.test(message);
        const waitMs = limited && reset > Date.now() ? reset - Date.now() + 5_000 : RETRY_MS;
        console.error(`${fetchedAt} fetch failed, next try in ${Math.round(waitMs / 60_000)} min: ${message}`);
        return { record, waitMs };
    }
}

async function main() {
    let last = { pullRequests: [] };
    for (;;) {
        const { record, waitMs } = await poll(last);
        last = record;
        if (!record.error) {
            console.log(
                `${record.fetchedAt} ${record.pullRequests.length} open${record.truncated ? " (truncated)" : ""}, ` +
                    `cost ${record.rateLimit.cost}, ${record.rateLimit.remaining} points left`,
            );
        }
        if (process.argv.includes("--once")) {
            process.exitCode = record.error ? 1 : 0;
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
}

// Run only as the entry point, not when a test imports summarize.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
