/**
 * @file The models a scene draws: one template per model and geometry options, shared by every
 * node that names it (design/rendering/node-models.md, sections 2.5, 2.6, 3.10 and 4).
 *
 * - KEYED ON GEOMETRY ONLY: the asset, the up axis, the turn, the fit and the centering, and tint
 *   only when it is "replace" (which swaps the materials). Tint on or off is per instance.
 * - REFERENCE-COUNTED BY LAYERS. A template no layer names and no node draws is disposed after
 *   10 more frames; the files stay in `session.assets`, so naming it again prepares it again.
 * - URL PROVENANCE: a URL is fetched at once when the page's code named it in a layer it added or
 *   updated itself, or when its host is allowed (by the page, the reader or the project). Any other
 *   URL -- from a project or style file, an AI command, the data -- waits in `session.network`
 *   until the reader answers; a refusal is `E_MODEL_URL_BLOCKED`. A private, loopback or
 *   link-local host is refused for anything not from code, whatever the answer.
 * - AT MOST TWO LOADS AT A TIME, and finished loads repaint their nodes once per frame.
 * - ONE EVENT PER MODEL AND STATE (`model:changed`, mirrored as `graphty-model-change`), and one
 *   `console.warn` per model that fails.
 *
 * The loaders, the template builder and their shaders are in the model chunk, imported on the
 * first model only (./loadModel).
 */

import type { BaseTexture, Mesh, Observer, Scene } from "@babylonjs/core";

import type { LayerId } from "../catalog/types";
import type { NodeStyleConfig } from "../config";
import type { GraphContext } from "../managers/GraphContext";
import type { AssetRecord, AssetsApiInternal } from "../session/assets/AssetsApi";
import type { NetworkApiInternal } from "../session/network";
import type { CodedFact } from "../session/shared";
import type { SessionStylesApi } from "../session/styles/StylesApi";
import type { ModelChange, ModelState, SessionEventMap } from "../session/types";
import { decideFetch, layersNaming } from "./fetchGate";
import { loadChunk, loadModel, ModelLoadFailure } from "./loadModel";
import { TextureCache } from "./TextureCache";

/** The geometry options a template is built for. */
export interface TemplateOptions {
    /** The file's up axis, "detected" resolved to an axis. */
    readonly up: "y" | "z" | "-y" | "-z" | "x" | "-x";
    /** Degrees about the up axis. */
    readonly turn: number;
    readonly center: "bounds" | "origin";
    readonly fit: "contain" | "stretch";
    /** Paint every material flat, in the node's colour. */
    readonly replace: boolean;
    /** `node.texture`: the picture every material takes as its base color texture. */
    readonly image?: BaseTexture | null;
}

/** One model, ready to instance: centered, fitted to a unit box, compiled and frozen. */
export interface ModelTemplate {
    /**
     * One hidden source mesh per merged group; every node instances each. Every group's bounding
     * box is the whole model's, which is what a node is picked and culled by.
     */
    readonly groups: readonly Mesh[];
    /** The fitted extents: the largest is 1 under "contain", each is 1 under "stretch". */
    readonly size: { readonly x: number; readonly y: number; readonly z: number };
    /** The fitted bounding sphere's radius about the node's center. */
    readonly radius: number;
    readonly triangles: number;
    readonly materials: number;
    readonly transparent: boolean;
    dispose(): void;
}

/** A node as the cache sees it. */
export interface ModelUser {
    isDisposed(): boolean;
    /** Draw the node again from its current paint. */
    updateStyle(): void;
    /** What the node draws now: its template, whether it is tinted, and whether a layer coloured it. */
    modelDrawn(): { readonly template: ModelTemplate | null; readonly tinted: boolean; readonly colored: boolean };
}

/** What the cache reads from the session. */
interface ModelSession {
    readonly assets: AssetsApiInternal;
    readonly network: NetworkApiInternal;
    readonly styles: SessionStylesApi;
    publishModelChange(change: ModelChange): void;
    on<K extends keyof SessionEventMap>(event: K, listener: (detail: SessionEventMap[K]) => void): () => void;
}

