// TwoDInputController.ts
import type { Observer, PointerInfoPre } from "@babylonjs/core";
import { PointerEventTypes, type PointerInfo } from "@babylonjs/core/Events/pointerEvents.js";
import Hammer from "hammerjs";

import { type CanvasKeyAction, canvasKeyAction } from "../catalog/canvasKeys";
import { firstSight } from "../input/first-sight";
import { type CameraGestureKind, type GestureEndHooks, WheelRun } from "./gestureEnd";
import { wheelZoomFactor } from "./InputUtils";
import { nominalFrames, TwoDCameraController, TwoDCameraControlsConfigType } from "./TwoDCameraController";

interface GestureSession {
    panX: number;
    panY: number;
    panStartX: number;
    panStartY: number;
    ortho: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    scale: number;
    rotation: number;
    startRotDeg: number;
}

/**
 * Handles user input for the 2D camera controller.
 * Processes mouse, touch, and keyboard input for 2D camera manipulation.
 */
export class InputController implements GestureEndHooks {
    /** Told once when a reader's camera gesture ends; see `camera:gesture-end`. */
    public onGestureEnd: ((kind: CameraGestureKind) => void) | null = null;
    /** Asks the render loop for one more frame; see {@link WheelRun}. */
    public requestFrame: (() => void) | null = null;
    /** What the drag or touch gesture under way has done, once it moved the camera. */
    private dragKind: CameraGestureKind | null = null;
    /** What the camera keys have been doing, until the camera's inertia comes to rest. */
    private keyKind: CameraGestureKind | null = null;
    private readonly wheelRun = new WheelRun();
    /** The camera actions whose keys are held down now. */
    private readonly held = new Set<CanvasKeyAction>();
    /** The actions whose key went down since the last frame, so a tap between two frames acts. */
    private readonly tapped = new Set<CanvasKeyAction>();
    /** Whether the wheel zooms toward the point under the pointer; see `Graph.setZoomToPointer`. */
    public zoomToPointer = false;
    private gestureSession: GestureSession | null = null;
    private hammer: HammerManager | null = null;
    private enabled = false;

    // Store observable subscriptions for cleanup
    private pointerObserverHandle: Observer<PointerInfo> | null = null;
    private prePointerObserverHandle: Observer<PointerInfoPre> | null = null;

    private readonly pointerDownHandler = (): void => {
        this.cam.canvas.focus({ preventScroll: true });
    };

    private readonly keyDownHandler = (e: KeyboardEvent): void => {
        // A modified key is a shortcut, not a pan; see OrbitInputController
        const action = canvasKeyAction("2d", e);
        if (action !== null) {
            this.held.add(action);
            this.tapped.add(action);
        }
    };

    // The canvas never sees the keyup of a key released after it lost focus
    private readonly releaseKeys = (): void => {
        this.held.clear();
        this.tapped.clear();
    };

    /**
     * A drag or a touch gesture ended: report it once, if it moved the camera. A mouse drag ends
     * both the pointer and the touch recognizer, and only the first end counts.
     */
    private endDrag(): void {
        const kind = this.dragKind;
        this.dragKind = null;
        if (kind !== null) {
            this.onGestureEnd?.(kind);
        }
    }

    private readonly keyUpHandler = (e: KeyboardEvent): void => {
        // Released whatever modifiers are down by then.
        const action = canvasKeyAction("2d", {
            key: e.key,
            ctrlKey: false,
            altKey: false,
            metaKey: false,
            shiftKey: false,
        });
        if (action !== null) {
            this.held.delete(action);
        }
    };

    /**
     * Creates a new InputController instance.
     * @param cam - The 2D camera controller to manipulate
     * @param canvas - The HTML canvas element to attach input listeners to
     * @param config - Configuration options for 2D camera controls
     */
    constructor(
        private readonly cam: TwoDCameraController,
        private readonly canvas: HTMLCanvasElement,
        private readonly config: TwoDCameraControlsConfigType,
    ) {
        this.canvas.setAttribute("tabindex", "0"); // Make focusable
        // Note: setupMouse() and setupTouch() are called in enable() to allow re-enabling
        // after disable() removes the observers
    }

