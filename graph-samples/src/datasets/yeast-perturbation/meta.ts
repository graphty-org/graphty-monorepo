import { type DatasetMeta } from "../build.js";

/** What the yeast-perturbation dataset is, where it came from and under which terms. */
export const yeastPerturbationMeta: DatasetMeta = {
    name: "yeast-perturbation",
    title: "Yeast galactose perturbation network (galFiltered)",
    description:
        "Cytoscape's canonical demo network: yeast genes and the protein-protein and protein-DNA interactions among those whose expression changed when the galactose pathway was perturbed. Directed as the session stores it; one repeated interaction is merged. Each gene carries its common name as the label, its saved Cytoscape position (x, y, y growing upward) and its expression log ratios in three knockouts. Read from the session file by graph-io's .cys importer.",
    citation:
        "T. Ideker, V. Thorsson, J. A. Ranish, R. Christmas, J. Buhler, J. K. Eng, R. Bumgarner, D. R. Goodlett, R. Aebersold and L. Hood, Integrated genomic and proteomic analyses of a systematically perturbed metabolic network, Science 292(5518), 929-934 (2001). doi:10.1126/science.292.5518.929",
    source: "https://raw.githubusercontent.com/cytoscape/cytoscape-tutorials/8d1f66e4cd12446f4a928ab72e3cf2660cd6c74a/protocols/data/galFiltered.cys",
    license: "CC0-1.0 (cytoscape-tutorials LICENSE).",
    nodes: 331,
    edges: 361,
    directed: true,
    weighted: false,
    attributes: {
        label: "string: the gene's common name, else its ORF",
        x: "f64: the saved Cytoscape x",
        y: "f64: the saved Cytoscape y, growing upward",
        gal1RGexp: "f64: expression log ratio, gal1 knockout",
        gal4RGexp: "f64: expression log ratio, gal4 knockout",
        gal80Rexp: "f64: expression log ratio, gal80 knockout",
    },
    groundTruth: null,
    showcases: [
        "drawing a network exactly as Cytoscape saved it (fixed layout from x and y)",
        "coloring nodes by expression with a diverging palette",
        "shortest paths through a regulatory network",
    ],
};
