import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import type { Scene } from "@babylonjs/core/scene.js";
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
/** A row's batch column value when the row draws no line here. */
const NO_LINE = -1;

/** The first rows the line columns hold before they grow. */
const FIRST_ROWS = 1024;

/**
 * The row lines, by edge row, as columns: no object per row line (43 B an edge at a million).
 */
class LineColumns {
    /** Each row's batch, as its place in {@link batches}, or {@link NO_LINE}. */
    batchOf = new Int32Array(FIRST_ROWS).fill(NO_LINE);
    piece = new Int32Array(FIRST_ROWS);
    source = new Int32Array(FIRST_ROWS);
    target = new Int32Array(FIRST_ROWS);
    /** 1 for a row the edge masks hide: its piece draws nothing, and keeps its rows here to be shown again. */
    hidden = new Uint8Array(FIRST_ROWS);

    has(row: number): boolean {
        return (this.batchOf[row] ?? NO_LINE) !== NO_LINE;
    }

    set(row: number, batch: number, piece: number, source: number, target: number): void {
        if (row >= this.batchOf.length) {
            const rows = Math.max(row + 1, this.batchOf.length * 2);
            const grown = (from: Int32Array<ArrayBuffer>): Int32Array<ArrayBuffer> => {
                const to = new Int32Array(rows);
                to.set(from);
                return to;
            };
            const batchOf = grown(this.batchOf);
            batchOf.fill(NO_LINE, this.batchOf.length);
            this.batchOf = batchOf;
            this.piece = grown(this.piece);
            this.source = grown(this.source);
            this.target = grown(this.target);
            const hidden = new Uint8Array(rows);
            hidden.set(this.hidden);
            this.hidden = hidden;
        }

        this.batchOf[row] = batch;
        this.piece[row] = piece;
        this.source[row] = source;
        this.target[row] = target;
        this.hidden[row] = 0;
    }
}

