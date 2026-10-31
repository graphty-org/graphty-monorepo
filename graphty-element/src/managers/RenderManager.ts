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
import { shaderDescriptor } from "../catalog/shaderRegistry";
import type { ShaderParams, ShaderUse } from "../catalog/shaders";
import type { NodeId } from "../catalog/types";
import { backgroundColorOf, DEFAULT_BACKGROUND_COLOR, type GraphBackgroundConfig } from "../config/GraphStyle";
import { DEFAULT_LIGHTING, type Lighting } from "../config/Lighting";
import { GraphtyLogger } from "../logging";
import type { BackgroundPass } from "../meshes/BackgroundPass";
import type { BloomPass } from "../meshes/BloomPass";
import { useBundledStandardShaders } from "../meshes/bundledStandardShaders";
import { batchUploadFrames } from "../meshes/FrameRoster";
import type { GroupOutlinePass, GroupOutlinePick, OutlineMember } from "../meshes/GroupOutlinePass";
import { isNodeMaterial, lightNodeMaterial, outlineNodeMesh } from "../meshes/NodeLighting";
import { reportCaught } from "../session/project/strict";
import { idsNamedBy, shadersControllerOf } from "../session/shaders";
import { placeOfUse } from "../session/styles/channels";
import { groupOutlinesOf } from "../session/styles/StylesApi";
import type { GraphSession, SessionEventMap } from "../session/types";
import { type LazyShaderHost, lendSceneShaders } from "../shaders/chunk";
import type { EventManager } from "./EventManager";
import { everyFrameAnimationsOn } from "./everyFrameAnimations";
import type { Manager } from "./interfaces";
import { minimumWorkPerFrame } from "./minimumWork";
import { pendingWorkOf, trackOnScene } from "./PendingWork";
import { FlashCounter, FlashReadback, QUALITY_LEVELS, RenderTargetBudget, ShaderGuard } from "./ShaderGuard";

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
 * - studio: the headlight's lights (below) plus the node rim (NodeLighting): a 0.45 light from just
 *   above and left of the camera, a 0.4 fill with ground gray 0.65, no specular, and a rim in the
 *   node's own color (fresnel bias 0.1, power 2.5, boost 1.8). Because the main light follows the
 *   camera and the ground is light, no side goes dark: in the lighting experiment the darkest face
 *   seen from the front, back or below was about 0.51-0.53 of the style lightness, the median
 *   0.89-0.92, and no pixel clipped to white.
 * - headlight: the same lights without the rim. Brightest 0.99x the style lightness, median 0.88x,
 *   spread 0.226.
 * - matte: fill 0.8 alone. Brightest 1.00x, median 0.81x, spread 0.179.
 * - flat: nodes are unlit (NodeLighting); the fill stays for anything else lit in the scene.
 */
const LIGHTS: Record<Lighting, { fill: number; ground: number; key: number; keyDirection: Vector3 }> = {
    studio: { fill: 0.4, ground: 0.65, key: 0.45, keyDirection: new Vector3(0.25, -0.3, 1) },
    headlight: { fill: 0.4, ground: 0.65, key: 0.45, keyDirection: new Vector3(0.25, -0.3, 1) },
    matte: { fill: 0.8, ground: 0.35, key: 0, keyDirection: new Vector3(0, 0, 1) },
    flat: { fill: 0.8, ground: 0.35, key: 0, keyDirection: new Vector3(0, 0, 1) },
};

/** What the scene's shader passes read from the graph; see {@link RenderManager.bindShaderScene}. */
export interface ShaderSceneSources {
    /** The graph's session: its style stack and its shaders. */
    readonly session: GraphSession;
    /** A drawn node's place, size and color; undefined for one not drawn. */
    readonly member: (id: NodeId) => OutlineMember | undefined;
}

