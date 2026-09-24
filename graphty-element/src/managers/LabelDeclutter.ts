import { Axis, Matrix, type Observer, type Scene, Vector3 } from "@babylonjs/core";

import type { Node } from "../Node";
import type { DataManager } from "./DataManager";

/** A label's rectangle on screen, in pixels. */
interface ScreenRect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/**
 * Hides node labels that would be drawn on top of each other.
 *
 * Every node label is its own billboarded plane, so two labelled nodes that land near each other
 * on screen draw their words over one another. Before every frame this pass projects each drawn
 * label to a screen rectangle, orders the labels by priority -- a selected node first, then the
 * node with more edges, then the node id so the answer is stable from frame to frame -- and keeps
 * a label only if its rectangle meets no label already kept.
 *
 * A label that loses is hidden with `isVisible`, never with `setEnabled` and never through a
 * style. `setEnabled` is the visibility mask's switch (`Node.applyRenderState`), and a style is
 * the reader's answer to what a node looks like; this is a placement decision about one frame,
 * so it has its own switch and is taken again on the next frame.
 *
 * ONE PER SCENE, created by the first node that draws a label, and kept on `scene.metadata`
 * the way `NodeEffects` keeps the glow layer.
 */
export class LabelDeclutter {
    private readonly observer: Observer<Scene>;
    /** Nodes that have drawn a label. A node whose label is gone leaves on the next pass. */
    private readonly labelled = new Set<Node>();
    private degrees = new Map<string | number, number>();
    private degreesForEdgeVersion = -1;

    private constructor(
        private readonly scene: Scene,
        private readonly dataManager: DataManager,
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
     * @param dataManager - Where the edges are, for the degree order.
     * @param node - The node drawing a label.
     */
    static track(scene: Scene, dataManager: DataManager, node: Node): void {
        scene.metadata = scene.metadata ?? {};
        if (!(scene.metadata.labelDeclutter instanceof LabelDeclutter)) {
            scene.metadata.labelDeclutter = new LabelDeclutter(scene, dataManager);
        }

        (scene.metadata.labelDeclutter as LabelDeclutter).labelled.add(node);
    }

    /** Stop running before frames. */
    dispose(): void {
        this.scene.onBeforeRenderObservable.remove(this.observer);
        if (this.scene.metadata?.labelDeclutter === this) {
            this.scene.metadata.labelDeclutter = undefined;
        }
    }

    /** One pass: decide which labels are drawn this frame. */
    run(): void {
        const camera = this.scene.activeCamera;
        if (!camera) {
            return;
        }

        const candidates: { node: Node; rect: ScreenRect }[] = [];
        const engine = this.scene.getEngine();
        const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
        const transform = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
        const right = camera.getDirection(Axis.X);
        const up = camera.getDirection(Axis.Y);

        for (const node of this.labelled) {
            const mesh = node.label?.labelMesh;
            if (!mesh || mesh.isDisposed()) {
                // The label, or the node, is gone. A new label adds the node back.
                this.labelled.delete(node);
                continue;
            }

            if (!mesh.isEnabled()) {
                continue;
            }

            // getAbsolutePosition recomputes the world matrix, so a label built this frame is
            // measured where it will be drawn.
            const centre = mesh.getAbsolutePosition();

            // A label behind the camera projects to a mirrored point on screen, and one outside
            // the view is not drawn at all; neither may hide a label the reader can see. This
            // matters whenever the camera is among the nodes: zoomed in, flying through, in XR.
            // The world matrix computed above also refreshed the bounds this test reads.
            if (!camera.isInFrustum(mesh, true)) {
                continue;
            }

            const extent = mesh.getBoundingInfo().boundingBox.extendSize;
            const scale = mesh.absoluteScaling;
            const corner = centre
                .add(right.scale(extent.x * Math.abs(scale.x)))
                .add(up.scale(extent.y * Math.abs(scale.y)));
            const c = Vector3.Project(centre, Matrix.IdentityReadOnly, transform, viewport);
            const k = Vector3.Project(corner, Matrix.IdentityReadOnly, transform, viewport);
            const halfWidth = Math.abs(k.x - c.x);
            const halfHeight = Math.abs(k.y - c.y);

            candidates.push({
                node,
                rect: { left: c.x - halfWidth, right: c.x + halfWidth, top: c.y - halfHeight, bottom: c.y + halfHeight },
            });
        }

        if (candidates.length === 0) {
            return;
        }

        const degrees = this.nodeDegrees();
        candidates.sort((a, b) => {
            const selected = Number(b.node.isSelected()) - Number(a.node.isSelected());
            if (selected !== 0) {
                return selected;
            }

            const degree = (degrees.get(b.node.id) ?? 0) - (degrees.get(a.node.id) ?? 0);
            if (degree !== 0) {
                return degree;
            }

            return String(a.node.id) < String(b.node.id) ? -1 : 1;
        });

        // ponytail: every candidate is tested against every kept label, O(labels x kept). A
        // screen grid makes it linear if a graph ever labels thousands of nodes at once.
        const kept: ScreenRect[] = [];
        for (const { node, rect } of candidates) {
            const clear = !kept.some(
                (other) =>
                    rect.left < other.right &&
                    rect.right > other.left &&
                    rect.top < other.bottom &&
                    rect.bottom > other.top,
            );
            if (clear) {
                kept.push(rect);
            }

            const mesh = node.label?.labelMesh;
            if (mesh) {
                mesh.isVisible = clear;
            }
        }
    }

    /**
     * How many edges each node has, counted again only when an edge is added or removed.
     * @returns Edge count by node id.
     */
    private nodeDegrees(): Map<string | number, number> {
        const { edges, edgeVersion } = this.dataManager;
        if (edgeVersion === this.degreesForEdgeVersion) {
            return this.degrees;
        }

        const degrees = new Map<string | number, number>();
        for (const edge of edges.values()) {
            degrees.set(edge.srcId, (degrees.get(edge.srcId) ?? 0) + 1);
            degrees.set(edge.dstId, (degrees.get(edge.dstId) ?? 0) + 1);
        }

        this.degrees = degrees;
        this.degreesForEdgeVersion = edgeVersion;

        return degrees;
    }
}
