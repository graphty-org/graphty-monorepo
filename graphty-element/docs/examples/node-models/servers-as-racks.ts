/**
 * @file The first example of the node models guide (docs/guide/node-models.md): draw the nodes one
 * style layer matches as a 3D model loaded from a file. The guide shows the "example" region
 * verbatim; test/simple/node-models-guide.test.ts holds the guide to it and
 * test/browser/models/node-models-guide.test.ts runs it. It imports only the published package, and
 * tsconfig.strict-consumer.json compiles it against the published declarations.
 */

// #region example
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
element.nodeData = [
    { id: "web", kind: "server" },
    { id: "db", kind: "server" },
    { id: "alice", kind: "person" },
];
element.edgeData = [
    { source: "alice", target: "web" },
    { source: "web", target: "db" },
];

await element.session.styles.add({
    name: "Servers as racks",
    target: "node",
    selector: { match: "expression", where: "data.kind == 'server'" },
    set: { "node.model": "https://example.com/models/rack.glb" },
});
// #endregion example
