import { Camera, Engine, FreeCamera, Scene, TransformNode, Vector3, WebGPUEngine } from "@babylonjs/core";

import { freeArea } from "../camera/insets";
import type { ViewInsets } from "../camera/types";
import type { FitInsets } from "../config/GraphBehavior";
import { glideTowards } from "./CameraManager";
import { framingInsets } from "./OrbitCameraController";

// === Configuration Object ===
export interface TwoDCameraControlsConfigType {
    panAcceleration: number;
    panDamping: number;
    zoomFactorPerFrame: number;
    zoomDamping: number;
    zoomMin: number;
    zoomMax: number;
    rotateSpeedPerFrame: number;
    rotateDamping: number;
    rotateMin: number | null;
    rotateMax: number | null;
    mousePanScale: number;
    mouseWheelZoomSpeed: number;
    touchPanScale: number;
    touchPinchMin: number;
    touchPinchMax: number;
    initialOrthoSize: number;
    rotationEnabled: boolean;
    inertiaEnabled: boolean;
}

// === Camera Controller Class ===
/**
 * Controls a 2D orthographic camera with pan, zoom, and rotation support.
 * Provides smooth inertia-based movement and keyboard controls.
 */
export class TwoDCameraController {
    public camera: FreeCamera;
    public parent: TransformNode;
    public velocity = { x: 0, y: 0, zoom: 0, rotate: 0 };
    /** Margins of the canvas something else covers, in CSS pixels; every fit keeps the graph out of them. */
    public viewInsets: ViewInsets = {};
    /** Told each time the reader's input pans, zooms or turns the camera. */
    public onReaderMove?: () => void;
    /** Room framing leaves clear at each edge, in CSS pixels; see `camera.fitInsets`. */
    public fitInsets: FitInsets = { top: 0, right: 0, bottom: 0, left: 0 };

    /**
     * Creates a new TwoDCameraController instance.
     * @param scene - The Babylon.js scene
     * @param engine - The Babylon.js engine (standard or WebGPU)
     * @param canvas - The HTML canvas element
     * @param config - Configuration options for 2D camera controls
     */
    constructor(
        public scene: Scene,
        public engine: Engine | WebGPUEngine,
        public canvas: HTMLCanvasElement,
        public config: TwoDCameraControlsConfigType,
    ) {
        this.camera = new FreeCamera("orthoCamera", new Vector3(0, 0, -10), scene);
        this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        this.camera.inertia = 0;
        this.camera.inputs.clear();

        this.parent = new TransformNode("parent", scene);
        this.updateOrtho(config.initialOrthoSize);
        this.camera.setTarget(Vector3.Zero());
    }

    /**
     * Updates the orthographic camera bounds based on size.
     * @param size - The half-width of the orthographic view
     */
    public updateOrtho(size: number): void {
        const aspect = this.engine.getRenderHeight() / this.engine.getRenderWidth();
        this.camera.orthoLeft = -size;
        this.camera.orthoRight = size;
        this.camera.orthoTop = size * aspect;
        this.camera.orthoBottom = -size * aspect;
    }

    /**
     * Update the ortho bounds to match current aspect ratio without changing zoom level.
     * This should be called when the canvas resizes to prevent visual shifts.
     * Keeps the horizontal view (orthoLeft/Right) the same and adjusts vertical bounds.
     */
    public updateOrthoAspectRatio(): void {
        const { orthoRight } = this.camera;
        if (orthoRight === null) {
            return;
        }

        const aspect = this.engine.getRenderHeight() / this.engine.getRenderWidth();
        this.camera.orthoTop = orthoRight * aspect;
        this.camera.orthoBottom = -orthoRight * aspect;
    }

    /**
     * Called when the canvas resizes.
     * Updates the ortho bounds to match the new aspect ratio.
     */
    public onResize(): void {
        this.updateOrthoAspectRatio();
    }

    /**
     * Pans the camera by a delta amount.
     * @param dx - Horizontal pan delta
     * @param dy - Vertical pan delta
     */
    public pan(dx: number, dy: number): void {
        this.camera.position.x += dx;
        this.camera.position.y += dy;
        this.onReaderMove?.();
    }

    /**
     * Glide the view's center to a point, which is then what the view zooms about.
     * @param point - The point; only its x and y are used.
     * @param frames - How many nominal 60 Hz frames this pass stands for; see `glideTowards`.
     * @returns Whether the view moved.
     */
    public followPoint(point: Vector3, frames = 1): boolean {
        return glideTowards(this.camera.position, new Vector3(point.x, point.y, this.camera.position.z), frames);
    }

