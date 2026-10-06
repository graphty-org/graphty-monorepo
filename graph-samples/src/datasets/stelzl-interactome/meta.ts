import { type DatasetMeta } from "../build.js";

/** What the stelzl-interactome dataset is, where it came from and under which terms. */
export const stelzlInteractomeMeta: DatasetMeta = {
    name: "stelzl-interactome",
    title: "Human protein interaction network (Stelzl 2005)",
    description:
        "A human protein-protein interaction network from a yeast two-hybrid screen, as saved in a Cytoscape tutorial session. Node ids are Entrez gene ids and labels HUGO symbols; each protein carries its saved position (x, y, y growing upward). Directed as the session stores it; the session's 55 self-loops are dropped and its repeated interactions merged, so the graph is simple. Read by graph-io's .cys importer.",
    citation:
        "U. Stelzl et al., A human protein-protein interaction network: a resource for annotating the proteome, Cell 122(6), 957-968 (2005). doi:10.1016/j.cell.2005.08.029",
    source: "https://raw.githubusercontent.com/cytoscape/cytoscape-tutorials/8d1f66e4cd12446f4a928ab72e3cf2660cd6c74a/protocols/data/STELZ.cys",
    license: "CC0-1.0 (cytoscape-tutorials LICENSE).",
    nodes: 1691,
    edges: 3128,
    directed: true,
    weighted: false,
    attributes: {
        label: "string: the HUGO gene symbol, else the Entrez id",
        x: "f64: the saved Cytoscape x",
        y: "f64: the saved Cytoscape y, growing upward",
    },
    groundTruth: null,
    showcases: [
        "force layouts against a saved drawing at 1,700 nodes",
        "degree distribution and hubs of a real interactome",
        "community detection in a protein network",
    ],
};
