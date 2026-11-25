import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import type { Scene } from "@babylonjs/core/scene.js";
import { INVALID_INDEX } from "@graphty/graph-format";

import type { EdgeStyleConfig } from "../config";
import { drawnText } from "../config/RichTextStyle";
import { EDGE_CONSTANTS } from "../constants/meshConstants";
import { GraphtyError } from "../errors/GraphtyError";
import { type EdgePaint, isPlainPaint } from "../managers/StylePainter";
import type { RowTable } from "../render/RowTable";
import type { ArrowCapBatch } from "./ArrowCapBatch";
import { DirtyRuns } from "./DirtyRuns";
import type { EdgeLineBatch } from "./EdgeLineBatch";
import { EdgeMesh } from "./EdgeMesh";
import { batchUploadFrames } from "./FrameRoster";
import type { MeshCache } from "./MeshCache";
import { type PulledHead, pulledHeadBatch, pulledHeadOf, roundRow } from "./pulledHead";
import type { LeanLines, PulledLineBatch } from "./PulledLineBatch";

/** Style keys a row line may set: any other needs an `Edge` (a label or a band is drawn by one). */
const ROW_STYLE_KEYS = new Set(["line", "label", "arrowHead", "arrowTail", "band", "visible"]);

/**
 * Line keys a row line draws exactly as an `Edge`'s pulled straight line does. A curve, a fan, a gap, bends, a
 * support point is shaped per edge, and an animation (a non-zero `animationSpeed`) moves, so each needs an `Edge`.
 */
const ROW_LINE_KEYS = new Set([
    "type",
    "animationSpeed",
    "width",
    "color",
    "opacity",
    "minScreenWidth",
    "route",
    // a dashed or dotted line's pattern, which a pulled line draws in its shader (`EdgeMesh.pulledPattern`)
    "dashLength",
    "dashGap",
    "dashArray",
    "patternCount",
    "drawOrder",
]);

/**
 * Whether every key set on a style block is one of the keys named.
 * @param block - The block.
 * @param keys - The keys it may set.
 * @returns False when it sets any other.
 */
function setsOnly(block: object, keys: ReadonlySet<string>): boolean {
    return Object.entries(block).every(([key, value]) => value === undefined || value === false || keys.has(key));
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
    /**
     * Each row's head's batch, as its place in `EdgeRowLines.capBatches`, or {@link NO_LINE} for no head; empty until a
     * row has a head ({@link LineColumns.holdHeads}), so lines with no heads keep nothing for them. Read past its end
     * as no head.
     */
    capBatchOf = new Int32Array(0);
    capSlot = new Int32Array(0);

    /** Size the head columns to the line columns, the first time a row takes a head. */
    holdHeads(): void {
        if (this.capBatchOf.length < this.batchOf.length) {
            const capBatchOf = new Int32Array(this.batchOf.length).fill(NO_LINE);
            capBatchOf.set(this.capBatchOf);
            const capSlot = new Int32Array(this.batchOf.length);
            capSlot.set(this.capSlot);
            this.capBatchOf = capBatchOf;
            this.capSlot = capSlot;
        }
    }

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
            if (this.capBatchOf.length > 0) {
                const capBatchOf = grown(this.capBatchOf);
                capBatchOf.fill(NO_LINE, this.capBatchOf.length);
                this.capBatchOf = capBatchOf;
                this.capSlot = grown(this.capSlot);
            }
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
        if (row < this.capBatchOf.length) {
            this.capBatchOf[row] = NO_LINE;
        }
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
    /** Whether it was judged for a 2D scene, whose head is placed at full size (`pulledHeadOf`). */
    readonly flat: boolean;
    /** Its head drawn from the row table, null for none; only judged when the style draws one. */
    readonly head: PulledHead | null;
    /** Whether its line has a pattern (`EdgeMesh.pulledPattern`). */
    readonly patterned: boolean;
    /** Its head's cap batch, found once for every row the look paints. */
    headBatch?: ArrowCapBatch;
    /** In 2D, the line batch an `Edge` of this look draws into, made once for every row the look paints. */
    objectLine?: EdgeLineBatch | null;
}

