// OrbitInputController.ts
import Hammer from "hammerjs";

import { OrbitCameraController, OrbitConfig } from "./OrbitCameraController";

/** The keys that move the 3D camera. */
const CAMERA_KEYS: ReadonlySet<string> = new Set([
    "arrowleft",
    "arrowright",
    "arrowup",
    "arrowdown",
    "w",
    "s",
    "a",
    "d",
]);

/**
 * The frames of motion one press of a camera key gives, however short the press: 8 frames of
 * keyboardRotationSpeed (0.02) turn the camera 0.16 rad, about 9 degrees. Held longer, the key
 * keeps moving the camera every frame, so a hold starts as smoothly as a tap.
 */
const TAP_FRAMES = 8;

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
    /**
     * Frames of motion each key still owes from its last press (TAP_FRAMES), so a quick tap
     * turns or zooms by a step the reader can see rather than by one frame's sliver.
     */
    private keysOwed: Record<string, number> = {};
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
        this.keysDown[evt.key.toLowerCase()] = true;
        if (!evt.repeat) {
            // Added, not set: presses quicker than TAP_FRAMES apart each turn the full step.
            const key = evt.key.toLowerCase();
            this.keysOwed[key] = (this.keysOwed[key] ?? 0) + TAP_FRAMES;
        }
    };

    private readonly keyUpHandler = (evt: KeyboardEvent): void => {
        this.keysDown[evt.key.toLowerCase()] = false;
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
     * Whether the reader is moving the camera -- a drag, a pinch, a held arrow, W, S, A or D --
     * or input is switched off, as it is while a node is dragged. `camera.autoRotate` waits.
     * @returns True while it is.
     */
    public get busy(): boolean {
        const keys = this.keysDown;
        return (
            !this.enabled ||
            this.isPointerDown ||
            this.isMultiTouch ||
            Object.entries(keys).some(([key, down]) => down && CAMERA_KEYS.has(key)) ||
            Object.entries(this.keysOwed).some(([key, owed]) => owed > 0 && CAMERA_KEYS.has(key))
        );
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

        this.canvas.addEventListener("keydown", this.keyDownHandler);
        this.canvas.addEventListener("keyup", this.keyUpHandler);

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

        this.canvas.removeEventListener("keydown", this.keyDownHandler);
        this.canvas.removeEventListener("keyup", this.keyUpHandler);

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

        const owed = this.keysOwed;
        const down = (key: string): boolean => this.keysDown[key] || (owed[key] ?? 0) > 0;
        const cam = this.controller;
        // A held arrow turns by exactly keyboardRotationSpeed radians every frame, from the first
        // frame to the last, as A and D spin by keyboardYawSpeed: no velocity, so nothing builds
        // up while it is held and nothing coasts on after it is let go.
        const turn = this.config.keyboardRotationSpeed / this.config.trackballRotationSpeed;
        const yaw = (down("arrowleft") ? 1 : 0) - (down("arrowright") ? 1 : 0);
        const pitch = (down("arrowup") ? 1 : 0) - (down("arrowdown") ? 1 : 0);

        if (yaw !== 0 || pitch !== 0) {
            cam.rotate(-yaw * turn, -pitch * turn);
        }

        // W and S are exact inverses, so a press of one undoes the same press of the other
        if (down("w")) {
            cam.zoomBy(1 - this.config.keyboardZoomSpeed);
        }

        if (down("s")) {
            cam.zoomBy(1 / (1 - this.config.keyboardZoomSpeed));
        }

        if (down("a")) {
            cam.spin(this.config.keyboardYawSpeed);
        }

        if (down("d")) {
            cam.spin(-this.config.keyboardYawSpeed);
        }

        for (const key of Object.keys(owed)) {
            owed[key] = Math.max(0, (owed[key] ?? 0) - 1);
        }

        cam.updateCameraPosition();
    }
}
