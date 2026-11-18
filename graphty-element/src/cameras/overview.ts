/**
 * @file The overview against a live Babylon scene: reads the camera, keeps the last projection
 * while neither the nodes nor the view direction moved, and says once per frame when the overview
 * changed. The arithmetic is in `../camera/overview.ts` (issue #293).
 */

import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import type { Scene } from "@babylonjs/core/scene.js";

import {
    fromFrame,
    type GraphOverview,
    type OverviewOptions,
    type OverviewProjection,
    projectOverview,
    toFrame,
} from "../camera/overview";
import type { ElementPositions } from "../data/positions";

/** What the overview reads from the graph each time. */
export interface OverviewInputs {
    scene: Scene;
    /** The node every node is drawn under; an XR gesture moves and scales it. */
    root: TransformNode | null;
    lane: ElementPositions | undefined;
    /** What the camera looks at, in world units; its depth sets the viewport's size in 3D. */
    target: { x: number; y: number; z: number } | undefined;
}

/** The camera as the overview sees it. */
interface ViewNow {
    /** Graph point to view space. */
    local: Matrix;
    view: Matrix;
    camera: Camera;
}

/**
 * The scene's camera, or null before there is one.
 * @param inputs - The scene and root.
 * @returns The matrices.
 */
function viewNow(inputs: OverviewInputs): ViewNow | null {
    const camera = inputs.scene.activeCamera;
    if (!camera) {
        return null;
    }

    const view = camera.getViewMatrix();
    const local = inputs.root ? inputs.root.getWorldMatrix().multiply(view) : view.clone();
    return { local, view, camera };
}

/**
 * The centre and half size, in view space, of what the camera shows at a depth.
 * @param camera - The camera.
 * @param depth - The depth along the view axis (perspective only).
 * @returns Centre and half extents.
 */
function shown(camera: Camera, depth: number): { cx: number; cy: number; hw: number; hh: number } {
    const engine = camera.getEngine();
    if (camera.mode === Camera.ORTHOGRAPHIC_CAMERA) {
        const halfW = engine.getRenderWidth() / 2;
        const halfH = engine.getRenderHeight() / 2;
        const left = camera.orthoLeft ?? -halfW;
        const right = camera.orthoRight ?? halfW;
        const top = camera.orthoTop ?? halfH;
        const bottom = camera.orthoBottom ?? -halfH;
        return { cx: (left + right) / 2, cy: (top + bottom) / 2, hw: (right - left) / 2, hh: (top - bottom) / 2 };
    }

    const aspect = engine.getAspectRatio(camera);
    const reach = Math.max(0, depth) * Math.tan(camera.fov / 2);
    const vertical = camera.fovMode === Camera.FOVMODE_VERTICAL_FIXED;
    const hh = vertical ? reach : reach / aspect;
    return { cx: 0, cy: 0, hw: vertical ? reach * aspect : reach, hh };
}

/**
 * The 3x3 rotation-and-scale part of a matrix, which is all the projection depends on.
 * @param m - The matrix.
 * @returns Its nine values.
 */
function turn(m: Matrix): number[] {
    const v = m.m;
    return [v[0], v[1], v[2], v[4], v[5], v[6], v[8], v[9], v[10]];
}

/** One graph's overview, kept between reads. */
export class OverviewSource {
    private key: unknown[] = [];
    private projection: OverviewProjection | null = null;

    /**
     * The overview now. Linear in the node count when the nodes or the view direction moved since
     * the last read, constant otherwise (a pan or a zoom only moves the viewport).
     * @param inputs - The graph's scene, root, lane and camera target.
     * @param options - Point limit and grid size.
     * @returns The overview.
     */
    read(inputs: OverviewInputs, options: OverviewOptions = {}): GraphOverview {
        const now = viewNow(inputs);
        const projection = now ? this.project(inputs, now, options) : null;
        if (!now || !projection || projection.frame.placed === 0) {
            return {
                kind: "points",
                points: new Float32Array(0),
                density: null,
                viewport: { x: 0, y: 0, width: 0, height: 0 },
            };
        }

        const { cx, cy, hw, hh } = this.shownAt(inputs, now, projection);
        const { m } = now.local;
        // The viewport centre on the rotation-only axes the points use.
        const corner = toFrame(projection.frame, cx - m[12] - hw, cy - m[13] + hh);
        const { size } = projection.frame;
        return {
            kind: projection.kind,
            points: projection.points.slice(),
            density: projection.density && { size: projection.density.size, counts: projection.density.counts.slice() },
            viewport: { x: corner.x, y: corner.y, width: (2 * hw) / size, height: (2 * hh) / size },
        };
    }

