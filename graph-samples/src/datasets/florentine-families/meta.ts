import { type DatasetMeta } from "../build.js";

/** What the florentineFamilies dataset is, where it came from and under which terms. */
export const florentineFamiliesMeta: DatasetMeta = {
    name: "florentine-families",
    title: "Florentine families",
    description:
        "Marriage alliances between 15 leading families of Renaissance Florence around 1430. The Medici sit on most shortest paths. networkx drops the isolated Pucci family of the original 16.",
    citation:
        "J. F. Padgett and C. K. Ansell, Robust action and the rise of the Medici, 1400-1434, American Journal of Sociology 98(6), 1259-1319 (1993). doi:10.1086/230190; R. L. Breiger and P. E. Pattison, Cumulated social roles: the duality of persons and their algebras, Social Networks 8(3), 215-256 (1986).",
    source: "https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py",
    license: "Facts published in the cited articles; converted from the networkx 3.1 copy (BSD-3-Clause).",
    nodes: 15,
    edges: 20,
    directed: false,
    weighted: false,
    attributes: {},
    groundTruth: null,
    showcases: ["betweenness and closeness centrality (the Medici)", "shortest paths", "circular and shell layouts"],
};