/** What a style draws a row line with ({@link EdgeRowLines.paintRow}); `setLook` copies `rgb`, so it is shared. */
interface RowLook {
    readonly style: EdgeStyleConfig;
    readonly draws: boolean;
    readonly width: number;
    readonly color: string;
    readonly rgb: Color3;
    readonly opacity: number;
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
    /**
     * Each drawn row's line, at its row: a million-row load spent about 0.3 s of CPU in a map keyed by row
     * (design/rendering/cosmos-gap.md G8). Rows are dense, so the array stays packed when a load paints in order.
     */
    private lines = new LineColumns();
    /** The batches the row lines are drawn in, one per look: a row names its batch by its place here. */
    private readonly batches: PulledLineBatch[] = [];
    private drawn = 0;
    private lastLook: RowLook | null = null;

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
        return this.drawn;
    }

    /**
     * The objects held in plain arrays here, beyond the per-look batch list: every object slot of every
     * other array field, so a list that keeps an object per row line shows up however it is named.
     * @returns How many.
     * @internal
     */
    get rowObjects(): number {
        let count = 0;
        for (const [key, value] of Object.entries(this)) {
            if (key !== "batches" && Array.isArray(value)) {
                count += value.filter((slot) => typeof slot === "object" && slot !== null).length;
            }
        }

        return count;
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
     * The edge rows drawn here.
     * @returns Them, a copy.
     */
    rows(): number[] {
        return this.drawnRows();
    }

    /**
     * The nodes' rows an edge row's line is pulled from.
     * @param row - The edge row.
     * @returns Its source and target rows, or undefined for a row not drawn here.
     * @internal
     */
    endsOf(row: number): [number, number] | undefined {
        const { lines } = this;
        return lines.has(row) ? [lines.source[row], lines.target[row]] : undefined;
    }

    /**
     * Whether an edge row's line is hidden ({@link EdgeRowLines.setHidden}).
     * @param row - The edge row.
     * @returns True for a drawn row that is hidden; false for a shown one or a row not drawn here.
     * @internal
     */
    isHidden(row: number): boolean {
        return this.lines.has(row) && this.lines.hidden[row] === 1;
    }

    /**
     * Hide or show an edge row's line, as the edge masks say: its piece draws nothing while hidden and keeps its
     * place, look and nodes' rows, so a time window that hides and shows rows builds no `Edge` and writes only the
     * pieces' hidden flags. Nothing for a row not drawn here.
     * @param row - The edge row.
     * @param hidden - Whether it is hidden.
     */
    setHidden(row: number, hidden: boolean): void {
        const { lines } = this;
        if (!lines.has(row) || (lines.hidden[row] === 1) === hidden) {
            return;
        }

        lines.hidden[row] = hidden ? 1 : 0;
        this.batches[lines.batchOf[row]].setHidden(lines.piece[row], hidden);
        this.host.requestFrame();
    }

    /**
     * Whether a paint is one a row line draws: a shown, plain solid straight line with no cap, words or band,
     * while lines do not fade by age. A hidden paint is refused: an `Edge` hides its line.
     * @param style - The resolved style.
     * @returns True when no `Edge` is needed.
     */
    draws(style: EdgeStyleConfig): boolean {
        return this.drawsStyle(style) && !batchUploadFrames.edgeAges(this.host.scene).on;
    }

    /**
     * Whether a style alone is one a row line draws ({@link EdgeRowLines.draws} but for the scene's fading by age).
     * @param style - The resolved style.
     * @returns True when it is.
     */
    private drawsStyle(style: EdgeStyleConfig): boolean {
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
            style.band?.color === undefined
        );
    }

    /**
     * What a style draws a row line with, decided once for every row painted with that style in a row: a load paints
     * a million rows with one style object (`StylePainter.edgePaint` reuses it).
     * @param style - The resolved style.
     * @returns Its look.
     */
    private lookOf(style: EdgeStyleConfig): RowLook {
        if (this.lastLook?.style !== style) {
            const color = style.line?.color ?? "#FFFFFF";
            this.lastLook = {
                style,
                draws: this.drawsStyle(style),
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color,
                rgb: Color3.FromHexString(color),
                opacity: EdgeMesh.opacityOf(style),
            };
        }

        return this.lastLook;
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
        const look = this.lookOf(style);
        const { scene, cache, rows } = this.host;
        if (!look.draws || batchUploadFrames.edgeAges(scene).on) {
            return false;
        }

        const { width, color } = look;
        const batch = EdgeMesh.pulledBatch(
            cache,
            { styleId: meshKey, width, color },
            style,
            scene,
            () => rows.positionTexture,
            { route: "straight", lean: this.host.lean() },
        );
        // as `Edge.pullLine` gives its piece the look: in 2D a world width
        const drawnWidth = EdgeMesh.drawsFlat(scene) ? width / 40 : width * 20;
        const piece = batch.acquire(drawnWidth);
        batch.setLook(piece, look.rgb, look.opacity, drawnWidth);
        batch.setRows(piece, source, target);
        let at = this.batches.indexOf(batch);
        if (at === -1) {
            at = this.batches.push(batch) - 1;
        }

        this.lines.set(row, at, piece, source, target);
        this.drawn++;
        this.host.requestFrame();
        return true;
    }

    /**
     * Stop drawing an edge row here; nothing for a row not drawn here.
     * @param row - The edge row.
     */
    unpaintRow(row: number): void {
        const { lines } = this;
        if (lines.has(row)) {
            this.batches[lines.batchOf[row]].release(lines.piece[row]);
            lines.batchOf[row] = NO_LINE;
            this.drawn--;
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
        if ((nodeRemap === null && edgeRemap === null) || this.drawn === 0) {
            return;
        }

        const moved = (remap: ArrayLike<number> | null, row: number): number =>
            remap === null ? row : (remap[row] ?? INVALID_INDEX);
        const { lines } = this;
        this.lines = new LineColumns();
        this.drawn = 0;
        for (const row of this.drawnRows(lines)) {
            const batch = this.batches[lines.batchOf[row]];
            const piece = lines.piece[row];
            const edge = moved(edgeRemap, row);
            const source = moved(nodeRemap, lines.source[row]);
            const target = moved(nodeRemap, lines.target[row]);
            if (edge === INVALID_INDEX || source === INVALID_INDEX || target === INVALID_INDEX) {
                batch.release(piece);
                continue;
            }

            const hidden = lines.hidden[row] === 1;
            batch.setRows(piece, source, target);
            this.lines.set(edge, lines.batchOf[row], piece, source, target);
            this.lines.hidden[edge] = hidden ? 1 : 0;
            this.drawn++;
        }

        this.host.requestFrame();
    }

    /** Stop drawing every edge row here. */
    clear(): void {
        for (const row of this.drawnRows()) {
            this.unpaintRow(row);
        }

        this.lines = new LineColumns();
        this.batches.length = 0;
    }

    /**
     * The rows a line list draws, in row order.
     * @param lines - The list, by row.
     * @returns Them.
     */
    private drawnRows(lines = this.lines): number[] {
        const rows: number[] = [];
        lines.batchOf.forEach((batch, row) => {
            if (batch !== NO_LINE) {
                rows.push(row);
            }
        });
        return rows;
    }
}