/** A background shader the graph asks for, with what it is drawn over. */
interface ShaderBackground {
    /** The shader's id. */
    readonly id: string;
    /** Its parameter values over the defaults. */
    readonly params: ShaderParams | undefined;
    /** The background color, hex: drawn beneath, and for a pixel whose result is not a number. */
    readonly color: string;
    /** The skybox dome, whose image the shader is drawn over; hidden while the shader draws it. */
    readonly dome: PhotoDome | null;
}

/** The session events after which the group outlines may draw other groups or members. */
const OUTLINE_EVENTS = [
    "style:changed",
    "history:changed",
    "project:changed",
    "run:changed",
    "set:changed",
    "visibility:changed",
    "selection:changed",
    "selection:hover-changed",
] as const satisfies readonly (keyof SessionEventMap)[];

/**
 * The scene-level shader passes of one graph: the background shader, the group outlines and
 * the shared bloom. Each is loaded and allocated only while something asks for it, so a graph
 * that names no shader loads none of them.
 */
class ShaderScene {
    private background: BackgroundPass | null = null;
    private outline: GroupOutlinePass | null = null;
    private bloom: BloomPass | null = null;
    private wanted: ShaderBackground | null = null;
    /** Counts background requests, so a slow resolution never draws over a newer one. */
    private backgroundTicket = 0;
    /** Background loads in flight: the shader, the runtime, the pass module and the compile. */
    private backgroundLoads = 0;
    private outlineLoading = false;
    private readonly budget: RenderTargetBudget;
    private readonly stops: (() => void)[] = [];
    private disposed = false;

    /**
     * Start following a graph's styles and shaders.
     * @param scene - The scene.
     * @param guard - The frame guard, for the quality level.
     * @param sources - The graph.
     */
    constructor(
        private readonly scene: Scene,
        private readonly guard: ShaderGuard,
        private readonly sources: ShaderSceneSources,
    ) {
        this.budget = new RenderTargetBudget(() => QUALITY_LEVELS[guard.quality.level].targetBudgetBytes);
        const { session } = sources;
        for (const event of OUTLINE_EVENTS) {
            this.stops.push(
                session.on(event, () => {
                    this.sync();
                }),
            );
        }

        this.stops.push(
            session.on("shader:status", ({ id }) => {
                this.outline?.forget(id);
                if (this.wanted?.id === id) {
                    void this.showBackground();
                }

                this.sync();
            }),
        );
        lendSceneShaders(scene, () => {
            const background = this.background?.guardedDrawn();
            const outline = this.outline?.guardedDrawn();
            return {
                heavy: background?.heavy === true || outline?.heavy === true,
                moving: [...(background?.moving ?? []), ...(outline?.moving ?? [])],
            };
        });
        this.sync();
    }

    /**
     * Draw a background shader, or stop drawing one.
     * @param wanted - The background, or null for none.
     */
    setBackground(wanted: ShaderBackground | null): void {
        this.wanted = wanted;
        void this.showBackground();
    }

    /**
     * The group outline under a point.
     * @param x - CSS pixels from the canvas's left edge.
     * @param y - CSS pixels from the canvas's top edge.
     * @returns The layer and group, or null.
     */
    groupOutlineAt(x: number, y: number): GroupOutlinePick | null {
        return this.outline?.pick(x, y) ?? null;
    }

    /**
     * The passes allocated now, for tests and tools.
     * @returns Each pass, or null.
     */
    passes(): {
        readonly background: BackgroundPass | null;
        readonly outline: GroupOutlinePass | null;
        readonly bloom: BloomPass | null;
    } {
        return { background: this.background, outline: this.outline, bloom: this.bloom };
    }

    /**
     * Whether a scene shader's picture is on its way, so the frame on screen does not show it yet:
     * the background or the group outline pass still loading, an outline's shader still resolving
     * or compiling, a background that owes a draw with the outlines laid out since, or a background
     * whose layer the last frame did not draw (its program still compiling, issue #3536). Each of
     * these ends by asking for a frame (issue #4243).
     * @returns True while one is on its way.
     */
    get picturePending(): boolean {
        return (
            this.backgroundLoads > 0 ||
            this.outlineLoading ||
            this.outline?.pending === true ||
            this.background?.owesDraw === true ||
            this.background?.showPending === true
        );
    }

