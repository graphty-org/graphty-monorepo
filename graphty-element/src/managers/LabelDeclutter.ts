import { type Camera, Matrix, type Mesh, type Observer, type Scene, Vector3, Viewport } from "@babylonjs/core";

import type { Edge } from "../Edge";
import type { Node } from "../Node";
import { animatesEveryFrame } from "./everyFrameAnimations";
import type { GraphContext } from "./GraphContext";

/**
 * How many node labels the element is drawing, and why the rest are not.
 *
 * A node counts once however many label lines it has. Edge labels are not counted: the element
 * never hides an edge label to avoid overlap.
 *
 * `nodeHidden` and `hiddenByOverlap` are separate parts of `labeled`: a label is counted under one
 * of them at most. `labeled - nodeHidden - hiddenByOverlap` is the number of labels the element
 * draws. Some of those may be outside the current view; a label outside the view is never counted
 * as hidden. A minor release may add another `hiddenBy...` count for a new reason, separate from
 * these, and the number drawn is then `labeled` less every `hidden` count.
 * @since 3.7.0
 */
export interface NodeLabelCounts {
    /** Nodes whose label has text to draw. */
    readonly labeled: number;
    /** Labels not drawn because their node is not drawn (a filter or the time window hides it). */
    readonly nodeHidden: number;
    /**
     * Labels not drawn because, inside the current view, `layoutBehavior.labels.declutter` hid
     * them: they would overlap a label it kept -- or, with `labels.avoidNodesAndEdges` on, every
     * place around their node would cover a label it kept or another node. Never counts a label
     * whose node is hidden. Always 0 while declutter is off. Depends on the camera and the size
     * of the canvas.
     */
    readonly hiddenByOverlap: number;
}

/**
 * One node's label as the element draws it.
 * @since 3.15.0
 */
export interface NodeLabel {
    /**
     * The words drawn, after the label's text was bound to the node's data and its markup
     * (`<bold>`, `<color='...'>`) was applied: markup tags are not part of it. Lines are joined
     * with `"\n"`.
     */
    readonly text: string;
    /**
     * False when the label is not drawn: its node is hidden (a filter or the time window), or
     * `layoutBehavior.labels.declutter` hid it because it would overlap a label it kept (or, with
     * `labels.avoidNodesAndEdges`, another node). A label outside the current view still reads
     * true, as it does in {@link NodeLabelCounts}.
     */
    readonly drawn: boolean;
}

/** The counts before any label is drawn. */
export const NO_NODE_LABELS: NodeLabelCounts = Object.freeze({ labeled: 0, nodeHidden: 0, hiddenByOverlap: 0 });

/**
 * How many frames the labels must stay put before their counts are published, so a camera
 * gesture or a moving layout publishes once when it stops rather than every frame.
 */
const QUIET_FRAMES = 10;

/**
 * Whether two counts say the same thing.
 * @param a - One.
 * @param b - The other.
 * @returns True when every count is equal.
 */
function sameCounts(a: NodeLabelCounts, b: NodeLabelCounts): boolean {
    return a.labeled === b.labeled && a.nodeHidden === b.nodeHidden && a.hiddenByOverlap === b.hiddenByOverlap;
}

/** One labeled node, what the last pass saw of it, and where its words were on screen. */
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
    /** Where the label's style put it, on its node. Read when the label is first seen. */
    home: Vector3;
    /** Where `avoidNodesAndEdges` last moved it to, while it is moved. */
    placed: Vector3 | null;
    /** On screen, this pass: the label's own centre, half its plane, and world units per pixel. */
    cx: number;
    cy: number;
    across: number;
    down: number;
    perPixelX: number;
    perPixelY: number;
    /** On screen, this pass: its node's centre and radius, and the node's slot, -1 when not drawn. */
    nx: number;
    ny: number;
    nr: number;
    slot: number;
}

