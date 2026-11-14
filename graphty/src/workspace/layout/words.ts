/** The layout form's Transition row: its name, its choices and its settings. */
export const TRANSITION_WORDS = {
    transition: "Transition",
    none: "None",
    seconds: "Seconds",
    /** An unset duration: the element's own. */
    defaultSeconds: "Default",
    settings: (name: string): string => `${name} settings`,
} as const;

/** The layout form's row that lays out only the nodes the filter shows. */
export const SHOWN_ONLY_WORDS = {
    shownOnly: "Shown nodes only",
} as const;

/**
 * The line under a layout's name in the Layout list and form, by catalog id; an engine other than
 * the layout's default by `<id>:<engine>`. A layout a third party registered has none.
 */
export const LAYOUT_DESCRIPTIONS: Readonly<Record<string, string>> = {
    force: "Pulls connected nodes together and pushes unconnected ones apart until the shape stops moving, in three dimensions or flat.",
    "force:d3": "d3's force simulation, tuned with alpha, alpha decay and velocity decay.",
    "force:forceatlas2": "Gephi's force model: hubs push apart strongly, so groups and their hubs stand out.",
    "force:spring": "Fruchterman-Reingold springs: connected nodes attract, all nodes repel, cooling to a still shape.",
    "force:kamada-kawai": "Moves nodes until their drawn distances match their graph distances.",
    "force:spring-electrical": "ngraph's spring-electrical force model, computed on an accelerator.",
    "force:arf": "Attractive and repulsive forces in two dimensions, spreading nodes evenly over a disc.",
    circular: "Places every node on one circle, in the order the nodes were loaded.",
    radial: "Puts one node at the center and every other node on a ring by how many steps away it is, so the rings read outward as distance from that node.",
    grid: "Places nodes in evenly spaced rows and columns, in the order the nodes were loaded.",
    shell: "Places each group of nodes on its own ring, around a shared center.",
    spiral: "Places nodes one after another along a spiral winding out from the center.",
    spectral:
        "Places nodes from the graph's own structure, so densely connected groups land near each other without any grouping being named.",
    planar: "Places nodes so that no two edges cross, for the graphs where that is possible.",
    random: "Puts every node somewhere at random, which is where a live layout starts.",
    hierarchical:
        "Puts nodes in rows by how many steps they are from a starting node, so the graph reads as a tree growing away from it.",
    bipartite:
        "Puts one named set of nodes in one column and everything else in a second, for a graph whose edges only ever run between the two.",
    layers: "Puts each group of nodes in its own column, in the order the groups are given.",
    fixed: "Leaves every node exactly where the loaded data placed it.",
    "location-map": "Puts every node at the place its data names, on a flat map or a globe drawn under the graph.",
    "graphviz-dot": "Puts nodes in ranks so edges point one way, and orders each rank to cross as few edges as it can.",
    "graphviz-neato": "Places nodes so their drawn distances match their graph distances.",
    "graphviz-fdp": "Pulls connected nodes together and pushes the rest apart, with spring forces.",
    "graphviz-sfdp": "The force-directed drawing for large graphs, settled from coarse to fine.",
    "graphviz-circo": "Puts each tightly connected part of the graph on its own circle.",
    "graphviz-twopi": "Puts a root at the center and every other node on a ring by its distance from it.",
    "graphviz-osage": "Packs the nodes into a tight array of rows and columns.",
    "graphviz-patchwork": "Tiles the nodes as squares packed into one rectangle.",
};
