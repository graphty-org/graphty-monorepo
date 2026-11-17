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
    classOf,
    close,
    combineLines,
    combinePlan,
    compact,
    createGroup,
    drift,
    emptyLedger,
    freeze,
    groupClass,
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

describe("risk classes, any member and each member's reason", () => {
    const docs = (l, lead, members = [], facts = factsOf(), files = ["design/ui/a.md"]) =>
        createGroup(l, { lead, members, why: "T5 same doc", files, now: NOW, facts });

    it("reads a change's class from its files", () => {
        assert.equal(classOf(["design/ci/a.md", "graphty/README.md", "x/notes.md"]), "docs");
        assert.equal(classOf(["graphty/test/a.test.ts", "x/fixtures/b.json", "c.md"]), "tests");
        assert.equal(classOf(["graphty/src/a.ts", "c.md"]), "source");
        assert.equal(classOf([]), "source", "unknown files read as the riskiest class");
        assert.equal(classOf(["design/ui/studio/tool/run.mjs"]), "source", "code under design/ is source");
        assert.equal(classOf(["design/ui/studio/tool/run.test.mjs", "design/a.md"]), "tests");
        assert.equal(classOf(["design/data/rows.json", "design/a.yaml"]), "docs");
        assert.equal(classOf(["graphty/src/latest-helpers.ts"]), "source", "only a test-helper path is a test helper");
        assert.equal(classOf(["tools/test-helpers/wait.mjs", "x/test-helper.ts"]), "tests");
        assert.equal(classOf([".claude/skills/issue-round/SKILL.md"]), "source", "the rounds' instructions are source");
        assert.equal(classOf(["CLAUDE.md"]), "source");
        assert.equal(classOf(["graphty/CLAUDE.md"]), "source");
    });

    it("caps each class: docs 10 issues and no points, tests 8 and 12, source 4 and 6", () => {
        const heavy = factsOf(Object.fromEntries(Array.from({ length: 12 }, (_, k) => [k + 1, ["effort:high"]])));
        const ten = Array.from({ length: 9 }, (_, k) => ({ n: k + 2, test: "T6" }));
        const g = docs(fresh(), 1, ten, heavy);
        assert.deepEqual([groupClass(g), size(g)], ["docs", { issues: 10, points: 30 }]);
        assert.throws(() => docs(fresh(), 1, [...ten, { n: 11, test: "T6" }], heavy), /docs cap 10/);
        const tests = (members, f) =>
            createGroup(fresh(), { lead: 1, members, why: "T6", files: ["layout/test/a.test.ts"], now: NOW, facts: f });
        const light = factsOf(Object.fromEntries(Array.from({ length: 12 }, (_, k) => [k + 1, ["effort:low"]])));
        const seven = Array.from({ length: 7 }, (_, k) => ({ n: k + 2, test: "T6" }));
        assert.equal(groupClass(tests(seven, light)), "tests");
        assert.throws(() => tests([...seven, { n: 9, test: "T6" }], light), /tests cap 8/);
        assert.throws(() => tests(seven.slice(0, 4), heavy), /tests cap 12/);
    });

    it("takes the riskiest member's class, and T6 never holds in a source group", () => {
        const l = fresh();
        const f = factsOf();
        const g = docs(
            l,
            1,
            [2, 3, 4].map((n) => ({ n, test: "T6" })),
        );
        assert.throws(
            () => addMember(l, g.id, { n: 5, test: "T3", cls: "source", now: NOW, facts: f }),
            /T6 holds only between docs or tests/,
        );
        addMember(l, g.id, { n: 5, test: "T6", now: NOW, facts: f });
        assert.equal(groupClass(g), "docs", "a member with no class of its own takes the group's files' class");
        const h = docs(l, 6);
        addMember(l, h.id, { n: 7, test: "T3", cls: "source", now: NOW, facts: f });
        assert.equal(groupClass(h), "source", "a source member makes the whole group source");
        assert.throws(() => addMember(l, h.id, { n: 8, test: "T6", cls: "docs", now: NOW, facts: f }), /T6/);
        assert.throws(() => addMember(l, h.id, { n: 8, test: "T3", cls: "prose", now: NOW, facts: f }), /class must/);
    });

    it("lets an issue hold against any member, and records which", () => {
        const l = fresh();
        const f = factsOf({ 1: ["effort:low"], 2: ["effort:low"], 3: ["effort:low"], 4: ["effort:low"] });
        make(l, 1, [{ n: 2, test: "T3", why: "#2 also edits parse()" }], f);
        addMember(l, "g1", { n: 3, test: "T4", with: 2, why: "same oracle rows as #2", now: NOW, facts: f });
        assert.throws(() => addMember(l, "g1", { n: 4, test: "T3", with: 9, now: NOW, facts: f }), /not a member/);
        assert.match(
            route(l, { n: 4, to: "g1", test: "T3", with: 3, now: NOW, facts: f }),
            /added to g1 \(T3 with #3\)/,
        );
        assert.deepEqual(
            l.groups[0].members.map((m) => [m.n, m.test, m.with, m.why]),
            [
                [1, "lead", null, null],
                [2, "T3", 1, "#2 also edits parse()"],
                [3, "T4", 2, "same oracle rows as #2"],
                [4, "T3", 3, null],
            ],
        );
        const r = ledgerJobs(l, q([1, "high"], [2, "high"], [3, "high"], [4, "high"]), NOW);
        assert.deepEqual(r.jobs[0].tests, ["lead", "T3", "T4@2", "T3@3"]);
        assert.throws(() => make(fresh(), 1, [{ n: 2, test: "T3", with: 3 }]), /not an earlier member/);
    });

    it("never takes a scan member with no reason of its own, or the group's summary as its reason", () => {
        const l = fresh();
        const scan = {
            builtAt: new Date(NOW).toISOString(),
            jobs: [
                {
                    issues: [1, 2, 3, 4, 5],
                    why: "fidelity",
                    files: ["a.ts"],
                    members: [
                        { n: 2, test: "T3", why: "#2 changes the same reader" },
                        { n: 3, test: "T3", why: "fidelity" },
                        { n: 4, test: "T3" },
                        { n: 5, test: "T4", with: 2, why: "same rows as #2" },
                    ],
                },
            ],
        };
        assert.deepEqual(importScan(l, scan, NOW), { groups: 4, issues: 5, unreasoned: 2 });
        assert.deepEqual(
            l.groups.map((g) => g.members.map((m) => m.n)),
            [[1, 2], [3], [4], [5]],
            "#5 holds against #2, which is no longer in the group being filled, so it does not ride with #4",
        );
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

    it("import-scan replaces proposals, skips issues already in work, and cuts a job over its class's cap", () => {
        const l = fresh();
        make(l, 1);
        make(l, 2);
        start(l, "g2", "fix/2", NOW);
        const scan = {
            builtAt: "2026-11-16T19:59:00Z",
            jobs: [
                {
                    issues: [2, 3, 4, 5, 6, 7],
                    why: "T3 same block",
                    files: ["a.ts"],
                    members: [
                        ...[3, 4, 5, 6, 7].map((n) => ({ n, test: "T3", points: 1, why: `#${n} edits parse()` })),
                        { n: 8, test: "T3", with: 4, points: 1, why: "#8 edits parse() too" },
                    ],
                },
            ],
        };
        scan.jobs[0].issues.push(8);
        assert.deepEqual(importScan(l, scan, NOW), { groups: 2, issues: 6, unreasoned: 0 });
        assert.deepEqual(
            l.groups.map((g) => [g.id, g.members.map((m) => m.n)]),
            [
                ["g2", [2]],
                ["g3", [3, 4, 5, 6]],
                ["g7", [7, 8]],
            ],
            "#8 holds against #4, cut into the first part, and still rides in the second",
        );
        assert.equal(l.scannedAt, "2026-11-16T19:59:00Z");
        assert.equal(l.groups.at(-1).origin, "g3", "a cut part remembers the job it came from");
        assert.equal(l.groups[1].members[1].why, "#4 edits parse()");
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

    it("folds the groups of finished branches combined into one new branch, keeping their history", () => {
        const l = fresh();
        make(l, 1);
        start(l, "g1", "fix/1-a", NOW);
        ready(l, "g1", "s1", NOW);
        make(l, 2, [{ n: 3, test: "T3", why: "same block" }]);
        start(l, "g2", "fix/2-b", NOW);
        ready(l, "g2", "s2", NOW);
        addWait(l, { n: 9, on: "fix/2-b", why: "staged on it", now: NOW });
        const marks = (n) =>
            issueFacts(
                "OPEN",
                ["in-progress"],
                [
                    comment(n, `pipeline-round: ready ${n === 1 ? "fix/1-a s1" : "fix/2-b s2"}`),
                    comment(
                        100 + n,
                        "pipeline-round: taken by session s, branch fix/1-batch, worktree w, group #1 #2 #3 -- combines fix/1-a fix/2-b",
                    ),
                    comment(200 + n, "pipeline-round: ready fix/1-batch cafe"),
                ],
            );
        const issues = new Map([1, 2, 3].map((n) => [n, marks(n)]));
        const found = drift(l, { issues, prs: new Map() }, NOW);
        assert.deepEqual(
            found.map((d) => [d.group, d.kind]),
            [
                ["g1", "combined"],
                ["g2", "combined"],
            ],
        );
        for (const d of found) applyFix(l, d, NOW);
        const host = l.groups.find((g) => g.branch === "fix/1-batch");
        assert.deepEqual(
            [host.id, host.state, host.members.map((m) => m.n), host.aliases],
            ["g1-2", "ready", [1, 2, 3], ["fix/1-a", "fix/2-b"]],
        );
        for (const id of ["g1", "g2"]) {
            const old = l.groups.find((g) => g.id === id);
            assert.deepEqual([old.state, old.supersededBy], ["dissolved", "g1-2"]);
            assert.ok(
                old.history.some((h) => h.event === "ready"),
                "the old group's history is kept",
            );
        }
        assert.equal(l.waits[0].on, "g1-2", "a wait on an old branch follows it");
        assert.deepEqual(drift(l, { issues, prs: new Map() }, NOW), [], "a second check finds nothing more");
        // the combined branch opens: the new group freezes
        for (const n of [1, 2, 3]) {
            issues
                .get(n)
                .comments.push(comment(300 + n, "pipeline-round: opened fix/1-batch https://github.com/o/r/pull/77"));
        }
        for (const d of drift(l, { issues, prs: new Map() }, NOW)) applyFix(l, d, NOW);
        assert.deepEqual([host.state, host.pr], ["frozen", 77]);
    });

    it("never folds on a member re-taken elsewhere, or on a combine that is only taken", () => {
        const l = fresh();
        make(l, 1, [{ n: 2, test: "T3" }]);
        start(l, "g1", "fix/1-a", NOW);
        const taken = (id, branch) =>
            comment(id, `pipeline-round: taken by session s, branch ${branch}, worktree w -- x`);
        const issues = new Map([
            [1, issueFacts("OPEN", ["in-progress"], [taken(1, "fix/1-a")])],
            [2, issueFacts("OPEN", ["in-progress"], [taken(2, "fix/1-a"), taken(5, "fix/2-x")])],
        ]);
        assert.deepEqual(
            drift(l, { issues, prs: new Map() }, NOW).map((d) => [d.kind, Boolean(d.fix)]),
            [["branch", false]],
            "#1 still runs on fix/1-a: report, never move it",
        );
        issues.get(2).comments.push(comment(6, "pipeline-round: ready fix/2-x s"));
        assert.deepEqual(
            drift(l, { issues, prs: new Map() }, NOW).map((d) => [d.kind, Boolean(d.fix)]),
            [["branch", false]],
            "one member finished elsewhere is still not the group moving",
        );
        const m = fresh();
        make(m, 3);
        start(m, "g3", "fix/3-a", NOW);
        ready(m, "g3", "s3", NOW);
        const combining = new Map([
            [
                3,
                issueFacts(
                    "OPEN",
                    ["in-progress"],
                    [comment(1, "pipeline-round: ready fix/3-a s3"), taken(2, "fix/3-batch")],
                ),
            ],
        ]);
        assert.deepEqual(
            drift(m, { issues: combining, prs: new Map() }, NOW).map((d) => [d.kind, Boolean(d.fix)]),
            [["branch", false]],
            "a combine that may still be abandoned leaves the old group alone",
        );
    });

    it("sends waits of a later folded group to the follow-up group when the combined branch already opened", () => {
        const l = fresh();
        for (const n of [1, 2]) {
            make(l, n);
            start(l, `g${n}`, `fix/${n}-a`, NOW);
            ready(l, `g${n}`, `s${n}`, NOW);
        }
        addWait(l, { n: 8, on: "g1", why: "staged", now: NOW });
        l.waits.push({ issue: 9, on: "g2", test: "T3", since: new Date(NOW).toISOString(), why: "same block" });
        const opened = (n) =>
            issueFacts(
                "OPEN",
                ["in-progress"],
                [comment(n, "pipeline-round: opened fix/1-batch https://github.com/o/r/pull/7")],
            );
        const issues = new Map([1, 2].map((n) => [n, opened(n)]));
        for (const d of drift(l, { issues, prs: new Map() }, NOW)) applyFix(l, d, NOW);
        const host = l.groups.find((g) => g.branch === "fix/1-batch");
        assert.equal(host.state, "frozen");
        const follow = l.groups.find((g) => g.id === host.followUp);
        assert.deepEqual(
            follow?.members.map((m) => m.n),
            [9],
            "the T3 wait from the second old group reached it",
        );
    });

    it("reads a ready branch's class from its diff for the cap", () => {
        const l = fresh();
        const f = factsOf();
        const g = createGroup(l, {
            lead: 1,
            members: [2, 3, 4, 5].map((n) => ({ n, test: "T6" })),
            why: "docs",
            files: ["design/ui/a.md"],
            now: NOW,
            facts: f,
        });
        start(l, g.id, "docs/1-a", NOW);
        ready(l, g.id, "s", NOW);
        const issues = new Map(
            [1, 2, 3, 4, 5].map((n) => [
                n,
                issueFacts("OPEN", ["in-progress"], [comment(n, "pipeline-round: ready docs/1-a s")]),
            ]),
        );
        assert.deepEqual(
            drift(l, { issues, prs: new Map(), diffs: new Map([["docs/1-a", ["design/ui/a.md"]]]) }, NOW),
            [],
        );
        const found = drift(l, { issues, prs: new Map(), diffs: new Map([["docs/1-a", ["layout/src/a.ts"]]]) }, NOW);
        assert.deepEqual(
            found.map((d) => [d.kind, d.detail]),
            [["over-cap", "5 issues, 10 points (source, read from the diff of docs/1-a)"]],
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
        const result = ledgerJobs(l, q([1, "high"], [2, "high"], [3, "high"]), NOW, { everyMemberReviewed: false });
        assert.deepEqual(
            result.jobs.map((j) => j.issues),
            [[1, 2], [3]],
        );
        // every member reviewed (the default now): the whole group is one job
        assert.deepEqual(
            ledgerJobs(l, q([1, "high"], [2, "high"], [3, "high"]), NOW).jobs.map((j) => j.issues),
            [[1, 2, 3]],
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

describe("combine-plan", () => {
    const ready_ = (l, lead, members, branch, files, f = factsOf()) => {
        const g = createGroup(l, { lead, members, why: "x", files, now: NOW, facts: f });
        start(l, g.id, branch, NOW);
        ready(l, g.id, `sha${lead}`, NOW);
        return g;
    };
    const readyMarks = (l, extra = {}) => {
        const issues = new Map();
        let id = 1;
        for (const g of l.groups.filter((x) => x.state === "ready")) {
            for (const m of g.members) {
                const comments = [comment(id++, `pipeline-round: ready ${g.branch} sha${g.lead}`)];
                comments.push(...(extra[m.n] ?? []).map((body) => comment(id++, body)));
                issues.set(m.n, { state: "OPEN", labels: ["in-progress"], comments });
            }
        }
        return issues;
    };
    const factsFor = (l, diffs, extra, openPrs = new Map()) => ({
        issues: readyMarks(l, extra),
        openPrs,
        tips: new Map(l.groups.filter((g) => g.branch).map((g) => [g.branch, `sha${g.lead}`])),
        diffs: new Map(Object.entries(diffs)),
    });

    it("finds a family and refuses open, red-fix, running and moved branches", () => {
        const l = fresh();
        ready_(l, 1, [], "docs/1-a", ["design/ui/a.md"]);
        ready_(l, 2, [], "docs/2-b", ["design/ui/b.md"]);
        ready_(l, 3, [], "docs/3-c", ["design/ui/c.md"]);
        ready_(l, 4, [], "fix/4-d", ["design/ui/d.md"]);
        ready_(l, 5, [], "docs/5-e", ["design/ui/e.md"]);
        ready_(l, 6, [], "docs/6-f", ["design/ui/f.md"]);
        ready_(l, 7, [], "docs/7-g", ["design/other/g.md"]);
        const diffs = Object.fromEntries(l.groups.map((g) => [g.branch, g.files]));
        const extra = {
            4: ["pipeline-round: taken by session s, branch fix/4-d, worktree w -- This job fixes the red: x"],
            5: ["pipeline-round: taken by session s, branch docs/5-e, worktree w, group #5 #9 -- joins ready docs/5-e"],
        };
        const facts = factsFor(l, diffs, extra, new Map([["docs/3-c", 88]]));
        facts.tips.set("docs/6-f", "beef");
        const plan = combinePlan(l, facts, { guard: /^visual-review\// });
        assert.deepEqual(
            plan.families.map((f) => [f.class, f.branches, f.branch, f.links.map((x) => x.test)]),
            [["docs", ["docs/1-a", "docs/2-b"], "docs/1-batch", ["T6"]]],
        );
        assert.deepEqual(
            plan.refused.map((r) => [r.branch, r.reason.split(" (")[0]]),
            [
                ["docs/3-c", "open pull request #88"],
                ["fix/4-d", "a red-master fix"],
                ["docs/5-e", "running"],
                ["docs/6-f", "its tip is not its ready marker's commit"],
            ],
        );
        assert.match(
            combineLines(plan)[0],
            /^family docs #1 #2 -- branches docs\/1-a docs\/2-b; links .*T6 \(design\/ui\)/,
        );
    });

    it("keeps owner-guarded branches apart from the rest, links source only by origin or a judged test, within the cap", () => {
        const l = fresh();
        const low = factsOf(Object.fromEntries(Array.from({ length: 30 }, (_, k) => [k + 1, ["effort:low"]])));
        ready_(l, 1, [], "docs/1-a", ["visual-review/README.md"], low);
        ready_(l, 2, [], "docs/2-b", ["visual-review/notes.md"], low);
        ready_(l, 3, [], "docs/3-c", ["visual-review/x.md"], low);
        ready_(l, 10, [{ n: 11, test: "T3" }], "fix/10-a", ["layout/src/a.ts"], low);
        ready_(l, 12, [{ n: 13, test: "T3" }], "fix/12-b", ["layout/src/a.ts"], low);
        ready_(l, 14, [], "fix/14-c", ["layout/src/a.ts"], low);
        ready_(l, 20, [], "fix/20-d", ["algorithms/src/z.ts"], low);
        const diffs = Object.fromEntries(l.groups.map((g) => [g.branch, g.files]));
        diffs["docs/3-c"] = ["visual-review/x.md", "tools/pr-open.sh"];
        const guard = /^(visual-review\/|tools\/pr-open\.sh$)/;
        diffs["docs/1-a"] = ["visual-review/README.md"];
        diffs["docs/2-b"] = ["graphty/README.md", "visual-review/notes.md"];
        const unguarded = { ...diffs, "docs/2-b": ["visual-review/notes.md"] };
        const all = combinePlan(l, factsFor(l, unguarded), { guard: null });
        assert.deepEqual(all.families[0].branches, ["docs/1-a", "docs/2-b"], "3-c is source (it changes a script)");
        const plan = combinePlan(l, factsFor(l, diffs), {
            guard,
            links: [
                { a: 10, b: 12, test: "T3" },
                { a: 12, b: 14, test: "T3" },
            ],
        });
        assert.deepEqual(
            plan.families.map((f) => [f.class, f.branches]),
            [
                ["docs", ["docs/1-a", "docs/2-b"]],
                ["source", ["fix/10-a", "fix/12-b"]],
            ],
            "all guarded docs combine; fix/14-c would be a fifth issue in a source family (cap 4)",
        );
        assert.deepEqual(
            plan.judge.map((j) => [j.a, j.b]),
            [
                ["fix/10-a", "fix/14-c"],
                ["fix/12-b", "fix/14-c"],
            ],
        );
        const same = { ...diffs, "docs/1-a": ["design/ui/secret.md"], "docs/2-b": ["design/ui/b.md"] };
        const apart = combinePlan(l, factsFor(l, same), { guard: /secret\.md$/ });
        assert.ok(
            !apart.families.some((f) => f.branches.includes("docs/1-a")),
            "an unguarded branch never joins a guarded one",
        );
        assert.deepEqual(combinePlan(l, factsFor(l, same), { guard: /^none$/ }).families[0].branches, [
            "docs/1-a",
            "docs/2-b",
        ]);
    });

    it("refuses owner-only members, matches a red fix's branch exactly, and never names a family after a member", () => {
        const l = fresh();
        ready_(l, 1, [], "docs/1-batch", ["design/ui/a.md"]);
        ready_(l, 4, [], "docs/4-d", ["design/ui/d.md"]);
        ready_(l, 5, [], "docs/5-e", ["design/ui/e.md"]);
        ready_(l, 6, [], "docs/6-f", ["design/ui/f.md"]);
        const diffs = Object.fromEntries(l.groups.map((g) => [g.branch, g.files]));
        const facts = factsFor(l, diffs, {});
        const redFix = "pipeline-round: taken by session s, branch docs/4-d2, worktree w -- fixes the red: x";
        facts.issues.get(4).comments.unshift(comment(0, redFix));
        facts.issues.get(5).labels.push("needs-decision");
        const plan = combinePlan(l, facts, {});
        assert.deepEqual(
            plan.refused.map((r) => [r.branch, r.reason]),
            [["docs/5-e", "#5: X3 owner-only (label needs-decision)"]],
        );
        assert.deepEqual(
            plan.families.map((f) => [f.branches, f.branch]),
            [[["docs/1-batch", "docs/4-d", "docs/6-f"], "docs/1-batch-2"]],
        );
    });

    it("links branches cut from one ledger group without a judged test", () => {
        const l = fresh();
        make(l, 1, [{ n: 2, test: "T3" }]);
        start(l, "g1", "fix/1-a", NOW, [1]);
        start(l, "g1", "fix/2-b", NOW, [2]);
        for (const g of l.groups) ready(l, g.id, `sha${g.lead}`, NOW);
        const plan = combinePlan(l, factsFor(l, { "fix/1-a": ["x/src/a.ts"], "fix/2-b": ["y/src/b.ts"] }), {});
        assert.deepEqual(
            plan.families[0].links.map((x) => x.test),
            ["same group"],
        );
    });

    it("runs from the command line with GitHub and git answers", () => {
        const dir = tempDir();
        const ledgerPath = join(dir, "groups.json");
        mutate(ledgerPath, (l) => {
            ready_(l, 1, [], "docs/1-a", ["design/ui/a.md"]);
            ready_(l, 2, [], "docs/2-b", ["design/ui/b.md"]);
        });
        const run = (query) => {
            const repository = {};
            for (const [, n] of query.matchAll(/i(\d+): /g)) {
                const body = `pipeline-round: ready docs/${n}-${n === "1" ? "a" : "b"} sha${n}`;
                repository[`i${n}`] = {
                    number: Number(n),
                    state: "OPEN",
                    labels: { nodes: [] },
                    comments: { nodes: [comment(Number(n), body)] },
                };
            }
            for (const [, k] of query.matchAll(/b(\d+): ref/g))
                repository[`b${k}`] = { associatedPullRequests: { nodes: [] } };
            return { repository };
        };
        const git = { tip: (b) => `sha${/\/(\d+)-/.exec(b)[1]}`, diff: (b) => [`design/ui/${b.at(-1)}.md`] };
        const out = main(["combine-plan"], { ledgerPath, run, git, guard: () => /^visual-review\//, now: NOW }).out;
        assert.match(out, /^family docs #1 #2 -- branches docs\/1-a docs\/2-b/m);
        assert.match(out, /1 families, 2 branches$/);
        assert.match(
            main(["combine-plan", "--link", "1:2:same"], { ledgerPath, run, git, now: NOW }).out,
            /test must be/,
        );
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
        assert.ok(metrics(l, many, NOW).breaches.includes("75th percentile hours to merge, grouped, source"));
        // a grouped pull request counts under its group's class; one outside the ledger counts as source
        const d = createGroup(l, {
            lead: 30,
            members: [{ n: 31, test: "T6" }],
            why: "x",
            files: ["a/b.md"],
            now: NOW,
            facts: factsOf(),
        });
        freeze(l, d.id, 200, NOW);
        const byClass = metrics(l, [pr(200, 2, 1), pr(201, 2, 1)], NOW).byClass;
        assert.deepEqual([byClass.docs.n, byClass.tests.n, byClass.source.n], [1, 0, 1]);
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
                jobs: [
                    {
                        issues: [2, 1],
                        why: "T5",
                        files: ["d.md"],
                        members: [{ n: 1, test: "T5", why: "#1 rewrites the same section of d.md" }],
                    },
                ],
            }),
        );
        assert.match(main(["import-scan", scan], { ledgerPath, now: NOW }).out, /imported 1 proposed groups, 2 issues/);
        const out = main(["jobs"], { ledgerPath, now: NOW, fetchQueue: () => q([1, "high"], [2, "high"]) }).out;
        assert.match(out, /^job #1 #2 high g2 tests 1:T5 2:lead -- T5; files d\.md$/m);
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
