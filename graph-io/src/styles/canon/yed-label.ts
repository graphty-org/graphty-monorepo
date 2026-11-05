/**
 * How yEd lays a node label's words out in the label's box, shared by the readers of its GraphML and GML.
 */

/** How far yEd's label box reaches past its words on each side. */
export const YED_LABEL_PADDING = 2;

/** How far in from a side yEd's internal label model puts a label's box, by default. */
export const YED_INSIDE_INSET = 4;

/**
 * Whether a label is as tall as its node, by its `autoSizePolicy`: its box then fills the node's height and its words
 * stand at the box's top, where a label sized to its words or to the node's width is centered.
 * @param policy - the policy
 * @returns true for `node_size` and `node_height`
 */
export function yedLabelFillsNodeHeight(policy: string | null | undefined): boolean {
    return policy === "node_size" || policy === "node_height";
}
