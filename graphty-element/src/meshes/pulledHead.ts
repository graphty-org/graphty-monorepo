import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { EdgeStyleConfig } from "../config";
import { drawnText } from "../config/RichTextStyle";
import { EDGE_CONSTANTS } from "../constants/meshConstants";
import type { RowTable } from "../render/RowTable";
import type { ArrowCapBatch, PulledCapPlace } from "./ArrowCapBatch";
import { EdgeMesh } from "./EdgeMesh";
import { FilledArrowRenderer } from "./FilledArrowRenderer";
import type { PulledCapLook } from "./restPlacement";

/**
 * @file An arrowhead drawn from the row table (`ArrowCapBatch.setPulled`) at the target end of a straight pulled line, on
 * renderPath "batched": the head a row line (`EdgeRowLines`) or an `Edge`'s pulled line (`Edge.pullLine`) draws, so
 * neither a directed graph's default look nor an arrowhead restyle needs an object edge. The line stops at the head's
 * back (`PulledLineBatch.setCapBack`, `PULLED_TRIM_GLSL`'s `pulledCapTrim`), as `Edge.transformArrowCap` ends it.
 */

/** What a pulled head is drawn with, decided once for every edge painted with one style. */
export interface PulledHead {
    /** Its shape's key, as `EdgeMesh.createArrowHead` keys an object edge's cap of that shape. */
    readonly key: string;
    /** The options its shape is made from (`EdgeMesh.billboardShape`). */
    readonly shape: Parameters<typeof EdgeMesh.billboardShape>[0];
    readonly opacity: number;
    /** Its color. */
    readonly colour: Color3;
    /** What the cap stands back by. */
    readonly place: PulledCapPlace;
    /** How far before the target's outline the line stops, at node scale 1 (`Edge.capBack`). */
    readonly lineStop: number;
    /** What the batch places the head by at rest (`ArrowCapBatch.setPulled`). */
    readonly look: PulledCapLook;
}

/** The answer of {@link pulledHeadOf} for each style: a painted style is shared and never changed. */
const heads = new WeakMap<EdgeStyleConfig, PulledHead | null>();

/**
 * The head a style's straight pulled line draws from the row table, as `Edge.placeArrowHead` stands an object edge's
 * head: a 3D billboarded cap at the target end, of a shape the billboard shader draws in one material
 * (`EdgeMesh.billboardShape`), with no words, no gap, no row behind it (`stack`) and not part-way along. The caller
 * rules out 2D, a curve and an end that is not round.
 * @param style - The resolved style, with a head that draws (`EdgeMesh.drawsNoCap` false).
 * @returns The head, or null for a head only an object edge draws.
 */
export function pulledHeadOf(style: EdgeStyleConfig): PulledHead | null {
    let head = heads.get(style);
    if (head === undefined) {
        head = judge(style);
        heads.set(style, head);
    }

    return head;
}

/**
 * {@link pulledHeadOf}, uncached.
 * @param style - The resolved style.
 * @returns The head, or null.
 */
function judge(style: EdgeStyleConfig): PulledHead | null {
    const arrow = style.arrowHead ?? {};
    const type = arrow.type ?? "none";
    const size = arrow.size ?? 1;
    if (
        drawnText(arrow.text) !== undefined ||
        (arrow.position ?? 0) !== 0 ||
        (arrow.gap ?? 0) !== 0 ||
        arrow.stack !== undefined
    ) {
        return null;
    }

    const shape = {
        type,
        width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
        color: "",
        size,
        breadth: arrow.width,
        side: arrow.side,
        outline: arrow.outlineWidth,
        fill: arrow.fillColor,
    };
    // the key alone: a shape's mesh is made once per batch, in the scene that draws it
    const key = EdgeMesh.billboardShapeKey(shape);
    if (key === null) {
        return null;
    }

    const opacity = arrow.opacity ?? 1;
    const length = EdgeMesh.calculateArrowLength() * size;
    const geometry = EdgeMesh.getArrowGeometry(type, {
        lineWidth: style.line?.width,
        size: arrow.size,
        breadth: arrow.width,
    });
    // EdgeMesh.calculateArrowPosition: a round cap's center half its size behind the tip, any other by its offset
    const centreBack =
        geometry.positioningMode === "center"
            ? (length * (geometry.scaleFactor ?? 1)) / 2
            : length * geometry.positionOffset;
    return {
        key,
        shape,
        opacity,
        colour: Color3.FromHexString(arrow.color ?? style.line?.color ?? "#FFFFFF"),
        place: { centreBack, size: length },
        lineStop: EdgeMesh.lineStopOf(length, geometry),
        look: {
            size: length,
            // EdgeMesh.calculateArrowPosition's stand-back, step for step
            centreBackAt: (at) =>
                geometry.positioningMode === "center"
                    ? (at * (geometry.scaleFactor ?? 1)) / 2
                    : at * geometry.positionOffset,
            lineStopAt: (at) => EdgeMesh.lineStopOf(at, geometry),
        },
    };
}

/**
 * The cap batch a head is drawn in: the one an object edge's cap of its shape and pass is drawn in, so the two draw in
 * the order their slots were taken, as the object path draws every cap (`FilledArrowRenderer.capBatchOf`).
 * @param head - The head.
 * @param scene - The scene, drawn on renderPath "batched" (`pulledCapHosts`).
 * @returns The batch.
 */
export function pulledHeadBatch(head: PulledHead, scene: Scene): ArrowCapBatch {
    return FilledArrowRenderer.capBatchOf(
        head.key,
        () => {
            const shape = EdgeMesh.billboardShape(head.shape, scene);
            if (shape === null) {
                throw new Error(`no billboarded cap for ${head.key}`);
            }

            return shape.create();
        },
        head.opacity,
        scene,
    );
}

/**
 * Whether a node row's outline is round, so a pulled head stands on it with no ray (`RowTable.extentOf`).
 * @param rows - The row table.
 * @param row - The node row.
 * @returns True when it is.
 */
export function roundRow(rows: RowTable, row: number): boolean {
    return row >= 0 && rows.isRound(row);
}
