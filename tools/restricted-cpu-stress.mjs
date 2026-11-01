#!/usr/bin/env node
/**
 * restricted-cpu-stress.mjs -- files the findings of the weekly restricted-CPU stress run
 * (.github/workflows/restricted-cpu-stress.yml) as issues in the flaky-test tracker's format.
 *
 * Every vitest run in CI writes test-results/junit-<package>-<pid>.xml (vitest.ci-junit.mjs). The
 * workflow uploads each shard's files as the artifact junit-<shard>-r<repeat> and downloads them all into one
 * directory; this script reads every failing or timed-out test from them and files one issue per
 * test, or comments on the one it filed before. An issue is found again by the tracker's marker line
 * (githerd/lib/flakes.mjs on feat/githerd: `githerd-flaky-test: <package>/<file> > <test>`), so the
 * tracker and this run share one issue per test. These issues say "load-sensitive under restricted
 * CPU", not "proven flaky": the run only shows that the test fails when CPU is scarce.
 * The browser and story shards run several times on the same commit; an issue says when a test both
 * failed and passed there (a race), or failed every time.
 *
 * Usage: node tools/restricted-cpu-stress.mjs <junit dir>
 *   env GITHUB_TOKEN, GITHUB_REPOSITORY, RESTRICTION (the restriction, in words), RUN_URL, SHA,
 *   DRY_RUN=true to print what it would file and write nothing.
 */

