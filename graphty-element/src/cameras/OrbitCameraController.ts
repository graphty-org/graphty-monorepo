import { Camera, Color4, Scalar, Scene, type TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";

import { type FreeArea, freeArea } from "../camera/insets";
import type { ViewInsets } from "../camera/types";
import { PivotController } from "./PivotController";

export interface OrbitConfig {
    trackballRotationSpeed: number;
    keyboardRotationSpeed: number;
    keyboardZoomSpeed: number;
    keyboardYawSpeed: number;
    pinchZoomSensitivity: number;
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

/**
 * Controls a 3D orbit camera with pivot-based rotation and distance-based zoom.
 * Provides trackball-style rotation and keyboard/touch controls.
 */
export class OrbitCameraController {
    public scene: Scene;
    public camera: UniversalCamera;
    public cameraDistance: number;
    public config: OrbitConfig;

    private pivotController: PivotController;

    /**
     * Margins of the canvas something else covers, in CSS pixels. Every fit keeps the graph out
     * of them, and the camera is shifted sideways so the pivot sits at the center of what is
     * left -- a lens shift, so the graph still turns about its own center.
     */
    public viewInsets: ViewInsets = {};

    /** Half the diagonal of the last bounding box fitted by zoomToBoundingBox. */
    #sceneRadius = 0;

    readonly #canvas: Element;

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
        this.#canvas = canvas;

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
     * Update camera position relative to the pivot.
     * Parents camera to pivot and positions at negative Z distance.
     */
    public updateCameraPosition(): void {
        // Parent the camera to the pivot for proper transformation
        this.camera.parent = this.pivot;

        // Set local position relative to pivot, shifted sideways so the pivot lands at the
        // center of the part of the canvas the view insets leave free. The shift is a share of
        // the distance, so the pivot stays at that point on screen as the reader zooms.
        const { tanX, tanY } = this.#halfFovTangents();
        const free = this.#freeArea();
        this.camera.position.set(
            -free.x * tanX * this.cameraDistance,
            -free.y * tanY * this.cameraDistance,
            -this.cameraDistance,
        );

        // Reset camera rotation - when parented, the camera inherits the pivot's rotation
        this.camera.rotation.set(0, 0, 0);

        // Every writer of cameraDistance passes through here, so this is the one place the
        // far plane has to follow the graph. A layout that settles tens of thousands of units
        // across would otherwise be clipped away by Babylon's default 10000.
        this.camera.maxZ = Math.max(DEFAULT_FAR_PLANE, this.cameraDistance + this.#sceneRadius * 2);
    }

    /**
     * Called when the canvas resizes: the shift that centers the free area depends on its aspect.
     */
    public onResize(): void {
        this.updateCameraPosition();
    }

    /**
     * The part of the canvas the view insets leave free.
     * @returns The free area in normalized device coordinates.
     */
    #freeArea(): FreeArea {
        const { clientWidth, clientHeight } = this.#canvas;
        return freeArea(this.viewInsets, clientWidth, clientHeight);
    }

    /**
     * The tangents of half the horizontal and the vertical field of view.
     * @returns Both tangents.
     */
    #halfFovTangents(): { tanX: number; tanY: number } {
        const engine = this.scene.getEngine();
        const aspectRatio = engine.getRenderWidth() / engine.getRenderHeight() || 1;

        let verticalFov = 0.8; // default ~45.8 degrees
        if (this.camera.fovMode === Camera.FOVMODE_VERTICAL_FIXED) {
            verticalFov = this.camera.fov;
        } else if (this.camera.fovMode === Camera.FOVMODE_HORIZONTAL_FIXED && this.camera.fov) {
            // Convert horizontal to vertical
            verticalFov = 2 * Math.atan(Math.tan(this.camera.fov / 2) / aspectRatio);
        }

        const tanY = Math.tan(verticalFov / 2);
        return { tanX: tanY * aspectRatio, tanY };
    }

    /**
     * Zoom the camera to fit a bounding box in view.
     * Positions the pivot at the center and adjusts camera distance.
     * @param min - The minimum corner of the bounding box
     * @param max - The maximum corner of the bounding box
     */
    public zoomToBoundingBox(min: Vector3, max: Vector3): void {
        const center = min.add(max).scale(0.5);
        const size = max.subtract(min);

        this.#sceneRadius = size.length() / 2;

        // Position pivot at center of bounding box
        this.pivot.position.copyFrom(center);
        this.pivot.computeWorldMatrix(true);

        const engine = this.scene.getEngine();
        engine.resize(); // Ensure we have current dimensions
        const { tanX, tanY } = this.#halfFovTangents();
        const free = this.#freeArea();

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
        //
        // With view insets the box must fit the free area instead: half as wide as the free share
        // (`free.width` in NDC) and centered on it. The camera is shifted so the center lands
        // there, and a corner at depth z then sits (x / tanX - free.x * z) / (d + z) from that
        // center, so d >= |x / tanX - free.x * z| / free.width - z. No insets gives the old rule.

        const halfWidth = size.x / 2;
        const halfHeight = size.y / 2;
        const halfDepth = size.z / 2;

        let maxRequiredDistance = 0;

        for (const sx of [-1, 1]) {
            for (const sy of [-1, 1]) {
                for (const sz of [-1, 1]) {
                    const x = sx * halfWidth;
                    const y = sy * halfHeight;
                    const z = sz * halfDepth;

                    const distanceForX = Math.abs(x / tanX - free.x * z) / free.width - z;
                    const distanceForY = Math.abs(y / tanY - free.y * z) / free.height - z;

                    maxRequiredDistance = Math.max(maxRequiredDistance, distanceForX, distanceForY);
                }
            }
        }

        // Apply a reasonable padding factor
        // Since we already include labels in the bounding box, we only need
        // a small padding for visual comfort and edge arrows
        const PADDING_PERCENT = 5; // 5% padding
        const targetDistance = maxRequiredDistance * (1 + PADDING_PERCENT / 100);

        // Only the floor applies: a fit that the configured ceiling cut short would put the
        // camera inside the graph. The ceiling stays a zoom-out limit, not a framing limit.
        this.cameraDistance = this.clampDistance(targetDistance);

        // Apply the new camera position immediately
        this.updateCameraPosition();
    }
}