/**
 * A 2D pulled line batch's mesh to the line batch an `Edge` of its width draws into: the graph's opaque order draws it
 * right after that batch. A 2D scene draws coplanar meshes in the order their materials were made, and a pulled batch's
 * is made at its first row, which may come long after the first `Edge` of its width.
 */
export const pulledLineSortsWith = new WeakMap<AbstractMesh, AbstractMesh>();

/** What {@link EdgeRowLines} reads from the graph. */
export interface EdgeRowLinesHost {
    readonly scene: Scene;
    readonly cache: MeshCache;
    readonly rows: RowTable;
    /** Whether lines take the lean program (`GraphContext.leansLines`). */
    readonly lean: () => LeanLines;
    /** Ask for a frame, so a row painted or unpainted shows. */
    readonly requestFrame: () => void;
    /** Whether no layout is moving the rows, so heads are placed on the CPU at rest (`restPlacement.ts`). */
    readonly settled: () => boolean;
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
    /** The batches the row lines' heads are drawn in, one per shape and opacity: a row names its batch by its place. */
    private readonly capBatches: ArrowCapBatch[] = [];
    private drawn = 0;
    /** The batches, by their place in {@link batches}, that draw plain paints (`plainEdgePaint`). */
    private readonly plainBatches = new Set<number>();
    /** Of {@link drawn}, the rows drawn in a plain batch. */
    private plainDrawn = 0;
    private lastLook: RowLook | null = null;
    /** The rows whose line was drawn, removed, hidden or shown since the edge ID target last took them. */
    private readonly changes = new DirtyRuns();

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
     * How many edge rows are drawn from a plain paint, past `limits.objectEdges` (`plainEdgePaint`).
     * @returns The count.
     */
    get plainCount(): number {
        return this.plainDrawn;
    }

