/** ngraph.forcelayout's own spring length: how far apart, in scene units, the default force layout puts two connected nodes. */
export const NGRAPH_SPRING_LENGTH = 10;

/**
 * How far apart, in scene units, the default force layout leaves the nodes once it settles in two dimensions: the median distance from a
 * node to its nearest neighbor, about 0.6 of its spring length (0.52 to 0.81 over the eight fidelity samples with no
 * positions it lays out: cx-radiation-bibliography, cx-repro-unplaced-boxes and six json-vis-* files).
 */
export const NGRAPH_SETTLED_SPACING = 6;
