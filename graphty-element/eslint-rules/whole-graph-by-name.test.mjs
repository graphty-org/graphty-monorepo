// Tests of the whole-graph-by-name lint rule: a passing and a failing case per way of reading the
// whole graph.
//
//   node eslint-rules/whole-graph-by-name.test.mjs
import { describe, it } from "node:test";

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";

import rule from "./whole-graph-by-name.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
    languageOptions: { parser: tseslint.parser, ecmaVersion: 2024, sourceType: "module" },
});
const whole = { messageId: "whole" };
const mint = { messageId: "mint" };

const imports = 'import { asWorkingSnapshot, wholeGraph } from "../session/working/graphs";\n';
const options = [
    {
        accessors: [
            { file: "src/session/projectFile.ts", function: "graphIdsOf" },
            { file: "src/layout/LayoutEngine.ts", function: "StaticLayoutEngine.#load" },
        ],
        owners: ["src/data/GraphStore.ts"],
        mints: ["src/session/working/view.ts"],
    },
];

tester.run("whole-graph-by-name", rule, {
    valid: [
        // A listed function names the whole graph.
        {
            code: `${imports}export function graphIdsOf(session) { return wholeGraph(session.data.store).ids; }`,
            filename: "/repo/graphty-element/src/session/projectFile.ts",
            options,
        },
        {
            code: `${imports}class StaticLayoutEngine { #load() { const store = wholeGraph(this.source); } }`,
            filename: "/repo/graphty-element/src/layout/LayoutEngine.ts",
            options,
        },
        // A listed function, through an arrow function inside it.
        {
            code: `${imports}export function graphIdsOf(s) { return [1].map(() => wholeGraph(s.data.store)); }`,
            filename: "/repo/graphty-element/src/session/projectFile.ts",
            options,
        },
        // The store's own file reads its snapshot.
        {
            code: "class GraphStore { status() { return this.getSnapshot().nodeCount; } }",
            filename: "/repo/graphty-element/src/data/GraphStore.ts",
            options,
        },
        // The working graph marks its own snapshot.
        {
            code: `${imports}const view = (graph) => ({ snapshot: asWorkingSnapshot(graph) });`,
            filename: "/repo/graphty-element/src/session/working/view.ts",
            options,
        },
        // Another class's snapshot: the stats and the AI status.
        { code: "const s = this.statsManager.getSnapshot();", filename: "/r/src/Graph.ts", options },
        { code: "class StatsManager { r() { return this.getSnapshot(); } }", filename: "/r/src/S.ts", options },
        { code: "return this.statusManager.getSnapshot();", filename: "/r/src/ai/AiManager.ts", options },
        // A getSnapshot with arguments, or a `snapshot()` on something that is not session data.
        { code: "history.getSnapshot(3);", filename: "/r/src/a.ts", options },
        { code: "view.snapshot(); camera.snapshot();", filename: "/r/src/a.ts", options },
        // A local named wholeGraph that is not the accessor.
        { code: "const wholeGraph = (f) => f(); wholeGraph(run);", filename: "/r/src/simple/a.ts", options },
        // Reading the working graph.
        { code: "const graph = this.workingGraph.snapshot;", filename: "/r/src/simple/defineLayout.ts", options },
    ],
    invalid: [
        // The accessor in a function the list does not name.
        {
            code: `${imports}export function exportVisible(session) { return wholeGraph(session.data.store); }`,
            filename: "/repo/graphty-element/src/data/export.ts",
            options,
            errors: [whole],
        },
        // Named in the list, but in another file.
        {
            code: `${imports}export function graphIdsOf(session) { return wholeGraph(session.data.store).ids; }`,
            filename: "/repo/graphty-element/src/session/other.ts",
            options,
            errors: [whole],
        },
        // Another member of a listed class.
        {
            code: `${imports}class StaticLayoutEngine { doLayout() { return wholeGraph(this.source); } }`,
            filename: "/repo/graphty-element/src/layout/LayoutEngine.ts",
            options,
            errors: [whole],
        },
        // The accessor imported under another name, or handed on as a value.
        {
            code: 'import { wholeGraph as all } from "./working/graphs";\nconst g = all(store);',
            filename: "/r/src/session/a.ts",
            options,
            errors: [whole],
        },
        {
            code: `${imports}const read = [store].map(wholeGraph);`,
            filename: "/r/src/session/a.ts",
            options,
            errors: [whole],
        },
        // The store's own accessor, on every receiver spelling.
        { code: "const s = this.dataManager.getSnapshot();", filename: "/r/src/layout/A.ts", options, errors: [whole] },
        { code: "const s = data.getSnapshot();", filename: "/r/src/algorithms/A.ts", options, errors: [whole] },
        { code: "const s = graph.getDataManager().getSnapshot();", filename: "/r/a.ts", options, errors: [whole] },
        { code: "const s = this.rowSource?.getSnapshot();", filename: "/r/src/layout/A.ts", options, errors: [whole] },
        { code: "const s = session.data.store.getSnapshot();", filename: "/r/src/a.ts", options, errors: [whole] },
        // The session's public whole-graph reader.
        { code: "const s = session.data.snapshot();", filename: "/r/src/a.ts", options, errors: [whole] },
        { code: "const s = data.snapshot();", filename: "/r/src/a.ts", options, errors: [whole] },
        // Marking a snapshot as the working graph outside the working graph.
        {
            code: `${imports}const graph = asWorkingSnapshot(wholeGraph(store));`,
            filename: "/r/src/simple/defineLayout.ts",
            options,
            errors: [mint, whole],
        },
    ],
});
