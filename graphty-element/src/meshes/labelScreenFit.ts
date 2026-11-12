import { Axis, type Camera, Matrix, type Mesh, type Scene, type TransformNode, Vector3 } from "@babylonjs/core";

import { FrameRoster } from "./FrameRoster";

/** Where a label hangs relative to what it is attached to. */
export type LabelPlacement =
    "top" | "bottom" | "left" | "right" | "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** A box in the label's parent's own coordinates, and the depth the label sits at. */
export interface PlacementBounds {
    min: Vector3;
    max: Vector3;
    z: number;
}

/**
 * Where a label's centre goes so that its plane sits beside a box.
 * @param bounds - The box it hangs from, in the parent's coordinates.
 * @param placement - Which side.
 * @param offset - The gap between the box and the plane.
 * @param width - The plane's width, in the parent's coordinates.
 * @param height - The plane's height, in the parent's coordinates.
 * @param out - Where to write the centre.
 * @returns `out`.
 */
export function placeBeside(
    bounds: PlacementBounds,
    placement: LabelPlacement,
    offset: number,
    width: number,
    height: number,
    out: Vector3 = new Vector3(),
): Vector3 {
    const { min, max } = bounds;
    const left = min.x - width / 2 - offset;
    const right = max.x + width / 2 + offset;
    const above = max.y + height / 2 + offset;
    const below = min.y - height / 2 - offset;
    const midX = (min.x + max.x) / 2;
    const midY = (min.y + max.y) / 2;
    let x = midX;
    if (placement.endsWith("left")) {
        x = left;
    } else if (placement.endsWith("right")) {
        x = right;
    }

    let y = midY;
    if (placement.startsWith("top")) {
        y = above;
    } else if (placement.startsWith("bottom")) {
        y = below;
    }

    return out.copyFromFloats(x, y, bounds.z);
}

/**
 * The same placement on the other side of the axis that overflowed.
 * @param placement - The placement.
 * @param acrossX - Swap left and right.
 * @param acrossY - Swap top and bottom.
 * @returns The mirrored placement.
 */
export function mirrored(placement: LabelPlacement, acrossX: boolean, acrossY: boolean): LabelPlacement {
    let out: string = placement;
    if (acrossX) {
        out = out.replace(/left|right/, (side) => (side === "left" ? "right" : "left"));
    }

    if (acrossY) {
        out = out.replace(/top|bottom/, (side) => (side === "top" ? "bottom" : "top"));
    }

    return out as LabelPlacement;
}

/** What one label tells the per-frame fit about itself. Read every frame, so it may change. */
export interface ScreenFitLabel {
    /** The label's plane. */
    readonly mesh: Mesh;
    /** The plane's size in its own coordinates, before any scaling. */
    readonly planeWidth: number;
    readonly planeHeight: number;
    /** How tall the whole plane should be on screen, in CSS pixels; undefined keeps its world size. */
    readonly screenHeight: number | undefined;
    /** Whether the plane is kept inside the canvas. */
    readonly keepInView: boolean;
    /** What the plane hangs beside, and how. */
    readonly bounds: PlacementBounds;
    readonly placement: LabelPlacement;
    readonly offset: number;
}

/** The labels of each scene that are sized for the screen or kept in view; see {@link FrameRoster}. */
export const screenFitFrames = new FrameRoster();

/**
 * Size and place one label every frame: `sizeMode: "screen"` and `keepInView`.
 *
 * A label that asks for neither never joins, so it costs a frame nothing.
 * @param scene - The scene whose frames drive it.
 * @param label - The label.
 * @returns Stops it.
 */
export function fitToScreen(scene: Scene, label: ScreenFitLabel): () => void {
    const fit = new Fit();
    return screenFitFrames.join(scene, () => {
        fit.run(scene, label);
    });
}

/** Scratch space for one label's fit, kept so a frame allocates nothing. */
class Fit {
    private readonly viewProjection = new Matrix();
    private readonly inverseParent = new Matrix();
    private readonly identity = Matrix.Identity();
    private readonly local = new Vector3();
    private readonly world = new Vector3();
    private readonly onScreen = new Vector3();
    private readonly right = new Vector3();
    private readonly up = new Vector3();
    private readonly shift = new Vector3();

    /** CSS pixels of the camera's view, set at the start of each run. */
    private width = 0;
    private height = 0;
    /** The projection's vertical scale: 1 / tan(fov / 2), or 2 / (top - bottom) for 2D. */
    private yScale = 1;

    run(scene: Scene, label: ScreenFitLabel): void {
        const camera = scene.activeCamera;
        const canvas = scene.getEngine().getRenderingCanvas();
        const { mesh } = label;
        if (!camera || !canvas || mesh.isDisposed()) {
            return;
        }

        this.width = canvas.clientWidth * camera.viewport.width;
        this.height = canvas.clientHeight * camera.viewport.height;
        if (this.width <= 0 || this.height <= 0) {
            return;
        }

        const projection = camera.getProjectionMatrix();
        camera.getViewMatrix().multiplyToRef(projection, this.viewProjection);
        this.yScale = projection.m[5];

        const parent = mesh.parent as TransformNode | null;
        const parentWorld = parent ? parent.computeWorldMatrix() : this.identity;
        const parentScaleX = parent ? Math.abs(parent.absoluteScaling.x) : 1;
        const parentScaleY = parent ? Math.abs(parent.absoluteScaling.y) : 1;

        let scale = 1;
        if (label.screenHeight !== undefined) {
            const fitted = this.fitScale(label, label.screenHeight, parentWorld, parentScaleY);
            if (fitted === undefined) {
                return;
            }

            scale = fitted;
            mesh.scaling.setAll(scale);
        }

        this.place(label, label.placement, scale, parentWorld);

        if (label.keepInView) {
            this.keepInView(camera, label, scale, parentWorld, parentScaleX, parentScaleY);
        }

        mesh.position.copyFrom(this.local);
    }

