/**
 * `@graphty/graph-samples`: the shared types, the dataset catalogue, the loader for hosted
 * datasets and the conversion to graphty-element records. The generators live in
 * `@graphty/graph-samples/generators` and each bundled dataset in
 * `@graphty/graph-samples/datasets/<name>`, so an application bundles only what it imports.
 */

export { type DatasetMeta } from "./datasets/build.js";
export { DATASETS } from "./datasets/catalog.js";
export { DEFAULT_DATASET_BASE_URL, fetchDataset, type FetchDatasetOptions } from "./datasets/remote.js";
export { type ElementData, toElementData } from "./element.js";
export { type SampleGraph } from "./types.js";
