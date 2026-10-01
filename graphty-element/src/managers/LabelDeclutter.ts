import { type Camera, Matrix, type Mesh, type Observer, type Scene, Vector3, Viewport } from "@babylonjs/core";

import type { Node } from "../Node";
import type { GraphContext } from "./GraphContext";

/** One labelled node, what the last pass saw of it, and where its words were on screen. */
interface Entry {
    node: Node;
    /** Compares ids without building a string per comparison. */
    idKey: string;
    /** The label plane the last pass measured; a rebuilt label is a different mesh. */
    mesh: Mesh | null;
    /** Where the words sit on the plane, as fractions of it. Read once per label. */
    text: { left: number; right: number; top: number; bottom: number };
    x: number;
    y: number;
    z: number;
    enabled: boolean;
    selected: boolean;
    degree: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
}

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
/** A grid cell never shrinks below this many pixels, so a graph of tiny labels is not all cells. */
const MIN_CELL = 16;

/**
 * Hides node labels that would be drawn on top of each other, when the graph's behaviour
 * configuration asks for it (`labels.declutter`, off by default).
 *
 * Every node label is its own billboarded plane, so two labelled nodes that land near each other
 * on screen draw their words over one another. The pass projects each drawn label's WORDS -- not
 * its padded plane -- to a screen rectangle, orders the labels by priority -- a selected node
 * first, then the node with more edges, then the node id so the answer is stable -- and keeps a
 * label only if its rectangle meets no label already kept. Kept rectangles are bucketed in a
 * screen grid, so each label is tested against its neighbours rather than against every label.
 *
 * THE PASS RUNS ONLY WHEN SOMETHING THAT DECIDES PLACEMENT CHANGED: the camera's view or
 * projection, the viewport size, a label added, rebuilt or removed, a node moved, shown, hidden
 * or (de)selected, an edge added or removed, or the setting itself. A still scene costs one cheap
 * walk over the labelled nodes per frame and no projection at all.
 *
 * A label that loses is hidden with `isVisible`, never with `setEnabled` and never through a
 * style. `setEnabled` is the visibility mask's switch (`Node.applyRenderState`), and a style is
 * the reader's answer to what a node looks like; this is a placement decision, so it has its own
 * switch. Turning the setting off shows every label again.
 *
 * ONE PER SCENE, created by the first node that draws a label, and kept on `scene.metadata`
 * the way `NodeEffects` keeps the glow layer.
 */
export class LabelDeclutter {
    /** How many full passes have run. Read by tests to prove a still scene is not re-measured. */
    passes = 0;

    private readonly observer: Observer<Scene>;
    private readonly entries = new Map<Node, Entry>();
    /** Reused every pass: the candidates in priority order. */
    private readonly order: Entry[] = [];
    /** Reused every pass: kept labels by grid cell. Emptied, not rebuilt. */
    private readonly grid = new Map<number, Entry[]>();
    private columns = 1;
    private rows = 1;
    private dirty = true;
    private wasOn = false;
    private camera: Camera | null = null;
    private readonly view = new Float64Array(16);
    private readonly projection = new Float64Array(16);
    private width = -1;
    private height = -1;
    private edgeVersion = -1;
    private degrees = new Map<string | number, number>();

    // Scratch, so a pass allocates nothing per label.
    private readonly transform = new Matrix();
    private readonly toPixels = new Matrix();
    private readonly worldToPixels = new Matrix();
    private readonly viewport = new Viewport(0, 0, 0, 0);
    private readonly right = new Vector3();
    private readonly up = new Vector3();
    private readonly centre = new Vector3();
    private readonly corner = new Vector3();
    private readonly centreOnScreen = new Vector3();
    private readonly cornerOnScreen = new Vector3();

    private constructor(
        private readonly scene: Scene,
        private readonly context: GraphContext,
    ) {
        this.observer = scene.onBeforeRenderObservable.add(() => {
            this.run();
        });
        scene.onDisposeObservable.addOnce(() => {
            this.dispose();
        });
    }

