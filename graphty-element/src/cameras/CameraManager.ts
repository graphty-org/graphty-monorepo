// CameraManager.ts
import { Camera, Scene, Vector3 } from "@babylonjs/core";

import type { ViewInsets } from "../camera/types";
import type { FitBounds, FitInsets } from "../config/GraphBehavior";
import type { FramingSpot } from "./OrbitCameraController";
import type { XRPivotCameraController } from "./XRPivotCameraController";

/** The share of the way to its target a gliding pivot covers each frame: most of it in 20 frames. */
const GLIDE = 0.2;

/**
 * Move a point a share of the way to a target, and onto it once it is within a thousandth of a
 * unit, so a pivot that has arrived stops changing and a frame drawn on demand can rest.
 * @param from - The point, moved in place.
 * @param to - The target.
 * @param frames - How many nominal 60 Hz frames this pass stands for, so the glide takes the same
 *   time however slowly frames are drawn; 1 by default.
 * @returns Whether the point moved.
 */
export function glideTowards(from: Vector3, to: Vector3, frames = 1): boolean {
    if (from.equals(to)) {
        return false;
    }

    if (Vector3.DistanceSquared(from, to) < 1e-6) {
        from.copyFrom(to);
    } else {
        Vector3.LerpToRef(from, to, 1 - (1 - GLIDE) ** Math.max(1, frames), from);
    }

    return true;
}

export interface CameraController {
    camera: Camera;
    zoomToBoundingBox(min: Vector3, max: Vector3, spots?: readonly FramingSpot[]): void;
    /** Margins of the canvas something else covers, in CSS pixels, that every fit keeps clear. */
    viewInsets?: ViewInsets;
    /**
     * Called when the canvas resizes. Allows camera controllers to update
     * their projection to match the new aspect ratio.
     */
    onResize?(): void;
    /** Take new insets without moving what is drawn; absent, the insets are assigned. */
    setViewInsets?(insets: ViewInsets): void;
    /** Told each time the reader's own input moves this camera; set by {@link CameraManager}. */
    onReaderMove?: () => void;
    /**
     * Called each frame with the point the camera should pivot on, while there is one: the
     * controller glides its pivot there.
     */
    followPoint?(point: Vector3, frames?: number): boolean;
    /** Room framing leaves clear at each edge, in CSS pixels; see `camera.fitInsets`. */
    fitInsets?: FitInsets;
    /** What a 3D fit fits into view; see `camera.fitBounds`. */
    fitBounds?: FitBounds;
    /** Turn the view on its own by an angle, for `camera.autoRotate`; a camera that never turns has none. */
    autoTurn?(radians: number): void;
}

interface InputHandler {
    enable(): void;
    disable(): void;
    update(): void;
    /** Whether the wheel zooms toward the point under the pointer; absent, the input has no wheel. */
    zoomToPointer?: boolean;
    /** Whether the reader is moving the camera, or the input is switched off for a node drag. */
    readonly busy?: boolean;
}

export type CameraKey = "orbit" | "2d" | "xr";

/**
 * The camera each drawing view mode is drawn through. The immersive modes have none here: their
 * camera belongs to the XR session.
 * @param viewMode - The view mode.
 * @returns The camera key, or undefined for a mode with no camera of its own.
 */
export function cameraForViewMode(viewMode: string): CameraKey | undefined {
    if (viewMode === "2d") {
        return "2d";
    }

    return viewMode === "3d" ? "orbit" : undefined;
}

/**
 * Manages multiple camera controllers and their input handlers.
 * Provides functionality to register, activate, and switch between different camera types.
 */
export class CameraManager {
    private readonly scene: Scene;
    private activeCameraController: CameraController | null = null;
    private activeInputHandler: InputHandler | null = null;
    private readonly controllers = new Map<CameraKey, CameraController>();
    private readonly inputs = new Map<CameraKey, InputHandler>();

    /** Told each time the reader's own input -- a wheel, a drag, a pinch, a key -- moves a camera. */
    public onReaderMove: (() => void) | null = null;

    /**
     * Creates a new CameraManager instance.
     * @param scene - The Babylon.js scene to manage cameras for
     */
    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Registers a camera controller and its associated input handler.
     * @param key - The unique identifier for this camera type
     * @param controller - The camera controller instance to register
     * @param inputHandler - The input handler instance to register
     */
    public registerCamera(key: CameraKey, controller: CameraController, inputHandler: InputHandler): void {
        this.controllers.set(key, controller);
        this.inputs.set(key, inputHandler);
        controller.onReaderMove = () => {
            this.onReaderMove?.();
        };
    }

    /**
     * Activates a registered camera and its input handler.
     * Deactivates the currently active camera if any.
     * @param key - The identifier of the camera to activate
     */
    public activateCamera(key: CameraKey): void {
        const controller = this.controllers.get(key);
        const inputHandler = this.inputs.get(key);

        if (!controller || !inputHandler) {
            console.warn(`Camera or input for key '${key}' not registered.`);
            return;
        }

        // Detach previous inputs & camera
        this.activeInputHandler?.disable();
        this.activeCameraController?.camera.detachControl();

        // Activate new camera & inputs
        this.scene.activeCamera = controller.camera;
        controller.camera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
        inputHandler.enable();

        this.activeCameraController = controller;
        this.activeInputHandler = inputHandler;
    }

