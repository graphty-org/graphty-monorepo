import { GraphBuilder, GraphFormatError } from "@graphty/graph-format";

const builder = new GraphBuilder({ directed: true });
builder.declareNodeColumn({ name: "name", dtype: "string" });
builder.declareNodeColumn({ name: "age", dtype: "u8" });
builder.declareNodeColumn({ name: "team", dtype: "dict" }); // repeated strings, stored once
builder.declareEdgeColumn({ name: "since", dtype: "i32" });

builder.addNodeRecord(1, { name: "Ada", age: 36, team: "red" });
builder.addNodeRecord(2, { name: "Grace", age: 45, team: "blue" });
builder.addNodeRecord(3, { name: "Edsger", team: "red" }); // no age: the row is unset
builder.addEdgeRecord(1, 2, { since: 1843 });
builder.addEdgeRecord(2, 3, { since: 1952 });

const snapshot = builder.freeze();
const { nodes, edges } = snapshot;

console.log(nodes.names()); // [ 'name', 'age', 'team' ]
console.log(nodes.value("team", 2), nodes.isSet("age", 2)); // red false
console.log(edges.value("since", 1)); // 1952

// typed access: the column's own array, checked against the dtype you expect
const age = nodes.requireTyped("age", "u8");
console.log(age.data); // Uint8Array(3) [ 36, 45, 0 ]

// columns can be added after freezing; a multi-component column holds a vector per row
nodes.set("position", new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), { components: 3 });
console.log(nodes.require("position").meta.components); // 3

// asking for the wrong dtype is an error with a stable code
try {
    nodes.requireTyped("age", "f32");
} catch (error) {
    console.log(error instanceof GraphFormatError ? error.code : error); // E_COLUMN_TYPE
}
