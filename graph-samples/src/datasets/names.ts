import { HOSTED_DATASET_NAMES } from "./hosted-names.js";

/**
 * The small datasets (under about 5,000 nodes), in catalogue order: converted into the repository
 * (data/<name>.ts), each with its own subpath, and published on graphty.app like every other dataset.
 * `DATASETS` (catalog.ts) takes its order from this list, and the compiler refuses a catalogue that
 * misses one of these names or adds another.
 */
export const SMALL_DATASET_NAMES = [
    "karate",
    "florentine-families",
    "davis-southern-women",
    "les-miserables",
    "football",
    "political-books",
    "dolphins",
    "contiguous-usa",
    "knuth-miles",
    "celegans-neural",
    "political-blogs",
    "openflights",
    "venice-transit",
    "yeast-perturbation",
    "stelzl-interactome",
    "wikipathways-senescence-autophagy",
    "go-slim-generic",
] as const;

/**
 * The name of every dataset in `DATASETS`, in the same order, without the metadata: for checking a name without
 * bundling every dataset's description, citation and license.
 */
export const DATASET_NAMES: readonly string[] = [...SMALL_DATASET_NAMES, ...HOSTED_DATASET_NAMES];
