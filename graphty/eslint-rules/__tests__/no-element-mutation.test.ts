/**
 * The no-element-mutation rule, run with type information over the real graphty-element types.
 *
 * The door list comes from the element's source (`doors.ts`) rather than from
 * `graphty-element/build/doors.json`, because this test runs in CI shards that download the
 * element's `dist/` and nothing else. The build writes that file as `JSON.stringify` of the same
 * list, so the rule sees the same shape either way.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import { DOOR_ROOTS } from "../../../graphty-element/src/session/commands/doors";
import { createRule } from "../no-element-mutation.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures");
const TS = resolve(fixtures, "file.ts");

const tester = new RuleTester({
    languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
            project: "./tsconfig.json",
            tsconfigRootDir: fixtures,
            ecmaFeatures: { jsx: true },
            // CI=true switches typescript-eslint to single-run mode, which builds one program from
            // the fixture files on disk and never sees each case's code.
            disallowAutomaticSingleRunInference: true,
        },
    },
});

const rule = createRule(() => ({ roots: DOOR_ROOTS }));

const IMPORTS = [
    'import type { Graph, Graphty as GraphtyElement } from "@graphty/graphty-element";',
    'import type { GraphSession, TransactionScope } from "@graphty/graphty-element/session";',
    "declare const element: GraphtyElement;",
    "declare const graphty: Graph;",
    "declare const session: GraphSession;",
    "declare const tx: TransactionScope;",
].join("\n");

/**
 * One case over the shared imports.
 * @param code - The statements under test.
 * @returns The full source.
 */
function src(code: string): string {
    return `${IMPORTS}\n${code}\n`;
}

tester.run("no-element-mutation", rule, {
    valid: [
        { filename: TS, code: src('session.data.addNodes([{ id: "a" }]);') },
        { filename: TS, code: src('tx.styles.add({ node: { selector: "", style: {} } });') },
        { filename: TS, code: src("element.zoomToFit();") },
        { filename: TS, code: src('const pins = { pin(id: string): string { return id; } };\npins.pin("a");') },
        { filename: TS, code: src("const current = element.layout;\nvoid current;") },
        { filename: TS, code: src('declare module "d3-force-3d" {\n    export type Node = unknown;\n}') },
    ],
    invalid: [
        {
            filename: TS,
            code: src('element.addNodes([{ id: "a" }]);'),
            errors: [{ messageId: "door", data: { name: "addNodes" } }],
        },
        {
            filename: TS,
            code: src('element.layout = "d3";'),
            errors: [{ messageId: "door", data: { name: "layout" } }],
        },
        {
            filename: TS,
            code: src("graphty.getDataManager();"),
            errors: [{ messageId: "manager", data: { name: "getDataManager" } }],
        },
        {
            filename: TS,
            code: src('const renamed = element;\nrenamed.pin(["a"]);'),
            errors: [{ messageId: "door", data: { name: "pin" } }],
        },
        {
            filename: TS,
            code: src('element?.addNodes([{ id: "a" }]);'),
            errors: [{ messageId: "door", data: { name: "addNodes" } }],
        },
        {
            filename: TS,
            code: src('element["addNodes"]([{ id: "a" }]);'),
            errors: [{ messageId: "door", data: { name: "addNodes" } }],
        },
        {
            filename: TS,
            code: src('element.addNodes.call(element, [{ id: "a" }]);'),
            errors: [{ messageId: "door", data: { name: "addNodes" } }],
        },
        {
            filename: TS,
            code: src("const add = element.addNodes.bind(element);\nvoid add;"),
            errors: [{ messageId: "door", data: { name: "addNodes" } }],
        },
        {
            filename: TS,
            code: src("const { addNodes } = element;\nvoid addNodes;"),
            errors: [{ messageId: "door", data: { name: "addNodes" } }],
        },
        {
            filename: TS,
            code: src("const inner = element.graph;\nvoid inner;"),
            errors: [{ messageId: "internal", data: { name: "graph" } }],
        },
        {
            filename: TS,
            code: src("export interface ElementGraph {\n    getNodes: () => readonly unknown[];\n}"),
            errors: [{ messageId: "redeclared", data: { name: "ElementGraph", root: "Graph" } }],
        },
        {
            filename: TS,
            code: src(
                "interface ElementGraph {\n    runAlgorithm: (namespace: string, type: string) => Promise<void>;\n}\n" +
                    'declare const bridged: ElementGraph;\nvoid bridged.runAlgorithm("graphty", "degree");',
            ),
            errors: [
                { messageId: "redeclared", data: { name: "ElementGraph", root: "Graph" } },
                { messageId: "door", data: { name: "runAlgorithm" } },
            ],
        },
    ],
});
