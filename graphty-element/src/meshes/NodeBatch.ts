import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import { type AbstractMesh, Mesh, type RawTexture, type TransformNode, VertexBuffer } from "@babylonjs/core";

import type { Rgba } from "../catalog/types";
import type { BatchView } from "../managers/StylePainter";
import type { Node } from "../Node";
import { batchUploadFrames } from "./FrameRoster";
import { handOverTogether } from "./handOverTogether";
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
    private matricesDirty = false;

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
     * Give a row a slot, or a new color or size in the one it has.
     * @param row - The row.
     * @param color - Its color, or null for white.
     * @param scale - Its size against the source the batch was built from.
     */
    put(row: number, color: Rgba | null, scale = 1): void {
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

        const m = slot * MATRIX_FLOATS;
        if (this.matrices[m] !== Math.fround(scale)) {
            this.matrices[m] = this.matrices[m + 5] = this.matrices[m + 10] = scale;
            this.matricesDirty = true;
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

        if (this.matricesDirty || whole) {
            this.mesh.thinInstanceBufferUpdated("matrix");
        }

        this.rowsDirty = false;
        this.colorsDirty = false;
        this.matricesDirty = false;
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
        const live: { row: number; from: number }[] = [];
        for (let slot = 0; slot < this.slots; slot++) {
            const row = this.rows[slot] ?? HOLE;
            if (row !== HOLE) {
                live.push({ row, from: slot });
            }
        }

        live.sort((a, b) => a.row - b.row);
        const { colors, matrices } = this;
        this.colors = new Float32Array(colors.length);
        this.matrices = identities(this.rows.length);
        this.slotOf.clear();
        live.forEach(({ row, from }, slot) => {
            this.rows[slot] = row;
            this.colors.set(colors.subarray(from * COLOR_FLOATS, (from + 1) * COLOR_FLOATS), slot * COLOR_FLOATS);
            this.matrices.set(
                matrices.subarray(from * MATRIX_FLOATS, (from + 1) * MATRIX_FLOATS),
                slot * MATRIX_FLOATS,
            );
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
        const { matrices } = this;
        this.matrices = identities(next);
        this.matrices.set(matrices);
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

/**
 * The size of one source mesh against another of the same shape, read from their geometry: the
 * factor every vertex of `canonical` is multiplied by to give `mesh`'s, or null when no single
 * factor does (another shape, or a creator whose geometry does not follow its size).
 * @param mesh - The source to draw scaled.
 * @param canonical - The source the batch is built from.
 * @returns The factor, or null.
 */
function scaleAgainst(mesh: Mesh, canonical: Mesh): number | null {
    if (mesh === canonical) {
        return 1;
    }

    const from = canonical.getVerticesData(VertexBuffer.PositionKind);
    const to = mesh.getVerticesData(VertexBuffer.PositionKind);
    const fromNormals = canonical.getVerticesData(VertexBuffer.NormalKind) ?? [];
    const toNormals = mesh.getVerticesData(VertexBuffer.NormalKind) ?? [];
    const fromIndices = canonical.getIndices() ?? [];
    const toIndices = mesh.getIndices() ?? [];
    if (
        from === null ||
        to?.length !== from.length ||
        fromNormals.length !== toNormals.length ||
        fromIndices.length !== toIndices.length
    ) {
        return null;
    }

    let far = 0;
    let at = 0;
    for (let i = 0; i < from.length; i++) {
        const value = Math.abs(from[i] ?? 0);
        if (value > far) {
            far = value;
            at = i;
        }
    }

    const scale = (to[at] ?? 0) / (from[at] ?? 1);
    if (far === 0 || !Number.isFinite(scale) || scale <= 0) {
        return null;
    }

    const within = (a: ArrayLike<number>, b: ArrayLike<number>, by: number, tolerance: number): boolean => {
        for (let i = 0; i < a.length; i++) {
            if (Math.abs((b[i] ?? 0) - (a[i] ?? 0) * by) > tolerance) {
                return false;
            }
        }

        return true;
    };
    return within(from, to, scale, far * scale * 1e-5) &&
        within(fromNormals, toNormals, 1, 1e-4) &&
        within(fromIndices, toIndices, 1, 0)
        ? scale
        : null;
}

/**
 * The groups one batch draws: sources of one shape and look that differ only in size, each row
 * scaled in its matrix, so a size ramp is one draw per shape (design/rendering/row-renderer.md 4.2).
 */
interface RowFamily {
    readonly key: string;
    /** The source the batch is built from; every member's geometry is a scale of its own. */
    readonly canonical: Mesh;
    readonly groups: Set<RowGroup>;
    batch: NodeBatch | null;
}

/** The rows of one source mesh. */
interface RowGroup {
    readonly source: Mesh;
    readonly members: Set<Node>;
    /** Members the batch cannot draw. */
    objects: number;
    /** The highest row seen, which must be in the table before the batch can place it. */
    highest: number;
    /** The batch family it joins once it is batched. */
    family: RowFamily | null;
    /** Its size against the family's canonical source. */
    scale: number;
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
    private readonly families = new Map<string, RowFamily>();
    /** Families whose batch is rebuilt at this flush. */
    private readonly refills = new Set<RowFamily>();
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
     * @param opacity - The opacity the batch draws it at.
     */
    private draw(node: Node, source: Mesh | null, opacity = 1): void {
        node.drawInBatch(source, opacity);
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
            group.family?.batch?.put(node.index, node.drawnInstanceColor, group.scale);
            // A row the table does not hold yet keeps its mesh until the flush settles its group.
            this.draw(node, node.index < this.host.places.rows ? group.source : null, group.restVisibility);
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
            group.family?.batch?.free(node.index);
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
        }

        for (const family of this.families.values()) {
            this.refill(family);
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

        for (const family of this.families.values()) {
            if (family.canonical.isDisposed()) {
                this.dissolve(family);
            }
        }

        const flushes = new Set<RowFamily>();
        const changed = this.settleDirty(flushes);
        if (this.drain(flushes) || changed) {
            this.host.meshesChanged();
        }
    }

    /**
     * Settle every dirty group, and note which families need a rebuild or only an upload.
     * @param flushes - Takes the families whose batch only uploads.
     * @returns Whether some source changed.
     */
    private settleDirty(flushes: Set<RowFamily>): boolean {
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
            if (this.settle(group, batched)) {
                changed = true;
                if (group.family !== null) {
                    this.refills.add(group.family);
                }
            } else if (group.family !== null) {
                flushes.add(group.family);
            }
        }

        this.dirty.clear();
        return changed;
    }

    /**
     * Rebuild the families that need it and upload the rest.
     * @param flushes - The families whose batch only uploads.
     * @returns Whether some batch started or stopped drawing.
     */
    private drain(flushes: Set<RowFamily>): boolean {
        let changed = false;
        for (const family of this.refills) {
            changed = this.refill(family) || changed;
        }

        for (const family of flushes) {
            if (!this.refills.has(family)) {
                changed = (family.batch?.flush() ?? false) || changed;
            }
        }

        this.refills.clear();
        return changed;
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
                family: null,
                scale: 1,
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
        if (batched) {
            this.joinFamily(group);
            this.host.cache.batchedSources.add(group.source);
        } else {
            this.host.cache.batchedSources.delete(group.source);
        }

        group.batched = batched;
        // Each member trades its mesh for an anchor, or back: together, or it costs the scene's size each (#3247).
        const source = batched ? group.source : null;
        handOverTogether(group.source.getScene(), this.host.root(), group.members, (node) => {
            this.draw(node, source, group.restVisibility);
        });

        group.source.visibility = batched ? 0 : group.restVisibility;
        return true;
    }

    /**
     * Put a group in the family of its shape and look, or start one, by its geometry.
     * @param group - The group, with at least one member.
     */
    private joinFamily(group: RowGroup): void {
        if (group.family !== null) {
            return;
        }

        const { source } = group;
        const [first] = group.members;
        const look = [
            first?.batchLook ?? "",
            source.getTotalVertices(),
            source.getTotalIndices(),
            source.renderingGroupId,
            source.sideOrientation,
            source.hasVertexAlpha,
            source.useVertexColors,
        ].join("|");
        // A translucent look keeps a batch per source: Babylon orders translucent meshes back to
        // front, one source against another, and one batch across sizes would draw them in row order.
        const shared = group.restVisibility < 1 ? undefined : this.families.get(look);
        const scale = shared === undefined ? 1 : scaleAgainst(source, shared.canonical);
        // ponytail: a source whose geometry is no scale of the canonical one gets a family of its own.
        const key = scale === null || group.restVisibility < 1 ? `${look}#${String(source.uniqueId)}` : look;
        let family = this.families.get(key);
        if (family === undefined) {
            family = { key, canonical: source, groups: new Set(), batch: null };
            this.families.set(key, family);
        }

        group.family = family;
        group.scale = scale ?? 1;
        family.groups.add(group);
    }

    /**
     * Rebuild a family's batch from every batched row of its groups, in row order.
     * @param family - The family.
     * @returns Whether the batch started or stopped drawing.
     */
    private refill(family: RowFamily): boolean {
        family.batch?.clear();
        const rows: { node: Node; scale: number }[] = [];
        let restVisibility = 1;
        for (const group of family.groups) {
            if (group.batched) {
                // A look's opacity is its source's visibility, which a batched source gives up for 0.
                ({ restVisibility } = group);
                for (const node of group.members) {
                    rows.push({ node, scale: group.scale });
                }
            }
        }

        if (rows.length > 0) {
            const made = family.batch === null;
            family.batch ??= this.host.cache.batchFor(family.canonical, this.host.places, this.host.root());
            family.batch.mesh.visibility = restVisibility;
            if (made && restVisibility < 1) {
                this.orderTranslucent(family.batch.mesh, family.canonical.uniqueId);
            }

            rows.sort((a, b) => a.node.index - b.node.index);
            for (const { node, scale } of rows) {
                family.batch.put(node.index, node.drawnInstanceColor, scale);
            }
        }

        return family.batch?.flush() ?? false;
    }

    /**
     * Put a new translucent batch among the other translucent batches in `scene.meshes` in the
     * order their sources were made. Every source sits at one place and every batch at another, so
     * Babylon's back-to-front sort ties them all and draws them in the order they reach it: a
     * source's when its first instance is met in `scene.meshes`, a batch's when it is.
     * ponytail: source creation order stands in for the objects path's instance order, which
     * repaint history can reorder; a translucent row's order would need tracking per instance.
     * @param mesh - The new batch.
     * @param sourceId - Its source's unique id.
     */
    private orderTranslucent(mesh: Mesh, sourceId: number): void {
        const later = new Set<AbstractMesh>();
        for (const other of this.families.values()) {
            if (other.batch !== null && other.batch.mesh !== mesh && other.batch.mesh.visibility < 1) {
                if (other.canonical.uniqueId > sourceId) {
                    later.add(other.batch.mesh);
                }
            }
        }

        const { meshes } = mesh.getScene();
        const at = meshes.findIndex((candidate) => later.has(candidate));
        if (at !== -1) {
            meshes.splice(meshes.indexOf(mesh), 1);
            meshes.splice(at, 0, mesh);
        }
    }

    /**
     * The cache disposed a family's canonical source, and its batch with it: every group finds a
     * family again at this flush.
     * @param family - The family.
     */
    private dissolve(family: RowFamily): void {
        this.families.delete(family.key);
        this.refills.delete(family);
        for (const group of family.groups) {
            group.family = null;
            group.stale = true;
            this.dirty.add(group);
        }
    }

    /**
     * The cache disposed a source: its nodes are about to be painted onto a new one.
     * @param group - The group.
     */
    private forget(group: RowGroup): void {
        this.groups.delete(group.source);
        this.host.cache.batchedSources.delete(group.source);
        for (const node of group.members) {
            this.groupOf.delete(node);
            this.draw(node, null);
            this.objectRows.delete(node);
        }

        if (group.family !== null) {
            group.family.groups.delete(group);
            this.refills.add(group.family);
        }
    }
}
