import { type DatasetMeta } from "./build.js";
import { celegansNeuralMeta } from "./celegans-neural/meta.js";
import { contiguousUsaMeta } from "./contiguous-usa/meta.js";
import { davisSouthernWomenMeta } from "./davis-southern-women/meta.js";
import { dolphinsMeta } from "./dolphins/meta.js";
import { florentineFamiliesMeta } from "./florentine-families/meta.js";
import { footballMeta } from "./football/meta.js";
import { goSlimGenericMeta } from "./go-slim-generic/meta.js";
import { HOSTED_DATASETS } from "./hosted.js";
import { karateMeta } from "./karate/meta.js";
import { knuthMilesMeta } from "./knuth-miles/meta.js";
import { lesMiserablesMeta } from "./les-miserables/meta.js";
import { BUNDLED_DATASET_NAMES } from "./names.js";
import { openflightsMeta } from "./openflights/meta.js";
import { politicalBlogsMeta } from "./political-blogs/meta.js";
import { politicalBooksMeta } from "./political-books/meta.js";
import { stelzlInteractomeMeta } from "./stelzl-interactome/meta.js";
import { wikipathwaysSenescenceAutophagyMeta } from "./wikipathways-senescence-autophagy/meta.js";
import { yeastPerturbationMeta } from "./yeast-perturbation/meta.js";

const BUNDLED = {
    karate: karateMeta,
    "florentine-families": florentineFamiliesMeta,
    "davis-southern-women": davisSouthernWomenMeta,
    "les-miserables": lesMiserablesMeta,
    football: footballMeta,
    "political-books": politicalBooksMeta,
    dolphins: dolphinsMeta,
    "contiguous-usa": contiguousUsaMeta,
    "knuth-miles": knuthMilesMeta,
    "celegans-neural": celegansNeuralMeta,
    "political-blogs": politicalBlogsMeta,
    openflights: openflightsMeta,
    "yeast-perturbation": yeastPerturbationMeta,
    "stelzl-interactome": stelzlInteractomeMeta,
    "wikipathways-senescence-autophagy": wikipathwaysSenescenceAutophagyMeta,
    "go-slim-generic": goSlimGenericMeta,
} satisfies Record<(typeof BUNDLED_DATASET_NAMES)[number], DatasetMeta>;

/**
 * The metadata of every dataset (no graph data). A bundled dataset's edges load only from its own
 * subpath, `@graphty/graph-samples/datasets/<name>`; a dataset with `hosting: "remote"` loads with
 * `fetchDataset(name)`.
 */
export const DATASETS: readonly DatasetMeta[] = [
    ...BUNDLED_DATASET_NAMES.map((name) => BUNDLED[name]),
    ...HOSTED_DATASETS,
];
