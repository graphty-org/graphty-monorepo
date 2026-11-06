#!/usr/bin/env node
/**
 * The ratchet on special style layers (issue #5905). The owner's rule (2026-11-05): "any layer may be
 * deleted or modified in any way. there are NO SPECIAL LAYER."
 *
 * Four checks look for a layer treated differently from the others:
 *
 *   layerOperations  graphty-element/test/contracts/layer-equality.test.ts: every layer takes every operation
 *   panelControls    graphty/src/workspace/style/__tests__/PanelParity.real-element.test.tsx: every row
 *                    has the controls of a layer the reader added
 *   lint             graphty/eslint-rules/no-special-layers.js: code that branches on a layer's identity
 *   api              tools/api-report.mjs: the public API marking a layer as protected or owned
 *
 * What fails today is listed, row by row with its reason, in graphty/special-layers-baseline.json. A
 * check passes only for rows listed there. This script keeps that list shrinking. It fails when:
 *
 *   - the baseline gains a row, or a lint row's count rises, compared with the merge base with the
 *     branch the pull request merges into (no flag or trailer changes that);
 *   - a row is malformed: no reason, or not tied to #5905;
 *   - a lint or api row is stale (the exception is gone but the row remains), or a lint or api
 *     finding is not listed. The rule runs here with inline comments off, so an eslint-disable
 *     hides nothing.
 *
 * The two tests read the same file and fail on their own stale rows, because only running the
 * element and the app can tell.
 *
 * Usage: node tools/check-special-layers.mjs              (exit 1 on any of the above)
 *        node tools/check-special-layers.mjs --self-test  (prove each failure fires)
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import tseslint from "typescript-eslint";

import { createRule } from "../graphty/eslint-rules/no-special-layers.js";
import { specialLayerMarks } from "./api-report.mjs";
import { pushBaseRef } from "./push-base.mjs";
import { scratchWorkspace } from "./scratch-workspace.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASELINE = "graphty/special-layers-baseline.json";
const ISSUE = "#5905";

/** Each section of the baseline and the fields that say which exception a row is. */
const SECTIONS = {
    layerOperations: ["layer", "operation"],
    panelControls: ["row", "control"],
    lint: ["file", "rule", "detail"],
    api: ["mark"],
};

/** The source the lint rule judges: the app, and the element's style code; never tests or stories. */
const LINTED = ["graphty/src/**/*.{ts,tsx}", "graphty-element/src/session/styles/**/*.ts"];
const NOT_LINTED = ["**/__tests__/**", "**/__fixtures__/**", "**/*.test.*", "**/*.stories.*", "**/stories/**"];

/**
 * A row's identity within its section.
 * @param section - the section's name
 * @param row - the row
 * @returns its key
 */
const rowKey = (section, row) => SECTIONS[section].map((field) => row[field]).join(" | ");

/**
 * A section as key -> count: a lint row counts its occurrences, any other row counts once.
 * @param section - the section's name
 * @param baseline - the baseline
 * @returns the rows
 */
const rowsOf = (section, baseline) =>
    new Map((baseline[section] ?? []).map((row) => [rowKey(section, row), row.count ?? 1]));

/**
 * What is wrong with one row.
 * @param section - the section's name
 * @param row - the row
 * @returns the failure messages
 */
function rowProblems(section, row) {
    const key = rowKey(section, row);
    const problems = [];
    if (SECTIONS[section].some((field) => !row[field])) problems.push(`${section}: "${key}" is incomplete`);
    if (!row.reason?.trim()) problems.push(`${section}: "${key}" has no reason`);
    if (row.issue !== ISSUE) problems.push(`${section}: "${key}" must name ${ISSUE}`);
    if (section === "lint" && (row.count ?? 0) <= 0) problems.push(`${section}: "${key}" has no count`);
    return problems;
}

/**
 * Rows that do not say what they are or why.
 * @param baseline - the baseline
 * @returns the failure messages
 */
function malformed(baseline) {
    return Object.keys(SECTIONS).flatMap((section) => {
        const rows = baseline[section];
        if (!Array.isArray(rows)) return [`${BASELINE}: section ${section} is missing`];
        const keys = rows.map((row) => rowKey(section, row));
        const repeated = keys.filter((key, at) => keys.indexOf(key) !== at);
        return [
            ...rows.flatMap((row) => rowProblems(section, row)),
            ...repeated.map((key) => `${section}: "${key}" is listed twice`),
        ];
    });
}

