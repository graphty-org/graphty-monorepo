import { type DatasetMeta } from "../build.js";

/** What the celegansNeural dataset is, where it came from and under which terms. */
export const celegansNeuralMeta: DatasetMeta = {
    name: "celegans-neural",
    title: "C. elegans neural network",
    description:
        "The neurons of the nematode Caenorhabditis elegans and the connections between them, as compiled by Watts and Strogatz from the reconstruction of White et al. Directed; a weight counts the connections from one neuron to another. The 14 arcs the source lists twice are merged, their weights summed. Node labels are the neuron numbers of Watts' file.",
    citation:
        "D. J. Watts and S. H. Strogatz, Collective dynamics of 'small-world' networks, Nature 393, 440-442 (1998). doi:10.1038/30918; J. G. White, E. Southgate, J. N. Thomson and S. Brenner, The structure of the nervous system of the nematode Caenorhabditis elegans, Phil. Trans. R. Soc. London B 314, 1-340 (1986). doi:10.1098/rstb.1986.0056",
    source: "https://web.archive.org/web/20231227004245id_/https://public.websites.umich.edu/~mejn/netdata/celegansneural.zip",
    license:
        'unclear: Mark Newman\'s data page says only "free for scientific use to the best of my knowledge"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.',
    nodes: 297,
    edges: 2345,
    directed: true,
    weighted: true,
    attributes: { label: "string: the neuron number in Watts' data file" },
    groundTruth: null,
    showcases: [
        "small-world structure: high clustering, short paths",
        "directed, weighted centrality",
        "strongly connected components and reciprocity",
    ],
};
