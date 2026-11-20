import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Scene } from "@babylonjs/core/scene.js";

import type { Channel, ChannelValue } from "../catalog/types";
import type { Lighting } from "../config/Lighting";
import { GraphtyError } from "../errors";
import { LIGHTS } from "../managers/RenderManager";
import type { ModelTemplate } from "../models/ModelCache";
import type { CodedFact } from "../session/shared";
import { useBundledStandardShaders } from "./bundledStandardShaders";
import { type PlacedModel, placeModel } from "./NodeThumbnail";

/** What `modelPreview` draws. */
export interface ModelPreviewOptions {
    /**
     * The node's style values, as a layer's `set` holds them: `node.color`, the `node.model*`
     * channels (Up, Turn, Fit, Center, Tint, Sides, Animation, its Speed and Start), `node.unlit`,
     * `node.wireframe` and `node.texture` (the picture every material takes) are read, the rest
     * are ignored. A clip plays at its Speed (1 when left
     * out); Speed 0 holds the pose at Start.
     */
    readonly style?: Readonly<Partial<Record<Channel, ChannelValue>>>;
    /** As `modelThumbnail`'s: draw a model still waiting for pictures or materials with them stood in for. */
    readonly standInMissing?: boolean;
    /**
     * As `modelThumbnail`'s: the pictures drawn without, by `ModelSummary.pictures` name, in place
     * of the model's own `defaults.hiddenTextures`. Fixed for the preview's life.
     */
    readonly hiddenTextures?: readonly string[];
}

/** Whether a model can be drawn (`checkModel`). */
export interface ModelCheck {
    /**
     * True when it can be drawn; false when it cannot, with `failure` saying why; null when that
     * could not be told because nothing is drawn here (no WebGL), which is not the model's fault.
     */
    readonly drawable: boolean | null;
    /**
     * Why it cannot be drawn, as `modelThumbnail` would reject: its first problem for a rejected or
     * waiting model, the load or build failure (`E_MODEL_PARSE`, `E_MODEL_STRUCTURE`,
     * `E_MODEL_DECODER_UNAVAILABLE`, ...) for an accepted one, `E_MODEL_UNKNOWN_ASSET` for nothing held.
     */
    readonly failure?: CodedFact;
}

/** What `checkModel` takes. */
export interface ModelCheckOptions {
    /** Stops waiting: the check rejects with the signal's reason. */
    readonly signal?: AbortSignal;
    /** As `modelThumbnail`'s: a model waiting only for pictures or materials counts as drawable. */
    readonly standInMissing?: boolean;
}

/** A live preview of one model, in an element of the caller's (`modelPreview`). */
export interface ModelPreview {
    /**
     * The canvas the preview draws in, filling the element it was given: name it for assistive
     * technology (`aria-label`) and style it as you like. It takes focus, so the arrow keys turn
     * the model. Removed on `dispose`.
     */
    readonly canvas: HTMLCanvasElement;
    /**
     * Draw the model with other style values, keeping where the reader turned the camera.
     * @param style - The node's style values, as {@link ModelPreviewOptions.style}.
     * @returns Resolves once the model is drawn with them; rejects as `modelPreview` does.
     */
    update(style: Readonly<Partial<Record<Channel, ChannelValue>>>): Promise<void>;
    /** Turn the camera back to its first three-quarter view, framing the whole model. */
    resetView(): void;
    /** Stop drawing, free the drawing context and remove the canvas. Safe to call twice. */
    dispose(): void;
}

/** Builds the model's template in a scene, for the style's geometry options. */
export type TemplateLoader = (
    scene: Scene,
    style: Readonly<Partial<Record<Channel, ChannelValue>>>,
) => Promise<ModelTemplate>;

/** Room around the model, as a share of its bounding sphere: more than a thumbnail's, so a turn never cuts a corner. */
const FRAME_MARGIN = 1.15;

/** The first view: three-quarter, as a node in 3D is mostly seen (as `modelThumbnail`). */
const START_ALPHA = -Math.PI / 3;
const START_BETA = Math.PI / 2.8;

/**
 * The style values a template is built for; the rest (the color, the clip, its speed and start)
 * only re-place the template, so changing them never loads the model again.
 * @param style - The node's style values.
 * @returns A key equal for styles that build the same template.
 */
