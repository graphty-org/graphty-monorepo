// TwoDInputController.ts
import { type Observer, PointerEventTypes, type PointerInfo, type PointerInfoPre } from "@babylonjs/core";
import Hammer from "hammerjs";

import { type CanvasKeyAction, canvasKeyAction } from "../catalog/canvasKeys";
import { firstSight } from "../input/first-sight";
import { TwoDCameraController, TwoDCameraControlsConfigType } from "./TwoDCameraController";

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
export class InputController {
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

        this.pointerObserverHandle = this.cam.scene.onPointerObservable.add((pi) => {
            const e = pi.event as PointerEvent;

            switch (pi.type) {
                case PointerEventTypes.POINTERDOWN:
                    isPanning = true;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    this.pointerDownHandler();
                    break;

                case PointerEventTypes.POINTERUP:
                    isPanning = false;
                    break;

                case PointerEventTypes.POINTERMOVE:
                    if (isPanning && e.buttons === 1) {
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

                        const dx = e.clientX - lastX;
                        const dy = e.clientY - lastY;

                        this.cam.pan(-dx * scaleX * this.config.mousePanScale, dy * scaleY * this.config.mousePanScale);

                        lastX = e.clientX;
                        lastY = e.clientY;
                    }

                    break;

                default:
                    break;
            }
        });

        const newWheel = firstSight();
        this.prePointerObserverHandle = this.cam.scene.onPrePointerObservable.add((pi) => {
            const e = pi.event as WheelEvent;
            if (pi.type === PointerEventTypes.POINTERWHEEL && newWheel(e)) {
                const delta = e.deltaY > 0 ? this.config.mouseWheelZoomSpeed : 1 / this.config.mouseWheelZoomSpeed;
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

    private setupTouch(): void {
        this.hammer = new Hammer.Manager(this.canvas);
        const pan = new Hammer.Pan({ threshold: 0, pointers: 0 });
        const pinch = new Hammer.Pinch();
        const rotate = new Hammer.Rotate();

        this.hammer.add([pan, pinch, rotate]);
        this.hammer.get("pinch").recognizeWith(this.hammer.get("rotate"));
        this.hammer.get("pan").requireFailure(this.hammer.get("pinch"));

        this.hammer.on("panstart pinchstart rotatestart", (ev) => {
            this.gestureSession = {
                panX: ev.center.x,
                panY: ev.center.y,
                panStartX: this.cam.camera.position.x,
                panStartY: this.cam.camera.position.y,
                ortho: {
                    left: this.cam.camera.orthoLeft ?? 1,
                    right: this.cam.camera.orthoRight ?? 1,
                    top: this.cam.camera.orthoTop ?? 1,
                    bottom: this.cam.camera.orthoBottom ?? 1,
                },
                scale: ev.scale || 1,
                rotation: this.cam.parent.rotation.z,
                startRotDeg: ev.rotation || 0,
            };
        });

        this.hammer.on("panmove pinchmove rotatemove", (ev) => {
            if (!this.gestureSession) {
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

            const dx = ev.center.x - this.gestureSession.panX;
            const dy = ev.center.y - this.gestureSession.panY;

            this.cam.camera.position.x = this.gestureSession.panStartX - dx * scaleX * this.config.touchPanScale;
            this.cam.camera.position.y = this.gestureSession.panStartY + dy * scaleY * this.config.touchPanScale;

            const pinch = (ev.scale || 1) / this.gestureSession.scale;
            this.cam.camera.orthoLeft = this.gestureSession.ortho.left / pinch;
            this.cam.camera.orthoRight = this.gestureSession.ortho.right / pinch;
            this.cam.camera.orthoTop = this.gestureSession.ortho.top / pinch;
            this.cam.camera.orthoBottom = this.gestureSession.ortho.bottom / pinch;

            const rotRad = (-(ev.rotation - this.gestureSession.startRotDeg) * Math.PI) / 180;
            this.cam.parent.rotation.z = this.gestureSession.rotation + rotRad;
            this.cam.onReaderMove?.();
        });

        this.hammer.on("panend pinchend rotateend", () => {
            this.gestureSession = null;
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
    }

    /**
     * Applies keyboard input to camera velocity for inertia-based movement.
     * Processes WASD and arrow key presses.
     */
    public applyKeyboardInertia(): void {
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
        const zoomPush = c.zoomFactorPerFrame * (1 - c.zoomDamping);
        const rotatePush = c.rotateSpeedPerFrame * (1 - c.rotateDamping);

        if (on("pan-up")) {
            v.y += c.panAcceleration;
        }

        if (on("pan-down")) {
            v.y -= c.panAcceleration;
        }

        if (on("pan-left")) {
            v.x -= c.panAcceleration;
        }

        if (on("pan-right")) {
            v.x += c.panAcceleration;
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

        this.tapped.clear();

        if (v.x + v.y + v.zoom + v.rotate !== before) {
            this.cam.onReaderMove?.();
        }
    }

    /**
     * Updates camera based on keyboard input and applies inertia.
     * Should be called each frame in the render loop.
     */
    public update(): void {
        this.applyKeyboardInertia();
        this.cam.applyInertia();
    }
}
