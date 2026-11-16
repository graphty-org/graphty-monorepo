# API reference

Everything below is exported from `@graphty/graph-format`, its only entry point. The pages are
generated from the source's documentation comments.

The most used parts:

| Export                                                     | What it is                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| [`GraphBuilder`](./generated/classes/GraphBuilder)         | builds snapshots one node and edge at a time                  |
| [`GraphSnapshot`](./generated/classes/GraphSnapshot)       | the read-only graph: arrays, views, derived graphs, wire form |
| [`AttributeTable`](./generated/classes/AttributeTable)     | the node, edge and graph columns of a snapshot                |
| [`NodeIdMap`](./generated/classes/NodeIdMap)               | node ids to indices and back                                  |
| [`GraphFormatError`](./generated/classes/GraphFormatError) | every error this package throws, with a stable `code`         |
| [`fromEdgeArrays`](./generated/functions/fromEdgeArrays)   | a snapshot from source and target index arrays                |
| [`fromElements`](./generated/functions/fromElements)       | a snapshot from your own node and edge objects                |
| [`fromRecords`](./generated/functions/fromRecords)         | a snapshot from node-link JSON                                |
| [`fromBytes`](./generated/functions/fromBytes)             | reads the byte form                                           |
| [`fromWire`](./generated/functions/fromWire)               | reads the wire form                                           |

The generated reference lists every export, in the sidebar under "Generated TypeDoc".