function templateKey(style: Readonly<Partial<Record<Channel, ChannelValue>>>): string {
    const tint = style["node.modelTint"];
    const clip = style["node.modelAnimation"];
    return JSON.stringify([
        style["node.modelSourceUp"],
        style["node.modelTurn"],
        style["node.modelCenter"],
        style["node.modelFit"],
        style["node.modelDoubleSided"],
        tint === "replace" || tint === "untextured" ? tint : null,
        typeof clip === "string" && clip !== "",
        style["node.unlit"] === true,
        style["node.wireframe"] === true,
        style["node.texture"],
    ]);
}

/** An engine and its canvas, kept for the next preview. */
export interface Drawing {
    readonly engine: Engine;
    readonly canvas: HTMLCanvasElement;
}

/** How many closed previews' engines are kept: more open at once still each get their own. */
const IDLE_KEPT = 2;

/**
 * Engines closed previews left, for the next ones: one per graph. A browser counts a WebGL context
 * until it is collected, long after `loseContext`, and past its limit (16 in Safari and Chrome)
 * drops the oldest -- the graph's own. Reusing them keeps a dialog opened and closed all day at a
 * context or two.
 */
export class PreviewEngines {
    readonly #idle: Drawing[] = [];
    /** Set when the graph goes: an engine given back after that is freed, not kept. */
    #closed = false;

    /**
     * An engine and canvas for a new preview: a kept one, or a new one.
     * @returns The engine and its canvas, not yet in the page.
     * @throws GraphtyError `E_NO_WEBGL` when the browser gives no WebGL context.
     */
    take(): Drawing {
        for (let kept = this.#idle.pop(); kept !== undefined; kept = this.#idle.pop()) {
            if (!kept.engine.isDisposed) {
                return kept;
            }
        }
        const canvas = document.createElement("canvas");
        // No focus ring for a pointer, as on the graph's canvas (RenderManager.focusOnPointer):
        // Babylon's camera input focuses the canvas by script on a press, and a browser drew its
        // keyboard ring for that after a drag (a frame in Chromium, two blue slivers in WebKit).
        // Focused here first, without scrolling, so Babylon's own focus call finds it focused.
        // Tab or a key in the canvas brings the browser's ring back.
        const fromPointer = (): void => {
            canvas.style.outline = "none";
            canvas.focus({ preventScroll: true });
        };
        const ring = (): void => {
            canvas.style.outline = "";
        };
        canvas.addEventListener("pointerdown", fromPointer);
        canvas.addEventListener("pointerup", fromPointer);
        canvas.addEventListener("blur", ring);
        canvas.addEventListener("keydown", ring);
        try {
            // The last frame is kept, so the page can read the picture (a screenshot, a test).
            const engine = new Engine(
                canvas,
                true,
                { alpha: true, premultipliedAlpha: false, stencil: false, preserveDrawingBuffer: true },
                true,
            );
            return { engine, canvas };
        } catch (error) {
            throw new GraphtyError({
                code: "E_NO_WEBGL",
                source: "view",
                message: "The model preview could not get a WebGL context.",
                details: { reason: error instanceof Error ? error.message : String(error) },
                cause: error,
            });
        }
    }

    /**
     * Keep a closed preview's engine for the next one, or free it when enough are kept.
     * @param drawing - The engine and its canvas, its scene disposed.
     */
    giveBack(drawing: Drawing): void {
        drawing.canvas.remove();
        if (!this.#closed && this.#idle.length < IDLE_KEPT && !drawing.engine.isDisposed) {
            for (const name of drawing.canvas.getAttributeNames()) {
                drawing.canvas.removeAttribute(name);
            }
            this.#idle.push(drawing);
            return;
        }
        free(drawing);
    }

    /** Free every kept engine (the graph is going). */
    dispose(): void {
        this.#closed = true;
        for (const drawing of this.#idle.splice(0)) {
            free(drawing);
        }
    }
}

/**
 * Free an engine and give its context back now, not when the page collects it.
 * @param drawing - The engine and its canvas.
 */
function free(drawing: Drawing): void {
    const gl = drawing.engine._gl;
    drawing.engine.dispose();
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
}

/**
 * One model drawn alone in a canvas of its own, with the graph's lights, and a camera the reader
 * turns by dragging, zooms with the wheel or a pinch, and turns with the arrow keys while the
 * canvas has focus. Its clip plays. A small WebGL engine of its own, so the graph's frame loop and
 * its frozen draw lists are never touched.
 */
