import { fromElements } from "@graphty/graph-format";

const people = [{ name: "alice" }, { name: "bob" }, { name: "carol" }];
const links = [
    { key: "l1", from: "alice", to: "bob", strength: 2 },
    { key: "l2", from: "bob", to: "carol", strength: 1 },
];

const { snapshot, nodes, edges } = fromElements(people, links, {
    directed: false,
    id: (p) => p.name,
    source: (l) => l.from,
    target: (l) => l.to,
    edgeId: (l) => l.key, // optional: makes snapshot.edgeIndexOf("l2") work
    weight: (l) => l.strength, // optional: leave it out for an unweighted graph
});

// node i is the i-th object you gave, edge e the e-th
console.log(edges[snapshot.edgeIndexOf("l2")] === links[1]); // true
console.log(nodes[snapshot.ids.requireIndex("carol")] === people[2]); // true

// so a result indexed by node maps straight back to your objects
const degree = snapshot.degree();
console.log(nodes.map((p, i) => `${p.name}: ${degree[i]}`).join(", ")); // alice: 1, bob: 2, carol: 1
