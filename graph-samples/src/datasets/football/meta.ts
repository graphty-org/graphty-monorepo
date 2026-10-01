import { type DatasetMeta } from "../build.js";

/** What the football dataset is, where it came from and under which terms. */
export const footballMeta: DatasetMeta = {
    name: "football",
    title: "American college football, 2000",
    description:
        "Games between Division IA colleges in the regular season of fall 2000, with each team's conference, as corrected by T. S. Evans: three repeated games removed and the conference assignments moved from the 2001 to the 2000 season. The eight independent teams each get their own label.",
    citation:
        "M. Girvan and M. E. J. Newman, Community structure in social and biological networks, PNAS 99(12), 7821-7826 (2002). doi:10.1073/pnas.122653799; T. S. Evans, Clique graphs and overlapping communities, J. Stat. Mech. (2010) P12037. arXiv:1009.0638",
    source: "https://figshare.com/articles/dataset/American_College_Football_Network_Files/93179",
    license: "CC BY 4.0 (the figshare record of T. S. Evans).",
    nodes: 115,
    edges: 613,
    directed: false,
    weighted: false,
    attributes: { label: "string: the team", conference: "dict: the team's 2000 conference (ground truth)" },
    groundTruth: "conference",
    showcases: ["community detection scored against the conferences", "spring layout coloured by conference"],
};
