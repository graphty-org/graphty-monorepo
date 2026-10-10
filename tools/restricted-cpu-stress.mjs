#!/usr/bin/env node
/**
 * restricted-cpu-stress.mjs -- files the findings of the weekly restricted-CPU stress run
 * (.github/workflows/restricted-cpu-stress.yml) as issues in the flaky-test tracker's format.
 *
 * Every vitest run in CI writes test-results/junit-<package>-<pid>.xml (vitest.ci-junit.mjs). The
 * workflow uploads each shard's files as the artifact junit-<shard> and downloads them all into one
 * directory; this script reads every failing or timed-out test from them and files one issue per
 * test, or comments on the one it filed before. An issue is found again by the tracker's marker line
 * (githerd/lib/flakes.mjs on feat/githerd: `githerd-flaky-test: <package>/<file> > <test>`), so the
 * tracker and this run share one issue per test. These issues say "load-sensitive under restricted
 * CPU", not "proven flaky": the run only shows that the test fails when CPU is scarce.
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
/** More failing tests than this means the restriction is too tight or the suite is broken: file nothing. */
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
 * The failing tests of one vitest junit report: a testcase with a failure child (an assertion, a
 * timeout, a failing hook or a file that failed to load).
 * @param xml - the report
 * @param pkg - the package directory, which the test's id starts with
 * @param shard - the shard that ran it
 * @returns each failing test: its tracker id, package, file, name, shard and failure output
 */
export function junitFailures(xml, pkg, shard) {
    const out = [];
    for (const suite of xml.split("<testsuite ").slice(1)) {
        const file = `${pkg}/${attr(suite.slice(0, suite.indexOf(">")), "name")}`;
        for (const m of suite.matchAll(/<testcase\s([^>]*)>([\s\S]*?)<\/testcase>/g)) {
            const failures = [...m[2].matchAll(/<failure\s([^>]*)>([\s\S]*?)<\/failure>/g)];
            if (!failures.length) continue;
            const name = attr(m[1], "name");
            const output = failures
                .map((f) => unescapeXml(f[2].trim()) || attr(f[1], "message") || "(no message)")
                .join("\n\n");
            out.push({ id: `${file} > ${name}`, package: pkg, file, name, shard, output });
        }
    }
    return out;
}

const fence = (text) => {
    const cut = text.length > OUTPUT_MAX ? `${text.slice(0, OUTPUT_MAX)}\n... (cut)` : text;
    return ["```text", cut.replaceAll("```", "'''"), "```"].join("\n");
};

const occurrence = (t, ctx) =>
    [
        `Failed under restricted CPU in shard \`${t.shard}\`, run ${ctx.runUrl} at ${ctx.sha}.`,
        `Restriction: ${ctx.restriction}`,
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
 * @returns per test, `{create: {title, body, labels}}` or `{issue, reopen, comment}`
 */
export function plan(failures, issues, ctx) {
    const tests = [...new Map(failures.map((t) => [t.id, t])).values()];
    if (tests.length > MAX_FILED) {
        throw new Error(
            `${tests.length} tests failed, over ${MAX_FILED}: the restriction is too tight or the suite is broken; nothing filed`,
        );
    }
    return tests.map((t) => {
        const found = issues.find((i) => !i.pull_request && (i.body ?? "").split("\n").includes(`${MARKER}${t.id}`));
        if (!found) return { create: { title: issueTitle(t), body: issueBody(t, ctx), labels: LABELS } };
        return {
            issue: found.number,
            reopen: found.state === "closed",
            comment: ["Again, load-sensitive under restricted CPU:", "", occurrence(t, ctx)].join("\n"),
        };
    });
}

/**
 * The failing tests of every junit file under a directory; the shard is named by its artifact
 * directory junit-<shard>.
 * @param dir - the directory the artifacts were downloaded into
 * @returns the failing tests
 */
function readFailures(dir) {
    return readdirSync(dir, { recursive: true })
        .map(String)
        .filter((f) => /(^|\/)junit-[^/]*\.xml$/.test(f))
        .flatMap((f) => {
            const shard = basename(dirname(join(dir, f))).replace(/^junit-/, "");
            return junitFailures(readFileSync(join(dir, f), "utf8"), packageOf(f), shard);
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
    const failures = readFailures(dir);
    const issues = failures.length ? await listIssues(request, repo) : [];
    const actions = plan(failures, issues, ctx);
    const lines = [];
    for (const a of actions) {
        if (DRY_RUN === "true") {
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
