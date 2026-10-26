import {
    Color3,
    Color4,
    DirectionalLight,
    Engine,
    EngineStore,
    HemisphericLight,
    Logger,
    Material,
    NullEngine,
    PhotoDome,
    Quaternion,
    Scene,
    Tools,
    TransformNode,
    Vector3,
    WebGPUEngine,
    WebXRState,
} from "@babylonjs/core";

import { FLAT_HALF_WIDTH_AT_ZOOM_ONE } from "../camera/builtins";
import { CameraManager } from "../cameras/CameraManager";
import { OrbitCameraController } from "../cameras/OrbitCameraController";
import { OrbitInputController } from "../cameras/OrbitInputController";
import { TwoDCameraController } from "../cameras/TwoDCameraController";
import { InputController } from "../cameras/TwoDInputController";
import { DEFAULT_BACKGROUND_COLOR, type GraphBackgroundConfig } from "../config/GraphStyle";
import { DEFAULT_LIGHTING, type Lighting } from "../config/Lighting";
import { GraphtyLogger } from "../logging";
import { useBundledStandardShaders } from "../meshes/bundledStandardShaders";
import { batchUploadFrames } from "../meshes/FrameRoster";
import { isNodeMaterial, lightNodeMaterial, outlineNodeMesh } from "../meshes/NodeLighting";
import { reportCaught } from "../session/project/strict";
import type { EventManager } from "./EventManager";
import { everyFrameAnimationsOn } from "./everyFrameAnimations";
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
    /**
     * Asked after each update pass: true when the element's own model says the picture on screen
     * is final, so the loop may skip drawing a frame that would be the same picture again. Left
     * out, every tick draws. See `RenderManager.mayRest`.
     */
    pictureIsFinal?: () => boolean;
    /**
     * Whether drawing on demand is switched on. While it is not, the loop draws every tick and
     * does none of the bookkeeping drawing on demand needs. Left out, it is off.
     */
    drawsOnDemand?: () => boolean;
    /** See {@link RenderManager.setPixelRatio}. Left out, 1. */
    pixelRatio?: PixelRatio;
}

/**
 * How many drawing-buffer pixels the canvas has per CSS pixel: a number, or `"device"` for the
 * screen's own `devicePixelRatio`, followed as it changes.
 */
export type PixelRatio = number | "device";

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
    /**
     * Whether anything is drawn. False when the browser gave the page no working WebGL context:
     * the graph's data, its session and autosave still work, and the canvas stays empty. The log
     * records it as `E_NO_WEBGL`.
     * @since 3.29.0
     */
    readonly drawing: boolean;
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
    const factory = (globalThis as unknown as Record<string, ((wasmPath: string) => Promise<unknown>) | undefined>)[
        name
    ];
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
 * A WebGL engine and its scene, or -- when the browser gives the page no working WebGL context (none
 * at all, or one whose GPU process keeps crashing, as Safari on iOS ends up) -- Babylon's
 * NullEngine, which draws nothing. Without it the element could not be built at all, so the graph's
 * data, its session and the work autosave kept would not load either; with it only the picture is
 * missing, which the log reports as E_NO_WEBGL.
 * @param canvas - The element's canvas.
 * @returns The engine and the scene.
 */
function openWebGL(canvas: HTMLCanvasElement): { engine: Engine; scene: Scene } {
    let engine: Engine | undefined;
    try {
        engine = new Engine(canvas, true, {
            preserveDrawingBuffer: true, // Required for screenshots
        });
        return { engine, scene: new Scene(engine) };
    } catch (error) {
        try {
            engine?.dispose();
        } catch {
            // An engine whose context failed cannot always release what it never built.
        }

        GraphtyLogger.getLogger(["graphty", "render"]).error(
            "E_NO_WEBGL: no WebGL context could be used, so nothing is drawn; the data and the session still work",
            error instanceof Error ? error : undefined,
            { code: "E_NO_WEBGL", reason: error instanceof Error ? error.message : String(error) },
        );
        const fallback = new NullEngine();
        return { engine: fallback, scene: new Scene(fallback) };
    }
}

/**
 * The name of the graph-root TransformNode used for XR gestures
 * Gestures (zoom, rotate, pan) manipulate this node to transform the entire graph
 */
const GRAPH_ROOT_NAME = "graph-root";

/** How often a disposed graph checks whether the GPU has finished its last frames. */
const RELEASE_POLL_MS = 16;