/**
 * Rows the head adds to the base.
 * @param base - the baseline on the merge base
 * @param head - the baseline being checked
 * @returns the failure messages
 */
function gained(base, head) {
    return Object.keys(SECTIONS).flatMap((section) => {
        const before = rowsOf(section, base);
        return [...rowsOf(section, head)]
            .filter(([key, count]) => count > (before.get(key) ?? 0))
            .map(
                ([key]) =>
                    `${section}: "${key}" is new. The baseline only shrinks: fix the code instead of listing it.`,
            );
    });
}

/**
 * What differs between a section and what the code holds now.
 * @param section - the section's name
 * @param baseline - the baseline
 * @param found - key -> how many times the code holds it
 * @returns the failure messages
 */
function drift(section, baseline, found) {
    const listed = rowsOf(section, baseline);
    const unlisted = [...found]
        .filter(([key, count]) => count > (listed.get(key) ?? 0))
        .map(([key, count]) => `${section}: "${key}" occurs ${count} time(s), past what the baseline lists`);
    const stale = [...listed]
        .filter(([key, count]) => (found.get(key) ?? 0) < count)
        .map(([key, count]) => {
            const now = found.get(key) ?? 0;
            return `${section}: "${key}" is stale (listed ${count}, found ${now}): lower or delete the row`;
        });
    return [...unlisted, ...stale];
}

/**
 * Runs the lint rule with nothing excused and inline comments off.
 * @param root - the checkout
 * @returns `file | rule | detail` -> occurrences
 */
async function lintFindings(root) {
    const eslint = new ESLint({
        cwd: root,
        overrideConfigFile: true,
        allowInlineConfig: false,
        warnIgnored: false,
        errorOnUnmatchedPattern: false,
        overrideConfig: [
            { ignores: NOT_LINTED },
            {
                files: ["**/*.ts", "**/*.tsx"],
                languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
                plugins: { graphty: { rules: { "no-special-layers": createRule(() => []) } } },
                rules: { "graphty/no-special-layers": "error" },
            },
        ],
    });
    const found = new Map();
    for (const { filePath, messages } of await eslint.lintFiles(LINTED)) {
        const file = relative(root, filePath).split("\\").join("/");
        for (const { message, fatal } of messages) {
            if (fatal) throw new Error(`${file}: ${message}`);
            const [, rule, detail] = /^\[(\S+) (\S+)\]/.exec(message) ?? [];
            if (!rule) throw new Error(`${file}: unexpected lint message: ${message}`);
            const key = `${file} | ${rule} | ${detail}`;
            found.set(key, (found.get(key) ?? 0) + 1);
        }
    }
    return found;
}

/**
 * Everything the committed API reports mark as special.
 * @param root - the checkout
 * @returns mark -> 1
 */
function apiFindings(root) {
    const dir = join(root, "graphty-element/api");
    const marks = readdirSync(dir).flatMap((file) => [...specialLayerMarks(readFileSync(join(dir, file), "utf8"))]);
    return new Map(marks.map((mark) => [mark, 1]));
}

/**
 * The baseline on the merge base. It is absent only before this check first landed.
 * @param root - the checkout
 * @returns the baseline
 */
function baseBaseline(root) {
    const { env } = process;
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" });
    const ref = env.GITHUB_BASE_REF ? `origin/${env.GITHUB_BASE_REF}` : pushBaseRef({ cwd: root });
    const base = git("merge-base", "HEAD", ref).trim();
    if (git("ls-tree", "--name-only", base, BASELINE).trim() === "") return undefined;
    return JSON.parse(git("show", `${base}:${BASELINE}`));
}

/**
 * Every failure of the ratchet.
 * @param state - what to judge
 * @param state.base - the baseline on the merge base
 * @param state.head - the baseline in this checkout
 * @param state.lint - what the lint rule finds
 * @param state.api - what the API reports mark
 * @returns the failure messages
 */
function failures({ base, head, lint, api }) {
    return [
        ...malformed(head),
        ...(base === undefined ? [] : gained(base, head)),
        ...drift("lint", head, lint),
        ...drift("api", head, api),
    ];
}