    /** Release every pass and listener. */
    dispose(): void {
        this.disposed = true;
        for (const stop of this.stops.splice(0)) {
            stop();
        }

        lendSceneShaders(this.scene, () => ({ heavy: false, moving: [] }));
        this.background?.dispose();
        this.background = null;
        this.outline?.dispose();
        this.outline = null;
        this.bloom?.dispose();
        this.bloom = null;
    }

    /**
     * The session's shader host, which loads the shader runtime.
     * @returns The host, or null when none is attached.
     */
    private host(): LazyShaderHost | null {
        return (shadersControllerOf(this.sources.session)?.host as LazyShaderHost | null | undefined) ?? null;
    }

    /** Resolve the background shader asked for and draw it, or draw the clear color. */
    private async showBackground(): Promise<void> {
        this.backgroundLoads++;
        try {
            await this.loadBackground();
        } finally {
            this.backgroundLoads--;
        }
    }

    /** The body of {@link showBackground}. */
    private async loadBackground(): Promise<void> {
        const ticket = ++this.backgroundTicket;
        const { wanted } = this;
        const controller = shadersControllerOf(this.sources.session);
        const host = this.host();
        if (wanted === null || controller === undefined || host === null) {
            wanted?.dome?.setEnabled(true);
            this.background?.dispose();
            this.background = null;
            return;
        }

        const [shader, runtime, module] = await trackOnScene(
            this.scene,
            "shader",
            "a background shader is still loading",
            Promise.all([controller.drawable(wanted.id), host.runtime(), import("../meshes/BackgroundPass")]),
        );
        if (ticket !== this.backgroundTicket || this.disposed) {
            return;
        }

        if (shader?.registration.descriptor.target !== "background") {
            wanted.dome?.setEnabled(true);
            this.background?.hide();
            return;
        }

        this.background ??= new module.BackgroundPass(
            this.scene,
            runtime,
            this.guard,
            this.budget,
            (count) => this.outline?.tints(count) ?? [],
        );
        const color = Color4.FromHexString(wanted.color);
        const drawn = await this.background.show(
            shader,
            wanted.params,
            [color.r, color.g, color.b, 1],
            wanted.dome?.texture ?? null,
        );
        // The pass draws the image beneath the shader, so the dome, which would cover it, hides.
        if (ticket === this.backgroundTicket && !wanted.dome?.isDisposed()) {
            wanted.dome?.setEnabled(!drawn);
        }
    }

    /** Allocate or release the group outline and bloom passes as the style stack now asks. */
    private sync(): void {
        const { session } = this.sources;
        const layers = session.styles.list().filter((layer) => layer.enabled);
        const wantsOutlines = layers.some(
            (layer) =>
                layer.target === "node" &&
                ((layer.set?.["node.shaders"] ?? []) as readonly ShaderUse[]).some(
                    (use) => use.off !== true && placeOfUse(use) === "group",
                ),
        );
        if (wantsOutlines) {
            this.outline?.invalidate();
            void this.loadOutlines();
        } else if (this.outline !== null) {
            this.outline.dispose();
            this.outline = null;
        }

        const project = shadersControllerOf(session)?.descriptors() ?? [];
        const bloomy = (id: string): boolean =>
            (shaderDescriptor(id) ?? project.find((descriptor) => descriptor.id === id))?.bloom === true;
        const wantsBloom = layers.some((layer) => [...idsNamedBy(layer)].some(bloomy));
        if (wantsBloom) {
            void this.loadBloom();
        } else if (this.bloom !== null) {
            this.bloom.dispose();
            this.bloom = null;
        }
    }