/**
 * Gives a disposed graph's WebGL context back to the browser, once the GPU has finished with it.
 *
 * Kept until garbage collection instead, a page that creates and disposes graphs runs into
 * Chrome's limit on live contexts (16) and has its oldest LIVE context evicted. But
 * `loseContext()` is a synchronization point: it blocks the page until the GPU has drawn every
 * frame still queued for the context. On a software GPU a graph of 1000 labels that was drawn
 * faster than SwiftShader keeps up with leaves minutes of frames queued, and losing the context
 * at once blocked `dispose()` for that long. So a fence goes in after the last command, and the
 * context is lost only once the fence has signalled, which costs the page nothing.
 * @param gl - The context of an engine that has just been disposed.
 */
function releaseWhenIdle(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    const lose = (): void => {
        if (!gl.isContextLost()) {
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
    };

    if (gl.isContextLost() || !("fenceSync" in gl)) {
        lose();
        return;
    }

    const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = (): void => {
        // A lost context answers null rather than a status, which also ends the wait.
        if (fence !== null && !gl.isContextLost() && gl.getSyncParameter(fence, gl.SYNC_STATUS) === gl.UNSIGNALED) {
            setTimeout(poll, RELEASE_POLL_MS);
            return;
        }

        if (fence !== null && !gl.isContextLost()) {
            gl.deleteSync(fence);
        }

        lose();
    };
    poll();
}

/** Events that say nothing about the picture, so they do not ask a resting loop to draw. */
const EVENTS_THAT_DRAW_NOTHING: ReadonlySet<string> = new Set(["graph-frame-stable", "stats-update"]);

/**
 * The canvas events after which the next frame may differ: what a reader does, and the GL context
 * coming back, which leaves the canvas empty. The last is a DOM listener, removed on dispose,
 * rather than an observer on the engine's `onContextRestoredObservable`: Babylon never clears that
 * observable when the engine is disposed, so the observer kept every disposed graph's scene
 * alive, and a browser test shard that builds hundreds of graphs slowed until it timed out.
 */
const READER_INPUT_EVENTS = [
    "pointerdown",
    "pointermove",
    "pointerup",
    "wheel",
    "keydown",
    "keyup",
    "webglcontextrestored",
] as const;

/**
 * The lights of each {@link Lighting}: the hemispheric fill's intensity and ground color (its sky
 * is white, toward +x+y), and the key light's intensity and direction in camera space.
 *
 * - studio: fill 0.45 and key 0.55 from above-right of the camera, plus the node rim (NodeLighting).
 *   Measured: no pixel clipped to white, brightest 1.13x the style lightness, median 0.88x, sphere
 *   lightness spread 0.282.
 * - headlight: fill 0.4 with a lighter ground, and a 0.45 light from just beside the camera.
 *   Brightest 0.99x the style lightness, median 0.88x, spread 0.226.
 * - matte: fill 0.8 alone. Brightest 1.00x, median 0.81x, spread 0.179.
 * - flat: nodes are unlit (NodeLighting); the fill stays for anything else lit in the scene.
 */
const LIGHTS: Record<Lighting, { fill: number; ground: number; key: number; keyDirection: Vector3 }> = {
    studio: { fill: 0.45, ground: 0.35, key: 0.55, keyDirection: new Vector3(0.6, -0.6, 1) },
    headlight: { fill: 0.4, ground: 0.65, key: 0.45, keyDirection: new Vector3(0.25, -0.3, 1) },
    matte: { fill: 0.8, ground: 0.35, key: 0, keyDirection: new Vector3(0, 0, 1) },
    flat: { fill: 0.8, ground: 0.35, key: 0, keyDirection: new Vector3(0, 0, 1) },
};

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
    /** A fence after the last frame drawn, until the GPU has finished it; see {@link gpuBehind}. */
    private lastFrameFence: WebGLSync | null = null;
    /** The time of the ticks skipped since the last frame drawn, for the GPU to catch up. */
    private skippedMs = 0;
    /**
     * What the loop's ticks have done since it started, outside a hold: drew a frame, rested on
     * the picture already shown, or waited for the GPU. A count of the loop's chances to draw, for
     * whoever must tell "it drew nothing" from "it had no chance to" -- a test of drawing on
     * demand, on a machine whose frame rate it does not control. A frame drawn at once for a
     * resize (`drawNow`) counts as drawn.
     */
    readonly ticks = { drawn: 0, rested: 0, gpuBehind: 0 };
    /** See `RenderManagerConfig.pictureIsFinal`; null draws every tick. */
    private readonly pictureIsFinal: (() => boolean) | null;
    /** See `RenderManagerConfig.drawsOnDemand`. */
    private readonly drawsOnDemand: () => boolean;
    /** Set by anything that may have changed the picture since the last frame drawn. */
    private drawOwed = true;
    /**
     * While it answers true, a tick runs its update but draws nothing: set by the graph while an
     * element built from the defaults waits for its style to be drawn, so no frame shows it in
     * them. The update still runs, so the frame that applies the style is the one drawn.
     * @internal
     */
    drawHeld: (() => boolean) | null = null;
    /** What the last frame drawn left behind; see {@link RenderManager.sameAsDrawn}. */
    private readonly drawnFrom = {
        view: new Float32Array(16),
        projection: new Float32Array(16),
        camera: -1,
        width: -1,
        height: -1,
        clear: new Float32Array(4),
        observers: [] as readonly unknown[],
        contents: [] as unknown[],
    };
    /** The hemispheric fill light; see {@link applyLighting}. */
    private readonly hemi: HemisphericLight;
    /** The key (or head) light, a directional light that turns with the camera. */
    private readonly key: DirectionalLight;
    /** The key light's direction in camera space (x right, y up, z forward). */
    private readonly keyInCameraSpace = new Vector3(0, 0, 1);
    /** Whether the last frame drawn left the camera, size or background other than the one before. */
    private lastFrameMoved = true;
    private readonly owe = (): void => {
        this.drawOwed = true;
    };
    /**
     * Forgets the last frame's fence when the GL context is lost or given back. A fence made by
     * the lost context never signals in the restored one, so kept, it held every tick in
     * {@link gpuBehind} and the graph was never drawn again (iPad Safari takes the context from a
     * tab in the background). A restore also has the edge and arrow batches upload every slot
     * again on the next frame, because Babylon gives their buffers back empty.
     * @param event - The canvas's `webglcontextlost` or `webglcontextrestored` event.
     */
    private readonly dropFence = (event: Event): void => {
        this.lastFrameFence = null;
        this.drawOwed = true;
        if (event.type === "webglcontextrestored") {
            batchUploadFrames.contextRestored(this.scene);
        }
    };
    /**
     * Set when the scene gained or lost something it draws with, and cleared by the first frame
     * drawn with the whole scene ready. A frame skips a mesh whose shader has not compiled yet, so
     * one frame after such a change can leave the new thing off the canvas.
     */
    private sceneChanged = false;
    /** Whether a shader was still on its way when the loop last looked; see `mayRest`. */
    private effectsPending = false;
    /** Scratch for {@link RenderManager.sameContents}. */
    private readonly contentsNow: unknown[] = [];
    /** What the scene held as the frame being drawn began; see {@link readyToDrawChange}. */
    private readonly contentsAtDraw: unknown[] = [];
    private readonly oweForEvent = (event: { readonly type: string }): void => {
        if (!EVENTS_THAT_DRAW_NOTHING.has(event.type)) {
            this.drawOwed = true;
        }
    };
    private readonly resizeHandler: () => void;
    /** The one skybox dome, and the image it shows; null while the background is a colour. */
    private dome: { readonly url: string; readonly dome: PhotoDome } | null = null;

    /**
     * Stands in for Babylon's own pointer handling, which calls preventDefault and then
     * `canvas.focus()` on every pointer down and up. That focus call scrolls the host page to the
     * canvas; this one focuses without scrolling. It does not cancel the event: a canceled
     * pointerdown suppresses the browser's mousedown and mouseup, so a host page's popover or menu
     * that closes on a mouse press outside it never saw a press on the drawing. The canvas's
     * `user-select: none` keeps a drag from selecting page text instead.
     *
     * NO FOCUS RING FOR A POINTER. Focus given by script is shown with a ring whenever the browser
     * thinks the reader is on the keyboard -- after a key press, or on a page nothing had focused
     * yet -- so turning the graph with the mouse outlined the whole canvas in blue. Focus that came
     * from a pointer hides the outline until the canvas loses focus or a key is pressed in it (the
     * reader is on the keyboard then); focus that comes any other way (Tab, a key, the page's
     * script) keeps the browser's own `:focus-visible` ring.
     */
    private readonly focusOnPointer = (): void => {
        this.canvas.style.outline = "none";
        this.canvas.focus({ preventScroll: true });
    };

    /** The canvas lost focus, or took a key: from now on it shows the browser's ring. */
    private readonly restoreFocusRing = (): void => {
        this.canvas.style.outline = "";
    };

    /**
     * Creates a new render manager for Babylon.js scene and rendering
     * @param canvas - HTML canvas element for rendering
     * @param eventManager - Event manager for emitting render events
     * @param config - Optional render configuration
     */
    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly eventManager: EventManager,
        private readonly config: RenderManagerConfig = {},
    ) {
        // Set Babylon.js log level
        Logger.LogLevels = Logger.ErrorLogLevel;
        this.pictureIsFinal = this.config.pictureIsFinal ?? null;
        this.drawsOnDemand = this.config.drawsOnDemand ?? ((): boolean => false);

        if (this.config.engine === undefined) {
            ({ engine: this.engine, scene: this.scene } = openWebGL(this.canvas));
        } else {
            this.engine = this.config.engine;
            this.scene = new Scene(this.engine);
        }

        useBundledStandardShaders(this.scene);
        this.scene.preventDefaultOnPointerDown = false;
        this.scene.preventDefaultOnPointerUp = false;
        this.canvas.addEventListener("pointerdown", this.focusOnPointer);
        this.canvas.addEventListener("pointerup", this.focusOnPointer);
        this.canvas.addEventListener("blur", this.restoreFocusRing);
        this.canvas.addEventListener("keydown", this.restoreFocusRing);
        for (const type of READER_INPUT_EVENTS) {
            this.canvas.addEventListener(type, this.owe, { passive: true });
        }
        this.canvas.addEventListener("webglcontextlost", this.dropFence);
        this.canvas.addEventListener("webglcontextrestored", this.dropFence);
        this.eventManager.onGraphEvent.add(this.oweForEvent);
        // Assigning the canvas's size clears its drawing, even when a resize ends at the size the
        // last frame was drawn at, so every resize owes a frame.
        this.engine.onResizeObservable.add(this.owe);

        // Create graph-root transform node for XR gestures
        // All graph nodes will be parented to this, allowing gestures to transform the entire graph
        this.graphRoot = new TransformNode(GRAPH_ROOT_NAME, this.scene);
        this.graphRoot.position = Vector3.Zero();
        // Pre-initialize rotationQuaternion to avoid on-the-fly creation during first rotation
        // This ensures smooth transitions when XR gestures start applying rotations
        this.graphRoot.rotationQuaternion = Quaternion.Identity();

        // Setup resize handler
        this.resizeHandler = (): void => {
            // The device ratio changes with the browser's zoom and the screen the window is on,
            // and both fire a resize.
            this.applyPixelRatio();
            this.resize();
        };
        this.pixelRatio = this.config.pixelRatio ?? 1;
        this.applyPixelRatio();

        // Initialize camera manager
        this.camera = new CameraManager(this.scene);

        // Store camera manager in scene metadata for access by other components
        this.scene.metadata = this.scene.metadata ?? {};
        this.scene.metadata.cameraManager = this.camera;

        // Setup cameras
        this.setupCameras();

        // Two lights at most, neither with any specular, so nothing a light adds is ever white: a
        // hemispheric fill from above, and a key that keeps its place relative to the camera.
        this.hemi = new HemisphericLight("light", new Vector3(1, 1, 0), this.scene);
        this.hemi.specular = Color3.Black();
        this.key = new DirectionalLight("key-light", new Vector3(0, 0, 1), this.scene);
        this.key.specular = Color3.Black();
        this.scene.onBeforeRenderObservable.add(() => {
            const camera = this.scene.activeCamera;
            if (camera) {
                this.key.direction = Vector3.TransformNormal(
                    this.keyInCameraSpace,
                    camera.getWorldMatrix(),
                ).normalize();
            }
        });
        this.applyLighting(DEFAULT_LIGHTING);

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
            this.eventManager.emit("render-initialized", {
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
        this.canvas.removeEventListener("blur", this.restoreFocusRing);
        this.canvas.removeEventListener("keydown", this.restoreFocusRing);
        for (const type of READER_INPUT_EVENTS) {
            this.canvas.removeEventListener(type, this.owe);
        }
        this.canvas.removeEventListener("webglcontextlost", this.dropFence);
        this.canvas.removeEventListener("webglcontextrestored", this.dropFence);
        this.eventManager.onGraphEvent.removeCallback(this.oweForEvent);
        this.engine.onResizeObservable.removeCallback(this.owe);

        // Dispose camera system
        this.camera.dispose();

        // Dispose scene and engine
        const gl = this.engine instanceof Engine ? (this.engine._gl as WebGLRenderingContext | undefined) : undefined;
        this.scene.dispose();
        this.engine.dispose();
        if (gl !== undefined) {
            releaseWhenIdle(gl);
        }
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

            // A tick skipped for the GPU still passed: the next frame's update is handed the
            // time of every tick since the last frame drawn, not only its own, or a layout that
            // keeps to wall-clock pace would run slower by exactly the ticks skipped.
            if (this.gpuBehind()) {
                this.skippedMs += this.engine.getDeltaTime();
                this.ticks.gpuBehind++;
                return;
            }

            const frameMs = this.engine.getDeltaTime() + this.skippedMs;
            this.skippedMs = 0;

            try {
                // Call update callback
                if (this.updateCallback) {
                    this.updateCallback(frameMs);
                }

                // Update camera - NOTE: This might be redundant with UpdateManager.update()
                // this.camera.update() is already called in UpdateManager.update()
                // Commenting out to avoid double updates
                // this.camera.update();

                if (this.drawHeld?.() === true) {
                    return;
                }

                if (this.mayRest()) {
                    this.ticks.rested++;
                    return;
                }

                this.drawFrame();
            } catch (error) {
                this.reportFrameError(error);
            }
        });
    }

    /** Draws one frame, for the loop's tick and for {@link drawNow}. */
    private drawFrame(): void {
        // Cleared BEFORE the frame, so anything the frame itself announces asks for the next one.
        this.drawOwed = false;
        const drawnReady = this.readyToDrawChange();
        this.scene.render();
        this.ticks.drawn++;
        this.fenceFrame();
        this.noteDrawnFrom(drawnReady);
    }

    /**
     * Reports what a frame threw, without stopping the loop.
     * @param error - What it threw.
     */
    private reportFrameError(error: unknown): void {
        const err = error instanceof Error ? error : new Error(String(error));
        this.eventManager.emitGraphError(null, err, "other", {
            component: "RenderManager",
            phase: "render-loop",
        });

        // Don't stop render loop on error, but log it
        console.error("Error in render loop:", error);
        reportCaught(error);
    }

    /**
     * Fits the drawing to the canvas's current size and, when that changed the size, draws it at
     * once, so the frame the page paints after a resize holds the graph rather than the canvas the
     * resize cleared. Every resize goes through here: the element's ResizeObserver and the
     * window's resize event alike, since either one can be the call that assigns the new size.
     * @internal
     */
    resize(): void {
        const width = this.engine.getRenderWidth();
        const height = this.engine.getRenderHeight();
        this.engine.resize();
        // The camera's projection follows the new aspect ratio before the frame is drawn.
        this.camera.onResize();
        // Only a canvas whose size changed was cleared; the observer's first delivery or a box
        // change that keeps the render size are not. An XR session draws in its own frames, so
        // nothing is drawn outside them.
        const resized = width !== this.engine.getRenderWidth() || height !== this.engine.getRenderHeight();
        const xrState: WebXRState | undefined = this.scene.metadata?.xrHelper?.baseExperience?.state;
        if (resized && (xrState === undefined || xrState === WebXRState.NOT_IN_XR)) {
            this.drawNow();
        }
    }

    /**
     * Draws a frame now, outside the loop, unless the loop is not running or frames are held.
     *
     * For the frame a resize is painted in. Assigning the canvas's size clears its drawing, and a
     * resize found by a ResizeObserver lands after the step's animation frames have run, so
     * without this the page paints that step with an empty canvas -- and a full-page screenshot,
     * which resizes the page, captures it (#3373). Drawn even while the GPU is still behind, every
     * time: a full-page screenshot shrinks the page and restores it in two quick steps, and when
     * the second resize was skipped to keep {@link gpuBehind}'s pacing, the screenshot caught the
     * cleared canvas and the graph was missing from it (#3704). A resize is delivered at most once
     * per rendering step, so this adds at most one frame per step past the pacing.
     *
     * Wrapped in the engine's frame, as Babylon's own loop wraps every tick: WebGPU submits what a
     * frame encoded only when the frame ends, and the frame observers fire as for any other frame.
     * @internal
     */
    drawNow(): void {
        if (!this.renderLoopActive || this.frameHolds > 0 || this.drawHeld?.() === true) {
            return;
        }

        this.engine.beginFrame();
        // The time since the last frame, which no update was handed; the loop's next update is.
        this.skippedMs += this.engine.getDeltaTime();
        try {
            this.drawFrame();
        } catch (error) {
            this.drawOwed = true;
            this.reportFrameError(error);
        } finally {
            this.engine.endFrame();
        }
    }

    /**
     * Whether the GPU is still drawing the last frame, so drawing another now would only queue it.
     *
     * Nothing else stops the loop from issuing frames faster than the GPU finishes them, and the
     * browser lets about twenty pile up. On a software GPU (SwiftShader, as every CI runner has)
     * a frame of 331 nodes and 362 edges costs 40 ms, so a still graph kept the GPU some 850 ms
     * behind, and everything that waits for the GPU -- a screenshot, a readback, the page's own
     * compositor -- waited behind those frames too. Under load that was more than 30 seconds.
     * Skipping a tick while the last frame is unfinished keeps the queue at one frame.
     * @returns True while the last frame's fence is unsignalled.
     */
    private gpuBehind(): boolean {
        if (this.lastFrameFence === null || !(this.engine instanceof Engine)) {
            return false;
        }

        const gl = this.engine._gl;
        // A lost context answers null rather than a status; drop the fence and draw.
        if (gl.getSyncParameter(this.lastFrameFence, gl.SYNC_STATUS) === gl.UNSIGNALED) {
            return true;
        }

        gl.deleteSync(this.lastFrameFence);
        this.lastFrameFence = null;
        return false;
    }

    /**
     * Marks the end of the frame just drawn, for {@link gpuBehind}. Only a WebGL 2 context has
     * fences; WebGPU and Babylon's NullEngine draw unpaced, as before.
     */
    private fenceFrame(): void {
        const gl = this.engine instanceof Engine ? (this.engine._gl as WebGL2RenderingContext | undefined) : undefined;
        if (typeof gl?.fenceSync !== "function") {
            return;
        }

        // A frame drawn by drawNow while the GPU was behind replaces a fence still unsignalled; the
        // newer one signals after it, so the older is no longer needed.
        if (this.lastFrameFence !== null) {
            gl.deleteSync(this.lastFrameFence);
        }

        this.lastFrameFence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    }

    /**
     * Asks the loop to draw the next frame even when the picture looks final.
     *
     * For a change the loop cannot see by itself: one that moves no node, queues no style work,
     * leaves the camera where it is and announces no event. A graph drawing every frame (the
     * default) needs none of this.
     */
    requestFrame(): void {
        this.drawOwed = true;
    }

    /** See {@link setPixelRatio}. */
    private pixelRatio: PixelRatio = 1;

    /**
     * Draws the canvas at this many pixels per CSS pixel. Every size the element measures on
     * screen (fit insets, label sizes, line widths, `nodeScreenPosition`) stays in CSS pixels;
     * only the sharpness changes, and the cost of each frame with it.
     * @param ratio - A positive number, or `"device"`; anything else is read as 1.
     */
    setPixelRatio(ratio: PixelRatio): void {
        this.pixelRatio = ratio;
        this.applyPixelRatio();
    }

    /** Sets the engine's hardware scaling level from {@link pixelRatio}, and owes a frame when it changed. */
    private applyPixelRatio(): void {
        const device = globalThis.devicePixelRatio;
        const wanted = this.pixelRatio === "device" ? device : this.pixelRatio;
        const ratio = typeof wanted === "number" && Number.isFinite(wanted) && wanted > 0 ? wanted : 1;
        const level = 1 / ratio;
        if (this.engine.getHardwareScalingLevel() !== level) {
            // Babylon resizes the drawing buffer to the canvas's CSS size over the level.
            this.engine.setHardwareScalingLevel(level);
            this.drawOwed = true;
        }
    }

    /**
     * What the scene holds, read cheaply: how many meshes, materials, textures, lights, cameras,
     * effect layers and post-processes, the newest of each of the first three (an added one is
     * appended, so a swap that keeps the count still shows), and the environment texture.
     *
     * The net under every code path that builds or disposes something the scene draws with: it
     * does not depend on that path remembering to ask for a frame, and it also sees such a change
     * made through `graph.scene` from outside. Babylon has no general "the scene changed" signal
     * -- a changed color or position marks nothing -- so changes to what already exists are
     * caught by the model's own stability, the element's events and the reader's input instead.
     *
     * Read only while drawing on demand is on, so it costs nothing when it is off; observers on
     * the scene's lists would run on every mesh built either way.
     * @param into - Where to write it, in a fixed order.
     */
    private readSceneContents(into: unknown[]): void {
        const { scene } = this;
        into[0] = scene.meshes.length;
        into[1] = scene.meshes.at(-1);
        into[2] = scene.materials.length;
        into[3] = scene.materials.at(-1);
        into[4] = scene.textures.length;
        into[5] = scene.textures.at(-1);
        into[6] = scene.lights.length;
        into[7] = scene.cameras.length;
        into[8] = scene.effectLayers.length;
        into[9] = scene.postProcesses.length;
        into[10] = scene.environmentTexture;
    }

    /**
     * Whether the scene holds what it held when the last frame was drawn.
     * @returns True when nothing was added or removed since.
     */
    private sameContents(): boolean {
        this.readSceneContents(this.contentsNow);
        return this.contentsNow.every((value, i) => value === this.drawnFrom.contents[i]);
    }

    /**
     * Whether this tick may skip drawing, because the frame would be the picture already on screen.
     *
     * A STILL GRAPH WAS DRAWN AGAIN ON EVERY ANIMATION FRAME. On a software GPU -- SwiftShader, as
     * every CI runner and every headless browser here has -- presenting a frame of even 20 nodes
     * costs the page tens of milliseconds of its main thread, and under load hundreds: a reader's
     * click waits behind those frames, and so does every test that clicks. Several elements on
     * one page (the app's real-element tests run their files side by side in one renderer) each
     * paid it on every frame, for a picture that was not changing (issue #1824).
     *
     * Only when `pictureIsFinal` says so, and then only while nothing the
     * model does not track can change the next frame: a Babylon animation or a texture still
     * loading (both advance only inside a frame), a shader still being fetched or compiled (it
     * arrives unannounced), a mesh, material or texture added and not yet
     * ready to draw, an every-frame animation, the reader's input on
     * the canvas, an event the element announced, a new callback waiting for the next frame, or
     * anything the last two frames drawn did not agree on -- the camera, the canvas size, the
     * background colour. The last is what keeps a camera gliding to rest: inertia moves it only
     * inside a frame, so the loop draws until a frame leaves it where the one before did.
     * @returns True when this tick draws nothing.
     */
    private mayRest(): boolean {
        if (
            this.pictureIsFinal === null ||
            !this.drawsOnDemand() ||
            this.drawOwed ||
            this.lastFrameMoved ||
            !this.pictureIsFinal()
        ) {
            return false;
        }

        if (
            everyFrameAnimationsOn(this.scene) > 0 ||
            this.scene.animatables.length > 0 ||
            this.scene.getWaitingItemsCount() > 0
        ) {
            return false;
        }

        // A shader still being fetched or compiled: the frame skips whatever is drawn with it,
        // silently, and nothing announces when it arrives. Drawn until it has, and once more; one
        // that never compiles keeps the loop drawing every frame, as with the option off.
        if (!this.engine.areAllEffectsReady()) {
            this.effectsPending = true;
            return false;
        }

        if (this.effectsPending) {
            this.effectsPending = false;
            return false;
        }

        if (!this.sameContents()) {
            this.sceneChanged = true;
        }

        // Asked only after a change to what the scene holds: the walk visits every mesh.
        if (this.sceneChanged) {
            this.sceneChanged = !this.scene.isReady();
            return false;
        }

        return this.sameAsDrawn();
    }

    /**
     * The newest callback on each frame observable. A wait for the next frame adds one, and an
     * added observer is appended, so a new newest one is a frame somebody is waiting for -- even
     * when a one-shot callback removed in the meantime leaves the count unchanged.
     * @returns The last observer of each, in a fixed order.
     */
    private newestFrameObservers(): readonly unknown[] {
        return [
            this.scene.onBeforeRenderObservable.observers.at(-1),
            this.scene.onAfterRenderObservable.observers.at(-1),
            this.engine.onBeginFrameObservable.observers.at(-1),
            this.engine.onEndFrameObservable.observers.at(-1),
        ];
    }

    /**
     * Whether everything the loop cannot learn from the model is as it was for the last frame drawn.
     * @returns True when the camera, size, background and frame observers are unchanged.
     */
    private sameAsDrawn(): boolean {
        const from = this.drawnFrom;
        const camera = this.scene.activeCamera;
        if (camera?.uniqueId !== from.camera) {
            return false;
        }

        const { clearColor } = this.scene;
        const observers = this.newestFrameObservers();
        return (
            this.engine.getRenderWidth() === from.width &&
            this.engine.getRenderHeight() === from.height &&
            Math.fround(clearColor.r) === from.clear[0] &&
            Math.fround(clearColor.g) === from.clear[1] &&
            Math.fround(clearColor.b) === from.clear[2] &&
            Math.fround(clearColor.a) === from.clear[3] &&
            observers.every((observer, i) => observer === from.observers[i]) &&
            RenderManager.sameMatrix(camera.getViewMatrix().m, from.view) &&
            RenderManager.sameMatrix(camera.getProjectionMatrix().m, from.projection)
        );
    }

    /**
     * Asked just before a frame is drawn: whether the scene holds something added or removed since
     * the last frame drawn (or still unconfirmed from before it), and every part of it is ready, so
     * this frame draws the change whole.
     *
     * Such a frame needs no second one to show the change. The check used to wait for the next
     * tick instead, which then drew the same picture again only to find the scene ready: on a
     * software GPU a frame of OpenFlights (3,214 nodes, 36,906 edges) costs the page's main thread
     * 5 to 6 seconds with two cores free, so one opening paid that once more for nothing (#3317).
     * @returns True when this frame draws a change to the scene's contents whole.
     */
    private readyToDrawChange(): boolean {
        if (this.pictureIsFinal === null || !this.drawsOnDemand()) {
            return false;
        }

        this.readSceneContents(this.contentsAtDraw);
        const changed =
            this.sceneChanged || !this.contentsAtDraw.every((value, i) => value === this.drawnFrom.contents[i]);
        // The walk visits every mesh, so it is asked only when the contents changed.
        return changed && this.scene.isReady();
    }

    /**
     * Records what the frame just drawn left behind, for {@link RenderManager.sameAsDrawn}, and
     * whether it differed from what the frame before left.
     * @param drawnReady - Whether the frame began with a change to the scene's contents all ready
     *     to draw; see {@link readyToDrawChange}.
     */
    private noteDrawnFrom(drawnReady = false): void {
        if (this.pictureIsFinal === null || !this.drawsOnDemand()) {
            // Switched on later, the first frame then is compared with nothing and draws again.
            this.lastFrameMoved = true;
            return;
        }

        this.lastFrameMoved = !this.sameAsDrawn();
        const from = this.drawnFrom;
        const camera = this.scene.activeCamera;
        from.camera = camera?.uniqueId ?? -1;
        if (camera !== null) {
            from.view.set(camera.getViewMatrix().m);
            from.projection.set(camera.getProjectionMatrix().m);
        }

        from.width = this.engine.getRenderWidth();
        from.height = this.engine.getRenderHeight();
        const { clearColor } = this.scene;
        from.clear[0] = clearColor.r;
        from.clear[1] = clearColor.g;
        from.clear[2] = clearColor.b;
        from.clear[3] = clearColor.a;
        from.observers = this.newestFrameObservers();
        // Something added while frames were being drawn may not have been ready to draw in them.
        if (!this.sameContents()) {
            this.sceneChanged = true;
        }

        // Drawn whole, and nothing added while it was drawn: the change is on the canvas.
        if (drawnReady && this.contentsNow.every((value, i) => value === this.contentsAtDraw[i])) {
            this.sceneChanged = false;
        }

        this.readSceneContents(from.contents);
    }

    /**
     * Whether a matrix is the one recorded.
     * @param matrix - The matrix now.
     * @param recorded - The matrix the last frame was drawn with.
     * @returns True when every element is the same.
     */
    private static sameMatrix(matrix: ArrayLike<number>, recorded: Float32Array): boolean {
        for (let i = 0; i < 16; i++) {
            if (Math.fround(matrix[i]) !== recorded[i]) {
                return false;
            }
        }

        return true;
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
     * Light the scene's 3D nodes one of the {@link Lighting} ways. Takes effect on the next frame,
     * for the nodes on screen and every node built afterwards.
     *
     * The numbers are the ones measured in `stories/experiments/NodeLighting.stories.ts` (25
     * shapes x 4 colors x 12 rotations). Node materials are frozen, and a frozen material keeps the
     * shader it compiled -- which lights it counts, whether it has a rim -- so every frozen material
     * is thawed, recompiled on the next frame and frozen again after it.
     * @param lighting - The lighting.
     */
    applyLighting(lighting: Lighting): void {
        const { hemi, key, scene } = this;
        const light = LIGHTS[lighting];
        hemi.intensity = light.fill;
        hemi.groundColor = new Color3(light.ground, light.ground, light.ground);
        key.setEnabled(light.key > 0);
        key.intensity = light.key;
        this.keyInCameraSpace.copyFrom(light.keyDirection);

        scene.metadata = { ...(scene.metadata as Record<string, unknown> | null), lighting };

        const thawed: Material[] = [];
        for (const material of scene.materials) {
            if (material.isFrozen) {
                material.unfreeze();
                thawed.push(material);
            }

            if (isNodeMaterial(material)) {
                lightNodeMaterial(material, lighting);
                for (const mesh of material.getBindedMeshes()) {
                    outlineNodeMesh(mesh, lighting);
                }
            }

            material.markAsDirty(Material.AllDirtyFlag);
        }

        if (thawed.length > 0) {
            scene.onAfterRenderObservable.addOnce(() => {
                for (const material of thawed) {
                    material.freeze();
                }
            });
        }

        this.requestFrame();
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
            // Radians a frame while an arrow is held: the same angular speed as A and D
            keyboardRotationSpeed: 0.02,
            // A held W or S changes the distance tenfold in the 157 frames A or D take to spin
            // half a turn (PI / keyboardYawSpeed): 0.985 ** 157 = 0.093
            keyboardZoomSpeed: 0.015,
            keyboardYawSpeed: 0.02,
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
            mousePanScale: 1,
            mouseWheelZoomSpeed: 1.1,
            touchPanScale: 1,
            touchPinchMin: 0.1,
            touchPinchMax: 100,
            initialOrthoSize: FLAT_HALF_WIDTH_AT_ZOOM_ONE,
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
            mousePanScale: 1,
            mouseWheelZoomSpeed: 1.1,
            touchPanScale: 1,
            touchPinchMin: 0.1,
            touchPinchMax: 100,
            initialOrthoSize: FLAT_HALF_WIDTH_AT_ZOOM_ONE,
            rotationEnabled: true,
            inertiaEnabled: true,
        });
        this.camera.registerCamera("2d", twoDCamera, twoDInput);
        this.camera.activateCamera("orbit");
    }
}
