import { type DatasetMeta } from "./build.js";
import { davisSouthernWomenMeta } from "./davis-southern-women/meta.js";
import { dolphinsMeta } from "./dolphins/meta.js";
import { florentineFamiliesMeta } from "./florentine-families/meta.js";
import { footballMeta } from "./football/meta.js";
import { karateMeta } from "./karate/meta.js";
import { lesMiserablesMeta } from "./les-miserables/meta.js";
import { politicalBooksMeta } from "./political-books/meta.js";

/**
 * The metadata of every bundled dataset (no graph data: each dataset's edges load only from its
 * own subpath, `@graphty/graph-samples/datasets/<name>`).
 */
export const DATASETS: readonly DatasetMeta[] = [
    karateMeta,
    florentineFamiliesMeta,
    davisSouthernWomenMeta,
    lesMiserablesMeta,
    footballMeta,
    politicalBooksMeta,
    dolphinsMeta,
];
