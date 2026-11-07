import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import { Mesh, type RawTexture, type TransformNode } from "@babylonjs/core";

import type { Rgba } from "../catalog/types";
import type { BatchView } from "../managers/StylePainter";
import type { Node } from "../Node";
import { batchUploadFrames } from "./FrameRoster";
import type { MeshCache } from "./MeshCache";
import { attachRowPull } from "./RowPullPlugin";

/**
 * @file Draw the rows of one source mesh in one draw call (design/rendering/row-renderer.md 4.2).
 *
 * The rows keep their instanced meshes as hidden proxies for now: `source.visibility = 0` stops
 * Babylon drawing every instance of a source, and leaves them pickable, parents of what hangs off
 * them and readable as before. Hiding is all or nothing per source, so one object row keeps all
 * its source's rows off the batch.
 */

/** How `render-path` draws: every node an object of its own, or eligible rows in batches. */
export type RenderPath = "objects" | "batched";

/** The path a graph starts on. Only the test projects that force `"batched"` write it. */
export const renderPathDefault: { value: RenderPath } = { value: "objects" };

/** How many rows each render path is drawing. */
export interface RowCounts {
    /** Nodes drawn by a batch. */
    readonly batchedNodes: number;
    /** Nodes drawn as a mesh of their own. */
    readonly objectNodes: number;
    /** Edges drawn from the row tables. */
    readonly pulledEdges: number;
    /** Edges drawn as objects. */
    readonly objectEdges: number;
}

const FIRST_CAPACITY = 16;
const HOLE = -1;
const MATRIX_FLOATS = 16;
const COLOR_FLOATS = 4;
/** The share of a batch's slots that may be holes before a repaint compacts them. */
const MOST_HOLES = 0.25;

/** The rows a batch reads its places from. */
interface RowPlaces {
    readonly positionTexture: RawTexture;
}

/** One look's thin instances: a slot per row, in row order. */
export class NodeBatch {
    readonly mesh: Mesh;
    /** The rows in slots, holes included. */
    slots = 0;
    /** Slots left as holes. */
    holes = 0;

    /** Slot of each row in a slot, and of each row that left its hole behind. */
    private readonly slotOf = new Map<number, number>();
    private rows = new Float32Array(FIRST_CAPACITY);
    private colors = new Float32Array(FIRST_CAPACITY * COLOR_FLOATS);
    private matrices = identities(FIRST_CAPACITY);
    private unsorted = false;
    private rowsDirty = false;
    private colorsDirty = false;

    /**
     * Build the mesh: a sibling of the source, since a mesh with thin instances ignores ordinary
     * ones, with a geometry of its own, since Babylon keeps thin-instance buffers on the geometry.
     * @param source - The source mesh.
     * @param places - The table that places the rows.
     * @param root - What the rows are drawn inside.
     */
    constructor(source: Mesh, places: RowPlaces, root: TransformNode | null) {
        const scene = source.getScene();
        this.mesh = new Mesh(`${source.name}-batch`, scene);
        source.geometry?.copy(`${source.name}-batch-geometry-${String(this.mesh.uniqueId)}`).applyToMesh(this.mesh);
        this.mesh.material = source.material;
        this.mesh.parent = root;
        this.mesh.metadata = { rowPlaces: places };
        this.mesh.alwaysSelectAsActiveMesh = true;
        this.mesh.doNotSyncBoundingInfo = true;
        this.mesh.isPickable = false;
        this.mesh.renderingGroupId = source.renderingGroupId;
        this.mesh.hasVertexAlpha = source.hasVertexAlpha;
        this.mesh.useVertexColors = source.useVertexColors;
        this.mesh.sideOrientation = source.sideOrientation;
        this.mesh.setEnabled(false);
        if (source.material) {
            attachRowPull(source.material);
        }

        this.setBuffers();
    }

    /**
     * The rows drawn.
     * @returns How many.
     */
    get liveSlots(): number {
        return this.slots - this.holes;
    }

