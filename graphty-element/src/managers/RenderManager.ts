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
    /** See `RenderManagerConfig.pictureIsFinal`; null draws every tick. */
    private readonly pictureIsFinal: (() => boolean) | null;
    /** See `RenderManagerConfig.drawsOnDemand`. */
    private readonly drawsOnDemand: () => boolean;
    /** Set by anything that may have changed the picture since the last frame drawn. */
    private drawOwed = true;
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
    /** Whether the last frame drawn left the camera, size or background other than the one before. */
    private lastFrameMoved = true;
    private readonly owe = (): void => {
        this.drawOwed = true;
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
    private readonly oweForEvent = (event: { readonly type: string }): void => {
        if (!EVENTS_THAT_DRAW_NOTHING.has(event.type)) {
            this.drawOwed = true;
        }
    };
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
        this.pictureIsFinal = this.config.pictureIsFinal ?? null;
        this.drawsOnDemand = this.config.drawsOnDemand ?? ((): boolean => false);

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
        for (const type of READER_INPUT_EVENTS) {
            this.canvas.addEventListener(type, this.owe, { passive: true });
        }
        this.eventManager.onGraphEvent.add(this.oweForEvent);

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
        for (const type of READER_INPUT_EVENTS) {
            this.canvas.removeEventListener(type, this.owe);
        }
        this.eventManager.onGraphEvent.removeCallback(this.oweForEvent);

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

                if (this.mayRest()) {
                    return;
                }

                // Cleared BEFORE the frame, so anything the frame itself announces asks for the
                // next one.
                this.drawOwed = false;
                this.scene.render();
                this.fenceFrame();
                this.noteDrawnFrom();
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
     * Records what the frame just drawn left behind, for {@link RenderManager.sameAsDrawn}, and
     * whether it differed from what the frame before left.
     */
    private noteDrawnFrom(): void {
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
            mousePanScale: 1,
            mouseWheelZoomSpeed: 1.1,
            touchPanScale: 1,
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
            mousePanScale: 1,
            mouseWheelZoomSpeed: 1.1,
            touchPanScale: 1,
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
