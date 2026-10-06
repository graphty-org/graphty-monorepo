import { type DatasetMeta } from "../build.js";

/** What the go-slim-generic dataset is, where it came from and under which terms. */
export const goSlimGenericMeta: DatasetMeta = {
    name: "go-slim-generic",
    title: "Generic GO slim (Gene Ontology)",
    description:
        "The Gene Ontology's generic slim: a cut-down set of GO terms across all three namespaces (biological process, molecular function, cellular component) and the relations among them, the GO in miniature. An arc runs from a term to its parent (is_a, part_of, ...); a term related to one parent in two ways keeps one arc. Read by graph-io's OBO importer from the release of 2026-07-26.",
    citation:
        "The Gene Ontology Consortium, The Gene Ontology knowledgebase in 2023, Genetics 224(1), iyad031 (2023). doi:10.1093/genetics/iyad031; GO release 2026-07-26 (release.geneontology.org/2026-08-05)",
    source: "https://release.geneontology.org/2026-08-05/ontology/subsets/goslim_generic.obo",
    license: "CC BY 4.0 (Gene Ontology Consortium; https://geneontology.org/docs/go-citation-policy/).",
    nodes: 140,
    edges: 62,
    directed: true,
    weighted: false,
    attributes: {
        label: "string: the term's name",
        namespace: "dict: biological_process, molecular_function or cellular_component (ground truth)",
    },
    groundTruth: "namespace",
    showcases: [
        "hierarchical and tree layouts of an ontology DAG",
        "topological order and ancestors",
        "coloring terms by namespace",
    ],
};
