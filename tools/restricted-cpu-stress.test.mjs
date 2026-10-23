// Tests of tools/restricted-cpu-stress.mjs and its workflow: reading vitest's junit report, the issue
// in the flaky-test tracker's format, finding an earlier issue by its marker line, and that the
// workflow never gates anything.
//
//   node tools/restricted-cpu-stress.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { plan as ciPlan, SHARDS } from "./ci-test-matrix.mjs";
import {
    huntMatrix,
    issueBody,
    junitFailures,
    LABELS,
    MARKER,
    MAX_FILED,
    packageOf,
    plan,
    REPEAT,
    SOURCES,
} from "./restricted-cpu-stress.mjs";

// The shape vitest 3.2's junit reporter writes: attributes escaped, one testcase per test, the suite
// chain joined with " > ", a failure child for a failed test.
const XML = `<?xml version="1.0" encoding="UTF-8" ?>
<testsuites name="vitest tests" tests="3" failures="2" errors="0" time="4.2">
    <testsuite name="test/a.test.ts" timestamp="t" hostname="h" tests="2" failures="1" errors="0" skipped="0" time="1">
        <testcase classname="test/a.test.ts" name="reader &gt; parses &quot;x&quot;" time="0.1">
            <failure message="Test timed out in 5000ms." type="Error">
Error: Test timed out in 5000ms.
 &#x276F; test/a.test.ts:12:5 &lt;- here
            </failure>
        </testcase>
        <testcase classname="test/a.test.ts" name="reader &gt; passes" time="0.01">
        </testcase>
    </testsuite>
    <testsuite name="test/b.test.ts" timestamp="t" hostname="h" tests="1" failures="1" errors="0" skipped="0" time="1">
        <testcase classname="no-subgroups/test/b.test.ts" name="b" time="0.2">
            <failure message="expected 1 to be 2" type="AssertionError">
            </failure>
        </testcase>
    </testsuite>
</testsuites>`;

const CTX = { restriction: "2 CPUs of 4", runUrl: "https://example.invalid/run/1", sha: "abc123" };

describe("reading the junit report", () => {
    it("names the package from vitest.ci-junit.mjs's file name", () => {
        assert.equal(packageOf("junit-small-node/junit-graph-io-1234.xml"), "graph-io");
        assert.equal(packageOf("junit-graphty-element-77.xml"), "graphty-element");
    });

    it("returns each failing test with the tracker's id: package, file and suite chain", () => {
        const got = junitFailures(XML, "graph-io", "small-node");
        assert.deepEqual(
            got.map((t) => t.id),
            ['graph-io/test/a.test.ts > reader > parses "x"', "graph-io/test/b.test.ts > b"],
        );
        assert.match(got[0].output, /Test timed out in 5000ms\.\n.*test\/a\.test\.ts:12:5 <- here/);
        // an empty failure body falls back to the message
        assert.equal(got[1].output, "expected 1 to be 2");
        assert.equal(got[0].shard, "small-node");
    });

    it("returns nothing for a report with no failure", () => {
        assert.deepEqual(junitFailures(XML.replaceAll(/<failure[\s\S]*?<\/failure>/g, ""), "x", "s"), []);
    });
});