    /**
     * Give a row a slot, or a new color in the one it has.
     * @param row - The row.
     * @param color - Its color, or null for white.
     */
    put(row: number, color: Rgba | null): void {
        let slot = this.slotOf.get(row);
        if (slot === undefined) {
            slot = this.slots;
            this.grow(slot + 1);
            this.unsorted ||= slot > 0 && row < (this.rows[slot - 1] ?? 0);
            this.rows[slot] = row;
            this.slotOf.set(row, slot);
            this.slots++;
            this.rowsDirty = true;
        } else if (this.rows[slot] === HOLE) {
            this.rows[slot] = row;
            this.holes--;
            this.rowsDirty = true;
        }

        const at = slot * COLOR_FLOATS;
        const { colors } = this;
        const r = (color?.r ?? 255) / 255;
        const g = (color?.g ?? 255) / 255;
        const b = (color?.b ?? 255) / 255;
        // Alpha too: a new slot's color is all zeros, which black would otherwise leave transparent.
        const same =
            colors[at] === Math.fround(r) &&
            colors[at + 1] === Math.fround(g) &&
            colors[at + 2] === Math.fround(b) &&
            colors[at + 3] === 1;
        if (!same) {
            colors.set([r, g, b, 1], at);
            this.colorsDirty = true;
        }
    }

    /**
     * Free a row's slot: one write, which the shader collapses. The slot stays its own.
     * @param row - The row.
     */
    free(row: number): void {
        const slot = this.slotOf.get(row);
        if (slot !== undefined && this.rows[slot] !== HOLE) {
            this.rows[slot] = HOLE;
            this.holes++;
            this.rowsDirty = true;
        }
    }

    /** Empty the batch. */
    clear(): void {
        this.slots = 0;
        this.holes = 0;
        this.slotOf.clear();
        this.unsorted = false;
        this.rowsDirty = true;
    }

    /**
     * Send what changed. Only a repaint changes a batch, so compacting here is never in a drag.
     * @returns Whether the batch started or stopped drawing.
     */
    flush(): boolean {
        const whole = batchUploadFrames.isRestoring(this.mesh.getScene());
        if (this.rowsDirty && (this.unsorted || this.holes > this.slots * MOST_HOLES)) {
            this.compact();
        }

        if (this.rowsDirty || whole) {
            this.mesh.thinInstanceBufferUpdated("graphtyRow");
            this.mesh.thinInstanceCount = this.slots;
        }

        if (this.colorsDirty || whole) {
            this.mesh.thinInstanceBufferUpdated("color");
        }

        if (whole) {
            this.mesh.thinInstanceBufferUpdated("matrix");
        }

        this.rowsDirty = false;
        this.colorsDirty = false;
        const drawing = this.slots > 0;
        const changed = drawing !== this.mesh.isEnabled(false);
        if (changed) {
            this.mesh.setEnabled(drawing);
        }

        return changed;
    }

    /** Dispose the mesh and its geometry, and leave the material to its source. */
    dispose(): void {
        this.mesh.dispose(false, false);
    }

    /** Take the holes out and put the rows in ascending order, which keeps depth ties as they were. */
    private compact(): void {
        const live: { row: number; at: number }[] = [];
        for (let slot = 0; slot < this.slots; slot++) {
            const row = this.rows[slot] ?? HOLE;
            if (row !== HOLE) {
                live.push({ row, at: slot * COLOR_FLOATS });
            }
        }

        live.sort((a, b) => a.row - b.row);
        const { colors } = this;
        this.colors = new Float32Array(colors.length);
        this.slotOf.clear();
        live.forEach(({ row, at }, slot) => {
            this.rows[slot] = row;
            this.colors.set(colors.subarray(at, at + COLOR_FLOATS), slot * COLOR_FLOATS);
            this.slotOf.set(row, slot);
        });
        this.slots = live.length;
        this.holes = 0;
        this.unsorted = false;
        this.setBuffers();
    }

    /**
     * Make room, doubling.
     * @param wanted - The slots to hold.
     */
    private grow(wanted: number): void {
        const capacity = this.rows.length;
        if (wanted <= capacity) {
            return;
        }

        const next = capacity * 2;
        const { rows, colors } = this;
        this.rows = new Float32Array(next);
        this.rows.set(rows);
        this.colors = new Float32Array(next * COLOR_FLOATS);
        this.colors.set(colors);
        this.matrices = identities(next);
        this.setBuffers();
    }

    /** Hand the arrays to Babylon, which draws `thinInstanceCount` of them. */
    private setBuffers(): void {
        this.mesh.thinInstanceSetBuffer("matrix", this.matrices, MATRIX_FLOATS, false);
        this.mesh.thinInstanceSetBuffer("color", this.colors, COLOR_FLOATS, false);
        this.mesh.thinInstanceSetBuffer("graphtyRow", this.rows, 1, false);
        this.mesh.thinInstanceCount = this.slots;
    }
}

/**
 * Identity matrices.
 * @param count - How many.
 * @returns Them, end to end.
 */
