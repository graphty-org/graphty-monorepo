import { HOSTED_DATASET_NAMES } from "./hosted-names.js";

/**
 * The bundled datasets, in catalogue order. `DATASETS` (catalog.ts) takes its order from this list, and the
 * compiler refuses a catalogue that misses one of these names or adds another.
 */
export const BUNDLED_DATASET_NAMES = [
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
    "yeast-perturbation",
    "stelzl-interactome",
    "wikipathways-senescence-autophagy",
    "go-slim-generic",
] as const;

/**
 * The name of every dataset in `DATASETS`, in the same order, without the metadata: for checking a name without
 * bundling every dataset's description, citation and license.
 */
export const DATASET_NAMES: readonly string[] = [...BUNDLED_DATASET_NAMES, ...HOSTED_DATASET_NAMES];