    /**
     * Make sure the scene has a declutter pass, and add a node that is drawing a label to it.
     * @param scene - The scene the labels are drawn in.
     * @param context - The graph: its configuration says whether to declutter, its edges give
     *     the degree order.
     * @param node - The node drawing a label.
     */
    static track(scene: Scene, context: GraphContext, node: Node): void {
        scene.metadata = scene.metadata ?? {};
        if (!(scene.metadata.labelDeclutter instanceof LabelDeclutter)) {
            scene.metadata.labelDeclutter = new LabelDeclutter(scene, context);
        }

        const declutter = scene.metadata.labelDeclutter as LabelDeclutter;
        declutter.dirty = true;
        if (!declutter.entries.has(node)) {
            declutter.entries.set(node, {
                node,
                idKey: String(node.id),
                mesh: null,
                text: { left: 0, right: 1, top: 0, bottom: 1 },
                x: 0,
                y: 0,
                z: 0,
                enabled: false,
                selected: false,
                degree: 0,
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
            });
        }
    }

    /** Stop running before frames. */
    dispose(): void {
        this.scene.onBeforeRenderObservable.remove(this.observer);
        if (this.scene.metadata?.labelDeclutter === this) {
            this.scene.metadata.labelDeclutter = undefined;
        }
    }

    /** Before every frame: decide whether placement could have changed, and if so, place. */
    run(): void {
        if (!this.context.getStyles().config.behavior.labels.declutter) {
            if (this.wasOn) {
                this.showAll();
            }

            return;
        }

        const camera = this.scene.activeCamera;
        if (!camera) {
            return;
        }

        if (!this.wasOn || this.changed(camera)) {
            this.wasOn = true;
            this.place(camera);
        }
    }

    /**
     * One full pass: decide which labels are drawn.
     * @param camera - The camera the frame is drawn from.
     */
    place(camera: Camera): void {
        this.passes++;
        this.dirty = false;
        this.remember(camera);

        const engine = this.scene.getEngine();
        // Read from the ref, not the return value: Babylon 8's toGlobalToRef fills `ref` and then
        // returns the camera's own normalised viewport, which would put every label inside a
        // one-pixel screen.
        camera.viewport.toGlobalToRef(engine.getRenderWidth(), engine.getRenderHeight(), this.viewport);
        const { viewport } = this;
        // World to pixels in one matrix, built once a pass: Vector3.ProjectToRef rebuilds it for
        // every point it projects.
        camera.getViewMatrix().multiplyToRef(camera.getProjectionMatrix(), this.transform);
        const halfWidth = viewport.width / 2;
        const halfHeight = viewport.height / 2;
        Matrix.FromValuesToRef(
            halfWidth, 0, 0, 0,
            0, -halfHeight, 0, 0,
            0, 0, 0.5, 0,
            viewport.x + halfWidth, viewport.y + halfHeight, 0.5, 1,
            this.toPixels,
        );
        this.transform.multiplyToRef(this.toPixels, this.worldToPixels);
        const view = camera.getViewMatrix().m;
        camera.getDirectionToRef(X_AXIS, this.right);
        camera.getDirectionToRef(Y_AXIS, this.up);
        this.refreshDegrees();

        const { order } = this;
        order.length = 0;
        let widthSum = 0;
        let heightSum = 0;

        for (const entry of this.entries.values()) {
            const mesh = this.observe(entry);
            if (!mesh?.isEnabled()) {
                continue;
            }

            // The label's centre from its NODE's world matrix, not its own. A label is a billboard,
            // so its own world matrix depends on the camera and is stale until the render
            // recomputes it; the node's is cached and costs nothing while the node stands still.
            // Computed here rather than read, so a node moved this frame is measured where it
            // will be drawn.
            const parent = entry.node.mesh;
            const centre = Vector3.TransformCoordinatesToRef(mesh.position, parent.computeWorldMatrix(), this.centre);

            // A label behind the camera projects to a mirrored point on screen, and one outside
            // the view is not drawn at all; neither may hide a label the reader can see. This
            // matters whenever the camera is among the nodes: zoomed in, flying through, in XR.
            const depth = centre.x * view[2] + centre.y * view[6] + centre.z * view[10] + view[14];
            if (depth < camera.minZ || (camera.maxZ > 0 && depth > camera.maxZ)) {
                continue;
            }

            const extent = mesh.getBoundingInfo().boundingBox.extendSize;
            const scale = parent.absoluteScaling;
            const corner = this.corner.copyFrom(centre);
            this.right.scaleAndAddToRef(extent.x * Math.abs(scale.x * mesh.scaling.x), corner);
            this.up.scaleAndAddToRef(extent.y * Math.abs(scale.y * mesh.scaling.y), corner);
            const c = Vector3.TransformCoordinatesToRef(centre, this.worldToPixels, this.centreOnScreen);
            const k = Vector3.TransformCoordinatesToRef(corner, this.worldToPixels, this.cornerOnScreen);
            // Half the plane, on screen. The words are a part of it: `text` is where, from the
            // plane's top-left, so 0 maps to one half-extent before the centre and 1 to one after.
            const across = Math.abs(k.x - c.x);
            const down = Math.abs(k.y - c.y);
            const { text } = entry;
            entry.left = c.x + (2 * text.left - 1) * across;
            entry.right = c.x + (2 * text.right - 1) * across;
            entry.top = c.y + (2 * text.top - 1) * down;
            entry.bottom = c.y + (2 * text.bottom - 1) * down;
            if (
                entry.right < viewport.x ||
                entry.left > viewport.x + viewport.width ||
                entry.bottom < viewport.y ||
                entry.top > viewport.y + viewport.height
            ) {
                continue;
            }

            widthSum += entry.right - entry.left;
            heightSum += entry.bottom - entry.top;
            order.push(entry);
        }

        if (order.length === 0) {
            return;
        }

        order.sort(byPriority);

        // A cell about the size of an average label keeps each label in a handful of cells and
        // each cell down to a handful of labels.
        const size = Math.max(MIN_CELL, Math.max(widthSum, heightSum) / order.length);
        this.columns = Math.max(1, Math.ceil(viewport.width / size));
        this.rows = Math.max(1, Math.ceil(viewport.height / size));
        for (const bucket of this.grid.values()) {
            bucket.length = 0;
        }

        for (const entry of order) {
            const clear = this.isClear(entry, size);
            if (clear) {
                this.keep(entry, size);
            }

            if (entry.mesh) {
                entry.mesh.isVisible = clear;
            }
        }
    }