    private setupMouse(): void {
        let isPanning = false;
        let lastX = 0;
        let lastY = 0;
        // Each finger on the canvas and where it last was. One finger pans from here: pointer events
        // arrive inside the browser's touch slop (about 15 px), where touch events do not. Each finger
        // is measured from its own last position, never another's (issue #9523).
        const fingers = new Map<number, { x: number; y: number }>();

        this.pointerObserverHandle = this.cam.scene.onPointerObservable.add((pi) => {
            const e = pi.event as PointerEvent;

            switch (pi.type) {
                case PointerEventTypes.POINTERDOWN:
                    isPanning = e.pointerType !== "touch";
                    if (!isPanning) {
                        fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                    }
                    this.dragKind = null;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    this.pointerDownHandler();
                    break;

                case PointerEventTypes.POINTERUP:
                    isPanning = false;
                    fingers.delete(e.pointerId);
                    this.endDrag();
                    break;

                case PointerEventTypes.POINTERMOVE: {
                    // The button came up where the canvas never heard it (outside the window): the
                    // drag is over, as its release would have ended it.
                    if (isPanning && e.pointerType === "mouse" && e.buttons === 0) {
                        isPanning = false;
                        this.endDrag();
                    }
                    const finger = fingers.get(e.pointerId);
                    if (finger) {
                        // Two or more fingers are the gesture recognizer's (setupTouch).
                        if (fingers.size === 1) {
                            this.panByPixels(e.clientX - finger.x, e.clientY - finger.y, this.config.touchPanScale);
                        }

                        finger.x = e.clientX;
                        finger.y = e.clientY;
                    } else if (isPanning && e.buttons === 1) {
                        this.panByPixels(e.clientX - lastX, e.clientY - lastY, this.config.mousePanScale);
                        lastX = e.clientX;
                        lastY = e.clientY;
                    }

                    break;
                }

                default:
                    break;
            }
        });

        const newWheel = firstSight();
        this.prePointerObserverHandle = this.cam.scene.onPrePointerObservable.add((pi) => {
            const e = pi.event as WheelEvent;
            if (pi.type === PointerEventTypes.POINTERWHEEL && newWheel(e)) {
                this.wheelRun.wheel();
                // In proportion to the delta, so a trackpad zooms no faster than a mouse wheel
                const delta = wheelZoomFactor(e, this.config.mouseWheelZoomSpeed);
                if (this.zoomToPointer) {
                    const rect = this.canvas.getBoundingClientRect();
                    this.cam.zoomAt(
                        delta,
                        (e.clientX - rect.left) / Math.max(1, rect.width),
                        (e.clientY - rect.top) / Math.max(1, rect.height),
                    );
                } else {
                    this.cam.zoom(delta);
                }
                e.preventDefault();
            }
        }, PointerEventTypes.POINTERWHEEL);
    }

    /**
     * Pan the view by a pointer's move on screen, so the drawing follows it.
     * @param dx - The move across, in CSS pixels.
     * @param dy - The move down, in CSS pixels.
     * @param panScale - The configured pan scale for the device.
     */
    private panByPixels(dx: number, dy: number, panScale: number): void {
        const orthoRight = this.cam.camera.orthoRight ?? 1;
        const orthoLeft = this.cam.camera.orthoLeft ?? 1;
        const orthoTop = this.cam.camera.orthoTop ?? 1;
        const orthoBottom = this.cam.camera.orthoBottom ?? 1;
        const scaleX =
            (orthoRight - orthoLeft) / (this.cam.engine.getRenderWidth() * this.cam.engine.getHardwareScalingLevel());
        const scaleY =
            (orthoTop - orthoBottom) / (this.cam.engine.getRenderHeight() * this.cam.engine.getHardwareScalingLevel());
        if (dx !== 0 || dy !== 0) {
            this.dragKind ??= "pan";
        }

        this.cam.pan(-dx * scaleX * panScale, dy * scaleY * panScale);
    }

