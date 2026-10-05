// Tests of tools/githerd-watchdog.mjs and its workflow: one case per heartbeat state, the comment rules,
// the master-break clock and the API call budget.
//
//   node tools/githerd-watchdog.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { clockAction, heartbeatComment, heartbeatState, OWNER, redSince, watchdog } from "./githerd-watchdog.mjs";
import { FREEZE_PREFIX } from "./master-guard.mjs";

const NOW = Date.parse("2026-10-05T12:00:00Z");
const MIN = 60_000;
const ago = (minutes) => new Date(NOW - minutes * MIN).toISOString().replace(/\.\d+Z$/, "Z");
const issue = (body, more = {}) => ({
    number: 7,
    state: "OPEN",
    body,
    createdAt: ago(10 * 24 * 60),
    comments: [],
    ...more,
});
const state = (issues) => heartbeatState(issues, NOW).state;

describe("githerd heartbeat states", () => {
    it("is not live before githerd's first write", () => {
        assert.equal(state([]), "not-live");
        assert.equal(state([issue("", { createdAt: ago(30) })]), "not-live");
    });

    it("alarms on an issue 2 hours old with no alive line, or a malformed one", () => {
        assert.equal(state([issue("", { createdAt: ago(121) })]), "missing");
        assert.equal(state([issue("alive: yesterday")]), "missing");
        assert.equal(state([issue("mode: acting\nalive: " + ago(5))]), "missing");
    });

    it("is green on a fresh alive line, in any mode and during a usage pause", () => {
        assert.equal(state([issue(`alive: ${ago(5)}`)]), "alive");
        assert.equal(state([issue(`alive: ${ago(59)}\r\nmode: dry-run`)]), "alive");
        assert.equal(state([issue(`alive: ${ago(5)}\nmode: acting\nversion: abc1234`)]), "alive");
        assert.equal(state([issue(`alive: ${ago(5)}\npaused: usage ${ago(7 * 60)}`)]), "alive");
    });

    it("alarms stale after 60 minutes", () => {
        assert.equal(state([issue(`alive: ${ago(61)}`)]), "stale");
    });

    it("alarms on a stuck line older than 6 hours only", () => {
        assert.equal(state([issue(`alive: ${ago(5)}\nstuck: ${ago(361)} fix-pr-12`)]), "stuck");
        assert.equal(state([issue(`alive: ${ago(5)}\nstuck: ${ago(300)} fix-pr-12`)]), "alive");
    });

    it("alarms fatal at once, quoting the reason", () => {
        const judged = heartbeatState([issue(`alive: ${ago(5)}\nfatal: ${ago(5)} token revoked`)], NOW);
        assert.equal(judged.state, "fatal");
        assert.match(heartbeatComment(judged, NOW), /fatal: token revoked/);
        assert.equal(state([issue(`alive: ${ago(5)}\nfatal: ${ago(30)} old`)]), "alive");
    });

    it("stays green for 7 days after a planned stop, then alarms", () => {
        assert.equal(state([issue(`alive: ${ago(3 * 24 * 60)}\nstopped: ${ago(3 * 24 * 60)} maintenance`)]), "alive");
        assert.equal(state([issue(`alive: ${ago(8 * 24 * 60)}\nstopped: ${ago(8 * 24 * 60)} maintenance`)]), "stopped");
        assert.equal(state([issue(`alive: ${ago(90)}\nstopped: ${ago(120)} before`)]), "stale");
    });

    it("alarms on a closed issue and on two open ones", () => {
        const closed = heartbeatState([issue(`alive: ${ago(5)}`, { state: "CLOSED" })], NOW);
        assert.equal(closed.state, "missing");
        assert.equal(closed.issue.number, 7);
        const two = heartbeatState([issue(`alive: ${ago(5)}`, { number: 9 }), issue(`alive: ${ago(5)}`)], NOW);
        assert.equal(two.state, "ambiguous");
        assert.equal(two.issue.number, 9);
    });
});

describe("githerd heartbeat comments", () => {
    const mark = (s, minutes) => ({ body: `text\n\n<!-- watchdog:${s}:x -->`, createdAt: ago(minutes) });
    const comment = (body, comments) => heartbeatComment(heartbeatState([issue(body, { comments })], NOW), NOW);
    const stale = `alive: ${ago(90)}`;

    it("mentions the owner once, then again only after 24 hours", () => {
        const first = comment(stale, []);
        assert.ok(first.startsWith(`@${OWNER} ACTION NEEDED: githerd heartbeat stale`));
        assert.match(first, /<!-- watchdog:stale:/);
        assert.equal(comment(stale, [mark("stale", 60)]), null);
        assert.match(comment(stale, [mark("stale", 24 * 60 + 1)]), /ACTION NEEDED/);
    });

    it("ignores other comments and alarms again after a recovery", () => {
        assert.match(comment(stale, [{ body: "a person's note", createdAt: ago(5) }]), /ACTION NEEDED/);
        assert.match(comment(stale, [mark("stale", 120), mark("recovered", 60)]), /ACTION NEEDED/);
    });

    it("posts one recovery note, without a mention", () => {
        const recovered = comment(`alive: ${ago(5)}`, [mark("stale", 60)]);
        assert.match(recovered, /<!-- watchdog:recovered:/);
        assert.doesNotMatch(recovered, /@/);
        assert.equal(comment(`alive: ${ago(5)}`, [mark("stale", 60), mark("recovered", 30)]), null);
        assert.equal(comment(`alive: ${ago(5)}`, []), null);
        assert.equal(heartbeatComment(heartbeatState([], NOW), NOW), null);
    });
});

