import {
    type AbstractEngine,
    Camera,
    Color4,
    Scalar,
    Scene,
    type TransformNode,
    UniversalCamera,
    Vector3,
} from "@babylonjs/core";

import type { FitBounds, FitInsets } from "../config/GraphBehavior";
import { glideTowards } from "./CameraManager";
import { PivotController } from "./PivotController";

export interface OrbitConfig {
    trackballRotationSpeed: number;
    keyboardRotationSpeed: number;
    /**
     * The fraction of the camera's distance that W or S moves the camera each frame it is held,
     * so a held key zooms by the same factor per frame however far out the camera is.
     */
    keyboardZoomSpeed: number;
    keyboardYawSpeed: number;
    twistYawSensitivity: number;
    minZoomDistance: number;
    maxZoomDistance: number;
    inertiaDamping: number;
}

/**
 * Babylon's own default far plane. The derived far plane never goes below it, so a
 * small graph keeps exactly the picture and the depth precision it had before.
 */
const DEFAULT_FAR_PLANE = 10000;

/** No room kept clear: framing uses the whole canvas. */
const NO_INSETS: FitInsets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

/** The least share of the canvas framing keeps, whatever the insets ask, so a fit stays finite. */
const MIN_FRAMED_SHARE = 0.1;

/**
 * The render pixels per CSS pixel, and the share of each axis the insets leave to frame into.
 * @param engine - The engine.
 * @param insets - The insets, in CSS pixels.
 * @returns The scale, the render size, and the framed width and height shares.
 */
export function framedArea(
    engine: AbstractEngine,
    insets: FitInsets,
): { scale: number; width: number; height: number; shareX: number; shareY: number } {
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const cssWidth = engine.getRenderingCanvas()?.clientWidth ?? 0;
    const scale = cssWidth > 0 ? width / cssWidth : 1;
    const shareX = Math.max(MIN_FRAMED_SHARE, 1 - ((insets.left + insets.right) * scale) / Math.max(width, 1));
    const shareY = Math.max(MIN_FRAMED_SHARE, 1 - ((insets.top + insets.bottom) * scale) / Math.max(height, 1));
    return { scale, width, height, shareX, shareY };
}

/** A point a fit must keep in view, and how far the thing drawn there reaches around it. */
export interface FramingSpot {
    readonly pos: Vector3;
    readonly half: number;
}

/**
 * How far from the center the camera must stand to keep every spot in view at every angle the
 * view turns to about the vertical axis through the center, for `camera.fitBounds` "turning".
 *
 * A spot `r` from that axis and `dy` above the center, seen from a camera `d` away, is drawn
 * highest when it has turned nearest the camera: it fits when `d >= dy / tan(halfFovY) + r`.
 * Sideways it sits at `r sin(a)` and `r cos(a)` nearer, and the worst angle needs
 * `d >= r * sqrt(1 + 1 / tan(halfFovX)^2)`. Spots near the axis, the top and bottom of most
 * graphs, ask for much less than the corners of the box around them would.
 * @param center - The center the view turns about.
 * @param spots - What must stay in view.
 * @param tanX - The tangent of half the horizontal field of view.
 * @param tanY - The tangent of half the vertical field of view.
 * @returns The distance.
 */
export function turningFitDistance(center: Vector3, spots: readonly FramingSpot[], tanX: number, tanY: number): number {
    const sideways = Math.sqrt(1 + 1 / (tanX * tanX));
    let distance = 0;
    for (const { pos, half } of spots) {
        const r = Math.hypot(pos.x - center.x, pos.z - center.z) + half;
        const dy = Math.abs(pos.y - center.y) + half;
        distance = Math.max(distance, dy / tanY + r, r * sideways);
    }

    return distance;
}

/**
 * Controls a 3D orbit camera with pivot-based rotation and distance-based zoom.
 * Provides trackball-style rotation and keyboard/touch controls.
 */
export class OrbitCameraController {
    public scene: Scene;
    public camera: UniversalCamera;
    public cameraDistance: number;
    public config: OrbitConfig;
    /** Room framing leaves clear at each edge, in CSS pixels; see `camera.fitInsets`. */
    public fitInsets: FitInsets = NO_INSETS;
    /** What a fit fits into view; see `camera.fitBounds`. */
    public fitBounds: FitBounds = "box";

    private readonly pivotController: PivotController;

    /** Half the diagonal of the last bounding box fitted by zoomToBoundingBox. */
    #sceneRadius = 0;

    /**
     * Expose pivot TransformNode for compatibility with existing code.
     * This is the underlying pivot from PivotController.
     * @returns The pivot TransformNode used for rotation
     */
    public get pivot(): TransformNode {
        return this.pivotController.pivot;
    }

