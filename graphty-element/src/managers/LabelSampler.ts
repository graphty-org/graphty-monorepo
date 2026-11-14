import type { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { Scene } from "@babylonjs/core/scene.js";

import { writableLane } from "../data/lane";
import type { Node } from "../Node";
import type { GraphContext } from "./GraphContext";

/** How many numbers {@link LabelSampler} compares to tell a settled view from a moving one. */
const SEEN = 16 + 16 + 5;

/**
 * Label sampling (`layoutBehavior.labels.sampleCell`): one node label built per screen cell.
 *
 * Every node that wants a label while sampling is on is a candidate, and its label is not built
 * until a pass picks it. A pass runs on the first frame on which the camera, the canvas size, the
 * node positions, the edges and the set of candidates are all as they were on the frame before
 * (the view has settled), so a gesture or a moving layout builds nothing until it stops. It
 * projects every candidate's node to the screen, keeps the best one per cell (selected first, then
 * more edges, then the lower id) and asks each candidate whose label disagrees with the pick to
 * build or drop it. Owned by the scene's {@link LabelDeclutter}, which counts what it leaves out.
 *
 * Designed as a GPU point draw into a one-texel-per-cell target with a readback of the winners;
 * built on the CPU instead, because the pass runs once per settled view and the projection of
 * 100,000 positions is a few milliseconds, with no render target or readback stall
 * (design/rendering/row-renderer.md, 4.7).
 */
export class LabelSampler {
    /** Whether sampling was on at the last frame. */
    on = false;
    /** True while a pass is owed: something changed, and the view has not yet settled. */
    pending = false;
    /** Candidates whose label the last pass left unbuilt. */
    unbuilt = 0;
    /** Of {@link unbuilt}, those whose node is not drawn. */
    unbuiltHidden = 0;

    private readonly candidates = new Set<Node>();
    private winners = new Set<Node>();
    private readonly seen = new Float64Array(SEEN);
    private readonly now = new Float64Array(SEEN);
    private readonly transform = new Matrix();
    private readonly point = new Vector3();

    /**
     * A sampler for one scene, off until the setting is set.
     * @param scene - The scene the labels are drawn in.
     * @param context - The graph: its configuration holds the cell size.
     */
    constructor(
        private readonly scene: Scene,
        private readonly context: GraphContext,
    ) {}

    /**
     * The cell size asked for, in CSS pixels, or undefined while sampling is off.
     * @returns The size.
     */
    cell(): number | undefined {
        return this.context.getStyles().config.behavior.labels.sampleCell;
    }

    /**
     * Asked by a node about to build its label: whether sampling holds it back.
     * @param node - The node.
     * @param wanted - Whether its style asks for a label at all.
     * @returns True when the label must not be built.
     */
    withholds(node: Node, wanted: boolean): boolean {
        if (this.cell() === undefined) {
            return false;
        }

        if (!wanted) {
            if (this.candidates.delete(node)) {
                this.pending = true;
            }

            return false;
        }

        if (!this.candidates.has(node)) {
            this.candidates.add(node);
            this.pending = true;
        }

        return !this.winners.has(node);
    }

    /**
     * Before a frame: follow the setting, and run a pass when one is owed and the view has settled.
     * @param camera - The camera the frame is drawn from.
     * @param built - The nodes drawing a label now, made candidates when sampling is switched on.
     * @param degrees - Each node's edge count, by id.
     * @returns True when the counts may have changed.
     */
    run(camera: Camera, built: Iterable<Node>, degrees: () => ReadonlyMap<string | number, number>): boolean {
        const cell = this.cell();
        if (cell === undefined) {
            return this.on ? this.switchOff() : false;
        }

        if (!this.on) {
            this.on = true;
            this.pending = true;
            for (const node of built) {
                this.candidates.add(node);
            }
        }

        if (this.moved(camera, cell) || !this.pending) {
            return false;
        }

        this.pending = false;
        this.pass(camera, cell, degrees());
        return true;
    }

    /**
     * Sampling was switched off: every candidate builds its label.
     * @returns True: the counts change.
     */
    private switchOff(): boolean {
        const all = [...this.candidates];
        this.on = false;
        this.pending = false;
        this.candidates.clear();
        this.winners.clear();
        this.unbuilt = 0;
        this.unbuiltHidden = 0;
        for (const node of all) {
            if (node.label === undefined) {
                node.resampleLabel();
            }
        }

        return true;
    }

    /**
     * Whether the view differs from the last frame's; marks a pass owed when it does.
     * @param camera - The camera.
     * @param cell - The cell size.
     * @returns True when it moved.
     */
    private moved(camera: Camera, cell: number): boolean {
        const { now, seen } = this;
        const engine = this.scene.getEngine();
        now.set(camera.getViewMatrix().m, 0);
        now.set(camera.getProjectionMatrix().m, 16);
        now[32] = engine.getRenderWidth();
        now[33] = engine.getRenderHeight();
        now[34] = writableLane(this.context.getDataManager())?.generation ?? 0;
        now[35] = this.context.getDataManager().edgeVersion;
        now[36] = cell;
        for (let i = 0; i < SEEN; i++) {
            if (now[i] !== seen[i]) {
                seen.set(now);
                this.pending = true;
                return true;
            }
        }

        return false;
    }

    /**
     * Pick one candidate per cell and build or drop each label to match.
     * @param camera - The camera.
     * @param cell - The cell size, in CSS pixels.
     * @param degrees - Each node's edge count, by id.
     */
    private pass(camera: Camera, cell: number, degrees: ReadonlyMap<string | number, number>): void {
        const engine = this.scene.getEngine();
        const width = engine.getRenderWidth();
        const height = engine.getRenderHeight();
        const cssWidth = engine.getRenderingCanvas()?.clientWidth ?? 0;
        const size = cell * (cssWidth > 0 ? width / cssWidth : 1);
        const rows = Math.max(1, Math.ceil(height / size));
        // ponytail: the whole canvas is the view; a camera with a part viewport samples it whole.
        const root = this.scene.getTransformNodeByName("graph-root");
        const toClip = camera.getTransformationMatrix();
        if (root) {
            root.computeWorldMatrix(true).multiplyToRef(toClip, this.transform);
        } else {
            this.transform.copyFrom(toClip);
        }

        const dataManager = this.context.getDataManager();
        const best = new Map<number, Node>();
        for (const node of this.candidates) {
            if (dataManager.getNode(node.id) !== node) {
                this.candidates.delete(node);
                continue;
            }

            const key = node.isDrawn ? this.cellOf(node, width, height, size, rows) : -1;
            const held = best.get(key);
            if (key >= 0 && (held === undefined || beats(node, held, degrees))) {
                best.set(key, node);
            }
        }

        this.winners = new Set(best.values());
        this.build();
    }

    /**
     * The screen cell a node's center is in, through {@link transform}.
     * @param node - The node.
     * @param width - The canvas width, in render pixels.
     * @param height - The canvas height, in render pixels.
     * @param size - The cell size, in render pixels.
     * @param rows - Cells down the canvas.
     * @returns The cell's key, or -1 when the node is behind the camera or outside the view.
     */
    private cellOf(node: Node, width: number, height: number, size: number, rows: number): number {
        const { m } = this.transform;
        const { x, y, z } = node.drawnPosition;
        // Behind the camera: clip w at or below zero.
        if (x * m[3] + y * m[7] + z * m[11] + m[15] <= 0) {
            return -1;
        }

        const ndc = Vector3.TransformCoordinatesFromFloatsToRef(x, y, z, this.transform, this.point);
        if (ndc.x < -1 || ndc.x > 1 || ndc.y < -1 || ndc.y > 1) {
            return -1;
        }

        return Math.floor((((ndc.x + 1) / 2) * width) / size) * rows + Math.floor((((1 - ndc.y) / 2) * height) / size);
    }

    /** Build each winner's label and drop each other candidate's, and count what is left unbuilt. */
    private build(): void {
        let unbuilt = 0;
        let hidden = 0;
        for (const node of this.candidates) {
            const winner = this.winners.has(node);
            if ((node.label !== undefined) !== winner) {
                node.resampleLabel();
            }

            if (node.label === undefined) {
                unbuilt++;
                if (!node.isDrawn) {
                    hidden++;
                }
            }
        }

        this.unbuilt = unbuilt;
        this.unbuiltHidden = hidden;
    }
}

/**
 * Whether one node's label is kept before another's in a cell.
 * @param a - The challenger.
 * @param b - The node holding the cell.
 * @param degrees - Each node's edge count, by id.
 * @returns True when `a` takes the cell.
 */
function beats(a: Node, b: Node, degrees: ReadonlyMap<string | number, number>): boolean {
    const selected = a.isSelected();
    if (selected !== b.isSelected()) {
        return selected;
    }

    const da = degrees.get(a.id) ?? 0;
    const db = degrees.get(b.id) ?? 0;
    if (da !== db) {
        return da > db;
    }

    return String(a.id) < String(b.id);
}