    /**
     * Zooms the active camera to fit a bounding box in view.
     * @param min - The minimum corner of the bounding box
     * @param max - The maximum corner of the bounding box
     * @param spots - What the box holds, for a fit that frames the nodes rather than the box.
     */
    public zoomToBoundingBox(min: Vector3, max: Vector3, spots?: readonly FramingSpot[]): void {
        if (this.activeCameraController) {
            this.activeCameraController.zoomToBoundingBox(min, max, spots);
        }
    }

    /**
     * Give every camera the margins of the canvas something else covers. Each fit from now on
     * keeps the graph out of them; nothing drawn moves until then.
     * @param insets - CSS pixels per side.
     */
    public setViewInsets(insets: ViewInsets): void {
        for (const controller of this.controllers.values()) {
            if (controller.setViewInsets) {
                controller.setViewInsets(insets);
            } else {
                controller.viewInsets = insets;
            }
        }
    }

    /**
     * Make a point the camera's pivot, called each frame while there is one. In VR and AR the
     * reader's turns and zooms happen about it and nothing moves; otherwise the active camera
     * glides its pivot to it.
     * @param point - The point, in world space.
     * @param frames - How many nominal 60 Hz frames this pass stands for; see `glideTowards`.
     * @returns Whether the camera moved, so the picture is not final yet.
     */
    public followPoint(point: Vector3, frames = 1): boolean {
        const xr = this.scene.metadata?.xrCameraController as XRPivotCameraController | null | undefined;
        if (xr) {
            xr.pivotController.center = point;
            return false;
        }

        const controller = this.activeCameraController;
        if (!this.#instantGlides) {
            return controller?.followPoint?.(point, frames) ?? false;
        }

        // No glide: step to the point at once (each step covers a share of the way, and stops
        // within a thousandth of a unit).
        let moved = false;
        for (let step = 0; step < 200 && controller?.followPoint?.(point) === true; step++) {
            moved = true;
        }

        return moved;
    }

    /** Whether the camera reaches a point it follows at once rather than gliding there. */
    #instantGlides = false;

    /**
     * Make the camera reach a point it follows (a picked node) at once rather than gliding there,
     * for a reader who prefers reduced motion.
     * @param on - True for no glide.
     */
    public setInstantGlides(on: boolean): void {
        this.#instantGlides = on;
    }

    /**
     * Hand every camera the room framing leaves clear at each edge.
     * @param insets - The insets, in CSS pixels.
     */
    public setFitInsets(insets: FitInsets): void {
        for (const controller of this.controllers.values()) {
            controller.fitInsets = insets;
        }
    }

    /**
     * Make every camera's wheel zoom toward the point under the pointer, or toward the view's
     * center.
     * @param on - True to zoom toward the pointer.
     */
    public setZoomToPointer(on: boolean): void {
        for (const input of this.inputs.values()) {
            if ("zoomToPointer" in input) {
                input.zoomToPointer = on;
            }
        }
    }

    /**
     * Tell every camera what a 3D fit fits into view.
     * @param bounds - The nodes' box, or the ball around them.
     */
    public setFitBounds(bounds: FitBounds): void {
        for (const controller of this.controllers.values()) {
            controller.fitBounds = bounds;
        }
    }

    /**
     * Turn the active camera on its own by an angle, unless the reader is moving it.
     * @param radians - The angle.
     * @returns Whether it turned, so the next frame has to be drawn.
     */
    public autoTurn(radians: number): boolean {
        const controller = this.activeCameraController;
        if (radians <= 0 || controller?.autoTurn === undefined || this.activeInputHandler?.busy === true) {
            return false;
        }

        controller.autoTurn(radians);
        return true;
    }

    /**
     * Updates the active input handler.
     * Should be called each frame in the render loop.
     */
    public update(): void {
        this.activeInputHandler?.update();
    }

    /**
     * Called when the canvas resizes to allow camera controllers to update
     * their projection to match the new aspect ratio.
     */
    public onResize(): void {
        if (this.activeCameraController?.onResize) {
            this.activeCameraController.onResize();
        }
    }

    /**
     * Gets the currently active camera controller.
     * @returns The active controller or null if no camera is active
     */
    public getActiveController(): CameraController | null {
        return this.activeCameraController;
    }

    /**
     * Gets a registered camera controller, whether or not it is the active one.
     * @param key - The identifier the controller was registered under
     * @returns The controller, or undefined when nothing is registered under the key
     */
    public getController(key: CameraKey): CameraController | undefined {
        return this.controllers.get(key);
    }

    /**
     * Temporarily disable the active input handler (e.g., during node dragging)
     */
    public temporarilyDisableInput(): void {
        if (this.activeInputHandler) {
            this.activeInputHandler.disable();
        }
    }

    /**
     * Re-enable the active input handler after temporary disable
     */
    public temporarilyEnableInput(): void {
        if (this.activeInputHandler) {
            this.activeInputHandler.enable();
        }
    }

    /**
     * Disposes of the camera manager and cleans up resources.
     * Disables active input handler and detaches active camera.
     */
    public dispose(): void {
        // Disable active input handler
        this.activeInputHandler?.disable();

        // Detach active camera
        this.activeCameraController?.camera.detachControl();

        // Clear references
        this.activeCameraController = null;
        this.activeInputHandler = null;
        this.controllers.clear();
        this.inputs.clear();
    }
}