    /**
     * Creates a new OrbitCameraController instance.
     * @param canvas - The canvas element to attach the camera to
     * @param scene - The Babylon.js scene
     * @param config - Configuration options for the orbit camera
     */
    constructor(canvas: Element, scene: Scene, config: OrbitConfig) {
        this.config = config;

        this.scene = scene;
        this.scene.clearColor = new Color4(0, 0, 0, 1);

        // Use shared PivotController instead of raw TransformNode
        this.pivotController = new PivotController(scene);

        this.cameraDistance = 10;

        this.camera = new UniversalCamera("camera", new Vector3(0, 0, -this.cameraDistance), this.scene);
        this.camera.inputs.clear();
        this.scene.activeCamera = this.camera;
        this.camera.attachControl(canvas, true);

        // Force initial update after camera is properly set up
        this.updateCameraPosition();
    }

    /**
     * Rotate the scene by dx (yaw) and dy (pitch) amounts.
     * Delegates to PivotController for consistent rotation behavior.
     * @param dx - Horizontal rotation delta in pixels
     * @param dy - Vertical rotation delta in pixels
     */
    public rotate(dx: number, dy: number): void {
        // Delegate to PivotController
        // Match XR rotation convention: drag right = rotate right (positive yaw)
        // Pitch follows "drag up = graph moves up" convention (not inverted)
        this.pivotController.rotate(dx * this.config.trackballRotationSpeed, dy * this.config.trackballRotationSpeed);
        this.updateCameraPosition();
    }

    /**
     * Turn the scene about its vertical axis on its own, for `camera.autoRotate`.
     * @param radians - The angle.
     */
    public autoTurn(radians: number): void {
        this.pivotController.rotate(radians, 0);
        this.updateCameraPosition();
    }

    /**
     * Spin the scene around the Z-axis (roll).
     * Delegates to PivotController for consistent rotation behavior.
     * @param dz - Rotation delta around Z-axis in radians
     */
    public spin(dz: number): void {
        this.pivotController.spin(dz);
        this.updateCameraPosition();
    }

