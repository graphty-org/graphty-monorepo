import { type DatasetMeta } from "../build.js";

/** What the wikipathways-senescence-autophagy dataset is, where it came from and under which terms. */
export const wikipathwaysSenescenceAutophagyMeta: DatasetMeta = {
    name: "wikipathways-senescence-autophagy",
    title: "Senescence and autophagy in cancer (WikiPathways WP615)",
    description:
        "A drawn biological pathway from WikiPathways (WP615), as published on NDEx in CX2: gene products, metabolites, labels and anchor points, joined by the pathway's interactions. Positions matter here: each node carries its saved position (x, y, y growing upward), and eight anchor nodes sit exactly on the nodes they join. Node ids are the CX2 ids. Read by graph-io's CX2 importer.",
    citation:
        "WikiPathways WP615, Senescence and autophagy in cancer (Homo sapiens), https://www.wikipathways.org/pathways/WP615; NDEx network 72288e93-5c67-11ec-b3be-0ac135e8bacf. M. Agrawal et al., WikiPathways 2024: next generation pathway database, Nucleic Acids Research 52(D1), D679-D689 (2024). doi:10.1093/nar/gkad960",
    source: "https://www.ndexbio.org/v3/networks/72288e93-5c67-11ec-b3be-0ac135e8bacf",
    license: "CC0 1.0 (the network's rights: Waiver-No Rights Reserved (CC0), holder WikiPathways).",
    nodes: 161,
    edges: 118,
    directed: true,
    weighted: false,
    attributes: {
        label: "string: the node's name, else its id",
        x: "f64: the saved x",
        y: "f64: the saved y, growing upward",
        type: "dict: the WikiPathways element type (GeneProduct, Metabolite, ...)",
    },
    groundTruth: null,
    showcases: [
        "drawing a pathway exactly as published (fixed layout from x and y)",
        "coloring by element type",
        "a small directed graph with many components",
    ],
};