    /**
     * The edge rows drawn from a plain paint, past `limits.objectEdges` (`plainEdgePaint`).
     * @returns Their rows.
     */
    plainRows(): number[] {
        return this.plainDrawn === 0
            ? []
            : this.drawnRows().filter((row) => this.plainBatches.has(this.lines.batchOf[row]));
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
     * Visit each shown row line, in row order, with no object made per row: what an edge pick measures for the
     * edges drawn with no `Edge`.
     * @param visit - Given the edge row and its source and target node rows.
     * @param only - Visit only these edge rows (those not drawn here or hidden are skipped); every row when absent.
     */
    forEachShown(visit: (row: number, source: number, target: number) => void, only?: readonly number[]): void {
        const { batchOf, hidden, source, target } = this.lines;
        if (only !== undefined) {
            for (const row of only) {
                if ((batchOf[row] ?? NO_LINE) !== NO_LINE && hidden[row] === 0) {
                    visit(row, source[row], target[row]);
                }
            }

            return;
        }

        if (this.drawn === 0) {
            return;
        }

        for (let row = 0; row < batchOf.length; row++) {
            if (batchOf[row] !== NO_LINE && hidden[row] === 0) {
                visit(row, source[row], target[row]);
            }
        }
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
        this.changed(row);
        this.showHead(row);
        this.host.requestFrame();
    }

    /**
     * {@link EdgeRowLines.setHidden} for many rows at once, as a visibility mask says: a row the mask holds is shown,
     * any other drawn row is hidden. A time window's jump changes tens of thousands of rows, so this reads the
     * columns straight and asks for one frame, not one a row (#6025).
     * @param rows - The edge rows; rows not drawn here are skipped.
     * @param visible - The visible edges, or null when nothing hides.
     */
    setHiddenRows(rows: ArrayLike<number>, visible: { has(row: number): boolean } | null): void {
        const { batchOf, hidden, piece } = this.lines;
        let changed = false;
        for (let at = 0; at < rows.length; at++) {
            const row = rows[at];
            const batch = batchOf[row] ?? NO_LINE;
            const flag = visible === null || visible.has(row) ? 0 : 1;
            if (batch === NO_LINE || hidden[row] === flag) {
                continue;
            }

            hidden[row] = flag;
            this.batches[batch].setHidden(piece[row], flag === 1);
            this.changed(row);
            this.showHead(row);
            changed = true;
        }

        if (changed) {
            this.host.requestFrame();
        }
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
            EdgeMesh.pulledPattern(style, line.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH) !== null &&
            !line.animationSpeed &&
            !EdgeMesh.pullsCurve(style) &&
            drawnText(style.label) === undefined &&
            (EdgeMesh.drawsNoCap(style.arrowHead) || pulledHeadOf(style) !== null) &&
            EdgeMesh.drawsNoCap(style.arrowTail) &&
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
        const flat = EdgeMesh.drawsFlat(this.host.scene);
        if (this.lastLook?.style !== style || this.lastLook.flat !== flat) {
            const color = style.line?.color ?? "#FFFFFF";
            const head = EdgeMesh.drawsNoCap(style.arrowHead) ? null : pulledHeadOf(style, flat);
            this.lastLook = {
                style,
                // a head a 2D scene does not pull (`pulledHeadOf`) is drawn by an `Edge`
                draws: this.drawsStyle(style) && (head !== null || EdgeMesh.drawsNoCap(style.arrowHead)),
                width: style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH,
                color,
                rgb: Color3.FromHexString(color),
                opacity: EdgeMesh.opacityOf(style),
                flat,
                head,
                patterned:
                    EdgeMesh.pulledPattern(style, style.line?.width ?? EDGE_CONSTANTS.DEFAULT_LINE_WIDTH) !== undefined,
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
        const { head } = look;
        // a head is stood at closed ends: a round one at each end, which the shader reaches with no ray
        // (`Edge.interceptPointsFromColumns`)
        if (
            !look.draws ||
            batchUploadFrames.edgeAges(scene).on ||
            (head !== null && (!this.headRow(source) || !this.headRow(target)))
        ) {
            return false;
        }

        const { width, color } = look;
        // a head's batch is made before its line's, as an object edge makes its cap first: a head and the line under
        // it are coplanar, and two opaque meshes draw in the order they were made
        const headBatch = head === null ? null : this.headBatchOf(look, head);
        if (look.flat && (look.objectLine === undefined || look.objectLine?.disposed === true)) {
            // ...and its line's batch after it, though this row draws none there: an `Edge` drawn later (one a layout
            // routes) shares it, and a 2D scene draws coplanar meshes in the order they were made, so made only then
            // it drew over every head made since, where the objects path draws it under them
            look.objectLine = EdgeMesh.lineBatch(cache, { styleId: meshKey, width, color }, style, scene, false, true);
        }

        const batch = EdgeMesh.pulledBatch(cache, { styleId: meshKey, width, color }, style, scene, () => rows, {
            route: "straight",
            lean: this.host.lean(),
            straightInCurve: this.joinsCurves(head, source, target),
        });
        // as `Edge.pullLine` gives its piece the look: in 2D, or with a pattern, a world width
        const drawnWidth = EdgeMesh.drawsFlat(scene) || look.patterned ? width / 40 : width * 20;
        let piece: number;
        try {
            piece = batch.acquire(drawnWidth, style.line?.drawOrder);
        } catch (error) {
            // a batch the card cannot hold more of: the row's `Edge` draws it, and reports it (`Edge.refuseTooLarge`)
            if (error instanceof GraphtyError && error.code === "E_TOO_LARGE") {
                return false;
            }

            throw error;
        }

        if (look.objectLine) {
            // ...and its pieces draw where that batch draws, not where their own batch's material was made
            pulledLineSortsWith.set(batch.mesh, look.objectLine.mesh);
        }

        batch.setLook(piece, look.rgb, look.opacity, drawnWidth);
        batch.setRows(piece, source, target);
        batch.drawStraight(piece);
        batch.restFrom(this.host);
        let at = this.batches.indexOf(batch);
        if (at === -1) {
            at = this.batches.push(batch) - 1;
        }

        this.lines.set(row, at, piece, source, target);
        if (head !== null && headBatch !== null) {
            batch.setCapBack(piece, head.lineStop, head.look, this.host);
            this.paintHead(row, head, headBatch, source, target);
        }

        this.drawn++;
        this.changed(row);
        if (isPlainPaint(paint)) {
            this.plainBatches.add(at);
            this.plainDrawn++;
        }

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
            this.releaseHead(row);
            this.plainDrawn -= this.plainBatches.has(lines.batchOf[row]) ? 1 : 0;
            lines.batchOf[row] = NO_LINE;
            this.drawn--;
            this.changed(row);
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
        this.plainDrawn = 0;
        for (const row of this.drawnRows(lines)) {
            const batch = this.batches[lines.batchOf[row]];
            const piece = lines.piece[row];
            const edge = moved(edgeRemap, row);
            const source = moved(nodeRemap, lines.source[row]);
            const target = moved(nodeRemap, lines.target[row]);
            const capBatch = lines.capBatchOf[row] ?? NO_LINE;
            if (edge === INVALID_INDEX || source === INVALID_INDEX || target === INVALID_INDEX) {
                batch.release(piece);
                if (capBatch !== NO_LINE) {
                    this.capBatches[capBatch].release(lines.capSlot[row]);
                }

                continue;
            }

            const hidden = lines.hidden[row] === 1;
            batch.setRows(piece, source, target);
            this.lines.set(edge, lines.batchOf[row], piece, source, target);
            this.lines.hidden[edge] = hidden ? 1 : 0;
            if (capBatch !== NO_LINE) {
                this.lines.holdHeads();
                this.lines.capBatchOf[edge] = capBatch;
                this.lines.capSlot[edge] = lines.capSlot[row];
            }
            this.showHead(edge);
            this.drawn++;
            this.plainDrawn += this.plainBatches.has(lines.batchOf[row]) ? 1 : 0;
        }

        this.changes.whole();
        this.host.requestFrame();
    }

    /** Stop drawing every edge row here. */
    clear(): void {
        for (const row of this.drawnRows()) {
            this.unpaintRow(row);
        }

        this.lines = new LineColumns();
        this.batches.length = 0;
        this.capBatches.length = 0;
        this.plainBatches.clear();
        this.plainDrawn = 0;
        this.changes.whole();
    }

    /**
     * The rows whose line was drawn, removed, hidden or shown since the last call: what the edge ID target writes
     * again, so a change costs it the rows changed, not every line. Its one reader takes them each time it draws.
     * @returns Runs of rows as flat pairs of first row and end row (exclusive), [] for none, or null for every row.
     * @internal
     */
    takeChanged(): readonly number[] | null {
        return this.changes.dirty ? this.changes.take(true) : [];
    }

    /**
     * The row an edge row's line is drawn between and whether it shows, for the edge ID target.
     * @param row - The edge row.
     * @returns Its source and target node rows, or undefined for a row drawn nowhere here or hidden.
     * @internal
     */
    shownEnds(row: number): readonly [number, number] | undefined {
        const { lines } = this;
        return lines.has(row) && lines.hidden[row] === 0 ? [lines.source[row], lines.target[row]] : undefined;
    }

    /**
     * Note a row's line changed, for {@link EdgeRowLines.takeChanged}. Past half the rows the list becomes "every
     * row", so it stays bounded while nothing takes it.
     * @param row - The edge row.
     */
    private changed(row: number): void {
        this.changes.mark(row, true, this.lines.batchOf.length);
    }

    /**
     * Draw a row line's head from the row table, in the cap batch of its shape and opacity.
     * @param row - The edge row.
     * @param head - Its head.
     * @param batch - Its head's batch.
     * @param source - Its source node's row.
     * @param target - Its target node's row.
     */
    private paintHead(row: number, head: PulledHead, batch: ArrowCapBatch, source: number, target: number): void {
        let at = this.capBatches.indexOf(batch);
        if (at === -1) {
            at = this.capBatches.push(batch) - 1;
        }

        const slot = batch.acquire();
        batch.setPulled(slot, { from: source, head: target }, head.place, head.look, head.colour, head.opacity);
        this.lines.holdHeads();
        this.lines.capBatchOf[row] = at;
        this.lines.capSlot[row] = slot;
    }

    /**
     * Draw a row's head between its line's rows, or nothing while the row is hidden; nothing for a row with no head.
     * @param row - The edge row.
     */
    private showHead(row: number): void {
        const { lines } = this;
        const at = lines.capBatchOf[row] ?? NO_LINE;
        if (at === NO_LINE) {
            return;
        }

        const shown = lines.hidden[row] === 0;
        this.capBatches[at].setPulledRows(
            lines.capSlot[row],
            shown ? lines.source[row] : -1,
            shown ? lines.target[row] : -1,
        );
    }

    /**
     * The cap batch a look's head is drawn in, found once for every row the look paints: a paint run of a million rows
     * looks it up once, not once a row.
     * @param look - The look.
     * @param head - Its head.
     * @returns The batch.
     */
    private headBatchOf(look: RowLook, head: PulledHead): ArrowCapBatch {
        let batch = look.headBatch;
        if (batch === undefined || batch.disposed) {
            batch = pulledHeadBatch(head, this.host.scene);
            look.headBatch = batch;
        }

        return batch;
    }

    /**
     * Hand a row's head back to its batch; nothing for a row with no head.
     * @param row - The edge row.
     */
    private releaseHead(row: number): void {
        const { lines } = this;
        const at = lines.capBatchOf[row] ?? NO_LINE;
        if (at !== NO_LINE) {
            this.capBatches[at].release(lines.capSlot[row]);
            lines.capBatchOf[row] = NO_LINE;
        }
    }

    /**
     * The edge rows a row line can no longer draw: a head on an end that is no longer round, or an end the caller says
     * is gone (its style hid it). An `Edge` draws them now, so they are painted again (`UpdateManager.syncStyles`). Also
     * a straight line in a curve batch with an end turned seen through, which painted again takes the straight batch.
     * @param endGone - Whether a node row is no end a row line draws to.
     * @param among - Only these edge rows; every row drawn here when left out.
     * @returns The rows.
     */
    rowsOffEnds(endGone: (row: number) => boolean, among?: Iterable<number>): number[] {
        const { lines } = this;
        const off: number[] = [];
        for (const row of among ?? this.drawnRows(lines)) {
            if (!lines.has(row)) {
                continue;
            }

            if (
                endGone(lines.source[row]) ||
                endGone(lines.target[row]) ||
                (this.batches[lines.batchOf[row]].drawsCurves &&
                    !this.joinsCurves(null, lines.source[row], lines.target[row]))
            ) {
                off.push(row);
                continue;
            }

            if (
                (lines.capBatchOf[row] ?? NO_LINE) !== NO_LINE &&
                (!this.headRow(lines.source[row]) || !this.headRow(lines.target[row]))
            ) {
                off.push(row);
            }
        }

        return off;
    }

    /**
     * Whether a row line may be drawn from a curve batch, which runs it center to center with no head
     * (`EdgeMesh.pulledBatch`'s `straightInCurve`): it has no head and neither end is seen through, as the straight
     * program trims a line at a seen-through end's outline. A row turned seen through later is painted again
     * ({@link EdgeRowLines.rowsOffEnds}).
     * @param head - Its head, or null.
     * @param source - The source node's row.
     * @param target - The target node's row.
     * @returns True when it may.
     */
    private joinsCurves(head: PulledHead | null, source: number, target: number): boolean {
        const { rows } = this.host;
        return head === null && !rows.seenThrough(source) && !rows.seenThrough(target);
    }

    /**
     * Whether a pulled head can stand on a node row: one with a round outline, drawn by a node batch or its `Node`.
     * @param row - The node row.
     * @returns True when it can.
     */
    private headRow(row: number): boolean {
        return roundRow(this.host.rows, row);
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
