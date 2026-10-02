import {
    Color3,
    Color4,
    Engine,
    EngineStore,
    HemisphericLight,
    Logger,
    PhotoDome,
    Quaternion,
    Scene,
    Tools,
    TransformNode,
    Vector3,
    WebGPUEngine,
} from "@babylonjs/core";

import { CameraManager } from "../cameras/CameraManager";
import { OrbitCameraController } from "../cameras/OrbitCameraController";
import { OrbitInputController } from "../cameras/OrbitInputController";
import { TwoDCameraController } from "../cameras/TwoDCameraController";
import { InputController } from "../cameras/TwoDInputController";
import type { GraphBackgroundConfig } from "../config/GraphStyle";
import { reportCaught } from "../session/project/strict";
import type { EventManager } from "./EventManager";
import type { Manager } from "./interfaces";

/**
 * Configuration options for RenderManager
 */
interface RenderManagerConfig {
    /**
     * The engine to draw with, already initialised. Left out, a WebGL engine is built on the
     * canvas. A WebGPU engine has to be passed in: its initialisation is asynchronous and a scene
     * cannot be built on it before that finishes -- see {@link openWebGPUEngine}.
     */
    engine?: Engine | WebGPUEngine;
    backgroundColor?: string;
}

/** Which renderer a graph asks for: WebGL, WebGPU, or WebGPU when the browser has it. */
export type RendererRequest = "webgl" | "webgpu" | "auto";

/** The renderers a graph can be drawn with. */
export type ActiveRenderer = "webgl" | "webgpu";

/** Every value a {@link RendererRequest} can take, for validating a string from an attribute. */
export const RENDERER_REQUESTS: readonly RendererRequest[] = ["webgl", "webgpu", "auto"];

/**
 * Which renderer a graph is drawn with, and why when it is not the one asked for.
 */
export interface RendererStatus {
    /** What was asked for. */
    readonly requested: RendererRequest;
    /** What is drawing. */
    readonly active: ActiveRenderer;
    /**
     * Why WebGPU was asked for (`"webgpu"` or `"auto"`) and WebGL is drawing instead: the browser
     * has no `navigator.gpu`, or no adapter or device could be opened. Null when the renderer is
     * the one asked for, and under `"webgl"`.
     */
    readonly reason: string | null;
}

/** The two modules Babylon compiles a GLSL shader for WebGPU with. */
interface ShaderCompilers {
    readonly glslang: unknown;
    readonly twgsl: unknown;
}

/** The compilers once loaded; they are global to the page, so every graph shares one load. */
let shaderCompilers: Promise<ShaderCompilers> | null = null;

/**
 * Loads one compiler's script from Babylon's CDN and instantiates its WebAssembly.
 * @param name - Which compiler; its script defines a global of the same name.
 * @returns The instantiated compiler.
 */
async function loadCompiler(name: "glslang" | "twgsl"): Promise<unknown> {
    const base = `${Tools._DefaultCdnUrl}/${name}/${name}`;
    await Tools.LoadBabylonScriptAsync(`${base}.js`);
    const factory = (self as unknown as Record<string, ((wasmPath: string) => Promise<unknown>) | undefined>)[name];
    if (factory === undefined) {
        throw new Error(`${name}.js loaded but defined no ${name}`);
    }

    return factory(`${base}.wasm`);
}

/**
 * Forgets the loaded compilers, so the next WebGPU graph fetches them again. For the test that
 * refuses the fetch.
 * @internal
 */
export function forgetShaderCompilers(): void {
    shaderCompilers = null;
}

/**
 * Loads glslang and twgsl from Babylon's CDN, the files and paths Babylon itself would use.
 *
 * Loaded here rather than left to Babylon because Babylon's own load has no failure path: a
 * script that does not arrive leaves its promise unsettled and the shaders silently unbuilt.
 * @returns The two compilers, for `WebGPUEngine.initAsync`.
 */
async function loadShaderCompilers(): Promise<ShaderCompilers> {
    shaderCompilers ??= (async (): Promise<ShaderCompilers> => {
        // One after the other, in Babylon's order: loading twgsl's script before glslang has
        // instantiated makes glslang's WebAssembly fail to link.
        const glslang = await loadCompiler("glslang");
        const twgsl = await loadCompiler("twgsl");
        return { glslang, twgsl };
    })();

    try {
        return await shaderCompilers;
    } catch (error) {
        // A failed load is not remembered: the next graph asks the network again.
        shaderCompilers = null;
        throw error;
    }
}

