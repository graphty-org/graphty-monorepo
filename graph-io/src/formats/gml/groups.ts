/**
 * The boxes yEd draws a GML file's open groups in (`isGroup 1` nodes, their members naming them by `gid`): round their
 * members (`yedGroupBounds`), with yEd's default insets, since GML stores none.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { plainCell } from "../../styles/plan/resolve.js";
import { yedLabelHeight } from "../graphml/styles-yed.js";
import { YED_GROUP_INSETS, type YedBox, yedGroupBounds, type YedGroupFrame } from "../graphml/yed-group-bounds.js";

/** A GML record as the importer keeps it. */
type Rec = Record<string, unknown>;

/**
 * A json cell of a node, as a record.
 * @param snapshot - the graph
 * @param name - the column
 * @param row - the node
 * @returns the record, or null
 */
function recordOf(snapshot: GraphSnapshot, name: string, row: number): Rec | null {
    const v = snapshot.nodes.has(name) ? plainCell(snapshot.nodes.value(name, row)) : undefined;
    return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : null;
}

/**
 * The frame of a yEd GML group: yEd's default insets, and the height of its labels anchored inside its top
 * (`LabelGraphics` `anchor` `t`, `tl` or `tr`) and its bottom (`b`, `bl`, `br`).
 * @param snapshot - the graph
 * @param row - the node
 * @returns the frame, or null for a node that is not a group
 */
function gmlGroupFrame(snapshot: GraphSnapshot, row: number): YedGroupFrame | null {
    const flag = snapshot.nodes.has("isGroup") ? Number(snapshot.nodes.value("isGroup", row)) : 0;
    if (flag !== 1) {
        return null;
    }
    const raw = snapshot.nodes.has("LabelGraphics") ? plainCell(snapshot.nodes.value("LabelGraphics", row)) : null;
    const labels = (Array.isArray(raw) ? raw : [raw]).filter(
        (l): l is Rec => typeof l === "object" && l !== null && !Array.isArray(l),
    );
    const label = (anchors: readonly string[]): number =>
        Math.max(
            0,
            ...labels
                .filter((l) => anchors.includes(String(l.anchor)) && typeof l.text === "string" && l.text !== "")
                .map((l) => yedLabelHeight(String(l.text), Number(l.fontSize ?? 12) || 12)),
        );
    const inset = YED_GROUP_INSETS;
    return { insets: [inset, inset, inset, inset], top: label(["t", "tl", "tr"]), bottom: label(["b", "bl", "br"]) };
}

/**
 * The boxes yEd draws a GML file's open groups in, by node index: left, top, right and bottom, y down.
 * @param snapshot - the graph the GML importer read
 * @returns the boxes of the groups with members
 */
export function gmlGroupBounds(snapshot: GraphSnapshot): Map<number, YedBox> {
    if (!snapshot.nodes.has("isGroup")) {
        return new Map();
    }
    const position = snapshot.nodes.byRole("position");
    return yedGroupBounds(
        snapshot,
        (row) => {
            const g = recordOf(snapshot, "graphics", row);
            const v = position?.isSet(row) === true ? (position.value(row) as ArrayLike<number>) : null;
            const [w, h] = [Number(g?.w), Number(g?.h)];
            if (v === null || ![v[0], v[1], w, h].every(Number.isFinite)) {
                return null;
            }
            return [v[0] - w / 2, v[1] - h / 2, v[0] + w / 2, v[1] + h / 2];
        },
        (row) => gmlGroupFrame(snapshot, row),
    );
}