/** One template being prepared or drawn. */
interface Entry {
    readonly key: string;
    readonly ref: string;
    /** The `node.texture` its template is built with. */
    readonly image?: string;
    template: ModelTemplate | null;
    readonly users: Set<ModelUser>;
    /** The shape block that first asked for it, to load again after a part is supplied. */
    readonly shape: NonNullable<NodeStyleConfig["shape"]>;
    /** Frames since no layer named it and no node drew it; -1 while it is in use. */
    idle: number;
}

/** Where one model a layer names stands, for its events. */
interface RefStatus {
    state: ModelState;
    record?: AssetRecord;
    problems: CodedFact[];
    /** The last event published, so the same one is never published twice. */
    published: string;
    warned: boolean;
}

/** Frames a template no layer names is kept before it is disposed. */
const IDLE_FRAMES = 10;

/** Loads at a time. */
const CONCURRENT_LOADS = 2;

/** Over these a model is `W_MODEL_HEAVY` (design section 8.2). */
const HEAVY = { triangles: 50_000, materials: 8, bytes: 8 * 1024 * 1024 };

/** Blended instances past which `W_MODEL_TRANSPARENT` is reported. */
const TRANSPARENT_NODES = 100;

/**
 * The geometry options a node's shape block asks for.
 * @param shape - The shape block.
 * @param format - The model's format, which settles a "detected" up axis.
 * @returns The options.
 */
function optionsOf(shape: NonNullable<NodeStyleConfig["shape"]>, format: string): TemplateOptions {
    const asked = shape.modelSourceUp ?? "detected";
    // glTF's loader converts +Y up itself; an STL is taken as Z up; OBJ and PLY as Y up.
    const detected = format === "stl" ? "z" : "y";
    return {
        up: asked === "detected" ? detected : asked,
        turn: shape.modelTurn ?? 0,
        center: shape.modelCenter ?? "bounds",
        fit: shape.modelFit ?? "contain",
        replace: shape.modelTint === "replace",
    };
}

/**
 * The cache key of a node's shape block: the model and the options that change its geometry.
 * @param shape - The shape block.
 * @returns The key.
 */
function keyOf(shape: NonNullable<NodeStyleConfig["shape"]>): string {
    return JSON.stringify([
        shape.model,
        shape.modelSourceUp ?? "detected",
        shape.modelTurn ?? 0,
        shape.modelCenter ?? "bounds",
        shape.modelFit ?? "contain",
        shape.modelTint === "replace",
    ]);
}

/** Templates made on this page, for unique mesh names. */
let templates = 0;

/** The cache of each scene. */
const caches = new WeakMap<Scene, ModelCache>();

/**
 * Whether a scene still has a model loading, or loaded and not yet swapped in: the picture will
 * change when it lands, so the frame on screen is not the finished one.
 * @param scene - The scene.
 * @returns True while a model is on its way.
 */
export function modelsLoading(scene: Scene): boolean {
    return caches.get(scene)?.loading === true;
}

/**
 * Whether a scene holds a template no node draws and no layer names, which it frees after
 * {@link IDLE_FRAMES} frames: a graph drawing on demand has to keep drawing until then.
 * @param scene - The scene.
 * @returns True while such a template waits to be freed.
 */
export function modelsFreeing(scene: Scene): boolean {
    return caches.get(scene)?.freeing === true;
}

/** The models one scene draws. */
export class ModelCache {
    private readonly entries = new Map<string, Entry>();
    private readonly status = new Map<string, RefStatus>();
    private readonly queue: (() => Promise<void>)[] = [];
    private running = 0;
    private readonly dirty = new Set<Entry>();
    private flushScheduled = false;
    private reportScheduled = false;
    private readonly unwatch: () => void;
    private readonly unwatchSupplied: () => void;
    private readonly frames: Observer<Scene>;