    /**
     * Zooms the camera by a multiplicative factor.
     * @param factor - Zoom factor (greater than 1 zooms out, less than 1 zooms in)
     */
    public zoom(factor: number): void {
        this.camera.orthoLeft = factor * (this.camera.orthoLeft ?? 1);
        this.camera.orthoRight = factor * (this.camera.orthoRight ?? 1);
        this.camera.orthoTop = factor * (this.camera.orthoTop ?? 1);
        this.camera.orthoBottom = factor * (this.camera.orthoBottom ?? 1);
        this.onReaderMove?.();
    }

    /**
     * Zoom like {@link zoom}, keeping the point under a spot on the canvas where it is.
     * @param factor - Zoom factor (greater than 1 zooms out, less than 1 zooms in)
     * @param x - The spot's horizontal position, 0 (left edge) to 1 (right edge).
     * @param y - The spot's vertical position, 0 (top edge) to 1 (bottom edge).
     */
    public zoomAt(factor: number, x: number, y: number): void {
        const left = this.camera.orthoLeft ?? -1;
        const right = this.camera.orthoRight ?? 1;
        const top = this.camera.orthoTop ?? 1;
        const bottom = this.camera.orthoBottom ?? -1;
        // The spot's offset from the camera in the camera's own axes, which are its parent's.
        const offsetX = left + x * (right - left);
        const offsetY = top - y * (top - bottom);
        this.zoom(factor);
        this.camera.position.x += (1 - factor) * offsetX;
        this.camera.position.y += (1 - factor) * offsetY;
    }

    /**
     * Rotates the camera around the Z-axis.
     * @param delta - Rotation delta in radians
     */
    public rotate(delta: number): void {
        this.parent.rotation.z += delta;
        this.onReaderMove?.();
    }

    /**
     * Applies velocity-based inertia to camera movement.
     * Should be called each frame to update camera position based on velocity.
     */
    public applyInertia(): void {
        const v = this.velocity;
        const c = this.config;

        this.camera.position.x += v.x;
        this.camera.position.y += v.y;

        const zoomScale = Math.exp(v.zoom);
        this.camera.orthoLeft = zoomScale * (this.camera.orthoLeft ?? 1);
        this.camera.orthoRight = zoomScale * (this.camera.orthoRight ?? 1);
        this.camera.orthoTop = zoomScale * (this.camera.orthoTop ?? 1);
        this.camera.orthoBottom = zoomScale * (this.camera.orthoBottom ?? 1);

        this.parent.rotation.z += v.rotate;

        v.x *= c.panDamping;
        v.y *= c.panDamping;
        v.zoom *= c.zoomDamping;
        v.rotate *= c.rotateDamping;
    }

    /**
     * Zooms the camera to fit a bounding box in view.
     * @param min - The minimum corner of the bounding box
     * @param max - The maximum corner of the bounding box
     */
    public zoomToBoundingBox(min: Vector3, max: Vector3): void {
        const centerX = (min.x + max.x) / 2;
        const centerY = (min.y + max.y) / 2;

        const sizeX = max.x - min.x;
        const sizeY = max.y - min.y;

        // The half-width that fits the box into the part of the canvas the view and fit insets
        // leave free (`free.width` and `free.height` are its shares of the canvas), whichever side binds.
        const viewportAspect = this.engine.getRenderHeight() / this.engine.getRenderWidth();
        const free = freeArea(
            framingInsets(this.viewInsets, this.fitInsets),
            this.canvas.clientWidth,
            this.canvas.clientHeight,
        );
        const orthoSize = Math.max(sizeX / (2 * free.width), sizeY / (2 * viewportAspect * free.height)) * 1.1; // Small padding for visual comfort

        // Center the box on the free area rather than on the canvas.
        this.camera.position.x = centerX - free.x * orthoSize;
        this.camera.position.y = centerY - free.y * orthoSize * viewportAspect;

        // Put the camera behind the box and let the far plane reach past it. Babylon's
        // default 10000 clips a layout that settles tens of thousands of units deep. The box holds
        // the nodes, not what hangs in front of them: a text centered over a node stands half the
        // node's diagonal in front of it, so the camera stands back by the box's width and height
        // too, or the near plane cuts the texts over a big node away.
        const depth = max.z - min.z;
        this.camera.position.z = min.z - Math.max(10, depth, sizeX, sizeY);
        this.camera.maxZ = Math.max(10000, depth + Math.abs(this.camera.position.z) * 2);

        this.updateOrtho(orthoSize);
    }
}
