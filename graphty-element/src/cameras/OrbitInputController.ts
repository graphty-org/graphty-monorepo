// OrbitInputController.ts
import Hammer from "hammerjs";

import { hasModifier } from "./InputUtils";
import { OrbitCameraController, OrbitConfig } from "./OrbitCameraController";

/** The fraction of the camera's distance one mouse wheel notch zooms by. */
const WHEEL_NOTCH_ZOOM = 0.1;

/**
 * Handles user input for the orbit camera controller.
 * Processes mouse, touch, and keyboard input for camera manipulation.
 */
export class OrbitInputController {
    private readonly canvas: HTMLCanvasElement;
    private readonly controller: OrbitCameraController;
    private isPointerDown = false;
    private lastX = 0;
    private lastY = 0;
    private isMultiTouch = false;
    private keysDown: Record<string, boolean> = {};
    private readonly config: OrbitConfig;
    private hammer: HammerManager | null = null;
    private enabled = false;

    // Store handlers for attach/detach
    private readonly pointerDownHandler = (evt: PointerEvent): void => {
        if (evt.button === 0 && !this.isMultiTouch) {
            this.isPointerDown = true;
            this.lastX = evt.clientX;
            this.lastY = evt.clientY;
            // Take keyboard focus on a click, without scrolling the host page
            this.canvas.focus({ preventScroll: true });
        }
    };

    private readonly pointerUpHandler = (): void => {
        this.isPointerDown = false;
    };

    private readonly pointerMoveHandler = (evt: PointerEvent): void => {
        if (!this.isPointerDown || this.isMultiTouch) {
            return;
        }

        const dx = evt.clientX - this.lastX;
        const dy = evt.clientY - this.lastY;
        this.lastX = evt.clientX;
        this.lastY = evt.clientY;
        this.controller.rotate(dx, dy);
    };

    private readonly keyDownHandler = (evt: KeyboardEvent): void => {
        // A modified key is a shortcut (Shift+A, Mod+S), not a camera move: the shortcut
        // usually moves focus away, so its keyup never reaches the canvas and the key stays held
        if (hasModifier(evt)) {
            return;
        }

        this.keysDown[evt.key.toLowerCase()] = true;
    };

    private readonly keyUpHandler = (evt: KeyboardEvent): void => {
        this.keysDown[evt.key.toLowerCase()] = false;
    };

    // One mouse wheel notch (deltaY 100) moves the camera by WHEEL_NOTCH_ZOOM of its distance;
    // a trackpad's many small deltas add up to the same. The clamp keeps a line- or page-mode
    // delta from jumping the camera.
    private readonly wheelHandler = (evt: WheelEvent): void => {
        evt.preventDefault();
        const notches = Math.max(-1, Math.min(1, evt.deltaY / 100));
        this.controller.zoomBy(1 + WHEEL_NOTCH_ZOOM * notches);
    };

    // The canvas never sees the keyup of a key released after it lost focus
    private readonly releaseKeys = (): void => {
        this.keysDown = {};
    };

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
            // The distance follows the finger gap: spreading the fingers to twice the gap halves it
            this.controller.zoomBy(lastScale / ev.scale);
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

        const keys = this.keysDown;
        const cam = this.controller;
        // A held arrow turns by exactly keyboardRotationSpeed radians every frame, from the first
        // frame to the last, as A and D spin by keyboardYawSpeed: no velocity, so nothing builds
        // up while it is held and nothing coasts on after it is let go.
        const turn = this.config.keyboardRotationSpeed / this.config.trackballRotationSpeed;
        const yaw = (keys.arrowleft ? 1 : 0) - (keys.arrowright ? 1 : 0);
        const pitch = (keys.arrowup ? 1 : 0) - (keys.arrowdown ? 1 : 0);

        if (yaw !== 0 || pitch !== 0) {
            cam.rotate(-yaw * turn, -pitch * turn);
        }

        // W and S are exact inverses, so a press of one undoes the same press of the other
        if (keys.w) {
            cam.zoomBy(1 - this.config.keyboardZoomSpeed);
        }

        if (keys.s) {
            cam.zoomBy(1 / (1 - this.config.keyboardZoomSpeed));
        }

        if (keys.a) {
            cam.spin(this.config.keyboardYawSpeed);
        }

        if (keys.d) {
            cam.spin(-this.config.keyboardYawSpeed);
        }

        cam.updateCameraPosition();
    }
}