function identities(count: number): Float32Array<ArrayBuffer> {
    const matrices = new Float32Array(count * MATRIX_FLOATS);
    for (let at = 0; at < matrices.length; at += MATRIX_FLOATS) {
        matrices[at] = matrices[at + 5] = matrices[at + 10] = matrices[at + 15] = 1;
    }

    return matrices;
}

/** The rows of one source mesh. */
interface RowGroup {
    readonly source: Mesh;
    readonly members: Set<Node>;
    /** Members the batch cannot draw. */
    objects: number;
    /** The highest row seen, which must be in the table before the batch can place it. */
    highest: number;
    batch: NodeBatch | null;
    /** Drawn by the batch, its source hidden. */
    batched: boolean;
    /** The rows moved: refill. */
    stale: boolean;
    /** The source's `visibility` while it draws. */
    readonly restVisibility: number;
}

/** What {@link NodeBatches} needs of the graph. */
export interface NodeBatchHost {
    readonly cache: MeshCache;
    readonly places: RowPlaces & { readonly rows: number };
    /** The transform node every row is drawn inside. */
    root(): TransformNode | null;
    /** The scene state paint does not hold. */
    view(): BatchView;
    /** Every node. */
    nodes(): Iterable<Node>;
    /** Babylon's list of active meshes no longer holds. */
    meshesChanged(): void;
}

/** Decides which rows are batched and keeps the batches up to date, once a frame. */
export class NodeBatches {
    private readonly groups = new Map<Mesh, RowGroup>();
    private readonly groupOf = new Map<Node, RowGroup>();
    private readonly objectRows = new Set<Node>();
    /** The nodes a frame's walk still visits: every member a batch does not draw, and any with an overlay. */
    private readonly walked = new Set<Node>();
    private readonly dirty = new Set<RowGroup>();
    private readonly stopFlush: () => void;
    private view: BatchView;

    /**
     * Start with every node of the graph.
     * @param host - The graph.
     * @param scene - The scene whose frames flush the batches.
     */
    constructor(
        private readonly host: NodeBatchHost,
        scene: Parameters<typeof batchUploadFrames.join>[0],
    ) {
        this.view = host.view();
        this.stopFlush = batchUploadFrames.join(scene, () => {
            this.flush();
        });
        this.syncAll();
    }

    /**
     * The rows the batches draw.
     * @returns How many.
     */
    get batchedNodes(): number {
        let rows = 0;
        for (const group of this.groups.values()) {
            rows += group.batched ? group.members.size : 0;
        }

        return rows;
    }

    /**
     * Whether a batch draws this node now, rather than its own mesh.
     * @param node - The node.
     * @returns True when it does.
     */
    draws(node: Node): boolean {
        return this.groupOf.get(node)?.batched === true;
    }

    /**
     * The nodes a frame's walks visit (`Node.update`, the moved-node and border checks): the object
     * rows, and batched rows with an overlay to carry. A batched row is drawn from the row table,
     * which the coordinate lane fills in one typed pass, so it needs no visit of its own.
     * @param nodes - How many nodes the graph holds.
     * @returns The nodes, or null while some node has not been placed on a path yet, when the walk
     *     has to visit every node.
     */
    roster(nodes: number): ReadonlySet<Node> | null {
        return this.groupOf.size === nodes ? this.walked : null;
    }

    /**
     * Put a node on the roster or take it off, by whether it still needs a frame's visit. Called
     * whenever its batch or its overlays change.
     * @param node - The node.
     */
    rewalk(node: Node): void {
        if (this.groupOf.has(node) && node.walksEachFrame) {
            this.walked.add(node);
        } else {
            this.walked.delete(node);
        }
    }

    /**
     * Say whether a batch draws a node, and keep the roster with it.
     * @param node - The node.
     * @param source - The batch's source mesh, or null for its own mesh.
     */
    private draw(node: Node, source: Mesh | null): void {
        node.drawInBatch(source);
        this.rewalk(node);
    }

