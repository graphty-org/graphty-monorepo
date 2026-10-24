// OrbitInputController.ts
import Hammer from "hammerjs";

import { type CanvasKeyAction, canvasKeyAction } from "../catalog/canvasKeys";
import { OrbitCameraController, OrbitConfig } from "./OrbitCameraController";

/**
 * The frames of motion one press of a camera key gives, however short the press: 8 frames of
 * keyboardRotationSpeed (0.02) turn the camera 0.16 rad, about 9 degrees. Held longer, the key
 * keeps moving the camera every frame, so a hold starts as smoothly as a tap.
 */
const TAP_FRAMES = 8;

/** Each camera action and the action that moves the camera the other way. */
const OPPOSITE_ACTION: Readonly<Partial<Record<CanvasKeyAction, CanvasKeyAction>>> = {
    "turn-left": "turn-right",
    "turn-right": "turn-left",
    "turn-up": "turn-down",
    "turn-down": "turn-up",
    "roll-left": "roll-right",
    "roll-right": "roll-left",
    "zoom-in": "zoom-out",
    "zoom-out": "zoom-in",
};

/**
 * The factor one wheel notch changes the camera's distance by: about what a tap of W or S zooms
 * over its TAP_FRAMES frames (0.985 ** 8 = 0.886).
 */
const NOTCH_ZOOM = 1.1;

/**
 * One axis from a pair of opposing keys: 1, -1, or 0 when neither or both are on.
 * @param plus - Whether the key that moves the positive way is on.
 * @param minus - Whether the key that moves the negative way is on.
 * @returns The axis value.
 */
function axisOf(plus: boolean, minus: boolean): number {
    return Number(plus) - Number(minus);
}

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
    /** The camera actions whose keys are held down now. */
    private readonly held = new Set<CanvasKeyAction>();
    /**
     * Frames of motion each action still owes from its last press (TAP_FRAMES), so a quick tap
     * turns by a step the reader can see rather than by one frame's sliver -- and a key pressed
     * and released between two frames still moves the camera.
     */
    private readonly owed = new Map<CanvasKeyAction, number>();
    private readonly config: OrbitConfig;
    private hammer: HammerManager | null = null;
    private enabled = false;

    /**
     * Whether the wheel zooms toward the point under the pointer rather than toward the view's
     * center. Off by default; see `Graph.setZoomToPointer`.
     */
    public zoomToPointer = false;

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
        const rect = this.canvas.getBoundingClientRect();
        const from = { x: this.lastX - rect.left, y: this.lastY - rect.top };
        this.lastX = evt.clientX;
        this.lastY = evt.clientY;
        // On a globe the grabbed point stays under the pointer; elsewhere the drag turns the view.
        if (!this.controller.dragOnSphere(from, { x: evt.clientX - rect.left, y: evt.clientY - rect.top })) {
            this.controller.rotate(dx, dy);
        }
    };

    private readonly keyDownHandler = (evt: KeyboardEvent): void => {
        // A modified key is a shortcut (Shift+A, Mod+S), not a camera move: the shortcut
        // usually moves focus away, so its keyup never reaches the canvas and the key stays held
        const action = canvasKeyAction("3d", evt);
        if (action === null) {
            return;
        }

        // The zoom keys too: a press owes frames of motion, a hold moves every frame, and the
        // auto-repeats add nothing: they start late, follow the OS settings, and on macOS (press
        // and hold shows the accent menu) a held letter often repeats not at all. A zoom key
        // must not jump on the press: the first frame zooms as far as every frame after it.
        this.held.add(action);
        if (!evt.repeat) {
            // Added, not set: presses quicker than TAP_FRAMES apart each turn the full step.
            this.owed.set(action, (this.owed.get(action) ?? 0) + TAP_FRAMES);
            // A press the other way ends what is left of the last step, rather than cancelling
            // itself against it.
            const opposite = OPPOSITE_ACTION[action];
            if (opposite !== undefined) {
                this.owed.set(opposite, 0);
            }
        }
    };

    private readonly keyUpHandler = (evt: KeyboardEvent): void => {
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

    // One mouse wheel notch (deltaY 100) changes the camera's distance by NOTCH_ZOOM;
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
        this.owed.clear();
    };

    /**
     * How far some wheel notches move the camera: each notch out multiplies its distance (over a
     * globe, its height above the surface) by NOTCH_ZOOM and each notch in divides it by the
     * same, so a turn out undoes a
     * turn in. Adding the same share of the distance either way zoomed in 1/0.9 a notch and out
     * only 1/1.1, and three turns out did not undo three turns in.
     * @param notches - Notches; negative zooms in.
     * @returns The distance delta.
     */
    private notchDistance(notches: number): number {
        return this.controller.zoomDelta(NOTCH_ZOOM ** notches);
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
            // The distance follows the finger gap: spreading the fingers to twice the gap halves it
            this.controller.zoomBy(lastScale / ev.scale);
            lastScale = ev.scale;

            const rotationDelta = (ev.rotation - lastRotation) * (Math.PI / 180) * this.config.twistYawSensitivity;
            this.controller.spin(rotationDelta);
            lastRotation = ev.rotation;
        });
    }

    /**
     * Whether the reader is moving the camera -- a drag, a pinch, a held arrow, A or D --
     * or input is switched off, as it is while a node is dragged. `camera.autoRotate` waits.
     * @returns True while it is.
     */
    public get busy(): boolean {
        return (
            !this.enabled ||
            this.isPointerDown ||
            this.isMultiTouch ||
            this.held.size > 0 ||
            [...this.owed.values()].some((frames) => frames > 0)
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

        const { owed } = this;
        const on = (action: CanvasKeyAction): boolean => this.held.has(action) || (owed.get(action) ?? 0) > 0;
        const cam = this.controller;
        // A held arrow turns by exactly keyboardRotationSpeed radians every frame, from the first
        // frame to the last, as A and D spin by keyboardYawSpeed: no velocity, so nothing builds
        // up while it is held and nothing coasts on after it is let go.
        const turn = this.config.keyboardRotationSpeed / this.config.trackballRotationSpeed;
        const yaw = axisOf(on("turn-left"), on("turn-right"));
        const pitch = axisOf(on("turn-up"), on("turn-down"));

        if (yaw !== 0 || pitch !== 0) {
            cam.rotate(-yaw * turn, -pitch * turn);
        }

        if (on("roll-left")) {
            cam.spin(this.config.keyboardYawSpeed);
        }

        if (on("roll-right")) {
            cam.spin(-this.config.keyboardYawSpeed);
        }

        // A zoom key multiplies the distance by 1 - keyboardZoomSpeed every frame it is on, from
        // the first, so it zooms as fast far out as close in; W and S are exact inverses, and
        // held together they cancel, as two arrows do.
        const zoom = axisOf(on("zoom-out"), on("zoom-in"));
        if (zoom !== 0) {
            cam.zoomBy((1 - this.config.keyboardZoomSpeed) ** -zoom);
        }

        for (const [action, frames] of owed) {
            owed.set(action, Math.max(0, frames - 1));
        }

        cam.updateCameraPosition();
    }
}
