import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph("source,target,weight\na,b,0.1\nb,c,2\n", { format: "csv" });

// the per-edge weights are 32-bit floats: 0.1 is not exact
console.log(snapshot.edgeList().weights?.[0]);

// when a weight does not fit exactly, the exact values are also in the weight attribute
const exact = snapshot.edges.byRole("weight");
console.log(exact?.meta.name, exact ? snapshot.edges.value(exact.meta.name, 0) : null);