describe("the issues", () => {
    const [t] = junitFailures(XML, "graph-io", "small-node");

    it("files a new test in the tracker's format, marked as load-sensitive and not proven flaky", () => {
        const [a] = plan([t], [], CTX);
        assert.equal(a.create.title, 'Load-sensitive test: reader > parses "x" (graph-io)');
        assert.deepEqual(a.create.labels, LABELS);
        for (const l of ["bug", "intermittent", "priority:low"]) assert.ok(LABELS.includes(l), l);
        assert.ok(LABELS.some((l) => l.startsWith("effort:")));
        const body = a.create.body;
        assert.ok(body.split("\n").includes(`${MARKER}${t.id}`), "the marker line");
        assert.ok(body.endsWith(`${MARKER}${t.id}`));
        assert.match(body, /load-sensitive under restricted CPU .*not proven flaky/);
        assert.match(body, /Restriction: 2 CPUs of 4/);
        assert.match(body, /Test timed out in 5000ms/);
        assert.match(body, /abc123/);
    });

    it("comments on the issue that already carries the marker, reopening a closed one", () => {
        const issues = [
            { number: 5, state: "open", body: `x\n${MARKER}${t.id} and more` },
            { number: 6, state: "closed", body: `x\n${MARKER}${t.id}` },
            { number: 7, state: "open", body: `${MARKER}${t.id}`, pull_request: {} },
        ];
        const [a] = plan([t, t], issues, CTX);
        assert.equal(a.issue, 6);
        assert.equal(a.reopen, true);
        assert.match(a.comment, /^Again, load-sensitive under restricted CPU/);
        assert.match(a.comment, /Restriction: 2 CPUs of 4/);
    });

    it("keeps a stray code fence in the output from closing the block", () => {
        const body = issueBody({ ...t, output: "a\n```\nb" }, CTX);
        assert.equal(body.match(/```/g).length, 2);
    });

    it("files nothing when more tests fail than a load-sensitive test explains", () => {
        const many = Array.from({ length: MAX_FILED + 1 }, (_, i) => ({ ...t, id: `x > ${i}` }));
        assert.throws(() => plan(many, [], CTX), /nothing filed/);
        assert.equal(plan(many.slice(1), [], CTX).length, MAX_FILED);
    });
});

describe("the nightly flake hunt", () => {
    const [t] = junitFailures(XML, "graph-io", "graphty-1-run2");
    const HUNT = { source: "hunt", restriction: "", runUrl: "https://example.invalid/run/2", sha: "def456" };

    it("files a CI failure as intermittent at priority:high, with no restriction line", () => {
        const [a] = plan([t], [], HUNT);
        assert.equal(a.create.title, 'Intermittent test: reader > parses "x" (graph-io)');
        assert.deepEqual(a.create.labels, ["bug", "intermittent", "effort:medium", "priority:high"]);
        assert.match(a.create.body, /nightly flake hunt/);
        assert.doesNotMatch(a.create.body, /Restriction:|load-sensitive/);
        assert.match(a.create.body, /shard `graphty-1-run2`/);
        assert.ok(a.create.body.endsWith(`${MARKER}${t.id}`), "the tracker's marker, shared with the stress run");
    });

    it("comments on the issue the stress run filed for the same test", () => {
        const [a] = plan([t], [{ number: 9, state: "open", body: `${MARKER}${t.id}` }], HUNT);
        assert.equal(a.issue, 9);
        assert.match(a.comment, /^Again, in the nightly flake hunt:/);
    });

    it("runs every browser entry of a full run REPEAT times, and nothing else", () => {
        const full = ciPlan([...new Set(SHARDS.map((s) => s.package))]);
        const browser = full.filter((e) => e["needs-browser"]);
        const got = huntMatrix("hunt");
        assert.equal(REPEAT, 3);
        assert.equal(got.length, browser.length * REPEAT);
        assert.ok(got.every((e) => e["needs-browser"] && e.rep >= 1 && e.rep <= REPEAT));
        // one artifact per job: the workflow names it junit-<shard>-run<rep>
        assert.equal(new Set(got.map((e) => `${e.shard}-run${e.rep}`)).size, got.length);
        assert.ok(
            got.some((e) => e.shard === "small-browser"),
            "the graphty shards run in their group",
        );
        assert.deepEqual(huntMatrix("stress"), full);
    });

    it("has words for every source", () => {
        for (const s of Object.values(SOURCES)) {
            for (const k of ["title", "what", "why", "failed", "again", "by", "labels"]) assert.ok(s[k], k);
        }
    });
});

describe("the workflow", () => {
    const text = readFileSync(new URL("../.github/workflows/restricted-cpu-stress.yml", import.meta.url), "utf8");
    const code = text.replace(/^\s*#.*$/gm, "");

    it("runs only on its two schedules and on dispatch", () => {
        const on = code.slice(code.indexOf("\non:"), code.indexOf("\npermissions:"));
        assert.match(on, /cron: "41 3 \* \* 0"/);
        assert.match(on, /cron: "17 1 \* \* 1-6"/);
        assert.match(on, /workflow_dispatch:/);
        assert.doesNotMatch(on, /pull_request|push:|merge_group|workflow_call|workflow_run/);
    });

    it("is awaited by nothing: no other workflow names it", () => {
        const name = /^name: (.+)$/m.exec(text)[1];
        const dir = new URL("../.github/workflows/", import.meta.url);
        for (const f of readdirSync(dir).filter((x) => x.endsWith(".yml") && x !== "restricted-cpu-stress.yml")) {
            const other = readFileSync(new URL(f, dir), "utf8");
            assert.ok(!other.includes("restricted-cpu-stress") && !other.includes(name), f);
        }
        // githerd's flaky-test tracker reads "Test (...)" jobs as occurrences; these are not
        assert.doesNotMatch(code, /name: Test \(/);
    });

    it("reads every shard from tools/ci-test-matrix.mjs and never lets a failing shard stop the run", () => {
        assert.match(code, /node tools\/ci-test-matrix\.mjs "\$all" "\$all"/);
        assert.match(code, /continue-on-error: true\n\s+run: \|/);
        assert.match(code, /cpu\.max/);
    });

    // The build job's first step, run here under bash with each trigger's inputs.
    it("picks stress for the Sunday schedule and hunt on golden for the nightly one", () => {
        const step = /- name: Pick the run\n\s+id: pick\n\s+run: \|\n([\s\S]*?)\n\s+env:/.exec(text)[1];
        const script = step.replaceAll(/^ {18}/gm, "");
        const pick = (env) => {
            const out = join(mkdtempSync(join(tmpdir(), "pick-")), "out");
            execFileSync("bash", ["-c", script], {
                env: {
                    PATH: process.env.PATH,
                    GITHUB_OUTPUT: out,
                    SCHEDULE: "",
                    INPUT_MODE: "",
                    INPUT_REF: "",
                    ...env,
                },
            });
            return Object.fromEntries(
                readFileSync(out, "utf8")
                    .trim()
                    .split("\n")
                    .map((l) => l.split("=")),
            );
        };
        assert.deepEqual(pick({ SCHEDULE: "41 3 * * 0" }), { mode: "stress", ref: "" });
        assert.deepEqual(pick({ SCHEDULE: "17 1 * * 1-6" }), { mode: "hunt", ref: "golden" });
        assert.deepEqual(pick({ INPUT_MODE: "hunt", INPUT_REF: "abc" }), { mode: "hunt", ref: "abc" });
        assert.deepEqual(pick({ INPUT_MODE: "stress" }), { mode: "stress", ref: "" });
        // every scheduled cron is one the pick step knows
        assert.ok(text.includes('"41 3 * * 0"') && text.includes('cron: "17 1 * * 1-6"'));
    });

    it("tests one commit in every job and quotas only the stress run", () => {
        assert.equal(code.match(/ref: \$\{\{ needs\.build\.outputs\.sha \}\}/g).length, 2);
        assert.match(code, /if \[ "\$MODE" = hunt \]; then[\s\S]*?exit "\$status"\n\s+fi\n\s+\[ "\$\(stat/);
        assert.match(code, /SOURCE: \$\{\{ needs\.build\.outputs\.mode \}\}/);
        assert.match(code, /name: junit-\$\{\{ matrix\.shard \}\}\$\{\{ matrix\.rep && format\('-run\{0\}'/);
    });

    it("files nothing from a dispatch on a branch", () => {
        assert.match(code, /DRY_RUN: \$\{\{ inputs\.dry-run \|\| github\.ref != 'refs\/heads\/master' \}\}/);
    });
});
