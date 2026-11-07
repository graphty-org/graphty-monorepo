#!/usr/bin/env node
/**
 * The ratchet on session readers that do not read the working graph (design/working-graph/design.md
 * section 10, issue #6201).
 *
 * graphty-element/test/contracts/working-graph-readers.test.ts checks that every public session reader
 * reads what the filter and the time window leave shown when `workingGraph` is "visible", unless it
 * is a row of graphty-element/working-graph-baseline.json:
 *
 *   wholeGraph     a reader that reads the whole graph by name (a filter's own conditions, the project
 *                  file, the snapshot), each with its reason
 *   notYetWorking  a reader still to be fixed, each with its reason and #6201
 *
 * The test fails on a stale row; this script keeps both lists from growing. Compared with the merge
 * base with the branch the pull request merges into, it fails when:
 *
 *   - notYetWorking gains a row: fix the reader instead;
 *   - wholeGraph gains a row that no commit of the branch reviews with a
 *     `Whole-Graph-Reader: <Owner.method> -- <why>` trailer;
 *   - a row is malformed: no method, no reason, listed twice, in both lists, or a notYetWorking row not
 *     tied to #6201.
 *
 * Usage: node tools/check-working-graph.mjs              (exit 1 on any of the above)
 *        node tools/check-working-graph.mjs --self-test  (prove each failure fires)
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { pushBaseRef } from "./push-base.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASELINE = "graphty-element/working-graph-baseline.json";
const ISSUE = "#6201";
const TRAILER = "Whole-Graph-Reader";
const LISTS = ["wholeGraph", "notYetWorking"];

/**
 * Rows that do not say what they are or why.
 * @param baseline - the baseline
 * @returns the failure messages
 */
function malformed(baseline) {
    const problems = [];
    const seen = new Map();
    for (const list of LISTS) {
        const rows = baseline[list];
        if (!Array.isArray(rows)) {
            problems.push(`${BASELINE}: list ${list} is missing`);
            continue;
        }
        for (const row of rows) {
            const name = row.method ?? "(no method)";
            if (!/^\w+\.\w+$/.test(row.method ?? "")) problems.push(`${list}: "${name}" is not Owner.method`);
            if (!row.reason?.trim()) problems.push(`${list}: "${name}" has no reason`);
            if (list === "notYetWorking" && row.issue !== ISSUE) problems.push(`${list}: "${name}" must name ${ISSUE}`);
            if (seen.has(name)) problems.push(`${list}: "${name}" is listed twice (also in ${seen.get(name)})`);
            seen.set(name, list);
        }
    }
    return problems;
}

/**
 * Rows the head adds to the base that nothing reviewed.
 * @param base - the baseline on the merge base
 * @param head - the baseline being checked
 * @param reviewed - methods a `Whole-Graph-Reader` trailer of the branch names
 * @returns the failure messages
 */
function gained(base, head, reviewed) {
    const methods = (baseline, list) => new Set((baseline[list] ?? []).map((row) => row.method));
    const added = (list) => [...methods(head, list)].filter((method) => !methods(base, list).has(method));
    return [
        ...added("notYetWorking").map(
            (method) =>
                `notYetWorking: "${method}" is new. The list only shrinks: make the reader read the working graph.`,
        ),
        ...added("wholeGraph")
            .filter((method) => !reviewed.has(method))
            .map(
                (method) =>
                    `wholeGraph: "${method}" is new. A reader of the whole graph needs a reviewed reason: a commit ` +
                    `trailer "${TRAILER}: ${method} -- <why it must see hidden nodes>".`,
            ),
    ];
}

/**
 * Every failure of the ratchet.
 * @param state - what to judge
 * @param state.base - the baseline on the merge base, or undefined before it first landed
 * @param state.head - the baseline in this checkout
 * @param state.reviewed - methods the branch's trailers review
 * @returns the failure messages
 */
function failures({ base, head, reviewed }) {
    return [...malformed(head), ...(base === undefined ? [] : gained(base, head, reviewed))];
}

/**
 * The merge base, the baseline on it, and the methods the branch's trailers review.
 * @param root - the checkout
 * @returns the base baseline (undefined before it first landed) and the reviewed methods
 */
