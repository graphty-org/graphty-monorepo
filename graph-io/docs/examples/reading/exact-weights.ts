import { edgeWeights, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph("source,target,weight\na,b,0.1\nb,c,2\n", { format: "csv" });

// the weights as the file wrote them, one per edge
console.log(edgeWeights(snapshot));

// the same weights as 32-bit floats, which is how the graph stores them for algorithms: 0.1 is not exact
console.log(snapshot.edgeList().weights);