    /**
     * Zoom by adjusting camera distance.
     * Note: This uses camera-distance based zoom (not scale-based like XR).
     * This feels more natural for desktop interaction.
     * @param delta - Distance delta to adjust camera by
     */
    public zoom(delta: number): void {
        // The configured ceiling suits a small graph. A fitted large graph already sits
        // beyond it, so the ceiling follows the graph and a reader can still pull back.
        const ceiling = Math.max(this.config.maxZoomDistance, this.cameraDistance + this.#sceneRadius * 2);
        this.cameraDistance = Scalar.Clamp(this.cameraDistance + delta, this.config.minZoomDistance, ceiling);
    }

    /**
     * Zoom by a factor of the current distance, within the same limits as `zoom`.
     * @param factor - The distance multiplier (< 1 zooms in, > 1 zooms out)
     */
    public zoomBy(factor: number): void {
        this.zoom(this.cameraDistance * (factor - 1));
    }

    /**
     * The distance rule every programmatic writer of `cameraDistance` follows: floored at
     * `minZoomDistance`, never capped. The ceiling is a zoom-out limit for a reader, not a
     * framing limit -- a saved state for a large graph can sit beyond it, and `zoom` accepts that
     * -- while a distance under the floor would make the next zoom IN jump the camera outwards.
     * @param distance - The distance asked for.
     * @returns The distance to use.
     */
    public clampDistance(distance: number): number {
        return Math.max(distance, this.config.minZoomDistance);
    }

    /**
     * Glide the pivot to a point, turning about that point meanwhile, so the camera ends up
     * looking at it and orbits, spins and zooms about it.
     * @param point - The point, in world space.
     * @returns Whether the pivot moved.
     */
    public followPoint(point: Vector3): boolean {
        this.pivotController.center = point;
        const moved = glideTowards(this.pivot.position, point);
        this.updateCameraPosition();
        return moved;
    }

    /**
     * Update camera position relative to the pivot.
     * Parents camera to pivot and positions at negative Z distance.
     */
    public updateCameraPosition(): void {
        // Parent the camera to the pivot for proper transformation
        this.camera.parent = this.pivot;

        // Set local position relative to pivot, moved sideways by the fit insets: looking
        // straight ahead from beside the pivot puts the pivot off the canvas center, at the
        // center of the area the insets leave, at every distance and every turn.
        const { x, y } = this.insetShift();
        this.camera.position.set(x, y, -this.cameraDistance);

        // Reset camera rotation - when parented, the camera inherits the pivot's rotation
        this.camera.rotation.set(0, 0, 0);

        // Every writer of cameraDistance passes through here, so this is the one place the
        // far plane has to follow the graph. A layout that settles tens of thousands of units
        // across would otherwise be clipped away by Babylon's default 10000.
        this.camera.maxZ = Math.max(DEFAULT_FAR_PLANE, this.cameraDistance + this.#sceneRadius * 2);
    }

    /**
     * How far beside the pivot the camera stands, in the pivot's own units, so the pivot is drawn
     * at the center of the area the fit insets leave rather than at the canvas center.
     * @returns The sideways and upward offsets; both 0 with no insets.
     */
    private insetShift(): { x: number; y: number } {
        const { left, right, top, bottom } = this.fitInsets;
        if (left === right && top === bottom) {
            return { x: 0, y: 0 };
        }

        const engine = this.scene.getEngine();
        const { scale, height } = framedArea(engine, this.fitInsets);
        const fov = this.camera.fov || 0.8;
        // World units per render pixel at the pivot's depth.
        const perPixel = (2 * this.cameraDistance * Math.tan(fov / 2)) / Math.max(height, 1);
        return {
            x: -((left - right) / 2) * scale * perPixel,
            y: ((top - bottom) / 2) * scale * perPixel,
        };
    }

    /**
     * Zoom the camera to fit a bounding box in view.
     * Positions the pivot at the center and adjusts camera distance.
     * @param min - The minimum corner of the bounding box
     * @param max - The maximum corner of the bounding box
     * @param spots - What the box holds; with `fitBounds` "turning", what is fitted.
     */
    public zoomToBoundingBox(min: Vector3, max: Vector3, spots?: readonly FramingSpot[]): void {
        const center = min.add(max).scale(0.5);
        const size = max.subtract(min);
        const turning = this.fitBounds === "turning" && spots !== undefined && spots.length > 0;

        this.#sceneRadius = size.length() / 2;

        // Position pivot at center of bounding box
        this.pivot.position.copyFrom(center);
        this.pivot.computeWorldMatrix(true);

        // Get canvas dimensions
        const engine = this.scene.getEngine();
        engine.resize(); // Ensure we have current dimensions
        const canvasWidth = engine.getRenderWidth();
        const canvasHeight = engine.getRenderHeight();
        const aspectRatio = canvasWidth / canvasHeight;

        // Get camera FOV (vertical)
        let verticalFov = 0.8; // default ~45.8 degrees
        if (this.camera.fovMode === Camera.FOVMODE_VERTICAL_FIXED) {
            verticalFov = this.camera.fov;
        } else if (this.camera.fovMode === Camera.FOVMODE_HORIZONTAL_FIXED && this.camera.fov) {
            // Convert horizontal to vertical
            verticalFov = 2 * Math.atan(Math.tan(this.camera.fov / 2) / aspectRatio);
        }

        // Calculate horizontal FOV from vertical FOV and aspect ratio, each narrowed to the share
        // of the canvas the fit insets leave.
        const { shareX, shareY } = framedArea(engine, this.fitInsets);
        const halfFovY = Math.atan(Math.tan(verticalFov / 2) * shareY);
        const halfFovX = Math.atan(Math.tan(verticalFov / 2) * aspectRatio * shareX);

        // For 3D scenes, we need to account for perspective projection.
        // Objects at different Z depths will project differently on screen.
        // The camera is positioned at (0, 0, -distance) relative to pivot,
        // so objects closer to the camera (negative Z relative to center) appear larger.
        //
        // To properly fit all 8 corners of the bounding box, we need to find
        // the minimum distance that ensures all corners project within the viewport.
        //
        // For a point at (x, y, z) relative to center, when viewed from distance d:
        // - The point is at depth (d - z) from the camera
        // - It projects to screen_x = x * focal / (d - z)
        // - It projects to screen_y = y * focal / (d - z)
        //
        // To fit within FOV: |screen_x| < tan(fovX/2) * (d - z), etc.
        // Rearranging: d > z + |x| / tan(fovX/2)  and  d > z + |y| / tan(fovY/2)

        const halfWidth = size.x / 2;
        const halfHeight = size.y / 2;
        const halfDepth = size.z / 2;

        // Check all 8 corners of the bounding box
        // Each corner has coordinates relative to center: (±halfWidth, ±halfHeight, ±halfDepth)
        // We need to find the minimum distance that fits all corners
        let maxRequiredDistance = 0;

        if (turning) {
            maxRequiredDistance = turningFitDistance(center, spots, Math.tan(halfFovX), Math.tan(halfFovY));
        }

        for (const sx of turning ? [] : [-1, 1]) {
            for (const sy of [-1, 1]) {
                for (const sz of [-1, 1]) {
                    const x = sx * halfWidth;
                    const y = sy * halfHeight;
                    const z = sz * halfDepth;

                    // Distance needed to fit this corner horizontally
                    // d > z + |x| / tan(fovX/2)
                    const distanceForX = z + Math.abs(x) / Math.tan(halfFovX);

                    // Distance needed to fit this corner vertically
                    // d > z + |y| / tan(fovY/2)
                    const distanceForY = z + Math.abs(y) / Math.tan(halfFovY);

                    maxRequiredDistance = Math.max(maxRequiredDistance, distanceForX, distanceForY);
                }
            }
        }

        // Apply a reasonable padding factor
        // Since we already include labels in the bounding box, we only need
        // a small padding for visual comfort and edge arrows
        // The turning fit is already met only at the worst angle, so it gets no more room.
        const PADDING_PERCENT = turning ? 0 : 5;
        const targetDistance = maxRequiredDistance * (1 + PADDING_PERCENT / 100);

        // Only the floor applies: a fit that the configured ceiling cut short would put the
        // camera inside the graph. The ceiling stays a zoom-out limit, not a framing limit.
        this.cameraDistance = this.clampDistance(targetDistance);

        // Apply the new camera position immediately
        this.updateCameraPosition();
    }
}