function history(root) {
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
    const { env } = process;
    const ref = env.GITHUB_BASE_REF ? `origin/${env.GITHUB_BASE_REF}` : pushBaseRef({ cwd: root });
    const mergeBase = git("merge-base", "HEAD", ref).trim();
    const trailers = git("log", `--format=%(trailers:key=${TRAILER},valueonly,separator=%x0A)`, `${mergeBase}..HEAD`);
    const reviewed = new Set(
        trailers
            .split("\n")
            .map((line) => line.trim().split(/\s/)[0])
            .filter(Boolean),
    );
    if (git("ls-tree", "--name-only", mergeBase, BASELINE).trim() === "") return { base: undefined, reviewed };
    return { base: JSON.parse(git("show", `${mergeBase}:${BASELINE}`)), reviewed };
}

/** Proves each failure fires. */
function selfTest() {
    const head = {
        wholeGraph: [{ method: "ProjectApi.save", reason: "the project file" }],
        notYetWorking: [{ method: "GraphSession.recommendLayout", reason: "why", issue: ISSUE }],
    };
    const judge = (changes) => failures({ base: head, head, reviewed: new Set(), ...changes });
    const expect = (name, messages, pattern) => {
        if (!messages.some((m) => pattern.test(m))) throw new Error(`self-test ${name}: got ${messages.join("; ")}`);
    };

    if (judge({}).length > 0) throw new Error(`self-test clean: got ${judge({}).join("; ")}`);
    if (judge({ base: undefined }).length > 0) throw new Error("self-test first landing: a missing base must pass");
    const shrunk = { wholeGraph: [], notYetWorking: [] };
    if (judge({ head: shrunk }).length > 0) throw new Error("self-test shrink: removing rows must pass");

    const newWhole = { ...head, wholeGraph: [...head.wholeGraph, { method: "SessionDataApi.nodes", reason: "y" }] };
    expect("unreviewed whole row", judge({ head: newWhole }), /needs a reviewed reason/);
    if (judge({ head: newWhole, reviewed: new Set(["SessionDataApi.nodes"]) }).length > 0) {
        throw new Error("self-test reviewed: a trailer naming the method must pass");
    }
    const newPending = {
        ...head,
        notYetWorking: [...head.notYetWorking, { method: "SessionDataApi.nodes", reason: "y", issue: ISSUE }],
    };
    expect(
        "new notYetWorking row",
        judge({ head: newPending, reviewed: new Set(["SessionDataApi.nodes"]) }),
        /only shrinks/,
    );
    expect("no reason", judge({ head: { ...head, wholeGraph: [{ method: "A.b" }] } }), /no reason/);
    expect("bad method", judge({ head: { ...head, wholeGraph: [{ method: "nodes", reason: "y" }] } }), /Owner\.method/);
    expect(
        "wrong issue",
        judge({ head: { ...head, notYetWorking: [{ method: "A.b", reason: "y" }] } }),
        /must name #6201/,
    );
    expect(
        "repeated",
        judge({ head: { ...head, wholeGraph: [...head.wholeGraph, ...head.wholeGraph] } }),
        /listed twice/,
    );
    expect(
        "in both lists",
        judge({
            head: {
                ...head,
                wholeGraph: [...head.wholeGraph, { method: "GraphSession.recommendLayout", reason: "y" }],
            },
        }),
        /listed twice/,
    );
    expect("missing list", judge({ head: { wholeGraph: [] } }), /is missing/);
    console.log("check-working-graph: self-test passed");
}

if (process.argv[2] === "--self-test") {
    selfTest();
} else {
    const head = JSON.parse(readFileSync(join(ROOT, BASELINE), "utf8"));
    const problems = failures({ head, ...history(ROOT) });
    if (problems.length > 0) {
        for (const problem of problems) console.error(problem);
        console.error(
            `\ncheck-working-graph: ${problems.length} failure(s). Session readers read the working graph (${ISSUE}).`,
        );
        process.exit(1);
    }
    const counts = LISTS.map((list) => `${head[list].length} ${list}`);
    console.log(`check-working-graph: passed; the baseline holds ${counts.join(", ")}`);
}
