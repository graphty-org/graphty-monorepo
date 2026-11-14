# Drawing a sample

graphty-element takes nodes and edges as plain records (`nodeData` and `edgeData`).
`toElementData()` turns a snapshot or a generated graph into them: each node gets its id and one
field per node column, and each edge its `source`, `target` and, when weighted, `weight`.

<<< ../examples/element-data.ts

It builds one object per node and edge, so it is meant for graphs a browser draws, not for
millions of edges.

graphty-element can also load samples itself, without this package in your code:
`session.data.loadDataset("football")` loads a dataset and
`session.data.generate("barabasi-albert", { n: 500 })` runs a generator, while
`session.catalog.datasets()` and `session.catalog.generators()` list what it can load. See
[Data sources](https://graphty.app/docs/graphty-element/guide/data-sources) in the graphty-element guide.

## Into other graphty packages

Everything else takes a graph-format snapshot. A generated graph becomes one with
`fromEdgeArrays()`, and `fetchDataset()` returns one, so a sample goes straight into
[algorithms](https://graphty.app/docs/algorithms/), [layout](https://graphty.app/docs/layout/) or graph-io's exporters:

```ts
import { fromEdgeArrays } from "@graphty/graph-format";
import { exportGraphToString } from "@graphty/graph-io";
import { wattsStrogatzGraph } from "@graphty/graph-samples/generators";

const snapshot = fromEdgeArrays(wattsStrogatzGraph({ n: 100, k: 4, beta: 0.1, seed: 1 }));
const graphml = await exportGraphToString(snapshot, "graphml");
```
