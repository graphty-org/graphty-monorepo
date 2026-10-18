// OrbitInputController.ts
import Hammer from "hammerjs";

import { type CanvasKeyAction, canvasKeyAction } from "../catalog/canvasKeys";
import { OrbitCameraController, OrbitConfig } from "./OrbitCameraController";

/**
 * How much of a wheel notch one auto-repeat of a held zoom key moves: a tap is a whole notch,
 * and a key held down repeats at about 30 a second, so a quarter notch a repeat zooms about 2x a
 * second rather than 17x.
 */
const REPEAT_SHARE = 0.25;

/**
 * Handles user input for the orbit camera controller.
 * Processes mouse, touch, and keyboard input for camera manipulation.
 */
export class OrbitInputController {
    private canvas: HTMLCanvasElement;
    private controller: OrbitCameraController;
    private isPointerDown = false;
    private lastX = 0;
    private lastY = 0;
    private isMultiTouch = false;
    private rotationVelocityX = 0;
    private rotationVelocityY = 0;
    /** The camera actions whose keys are held down now. */
    private held = new Set<CanvasKeyAction>();
    /**
     * The actions whose key went down since the last frame. A key pressed and released between
     * two frames is never held when a frame looks, so without this a tap did nothing.
     */
    private tapped = new Set<CanvasKeyAction>();
    private config: OrbitConfig;
    private hammer: HammerManager | null = null;
    private enabled = false;

    /**
     * Whether the wheel zooms toward the point under the pointer rather than toward the view's
     * center. Off by default; see `Graph.setZoomToPointer`.
     */
    public zoomToPointer = false;

    // Store handlers for attach/detach
    private pointerDownHandler = (evt: PointerEvent): void => {
        if (evt.button === 0 && !this.isMultiTouch) {
            this.isPointerDown = true;
            this.lastX = evt.clientX;
            this.lastY = evt.clientY;
            // Take keyboard focus on a click, without scrolling the host page
            this.canvas.focus({ preventScroll: true });
        }
    };

    private pointerUpHandler = (): void => {
        this.isPointerDown = false;
    };

    private pointerMoveHandler = (evt: PointerEvent): void => {
        if (!this.isPointerDown || this.isMultiTouch) {
            return;
        }

        const dx = evt.clientX - this.lastX;
        const dy = evt.clientY - this.lastY;
        this.lastX = evt.clientX;
        this.lastY = evt.clientY;
        this.controller.rotate(dx, dy);
    };

    private keyDownHandler = (evt: KeyboardEvent): void => {
        // A modified key is a shortcut (Shift+A, Mod+S), not a camera move: the shortcut
        // usually moves focus away, so its keyup never reaches the canvas and the key stays held
        const action = canvasKeyAction("3d", evt);
        if (action === null) {
            return;
        }

        // A zoom key acts on the key press itself, one wheel notch, and a fraction of one on each
        // auto-repeat while held: a camera distance can be thousands of units, so a fixed step
        // per frame was invisible on a large graph and a tap between two frames was lost.
        if (action === "zoom-in" || action === "zoom-out") {
            const notches = (action === "zoom-in" ? -1 : 1) * (evt.repeat ? REPEAT_SHARE : 1);
            this.zoomBy(notches);
            return;
        }

        this.held.add(action);
        this.tapped.add(action);
    };

    private keyUpHandler = (evt: KeyboardEvent): void => {
        // Released whatever modifiers are down by then.
        const action = canvasKeyAction("3d", {
            key: evt.key,
            ctrlKey: false,
            altKey: false,
            metaKey: false,
            shiftKey: false,
        });
        if (action !== null) {
            this.held.delete(action);
        }
    };