    /** Load and allocate the group outline pass, once. */
    private async loadOutlines(): Promise<void> {
        const controller = shadersControllerOf(this.sources.session);
        const host = this.host();
        if (this.outline !== null || this.outlineLoading || controller === undefined || host === null) {
            return;
        }

        this.outlineLoading = true;
        try {
            const [runtime, module] = await trackOnScene(
                this.scene,
                "shader",
                "the group outline pass is still loading",
                Promise.all([host.runtime(), import("../meshes/GroupOutlinePass")]),
            );
            if (this.disposed || this.outline !== null) {
                return;
            }

            const { session, member } = this.sources;
            this.outline = new module.GroupOutlinePass(
                this.scene,
                {
                    outlines: () => groupOutlinesOf(session.styles),
                    member,
                    shader: (id) => controller.drawable(id),
                },
                runtime,
                this.guard,
                this.budget,
            );
            // Asked again now it exists: the stack may have changed while it loaded.
            this.sync();
        } finally {
            this.outlineLoading = false;
        }
    }

    /** Load and allocate the bloom pass, once. */
    private async loadBloom(): Promise<void> {
        if (this.bloom !== null) {
            return;
        }

        const module = await trackOnScene(
            this.scene,
            "shader",
            "the bloom pass is still loading",
            import("../meshes/BloomPass"),
        );
        if (this.disposed || this.bloom !== null) {
            return;
        }

        this.bloom = module.BloomPass.of(this.scene, this.guard.quality.level);
        // Released at once if the stack stopped naming a bloom shader while it loaded.
        this.sync();
    }
}

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
    /** Flips every tick in the minimum-work test mode; see {@link RenderManager.minimumWorkSkips}. */
    private minimumWorkTick = false;

    /** The time of the ticks skipped since the last frame drawn, for the GPU to catch up. */
    private skippedMs = 0;
    /**
     * The shader quality levels and the frame guard. It measures only once shaders draw (a host
     * lent it its sources), so a graph that names no shader draws exactly as before.
     */
    readonly shaderGuard = new ShaderGuard();
    /** When the last frame drawn started, by `performance.now()`; NaN when the tick before did not draw. */
    private lastDrawAt = Number.NaN;
    /** Whether a tick waited for the GPU since the last frame drawn. */
    private waitedForGpu = false;
    /**
     * When the loop's own work last ended, by `performance.now()`: the end of the last frame drawn
     * or of a tick skipped for half rate. The time from it to the next frame drawn is time the
     * loop only waited for its tick, which in Chromium is the GPU catching up.
     */
    private workEndedAt = Number.NaN;
    /** The flashing check's readback and counter, made when a moving shader first draws. */
    private flashCheck: { readback: FlashReadback; counter: FlashCounter } | null = null;
    /** The camera and canvas size of the last frame drawn, for {@link RenderManager.sameViewAsLastFrame}. */
    private readonly flashView = {
        camera: -1,
        width: -1,
        height: -1,
        view: new Float32Array(16),
        projection: new Float32Array(16),
    };
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
    /** Whether drawing the last frame moved the camera, size or background from what it began with. */
    private lastFrameMoved = true;
    private readonly owe = (): void => {
        this.drawOwed = true;
    };
    /**
     * Whether any of the canvas is in the page's viewport. Out of it, a camera that moves on its
     * own -- `camera.autoRotate`, a glide -- is no reason to draw: nobody sees the frame (#4426).
     * True until the browser first says otherwise, and always where it cannot say.
     */
    private inView = true;
    /** Tells {@link inView}; null where the browser has no IntersectionObserver. */
    private readonly viewWatch: IntersectionObserver | null =
        typeof IntersectionObserver === "undefined"
            ? null
            : new IntersectionObserver((entries) => {
                  const inView = entries.at(-1)?.isIntersecting ?? true;
                  // Back in view, the camera may have moved since the last frame drawn.
                  if (inView && !this.inView) {
                      this.drawOwed = true;
                  }

                  this.inView = inView;
              });
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
        this.shaderGuard.ignore();
        this.flashCheck = null;
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
    /** The background shader asked for, kept until {@link bindShaderScene} gives it a graph. */
    private shaderBackground: ShaderBackground | null = null;
    /** The scene-level shader passes, once {@link bindShaderScene} gave them a graph. */
    private shaderScene: ShaderScene | null = null;

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
        this.viewWatch?.observe(this.canvas);
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
            this.shaderGuard.ignore();
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
            document.addEventListener("visibilitychange", this.ignoreForGuard);

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
        document.removeEventListener("visibilitychange", this.ignoreForGuard);
        this.flashCheck?.readback.dispose();
        this.flashCheck = null;
        this.canvas.removeEventListener("pointerdown", this.focusOnPointer);
        this.canvas.removeEventListener("pointerup", this.focusOnPointer);
        this.canvas.removeEventListener("blur", this.restoreFocusRing);
        this.canvas.removeEventListener("keydown", this.restoreFocusRing);
        for (const type of READER_INPUT_EVENTS) {
            this.canvas.removeEventListener(type, this.owe);
        }
        this.canvas.removeEventListener("webglcontextlost", this.dropFence);
        this.canvas.removeEventListener("webglcontextrestored", this.dropFence);
        this.viewWatch?.disconnect();
        this.eventManager.onGraphEvent.removeCallback(this.oweForEvent);
        this.engine.onResizeObservable.removeCallback(this.owe);

        this.shaderScene?.dispose();
        this.shaderScene = null;

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
        this.lastDrawAt = Number.NaN;

        this.engine.runRenderLoop(() => {
            // A held frame is skipped whole: no update, no draw. The loop itself keeps ticking so
            // nothing has to be restarted, and a tick that does nothing costs nothing.
            if (this.frameHolds > 0) {
                this.lastDrawAt = Number.NaN;
                return;
            }

            // A tick skipped for the GPU still passed: the next frame's update is handed the
            // time of every tick since the last frame drawn, not only its own, or a layout that
            // keeps to wall-clock pace would run slower by exactly the ticks skipped.
            if (this.gpuBehind()) {
                this.skippedMs += this.engine.getDeltaTime();
                this.ticks.gpuBehind++;
                this.waitedForGpu = true;
                return;
            }

            // Loops at half rate (the frame guard): every other tick, skipped as a GPU wait is. The
            // minimum-work test mode skips every other tick the same way (issue #4218).
            if (this.shaderGuard.skipTick() || this.minimumWorkSkips()) {
                this.skippedMs += this.engine.getDeltaTime();
                this.workEndedAt = performance.now();
                return;
            }

            const frameMs = this.engine.getDeltaTime() + this.skippedMs;
            this.skippedMs = 0;
            const drawAt = performance.now();
            const drewBefore = this.lastDrawAt;
            const gpuWasBehind = this.waitedForGpu;
            const waitMs = drawAt - this.workEndedAt;
            this.lastDrawAt = Number.NaN;
            this.waitedForGpu = false;

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

                // The frame before this one, measured now that its GPU wait is known.
                this.measureFrame(drawAt - drewBefore, waitMs, gpuWasBehind);
                this.drawFrame(drawAt);
                this.lastDrawAt = drawAt;
                this.workEndedAt = performance.now();
            } catch (error) {
                this.reportFrameError(error);
            }
        });
    }

    /** A visibility change: the next frames say nothing about the shaders drawn. */
    private readonly ignoreForGuard = (): void => {
        this.shaderGuard.ignore();
    };

    /**
     * Hand the frame guard the frame drawn before this one: the time between the two, how much of
     * it the loop only waited for its tick, and whether it waited for the frame's fence. Only frames drawn back to back count (a rest, a hold or a
     * held draw in between makes the interval mean nothing), and only once shaders draw. A frame
     * that compiled a shader is left out.
     * @param intervalMs - Milliseconds since the frame before started; NaN when it was not the
     *     tick before.
     * @param waitMs - Milliseconds since the loop's own work last ended.
     * @param gpuBehind - Whether the loop waited for the frame before's fence.
     */
    private measureFrame(intervalMs: number, waitMs: number, gpuBehind: boolean): void {
        if (!this.shaderGuard.watching || Number.isNaN(intervalMs)) {
            return;
        }

        if (!this.engine.areAllEffectsReady()) {
            this.shaderGuard.ignore();
            return;
        }

        this.shaderGuard.frame({ intervalMs, waitMs, gpuBehind });
    }

    /**
     * The flashing check (WCAG 2.3.1, design section 4.6): while a moving shader of any origin
     * draws, read a 16 x 16 downsample of every frame drawn back without waiting (sampled any
     * slower, a strobe near the sampling rate reads as steady), and freeze those shaders' time once
     * the canvas flashed more than 3 times in a second. WebGL 2 only.
     * @param at - When the frame was drawn.
     * @param owed - Whether something other than motion asked for the frame: a graph event or
     *     the reader's input.
     */
    private checkFlashing(at: number, owed: boolean): void {
        const guard = this.shaderGuard;
        if (!guard.watching || !(this.engine instanceof Engine) || this.engine.webGLVersion < 2) {
            return;
        }

        const sameView = this.sameViewAsLastFrame();
        const check = this.flashCheck;
        for (let sample = check?.readback.collect(); check && sample; sample = check.readback.collect()) {
            if (check.counter.add(sample.rgba, sample.at)) {
                const moving = guard.movingShaders();
                if (moving.length > 0) {
                    guard.flashed(moving);
                }

                check.counter = new FlashCounter();
            }
        }

        if (guard.movingShaders().length === 0) {
            return;
        }

        this.flashCheck ??= { readback: new FlashReadback(this.engine._gl), counter: new FlashCounter() };
        // Only a frame that changed nothing but the shaders' time says anything about them. A
        // layout moving nodes, the camera framing or turning, a resize, a style or data change and
        // the reader's input all change the picture too, and counted as the shaders' flashes they
        // froze every moving shader drawn while a graph laid itself out (issue #3320). Such a frame
        // breaks the sequence: the captures before it are dropped and the count starts again.
        if (owed || !sameView || this.pictureIsFinal?.() === false) {
            this.flashCheck.readback.drop();
            this.flashCheck.counter = new FlashCounter();
            return;
        }

        this.flashCheck.readback.capture(at);
    }

    /**
     * Whether the frame just drawn had the same camera, view, projection and canvas size as the
     * frame drawn before it; records them for the next frame.
     * @returns True when none changed.
     */
    private sameViewAsLastFrame(): boolean {
        const was = this.flashView;
        const camera = this.scene.activeCamera;
        const width = this.engine.getRenderWidth();
        const height = this.engine.getRenderHeight();
        if (camera === null) {
            was.camera = -1;
            return false;
        }

        const view = camera.getViewMatrix().m;
        const projection = camera.getProjectionMatrix().m;
        const same =
            camera.uniqueId === was.camera &&
            width === was.width &&
            height === was.height &&
            RenderManager.sameMatrix(view, was.view) &&
            RenderManager.sameMatrix(projection, was.projection);
        was.camera = camera.uniqueId;
        was.width = width;
        was.height = height;
        was.view.set(view);
        was.projection.set(projection);
        return same;
    }

    /**
     * Draws one frame, for the loop's tick and for {@link drawNow}.
     * @param at - When the frame was drawn, by `performance.now()`.
     */
    private drawFrame(at: number): void {
        // Cleared BEFORE the frame, so anything the frame itself announces asks for the next one.
        const owed = this.drawOwed;
        this.drawOwed = false;
        const drawnReady = this.readyToDrawChange();
        // What the frame begins with, so the frame can tell afterwards whether drawing it moved
        // anything; see noteDrawnFrom.
        if (this.pictureIsFinal !== null && this.drawsOnDemand()) {
            this.recordView();
        }

        this.scene.render();
        this.ticks.drawn++;
        this.checkFlashing(at, owed);
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
        // A frame between two of the loop's: the frame guard does not measure the loop's next one.
        this.lastDrawAt = Number.NaN;
        try {
            this.drawFrame(performance.now());
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
     * default) needs none of this to draw it, but the frame on screen is no longer the final one:
     * every caller is saying the picture changed, so it is entered in the graph's record of
     * pending work and `waitForStableFrame()` waits for a frame that draws it (issue #3287).
     */
    requestFrame(): void {
        this.drawOwed = true;
        pendingWorkOf(this.scene)?.changed();
    }

    /**
     * Whether the minimum-work test mode skips this tick: every other one, as a GPU wait does.
     * @returns True to skip it.
     */
    private minimumWorkSkips(): boolean {
        if (!minimumWorkPerFrame()) {
            return false;
        }

        this.minimumWorkTick = !this.minimumWorkTick;
        return this.minimumWorkTick;
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
     * anything the last frame drawn moved while it was drawn -- the camera, the canvas size, the
     * background colour. The last is what keeps a camera gliding to rest when something moves it
     * only inside a frame (an onBeforeRender observer), so the loop draws until a frame leaves it
     * where it began.
     * @returns True when this tick draws nothing.
     */
    private mayRest(): boolean {
        if (
            this.pictureIsFinal === null ||
            !this.drawsOnDemand() ||
            this.drawOwed ||
            (this.lastFrameMoved && this.inView) ||
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

        return this.sameAsDrawn(!this.inView);
    }

    /**
     * Whether any of the canvas is in the page's viewport, as far as the browser has said.
     * @returns False only once the browser has said the canvas is wholly out of view.
     * @internal
     */
    get canvasInView(): boolean {
        return this.inView;
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
     * @param anyCamera - Whether a camera that moved still counts as the same: true while the
     *     canvas is out of view, where nobody sees it move.
     * @returns True when the camera, size, background and frame observers are unchanged.
     */
    private sameAsDrawn(anyCamera = false): boolean {
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
            (anyCamera ||
                (RenderManager.sameMatrix(camera.getViewMatrix().m, from.view) &&
                    RenderManager.sameMatrix(camera.getProjectionMatrix().m, from.projection)))
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
     * whether drawing it moved the camera, size or background from what it began with.
     * @param drawnReady - Whether the frame began with a change to the scene's contents all ready
     *     to draw; see {@link readyToDrawChange}.
     */
    private noteDrawnFrom(drawnReady = false): void {
        if (this.pictureIsFinal === null || !this.drawsOnDemand()) {
            // Switched on later, the first frame then is compared with nothing and draws again.
            this.lastFrameMoved = true;
            return;
        }

        // Compared with what the frame began with, not with the frame before it. A change made
        // outside a frame -- a resize, a camera the update pass moved or framed -- is seen by the
        // next tick's sameAsDrawn, so the frame that draws it is the only one it needs. Only motion
        // made while the frame was being drawn (an onBeforeRender observer, the camera's own
        // update) is invisible to that check, and only that one asks for the next frame. Compared
        // with the frame before, every resize and every fit drew the same picture once more: on a
        // software GPU, 200 to 800 ms of the page's main thread each under load (#3537).
        this.lastFrameMoved = !this.sameAsDrawn();
        this.recordView();
        // Something added while frames were being drawn may not have been ready to draw in them.
        if (!this.sameContents()) {
            this.sceneChanged = true;
        }

        // Drawn whole, and nothing added while it was drawn: the change is on the canvas.
        if (drawnReady && this.contentsNow.every((value, i) => value === this.contentsAtDraw[i])) {
            this.sceneChanged = false;
        }

        this.readSceneContents(this.drawnFrom.contents);
    }

    /** Records the camera, size, background and frame observers, for {@link RenderManager.sameAsDrawn}. */
    private recordView(): void {
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
     * Draw the graph against a background, bottom to top: the clear colour (its own, else the
     * default), a photo-dome skybox, and a background shader drawn over them once it compiled.
     * While the shader draws, the shader pass draws the skybox image beneath it and the dome hides.
     *
     * The scene holds at most one dome. A colour disposes it; a different skybox replaces it; the
     * skybox already shown is left alone, so drawing the same background again (a redo, a repeat)
     * builds nothing.
     * @param background - The background, parsed.
     * @param onSkyboxLoaded - Called with the image once a new skybox's texture has arrived.
     */
    applyBackground(background: GraphBackgroundConfig, onSkyboxLoaded: (url: string) => void): void {
        const color = backgroundColorOf(background);
        this.setBackgroundColor(color);
        if (background.backgroundType === "skybox") {
            const url = background.data;
            if (this.dome?.url !== url) {
                this.dome?.dome.dispose();
                const dome = new PhotoDome("testdome", url, { resolution: 32, size: 500 }, this.scene);
                dome.texture.onLoadObservable.addOnce(() => {
                    onSkyboxLoaded(url);
                });
                this.dome = { url, dome };
            }
        } else {
            this.dome?.dome.dispose();
            this.dome = null;
        }

        const dome = this.dome?.dome ?? null;
        const { shader } = background;
        if (shader === undefined) {
            dome?.setEnabled(true);
        }

        this.shaderBackground = shader === undefined ? null : { id: shader.id, params: shader.params, color, dome };
        this.shaderScene?.setBackground(this.shaderBackground);
    }

    /**
     * Give the scene-level shaders (the background shader, group outlines, the shared bloom)
     * their graph. Until it is called none of them draws; a background shader asked for before
     * is drawn then.
     * @param sources - The graph's session and its nodes' places.
     * @internal
     */
    bindShaderScene(sources: ShaderSceneSources): void {
        this.shaderScene?.dispose();
        this.shaderScene = new ShaderScene(this.scene, this.shaderGuard, sources);
        this.shaderScene.setBackground(this.shaderBackground);
    }

    /**
     * The group outline under a point, by its layer and group.
     * @param x - CSS pixels from the canvas's left edge.
     * @param y - CSS pixels from the canvas's top edge.
     * @returns The outline, or null.
     * @internal
     */
    pickGroupOutline(x: number, y: number): GroupOutlinePick | null {
        return this.shaderScene?.groupOutlineAt(x, y) ?? null;
    }

    /**
     * The scene-level shader passes allocated now, for tests and tools.
     * @returns Each pass, or null.
     * @internal
     */
    shaderPasses(): ReturnType<ShaderScene["passes"]> {
        return this.shaderScene?.passes() ?? { background: null, outline: null, bloom: null };
    }

    /**
     * Whether a scene shader's picture (the background, a group outline) is still on its way.
     * @returns True while one is.
     * @internal
     */
    shaderPicturePending(): boolean {
        return this.shaderScene?.picturePending ?? false;
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

    /** The graph's own background colour, last applied. */
    #backgroundColor = DEFAULT_BACKGROUND_COLOR;

    /** A colour drawn in place of the graph's background (a globe's look), or null. */
    #backgroundOverride: string | null = null;

    /**
     * Clear the canvas to a colour in place of the graph's background colour, or null to draw the
     * graph's own again. A skybox, when the graph has one, still covers it.
     * @param color - Hex colour string, or null.
     */
    set backgroundOverride(color: string | null) {
        if (color === this.#backgroundOverride) {
            return;
        }

        this.#backgroundOverride = color;
        this.setBackgroundColor(this.#backgroundColor);
        this.requestFrame();
    }

    /**
     * Update the background color
     * @param color - Hex color string (e.g., "#FFFFFF")
     */
    private setBackgroundColor(color: string): void {
        this.#backgroundColor = color;
        try {
            this.scene.clearColor = Color4.FromHexString(this.#backgroundOverride ?? color);
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