    /**
     * Watch a scene's frames and its session's style changes.
     * @param scene - The scene the templates draw in.
     * @param session - The session whose assets and layers it reads.
     */
    private constructor(
        private readonly scene: Scene,
        private readonly session: ModelSession,
    ) {
        this.unwatch = session.on("style:changed", () => {
            this.recount();
        });
        // A model given a missing part (assets.supply) loads again for every layer naming it.
        this.unwatchSupplied = session.assets.watchSupplied((names) => {
            for (const entry of this.entries.values()) {
                if (entry.template === null && names.includes(entry.ref)) {
                    this.load(entry, entry.shape);
                }
            }
        });
        this.frames = scene.onAfterRenderObservable.add(() => {
            this.tick();
        });
        scene.onDisposeObservable.addOnce(() => {
            this.dispose();
        });
    }

    /**
     * Whether a load is running or queued, or a loaded model waits for its nodes' repaint.
     * @returns True while a model is on its way.
     */
    get loading(): boolean {
        return this.running > 0 || this.queue.length > 0 || this.dirty.size > 0;
    }

    /**
     * Whether a loaded template counts down to being freed (see {@link tick}).
     * @returns True while one does.
     */
    get freeing(): boolean {
        for (const entry of this.entries.values()) {
            if (entry.idle >= 0 && entry.template !== null && this.drawing(entry).nodes === 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * The cache of a graph's scene, made on first use.
     * @param context - The graph.
     * @returns The cache, or null for a graph with no session to read models from.
     */
    static of(context: GraphContext): ModelCache | null {
        const session = context.getSession?.() as unknown as Partial<ModelSession> | undefined;
        if (session?.publishModelChange === undefined || session.assets === undefined) {
            return null;
        }

        const scene = context.getScene();
        let cache = caches.get(scene);
        if (cache === undefined) {
            cache = new ModelCache(scene, session as ModelSession);
            caches.set(scene, cache);
        }

        return cache;
    }

    /**
     * The template a node's shape block asks for, once it is drawable. The first ask starts the
     * load; until it is drawable, and if it fails, the answer is null and the node draws its shape.
     * @param user - The node asking; it is repainted when the template becomes drawable.
     * @param shape - Its shape block.
     * @param image - The `node.texture` the node names, which every material takes.
     * @returns The template, or null.
     */
    templateFor(user: ModelUser, shape: NodeStyleConfig["shape"], image?: string): ModelTemplate | null {
        const ref = shape?.model;
        if (shape === undefined || typeof ref !== "string" || ref === "") {
            return null;
        }

        const key = JSON.stringify([keyOf(shape), image ?? null]);
        let entry = this.entries.get(key);
        if (entry === undefined) {
            entry = {
                key,
                ref,
                ...(image === undefined || image === "" ? {} : { image }),
                template: null,
                shape,
                users: new Set(),
                idle: -1,
            };
            this.entries.set(key, entry);
            this.start(entry, shape);
        }

        entry.users.add(user);
        if (entry.idle >= 0 && entry.template !== null) {
            entry.idle = -1;
        }

        return entry.template;
    }

    /**
     * A template the scene already draws for what a layer names, whatever the options it was
     * built with; for a picture of the model.
     * @param ref - What the layer names.
     * @returns The template, or null while none is drawable.
     */
    drawnTemplate(ref: string): ModelTemplate | null {
        return (
            [...this.entries.values()].find((entry) => entry.ref === ref && entry.template !== null)?.template ?? null
        );
    }

    /**
     * How many templates the scene holds now.
     * @returns The count.
     * @internal
     */
    get size(): number {
        return [...this.entries.values()].filter((entry) => entry.template !== null).length;
    }

    /**
     * The layers a reader added that colour nodes, for `W_MODEL_COLOR_IGNORED`.
     * @returns Their ids.
     */
    private colorLayers(): LayerId[] {
        return this.session.styles
            .list()
            .filter((layer) => layer.target === "node" && !layer.locked && layer.enabled)
            .filter((layer) => layer.set?.["node.color"] !== undefined || layer.encode?.["node.color"] !== undefined)
            .map((layer) => layer.id);
    }

    /**
     * Prepare one entry's template, in its turn: at once, or once the reader allowed its URL.
     * @param entry - The entry.
     * @param shape - The shape block that asked for it.
     */
    private start(entry: Entry, shape: NonNullable<NodeStyleConfig["shape"]>): void {
        const { ref } = entry;
        const decided = decideFetch(this.session, ref, "node.model");
        if (decided === null) {
            this.load(entry, shape);
            return;
        }

        if ("code" in decided) {
            this.settle(ref, "rejected", [decided]);
            return;
        }

        this.settle(ref, "pending", []);
        void this.session.network.ask(decided).then((allowed) => {
            if (!allowed) {
                this.settle(ref, "rejected", [
                    {
                        code: "E_MODEL_URL_BLOCKED",
                        params: { hosts: [decided.url.host], layerIds: [...decided.layerIds], denied: true },
                    },
                ]);
            } else if (this.entries.get(entry.key) === entry) {
                this.load(entry, shape);
            }
        });
    }

    /**
     * Load one entry's files and prepare its template, in its turn.
     * @param entry - The entry.
     * @param shape - The shape block that asked for it.
     */
    private load(entry: Entry, shape: NonNullable<NodeStyleConfig["shape"]>): void {
        // The picture first, outside the two load slots: it may wait for the reader. One that
        // cannot be drawn leaves the model with its own colors; the picture reports why itself.
        if (entry.image === undefined) {
            // No picture: queue the load now, so the frame is not finished in between.
            this.loadWith(entry, shape, null);
            return;
        }

        const picture = TextureCache.forScene(this.scene, this.session)?.load(entry.image) ?? Promise.resolve(null);
        void picture.then((image) => {
            if (this.entries.get(entry.key) === entry) {
                this.loadWith(entry, shape, image);
            }
        });
    }

    /**
     * Load one entry's files and prepare its template with its picture, in its turn.
     * @param entry - The entry.
     * @param shape - The shape block that asked for it.
     * @param image - The picture every material takes, or null.
     */
    private loadWith(entry: Entry, shape: NonNullable<NodeStyleConfig["shape"]>, image: BaseTexture | null): void {
        const { ref } = entry;
        this.enqueue(async () => {
            this.settle(ref, "pending", []);
            const record = await this.session.assets.ready(ref);
            const status = this.statusOf(ref);
            status.record = record;
            if (record.state !== "accepted") {
                this.settle(ref, "rejected", [...record.problems]);
                return;
            }

            if (record.kind === "image") {
                // A picture named as a model: say so, so the reader can use it as node.texture.
                this.settle(ref, "rejected", [
                    {
                        code: "E_MODEL_FORMAT_UNSUPPORTED",
                        params: { format: record.format, fileName: record.path ?? "", assetKind: "image" },
                    },
                ]);
                return;
            }

            this.settle(ref, "accepted", [...record.problems]);
            try {
                const files = this.session.assets.files(record.id);
                const container = await loadModel(this.scene, files, record.path ?? "", record.format, record.skipped);
                const chunk = await loadChunk();
                entry.template = await chunk.prepareTemplate(
                    this.scene,
                    container,
                    `graphty-model-${String(++templates)}`,
                    { ...optionsOf(shape, record.format), image },
                    () => chunk.neutralEnvironment(this.scene),
                );
                if (!this.entries.has(entry.key)) {
                    // Dropped while it was being prepared.
                    entry.template.dispose();
                    entry.template = null;
                    return;
                }

                this.requestRepaint(entry);
            } catch (error) {
                const fact =
                    error instanceof ModelLoadFailure
                        ? error.fact
                        : { code: "E_MODEL_PARSE", params: { format: record.format } };
                this.settle(ref, "failed", [fact]);
            }
        });
    }

    /**
     * Run a load when one of the two slots is free.
     * @param task - The load.
     */
    private enqueue(task: () => Promise<void>): void {
        this.queue.push(task);
        this.pump();
    }

    /** Start queued loads while a slot is free. */
    private pump(): void {
        while (this.running < CONCURRENT_LOADS && this.queue.length > 0) {
            const task = this.queue.shift();
            if (task === undefined) {
                return;
            }

            this.running++;
            void task().finally(() => {
                this.running--;
                this.pump();
            });
        }
    }

    /**
     * Repaint an entry's nodes on the next frame, with every other entry finished by then.
     * @param entry - The entry.
     */
    private requestRepaint(entry: Entry): void {
        this.dirty.add(entry);
        if (this.flushScheduled) {
            return;
        }

        this.flushScheduled = true;
        this.scene.onBeforeRenderObservable.addOnce(() => {
            this.flush();
        });
    }

    /** Repaint every node of every entry that became drawable, then report. */
    private flush(): void {
        this.flushScheduled = false;
        const entries = [...this.dirty];
        this.dirty.clear();
        for (const entry of entries) {
            for (const user of [...entry.users]) {
                if (user.isDisposed()) {
                    entry.users.delete(user);
                } else {
                    user.updateStyle();
                }
            }
        }

        for (const ref of new Set(entries.map((entry) => entry.ref))) {
            this.report(ref);
        }
    }

    /**
     * The nodes drawing an entry now.
     * @param entry - The entry.
     * @returns How many, and whether a coloured one is untinted.
     */
    private drawing(entry: Entry): { nodes: number; colorIgnored: boolean } {
        let nodes = 0;
        let colorIgnored = false;
        for (const user of entry.users) {
            if (user.isDisposed()) {
                continue;
            }

            const drawn = user.modelDrawn();
            if (drawn.template !== null && drawn.template === entry.template) {
                nodes++;
                colorIgnored ||= drawn.colored && !drawn.tinted;
            }
        }

        return { nodes, colorIgnored };
    }

    /**
     * Publish a drawn model with what is worth saying about it.
     * @param ref - The model.
     */
    private report(ref: string): void {
        const status = this.statusOf(ref);
        const entries = [...this.entries.values()].filter((entry) => entry.ref === ref && entry.template !== null);
        if (entries.length === 0) {
            return;
        }

        const problems: CodedFact[] = (status.record?.problems ?? []).filter((fact) => fact.code.startsWith("W_"));
        let nodes = 0;
        let colorIgnored = false;
        let transparent = false;
        for (const entry of entries) {
            const drawn = this.drawing(entry);
            nodes += drawn.nodes;
            colorIgnored ||= drawn.colorIgnored;
            transparent ||= entry.template?.transparent === true;
        }

        // Only a model on screen is "drawn": a template kept for a moment after its layer went is not.
        if (nodes === 0) {
            return;
        }

        const template = entries[0].template as ModelTemplate;
        const bytes = status.record?.byteLength ?? 0;
        if (template.triangles > HEAVY.triangles || template.materials > HEAVY.materials || bytes > HEAVY.bytes) {
            problems.push({
                code: "W_MODEL_HEAVY",
                params: { triangles: template.triangles, materials: template.materials, nodes },
            });
        }

        if (transparent && nodes > TRANSPARENT_NODES) {
            problems.push({ code: "W_MODEL_TRANSPARENT", params: { nodes } });
        }

        const scene = this.sceneTriangles();
        const budget = this.session.assets.limits().sceneTriangleBudget;
        if (scene.triangles > budget) {
            problems.push({
                code: "W_MODEL_BUDGET",
                params: { nodes: scene.nodes, triangles: scene.triangles, budget },
            });
        }

        if (colorIgnored) {
            problems.push({ code: "W_MODEL_COLOR_IGNORED", params: { layerIds: this.colorLayers() } });
        }

        if (status.record !== undefined) {
            const clips = (() => {
                try {
                    return this.session.assets.inspect(status.record.id).animations.map((clip) => clip.name);
                } catch {
                    return [];
                }
            })();
            if (clips.length > 0 && !problems.some((fact) => fact.code === "W_MODEL_HAS_ANIMATIONS")) {
                problems.push({ code: "W_MODEL_HAS_ANIMATIONS", params: { clips } });
            }
        }

        this.settle(ref, "drawn", problems);
    }

    /**
     * Every model triangle drawn in the scene.
     * @returns The triangles and the nodes drawing them.
     */
    private sceneTriangles(): { triangles: number; nodes: number } {
        let triangles = 0;
        let nodes = 0;
        for (const entry of this.entries.values()) {
            if (entry.template !== null) {
                const drawn = this.drawing(entry).nodes;
                nodes += drawn;
                triangles += drawn * entry.template.triangles;
            }
        }

        return { triangles, nodes };
    }

    /**
     * Where a model stands, made on first use.
     * @param ref - The model.
     * @returns Its status.
     */
    private statusOf(ref: string): RefStatus {
        let status = this.status.get(ref);
        if (status === undefined) {
            status = { state: "pending", problems: [], published: "", warned: false };
            this.status.set(ref, status);
        }

        return status;
    }

    /**
     * Move a model to a state and publish it, unless the same event was the last one published.
     * @param ref - The model.
     * @param state - Its state.
     * @param problems - What is worth saying.
     */
    private settle(ref: string, state: ModelState, problems: readonly CodedFact[]): void {
        const status = this.statusOf(ref);
        status.state = state;
        status.problems = [...problems];
        const signature = JSON.stringify([state, problems]);
        if (signature === status.published) {
            return;
        }

        status.published = signature;
        const id = status.record?.state === "accepted" ? status.record.id : undefined;
        this.session.publishModelChange(
            Object.freeze({
                ref,
                ...(id === undefined ? {} : { id }),
                layerIds: Object.freeze(layersNaming(this.session.styles, ref, "node.model")),
                state,
                problems: Object.freeze([...problems]),
            }),
        );
        if ((state === "rejected" || state === "failed") && !status.warned) {
            status.warned = true;
            const [first] = problems;
            // The one line a developer sees when a model they named is not drawn.
            console.warn(`graphty-element: model ${ref} was not drawn: ${first?.code ?? state}`, first?.params ?? {});
        }
    }

    /**
     * After a style change: count which templates some layer still names, and say again what is
     * worth saying about every drawn model (a layer may have coloured it, or tinted it).
     */
    private recount(): void {
        // The nodes take the change on the frame that drains it, so the report waits for that frame.
        if (!this.reportScheduled) {
            this.reportScheduled = true;
            this.scene.onAfterRenderObservable.addOnce(() => {
                this.reportScheduled = false;
                const drawn = [...this.entries.values()].filter((entry) => entry.template !== null);
                for (const ref of new Set(drawn.map((entry) => entry.ref))) {
                    this.report(ref);
                }
            });
        }

        for (const entry of this.entries.values()) {
            const named = layersNaming(this.session.styles, entry.ref, "node.model").length > 0;
            if (named) {
                entry.idle = -1;
            } else if (entry.idle < 0) {
                entry.idle = 0;
            }
        }
    }

    /** One frame: dispose templates nothing has used for {@link IDLE_FRAMES} frames. */
    private tick(): void {
        for (const entry of [...this.entries.values()]) {
            // Still loading, or failed: there is no template to free yet.
            if (entry.idle < 0 || entry.template === null) {
                continue;
            }

            if (this.drawing(entry).nodes > 0) {
                // A node still draws it (a value computed per node names no layer): keep it.
                continue;
            }

            entry.idle++;
            if (entry.idle >= IDLE_FRAMES) {
                entry.template?.dispose();
                entry.template = null;
                this.entries.delete(entry.key);
            }
        }
    }

    /** Free every template and stop listening. */
    private dispose(): void {
        this.unwatch();
        this.unwatchSupplied();
        this.scene.onAfterRenderObservable.remove(this.frames);
        for (const entry of this.entries.values()) {
            entry.template?.dispose();
        }

        this.entries.clear();
        caches.delete(this.scene);
    }
}