    // One mouse wheel notch (deltaY 100) moves the camera by about keyboardZoomSpeed / 2 of its distance;
    // a trackpad's many small deltas add up to the same. The clamp keeps a line- or page-mode
    // delta from jumping the camera.
    private readonly wheelHandler = (evt: WheelEvent): void => {
        evt.preventDefault();
        const notches = Math.max(-1, Math.min(1, evt.deltaY / 100));
        if (this.zoomToPointer) {
            const rect = this.canvas.getBoundingClientRect();
            const x = ((evt.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
            const y = 1 - ((evt.clientY - rect.top) / Math.max(1, rect.height)) * 2;
            this.controller.zoomToward(this.notchDistance(notches), x, y);
            return;
        }

        this.zoomBy(notches);
    };

    // The canvas never sees the keyup of a key released after it lost focus
    private readonly releaseKeys = (): void => {
        this.held.clear();
        this.tapped.clear();
    };

    /**
     * How far some wheel notches move the camera: each notch out multiplies its distance by
     * 1 + keyboardZoomSpeed / 2 and each notch in divides it by the same, so a turn out undoes a
     * turn in. Adding the same share of the distance either way zoomed in 1/0.9 a notch and out
     * only 1/1.1, and three turns out did not undo three turns in.
     * @param notches - Notches; negative zooms in.
     * @returns The distance delta.
     */
    private notchDistance(notches: number): number {
        const distance = this.controller.cameraDistance;
        return distance * (1 + this.config.keyboardZoomSpeed / 2) ** notches - distance;
    }

    /**
     * Zoom toward the view's center by some wheel notches.
     * @param notches - Notches; negative zooms in.
     */
    private zoomBy(notches: number): void {
        this.controller.zoom(this.notchDistance(notches));
    }

    /**
     * Creates a new OrbitInputController instance.
     * @param canvas - The HTML canvas element to attach input listeners to
     * @param controller - The orbit camera controller to manipulate
     */
    constructor(canvas: HTMLCanvasElement, controller: OrbitCameraController) {
        this.canvas = canvas;
        this.controller = controller;
        this.config = controller.config;

        // Ensure canvas is focusable
        this.canvas.setAttribute("tabindex", "0");

        this.attachMouseTouch();
    }

    private attachMouseTouch(): void {
        this.hammer = new Hammer.Manager(this.canvas);
        this.hammer.add(new Hammer.Pinch());
        this.hammer.add(new Hammer.Rotate());

        let lastRotation = 0;
        let lastScale = 1;

        this.hammer.on("pinchstart rotatestart", (ev: HammerInput) => {
            this.isMultiTouch = true;
            lastRotation = ev.rotation || 0;
            lastScale = ev.scale || 1;
        });

        this.hammer.on("pinchend rotateend", () => {
            this.isMultiTouch = false;
        });

        this.hammer.on("pinchmove rotatemove", (ev: HammerInput) => {
            const scaleDelta = ev.scale - lastScale;
            this.controller.zoom(-scaleDelta * this.config.pinchZoomSensitivity);
            lastScale = ev.scale;

            const rotationDelta = (ev.rotation - lastRotation) * (Math.PI / 180) * this.config.twistYawSensitivity;
            this.controller.spin(rotationDelta);
            lastRotation = ev.rotation;
        });
    }

    /**
     * Enables input handling by attaching event listeners.
     * Idempotent - can be called multiple times safely.
     */
    public enable(): void {
        if (this.enabled) {
            return;
        }

        this.enabled = true;

        this.canvas.addEventListener("pointerdown", this.pointerDownHandler);
        this.canvas.addEventListener("pointerup", this.pointerUpHandler);
        this.canvas.addEventListener("pointermove", this.pointerMoveHandler);
        this.canvas.addEventListener("wheel", this.wheelHandler, { passive: false });

        this.canvas.addEventListener("keydown", this.keyDownHandler);
        this.canvas.addEventListener("keyup", this.keyUpHandler);
        this.canvas.addEventListener("blur", this.releaseKeys);
        document.addEventListener("visibilitychange", this.releaseKeys);

        if (!this.hammer) {
            this.attachMouseTouch();
        }
    }

    /**
     * Disables input handling by removing event listeners.
     * Idempotent - can be called multiple times safely.
     */
    public disable(): void {
        if (!this.enabled) {
            return;
        }

        this.enabled = false;

        this.canvas.removeEventListener("pointerdown", this.pointerDownHandler);
        this.canvas.removeEventListener("pointerup", this.pointerUpHandler);
        this.canvas.removeEventListener("pointermove", this.pointerMoveHandler);
        this.canvas.removeEventListener("wheel", this.wheelHandler);

        this.canvas.removeEventListener("keydown", this.keyDownHandler);
        this.canvas.removeEventListener("keyup", this.keyUpHandler);
        this.canvas.removeEventListener("blur", this.releaseKeys);
        document.removeEventListener("visibilitychange", this.releaseKeys);
        this.releaseKeys();

        if (this.hammer) {
            this.hammer.destroy();
            this.hammer = null;
        }
    }

    /**
     * Updates camera based on keyboard input and applies inertia.
     * Should be called each frame in the render loop.
     */
    public update(): void {
        if (!this.enabled) {
            return;
        }

        const cam = this.controller;
        const on = (action: CanvasKeyAction): boolean => this.held.has(action) || this.tapped.has(action);

        if (on("turn-left")) {
            this.rotationVelocityY += this.config.keyboardRotationSpeed;
        }

        if (on("turn-right")) {
            this.rotationVelocityY -= this.config.keyboardRotationSpeed;
        }

        if (on("turn-up")) {
            this.rotationVelocityX += this.config.keyboardRotationSpeed;
        }

        if (on("turn-down")) {
            this.rotationVelocityX -= this.config.keyboardRotationSpeed;
        }

        if (on("roll-left")) {
            cam.spin(this.config.keyboardYawSpeed);
        }

        if (on("roll-right")) {
            cam.spin(-this.config.keyboardYawSpeed);
        }

        this.tapped.clear();

        if (Math.abs(this.rotationVelocityX) > 0.00001) {
            cam.rotate(0, -this.rotationVelocityX / this.config.trackballRotationSpeed);
            this.rotationVelocityX *= this.config.inertiaDamping;
        }

        if (Math.abs(this.rotationVelocityY) > 0.00001) {
            cam.rotate(-this.rotationVelocityY / this.config.trackballRotationSpeed, 0);
            this.rotationVelocityY *= this.config.inertiaDamping;
        }

        cam.updateCameraPosition();
    }
}
