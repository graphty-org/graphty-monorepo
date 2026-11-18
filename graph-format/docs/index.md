# graph-format

`@graphty/graph-format` is the graph data type every other graphty package exchanges: a read-only
graph (a **snapshot**) stored in typed arrays, a builder that makes one, typed columns for node and
edge attributes, and an id map from your own node ids to the dense indices the arrays use.

It has no runtime dependencies and contains no algorithms, no drawing and no file parsers. Those
live in the packages that read and write snapshots:

- [graph-io](https://graphty.app/docs/graph-io/) reads and writes graph files (GraphML, GEXF, CSV, JSON, ...) as snapshots.
- [algorithms](https://graphty.app/docs/algorithms/) and [layout](https://graphty.app/docs/layout/) run over a snapshot.
- graph-samples generates graphs and downloads well-known datasets as snapshots.
- webgpu-graph-algorithms uploads a snapshot to the GPU in one call.

## Read next

- [Getting started](./guide/getting-started): install it, build a graph, walk it, save it.
- [Building a snapshot](./guide/building): the builder, freezing, and the one-call factories.
- [Ids and columns](./guide/columns): the id map, attribute columns and their dtypes.
- [Views and derived graphs](./guide/views): degrees, reverse edges, subgraphs and the like.
- [Sending and saving](./guide/wire): Web Workers, IndexedDB, files, and snapshots made by
  another package.
- [Invariants and vocabulary](./guide/invariants): what every snapshot guarantees.
- [API reference](./api/): every exported class, function and type.
