// Tests of the node-position-funnel lint rule: a valid and an invalid case per write form.
//
//   node eslint-rules/node-position-funnel.test.mjs
import { describe, it } from "node:test";

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";

import rule from "./node-position-funnel.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
    languageOptions: { parser: tseslint.parser, ecmaVersion: 2024, sourceType: "module" },
});
const write = { messageId: "write" };

// The funnel itself, as Node.ts has it.
const funnel = "class Node { setMeshPosition(x, y, z) { this.mesh.position.set(x, y, z); } }";

tester.run("node-position-funnel", rule, {
    valid: [
        // The funnel, and the call to it.
        funnel,
        "class Node { setMeshPosition(x, y, z) { this.mesh.position.x = x; this.mesh.position.y = y; } }",
        "node.setMeshPosition(1, 2, 3);",
        "this.node.setMeshPosition(p.x, p.y, 0);",
        // A configured allowlist.
        {
            code: "class Mover { put(node) { node.mesh.position.set(0, 0, 0); } }",
            options: [{ allow: ["Mover.put"] }],
        },
        // Reads.
        "const { x, y, z } = node.mesh.position;",
        "const p = node.mesh.position; log(p.x);",
        "overlay.position.copyFrom(this.mesh.position);",
        "class Node { at() { return this.mesh.position.x; } }",
        "if (node.mesh.position.z === 0) {}",
        // Out of scope: label, edge, arrow, camera and cache meshes, and `this.mesh` outside Node.
        "label.mesh.position.set(0, 0, 0);",
        "this.label.mesh.position.x = 1;",
        "edge.mesh.position = midPoint;",
        "edge.arrowCap.position.set(0, 0, 0);",
        "camera.position.copyFrom(other.position);",
        "mesh.position.set(0, -10000, 0);",
        "class RichTextLabel { move() { this.mesh.position = v; } }",
        "class Edge { move() { this.mesh.position.x = 1; } }",
        "const { mesh } = edge; mesh.position.x = 1;",
        // A different property on a node mesh.
        "node.mesh.scaling.set(2, 2, 2);",
        "node.mesh.position.clone().set(1, 2, 3);",
    ],
    invalid: [
        // Every write form, on every receiver spelling.
        { code: "node.mesh.position.set(1, 2, 3);", errors: [write] },
        { code: "n.mesh.position.set(1, 2, 3);", errors: [write] },
        { code: "this.node.mesh.position.copyFrom(p);", errors: [write] },
        { code: "entry.node.mesh.position.copyFromFloats(1, 2, 3);", errors: [write] },
        { code: "edge.srcNode.mesh.position.setAll(0);", errors: [write] },
        { code: "node.mesh.position.addInPlace(delta);", errors: [write] },
        { code: "node.mesh.position.x = 1;", errors: [write] },
        { code: "node.mesh.position.y += 1;", errors: [write] },
        { code: "node.mesh.position.z++;", errors: [write] },
        { code: "node.mesh.position = v;", errors: [write] },
        { code: "node.mesh.setAbsolutePosition(v);", errors: [write] },
        { code: "node.mesh!.position.set(1, 2, 3);", errors: [write] },
        { code: "(node as Node).mesh.position.z = 0;", errors: [write] },
        { code: "node.mesh?.position.set(1, 2, 3);", errors: [write] },
        // `this.mesh` inside Node, outside the funnel.
        {
            code: "class Node { update() { this.mesh.position.x = 1; this.mesh.position.y = 2; } }",
            errors: [write, write],
        },
        { code: "class Node { f() { this.mesh.position.set(1, 2, 3); } }", errors: [write] },
        // Through a local bound to the mesh or to its position.
        { code: "const { mesh } = node; mesh.position.x = 1;", errors: [write] },
        { code: "const m = node.mesh; m.position.set(1, 2, 3);", errors: [write] },
        { code: "const { position } = node.mesh; position.z = 0;", errors: [write] },
        { code: "const p = this.node.mesh.position; p.copyFrom(v);", errors: [write] },
        // The allowlist names a method of a class; the same method name elsewhere is not allowed.
        { code: "class Other { setMeshPosition() { node.mesh.position.set(0, 0, 0); } }", errors: [write] },
        // A configured allowlist replaces the default.
        { code: funnel, options: [{ allow: ["Mover.put"] }], errors: [write] },
    ],
});