    /**
     * How far to move the camera, in world units, so the view is centred on an overview point.
     * @param inputs - The graph's scene, root, lane and camera target.
     * @param point - The point, in the overview frame.
     * @param point.x - Frame x.
     * @param point.y - Frame y.
     * @returns The world shift, or null when nothing is placed or there is no camera.
     */
    shift(inputs: OverviewInputs, point: { x: number; y: number }): Vector3 | null {
        const now = viewNow(inputs);
        const projection = now ? this.project(inputs, now, {}) : null;
        if (!now || !projection || projection.frame.placed === 0) {
            return null;
        }

        const { cx, cy } = this.shownAt(inputs, now, projection);
        const { m } = now.local;
        const to = fromFrame(projection.frame, point.x, point.y);
        const inView = new Vector3(to.x + m[12] - cx, to.y + m[13] - cy, 0);
        return Vector3.TransformNormal(inView, now.view.clone().invert());
    }

    private project(inputs: OverviewInputs, now: ViewNow, options: OverviewOptions): OverviewProjection | null {
        const { lane } = inputs;
        if (!lane) {
            return null;
        }

        const key = [lane, lane.generation, lane.count, options.maxPoints, options.gridSize, ...turn(now.local)];
        if (this.projection === null || key.some((value, i) => value !== this.key[i])) {
            this.key = key;
            this.projection = projectOverview(lane.view(lane.count), lane.count, now.local.m, options);
        }

        return this.projection;
    }

    private shownAt(
        inputs: OverviewInputs,
        now: ViewNow,
        projection: OverviewProjection,
    ): { cx: number; cy: number; hw: number; hh: number } {
        const { m } = now.local;
        // What the camera looks at, or the middle of the nodes along the view axis.
        let depth = projection.frame.midZ + m[14];
        let at: { x: number; y: number } | null = null;
        if (inputs.target) {
            const target = Vector3.TransformCoordinates(
                new Vector3(inputs.target.x, inputs.target.y, inputs.target.z),
                now.view,
            );
            depth = target.z;
            at = { x: target.x, y: target.y };
        }

        const view = shown(now.camera, depth);
        if (at && now.camera.mode !== Camera.ORTHOGRAPHIC_CAMERA) {
            view.cx = at.x;
            view.cy = at.y;
        }

        return view;
    }
}

/**
 * Call `changed` after any frame that moved the camera, the graph root or a node, at most once a
 * frame. The test is a compare of two matrices and two counters: constant per frame.
 * @param scene - The scene.
 * @param root - The graph root, read each frame.
 * @param lane - The coordinate lane, read each frame.
 * @param changed - Called when the overview changed.
 * @returns A function that stops watching.
 */
export function watchOverview(
    scene: Scene,
    root: () => TransformNode | null,
    lane: () => ElementPositions | undefined,
    changed: () => void,
): () => void {
    const scratch = Matrix.Identity();
    let last: unknown[] = [];
    const observer = scene.onAfterRenderObservable.add(() => {
        const camera = scene.activeCamera;
        if (!camera) {
            return;
        }

        const r = root();
        const transform = camera.getTransformationMatrix();
        if (r) {
            r.getWorldMatrix().multiplyToRef(transform, scratch);
        } else {
            scratch.copyFrom(transform);
        }

        const positions = lane();
        const key = [camera.uniqueId, positions, positions?.generation, positions?.count, ...scratch.m];
        if (key.length !== last.length || key.some((value, i) => value !== last[i])) {
            last = key;
            changed();
        }
    });
    return () => {
        scene.onAfterRenderObservable.remove(observer);
    };
}