    /**
     * Whether some object rows are drawn by something other than their own mesh (a shader
     * surface hides its source), so a picture of what is drawn does not show them.
     * @returns True when one is.
     */
    hiddenRows(): boolean {
        for (const group of this.groups.values()) {
            if (!group.batched && group.members.size > 0 && group.source.visibility === 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * A node was painted: put it where it now belongs.
     * @param node - The node.
     */
    sync(node: Node): void {
        // The paint may have moved the node to another source: ask its paint, not the batch, so a
        // batched row is not given its mesh back on every sync.
        const source = node.paintedSourceMesh as Mesh;
        const had = this.groupOf.get(node);
        if (had !== undefined && had.source !== source) {
            this.leave(node);
        }

        const group = this.groupOf.get(node) ?? this.join(node, source);
        const object = !node.batchableIn(this.view);
        if (object !== this.objectRows.has(node)) {
            if (object) {
                this.objectRows.add(node);
                group.objects++;
            } else {
                this.objectRows.delete(node);
                group.objects--;
            }

            this.dirty.add(group);
        }

        if (group.batched && !object) {
            group.batch?.put(node.index, node.drawnInstanceColor);
            // A row the table does not hold yet keeps its mesh until the flush settles its group.
            this.draw(node, node.index < this.host.places.rows ? group.source : null);
            this.dirty.add(group);
        } else {
            this.draw(node, null);
        }
    }

    /**
     * A node went away, or left this path.
     * @param node - The node.
     */
    leave(node: Node): void {
        const group = this.groupOf.get(node);
        if (group === undefined) {
            return;
        }

        this.groupOf.delete(node);
        group.members.delete(node);
        this.draw(node, null);
        if (this.objectRows.delete(node)) {
            group.objects--;
        }

        if (group.batched) {
            group.batch?.free(node.index);
        }

        this.dirty.add(group);
    }

    /** A freeze moved rows: every batch refills. */
    rowsMoved(): void {
        for (const group of this.groups.values()) {
            group.stale = true;
            this.dirty.add(group);
        }
    }

    /** Stop: every source draws its rows again. */
    dispose(): void {
        this.stopFlush();
        for (const group of this.groups.values()) {
            this.settle(group, false);
            group.batch?.flush();
        }

        this.host.meshesChanged();
    }

    /** Bring every batch up to date before a frame. */
    private flush(): void {
        const view = this.host.view();
        if (view.scaled !== this.view.scaled || view.flatOutline !== this.view.flatOutline) {
            this.view = view;
            this.syncAll();
        }

        let changed = false;
        for (const group of this.dirty) {
            if (group.source.isDisposed()) {
                this.forget(group);
                continue;
            }

            if (group.stale) {
                this.measure(group);
            }

            const batched = group.objects === 0 && group.members.size > 0 && group.highest < this.host.places.rows;
            changed = this.settle(group, batched) || changed;
            changed = (group.batch?.flush() ?? false) || changed;
        }

        this.dirty.clear();
        if (changed) {
            this.host.meshesChanged();
        }
    }

    /**
     * Find a group's highest row. Not at the freeze: a node it removed has lost its row by then,
     * and stays a member until it disposes.
     * @param group - The group.
     */
    private measure(group: RowGroup): void {
        group.highest = -1;
        for (const node of group.members) {
            group.highest = Math.max(group.highest, node.index);
        }
    }

    private syncAll(): void {
        for (const node of this.host.nodes()) {
            this.sync(node);
        }
    }

    private join(node: Node, source: Mesh): RowGroup {
        let group = this.groups.get(source);
        if (group === undefined) {
            group = {
                source,
                members: new Set(),
                objects: 0,
                highest: -1,
                batch: null,
                batched: false,
                stale: false,
                restVisibility: source.visibility,
            };
            this.groups.set(source, group);
        }

        group.members.add(node);
        group.highest = Math.max(group.highest, node.index);
        this.groupOf.set(node, group);
        this.dirty.add(group);
        return group;
    }

    /**
     * Put a group on the batch or back on its source.
     * @param group - The group.
     * @param batched - Which.
     * @returns Whether its source changed.
     */
    private settle(group: RowGroup, batched: boolean): boolean {
        if (batched === group.batched && !group.stale) {
            return false;
        }

        group.stale = false;
        group.batch?.clear();
        if (batched) {
            group.batch ??= this.host.cache.batchFor(group.source, this.host.places, this.host.root());
            const rows = [...group.members].sort((a, b) => a.index - b.index);
            for (const node of rows) {
                group.batch.put(node.index, node.drawnInstanceColor);
            }
        }

        group.batched = batched;
        for (const node of group.members) {
            this.draw(node, batched ? group.source : null);
        }

        group.source.visibility = batched ? 0 : group.restVisibility;
        return true;
    }

    /**
     * The cache disposed a source: its nodes are about to be painted onto a new one.
     * @param group - The group.
     */
    private forget(group: RowGroup): void {
        this.groups.delete(group.source);
        for (const node of group.members) {
            this.groupOf.delete(node);
            this.draw(node, null);
            this.objectRows.delete(node);
        }
    }
}