/** The places tried around a node, as screen directions: its own place first, then these. */
const AROUND: readonly (readonly [number, number])[] = [
    [0, -1],
    [0, 1],
    [1, 0],
    [-1, 0],
    [Math.SQRT1_2, -Math.SQRT1_2],
    [-Math.SQRT1_2, -Math.SQRT1_2],
    [Math.SQRT1_2, Math.SQRT1_2],
    [-Math.SQRT1_2, Math.SQRT1_2],
];
/** Pixels kept between a moved label and its node. */
const LABEL_GAP = 2;
/** What covering each kind of thing costs a place; the cheapest place wins. */
const COVERS_LABEL = 4;
const COVERS_NODE = 2;
const COVERS_EDGE = 1;

const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
/** A grid cell never shrinks below this many pixels, so a graph of tiny labels is not all cells. */
const MIN_CELL = 16;

/**
 * Hides node labels that would be drawn on top of each other, when the graph's behavior
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
 * THE COUNTS ARE PUBLISHED ONCE THE VIEW IS STILL: `counts` holds what the last pass saw, and
 * after {@link QUIET_FRAMES} frames with nothing to re-decide, the context's
 * `onNodeLabelCounts` is told when they differ from the last counts it was told. While the
 * setting is off the same per-frame walk runs without projecting anything, so the counts follow
 * labels added, removed, filtered or hidden by the time window.
 *
 * ONE PER SCENE, created by the first node that draws a label, and kept on `scene.metadata`
 * the way `NodeEffects` keeps the glow layer.
 *
 * WITH `labels.avoidNodesAndEdges` the same pass also moves labels. Every drawn node is projected
 * to a screen circle and every drawn edge to a screen segment, bucketed in the same grid, and
 * each label in priority order tries its own place and then eight places around its node,
 * taking the first that covers nothing and otherwise the one that covers least (a label worst,
 * then a node, then an edge). A moved label's plane is moved on its node; it goes back to its
 * own place when the setting is turned off. That setting also makes the pass run, and watch every
 * node rather than only the labelled ones, while `declutter` is off -- it then moves labels and
 * never hides one.
 */
