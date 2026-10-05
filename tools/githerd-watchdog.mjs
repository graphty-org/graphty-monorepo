// Run by .github/workflows/githerd-watchdog.yml (twice an hour and after every CI run on master). Two
// alarms that work with the dev machine switched off:
//
// - githerd heartbeat. githerd (the local daemon that fixes red master and failing pull requests)
//   rewrites a pinned issue labelled `githerd-heartbeat` every 15 minutes; line 1 is
//   `alive: <ISO 8601 UTC>`, then optional `mode:`, `paused:`, `stuck: <ISO> <job>`,
//   `stopped: <ISO> <reason>`, `fatal: <ISO> <reason>` and `version:` lines. When the heartbeat is
//   stale, stuck, fatal, stopped for over 7 days, missing or ambiguous, the watchdog comments once on
//   the issue mentioning the owner, again only after 24 hours, and once without a mention when it
//   recovers. Nothing alarms before githerd's first write creates the issue.
// - Master-break clock. When master's CI has been red for over 2 hours (its consecutive failed push
//   runs since the last green one; cancelled runs are ignored), it comments once on the open
//   "Red master: CI failed on ..." issue that tools/master-guard.mjs opened, mentioning the owner, or
//   opens that issue when none is open.
//
// One GraphQL query and one REST read, plus at most one comment for each alarm: at most 4 API calls.
import { FREEZE_PREFIX } from "./master-guard.mjs";

export const OWNER = "apowers313";
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const RED = new Set(["failure", "timed_out", "startup_failure"]);

const QUERY = `query($owner: String!, $name: String!, $label: String!, $search: String!) {
  repository(owner: $owner, name: $name) {
    issues(labels: [$label], first: 5, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { number state body createdAt comments(last: 20) { nodes { body createdAt } } }
    }
  }
  search(query: $search, type: ISSUE, first: 5) {
    nodes { ... on Issue { number title body createdAt comments(last: 20) { nodes { body createdAt } } } }
  }
}`;

const time = (s) => {
    const t = Date.parse(s ?? "");
    return Number.isNaN(t) ? null : t;
};

/**
 * Read a heartbeat issue's body.
 * @param body - The issue body.
 * @returns The `alive:` time (null when line 1 is not a parsable `alive:` line) and the optional lines
 *   by key, each with its time and the rest of the line.
 */
export function parseHeartbeat(body) {
    const [first, ...rest] = (body ?? "").split(/\r?\n/);
    const m = /^alive: (\S+Z)$/.exec(first.trim());
    const lines = {};
    for (const line of rest) {
        const l = /^(\w+): (\S+)(?: (.*))?$/.exec(line.trim());
        if (l) {
            lines[l[1]] = { at: time(l[2]), text: l[3] ?? "" };
        }
    }
    return { alive: m ? time(m[1]) : null, lines };
}

/**
 * Judge the heartbeat.
 * @param issues - The labelled issues in any state, newest first (number, state, body, createdAt).
 * @param now - The current time in ms.
 * @returns The state (`not-live` and `alive` are green; anything else is an alarm), the issue to comment
 *   on, the last `alive:` time and a detail for the alarm text.
 */
export function heartbeatState(issues, now) {
    if (!issues.length) {
        return { state: "not-live", issue: null };
    }
    const open = issues.filter((i) => i.state === "OPEN");
    const issue = open[0] ?? issues[0];
    if (open.length > 1) {
        return { state: "ambiguous", issue, detail: `${open.length} open issues carry the label` };
    }
    const { alive, lines } = parseHeartbeat(issue.body);
    if (!open.length) {
        return { state: "missing", issue, alive, detail: "the heartbeat issue is closed" };
    }
    if (alive === null) {
        // githerd creates the issue and then writes it: a fresh issue with no `alive:` line yet is a race
        return now - time(issue.createdAt) < 2 * HOUR
            ? { state: "not-live", issue }
            : { state: "missing", issue, alive, detail: "line 1 is not `alive: <ISO time>`" };
    }
    const { fatal, stopped, stuck } = lines;
    if (fatal?.at >= alive) {
        return { state: "fatal", issue, alive, detail: fatal.text || "no reason given" };
    }
    if (stopped?.at >= alive) {
        return now - stopped.at <= 7 * DAY
            ? { state: "alive", issue, alive }
            : { state: "stopped", issue, alive, detail: `stopped over 7 days ago: ${stopped.text}` };
    }
    if (now - alive > HOUR) {
        return { state: "stale", issue, alive };
    }
    if (stuck?.at && now - stuck.at > 6 * HOUR) {
        return { state: "stuck", issue, alive, detail: stuck.text };
    }
    return { state: "alive", issue, alive };
}

const MARK = /<!-- watchdog:([\w-]+):/;

/**
 * The comment the heartbeat calls for.
 * @param judged - heartbeatState's result.
 * @param now - The current time in ms.
 * @returns The comment body, or null when nothing is to be said.
 */
