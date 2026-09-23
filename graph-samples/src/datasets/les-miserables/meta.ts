import { type DatasetMeta } from "../build.js";

/** What the lesMiserables dataset is, where it came from and under which terms. */
export const lesMiserablesMeta: DatasetMeta = {
    name: "les-miserables",
    title: "Les Miserables co-appearances",
    description:
        "Characters of Victor Hugo's novel Les Miserables, joined when they appear in the same chapter; the weight counts those chapters. As in the Stanford GraphBase jean.dat, via networkx.",
    citation: "D. E. Knuth, The Stanford GraphBase: A Platform for Combinatorial Computing, Addison-Wesley (1993).",
    source: "https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py",
    license:
        "Derived from the Stanford GraphBase file jean.dat (copyright D. E. Knuth; may be freely copied and distributed, and a changed file must be renamed and identified as not part of the Stanford GraphBase -- this is such a changed file) through the networkx 3.1 copy (BSD-3-Clause).",
    nodes: 77,
    edges: 254,
    directed: false,
    weighted: true,
    attributes: {},
    groundTruth: null,
    showcases: [
        "weighted community detection",
        "betweenness (Valjean, Myriel)",
        "force-directed layouts with edge weights",
    ],
};