describe("master-break clock", () => {
    const sha = (c) => c.repeat(40);
    const run = (conclusion, minutes, c = "a") => ({
        conclusion,
        updated_at: ago(minutes),
        head_sha: sha(c),
        html_url: `https://example/${c}`,
    });

    it("finds the first failure since the last green run, ignoring cancelled runs", () => {
        const runs = [
            run("failure", 10, "c"),
            run("cancelled", 50, "b"),
            run("timed_out", 150, "a"),
            run("success", 200),
        ];
        assert.equal(redSince(runs).head_sha, sha("a"));
        assert.equal(redSince([run("success", 5), run("failure", 300)]), null);
        assert.equal(redSince([run("cancelled", 5), run("success", 300)]), null);
    });

    it("waits 2 hours, then comments once on the open red-master issue", () => {
        assert.equal(clockAction([run("failure", 119)], [], NOW), null);
        const red = { number: 40, title: `${FREEZE_PREFIX}aaaaaaa`, body: "", comments: [] };
        const action = clockAction([run("failure", 125)], [red], NOW);
        assert.equal(action.issue, 40);
        assert.ok(action.comment.startsWith(`@${OWNER} ACTION NEEDED: master CI has been red for 2 h 5 min`));
        const done = { ...red, comments: [{ body: action.comment }] };
        assert.equal(clockAction([run("failure", 125)], [done], NOW), null);
    });

    it("opens a red-master issue when none is open", () => {
        const other = { number: 41, title: "Red master: something else", body: "", comments: [] };
        const action = clockAction([run("failure", 180)], [other], NOW);
        assert.equal(action.open.title, `${FREEZE_PREFIX}aaaaaaa`);
        assert.deepEqual(action.open.labels, ["bug", "priority:critical", "effort:low"]);
    });
});

describe("a watchdog run", () => {
    const fake = (issues, runs, redIssues = []) => {
        const calls = [];
        const nodes = (list) => list.map((i) => ({ ...i, comments: { nodes: i.comments ?? [] } }));
        const request = async (method, path, body) => {
            calls.push({ method, path, body });
            if (path === "/graphql") {
                return {
                    data: { repository: { issues: { nodes: nodes(issues) } }, search: { nodes: nodes(redIssues) } },
                };
            }
            if (path.includes("/actions/")) {
                return { workflow_runs: runs };
            }
            return { number: 99 };
        };
        return { calls, request };
    };
    const green = [{ conclusion: "success", updated_at: ago(5), head_sha: "f".repeat(40) }];

    it("reads twice and writes nothing when all is well, passing the dispatch label", async () => {
        const { calls, request } = fake([issue(`alive: ${ago(5)}`)], green);
        await watchdog({ request, repo: "o/r", label: "githerd-heartbeat-test", now: NOW });
        assert.equal(calls.length, 2);
        assert.equal(calls[0].body.variables.label, "githerd-heartbeat-test");
        assert.match(calls[1].path, /workflows\/ci\.yml\/runs\?branch=master&event=push&status=completed/);
    });

    it("makes at most 4 calls with both alarms firing", async () => {
        const red = [{ conclusion: "failure", updated_at: ago(300), head_sha: "a".repeat(40), html_url: "u" }];
        const { calls, request } = fake([issue(`alive: ${ago(90)}`)], red);
        await watchdog({ request, repo: "o/r", label: "githerd-heartbeat", now: NOW });
        assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`).slice(2), [
            "POST /repos/o/r/issues/7/comments",
            "POST /repos/o/r/issues",
        ]);
    });
});

describe("githerd-watchdog.yml", () => {
    const yml = readFileSync(new URL("../.github/workflows/githerd-watchdog.yml", import.meta.url), "utf8");

    it("runs on the cron, after CI on master and on dispatch, one at a time, with no secrets", () => {
        assert.match(yml, /cron: "13,43 \* \* \* \*"/);
        assert.match(yml, /workflow_run:\n\s+workflows: \["CI"\]\n\s+types: \[completed\]\n\s+branches: \[master\]/);
        assert.match(yml, /workflow_dispatch:/);
        assert.match(yml, /group: githerd-watchdog\n\s+cancel-in-progress: true/);
        assert.match(yml, /issues: write/);
        assert.doesNotMatch(yml, /secrets\./);
        assert.match(yml, /run: node tools\/githerd-watchdog\.mjs/);
    });
});