    private setupTouch(): void {
        // Touch events only: the mouse, the pen and a single finger are setupMouse's. A touch event
        // carries every finger at once, where pointer events would bring each finger's move on its own.
        this.hammer = new Hammer.Manager(this.canvas, { inputClass: Hammer.TouchInput });
        const pan = new Hammer.Pan({ threshold: 0, pointers: 0 });
        const pinch = new Hammer.Pinch();
        const rotate = new Hammer.Rotate();

        this.hammer.add([pan, pinch, rotate]);
        this.hammer.get("pinch").recognizeWith(this.hammer.get("rotate"));
        this.hammer.get("pan").requireFailure(this.hammer.get("pinch"));

        // Hammer's delta, scale and rotation run from the moment the fingers landed, or last
        // changed in number: the camera at that moment is where the gesture is measured from, so
        // the result does not depend on which recognizer won or when it started (issue #9523).
        let fingers = 0;
        this.hammer.on("hammer.input", (ev) => {
            if (ev.pointers.length !== fingers || ev.isFirst) {
                fingers = ev.pointers.length;
                this.gestureSession = {
                    panX: ev.deltaX,
                    panY: ev.deltaY,
                    panStartX: this.cam.camera.position.x,
                    panStartY: this.cam.camera.position.y,
                    ortho: {
                        left: this.cam.camera.orthoLeft ?? 1,
                        right: this.cam.camera.orthoRight ?? 1,
                        top: this.cam.camera.orthoTop ?? 1,
                        bottom: this.cam.camera.orthoBottom ?? 1,
                    },
                    scale: ev.scale || 1,
                    rotation: this.cam.camera.rotation.z,
                    startRotDeg: ev.rotation || 0,
                };
            }
        });

        // Not the end: a lifted finger leaves the others listed in another order, which Hammer reads
        // as a turn.
        this.hammer.on("panstart panmove pinchstart pinchmove rotatestart rotatemove", (ev) => {
            // One finger is setupMouse's pan, which moves inside the browser's touch slop.
            if (!this.gestureSession || ev.pointers.length < 2) {
                return;
            }

            const orthoRight = this.cam.camera.orthoRight ?? 1;
            const orthoLeft = this.cam.camera.orthoLeft ?? 1;
            const orthoTop = this.cam.camera.orthoTop ?? 1;
            const orthoBottom = this.cam.camera.orthoBottom ?? 1;
            const scaleX =
                (orthoRight - orthoLeft) /
                (this.cam.engine.getRenderWidth() * this.cam.engine.getHardwareScalingLevel());
            const scaleY =
                (orthoTop - orthoBottom) /
                (this.cam.engine.getRenderHeight() * this.cam.engine.getHardwareScalingLevel());

            const dx = ev.deltaX - this.gestureSession.panX;
            const dy = ev.deltaY - this.gestureSession.panY;

            this.cam.panFrom(
                this.gestureSession.panStartX,
                this.gestureSession.panStartY,
                -dx * scaleX * this.config.touchPanScale,
                dy * scaleY * this.config.touchPanScale,
            );

            const pinch = (ev.scale || 1) / this.gestureSession.scale;
            // A gesture that changed the scale is a zoom; one that only moved is a pan.
            if (pinch !== 1) {
                this.dragKind = "zoom";
            } else if (dx !== 0 || dy !== 0) {
                this.dragKind ??= "pan";
            }

            this.cam.camera.orthoLeft = this.gestureSession.ortho.left / pinch;
            this.cam.camera.orthoRight = this.gestureSession.ortho.right / pinch;
            this.cam.camera.orthoTop = this.gestureSession.ortho.top / pinch;
            this.cam.camera.orthoBottom = this.gestureSession.ortho.bottom / pinch;

            // Hammer's rotation is clockwise on screen, and a larger roll turns the drawing
            // clockwise: the drawing turns with the fingers. Hammer gives the angle unwrapped
            // (360 when the second finger lands), so the turn is taken the short way round.
            const turnDeg = ev.rotation - this.gestureSession.startRotDeg;
            const rotRad = ((((turnDeg % 360) + 540) % 360) - 180) * (Math.PI / 180);
            this.cam.camera.rotation.z = this.gestureSession.rotation + rotRad;
            this.cam.onReaderMove?.();
        });

        this.hammer.on("panend pinchend rotateend pancancel pinchcancel rotatecancel", () => {
            this.endDrag();
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

        this.canvas.addEventListener("keydown", this.keyDownHandler);
        this.canvas.addEventListener("keyup", this.keyUpHandler);
        this.canvas.addEventListener("blur", this.releaseKeys);
        document.addEventListener("visibilitychange", this.releaseKeys);

        // Setup mouse and touch handlers (these are removed in disable())
        this.setupMouse();
        this.setupTouch();
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

        this.canvas.removeEventListener("keydown", this.keyDownHandler);
        this.canvas.removeEventListener("keyup", this.keyUpHandler);
        this.canvas.removeEventListener("blur", this.releaseKeys);
        document.removeEventListener("visibilitychange", this.releaseKeys);
        this.releaseKeys();

        // Remove scene observable subscriptions
        if (this.pointerObserverHandle !== null) {
            this.cam.scene.onPointerObservable.remove(this.pointerObserverHandle);
            this.pointerObserverHandle = null;
        }

        if (this.prePointerObserverHandle !== null) {
            this.cam.scene.onPrePointerObservable.remove(this.prePointerObserverHandle);
            this.prePointerObserverHandle = null;
        }

        // Destroy Hammer.js instance
        if (this.hammer) {
            this.hammer.destroy();
            this.hammer = null;
        }

        // Clear gesture session
        this.gestureSession = null;
        // Input taken away (a node drag, another camera) ends nothing a reader can finish.
        this.dragKind = null;
        this.keyKind = null;
        this.wheelRun.reset();
    }

    /**
     * Applies keyboard input to camera velocity for inertia-based movement.
     * Processes WASD and arrow key presses.
     * @param frames - How many nominal 60 Hz frames this pass stands for; see `nominalFrames`.
     */
    public applyKeyboardInertia(frames = 1): void {
        if (!this.enabled) {
            return;
        }

        const v = this.cam.velocity;
        const c = this.config;
        const before = v.x + v.y + v.zoom + v.rotate;
        const on = (action: CanvasKeyAction): boolean => this.held.has(action) || this.tapped.has(action);
        // The velocity is damped every frame, so a held key settles at push / (1 - damping).
        // Scaling the push by (1 - damping) makes a held key zoom and turn by the configured
        // amount per frame, rather than many times it.
        // The pan push is a share of the view, so a held key crosses the view in the same time at any
        // zoom: in world units it would crawl across a large graph's wide view.
        const panPush = c.panAcceleration * this.cam.halfWidth * frames;
        const zoomPush = c.zoomFactorPerFrame * (1 - c.zoomDamping) * frames;
        const rotatePush = c.rotateSpeedPerFrame * (1 - c.rotateDamping) * frames;

        if (on("pan-up")) {
            v.y += panPush;
        }

        if (on("pan-down")) {
            v.y -= panPush;
        }

        if (on("pan-left")) {
            v.x -= panPush;
        }

        if (on("pan-right")) {
            v.x += panPush;
        }

        if (on("zoom-in")) {
            v.zoom -= zoomPush;
        }

        if (on("zoom-out")) {
            v.zoom += zoomPush;
        }

        if (on("roll-left")) {
            v.rotate += rotatePush;
        }

        if (on("roll-right")) {
            v.rotate -= rotatePush;
        }

        this.noteKeyGesture(on);
        this.tapped.clear();

        if (v.x + v.y + v.zoom + v.rotate !== before) {
            this.cam.onReaderMove?.();
        }
    }

    /**
     * Record what the camera keys on this frame do to the key gesture under way: a roll makes it
     * an orbit, a pan a pan unless it already turned, a zoom alone a zoom.
     * @param on - Whether an action's key is on this frame.
     */
    private noteKeyGesture(on: (action: CanvasKeyAction) => boolean): void {
        const pans = on("pan-up") || on("pan-down") || on("pan-left") || on("pan-right");
        if (on("roll-left") || on("roll-right")) {
            this.keyKind = "orbit";
        } else if (pans) {
            this.keyKind = this.keyKind === "orbit" ? "orbit" : "pan";
        } else if (on("zoom-in") || on("zoom-out")) {
            this.keyKind ??= "zoom";
        }
    }

    /**
     * Updates camera based on keyboard input and applies inertia.
     * Should be called each frame in the render loop.
     * @param frameMs - The frame's time, so the camera moves and coasts for the same time however
     *   fast frames are drawn; 0 (a hand-pumped pass) counts as one nominal 60 Hz frame.
     */
    public update(frameMs = 0): void {
        const frames = nominalFrames(frameMs);
        this.applyKeyboardInertia(frames);
        this.cam.applyInertia(frames);
        if (!this.enabled) {
            return;
        }

        // A key gesture ends once no camera key is held and the inertia it gave has damped to
        // rest; a key pressed before then continues it.
        const v = this.cam.velocity;
        if (this.keyKind !== null && this.held.size === 0 && v.x === 0 && v.y === 0 && v.zoom === 0 && v.rotate === 0) {
            const kind = this.keyKind;
            this.keyKind = null;
            this.onGestureEnd?.(kind);
        }

        if (this.wheelRun.frame(this.requestFrame)) {
            this.onGestureEnd?.("zoom");
        }
    }
}
