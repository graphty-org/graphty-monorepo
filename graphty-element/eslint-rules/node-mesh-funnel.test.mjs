// Tests of the node-mesh-funnel lint rule: it needs type information, so each case declares the
// classes it uses.
//
//   node eslint-rules/node-mesh-funnel.test.mjs
import { describe, it } from "node:test";

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";

import rule from "./node-mesh-funnel.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
    languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
            projectService: { allowDefaultProject: ["*.ts"] },
            tsconfigRootDir: import.meta.dirname,
        },
    },
});

const classes = `
    export {};
    class Mesh { position = { x: 0 }; }
    class Node { mesh = new Mesh(); drawnPosition = { x: 0 }; }
    class Edge { mesh = new Mesh(); srcNode = new Node(); }
    class Label { mesh = new Mesh(); }
    declare const node: Node;
    declare const nodes: Node[];
    declare const edge: Edge;
    declare const entry: { node: Node } | undefined;
    declare const label: Label;
    declare const mysteryName: Node;
    declare const fakeNode: { mesh: Mesh };
`;
const read = { messageId: "read" };
const valid = (code) => ({ code: classes + code, filename: "file.ts" });
const invalid = (code) => ({ code: classes + code, filename: "file.ts", errors: [read] });

tester.run("node-mesh-funnel", rule, {
    valid: [
        valid("node.drawnPosition.x;"),
        valid("edge.mesh.position;"),
        valid("label.mesh.position;"),
        valid("const { mesh } = label;"),
        valid("fakeNode.mesh;"),
        {
            code: `${classes} class Graph { getNodeMesh() { return node.mesh; } }`,
            filename: "file.ts",
            options: [{ allow: ["Graph.getNodeMesh"] }],
        },
    ],
    invalid: [
        invalid("node.mesh;"),
        invalid("node.mesh.position.x;"),
        invalid("nodes[0].mesh;"),
        invalid("edge.srcNode.mesh;"),
        invalid("entry?.node.mesh;"),
        invalid("mysteryName.mesh;"),
        invalid("const { mesh } = node;"),
        invalid("const { mesh: other } = node;"),
        invalid("for (const n of nodes) { n.mesh; }"),
        invalid("node.mesh = label.mesh;"),
        invalid("class Graph { other() { return node.mesh; } }"),
    ],
});