/**
 * Opens a WebGPU engine on a canvas, or says why it cannot.
 *
 * This is capability detection, done once before the scene exists: a browser without WebGPU, or
 * one whose adapter or device cannot be opened, gets WebGL and the reason. Nothing switches
 * renderer once a frame has been drawn.
 * @param canvas - A canvas that has no context yet; a canvas holding a WebGL context cannot give
 *     out a WebGPU one.
 * @returns The initialised engine, or the reason there is none.
 */
export async function openWebGPUEngine(canvas: HTMLCanvasElement): Promise<WebGPUEngine | string> {
    if (typeof navigator === "undefined" || !("gpu" in navigator) || navigator.gpu === undefined) {
        return "this browser has no WebGPU (navigator.gpu is undefined)";
    }

    // Asked first, and apart from the engine: an engine that fails to open is half built, and it
    // has already registered itself as Babylon's last created engine.
    if ((await navigator.gpu.requestAdapter()) === null) {
        return "this browser has WebGPU but no adapter (navigator.gpu.requestAdapter() returned null)";
    }

    // The element's lines and arrow caps are GLSL shader materials. Babylon compiles GLSL for
    // WebGPU with glslang and twgsl, two WebAssembly modules it fetches from its CDN on the first
    // compile -- and until they arrive, or for ever when they cannot be fetched, every one of those
    // meshes is skipped and the frame is drawn without it. So they are fetched here, before the
    // scene exists, and a page that cannot reach them draws with WebGL instead.
    let compilers: ShaderCompilers;
    try {
        compilers = await loadShaderCompilers();
    } catch (error) {
        return (
            "WebGPU is available but the GLSL compiler it needs could not be loaded from " +
            `${Tools._DefaultCdnUrl}: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    const engine = new WebGPUEngine(canvas, { antialias: true });
    try {
        // glslang goes in as a promise: Babylon 8.43 calls `.then` on whatever `glslang` option it
        // is given, though its type and its docs ask for the instance itself.
        await engine.initAsync({ glslang: Promise.resolve(compilers.glslang) }, { twgsl: compilers.twgsl });
        return engine;
    } catch (error) {
        try {
            engine.dispose();
        } catch {
            // Disposing an engine that never opened reads state it never built.
        }

        const at = EngineStore.Instances.indexOf(engine);
        if (at !== -1) {
            EngineStore.Instances.splice(at, 1);
        }

        // Babylon rejects with a bare string when the device cannot be had.
        return `WebGPU could not be opened: ${error instanceof Error ? error.message : String(error)}`;
    }
}

/**
 * The name of the graph-root TransformNode used for XR gestures
 * Gestures (zoom, rotate, pan) manipulate this node to transform the entire graph
 */
const GRAPH_ROOT_NAME = "graph-root";

/** What the scene is cleared to when nothing names a colour. Whitesmoke. */
const DEFAULT_BACKGROUND_COLOR = "#F5F5F5";

/**
 * Manages Babylon.js scene, engine, and render loop
 */
export class RenderManager implements Manager {
    engine: Engine | WebGPUEngine;
    scene: Scene;
    camera: CameraManager;
    graphRoot: TransformNode;

    private renderLoopActive = false;
    private updateCallback?: (frameMs: number) => void;
    /** How many callers currently hold the frames back; see {@link holdFrames}. */
    private frameHolds = 0;
    private resizeHandler: () => void;
    /** The one skybox dome, and the image it shows; null while the background is a colour. */
    private dome: { readonly url: string; readonly dome: PhotoDome } | null = null;

    /**
     * Stands in for Babylon's own pointer handling, which calls preventDefault and then
     * `canvas.focus()` on every pointer down and up. That focus call scrolls the host page to the
     * canvas. This one does the same thing without scrolling.
     * @param evt - The pointer down or up event on the canvas
     */
    private focusOnPointer = (evt: PointerEvent): void => {
        evt.preventDefault();
        this.canvas.focus({ preventScroll: true });
    };

    /**
     * Creates a new render manager for Babylon.js scene and rendering
     * @param canvas - HTML canvas element for rendering
     * @param eventManager - Event manager for emitting render events
     * @param config - Optional render configuration
     */
    constructor(
        private canvas: HTMLCanvasElement,
        private eventManager: EventManager,
        private config: RenderManagerConfig = {},
    ) {
        // Set Babylon.js log level
        Logger.LogLevels = Logger.ErrorLogLevel;

        // Create engine
        this.engine =
            this.config.engine ??
            new Engine(this.canvas, true, {
                preserveDrawingBuffer: true, // Required for screenshots
            });

        // Create scene
        this.scene = new Scene(this.engine);
        this.scene.preventDefaultOnPointerDown = false;
        this.scene.preventDefaultOnPointerUp = false;
        this.canvas.addEventListener("pointerdown", this.focusOnPointer);
        this.canvas.addEventListener("pointerup", this.focusOnPointer);

        // Create graph-root transform node for XR gestures
        // All graph nodes will be parented to this, allowing gestures to transform the entire graph
        this.graphRoot = new TransformNode(GRAPH_ROOT_NAME, this.scene);
        this.graphRoot.position = Vector3.Zero();
        // Pre-initialize rotationQuaternion to avoid on-the-fly creation during first rotation
        // This ensures smooth transitions when XR gestures start applying rotations
        this.graphRoot.rotationQuaternion = Quaternion.Identity();

        // Setup resize handler
        this.resizeHandler = (): void => {
            this.engine.resize();
        };

        // Initialize camera manager
        this.camera = new CameraManager(this.scene);

        // Store camera manager in scene metadata for access by other components
        this.scene.metadata = this.scene.metadata ?? {};
        this.scene.metadata.cameraManager = this.camera;

        // Setup cameras
        this.setupCameras();

        // Setup lighting with ground color for fill from below
        const light = new HemisphericLight("light", new Vector3(1, 1, 0), this.scene);
        light.groundColor = new Color3(0.35, 0.35, 0.35);

        // Set background color
        const backgroundColor = this.config.backgroundColor ?? DEFAULT_BACKGROUND_COLOR;
        this.scene.clearColor = Color4.FromHexString(backgroundColor);
    }

    /**
     * Initialize the render manager and Babylon.js engine
     */
    async init(): Promise<void> {
        try {
            // Wait for scene to be ready
            await this.scene.whenReadyAsync();

            // Start listening for resize events
            window.addEventListener("resize", this.resizeHandler);

            // Emit success event
            this.eventManager.emitGraphEvent("render-initialized", {
                engine: this.engine,
                scene: this.scene,
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.eventManager.emitGraphError(null, err, "init", { component: "RenderManager" });
            throw new Error(`Failed to initialize RenderManager: ${err.message}`);
        }
    }

    /**
     * Dispose the render manager and clean up resources
     */
    dispose(): void {
        // Stop render loop
        this.stopRenderLoop();

        // Remove resize listener
        window.removeEventListener("resize", this.resizeHandler);
        this.canvas.removeEventListener("pointerdown", this.focusOnPointer);
        this.canvas.removeEventListener("pointerup", this.focusOnPointer);

        // Dispose camera system
        this.camera.dispose();

        // Dispose scene and engine
        this.scene.dispose();
        this.engine.dispose();
    }

    /**
     * Start the render loop with the provided update callback
     * @param updateCallback - Function to call before each render frame, given how long the frame
     *     before it took in milliseconds (0 on the first)
     */
    startRenderLoop(updateCallback: (frameMs: number) => void): void {
        if (this.renderLoopActive) {
            return;
        }

        this.updateCallback = updateCallback;
        this.renderLoopActive = true;

        this.engine.runRenderLoop(() => {
            // A held frame is skipped whole: no update, no draw. The loop itself keeps ticking so
            // nothing has to be restarted, and a tick that does nothing costs nothing.
            if (this.frameHolds > 0) {
                return;
            }

            try {
                // Call update callback
                if (this.updateCallback) {
                    this.updateCallback(this.engine.getDeltaTime());
                }

                // Update camera - NOTE: This might be redundant with UpdateManager.update()
                // this.camera.update() is already called in UpdateManager.update()
                // Commenting out to avoid double updates
                // this.camera.update();

                // Render scene
                this.scene.render();
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                this.eventManager.emitGraphError(null, err, "other", {
                    component: "RenderManager",
                    phase: "render-loop",
                });

                // Don't stop render loop on error, but log it
                console.error("Error in render loop:", error);
                reportCaught(error);
            }
        });
    }

    /**
     * Stop the render loop
     */
    stopRenderLoop(): void {
        if (!this.renderLoopActive) {
            return;
        }

        this.renderLoopActive = false;
        this.engine.stopRenderLoop();
        this.updateCallback = undefined;
    }

    /**
     * Keeps the render loop from drawing until the returned function is called.
     *
     * A FRAME IS WHAT A GPU READBACK WAITS BEHIND. Drawing a scene of thousands of meshes keeps
     * the main thread for tens to hundreds of milliseconds, and a promise the GPU resolves --
     * the mapped buffer at the end of a traversal, the frontier count between its levels -- is
     * delivered as a task, which cannot run until the frame that was drawing has finished. A
     * breadth-first search that costs 7 ms on the device came back after 225 ms through the
     * element at 1,000 nodes and after 8.6 s at 10,000, two frames per readback (issue #390).
     * Measured apart, the CPU update of a frame is 2.5 ms and is not what the readback waits on;
     * the draw is 48 ms at 1,000 nodes and is.
     *
     * So a call-shaped accelerated run holds the frames for as long as it is on the device, and
     * the picture stands still for those milliseconds instead of the run stretching to seconds.
     * Holds nest: the frames resume when the last holder releases, and releasing twice is a
     * no-op, so a `finally` cannot over-release.
     * @returns Releases this hold.
     */
    holdFrames(): () => void {
        this.frameHolds++;
        let released = false;

        return (): void => {
            if (released) {
                return;
            }

            released = true;
            this.frameHolds--;
        };
    }

    /**
     * Draw the graph against a background: a clear colour, or a photo-dome skybox.
     *
     * The scene holds at most one dome. A colour disposes it; a different skybox replaces it; the
     * skybox already shown is left alone, so drawing the same background again (a redo, a repeat)
     * builds nothing.
     * @param background - The background, parsed.
     * @param onSkyboxLoaded - Called with the image once a new skybox's texture has arrived.
     */
    applyBackground(background: GraphBackgroundConfig, onSkyboxLoaded: (url: string) => void): void {
        if (background.backgroundType === "skybox") {
            const url = background.data;
            if (this.dome?.url === url) {
                return;
            }

            this.dome?.dome.dispose();
            const dome = new PhotoDome("testdome", url, { resolution: 32, size: 500 }, this.scene);
            dome.texture.onLoadObservable.addOnce(() => {
                onSkyboxLoaded(url);
            });
            this.dome = { url, dome };
            return;
        }

        this.dome?.dome.dispose();
        this.dome = null;
        this.setBackgroundColor(background.color ?? DEFAULT_BACKGROUND_COLOR);
    }

    /**
     * Update the background color
     * @param color - Hex color string (e.g., "#FFFFFF")
     */
    private setBackgroundColor(color: string): void {
        try {
            this.scene.clearColor = Color4.FromHexString(color);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.eventManager.emitGraphError(null, err, "other", {
                component: "RenderManager",
                operation: "setBackgroundColor",
                color,
            });
        }
    }

    /**
     * Get current render statistics
     * @returns Current FPS and active mesh count
     */
    getRenderStats(): {
        fps: number;
        activeMeshes: number;
    } {
        return {
            fps: this.engine.getFps(),
            activeMeshes: this.scene.getActiveMeshes().length,
        };
    }

    /**
     * Setup camera configurations
     */
    private setupCameras(): void {
        const orbitCamera = new OrbitCameraController(this.canvas, this.scene, {
            trackballRotationSpeed: 0.005,
            keyboardRotationSpeed: 0.03,
            keyboardZoomSpeed: 0.2,
            keyboardYawSpeed: 0.02,
            pinchZoomSensitivity: 10,
            twistYawSensitivity: 1.5,
            minZoomDistance: 2,
            maxZoomDistance: 2000, // The zoom-out ceiling for a small graph; a fit of a larger one raises it
            inertiaDamping: 0.9,
        });
        const orbitInput = new OrbitInputController(this.canvas, orbitCamera);
        this.camera.registerCamera("orbit", orbitCamera, orbitInput);

        const twoDCamera = new TwoDCameraController(this.scene, this.engine, this.canvas, {
            panAcceleration: 0.02,
            panDamping: 0.85,
            zoomFactorPerFrame: 0.02,
            zoomDamping: 0.85,
            zoomMin: 0.1,
            zoomMax: 500,
            rotateSpeedPerFrame: 0.02,
            rotateDamping: 0.85,
            rotateMin: null,
            rotateMax: null,
            mousePanScale: 1.0,
            mouseWheelZoomSpeed: 1.1,
            touchPanScale: 1.0,
            touchPinchMin: 0.1,
            touchPinchMax: 100,
            initialOrthoSize: 5,
            rotationEnabled: true,
            inertiaEnabled: true,
        });
        const twoDInput = new InputController(twoDCamera, this.canvas, {
            panAcceleration: 0.02,
            panDamping: 0.85,
            zoomFactorPerFrame: 0.02,
            zoomDamping: 0.85,
            zoomMin: 0.1,
            zoomMax: 100,
            rotateSpeedPerFrame: 0.02,
            rotateDamping: 0.85,
            rotateMin: null,
            rotateMax: null,
            mousePanScale: 1.0,
            mouseWheelZoomSpeed: 1.1,
            touchPanScale: 1.0,
            touchPinchMin: 0.1,
            touchPinchMax: 100,
            initialOrthoSize: 5,
            rotationEnabled: true,
            inertiaEnabled: true,
        });
        this.camera.registerCamera("2d", twoDCamera, twoDInput);
        this.camera.activateCamera("orbit");
    }
}
