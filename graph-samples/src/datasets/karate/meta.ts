import { type DatasetMeta } from "../build.js";

/** What the karate dataset is, where it came from and under which terms. */
export const karateMeta: DatasetMeta = {
    name: "karate",
    title: "Zachary's karate club",
    description:
        "Friendships among the 34 members of a university karate club, observed before the club split in two after a dispute between its instructor (node 0, Mr. Hi) and its administrator (node 33, the Officer). Edge weights count the contexts in which two members interacted.",
    citation:
        "W. W. Zachary, An information flow model for conflict and fission in small groups, Journal of Anthropological Research 33(4), 452-473 (1977). doi:10.1086/jar.33.4.3629752",
    source: "https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py",
    license: "Facts published in a 1977 journal article; converted from the networkx 3.1 copy (BSD-3-Clause).",
    nodes: 34,
    edges: 78,
    directed: false,
    weighted: true,
    attributes: { club: 'dict: the faction each member joined after the split, "Mr. Hi" or "Officer" (ground truth)' },
    groundTruth: "club",
    showcases: [
        "community detection against a known two-way split (Louvain, Leiden, label propagation, Girvan-Newman)",
        "degree, betweenness and closeness centrality",
        "minimum cut between nodes 0 and 33",
        "spring and Kamada-Kawai layouts",
    ],
};
