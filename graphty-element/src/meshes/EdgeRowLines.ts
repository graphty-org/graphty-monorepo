import { Color3, type Scene } from "@babylonjs/core";
import { INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeStyleConfig } from "../config";
import { drawnText } from "../config/RichTextStyle";
import { EDGE_CONSTANTS } from "../constants/meshConstants";
import type { EdgePaint } from "../managers/StylePainter";
import type { RowTable } from "../render/RowTable";
import { EdgeMesh } from "./EdgeMesh";
import { batchUploadFrames } from "./FrameRoster";
import type { MeshCache } from "./MeshCache";
import type { PulledLineBatch } from "./PulledLineBatch";

/** Style keys a row line may set: any other needs an `Edge` (a cap, a label or a band is drawn by one). */
const ROW_STYLE_KEYS = new Set(["line", "label", "arrowHead", "arrowTail", "band", "visible"]);

/**
 * Line keys a row line draws exactly as an `Edge`'s pulled straight line does. A curve, a fan, a gap, bends, a
 * support point is shaped per edge, and an animation (a non-zero `animationSpeed`) moves, so each needs an `Edge`.
 */
const ROW_LINE_KEYS = new Set(["type", "animationSpeed", "width", "color", "opacity", "minScreenWidth", "route"]);

/**
 * Whether every key set on a style block is one of the keys named.
 * @param block - The block.
 * @param keys - The keys it may set.
 * @returns False when it sets any other.
 */
function setsOnly(block: object, keys: ReadonlySet<string>): boolean {
    return Object.entries(block).every(([key, value]) => value === undefined || value === false || keys.has(key));
}

/**
 * Whether an end draws no cap and no words.
 * @param cap - The end's style.
 * @returns True for none.
 */
function noCap(cap: EdgeStyleConfig["arrowHead"]): boolean {
    return cap === undefined || ((cap.type ?? "none") === "none" && cap.text === undefined);
}

/** What a row line is drawn with: a straight pulled piece, the batch it came from, and its nodes' rows. */
interface RowLine {
    readonly batch: PulledLineBatch;
    readonly piece: number;
    readonly source: number;
    readonly target: number;
}

/** What {@link EdgeRowLines} reads from the graph. */
export interface EdgeRowLinesHost {
    readonly scene: Scene;
    readonly cache: MeshCache;
    readonly rows: RowTable;
    /** Whether lines take the lean program (`GraphContext.leansLines`). */
    readonly lean: () => boolean;
    /** Ask for a frame, so a row painted or unpainted shows. */
    readonly requestFrame: () => void;
}

/**
 * Edge rows drawn with no `Edge`: each a straight line pulled from its two nodes' rows, the piece an `Edge`'s plain
 * pulled line takes (`Edge.pullLine`), with the same look. Only under `"batched"`, for the lazy-edge stage of
 * design/rendering/row-renderer.md. {@link EdgeRowLines.paintRow} returns false for a paint only an `Edge` draws;
 * a self-loop, a route the layout's map arcs, and an end drawn behind edges are the caller's to rule out.
 */
export class EdgeRowLines {
    private readonly lines = new Map<number, RowLine>();

    /**
     * Start with no edge row drawn.
     * @param host - What it reads from the graph.
     */
    constructor(private readonly host: EdgeRowLinesHost) {}

    /**
     * How many edge rows are drawn here.
     * @returns The count.
     */
    get count(): number {
        return this.lines.size;
    }

    /**
     * Whether an edge row is drawn here.
     * @param row - The edge row.
     * @returns True when it is.
     */
    has(row: number): boolean {
        return this.lines.has(row);
    }

    /**
     * The nodes' rows an edge row's line is pulled from.
     * @param row - The edge row.
     * @returns Its source and target rows, or undefined for a row not drawn here.
     * @internal
     */
    endsOf(row: number): [number, number] | undefined {
        const line = this.lines.get(row);
        return line === undefined ? undefined : [line.source, line.target];
    }

