import { type DatasetMeta } from "./build.js";
import { celegansNeuralMeta } from "./celegans-neural/meta.js";
import { contiguousUsaMeta } from "./contiguous-usa/meta.js";
import { davisSouthernWomenMeta } from "./davis-southern-women/meta.js";
import { dolphinsMeta } from "./dolphins/meta.js";
import { florentineFamiliesMeta } from "./florentine-families/meta.js";
import { footballMeta } from "./football/meta.js";
import { HOSTED_DATASETS } from "./hosted.js";
import { karateMeta } from "./karate/meta.js";
import { knuthMilesMeta } from "./knuth-miles/meta.js";
import { lesMiserablesMeta } from "./les-miserables/meta.js";
import { openflightsMeta } from "./openflights/meta.js";
import { politicalBlogsMeta } from "./political-blogs/meta.js";
import { politicalBooksMeta } from "./political-books/meta.js";

/**
 * The metadata of every dataset (no graph data). A bundled dataset's edges load only from its own
 * subpath, `@graphty/graph-samples/datasets/<name>`; a dataset with `hosting: "remote"` loads with
 * `fetchDataset(name)`.
 */
export const DATASETS: readonly DatasetMeta[] = [
    karateMeta,
    florentineFamiliesMeta,
    davisSouthernWomenMeta,
    lesMiserablesMeta,
    footballMeta,
    politicalBooksMeta,
    dolphinsMeta,
    contiguousUsaMeta,
    knuthMilesMeta,
    celegansNeuralMeta,
    politicalBlogsMeta,
    openflightsMeta,
    ...HOSTED_DATASETS,
];