    /**
     * Whether anything that decides placement differs from what the last pass saw.
     * @param camera - The camera the frame is drawn from.
     * @returns True when the labels have to be placed again.
     */
    private changed(camera: Camera): boolean {
        if (this.dirty || camera !== this.camera) {
            return true;
        }

        const engine = this.scene.getEngine();
        if (engine.getRenderWidth() !== this.width || engine.getRenderHeight() !== this.height) {
            return true;
        }

        if (this.context.getDataManager().edgeVersion !== this.edgeVersion) {
            return true;
        }

        if (!sameMatrix(camera.getViewMatrix(), this.view) || !sameMatrix(camera.getProjectionMatrix(), this.projection)) {
            return true;
        }

        for (const entry of this.entries.values()) {
            const mesh = entry.node.label?.labelMesh ?? null;
            if (mesh !== entry.mesh || !mesh || mesh.isDisposed()) {
                return true;
            }

            const { position } = entry.node.mesh;
            if (
                position.x !== entry.x ||
                position.y !== entry.y ||
                position.z !== entry.z ||
                mesh.isEnabled() !== entry.enabled ||
                entry.node.isSelected() !== entry.selected
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Record what this pass sees of one node, and drop it if its label is gone.
     * @param entry - The node.
     * @returns Its label plane, or null when it has none.
     */
    private observe(entry: Entry): Mesh | null {
        const { node } = entry;
        const mesh = node.label?.labelMesh ?? null;
        if (!mesh || mesh.isDisposed()) {
            // The label, or the node, is gone. A new label adds the node back.
            this.entries.delete(node);
            entry.mesh = null;
            return null;
        }

        if (mesh !== entry.mesh && node.label) {
            entry.mesh = mesh;
            entry.text = node.label.textBounds;
        }

        entry.x = node.mesh.position.x;
        entry.y = node.mesh.position.y;
        entry.z = node.mesh.position.z;
        entry.enabled = mesh.isEnabled();
        entry.selected = node.isSelected();
        entry.degree = this.degrees.get(node.id) ?? 0;

        return mesh;
    }

    private remember(camera: Camera): void {
        const engine = this.scene.getEngine();
        this.camera = camera;
        this.width = engine.getRenderWidth();
        this.height = engine.getRenderHeight();
        this.view.set(camera.getViewMatrix().m);
        this.projection.set(camera.getProjectionMatrix().m);
    }

    private isClear(entry: Entry, size: number): boolean {
        const { x: originX, y: originY } = this.viewport;
        const x1 = cell(entry.right - originX, size, this.columns);
        const y1 = cell(entry.bottom - originY, size, this.rows);
        for (let x = cell(entry.left - originX, size, this.columns); x <= x1; x++) {
            for (let y = cell(entry.top - originY, size, this.rows); y <= y1; y++) {
                const bucket = this.grid.get(x * this.rows + y);
                if (!bucket) {
                    continue;
                }

                for (const other of bucket) {
                    if (
                        entry.left < other.right &&
                        entry.right > other.left &&
                        entry.top < other.bottom &&
                        entry.bottom > other.top
                    ) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    private keep(entry: Entry, size: number): void {
        const { x: originX, y: originY } = this.viewport;
        const x1 = cell(entry.right - originX, size, this.columns);
        const y1 = cell(entry.bottom - originY, size, this.rows);
        for (let x = cell(entry.left - originX, size, this.columns); x <= x1; x++) {
            for (let y = cell(entry.top - originY, size, this.rows); y <= y1; y++) {
                const key = x * this.rows + y;
                let bucket = this.grid.get(key);
                if (!bucket) {
                    bucket = [];
                    this.grid.set(key, bucket);
                }

                bucket.push(entry);
            }
        }
    }

    /** The setting was turned off: every label is drawn again. */
    private showAll(): void {
        this.wasOn = false;
        this.dirty = true;
        for (const entry of this.entries.values()) {
            const mesh = entry.node.label?.labelMesh;
            if (mesh && !mesh.isDisposed()) {
                mesh.isVisible = true;
            }
        }
    }

    /** How many edges each node has, counted again only when an edge is added or removed. */
    private refreshDegrees(): void {
        const { edges, edgeVersion } = this.context.getDataManager();
        if (edgeVersion === this.edgeVersion) {
            return;
        }

        const degrees = new Map<string | number, number>();
        for (const edge of edges.values()) {
            degrees.set(edge.srcId, (degrees.get(edge.srcId) ?? 0) + 1);
            degrees.set(edge.dstId, (degrees.get(edge.dstId) ?? 0) + 1);
        }

        this.degrees = degrees;
        this.edgeVersion = edgeVersion;
    }
}

/**
 * A selected node first, then the node with more edges, then the node id so the order is stable.
 * @param a - One label.
 * @param b - The other.
 * @returns Negative when `a` is kept first.
 */
function byPriority(a: Entry, b: Entry): number {
    if (a.selected !== b.selected) {
        return a.selected ? -1 : 1;
    }

    if (a.degree !== b.degree) {
        return b.degree - a.degree;
    }

    if (a.idKey === b.idKey) {
        return 0;
    }

    return a.idKey < b.idKey ? -1 : 1;
}

/**
 * The grid column or row a screen coordinate falls in.
 *
 * CLAMPED TO THE VIEWPORT, so a label reaching off screen -- one right in front of the camera
 * can be many screens wide -- is bucketed in the cells along the edge rather than in thousands
 * of cells nobody sees. The overlap test itself still compares the whole rectangles.
 * @param at - The coordinate, in pixels from the viewport's edge.
 * @param size - The cell size in pixels.
 * @param count - How many cells span the viewport.
 * @returns The cell index, in [0, count).
 */
function cell(at: number, size: number, count: number): number {
    return Math.min(count - 1, Math.max(0, Math.floor(at / size)));
}

function sameMatrix(matrix: Matrix, seen: Float64Array): boolean {
    const { m } = matrix;
    for (let i = 0; i < 16; i++) {
        if (m[i] !== seen[i]) {
            return false;
        }
    }

    return true;
}