import { readdirSync, readFileSync, appendFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** The tracker's marker line prefix (githerd/lib/flakes.mjs MARKER). */
export const MARKER = "githerd-flaky-test: ";
/** The tracker's labels, at the lowest priority: the tracker raises priority, never lowers it. */
export const LABELS = ["bug", "intermittent", "effort:medium", "priority:low"];
/**
 * A test that failed and passed on the same commit is flaky, not only slow: the repository files those at
 * priority:critical (CLAUDE.md, "Quarantined tests"), as tools/test-quarantine.mjs does.
 */
export const RACE_LABELS = ["bug", "intermittent", "effort:medium", "priority:critical"];
/** More failing tests than this in one file means that file is broken, not load-sensitive: report it, file none of its tests. */
export const MAX_FILED = 25;
const OUTPUT_MAX = 3000;

const unescapeXml = (s) =>
    s
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&apos;", "'")
        .replaceAll("&amp;", "&");
const attr = (attrs, name) => {
    const m = new RegExp(String.raw`(?:^|\s)${name}="([^"]*)"`).exec(attrs);
    return m ? unescapeXml(m[1]) : null;
};

/**
 * The package a junit file belongs to: vitest.ci-junit.mjs names it junit-<package dir>-<pid>.xml.
 * @param path - the file
 * @returns the package directory
 */
export const packageOf = (path) =>
    basename(path)
        .replace(/^junit-/, "")
        .replace(/-\d+\.xml$/, "");

/**
 * Every test one vitest junit report ran, failed or passed; a skipped test is left out. A failed test
 * has a failure child (an assertion, a timeout, a failing hook or a file that failed to load).
 * @param xml - the report
 * @param pkg - the package directory, which the test's id starts with
 * @param shard - the shard that ran it
 * @returns each test: its tracker id, package, file, name, shard, whether it failed, and its failure output
 */
export function junitTests(xml, pkg, shard) {
    const out = [];
    for (const suite of xml.split("<testsuite ").slice(1)) {
        const file = `${pkg}/${attr(suite.slice(0, suite.indexOf(">")), "name")}`;
        for (const m of suite.matchAll(/<testcase\s([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
            const inner = m[2] ?? "";
            if (inner.includes("<skipped")) continue;
            const failures = [...inner.matchAll(/<failure\s([^>]*)>([\s\S]*?)<\/failure>/g)];
            const name = attr(m[1], "name");
            const output = failures
                .map((f) => unescapeXml(f[2].trim()) || attr(f[1], "message") || "(no message)")
                .join("\n\n");
            out.push({ id: `${file} > ${name}`, package: pkg, file, name, shard, failed: failures.length > 0, output });
        }
    }
    return out;
}

/**
 * The failing tests of one vitest junit report.
 * @param xml - the report
 * @param pkg - the package directory
 * @param shard - the shard that ran it
 * @returns each failing test, as junitTests() returns it
 */
export const junitFailures = (xml, pkg, shard) => junitTests(xml, pkg, shard).filter((t) => t.failed);

/**
 * The failing runs, each with how often its test ran and failed on this commit. The workflow runs every
 * browser and story shard several times (REPEATS), and tools/test-quarantine.mjs retries a failed file
 * once, so one test runs several times; a test that both failed and passed differed on the same commit.
 * @param tests - every test run, from junitTests() over every report
 * @returns the failing runs, each with `runs` (how often the test ran) and `fails` (how often it failed)
 */
export function tally(tests) {
    const byId = Map.groupBy(tests, (t) => t.id);
    return tests
        .filter((t) => t.failed)
        .map((t) => ({ ...t, runs: byId.get(t.id).length, fails: byId.get(t.id).filter((x) => x.failed).length }));
}

const fence = (text) => {
    const cut = text.length > OUTPUT_MAX ? `${text.slice(0, OUTPUT_MAX)}\n... (cut)` : text;
    return ["```text", cut.replaceAll("```", "'''"), "```"].join("\n");
};

/**
 * How the test's runs on this commit went: nothing without a tally, else one line.
 * @param t - the failing test, with `runs` and `fails` from tally()
 * @returns the lines
 */
const outcomes = (t) => {
    if (!t.runs) return [];
    if (t.fails < t.runs)
        return [
            `Outcomes differed on the same commit: failed ${t.fails} of ${t.runs} runs (repeats and retries), ` +
                "so this is a race, not only slowness.",
        ];
    return [`Failed all ${t.runs} of its runs on this commit.`];
};

const occurrence = (t, ctx) =>
    [
        `Failed under restricted CPU in shard \`${t.shard}\`, run ${ctx.runUrl} at ${ctx.sha}.`,
        `Restriction: ${ctx.restriction}`,
        ...outcomes(t),
        "",
        fence(t.output),
    ].join("\n");

/**
 * The new issue's title: the tracker's shape, with this source's word.
 * @param t - the failing test
 * @returns the title
 */
const issueTitle = (t) => `Load-sensitive test: ${t.name} (${t.package})`.slice(0, 250);

/**
 * The new issue's body, ending in the tracker's marker line.
 * @param t - the failing test
 * @param ctx - the run: restriction, runUrl, sha
 * @returns the body
 */
export const issueBody = (t, ctx) =>
    [
        `\`${t.file}\` > ${t.name} fails when CPU is scarce.`,
        "",
        "Source: load-sensitive under restricted CPU (the weekly restricted-CPU stress run), not proven flaky. " +
            "The test failed with the shard confined to a fixed CPU quota on a GitHub-hosted runner; a healthy " +
            "test passes there too. It needs a fix that does not depend on how fast the machine is.",
        "",
        occurrence(t, ctx),
        "",
        "The weekly restricted-CPU stress run files and updates this issue (.github/workflows/restricted-cpu-stress.yml).",
        "",
        `${MARKER}${t.id}`,
    ].join("\n");

/**
 * What to write: one action per failing test, against the issues that already carry its marker.
 * @param failures - the failing tests from junitFailures (duplicates allowed)
 * @param issues - the issues labelled intermittent, as the REST API lists them
 * @param ctx - the run: restriction, runUrl, sha
 * @returns per broken file (over MAX_FILED failing tests), `{suiteBroken: {package, file, count}}`; per other
 *   test, `{create: {title, body, labels}}` or `{issue, reopen, comment}`
 */
export function plan(failures, issues, ctx) {
    const byFile = Map.groupBy(new Map(failures.map((t) => [t.id, t])).values(), (t) => `${t.package}/${t.file}`);
    const broken = [...byFile.values()].filter((ts) => ts.length > MAX_FILED);
    const tests = [...byFile.values()].filter((ts) => ts.length <= MAX_FILED).flat();
    const suiteBroken = broken.map(([t, ...rest]) => ({
        suiteBroken: { package: t.package, file: t.file, count: rest.length + 1 },
    }));
    const filed = tests.map((t) => {
        const found = issues.find((i) => !i.pull_request && (i.body ?? "").split("\n").includes(`${MARKER}${t.id}`));
        const labels = t.fails < t.runs ? RACE_LABELS : LABELS;
        if (!found) return { create: { title: issueTitle(t), body: issueBody(t, ctx), labels } };
        return {
            issue: found.number,
            reopen: found.state === "closed",
            comment: ["Again, load-sensitive under restricted CPU:", "", occurrence(t, ctx)].join("\n"),
        };
    });
    return [...suiteBroken, ...filed];
}

/**
 * Every test run of every junit file under a directory; the shard is named by its artifact
 * directory junit-<shard>-r<repeat>.
 * @param dir - the directory the artifacts were downloaded into
 * @returns every test run
 */
function readTests(dir) {
    return readdirSync(dir, { recursive: true })
        .map(String)
        .filter((f) => /(^|\/)junit-[^/]*\.xml$/.test(f))
        .flatMap((f) => {
            const shard = basename(dirname(join(dir, f))).replace(/^junit-/, "");
            return junitTests(readFileSync(join(dir, f), "utf8"), packageOf(f), shard);
        });
}

/**
 * Every issue labelled intermittent, the tracker's own lookup, a page of 100 at a time.
 * @param request - the GitHub REST client
 * @param repo - `owner/name`
 * @returns the issues
 */
async function listIssues(request, repo) {
    const issues = [];
    for (let page = 1; ; page++) {
        const got = await request(
            "GET",
            `/repos/${repo}/issues?labels=intermittent&state=all&per_page=100&page=${page}`,
        );
        issues.push(...got);
        if (got.length < 100) return issues;
    }
}

/**
 * Performs one planned action.
 * @param a - the action from plan()
 * @param request - the GitHub REST client
 * @param repo - `owner/name`
 * @returns what it did, as a line
 */
async function perform(a, request, repo) {
    if (a.create) {
        const made = await request("POST", `/repos/${repo}/issues`, a.create);
        return `filed #${made.number}: ${a.create.title}`;
    }
    if (a.reopen) await request("PATCH", `/repos/${repo}/issues/${a.issue}`, { state: "open" });
    await request("POST", `/repos/${repo}/issues/${a.issue}/comments`, { body: a.comment });
    const reopened = a.reopen ? " (reopened)" : "";
    return `commented on #${a.issue}${reopened}`;
}

async function main() {
    const [dir] = process.argv.slice(2);
    const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, DRY_RUN, GITHUB_STEP_SUMMARY } = process.env;
    const ctx = { restriction: process.env.RESTRICTION, runUrl: process.env.RUN_URL, sha: process.env.SHA };
    const request = async (method, path, body) => {
        const res = await fetch(`https://api.github.com${path}`, {
            method,
            headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" },
            body: body && JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
        return res.json();
    };
    const failures = tally(readTests(dir));
    const issues = failures.length ? await listIssues(request, repo) : [];
    const actions = plan(failures, issues, ctx);
    const lines = [];
    for (const a of actions) {
        if (a.suiteBroken) {
            const b = a.suiteBroken;
            lines.push(`suite broken, nothing filed: ${b.package}/${b.file} (${b.count} tests failed)`);
        } else if (DRY_RUN === "true") {
            lines.push(a.create ? `would file: ${a.create.title}` : `would comment on #${a.issue}`);
        } else {
            lines.push(await perform(a, request, repo));
        }
    }
    if (!actions.length) lines.push("No test failed under the restriction.");
    console.log(lines.join("\n"));
    const summary = lines.map((l) => "- " + l).join("\n");
    if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, summary + "\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await main();
}
