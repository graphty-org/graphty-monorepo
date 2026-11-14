# API reference

graph-samples has three kinds of entry point, and the generated reference has a module for each:

| Module            | Import from                              | Holds                                                                             |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `index`           | `@graphty/graph-samples`                 | `fetchDataset`, `DATASETS`, `DATASET_NAMES`, `GENERATOR_CATALOG`, `toElementData` |
| `generators`      | `@graphty/graph-samples/generators`      | every generator, `generateGraph`, `withWeights`                                   |
| `datasets/<name>` | `@graphty/graph-samples/datasets/<name>` | one small dataset's loader and metadata                                           |

The pages are generated from the source's documentation comments, and are listed in the sidebar
under "Generated TypeDoc".