export class LiveModelPreview implements ModelPreview {
    readonly canvas: HTMLCanvasElement;
    readonly #engine: Engine;
    readonly #drawing: Drawing;
    readonly #engines: PreviewEngines;
    /** The style values the template was built for. */
    #built: string | null = null;
    readonly #resized: ResizeObserver | null;
    readonly #scene: Scene;
    readonly #camera: ArcRotateCamera;
    readonly #load: TemplateLoader;
    /** The model's own settings, under every style the preview is given. */
    readonly #base: Readonly<Partial<Record<Channel, ChannelValue>>>;
    #template: ModelTemplate | null = null;
    #placed: PlacedModel | null = null;
    /** The camera distance that frames the model; the reader's zoom is kept as a share of it. */
    #framed = 1;
    /** The update in flight, so updates draw in order. */
    #queue: Promise<void> = Promise.resolve();
    /** Counts updates: one superseded before it starts is skipped. */
    #asked = 0;
    #disposed = false;
    /** Something the camera does not show changed (the model, its style, the canvas size): draw again. */
    #dirty = true;
    /** The placed model's clip plays, so every frame differs. */
    #playing = false;
    /** The camera's view at the last frame drawn. */
    readonly #drawnView = new Matrix();

    /**
     * Make the preview's canvas in `host`, its engine, scene, lights and camera, and start drawing.
     * @param host - The element the preview's canvas fills.
     * @param load - Builds the template in the preview's scene.
     * @param lighting - The graph's lighting.
     * @param engines - The graph's kept preview engines.
     * @param base - The model's own settings, under every style it is given.
     */
    constructor(
        host: HTMLElement,
        load: TemplateLoader,
        lighting: Lighting,
        engines: PreviewEngines,
        base: Readonly<Partial<Record<Channel, ChannelValue>>> = {},
    ) {
        this.#load = load;
        this.#base = base;
        this.#engines = engines;
        this.#drawing = engines.take();
        const { canvas, engine } = this.#drawing;
        this.canvas = canvas;
        this.#engine = engine;
        canvas.tabIndex = 0;
        // The canvas takes every drag, wheel and pinch: the page neither scrolls nor zooms under it.
        // A drag on the page around it must not select the canvas (as Graph.createCanvas does).
        canvas.style.cssText =
            "display:block;width:100%;height:100%;touch-action:none;outline-offset:-2px;user-select:none;-webkit-user-select:none";
        host.appendChild(canvas);
        engine.resize();
        this.#resized =
            typeof ResizeObserver === "undefined"
                ? null
                : new ResizeObserver(() => {
                      this.#engine.resize();
                      this.#dirty = true;
                  });
        this.#resized?.observe(canvas);
        const scene = new Scene(this.#engine);
        this.#scene = scene;
        scene.clearColor = new Color4(0, 0, 0, 0);
        useBundledStandardShaders();
        // The graph's two lights: a fill from above and a key that keeps its place to the camera.
        const light = LIGHTS[lighting];
        const hemi = new HemisphericLight("preview-fill", new Vector3(1, 1, 0), scene);
        hemi.specular = Color3.Black();
        hemi.intensity = light.fill;
        hemi.groundColor = new Color3(light.ground, light.ground, light.ground);
        const key = new DirectionalLight("preview-key", new Vector3(0, 0, 1), scene);
        key.specular = Color3.Black();
        key.intensity = light.key;
        key.setEnabled(light.key > 0);
        const camera = new ArcRotateCamera("preview-camera", START_ALPHA, START_BETA, 1, Vector3.Zero(), scene);
        this.#camera = camera;
        camera.minZ = 0.01;
        camera.wheelDeltaPercentage = 0.01;
        // Turned about the model, never slid off it: the reader only turns and zooms.
        camera.panningSensibility = 0;
        camera.pinchDeltaPercentage = 0.01;
        camera.attachControl(false);
        scene.onBeforeRenderObservable.add(() => {
            key.direction = Vector3.TransformNormal(light.keyDirection, camera.getWorldMatrix()).normalize();
        });
        // Draws only when the picture would change: a still preview drawing every frame kept the
        // page busy enough under software WebGL that a screenshot never got a frame.
        this.#engine.runRenderLoop(() => {
            if (this.#placed === null) {
                return;
            }
            // The camera's input and glide, applied here so an unchanged view can skip the frame.
            camera.update();
            // Babylon.js 9's glide decays for seconds after it stops showing, turning the model
            // by a fraction of a pixel a frame and drawing every one of them. The camera reads its
            // offsets as zero once a frame's turn is under its epsilon: the glide ends there, as it
            // did before 9 (writing zero stops the velocity behind them).
            if (
                camera.inertialAlphaOffset === 0 &&
                camera.inertialBetaOffset === 0 &&
                camera.inertialRadiusOffset === 0
            ) {
                camera.inertialAlphaOffset = 0;
                camera.inertialBetaOffset = 0;
                camera.inertialRadiusOffset = 0;
            }
            const view = camera.getViewMatrix();
            if (!this.#dirty && !this.#playing && view.equals(this.#drawnView)) {
                return;
            }
            this.#drawnView.copyFrom(view);
            scene.render(false);
            // Until every material and picture is ready, the next frame still differs.
            this.#dirty = !scene.isReady();
        });
    }

    /**
     * Draw the model with other style values, keeping the reader's view. See {@link ModelPreview.update}.
     * @param given - The node's style values; the model's own settings fill what they leave out.
     * @returns Resolves once drawn with them.
     */
    update(given: Readonly<Partial<Record<Channel, ChannelValue>>>): Promise<void> {
        const style = { ...this.#base, ...given };
        const turn = ++this.#asked;
        const next = this.#queue.then(async () => {
            if (this.#disposed || turn !== this.#asked) {
                return;
            }
            const key = templateKey(style);
            const speed = style["node.modelAnimationSpeed"];
            const clip = style["node.modelAnimation"];
            if (this.#template !== null && key === this.#built) {
                // The same template: only the color, the clip or its timing changed.
                this.#placed?.dispose();
                this.#placed = placeModel(
                    this.#template,
                    style,
                    typeof speed === "number" ? speed : 1,
                    "graphty-model-preview",
                );
                this.#drew(clip, speed);
                return;
            }
            const template = await this.#load(this.#scene, style);
            if (this.#disposed) {
                template.dispose();
                return;
            }
            const placed = placeModel(template, style, typeof speed === "number" ? speed : 1, "graphty-model-preview");
            const first = this.#template === null;
            this.#placed?.dispose();
            this.#template?.dispose();
            this.#template = template;
            this.#built = key;
            this.#placed = placed;
            const zoom = this.#camera.radius / this.#framed;
            this.#framed = (template.radius / Math.sin(this.#camera.fov / 2)) * FRAME_MARGIN;
            this.#camera.lowerRadiusLimit = this.#framed * 0.3;
            this.#camera.upperRadiusLimit = this.#framed * 4;
            this.#camera.radius = first ? this.#framed : this.#framed * zoom;
            this.#drew(clip, speed);
        });
        this.#queue = next.catch(() => undefined);
        return next;
    }

    /**
     * Ask for a frame after the model was placed, and note whether its clip plays.
     * @param clip - `node.modelAnimation`.
     * @param speed - `node.modelAnimationSpeed`.
     */
    #drew(clip: ChannelValue | undefined, speed: ChannelValue | undefined): void {
        this.#dirty = true;
        this.#playing = typeof clip === "string" && this.#template?.animation?.clips.has(clip) === true && speed !== 0;
    }

    /** Back to the first view. See {@link ModelPreview.resetView}. */
    resetView(): void {
        // A drag's glide is stopped too, or it carries the camera on past the first view.
        this.#camera.inertialAlphaOffset = 0;
        this.#camera.inertialBetaOffset = 0;
        this.#camera.inertialRadiusOffset = 0;
        this.#camera.inertialPanningX = 0;
        this.#camera.inertialPanningY = 0;
        this.#camera.setTarget(Vector3.Zero());
        this.#camera.alpha = START_ALPHA;
        this.#camera.beta = START_BETA;
        this.#camera.radius = this.#framed;
    }

    /** Stop, free the context and remove the canvas. See {@link ModelPreview.dispose}. */
    dispose(): void {
        if (this.#disposed) {
            return;
        }
        this.#disposed = true;
        this.#engine.stopRenderLoop();
        this.#placed?.dispose();
        this.#template?.dispose();
        this.#camera.detachControl();
        this.#scene.dispose();
        this.#resized?.disconnect();
        this.#engines.giveBack(this.#drawing);
    }
}
