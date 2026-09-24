import { type DatasetMeta } from "../build.js";

/** What the dolphins dataset is, where it came from and under which terms. */
export const dolphinsMeta: DatasetMeta = {
    name: "dolphins",
    title: "Doubtful Sound dolphins",
    description:
        "Frequent associations between 62 bottlenose dolphins of a community living off Doubtful Sound, New Zealand, observed 1994-2001; a standard two-community example for community detection.",
    citation:
        "D. Lusseau, K. Schneider, O. J. Boisseau, P. Haase, E. Slooten and S. M. Dawson, The bottlenose dolphin community of Doubtful Sound features a large proportion of long-lasting associations, Behavioral Ecology and Sociobiology 54, 396-405 (2003). doi:10.1007/s00265-003-0651-y",
    source: "https://web.archive.org/web/20231115052843id_/https://www-personal.umich.edu/~mejn/netdata/dolphins.zip",
    license:
        'unclear: posted on Mark Newman\'s data page with the permission of D. Lusseau, "free for scientific use"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.',
    nodes: 62,
    edges: 159,
    directed: false,
    weighted: false,
    attributes: { label: "string: the dolphin's name" },
    groundTruth: null,
    showcases: ["community detection", "betweenness (the dolphins that bridge the two groups)", "spring layout"],
};
