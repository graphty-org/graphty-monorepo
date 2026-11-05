/**
 * How yEd lays a node label's words out in the label's box, shared by the readers of its GraphML and GML.
 */

/** How far yEd's label box reaches past its words on each side. */
export const YED_LABEL_PADDING = 2;

/** How far in from a side yEd's internal label model puts a label's box, by default. */
export const YED_INSIDE_INSET = 4;

/** How far out from a side yEd's outside label models put a label's box, by default. */
export const YED_OUTSIDE_DISTANCE = 4;

/**
 * Whether a label is as tall as its node, by its `autoSizePolicy`: its box then fills the node's height and its words
 * stand at the box's top, where a label sized to its words or to the node's width is centered.
 * @param policy - the policy
 * @returns true for `node_size` and `node_height`
 */
export function yedLabelFillsNodeHeight(policy: string | null | undefined): boolean {
    return policy === "node_size" || policy === "node_height";
}

/**
 * Whether a label's box is as wide as its node, by its `autoSizePolicy`: a group's header band.
 * @param policy - the policy
 * @returns true for `node_size` and `node_width`
 */
export function yedLabelFillsNodeWidth(policy: string | null | undefined): boolean {
    return policy === "node_size" || policy === "node_width";
}

/**
 * What a yEd label's box is sized to: as wide as its node by its `autoSizePolicy`, or held against the side it stands
 * inside, as yEd holds it however large its words are.
 * @param policy - the label's `autoSizePolicy`
 * @param position - where the label is placed
 * @returns the `labelBox`, or null for one that takes the default
 */
export function yedLabelBox(policy: string | null | undefined, position: string | null | undefined): string | null {
    if (yedLabelFillsNodeWidth(policy)) {
        return "target-width";
    }
    return position?.startsWith("inside-") === true ? "words-at-side" : null;
}
