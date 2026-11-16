// Tests of tools/issue-groups.mjs: every lifecycle transition, the caps, routing, drift against GitHub-shaped
// answers, jobs, metrics, and concurrent writes to one ledger file from several processes.
// Run: node tools/issue-groups.test.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
    addMember,
    addWait,
    applyFix,
    archive,
    close,
    compact,
    createGroup,
    drift,
    emptyLedger,
    freeze,
    importScan,
    jobLines,
    ledgerJobs,
    main,
    metrics,
    mutate,
    newestMarker,
    readLedger,
    ready,
    release,
    route,
    size,
    start,
    validate,
} from "./issue-groups.mjs";

const NOW = Date.parse("2026-11-16T20:00:00Z");
const HOUR = 3_600_000;
const TOOL = fileURLToPath(new URL("./issue-groups.mjs", import.meta.url));
const dirs = [];
const tempDir = () => {
    const d = mkdtempSync(join(tmpdir(), "issue-groups-"));
    dirs.push(d);
    return d;
};
after(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

/**
 * Issue facts: number -> labels. Unlisted issues read as effort:medium.
 * @param spec `{ [n]: [label...] }`
 * @returns a Map of `{ labels }`
 */
const factsOf = (spec = {}) => {
    const m = new Map();
    for (let n = 1; n <= 40; n++) m.set(n, { labels: ["effort:medium"] });
    for (const [n, labels] of Object.entries(spec)) m.set(Number(n), { labels });
    return m;
};

const fresh = () => emptyLedger();
const make = (ledger, lead, members = [], facts = factsOf()) =>
    createGroup(ledger, { lead, members, why: "T3 same block", files: ["a.ts"], now: NOW, facts });

describe("create and the caps", () => {
    it("makes a proposed group led by the first issue", () => {
        const l = fresh();
        const g = make(l, 1, [{ n: 2, test: "T3" }]);
        assert.equal(g.id, "g1");
        assert.equal(g.state, "proposed");
        assert.deepEqual(
            g.members.map((m) => [m.n, m.test]),
            [
                [1, "lead"],
                [2, "T3"],
            ],
        );
    });

    it("refuses a fifth issue and a seventh point", () => {
        const l = fresh();
        assert.throws(
            () =>
                make(l, 1, [
                    { n: 2, test: "T3" },
                    { n: 3, test: "T3" },
                    { n: 4, test: "T5" },
                    { n: 5, test: "T5" },
                ]),
            /issues already|effort points/,
        );
        const heavy = factsOf({ 1: ["effort:high"], 2: ["effort:high"], 3: ["effort:low"] });
        assert.throws(
            () =>
                make(
                    fresh(),
                    1,
                    [
                        { n: 2, test: "T3" },
                        { n: 3, test: "T3" },
                    ],
                    heavy,
                ),
            /7|effort points/,
        );
    });

    it("counts a T1 fold as no points but as an issue, and never counts a tracker", () => {
        const heavy = factsOf({ 1: ["effort:high"], 2: ["effort:high"], 3: ["effort:high"] });
        const g = make(
            fresh(),
            1,
            [
                { n: 2, test: "T3" },
                { n: 3, test: "T1-fold" },
            ],
            heavy,
        );
        assert.deepEqual(size(g), { issues: 3, points: 6 });
        g.members.push({ n: 9, test: "X7-tracker", points: 0 });
        assert.deepEqual(size(g), { issues: 3, points: 6 });
    });

    it("refuses owner-only and tracker issues, unknown tests and an issue already grouped", () => {
        const f = factsOf({ 2: ["ux-owner"], 3: ["tracking"] });
        assert.throws(() => make(fresh(), 1, [{ n: 2, test: "T3" }], f), /X3 owner-only/);
        assert.throws(() => make(fresh(), 1, [{ n: 3, test: "T3" }], f), /X7 tracker/);
        assert.throws(() => make(fresh(), 1, [{ n: 2, test: "same topic" }]), /test must be one of/);
        const l = fresh();
        make(l, 1, [{ n: 2, test: "T3" }]);
        assert.throws(() => make(l, 3, [{ n: 2, test: "T3" }]), /already in g1/);
    });

    it("lets a critical issue group only through T1 or T2 (rubric X2)", () => {
        const f = factsOf({ 1: ["priority:critical"] });
        assert.throws(() => make(fresh(), 1, [{ n: 2, test: "T3" }], f), /critical/);
        assert.equal(make(fresh(), 1, [{ n: 2, test: "T2" }], f).members.length, 2);
    });

    it("needs a reason", () => {
        assert.throws(() => createGroup(fresh(), { lead: 1, why: " ", now: NOW, facts: factsOf() }), /--why/);
    });
});

describe("the lifecycle", () => {
    it("proposed -> started -> ready -> frozen -> closed, and refuses members once started or frozen", () => {
        const l = fresh();
        const f = factsOf();
        make(l, 1);
        addMember(l, "g1", { n: 2, test: "T3", now: NOW, facts: f });
        start(l, "g1", "fix/1-x", NOW);
        assert.throws(
            () => addMember(l, "g1", { n: 3, test: "T3", now: NOW, facts: f }),
            /started: it takes no members/,
        );
        ready(l, "g1", "abc", NOW);
        freeze(l, "g1", 900, NOW);
        assert.throws(() => addMember(l, "g1", { n: 3, test: "T3", now: NOW, facts: f }), /frozen/);
        close(l, "g1", true, NOW);
        const g = l.groups[0];
        assert.equal(g.state, "closed");
        assert.deepEqual(
            g.history.map((h) => h.event),
            ["create", "add", "start", "ready", "freeze", "merged"],
        );
        assert.throws(() => start(l, "g1", "b", NOW), /closed: cannot start/);
    });

    it("lets a ready branch take two joins, each making it started again", () => {
        const l = fresh();
        const f = factsOf({ 1: ["effort:low"], 2: ["effort:low"], 3: ["effort:low"], 4: ["effort:low"] });
        make(l, 1, [], f);
        start(l, "g1", "fix/1", NOW);
        ready(l, "g1", "s1", NOW);
        assert.equal(addMember(l, "g1", { n: 2, test: "T3", now: NOW, facts: f }).joined, true);
        assert.equal(l.groups[0].state, "started");
        ready(l, "g1", "s2", NOW);
        addMember(l, "g1", { n: 3, test: "T3", now: NOW, facts: f });
        ready(l, "g1", "s3", NOW);
        assert.throws(() => addMember(l, "g1", { n: 4, test: "T3", now: NOW, facts: f }), /2 joins/);
        assert.equal(l.groups[0].readySince, new Date(NOW).toISOString());
    });

    it("release splits a member out for good; the last one out dissolves the group", () => {
        const l = fresh();
        const f = factsOf();
        make(l, 1, [{ n: 2, test: "T3" }]);
        release(l, "g1", 1, "not part of it", NOW);
        assert.equal(l.groups[0].lead, 2, "a proposed group takes its next member as lead");
        assert.throws(() => addMember(l, "g1", { n: 1, test: "T3", now: NOW, facts: f }), /never routed back/);
        assert.match(route(l, { n: 1, to: "g1", test: "T3", now: NOW, facts: f }), /starts g1-2 \(released/);
        release(l, "g1", 2, "not part either", NOW);
        assert.equal(l.groups[0].state, "dissolved");
    });

    it("closing unmerged dissolves the follow-up group and expires its waits", () => {
        const l = fresh();
        const f = factsOf();
        make(l, 1);
        freeze(l, "g1", 900, NOW);
        assert.match(route(l, { n: 2, to: "g1", test: "T3", now: NOW, facts: f }), /follow-up g2/);
        assert.match(close(l, "g1", false, NOW), /dissolved; 1 waits settled; follow-up dissolved/);
        assert.equal(l.groups.find((g) => g.id === "g2").state, "dissolved");
        assert.match(l.waits[0].expired, /base closed unmerged/);
        // routed again later, it never goes back to the dead group's line
        assert.match(route(l, { n: 2, to: "g1", test: "T3", now: NOW, facts: f }), /starts g2-2/);
    });

    it("a merge ends the waits and makes the follow-up group startable", () => {
        const l = fresh();
        const f = factsOf();
        make(l, 1);
        freeze(l, "g1", 900, NOW);
        route(l, { n: 2, to: "#900", test: "T3", now: NOW, facts: f });
        route(l, { n: 3, to: "g1", test: "T4", now: NOW, facts: f });
        const follow = l.groups.find((g) => g.id === "g2");
        assert.deepEqual(
            follow.members.map((m) => m.n),
            [2, 3],
        );
        assert.equal(follow.after, "g1");
        close(l, "g1", true, NOW);
        assert.equal(follow.after, null);
        assert.ok(l.waits.every((w) => w.ended?.endsWith("merged")));
    });
});

describe("route", () => {
    it("starts a group of its own when nothing fits or the target is closed", () => {
        const l = fresh();
        const f = factsOf();
        assert.match(route(l, { n: 1, now: NOW, facts: f }), /starts g1 \(no group fits\)/);
        make(l, 2);
        close(l, "g2", true, NOW);
        assert.match(route(l, { n: 3, to: "g2", test: "T3", now: NOW, facts: f }), /starts g3 \(g2 is closed\)/);
    });

    it("adds to a proposed group, joins a ready one, and starts its own when the target is full", () => {
        const l = fresh();
        const f = factsOf({ 1: ["effort:high"], 2: ["effort:high"], 3: ["effort:low"] });
        make(l, 1, [], f);
        assert.match(route(l, { n: 2, to: "g1", test: "T3", now: NOW, facts: f }), /added to g1/);
        assert.match(route(l, { n: 4, to: "g1", test: "T3", now: NOW, facts: f }), /starts g4 \(g1 is full/);
        make(l, 5, [], f);
        start(l, "g5", "fix/5", NOW);
        ready(l, "g5", "s", NOW);
        assert.match(route(l, { n: 3, to: "fix/5", test: "T2", now: NOW, facts: f, join: true }), /joins ready g5/);
    });

    it("makes an issue wait on a ready branch unless the round asks for a join", () => {
        const l = fresh();
        const f = factsOf();
        make(l, 1);
        start(l, "g1", "fix/1", NOW);
        ready(l, "g1", "s", NOW);
        assert.match(route(l, { n: 2, to: "fix/1", test: "T3", now: NOW, facts: f }), /waits on g1/);
        assert.match(route(l, { n: 2, to: "fix/1", test: "T3", now: NOW, facts: f }), /waits on g1/);
        const g = l.groups[0];
        assert.deepEqual([g.state, g.joins, g.members.length, l.waits.length], ["ready", 0, 1, 1]);
        assert.match(route(l, { n: 2, to: "fix/1", test: "T3", now: NOW, facts: f, join: true }), /joins ready g1/);
        assert.deepEqual([g.state, g.joins], ["started", 1]);
        assert.match(l.waits[0].ended, /joined/);
    });

    it("waits on a started branch, then joins once it is ready", () => {
        const l = fresh();
        const f = factsOf();
        make(l, 1);
        start(l, "g1", "fix/1", NOW);
        assert.match(route(l, { n: 2, to: "g1", test: "T3", now: NOW, facts: f }), /waits on g1/);
        assert.deepEqual(ready(l, "g1", "s", NOW), [2], "ready names the waiters to route again");
        assert.match(route(l, { n: 2, to: "g1", test: "T3", now: NOW, facts: f, join: true }), /joins ready g1/);
    });

    it("moves waiters on a started branch into the follow-up group when its pull request opens", () => {
        const l = fresh();
        const f = factsOf();
        make(l, 1);
        start(l, "g1", "fix/1", NOW);
        route(l, { n: 2, to: "g1", test: "T3", now: NOW, facts: f });
        freeze(l, "g1", 901, NOW, f);
        const live = l.waits.filter((w) => !w.ended && !w.expired);
        assert.equal(live.length, 1);
        assert.equal(l.groups.find((g) => g.id === "g2").after, "g1");
    });

    it("refuses a full follow-up group and an owner-only issue", () => {
        const l = fresh();
        const f = factsOf({ 6: ["needs-decision"] });
        make(l, 1);
        freeze(l, "g1", 900, NOW);
        for (const n of [2, 3, 4]) route(l, { n, to: "g1", test: "T3", now: NOW, facts: f });
        assert.throws(() => route(l, { n: 5, to: "g1", test: "T3", now: NOW, facts: f }), /follow-up full/);
        assert.throws(() => route(l, { n: 6, now: NOW, facts: f }), /owner-only/);
    });

    it("is a no-op for an issue already grouped", () => {
        const l = fresh();
        make(l, 1);
        assert.match(route(l, { n: 1, now: NOW, facts: factsOf() }), /already in g1/);
    });

    it("records an X9 wait that only a landed commit ends", () => {
        const l = fresh();
        assert.match(addWait(l, { n: 7, on: "#7953", x9: "0535547", why: "cause unmerged", now: NOW }), /X9 0535547/);
        assert.match(addWait(l, { n: 7, on: "#7953", x9: "0535547", why: "again", now: NOW }), /already waits/);
        const found = drift(l, { issues: new Map(), prs: new Map() }, NOW, (sha) => sha === "0535547");
        assert.equal(found[0].kind, "x9-landed");
        applyFix(l, found[0], NOW);
        assert.match(l.waits[0].ended, /landed/);
    });
});

describe("archive, compact, import and validate", () => {
    it("archives groups closed over 7 days ago and compacts stale proposals and old waits", () => {
        const l = fresh();
        make(l, 1);
        close(l, "g1", true, NOW - 8 * 24 * HOUR);
        make(l, 2);
        l.groups[1].refreshed = new Date(NOW - 25 * HOUR).toISOString();
        make(l, 3);
        l.waits.push({
            issue: 9,
            on: "g1",
            test: "T3",
            since: "x",
            ended: `${new Date(NOW - 9 * 24 * HOUR).toISOString()} merged`,
        });
        assert.deepEqual(
            archive(structuredClone(l), NOW).map((g) => g.id),
            ["g1"],
        );
        const r = compact(l, NOW);
        assert.deepEqual([r.archived.map((g) => g.id), r.dropped, r.waits], [["g1"], ["g2"], 1]);
        assert.deepEqual(
            l.groups.map((g) => g.id),
            ["g3"],
        );
    });

    it("import-scan replaces proposals, skips issues already in work, and cuts a job over the cap", () => {
        const l = fresh();
        make(l, 1);
        make(l, 2);
        start(l, "g2", "fix/2", NOW);
        const scan = {
            builtAt: "2026-11-16T19:59:00Z",
            jobs: [
                {
                    issues: [2, 3, 4, 5, 6, 7],
                    why: "T5 same doc",
                    files: ["d.md"],
                    members: [3, 4, 5, 6, 7].map((n) => ({ n, test: "T5", points: 1 })),
                },
            ],
        };
        assert.deepEqual(importScan(l, scan, NOW), { groups: 2, issues: 5 });
        assert.deepEqual(
            l.groups.map((g) => [g.id, g.members.map((m) => m.n)]),
            [
                ["g2", [2]],
                ["g3", [3, 4, 5, 6]],
                ["g7", [7]],
            ],
        );
        assert.equal(l.scannedAt, "2026-11-16T19:59:00Z");
    });

    it("validate finds an issue in two live groups", () => {
        const l = fresh();
        make(l, 1);
        l.groups.push({ ...structuredClone(l.groups[0]), id: "g1b" });
        assert.deepEqual(validate(l), ["#1 is in g1 and g1b"]);
        assert.deepEqual(validate({}), ["no groups list"]);
    });
});

const user = (login) => ({ __typename: "User", login });
const comment = (databaseId, body, login = "graphty-agent") => ({
    databaseId,
    createdAt: "2026-11-16T10:00:00Z",
    body,
    author: user(login),
    editor: null,
    lastEditedAt: null,
});

describe("markers and drift", () => {
    it("takes the newest trusted state marker by databaseId, never by time", () => {
        const comments = [
            { ...comment(30, "pipeline-round: ready fix/1 aaa"), createdAt: "2026-11-16T09:00:00Z" },
            {
                ...comment(20, "pipeline-round: opened fix/1 https://github.com/o/r/pull/77"),
                createdAt: "2026-11-16T11:00:00Z",
            },
            comment(40, "pipeline-round: diagnosis -- not a state marker"),
            comment(50, "pipeline-round: opened fix/9 https://github.com/o/r/pull/99", "stranger"),
        ];
        const m = newestMarker(comments);
        assert.deepEqual([m.kind, m.branch, m.sha], ["ready", "fix/1", "aaa"]);
        assert.equal(newestMarker(comments, "ready").pr, 77);
        const taken = newestMarker([
            comment(1, "pipeline-round: taken by session s, branch fix/3-x, worktree w -- why"),
        ]);
        assert.equal(taken.branch, "fix/3-x");
    });

    const issueFacts = (state, labels, comments) => ({ state, labels, comments });

    it("follows markers: taken starts, ready readies, opened freezes; a merged pull request closes", () => {
        const l = fresh();
        make(l, 1);
        make(l, 2);
        make(l, 3);
        make(l, 4);
        freeze(l, "g4", 444, NOW);
        const issues = new Map([
            [
                1,
                issueFacts(
                    "OPEN",
                    ["in-progress"],
                    [comment(1, "pipeline-round: taken by session s, branch fix/1-a, worktree w -- x")],
                ),
            ],
            [2, issueFacts("OPEN", ["in-progress"], [comment(2, "pipeline-round: ready fix/2-b bbb")])],
            [
                3,
                issueFacts(
                    "OPEN",
                    ["in-progress"],
                    [comment(3, "pipeline-round: opened fix/3-c https://github.com/o/r/pull/333")],
                ),
            ],
        ]);
        const prs = new Map([[444, { state: "MERGED" }]]);
        const found = drift(l, { issues, prs }, NOW);
        assert.deepEqual(
            found.map((d) => [d.group, d.kind]),
            [
                ["g1", "started"],
                ["g2", "ready"],
                ["g3", "opened"],
                ["g4", "merged"],
            ],
        );
        for (const d of found) applyFix(l, d, NOW);
        assert.deepEqual(
            l.groups.map((g) => [g.state, g.branch, g.pr]),
            [
                ["started", "fix/1-a", null],
                ["ready", "fix/2-b", null],
                ["frozen", "fix/3-c", 333],
                ["closed", null, 444],
            ],
        );
    });

    it("ignores a proposed member's old markers once no claim holds it, and drops a closed one", () => {
        const l = fresh();
        make(l, 1, [{ n: 2, test: "T3" }]);
        const issues = new Map([
            [1, issueFacts("OPEN", [], [comment(1, "pipeline-round: opened fix/1 https://github.com/o/r/pull/5")])],
            [2, issueFacts("CLOSED", [], [])],
        ]);
        const found = drift(l, { issues, prs: new Map() }, NOW);
        assert.deepEqual(
            found.map((d) => d.kind),
            ["member-closed"],
        );
        applyFix(l, found[0], NOW);
        assert.deepEqual(
            l.groups[0].members.map((m) => m.n),
            [1],
        );
    });

    it("releases a member whose newest marker is released, and still follows what came before it", () => {
        const l = fresh();
        make(l, 1, [{ n: 2, test: "T3" }]);
        start(l, "g1", "fix/1", NOW);
        const issues = new Map([
            [
                1,
                issueFacts(
                    "OPEN",
                    ["in-progress"],
                    [comment(5, "pipeline-round: opened fix/1 https://github.com/o/r/pull/8")],
                ),
            ],
            [
                2,
                issueFacts(
                    "OPEN",
                    [],
                    [
                        comment(3, "pipeline-round: ready fix/1 s"),
                        comment(6, "pipeline-round: released -- not part of fix/1: other code"),
                    ],
                ),
            ],
        ]);
        const found = drift(l, { issues, prs: new Map() }, NOW);
        assert.deepEqual(
            found.map((d) => d.kind),
            ["released", "opened"],
        );
        for (const d of found) applyFix(l, d, NOW);
        assert.deepEqual([l.groups[0].state, l.groups[0].members.map((m) => m.n)], ["frozen", [1]]);
    });

    it("folds groups one job took on one branch into a single group", () => {
        const l = fresh();
        make(l, 1);
        make(l, 2);
        const marker = comment(
            9,
            "pipeline-round: taken by session s, branch fix/1-both, worktree w, group #1 #2 -- x",
        );
        const issues = new Map([
            [1, issueFacts("OPEN", ["in-progress"], [marker])],
            [2, issueFacts("OPEN", ["in-progress"], [marker])],
        ]);
        const lines = drift(l, { issues, prs: new Map() }, NOW).map((d) => applyFix(l, d, NOW));
        assert.match(lines[1], /g2 \(#2\) absorbed into g1/);
        assert.deepEqual(
            l.groups[0].members.map((m) => [m.n, m.test]),
            [
                [1, "lead"],
                [2, "legacy"],
            ],
        );
    });

    it("start takes only the job's issues; the rest stay proposed under the group's id", () => {
        const l = fresh();
        make(l, 1, [
            { n: 2, test: "T3" },
            { n: 3, test: "T3" },
        ]);
        const first = start(l, "g1", "fix/1-a", NOW, [1]);
        assert.deepEqual([first.id, first.state, first.members.map((m) => m.n)], ["g1-2", "started", [1]]);
        const rest = l.groups.find((g) => g.id === "g1");
        assert.deepEqual([rest.state, rest.lead, rest.members.map((m) => m.n)], ["proposed", 2, [2, 3]]);
        // the second part of the split job names the same group and takes #2 alone on its own branch
        const second = start(l, "g1", "fix/2-b", NOW, [2]);
        assert.deepEqual([second.branch, second.members.map((m) => m.n)], ["fix/2-b", [2]]);
        assert.equal(first.branch, "fix/1-a", "the first branch is never overwritten");
        assert.deepEqual([rest.state, rest.members.map((m) => m.n)], ["proposed", [3]], "#3 is still offered as a job");
        assert.equal(ledgerJobs(l, q([3, "high"]), NOW).jobs[0].issues[0], 3);
        assert.throws(() => start(l, "g1-2", "fix/9", NOW, [1]), /started on fix\/1-a/);
        assert.throws(() => start(l, "g1", "fix/3", NOW, [9]), /#9 is not in g1/);
    });

    it("a taken marker on one member of a proposed group starts that member alone", () => {
        const l = fresh();
        make(l, 1, [
            { n: 2, test: "T3" },
            { n: 3, test: "T3" },
        ]);
        const issues = new Map([
            [1, issueFacts("OPEN", [], [])],
            [
                2,
                issueFacts(
                    "OPEN",
                    ["in-progress"],
                    [comment(4, "pipeline-round: taken by session s, branch fix/2-x, worktree w -- x")],
                ),
            ],
            [3, issueFacts("OPEN", [], [])],
        ]);
        for (const d of drift(l, { issues, prs: new Map() }, NOW)) applyFix(l, d, NOW);
        const started = l.groups.find((g) => g.state === "started");
        assert.deepEqual([started.branch, started.members.map((m) => m.n)], ["fix/2-x", [2]]);
        assert.deepEqual(
            l.groups.find((g) => g.id === "g1").members.map((m) => m.n),
            [1, 3],
        );
    });

    it("a join on one member of a proposed group absorbs that member alone into the ready branch's group", () => {
        const l = fresh();
        make(l, 1);
        start(l, "g1", "fix/1-a", NOW);
        ready(l, "g1", "s1", NOW);
        make(l, 5, [
            { n: 6, test: "T3" },
            { n: 7, test: "T3" },
        ]);
        const join = comment(
            9,
            "pipeline-round: taken by session s, branch fix/1-a, worktree w, group #1 #6 -- joins ready fix/1-a",
        );
        const issues = new Map([
            [1, issueFacts("OPEN", ["in-progress"], [join])],
            [5, issueFacts("OPEN", [], [])],
            [6, issueFacts("OPEN", ["in-progress"], [join])],
            [7, issueFacts("OPEN", [], [])],
        ]);
        for (const d of drift(l, { issues, prs: new Map() }, NOW)) applyFix(l, d, NOW);
        assert.deepEqual(
            l.groups[0].members.map((m) => m.n),
            [1, 6],
        );
        const rest = l.groups.find((g) => g.id === "g5");
        assert.deepEqual([rest.state, rest.members.map((m) => m.n)], ["proposed", [5, 7]]);
    });

    it("expires follow-up waits on a red pull request idle 6 hours, but never on an owner-held one", () => {
        const l = fresh();
        const f = factsOf();
        make(l, 1);
        freeze(l, "g1", 900, NOW);
        route(l, { n: 2, to: "g1", test: "T3", now: NOW, facts: f });
        addWait(l, { n: 3, on: "g1", why: "staged on it", now: NOW });
        const red = {
            state: "OPEN",
            mergeable: "MERGEABLE",
            checks: "FAILURE",
            headAt: new Date(NOW - 7 * HOUR).toISOString(),
        };
        const expiries = (at) =>
            drift(l, { issues: new Map(), prs: new Map([[900, red]]) }, at).filter((d) => d.kind !== "unreadable");
        const found = expiries(NOW);
        assert.deepEqual(
            found.map((d) => [d.kind, d.issue]),
            [["wait-expired", 2]],
            "an X6 wait (a dependency) does not expire this way",
        );
        l.groups[0].held = "owner";
        assert.deepEqual(expiries(NOW), []);
        assert.match(expiries(NOW + 25 * HOUR)[0].detail, /owner-held/);
    });

    it("reports a group over the cap and an issue in two groups, with no fix", () => {
        const l = fresh();
        make(l, 1);
        l.groups.push({ ...structuredClone(l.groups[0]), id: "g1b" });
        l.groups[1].members.push(...[5, 6, 7, 8].map((n) => ({ n, test: "legacy", points: 2 })));
        const found = drift(l, { issues: new Map(), prs: new Map() }, NOW).filter((d) => d.kind !== "unreadable");
        assert.deepEqual(
            found.map((d) => [d.kind, Boolean(d.fix)]),
            [
                ["two-groups", false],
                ["over-cap", false],
            ],
        );
    });
});

const q = (...rows) =>
    rows.map(([number, priority]) => ({ number, priority, title: `t${number}`, createdAt: "2026-11-01T00:00:00Z" }));

describe("jobs", () => {
    it("offers proposed groups in queue order and leaves out issues in work, waiting, held or excluded", () => {
        const l = fresh();
        const f = factsOf();
        l.scannedAt = new Date(NOW).toISOString();
        make(l, 5, [{ n: 6, test: "T3" }]);
        make(l, 1);
        make(l, 2);
        start(l, "g2", "fix/2", NOW);
        make(l, 3);
        freeze(l, "g3", 900, NOW);
        route(l, { n: 4, to: "g3", test: "T3", now: NOW, facts: f });
        make(l, 7);
        l.groups.at(-1).held = "X3";
        make(l, 8);
        l.groups.at(-1).members.push({ n: 9, test: "X3-owner", points: 2 });
        const result = ledgerJobs(
            l,
            q(
                [1, "high"],
                [2, "high"],
                [3, "high"],
                [4, "high"],
                [6, "high"],
                [5, "medium"],
                [7, "low"],
                [8, "low"],
                [9, "low"],
                [10, "low"],
            ),
            NOW,
            { everyMemberReviewed: true },
        );
        assert.deepEqual(
            result.jobs.map((j) => [j.group, j.issues, Boolean(j.unscanned)]),
            [
                ["g1", [1], false],
                ["g5", [6, 5], false],
                ["g8", [8], false],
                [null, [10], true],
            ],
        );
        assert.deepEqual(result.rescan, [10]);
        assert.equal(result.stale, null);
        const lines = jobLines(result);
        assert.match(lines[1], /^job #6 #5 high g5 tests 6:T3 5:lead -- T3 same block; files a\.ts$/);
        assert.match(lines.at(-1), /^rescan: #10/);
    });

    it("keeps only the lead and its T1 folds together until every member is reviewed", () => {
        const l = fresh();
        make(l, 1, [
            { n: 2, test: "T1-fold" },
            { n: 3, test: "T3" },
        ]);
        const result = ledgerJobs(l, q([1, "high"], [2, "high"], [3, "high"]), NOW);
        assert.deepEqual(
            result.jobs.map((j) => j.issues),
            [[1, 2], [3]],
        );
    });

    it("never offers or rescans an issue the last scan listed as blocked", () => {
        const l = fresh();
        importScan(
            l,
            { builtAt: new Date(NOW).toISOString(), jobs: [], blocked: [{ issue: 4, prs: [9], reason: "x" }] },
            NOW,
        );
        const r = ledgerJobs(l, q([4, "high"]), NOW);
        assert.deepEqual([r.jobs, r.rescan], [[], []]);
        assert.ok(!jobLines(r).some((line) => line.startsWith("rescan:")));
        importScan(l, { builtAt: new Date(NOW).toISOString(), jobs: [] }, NOW);
        assert.deepEqual(ledgerJobs(l, q([4, "high"]), NOW).rescan, [4], "each import replaces the blocked list");
    });

    it("asks for a scan when the last one is over 2 hours old", () => {
        const l = fresh();
        l.scannedAt = new Date(NOW - 3 * HOUR).toISOString();
        make(l, 1);
        assert.match(ledgerJobs(l, q([1, "high"]), NOW).stale, /older than 2 hours/);
    });
});

describe("metrics", () => {
    it("splits grouped and single pull requests and applies guardrails only past 20 grouped", () => {
        const l = fresh();
        make(l, 1, [{ n: 2, test: "T3" }]);
        freeze(l, "g1", 10, NOW);
        const pr = (number, closes, mergedHours, lateCommit = false) => ({
            number,
            closes,
            createdAt: new Date(NOW - 10 * HOUR).toISOString(),
            mergedAt: mergedHours === null ? null : new Date(NOW - 10 * HOUR + mergedHours * HOUR).toISOString(),
            lastCommitAt: new Date(NOW - (lateCommit ? 5 : 11) * HOUR).toISOString(),
        });
        const m = metrics(l, [pr(10, 1, 2), pr(11, 2, 6, true), pr(12, 1, 1), pr(13, 0, null)], NOW);
        assert.equal(m.grouped.n, 2);
        assert.equal(m.grouped.commitAfterOpenShare, 0.5);
        assert.equal(m.single.closedUnmergedRate, 0.5);
        assert.equal(m.issuesPerMergedPr, 1.33);
        assert.equal(m.multiFixShare, 0.333);
        assert.deepEqual(m.breaches, []);
        const many = Array.from({ length: 20 }, (_, k) => pr(100 + k, 2, 8));
        assert.ok(metrics(l, many, NOW).breaches.includes("75th percentile hours to merge, grouped"));
    });
});

describe("the command line", () => {
    const issueRunner = (labels = {}) => {
        const calls = [];
        const run = (query) => {
            calls.push(query);
            const repository = {};
            for (const [, alias, n] of query.matchAll(/(i|p)(\d+): /g)) {
                if (alias === "i")
                    repository[`i${n}`] = {
                        number: Number(n),
                        state: "OPEN",
                        labels: { nodes: (labels[n] ?? ["effort:low"]).map((name) => ({ name })) },
                        comments: { nodes: [] },
                    };
                else repository[`p${n}`] = { number: Number(n), state: "MERGED", commits: { nodes: [] } };
            }
            return { repository };
        };
        return { run, calls };
    };

    it("creates, routes, shows and closes through the ledger file", () => {
        const dir = tempDir();
        const ledgerPath = join(dir, "groups.json");
        const { run } = issueRunner({ 3: ["hold"] });
        const deps = { ledgerPath, run, now: NOW };
        assert.equal(
            main(["create", "1", "2:T3", "--why", "T3 same block", "--files", "a.ts"], deps).out,
            "created g1: #1 #2",
        );
        assert.equal(main(["route", "4", "--to", "g1", "--test", "T5"], deps).out, "#4 added to g1 (T5)");
        assert.deepEqual(main(["route", "3"], deps), {
            code: 1,
            out: "refused: #3: X3 owner-only (label hold); not routed",
        });
        assert.equal(main(["start", "g1", "fix/1-x"], deps).code, 2, "start needs the job's issues");
        assert.equal(main(["start", "g1", "fix/1-x", "1", "2", "4"], deps).out, "g1 started on fix/1-x: #1 #2 #4");
        assert.equal(main(["freeze", "g1", "77"], deps).out, "g1 frozen on #77");
        assert.match(main(["show", "4"], deps).out, /"id": "g1"/);
        assert.match(main(["show"], deps).out, /^groups: 0 started, 0 ready, 0 waiting, 1 frozen/);
        assert.equal(main(["close", "g1"], deps).code, 2);
        assert.match(main(["check", "--fix"], deps).out, /fixed g1 closed/);
        assert.equal(readLedger(ledgerPath).groups[0].state, "closed");
        assert.equal(main(["nonsense"], deps).code, 2);
        assert.equal(main(["--bogus"], deps).code, 2);
    });

    it("seeds once, refusing to overwrite without --force, and refuses a bad seed", () => {
        const dir = tempDir();
        const ledgerPath = join(dir, "groups.json");
        const seed = join(dir, "seed.json");
        const l = fresh();
        make(l, 1);
        l.groups[0].followUp = "g2";
        make(l, 2);
        writeFileSync(seed, JSON.stringify({ builtAt: "2026-11-16T19:00:00Z", groups: l.groups, waits: [] }));
        assert.match(main(["seed", seed], { ledgerPath, now: NOW }).out, /^seeded 2 groups/);
        assert.equal(readLedger(ledgerPath).groups[1].after, "g1", "a follow-up group learns its base");
        assert.equal(main(["seed", seed], { ledgerPath, now: NOW }).code, 1);
        assert.equal(main(["seed", seed, "--force"], { ledgerPath, now: NOW }).code, 0);
        writeFileSync(seed, JSON.stringify({ groups: [...l.groups, { ...l.groups[0], id: "dup" }] }));
        assert.match(main(["seed", seed, "--force"], { ledgerPath, now: NOW }).out, /#1 is in g1 and dup/);
    });

    it("falls back to issue-queue.mjs jobs while the ledger is empty", () => {
        const ledgerPath = join(tempDir(), "groups.json");
        const seen = [];
        const fallback = (args) => {
            seen.push(args);
            return { code: 3, out: "stale: rebuild the free queue" };
        };
        assert.deepEqual(main(["jobs", "--json"], { ledgerPath, fallback }), {
            code: 3,
            out: "stale: rebuild the free queue",
        });
        assert.deepEqual(seen, [["--json"]]);
    });

    it("imports a scan and offers its groups as jobs", () => {
        const dir = tempDir();
        const ledgerPath = join(dir, "groups.json");
        const scan = join(dir, "free-queue.json");
        writeFileSync(
            scan,
            JSON.stringify({
                builtAt: new Date(NOW).toISOString(),
                jobs: [{ issues: [2, 1], why: "T5", files: ["d.md"] }],
            }),
        );
        assert.match(main(["import-scan", scan], { ledgerPath, now: NOW }).out, /imported 1 proposed groups, 2 issues/);
        const out = main(["jobs"], { ledgerPath, now: NOW, fetchQueue: () => q([1, "high"], [2, "high"]) }).out;
        assert.match(
            out,
            /^job #1 high g2 -- T5 \(split until every member is reviewed\); files d\.md\njob #2 high g2 /,
        );
    });

    it("appends a metrics record", () => {
        const dir = tempDir();
        const ledgerPath = join(dir, "groups.json");
        const run = () => ({
            search: {
                pageInfo: { hasNextPage: false },
                nodes: [
                    {
                        number: 5,
                        state: "MERGED",
                        createdAt: "2026-11-16T10:00:00Z",
                        mergedAt: "2026-11-16T11:00:00Z",
                        closingIssuesReferences: { totalCount: 2 },
                        commits: { nodes: [] },
                    },
                ],
            },
        });
        assert.match(main(["metrics", "--append"], { ledgerPath, run, now: NOW }).out, /issues per merged PR 2/);
        const lines = readFileSync(join(dir, "grouping-metrics.jsonl"), "utf8").trim().split("\n");
        assert.equal(JSON.parse(lines[0]).grouped.n, 1);
    });

    it("archives to groups-archive.jsonl", () => {
        const dir = tempDir();
        const ledgerPath = join(dir, "groups.json");
        mutate(ledgerPath, (l) => {
            make(l, 1);
            close(l, "g1", true, NOW - 8 * 24 * HOUR);
        });
        assert.equal(main(["archive"], { ledgerPath, now: NOW }).out, "archived 1 groups");
        assert.ok(existsSync(join(dir, "groups-archive.jsonl")));
        assert.equal(readLedger(ledgerPath).groups.length, 0);
    });
});

describe("the ledger file", () => {
    it("loses no write when many processes change it at once", async () => {
        const ledgerPath = join(tempDir(), "groups.json");
        const writers = 12;
        const script = (k) => `
            import { mutate } from ${JSON.stringify(TOOL)};
            mutate(${JSON.stringify(ledgerPath)}, (l) => { l.groups.push({ id: "w${k}", state: "proposed", members: [{ n: ${k + 1}, test: "lead" }], history: [] }); });
        `;
        const exits = await Promise.all(
            Array.from(
                { length: writers },
                (_, k) =>
                    new Promise((resolve) => {
                        const child = spawn(process.execPath, ["--input-type=module", "-e", script(k)], {
                            stdio: "inherit",
                        });
                        child.on("exit", resolve);
                    }),
            ),
        );
        assert.deepEqual(exits, Array(writers).fill(0));
        const ids = readLedger(ledgerPath)
            .groups.map((g) => g.id)
            .sort();
        assert.equal(ids.length, writers);
        assert.ok(!existsSync(`${ledgerPath}.lock`));
    });

    it("breaks a lock left by a dead process and treats an unparsable file as an error, never as empty", () => {
        const ledgerPath = join(tempDir(), "groups.json");
        writeFileSync(`${ledgerPath}.lock`, "999999999");
        mutate(ledgerPath, (l) => l.groups.push({ id: "x", state: "proposed", members: [], history: [] }));
        assert.equal(readLedger(ledgerPath).groups.length, 1);
        writeFileSync(ledgerPath, "{ not json");
        assert.throws(() => readLedger(ledgerPath), SyntaxError);
        assert.deepEqual(readLedger(join(tempDir(), "missing.json")), emptyLedger());
    });

    it("keeps the old ledger when a change throws", () => {
        const ledgerPath = join(tempDir(), "groups.json");
        mutate(ledgerPath, (l) => make(l, 1));
        assert.throws(() =>
            mutate(ledgerPath, (l) => {
                l.groups = [];
                throw new Error("boom");
            }),
        );
        assert.equal(readLedger(ledgerPath).groups.length, 1);
        assert.ok(!existsSync(`${ledgerPath}.lock`));
    });
});