export class LabelDeclutter {
    /** How many full passes have run. Read by tests to prove a still scene is not re-measured. */
    passes = 0;
    /** What the last pass saw. Read by `element.nodeLabelCounts`. */
    counts: NodeLabelCounts = NO_NODE_LABELS;

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
    private wasAvoiding = false;
    /** A sum over every node's position, mesh and visibility: what the last pass saw of them. */
    private nodesSeen = 0;
    /** Reused every pass while avoiding: each drawn node and edge on screen, and their buckets. */
    private readonly nodeSlots = new Map<Node, number>();
    private circles = new Float64Array(0);
    private segments = new Float64Array(0);
    private readonly nodeGrid = new Map<number, number[]>();
    private readonly edgeGrid = new Map<number, number[]>();
    private readonly inverse = new Matrix();
    private readonly moved = new Vector3();
    /** Frames since the last pass; publishing happens once, when this reaches QUIET_FRAMES. */
    private quiet = 0;
    /**
     * Holds the frames from a pass until its counts are published: the publish is counted in
     * frames, so a graph drawn on demand that stopped drawing at the pass would never announce
     * the counts it drew, and a wait for the finished picture would wait for ever.
     */
    private releaseFrames: (() => void) | null = null;
    private published: NodeLabelCounts = NO_NODE_LABELS;
    /** Callers of {@link LabelDeclutter.whenPublished} waiting for the next publish. */
    private readonly waiters: (() => void)[] = [];
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
                home: new Vector3(),
                placed: null,
                cx: 0,
                cy: 0,
                across: 0,
                down: 0,
                perPixelX: 0,
                perPixelY: 0,
                nx: 0,
                ny: 0,
                nr: 0,
                slot: -1,
            });
        }
    }

    /** Stop running before frames. */
    dispose(): void {
        this.scene.onBeforeRenderObservable.remove(this.observer);
        this.releaseFrames?.();
        this.releaseFrames = null;
        this.release();
        if (this.scene.metadata?.labelDeclutter === this) {
            this.scene.metadata.labelDeclutter = undefined;
        }
    }

    /** Before every frame: decide whether placement could have changed, and if so, place. */
    run(): void {
        const { declutter, avoidNodesAndEdges } = this.context.getStyles().config.behavior.labels;
        const on = declutter || avoidNodesAndEdges;
        if (!on && this.wasOn) {
            this.showAll();
        }

        if (!avoidNodesAndEdges && this.wasAvoiding) {
            this.sendHome();
        }

        const camera = this.scene.activeCamera;
        if (!camera) {
            return;
        }

        if (
            on !== this.wasOn ||
            avoidNodesAndEdges !== this.wasAvoiding ||
            this.changed(camera, on, avoidNodesAndEdges)
        ) {
            this.wasOn = on;
            this.wasAvoiding = avoidNodesAndEdges;
            if (on) {
                this.place(camera);
            } else {
                this.survey();
            }

            this.quiet = 0;
            this.releaseFrames ??= animatesEveryFrame(this.scene);
        } else if (++this.quiet === QUIET_FRAMES) {
            this.publish();
            this.releaseFrames?.();
            this.releaseFrames = null;
        }
    }

    /**
     * Resolves once the counts of the last pass have been published -- at once when they already
     * are -- so a wait for the finished picture (`waitForStableFrame`) also waits for the
     * `graphty-label-change` that announces them. Without it a picture taken on the stable frame
     * shows whatever the page last read, which depends on whether the {@link QUIET_FRAMES} frames
     * after it happened to be drawn before the picture was taken.
     * @returns A promise that resolves when nothing is left to publish.
     */
    whenPublished(): Promise<void> {
        // A setting switched since the last pass is a pass still to come: without this check a
        // wait started right after `labels.declutter` changed resolved before any label moved.
        const { declutter, avoidNodesAndEdges } = this.context.getStyles().config.behavior.labels;
        const on = declutter || avoidNodesAndEdges;
        if (
            !this.dirty &&
            on === this.wasOn &&
            avoidNodesAndEdges === this.wasAvoiding &&
            sameCounts(this.counts, this.published)
        ) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.waiters.push(resolve);
        });
    }

    /** Tell the context the counts, when they differ from the last it was told. */
    private publish(): void {
        const { counts } = this;
        if (!sameCounts(counts, this.published)) {
            this.published = counts;
            this.context.onNodeLabelCounts?.notifyObservers(counts);
        }

        this.release();
    }

    /** Resolve every {@link LabelDeclutter.whenPublished} waiting. */
    private release(): void {
        for (const resolve of this.waiters.splice(0)) {
            resolve();
        }
    }

    /** The setting is off: count the labels without placing any. */
    private survey(): void {
        this.dirty = false;
        let labeled = 0;
        let nodeHidden = 0;
        for (const entry of this.entries.values()) {
            const mesh = this.observe(entry);
            if (mesh) {
                labeled++;
                if (!mesh.isEnabled()) {
                    nodeHidden++;
                }
            }
        }

        this.setCounts(labeled, nodeHidden, 0);
    }

    private setCounts(labeled: number, nodeHidden: number, hiddenByOverlap: number): void {
        const { counts } = this;
        if (
            counts.labeled !== labeled ||
            counts.nodeHidden !== nodeHidden ||
            counts.hiddenByOverlap !== hiddenByOverlap
        ) {
            this.counts = Object.freeze({ labeled, nodeHidden, hiddenByOverlap });
        }
    }

    /**
     * One full pass: decide which labels are drawn.
     * @param camera - The camera the frame is drawn from.
     */
    place(camera: Camera): void {
        const { declutter, avoidNodesAndEdges: avoiding } = this.context.getStyles().config.behavior.labels;
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
            halfWidth,
            0,
            0,
            0,
            0,
            -halfHeight,
            0,
            0,
            0,
            0,
            0.5,
            0,
            viewport.x + halfWidth,
            viewport.y + halfHeight,
            0.5,
            1,
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
        let labeled = 0;
        let nodeHidden = 0;

        for (const entry of this.entries.values()) {
            const mesh = this.observe(entry);
            if (!mesh) {
                continue;
            }

            labeled++;
            // A label this pass does not place is never left hidden by an earlier one, so a label
            // hidden for overlap and then scrolled away or filtered out is not counted or kept
            // hidden for a reason that no longer holds -- nor left moved.
            mesh.isVisible = true;
            this.unmove(entry, mesh);
            if (!mesh.isEnabled()) {
                nodeHidden++;
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
            entry.cx = c.x;
            entry.cy = c.y;
            entry.across = across;
            entry.down = down;
            entry.perPixelX = across > 0 ? (extent.x * Math.abs(scale.x * mesh.scaling.x)) / across : 0;
            entry.perPixelY = down > 0 ? (extent.y * Math.abs(scale.y * mesh.scaling.y)) / down : 0;
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
            this.setCounts(labeled, nodeHidden, 0);
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

        if (avoiding) {
            this.setCounts(labeled, nodeHidden, this.placeAround(size, declutter));
            return;
        }

        let hiddenByOverlap = 0;
        for (const entry of order) {
            const clear = this.isClear(entry, size);
            if (clear) {
                this.keep(entry, size);
            } else {
                hiddenByOverlap++;
            }

            if (entry.mesh) {
                entry.mesh.isVisible = clear;
            }
        }

        this.setCounts(labeled, nodeHidden, hiddenByOverlap);
    }

    /**
     * Whether anything that decides placement differs from what the last pass saw.
     * @param camera - The camera the frame is drawn from.
     * @param on - Whether the setting is on. Off, only the labels themselves can change the counts.
     * @param avoiding - Whether labels avoid nodes, whose moves then matter too.
     * @returns True when the labels have to be placed (or, off, counted) again.
     */
    private changed(camera: Camera, on: boolean, avoiding: boolean): boolean {
        if (this.dirty) {
            return true;
        }

        if (on && this.viewChanged(camera)) {
            return true;
        }

        if (avoiding && this.nodesChanged()) {
            return true;
        }

        return this.labelsChanged();
    }

    /**
     * Whether any node moved, was rebuilt (a new size or shape) or was shown or hidden since the
     * last pass. Only asked while labels avoid nodes, whose places depend on every node.
     * @returns True when one did.
     */
    private nodesChanged(): boolean {
        let seen = 0;
        for (const node of this.context.getDataManager().nodes.values()) {
            const { mesh } = node;
            const { position } = mesh;
            seen += position.x * 1.31 + position.y * 2.71 + position.z * 3.17 + mesh.uniqueId * 0.001;
            if (mesh.isEnabled()) {
                seen += 0.5;
            }
        }

        if (seen === this.nodesSeen) {
            return false;
        }

        this.nodesSeen = seen;
        return true;
    }

    private viewChanged(camera: Camera): boolean {
        if (camera !== this.camera) {
            return true;
        }

        const engine = this.scene.getEngine();
        if (engine.getRenderWidth() !== this.width || engine.getRenderHeight() !== this.height) {
            return true;
        }

        if (this.context.getDataManager().edgeVersion !== this.edgeVersion) {
            return true;
        }

        if (
            !sameMatrix(camera.getViewMatrix(), this.view) ||
            !sameMatrix(camera.getProjectionMatrix(), this.projection)
        ) {
            return true;
        }

        return false;
    }

    private labelsChanged(): boolean {
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
            entry.home.copyFrom(mesh.position);
            entry.placed = null;
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

    /** `avoidNodesAndEdges` was turned off: every moved label goes back to its own place. */
    private sendHome(): void {
        this.wasAvoiding = false;
        this.dirty = true;
        for (const entry of this.entries.values()) {
            const mesh = entry.node.label?.labelMesh;
            if (mesh && mesh === entry.mesh && !mesh.isDisposed()) {
                this.unmove(entry, mesh);
            }
        }
    }

    /**
     * Put a label moved by an earlier pass back on its own place. A label something else moved
     * since -- its style re-attached it -- takes that as its own place instead.
     * @param entry - The label.
     * @param mesh - Its plane.
     */
    private unmove(entry: Entry, mesh: Mesh): void {
        if (entry.placed === null) {
            if (!mesh.position.equals(entry.home)) {
                entry.home.copyFrom(mesh.position);
            }

            return;
        }

        if (mesh.position.equals(entry.placed)) {
            mesh.position.copyFrom(entry.home);
        } else {
            entry.home.copyFrom(mesh.position);
        }

        entry.placed = null;
    }

    /**
     * Project every drawn node to a circle and every drawn edge to a segment on screen, and
     * bucket them in the grid the labels use.
     * @param size - The grid's cell size in pixels.
     */
    private projectGraph(size: number): void {
        const { nodes, edges } = this.context.getDataManager();
        if (this.circles.length < 3 * nodes.size) {
            this.circles = new Float64Array(3 * nodes.size);
        }

        if (this.segments.length < 4 * edges.size) {
            this.segments = new Float64Array(4 * edges.size);
        }

        for (const bucket of this.nodeGrid.values()) {
            bucket.length = 0;
        }

        for (const bucket of this.edgeGrid.values()) {
            bucket.length = 0;
        }

        this.nodeSlots.clear();
        let slot = 0;
        for (const node of nodes.values()) {
            if (this.projectNode(node, slot, size)) {
                slot++;
            }
        }

        let index = 0;
        for (const edge of edges.values()) {
            if (this.projectEdge(edge, index, size)) {
                index++;
            }
        }
    }

    /**
     * Project one drawn node to a screen circle in `slot` and bucket it when it is in view.
     * @param node - The node.
     * @param slot - Its slot.
     * @param size - The grid's cell size in pixels.
     * @returns False when the node is not drawn or is behind the camera.
     */
    private projectNode(node: Node, slot: number, size: number): boolean {
        const { mesh } = node;
        if (mesh.isDisposed() || !mesh.isEnabled()) {
            return false;
        }

        const { view, viewport, circles } = this;
        const centre = mesh.computeWorldMatrix().getTranslationToRef(this.centre);
        const depth = centre.x * view[2] + centre.y * view[6] + centre.z * view[10] + view[14];
        if (depth <= 0) {
            return false;
        }

        const root = mesh.parent && "absoluteScaling" in mesh.parent ? (mesh.parent.absoluteScaling as Vector3).x : 1;
        const corner = this.corner.copyFrom(centre);
        this.right.scaleAndAddToRef(node.drawnRadius * Math.abs(root), corner);
        const c = Vector3.TransformCoordinatesToRef(centre, this.worldToPixels, this.centreOnScreen);
        const k = Vector3.TransformCoordinatesToRef(corner, this.worldToPixels, this.cornerOnScreen);
        const r = Math.hypot(k.x - c.x, k.y - c.y);
        circles[3 * slot] = c.x;
        circles[3 * slot + 1] = c.y;
        circles[3 * slot + 2] = r;
        this.nodeSlots.set(node, slot);
        const box = { left: c.x - r, top: c.y - r, right: c.x + r, bottom: c.y + r };
        if (
            box.right >= viewport.x &&
            box.left <= viewport.x + viewport.width &&
            box.bottom >= viewport.y &&
            box.top <= viewport.y + viewport.height
        ) {
            this.bucket(this.nodeGrid, slot, box, size);
        }

        return true;
    }

    /**
     * Project one drawn edge between two projected nodes to a segment in `index`, and bucket the
     * part of it in view.
     * @param edge - The edge.
     * @param index - Its index.
     * @param size - The grid's cell size in pixels.
     * @returns False when it is not drawn or not in view.
     */
    private projectEdge(edge: Edge, index: number, size: number): boolean {
        const from = this.nodeSlots.get(edge.srcNode);
        const to = this.nodeSlots.get(edge.dstNode);
        if (from === undefined || to === undefined || !edgeDrawn(edge)) {
            return false;
        }

        const { circles, segments, viewport } = this;
        const x0 = circles[3 * from];
        const y0 = circles[3 * from + 1];
        const x1 = circles[3 * to];
        const y1 = circles[3 * to + 1];
        const span = clip(x0, y0, x1, y1, {
            left: viewport.x,
            top: viewport.y,
            right: viewport.x + viewport.width,
            bottom: viewport.y + viewport.height,
        });
        if (span === null) {
            return false;
        }

        segments[4 * index] = x0;
        segments[4 * index + 1] = y0;
        segments[4 * index + 2] = x1;
        segments[4 * index + 3] = y1;
        // Walked in quarter cells over the part in view, so a segment lands in every cell it
        // crosses but a corner it only clips.
        const length = Math.hypot(x1 - x0, y1 - y0) * (span[1] - span[0]);
        const steps = Math.max(1, Math.ceil(length / (size / 4)));
        let last = -1;
        for (let n = 0; n <= steps; n++) {
            const t = span[0] + ((span[1] - span[0]) * n) / steps;
            const key = this.cellOf(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, size);
            if (key !== last) {
                this.add(this.edgeGrid, key, index);
                last = key;
            }
        }

        return true;
    }

    /**
     * Each label in priority order takes the cheapest of its places: see the class comment.
     * @param size - The grid's cell size in pixels.
     * @param declutter - Whether a label with no place clear of labels and nodes is hidden.
     * @returns How many labels were hidden.
     */
    private placeAround(size: number, declutter: boolean): number {
        // ponytail: projects every node and edge on every pass, about 5 ms at 1,000 nodes and
        // 60 to 80 ms at 10,000 (test/browser/overlap-avoidance.bench.test.ts); reuse the
        // labelled nodes' projections or skip passes while a layout moves if a large graph needs it.
        this.projectGraph(size);
        let hidden = 0;
        for (const entry of this.order) {
            if (!this.placeOne(entry, size, declutter)) {
                hidden++;
            }
        }

        return hidden;
    }

    /**
     * Give one label the cheapest of its places, or hide it.
     * @param entry - The label.
     * @param size - The grid's cell size in pixels.
     * @param declutter - Whether a label with no place clear of labels and nodes is hidden.
     * @returns False when it was hidden.
     */
    private placeOne(entry: Entry, size: number, declutter: boolean): boolean {
        entry.slot = this.nodeSlots.get(entry.node) ?? -1;
        const { slot } = entry;
        if (slot >= 0) {
            entry.nx = this.circles[3 * slot];
            entry.ny = this.circles[3 * slot + 1];
            entry.nr = this.circles[3 * slot + 2];
        } else {
            entry.nx = entry.cx;
            entry.ny = entry.cy;
            entry.nr = 0;
        }

        let best = 0;
        let lowest = Number.POSITIVE_INFINITY;
        for (let place = 0; place <= AROUND.length && lowest > 0; place++) {
            this.frame(entry, place);
            const cost = this.cost(entry, size, lowest);
            if (cost < lowest) {
                lowest = cost;
                best = place;
            }
        }

        const { mesh } = entry;
        if (declutter && lowest >= COVERS_NODE) {
            if (mesh) {
                mesh.isVisible = false;
            }

            return false;
        }

        this.frame(entry, best);
        this.keep(entry, size);
        if (best > 0 && mesh) {
            this.move(entry, mesh);
        }

        return true;
    }

    /**
     * Set the label's screen rectangle to one of its places.
     * @param entry - The label.
     * @param place - 0 for its own place, else one of {@link AROUND} plus one.
     */
    private frame(entry: Entry, place: number): void {
        let x = entry.cx;
        let y = entry.cy;
        if (place > 0) {
            const [dx, dy] = AROUND[place - 1];
            // Out from the node's edge along the direction, far enough that the plane clears it.
            x = entry.nx + dx * (entry.nr + LABEL_GAP) + Math.sign(dx) * entry.across;
            y = entry.ny + dy * (entry.nr + LABEL_GAP) + Math.sign(dy) * entry.down;
        }

        const { text } = entry;
        entry.left = x + (2 * text.left - 1) * entry.across;
        entry.right = x + (2 * text.right - 1) * entry.across;
        entry.top = y + (2 * text.top - 1) * entry.down;
        entry.bottom = y + (2 * text.bottom - 1) * entry.down;
    }

    /**
     * What a place covers: {@link COVERS_LABEL} for a kept label, plus {@link COVERS_NODE} for
     * another drawn node, plus {@link COVERS_EDGE} for a drawn edge.
     * @param entry - The label, framed at the place.
     * @param size - The grid's cell size in pixels.
     * @param enough - Stop counting once the cost reaches this: the place has already lost.
     * @returns The cost.
     */
    private cost(entry: Entry, size: number, enough: number): number {
        let cost = this.isClear(entry, size) ? 0 : COVERS_LABEL;
        if (cost >= enough) {
            return cost;
        }

        const { x: originX, y: originY } = this.viewport;
        const x0 = cell(entry.left - originX, size, this.columns);
        const x1 = cell(entry.right - originX, size, this.columns);
        const y0 = cell(entry.top - originY, size, this.rows);
        const y1 = cell(entry.bottom - originY, size, this.rows);
        let node = false;
        let edge = false;
        for (let x = x0; x <= x1 && !(node && edge); x++) {
            for (let y = y0; y <= y1 && !(node && edge); y++) {
                const key = x * this.rows + y;
                node ||= this.coversNode(entry, this.nodeGrid.get(key));
                edge ||= this.coversEdge(entry, this.edgeGrid.get(key));
            }
        }

        if (node) {
            cost += COVERS_NODE;
        }

        if (edge) {
            cost += COVERS_EDGE;
        }

        return cost;
    }

    /**
     * Whether the label's rectangle meets a drawn node of one grid cell other than its own.
     * @param entry - The label, framed at a place.
     * @param slots - The cell's nodes.
     * @returns True when it does.
     */
    private coversNode(entry: Entry, slots: number[] | undefined): boolean {
        const { circles } = this;
        for (const slot of slots ?? []) {
            if (
                slot !== entry.slot &&
                rectMeetsCircle(entry, circles[3 * slot], circles[3 * slot + 1], circles[3 * slot + 2])
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Whether the label's rectangle meets a drawn edge of one grid cell.
     * @param entry - The label, framed at a place.
     * @param indices - The cell's edges.
     * @returns True when it does.
     */
    private coversEdge(entry: Entry, indices: number[] | undefined): boolean {
        const { segments } = this;
        for (const index of indices ?? []) {
            const i = 4 * index;
            const span = clip(segments[i], segments[i + 1], segments[i + 2], segments[i + 3], entry);
            if (span !== null) {
                return true;
            }
        }

        return false;
    }

    /**
     * Move a label's plane, on its node, so its centre is where its rectangle now is.
     * @param entry - The label, framed at the place it takes.
     * @param mesh - Its plane, at its own place.
     */
    private move(entry: Entry, mesh: Mesh): void {
        const { text } = entry;
        // The plane's centre from the words' rectangle: the inverse of `frame`.
        const x = entry.left - (2 * text.left - 1) * entry.across;
        const y = entry.top - (2 * text.top - 1) * entry.down;
        const parent = entry.node.mesh;
        const world = parent.computeWorldMatrix();
        const at = Vector3.TransformCoordinatesToRef(entry.home, world, this.moved);
        this.right.scaleAndAddToRef((x - entry.cx) * entry.perPixelX, at);
        // Screen y grows downwards.
        this.up.scaleAndAddToRef(-(y - entry.cy) * entry.perPixelY, at);
        world.invertToRef(this.inverse);
        Vector3.TransformCoordinatesToRef(at, this.inverse, mesh.position);
        entry.placed = (entry.placed ?? new Vector3()).copyFrom(mesh.position);
    }

    private cellOf(x: number, y: number, size: number): number {
        const { x: originX, y: originY } = this.viewport;
        return cell(x - originX, size, this.columns) * this.rows + cell(y - originY, size, this.rows);
    }

    private bucket(
        grid: Map<number, number[]>,
        value: number,
        box: { left: number; top: number; right: number; bottom: number },
        size: number,
    ): void {
        const { x: originX, y: originY } = this.viewport;
        const x1 = cell(box.right - originX, size, this.columns);
        const y1 = cell(box.bottom - originY, size, this.rows);
        for (let x = cell(box.left - originX, size, this.columns); x <= x1; x++) {
            for (let y = cell(box.top - originY, size, this.rows); y <= y1; y++) {
                this.add(grid, x * this.rows + y, value);
            }
        }
    }

    private add(grid: Map<number, number[]>, key: number, value: number): void {
        let bucket = grid.get(key);
        if (!bucket) {
            bucket = [];
            grid.set(key, bucket);
        }

        bucket.push(value);
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

/**
 * Whether an edge is drawn: its line is in the scene and switched on.
 * @param edge - The edge.
 * @returns True when it is.
 */
function edgeDrawn(edge: Edge): boolean {
    return !edge.isDisposed() && edge.isRenderVisible();
}

/**
 * Whether a rectangle meets a circle.
 * @param rect - The rectangle.
 * @param rect.left - Its left edge.
 * @param rect.right - Its right edge.
 * @param rect.top - Its top edge.
 * @param rect.bottom - Its bottom edge.
 * @param x - The circle's centre.
 * @param y - The circle's centre.
 * @param r - Its radius.
 * @returns True when they overlap.
 */
function rectMeetsCircle(
    rect: { left: number; right: number; top: number; bottom: number },
    x: number,
    y: number,
    r: number,
): boolean {
    const dx = x - Math.max(rect.left, Math.min(x, rect.right));
    const dy = y - Math.max(rect.top, Math.min(y, rect.bottom));
    return dx * dx + dy * dy < r * r;
}

/**
 * The part of a segment inside a rectangle (Liang-Barsky).
 * @param x0 - Start.
 * @param y0 - Start.
 * @param x1 - End.
 * @param y1 - End.
 * @param rect - The rectangle.
 * @param rect.left - Its left edge.
 * @param rect.top - Its top edge.
 * @param rect.right - Its right edge.
 * @param rect.bottom - Its bottom edge.
 * @returns The range of the segment's parameter inside, or null when it misses.
 */
function clip(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    { left, top, right, bottom }: { left: number; top: number; right: number; bottom: number },
): [number, number] | null {
    const dx = x1 - x0;
    const dy = y1 - y0;
    let t0 = 0;
    let t1 = 1;
    const sides: readonly (readonly [number, number])[] = [
        [-dx, x0 - left],
        [dx, right - x0],
        [-dy, y0 - top],
        [dy, bottom - y0],
    ];
    for (const [p, q] of sides) {
        if (p === 0) {
            if (q < 0) {
                return null;
            }

            continue;
        }

        const t = q / p;
        if (p < 0) {
            t0 = Math.max(t0, t);
        } else {
            t1 = Math.min(t1, t);
        }

        if (t0 > t1) {
            return null;
        }
    }

    return [t0, t1];
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