    /**
     * Whether a paint is one a row line draws: a shown, plain solid straight line with no cap, words or band,
     * while lines do not fade by age. A hidden paint is refused: an `Edge` hides its line.
     * @param style - The resolved style.
     * @returns True when no `Edge` is needed.
     */
    draws(style: EdgeStyleConfig): boolean {
        const line = style.line ?? {};
        return (
            style.visible !== false &&
            (line.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH) > 0 &&
            setsOnly(style, ROW_STYLE_KEYS) &&
            setsOnly(line, ROW_LINE_KEYS) &&
            (line.type ?? "solid") === "solid" &&
            !line.animationSpeed &&
            !EdgeMesh.pullsCurve(style) &&
            drawnText(style.label) === undefined &&
            noCap(style.arrowHead) &&
            noCap(style.arrowTail) &&
            style.band?.color === undefined &&
            !batchUploadFrames.edgeAges(this.host.scene).on
        );
    }

    /**
     * Draw an edge row from its paint, between its two nodes' rows, replacing what drew it before.
     * @param row - The edge row.
     * @param source - Its source node's row.
     * @param target - Its target node's row.
     * @param paint - Its paint.
     * @returns False, drawing nothing, for a paint only an `Edge` draws ({@link EdgeRowLines.draws}).
     */
    paintRow(row: number, source: number, target: number, paint: EdgePaint): boolean {
        this.unpaintRow(row);
        const { style, meshKey } = paint;
        if (!this.draws(style)) {
            return false;
        }

        const { scene, cache, rows } = this.host;
        const width = style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH;
        const color = style.line?.color ?? "#FFFFFF";
        const batch = EdgeMesh.pulledBatch(
            cache,
            { styleId: meshKey, width, color },
            style,
            scene,
            () => rows.positionTexture,
            { route: "straight", lean: this.host.lean() },
        );
        const piece = batch.acquire();
        // as `Edge.pullLine` gives its piece the look: in 2D a world width
        batch.setLook(
            piece,
            Color3.FromHexString(color),
            EdgeMesh.opacityOf(style),
            EdgeMesh.drawsFlat(scene) ? width / 40 : width * 20,
        );
        batch.setRows(piece, source, target);
        this.lines.set(row, { batch, piece, source, target });
        this.host.requestFrame();
        return true;
    }

    /**
     * Stop drawing an edge row here; nothing for a row not drawn here.
     * @param row - The edge row.
     */
    unpaintRow(row: number): void {
        const line = this.lines.get(row);
        if (line !== undefined) {
            line.batch.release(line.piece);
            this.lines.delete(row);
            this.host.requestFrame();
        }
    }

    /**
     * A freeze renumbered the rows: each line moves to its edge's new row and is pulled from its nodes' new rows,
     * and a line whose edge row or either node row the freeze dropped stops being drawn.
     * @param nodeRemap - The freeze's node remap: old row to new, INVALID_INDEX for a dropped row; null when none moved.
     * @param edgeRemap - The freeze's edge remap, the same way.
     */
    rowsMoved(nodeRemap: ArrayLike<number> | null, edgeRemap: ArrayLike<number> | null): void {
        if ((nodeRemap === null && edgeRemap === null) || this.lines.size === 0) {
            return;
        }

        const moved = (remap: ArrayLike<number> | null, row: number): number =>
            remap === null ? row : (remap[row] ?? INVALID_INDEX);
        const lines = [...this.lines];
        this.lines.clear();
        for (const [row, line] of lines) {
            const edge = moved(edgeRemap, row);
            const source = moved(nodeRemap, line.source);
            const target = moved(nodeRemap, line.target);
            if (edge === INVALID_INDEX || source === INVALID_INDEX || target === INVALID_INDEX) {
                line.batch.release(line.piece);
                continue;
            }

            line.batch.setRows(line.piece, source, target);
            this.lines.set(edge, { ...line, source, target });
        }

        this.host.requestFrame();
    }

    /** Stop drawing every edge row here. */
    clear(): void {
        for (const row of [...this.lines.keys()]) {
            this.unpaintRow(row);
        }
    }
}