/** Proves each failure fires, on a scratch checkout for the lint scan. */
async function selfTest() {
    const row = (fields) => ({ ...fields, reason: "why", issue: ISSUE });
    const lintRow = row({ file: "a.ts", rule: "named", detail: "isBaseRow", count: 2 });
    const head = {
        layerOperations: [row({ layer: "element:default/Base/node", operation: "remove" })],
        panelControls: [row({ row: "Everything", control: "menu: Delete" })],
        lint: [lintRow],
        api: [row({ mark: '"E_PROTECTED"' })],
    };
    const lint = new Map([["a.ts | named | isBaseRow", 2]]);
    const api = new Map([['"E_PROTECTED"', 1]]);
    const judge = (changes) => failures({ base: head, head, lint, api, ...changes });
    const expect = (name, messages, pattern) => {
        if (!messages.some((m) => pattern.test(m))) throw new Error(`self-test ${name}: got ${messages.join("; ")}`);
    };

    if (judge({}).length > 0) throw new Error(`self-test clean: got ${judge({}).join("; ")}`);
    if (judge({ base: undefined }).length > 0) throw new Error("self-test first landing: a missing base must pass");
    for (const [section, added] of [
        ["layerOperations", row({ layer: "x", operation: "remove" })],
        ["panelControls", row({ row: "x", control: "y" })],
        ["api", row({ mark: '"E_OWNED"' })],
    ]) {
        const grown = { ...head, [section]: [...head[section], added] };
        expect(`gain ${section}`, judge({ head: grown }), /is new/);
    }
    const raised = { ...head, lint: [{ ...lintRow, count: 3 }] };
    expect("raised count", judge({ head: raised, lint: new Map([["a.ts | named | isBaseRow", 3]]) }), /is new/);
    expect("stale lint", judge({ lint: new Map() }), /is stale/);
    expect("lower lint", judge({ lint: new Map([["a.ts | named | isBaseRow", 1]]) }), /is stale/);
    expect("stale api", judge({ api: new Map() }), /is stale/);
    expect(
        "unlisted lint",
        judge({ lint: new Map([...lint, ["b.ts | named | isBaseRow", 1]]) }),
        /past what the baseline/,
    );
    expect("unlisted api", judge({ api: new Map([...api, ['"E_OWNED"', 1]]) }), /past what the baseline/);
    expect("no reason", judge({ head: { ...head, api: [{ mark: "x", issue: ISSUE }] } }), /no reason/);
    expect("wrong issue", judge({ head: { ...head, api: [{ mark: "x", reason: "y" }] } }), /must name/);
    expect("repeated", judge({ head: { ...head, api: [...head.api, ...head.api] } }), /listed twice/);

    const { dir, write } = scratchWorkspace("special-layers-");
    try {
        write(
            "graphty/src/a.tsx",
            [
                "// eslint-disable-next-line graphty/no-special-layers",
                'export const a = (row: { name: string }) => row.name === "Everything";',
            ].join("\n"),
        );
        write("graphty/src/__tests__/b.ts", 'export const b = (name: string) => name === "Everything";\n');
        const found = await lintFindings(dir);
        const want = "graphty/src/a.tsx | layer-name | Everything";
        if (found.size !== 1 || found.get(want) !== 1) {
            throw new Error(
                `self-test scan: an eslint-disable must hide nothing, tests are skipped: ${[...found.keys()]}`,
            );
        }
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
    console.log("check-special-layers: self-test passed");
}

if (process.argv[2] === "--self-test") {
    await selfTest();
} else {
    const head = JSON.parse(readFileSync(join(ROOT, BASELINE), "utf8"));
    const problems = failures({
        base: baseBaseline(ROOT),
        head,
        lint: await lintFindings(ROOT),
        api: apiFindings(ROOT),
    });
    if (problems.length > 0) {
        for (const problem of problems) console.error(problem);
        console.error(`\ncheck-special-layers: ${problems.length} failure(s). Every style layer is equal (${ISSUE}).`);
        process.exit(1);
    }
    const counts = Object.keys(SECTIONS).map((section) => `${head[section].length} ${section}`);
    console.log(`check-special-layers: passed; the baseline holds ${counts.join(", ")}`);
}