export function heartbeatComment(judged, now) {
    const { state, issue, alive, detail } = judged;
    if (!issue) {
        return null;
    }
    const last = (issue.comments ?? []).filter((c) => MARK.test(c.body)).at(-1);
    const alarmOpen = last && MARK.exec(last.body)[1] !== "recovered";
    const aliveIso = alive ? new Date(alive).toISOString() : "never";
    if (state === "alive" || state === "not-live") {
        return alarmOpen
            ? `githerd heartbeat recovered (alive ${aliveIso}).\n\n<!-- watchdog:recovered:${aliveIso} -->`
            : null;
    }
    if (alarmOpen && now - time(last.createdAt) < DAY) {
        return null;
    }
    const why = detail ? `: ${detail}` : "";
    return `@${OWNER} ACTION NEEDED: githerd heartbeat ${state}${why} (last alive ${aliveIso}); run "githerd ensure" on the dev machine\n\n<!-- watchdog:${state}:${aliveIso} -->`;
}

/**
 * When master turned red.
 * @param runs - Completed CI push runs on master, newest first (REST workflow_runs).
 * @returns The oldest failed run since the last green one, or null when master is green.
 */
export function redSince(runs) {
    let oldest = null;
    for (const r of runs) {
        if (r.conclusion === "success") {
            break;
        }
        if (RED.has(r.conclusion)) {
            oldest = r;
        }
        // cancelled, skipped and the like say nothing about master
    }
    return oldest;
}

/**
 * What the master-break clock does.
 * @param runs - As for redSince.
 * @param redIssues - Open issues found by title search (number, title, body, comments).
 * @param now - The current time in ms.
 * @returns null, or `{ comment, issue }` (comment on that issue) or `{ open: { title, body } }`.
 */
export function clockAction(runs, redIssues, now) {
    const first = redSince(runs);
    if (!first || now - time(first.updated_at) <= 2 * HOUR) {
        return null;
    }
    const mark = `<!-- master-clock:${first.head_sha} -->`;
    const issues = redIssues.filter((i) => i.title?.startsWith(FREEZE_PREFIX));
    if (issues.some((i) => i.body?.includes(mark) || i.comments?.some((c) => c.body.includes(mark)))) {
        return null;
    }
    const minutes = Math.floor((now - time(first.updated_at)) / MIN);
    const text = `@${OWNER} ACTION NEEDED: master CI has been red for ${Math.floor(minutes / 60)} h ${minutes % 60} min, past the 2-hour fix target. First failed run: ${first.html_url} (${first.head_sha.slice(0, 7)}).\n\n${mark}`;
    const newest = issues.sort((a, b) => b.number - a.number)[0];
    return newest
        ? { issue: newest.number, comment: text }
        : {
              open: {
                  title: `${FREEZE_PREFIX}${first.head_sha.slice(0, 7)}`,
                  labels: ["bug", "priority:critical", "effort:low"],
                  body: text,
              },
          };
}

/**
 * One watchdog run.
 * @param opts - The run's inputs.
 * @param opts.request - `(method, path, body)` returning the parsed JSON of api.github.com.
 * @param opts.repo - owner/name.
 * @param opts.label - The heartbeat issue's label.
 * @param opts.now - The current time in ms.
 * @returns What was done, for the log.
 */
export async function watchdog({ request, repo, label, now }) {
    const [owner, name] = repo.split("/");
    const search = `repo:${repo} is:issue is:open in:title "${FREEZE_PREFIX.trim()}"`;
    const q = await request("POST", "/graphql", { query: QUERY, variables: { owner, name, label, search } });
    if (q.errors) {
        throw new Error(`graphql: ${JSON.stringify(q.errors)}`);
    }
    const flat = (i) => ({ ...i, comments: i.comments.nodes });
    const issues = q.data.repository.issues.nodes.map(flat);
    const redIssues = q.data.search.nodes.filter((i) => i.number).map(flat);
    const { workflow_runs: runs } = await request(
        "GET",
        `/repos/${repo}/actions/workflows/ci.yml/runs?branch=master&event=push&status=completed&per_page=30`,
    );

    const judged = heartbeatState(issues, now);
    const done = [`heartbeat: ${judged.state}${judged.issue ? ` (#${judged.issue.number})` : ""}`];
    const comment = heartbeatComment(judged, now);
    if (comment) {
        await request("POST", `/repos/${repo}/issues/${judged.issue.number}/comments`, { body: comment });
        done.push(`commented on #${judged.issue.number}`);
    }

    const clock = clockAction(runs, redIssues, now);
    if (clock?.issue) {
        await request("POST", `/repos/${repo}/issues/${clock.issue}/comments`, { body: clock.comment });
        done.push(`master red over 2 h: commented on #${clock.issue}`);
    } else if (clock?.open) {
        const opened = await request("POST", `/repos/${repo}/issues`, clock.open);
        done.push(`master red over 2 h: opened #${opened.number}`);
    } else {
        done.push(redSince(runs) ? "master red, under 2 h or already reported" : "master green");
    }
    return done;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const request = async (method, path, body) => {
        const res = await fetch(`https://api.github.com${path}`, {
            method,
            headers: {
                authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                accept: "application/vnd.github+json",
                "content-type": "application/json",
            },
            body: body && JSON.stringify(body),
        });
        if (!res.ok) {
            throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
        }
        return res.json();
    };
    const done = await watchdog({
        request,
        repo: process.env.GITHUB_REPOSITORY,
        label: process.env.LABEL || "githerd-heartbeat",
        now: Date.now(),
    });
    console.log(done.join("\n"));
}
