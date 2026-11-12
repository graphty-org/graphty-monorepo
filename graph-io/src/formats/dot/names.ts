/**
 * The names the DOT importer and exporter share: the format name, the column origin, the
 * format-owned columns (design section 5.6: `graphty.` prefix) and the attribute names the format
 * gives a fixed meaning to.
 */

import { type ColumnOriginInput } from "@graphty/graph-format";

/**
 * The format name.
 * @category Plugin helpers
 */
export const DOT_FORMAT = "dot";

/**
 * The origin recorded on every column the importer declares.
 * @category Plugin helpers
 */
export const DOT_ORIGIN: ColumnOriginInput = Object.freeze({ format: DOT_FORMAT });

/**
 * The bool node column marking a cluster's container node.
 * @category Plugin helpers
 */
export const CLUSTER_COLUMN = "graphty.cluster";

/**
 * The u32 node column (role parent, refersTo node) holding a member's cluster.
 * @category Plugin helpers
 */
export const PARENT_COLUMN = "graphty.parent";

/**
 * The string edge column (role sourcePort) holding an edge's tail port.
 * @category Plugin helpers
 */
export const SOURCE_PORT_COLUMN = "graphty.sourcePort";

/**
 * The string edge column (role targetPort) holding an edge's head port.
 * @category Plugin helpers
 */
export const TARGET_PORT_COLUMN = "graphty.targetPort";

/**
 * The attribute that is the display label (kept as text with role label).
 * @category Plugin helpers
 */
export const LABEL_ATTRIBUTE = "label";

/**
 * The node attribute holding a position, mapped to the position role column (design section 5.2).
 * @category Plugin helpers
 */
export const POS_ATTRIBUTE = "pos";

/**
 * The node position column when the import keeps `pos` as text too (the `keepPositionSource` option).
 * @category Plugin helpers
 */
export const POSITION_COLUMN = "graphty.position";

/**
 * The edge attribute cgraph uses as an edge's identity within its endpoints, mapped to the edge id role.
 * @category Plugin helpers
 */
export const KEY_ATTRIBUTE = "key";

/**
 * The node attribute a `!` suffix of `pos` sets (Graphviz's own spelling of a pinned position).
 * @category Plugin helpers
 */
export const PIN_ATTRIBUTE = "pin";

/**
 * The key under meta.extra holding the format's graph flags (`{ strict: true }`).
 * @category Plugin helpers
 */
export const DOT_META_KEY = "dot";

/**
 * The string node column holding the `rank` of the non-cluster subgraph a node is in (`same`,
 * `min`, `max`, `source` or `sink`): Graphviz's dot puts the subgraph's nodes on one rank, or on
 * the first or last. Set only on nodes of such a subgraph.
 * @category Plugin helpers
 */
export const RANK_COLUMN = "graphty.rank";

/**
 * The string node column naming the rank subgraph a node is in (`graphty.rank`): the subgraph's
 * name, or `%<n>` for the n-th anonymous one, so the nodes of one subgraph share a value.
 * @category Plugin helpers
 */
export const RANK_SET_COLUMN = "graphty.rankSet";
