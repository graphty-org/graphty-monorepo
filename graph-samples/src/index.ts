/**
 * `@graphty/graph-samples`: the shared types, the dataset catalogue, the loader for the datasets
 * (every one is downloaded from graphty.app on demand; none is bundled) and the conversion to
 * graphty-element records. The generators live in `@graphty/graph-samples/generators`.
 */

export { type DatasetMeta } from "./datasets/build.js";
export { DATASETS } from "./datasets/catalog.js";
export { DATASET_NAMES } from "./datasets/names.js";
export { DEFAULT_DATASET_BASE_URL, fetchDataset, type FetchDatasetOptions } from "./datasets/remote.js";
export { type ElementData, toElementData } from "./element.js";
export { GENERATOR_CATALOG, type GeneratorDescriptor, type GeneratorParamDescriptor } from "./generators/catalog.js";
export { type SampleGraph } from "./types.js";
