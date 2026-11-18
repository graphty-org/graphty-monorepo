# Getting started

## Install

```bash
npm install @graphty/graph-samples @graphty/graph-format
```

graph-samples is an ES module. It runs in Node 18.19 or later and in browsers. It has three entry
points:

| Import                                   | What it holds                                                           |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `@graphty/graph-samples`                 | `fetchDataset()`, the dataset and generator catalogs, `toElementData()` |
| `@graphty/graph-samples/generators`      | every generator                                                         |
| `@graphty/graph-samples/datasets/<name>` | one small dataset's loader and metadata                                 |

## A generated graph and a real one

<<< ../examples/getting-started.ts

`barabasiAlbertGraph()` returns a `SampleGraph`: plain typed arrays, which a Web Worker can
receive without copying. `fromEdgeArrays()` from graph-format turns it into a snapshot, the graph
type that graph-io, algorithms and layout all take. `fetchDataset()` returns a snapshot directly.

Every generator returns a `SampleGraph`:

| Field         | Type            | Meaning                                              |
| ------------- | --------------- | ---------------------------------------------------- |
| `directed`    | `boolean`       | whether edge `e` runs from `src[e]` to `dst[e]`      |
| `nodeCount`   | `number`        | isolated nodes included                              |
| `src`, `dst`  | `Uint32Array`   | the edge endpoints, node indices in `[0, nodeCount)` |
| `weights`     | `Float32Array?` | per-edge weights, when weighted                      |
| `ids`         | `string[]?`     | external node ids, when the nodes have names         |
| `nodeColumns` | record?         | per-node columns, including the ground truth         |

## Read next

- [Generators](./generators) lists every generator and its options.
- [Datasets](./datasets) lists every dataset.
- [Drawing a sample](./graphty-element) shows one on screen.
