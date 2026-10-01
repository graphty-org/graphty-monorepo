import { type DatasetMeta } from "../build.js";

/** What the davisSouthernWomen dataset is, where it came from and under which terms. */
export const davisSouthernWomenMeta: DatasetMeta = {
    name: "davis-southern-women",
    title: "Davis Southern Women",
    description:
        "Attendance of 18 women at 14 social events in a Southern US town in the 1930s: a two-mode (bipartite) network with the women first (side 0) and the events E1 .. E14 second (side 1).",
    citation:
        "A. Davis, B. B. Gardner and M. R. Gardner, Deep South: A Social Anthropological Study of Caste and Class, University of Chicago Press (1941).",
    source: "https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py",
    license: "Facts published in a 1941 book; converted from the networkx 3.1 copy (BSD-3-Clause).",
    nodes: 32,
    edges: 89,
    directed: false,
    weighted: false,
    attributes: { side: "u8: 0 for a woman, 1 for an event (ground truth)" },
    groundTruth: "side",
    showcases: ["bipartite layout", "bipartite check and matching", "projection onto the women"],
};
