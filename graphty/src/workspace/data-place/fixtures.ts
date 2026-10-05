/**
 * Small files the Data place's stories and tests load through the element's own import, inline so
 * nothing is fetched. Each is what a reader could open: a graph file and a plain JSON file.
 */

/** Eight characters with names, groups and (for two of them) a birth year; ties counted. */
export const GRAPH_FILE_GML = `graph [
  directed 0
  node [ id 0 label "Valjean" group 1 born 1769 ]
  node [ id 1 label "Javert" group 2 born 1780 ]
  node [ id 2 label "Fantine" group 1 ]
  node [ id 3 label "Cosette" group 1 ]
  node [ id 4 label "Marius" group 3 ]
  node [ id 5 label "Thenardier" group 2 ]
  node [ id 6 label "Gavroche" group 3 ]
  node [ id 7 label "Eponine" group 2 ]
  edge [ source 0 target 1 value 17 ]
  edge [ source 0 target 2 value 9 ]
  edge [ source 0 target 3 value 31 ]
  edge [ source 3 target 4 value 21 ]
  edge [ source 1 target 5 value 5 ]
  edge [ source 4 target 6 value 4 ]
  edge [ source 5 target 7 value 6 ]
  edge [ source 4 target 7 value 5 ]
  edge [ source 2 target 5 value 2 ]
]
`;

/** A plain JSON file: nodes with a name and a score, edges with no attributes. */
export const PLAIN_JSON = JSON.stringify({
    nodes: [
        { id: "a", name: "Alpha", score: 0.5 },
        { id: "b", name: "Bravo", score: 1.25 },
        { id: "c", name: "Charlie", score: 2 },
        { id: "d", name: "Delta" },
    ],
    edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "d" },
        { source: "d", target: "a" },
    ],
});

/** A JSON file whose nodes carry 16 attributes besides their id, past the 15 at which Find appears. */
export const WIDE_JSON = JSON.stringify({
    nodes: ["a", "b", "c"].map((id, i) => ({
        id,
        ...Object.fromEntries(Array.from({ length: 16 }, (_, k) => [`m${String(k + 1).padStart(2, "0")}`, i + k])),
    })),
    edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ],
});