    /**
     * SCALE: twice, because how large a pixel is depends on how far away the label is, and
     * where the label is depends on how large it is. The second pass is measured where the
     * first one put it, which is where it is drawn.
     * @param label - The label.
     * @param screenHeight - The CSS pixels tall it is to be.
     * @param parentWorld - The parent's world matrix.
     * @param parentScaleY - The parent's vertical world scaling.
     * @returns The plane's scaling, or undefined when the camera gives no pixel size there.
     */
    private fitScale(
        label: ScreenFitLabel,
        screenHeight: number,
        parentWorld: Matrix,
        parentScaleY: number,
    ): number | undefined {
        let scale = 1;
        for (let pass = 0; pass < 2; pass++) {
            this.place(label, label.placement, scale, parentWorld);
            const perPixel = this.worldPerPixel(this.world);
            if (perPixel <= 0) {
                return undefined;
            }

            scale = (screenHeight * perPixel) / (label.planeHeight * parentScaleY);
        }

        return scale;
    }

    /**
     * Keep a placed label on screen: mirror it to the other side of what it hangs from, and if
     * it is still out, move it in along the screen's own axes by what is out.
     * @param camera - The active camera.
     * @param label - The label.
     * @param scale - The plane's scaling.
     * @param parentWorld - The parent's world matrix.
     * @param parentScaleX - The parent's horizontal world scaling.
     * @param parentScaleY - The parent's vertical world scaling.
     */
    private keepInView(
        camera: Camera,
        label: ScreenFitLabel,
        scale: number,
        parentWorld: Matrix,
        parentScaleX: number,
        parentScaleY: number,
    ): void {
        const widthWorld = label.planeWidth * scale * parentScaleX;
        const heightWorld = label.planeHeight * scale * parentScaleY;
        let over = this.overflow(widthWorld, heightWorld);
        if (over !== null && (over.x !== 0 || over.y !== 0)) {
            const placement = mirrored(label.placement, over.x !== 0, over.y !== 0);
            this.place(label, placement, scale, parentWorld);
            over = this.overflow(widthWorld, heightWorld);
        }

        if (over !== null && (over.x !== 0 || over.y !== 0)) {
            camera.getDirectionToRef(Axis.X, this.right);
            camera.getDirectionToRef(Axis.Y, this.up);
            this.right.scaleToRef(over.x * over.perPixel, this.shift);
            this.up.scaleAndAddToRef(-over.y * over.perPixel, this.shift);
            parentWorld.invertToRef(this.inverseParent);
            Vector3.TransformNormalToRef(this.shift, this.inverseParent, this.shift);
            this.local.addInPlace(this.shift);
        }
    }

    /**
     * Put the label's centre in `local` (the parent's coordinates) and `world`.
     * @param label - The label.
     * @param placement - Which side of what it hangs from.
     * @param scale - The plane's scaling.
     * @param parentWorld - The parent's world matrix.
     */
    private place(label: ScreenFitLabel, placement: LabelPlacement, scale: number, parentWorld: Matrix): void {
        placeBeside(
            label.bounds,
            placement,
            label.offset,
            label.planeWidth * scale,
            label.planeHeight * scale,
            this.local,
        );
        Vector3.TransformCoordinatesToRef(this.local, parentWorld, this.world);
    }

    /**
     * How many world units one CSS pixel spans, on a plane facing the camera through a point.
     * @param world - The point.
     * @returns The size, or 0 for a point behind the camera.
     */
    private worldPerPixel(world: Vector3): number {
        const { m } = this.viewProjection;
        // The clip-space w: the depth in front of a perspective camera, 1 for an orthographic one.
        const w = world.x * m[3] + world.y * m[7] + world.z * m[11] + m[15];
        return w > 0 ? (2 * w) / (this.yScale * this.height) : 0;
    }

    /**
     * How far the plane centred on `world` reaches past each edge of the view, in CSS pixels.
     * @param widthWorld - The plane's width in world units.
     * @param heightWorld - Its height.
     * @returns The amount to move it right (x) and down (y) to bring it in, or null when it is behind the camera.
     */
    private overflow(widthWorld: number, heightWorld: number): { x: number; y: number; perPixel: number } | null {
        const perPixel = this.worldPerPixel(this.world);
        if (perPixel <= 0) {
            return null;
        }

        Vector3.TransformCoordinatesToRef(this.world, this.viewProjection, this.onScreen);
        const cx = ((this.onScreen.x + 1) / 2) * this.width;
        const cy = ((1 - this.onScreen.y) / 2) * this.height;
        const halfW = widthWorld / perPixel / 2;
        const halfH = heightWorld / perPixel / 2;
        return {
            x: inside(cx - halfW, cx + halfW, this.width),
            y: inside(cy - halfH, cy + halfH, this.height),
            perPixel,
        };
    }
}

/**
 * How far to move a span to bring it inside [0, size]; a span too large keeps its start in view.
 * @param start - Where it starts.
 * @param end - Where it ends.
 * @param size - The room there is.
 * @returns The move.
 */
function inside(start: number, end: number, size: number): number {
    if (start < 0) {
        return -start;
    }

    if (end > size) {
        return Math.max(size - end, -start);
    }

    return 0;
}
