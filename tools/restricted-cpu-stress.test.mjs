// Tests of tools/restricted-cpu-stress.mjs and its workflow: reading vitest's junit report, the issue
// in the flaky-test tracker's format, finding an earlier issue by its marker line, and that the
// workflow never gates anything.
//
//   node tools/restricted-cpu-stress.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
    issueBody,
    junitFailures,
    junitTests,
    LABELS,
    MARKER,
    MAX_FILED,
    packageOf,
    plan,
    RACE_LABELS,
    tally,
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

    it("gives a run-specific report and its .retry twin one key (issue #5640)", () => {
        const run = "junit-graph-io-storybook-r1/junit-graph-io-1793531502638-55006-graph-io-storybook-4242.xml";
        const retry =
            "junit-graph-io-storybook-r2/junit-graph-io-1793531554302-55263-graph-io-storybook.retry-4243.xml";
        const xml = XML.replace('name="test/a.test.ts"', 'name="fidelity-stories/stories/Matched.stories.ts"');
        const [a] = junitFailures(xml, packageOf(run), "graph-io-storybook");
        const [b] = junitFailures(xml, packageOf(retry), "graph-io-storybook");
        assert.equal(a.id, 'graph-io/fidelity-stories/stories/Matched.stories.ts > reader > parses "x"');
        assert.equal(b.id, a.id);
        const [made] = plan([a], [], CTX);
        assert.equal(made.create.title, 'Load-sensitive test: reader > parses "x" (graph-io)');
        assert.deepEqual(plan([b], [{ number: 5443, state: "open", body: made.create.body }], CTX)[0].issue, 5443);
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

describe("repeats on the same commit", () => {
    const passing = XML.replaceAll(/<failure[\s\S]*?<\/failure>/g, "");

    it("reads passed tests too, a self-closing testcase among them, and leaves skipped ones out", () => {
        const xml = passing.replace(
            "</testsuite>",
            '<testcase classname="c" name="short" time="0"/><testcase classname="c" name="skip" time="0"><skipped/></testcase></testsuite>',
        );
        const got = junitTests(xml, "graph-io", "s");
        assert.deepEqual(
            got.map((t) => [t.name, t.failed]),
            [
                ['reader > parses "x"', false],
                ["reader > passes", false],
                ["short", false],
                ["b", false],
            ],
        );
        assert.deepEqual(
            junitTests(XML, "graph-io", "s").map((t) => t.failed),
            [true, false, true],
        );
    });

    it("counts how often each failing test ran and failed across the repeats", () => {
        const runs = [
            ...junitTests(XML, "graph-io", "small-browser-r1"),
            ...junitTests(passing, "graph-io", "small-browser-r2"),
            ...junitTests(XML.replace(/<failure[\s\S]*?<\/failure>/, ""), "graph-io", "small-browser-r3"),
        ];
        const got = tally(runs);
        assert.deepEqual(
            got.map((t) => [t.name, t.shard, t.fails, t.runs]),
            [
                ['reader > parses "x"', "small-browser-r1", 1, 3],
                ["b", "small-browser-r1", 2, 3],
                ["b", "small-browser-r3", 2, 3],
            ],
        );
    });

    it("says a test whose outcomes differed is a race, and one that always failed failed every run", () => {
        const [raced, , always] = tally([
            ...junitTests(XML, "graph-io", "r1"),
            ...junitTests(passing, "graph-io", "r2"),
        ]).concat(tally(junitTests(XML, "graph-io", "r1")));
        assert.match(issueBody(raced, CTX), /Outcomes differed on the same commit: failed 1 of 2 runs .*a race/);
        assert.match(issueBody(always, CTX), /Failed all 1 of its runs on this commit\./);
        const [a] = plan([raced], [{ number: 9, state: "open", body: `${MARKER}${raced.id}` }], CTX);
        assert.match(a.comment, /Outcomes differed on the same commit/);
        assert.deepEqual(plan([raced], [], CTX)[0].create.labels, RACE_LABELS);
        assert.ok(RACE_LABELS.includes("priority:critical"));
        assert.deepEqual(plan([always], [], CTX)[0].create.labels, LABELS);
        // a test without a tally (no repeats read) says neither
        const [plain] = junitFailures(XML, "graph-io", "s");
        assert.doesNotMatch(issueBody(plain, CTX), /Outcomes differed|Failed all/);
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

    it("reports a file with more failing tests than a load-sensitive test explains as suite broken", () => {
        const many = Array.from({ length: MAX_FILED + 2 }, (_, i) => ({
            ...t,
            file: "test/b.test.ts",
            id: `x > ${i}`,
        }));
        const actions = plan([...many, t], [], CTX);
        assert.deepEqual(actions[0], {
            suiteBroken: { package: "graph-io", file: "test/b.test.ts", count: MAX_FILED + 2 },
        });
        assert.equal(actions.length, 2);
        assert.equal(actions[1].create.title, 'Load-sensitive test: reader > parses "x" (graph-io)');
        assert.equal(plan(many.slice(2), [], CTX).length, MAX_FILED);
    });
});

describe("the workflow", () => {
    const text = readFileSync(new URL("../.github/workflows/restricted-cpu-stress.yml", import.meta.url), "utf8");
    const code = text.replace(/^\s*#.*$/gm, "");

    it("runs only weekly and on dispatch", () => {
        const on = code.slice(code.indexOf("\non:"), code.indexOf("\npermissions:"));
        assert.match(on, /schedule:/);
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

    it("repeats every browser and story shard in its own job, and keeps each repeat's artifact and record apart", () => {
        assert.match(code, /REPEATS: "3"/);
        assert.match(
            code,
            /range\(1; \(if \$s\["needs-browser"\] then \$n else 1 end\) \+ 1\) \| \$s \+ \{repeat: \.\}/,
        );
        assert.match(code, /name: Restricted CPU \(\$\{\{ matrix\.shard \}\}, repeat \$\{\{ matrix\.repeat \}\}\)/);
        assert.match(code, /name: junit-\$\{\{ matrix\.shard \}\}-r\$\{\{ matrix\.repeat \}\}/);
        assert.match(code, /RESULTS_REPEAT: \$\{\{ matrix\.repeat \}\}/);
        // the screenshot capture is never repeated here
        assert.doesNotMatch(code, /visual-review|capture/);
    });

    it("files nothing from a dispatch on a branch", () => {
        assert.match(code, /DRY_RUN: \$\{\{ inputs\.dry-run \|\| github\.ref != 'refs\/heads\/master' \}\}/);
    });
});
