/**
 * @file The pictures a scene draws on nodes (`node.texture`, design/rendering/node-models.md
 * section 2.8): one Babylon texture per picture, shared by every node and model that names it.
 *
 * A picture is an image asset of `session.assets` (a PNG, JPEG or WebP added as a file or by URL),
 * fetched through the same gate as a model: at once from the page's code, else once the reader
 * allows its host (`session.network`). Its state is published as `model:changed` under the ref the
 * layer named, like a model's. The browser decodes the bytes (no URL is fetched, so a model load
 * that guards every URL Babylon asks for never refuses a picture), and a transparent pixel keeps
 * its alpha but is stored white, the node's surface under the picture, never the hidden color it
 * held: a flat node cuts it out, a solid one shows white there.
 */

import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import type { Observer } from "@babylonjs/core/Misc/observable.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { NetworkApiInternal } from "../session/network";
import type { CodedFact } from "../session/shared";
import type { ModelChange, ModelState, SessionEventMap } from "../session/types";
import { decideFetch, type GateSession, layersNaming } from "./fetchGate";

/** A node that draws a picture. */
export interface TextureUser {
    isDisposed(): boolean;
    /** Draw the node again from its current paint. */
    updateStyle(): void;
    /** The picture the node draws now, or null. */
    imageDrawn(): BaseTexture | null;
}

/** What the cache reads from the session. */
interface TextureSession extends GateSession {
    readonly network: NetworkApiInternal;
    publishModelChange(change: ModelChange): void;
    on<K extends keyof SessionEventMap>(event: K, listener: (detail: SessionEventMap[K]) => void): () => void;
}

/** One picture. */
interface Entry {
    readonly ref: string;
    /** The asset, once held. */
    id?: string;
    /** Read and waiting for its nodes' repaint: still on its way to the screen. */
    landing: boolean;
    /** Allowed and being fetched or read (not while the reader is asked): on its way too. */
    fetching: boolean;
    /** The host the reader refused, so it is fetched once that host is allowed after all. */
    denied?: string;
    texture: BaseTexture | null;
    readonly users: Set<TextureUser>;
    /** Model templates built with it ({@link TextureCache.hold}). */
    holds: number;
    /** Frames since no layer named it and nothing drew it; -1 while it is in use. */
    idle: number;
    ready: Promise<BaseTexture | null>;
}

/** Frames a picture no layer names is kept before it is disposed, as a model template is. */
const IDLE_FRAMES = 10;

/** The cache of each scene. */
const caches = new WeakMap<Scene, TextureCache>();

/**
 * Whether a scene still has a picture read and not yet on its nodes: the picture will change.
 * @param scene - The scene.
 * @returns True while a picture is on its way.
 */
export function texturesLoading(scene: Scene): boolean {
    return caches.get(scene)?.loading === true;
}

/**
 * Whether a scene holds a picture nothing draws and no layer names, which it frees after
 * {@link IDLE_FRAMES} frames: a graph drawing on demand has to keep drawing until then.
 * @param scene - The scene.
 * @returns True while such a picture waits to be freed.
 */
export function texturesFreeing(scene: Scene): boolean {
    return caches.get(scene)?.freeing === true;
}

/**
 * Tell a scene's cache which picture a node draws now, so a frame counts the nodes drawing a
 * picture without asking every node (issue #6208).
 * @param scene - The node's scene.
 * @param user - The node.
 * @param texture - The picture it draws now, or null.
 */
export function noteImageDrawn(scene: Scene, user: TextureUser, texture: BaseTexture | null): void {
    caches.get(scene)?.drew(user, texture);
}

/**
 * Read a picture's bytes into a texture: its pixels, each transparent one stored over white with
 * its alpha kept.
 * @param scene - The scene.
 * @param bytes - The PNG, JPEG or WebP.
 * @param name - A name for the texture.
 * @returns The texture.
 */
async function textureOf(scene: Scene, bytes: Uint8Array, name: string): Promise<BaseTexture> {
    const bitmap = await createImageBitmap(new Blob([bytes.slice()]), { premultiplyAlpha: "none" });
    const { width, height } = bitmap;
    const context = new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true });
    if (context === null) {
        bitmap.close();
        throw new Error("the picture could not be read");
    }

    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const { data } = context.getImageData(0, 0, width, height);
    for (let at = 0; at < data.length; at += 4) {
        const alpha = data[at + 3] / 255;
        for (let channel = at; channel < at + 3; channel++) {
            data[channel] = Math.round(data[channel] * alpha + 255 * (1 - alpha));
        }
    }

    const texture = RawTexture.CreateRGBATexture(
        new Uint8Array(data.buffer),
        width,
        height,
        scene,
        true,
        true,
        Texture.TRILINEAR_SAMPLINGMODE,
    );
    texture.name = name;
    return texture;
}

/**
 * Report that a picture a node draws (`node.image`) could not be loaded, nor its fallback, as
 * `model:changed` under the URL the layer named, `state` "failed", with `E_IMAGE_LOAD`.
 * @param session - The session, or anything that cannot publish (then nothing is reported).
 * @param ref - The URL the layer named.
 * @param failed - The URL that failed last.
 */
export function publishImageFailure(session: unknown, ref: string, failed: string): void {
    const held = session as Partial<GateSession & Pick<TextureSession, "publishModelChange">> | undefined;
    if (held?.publishModelChange === undefined || held.styles === undefined) {
        return;
    }

    held.publishModelChange(
        Object.freeze({
            ref,
            layerIds: Object.freeze(layersNaming(held.styles, ref, "node.image")),
            state: "failed" as const,
            problems: Object.freeze([{ code: "E_IMAGE_LOAD", params: { url: failed.slice(0, 256) } }]),
        }),
    );
    console.warn(`graphty-element: node image ${ref.slice(0, 80)} was not drawn: E_IMAGE_LOAD`);
}

/** The pictures one scene draws. */
export class TextureCache {
    private readonly entries = new Map<string, Entry>();
    private readonly published = new Map<string, string>();
    private repaintScheduled = false;
    private readonly dirty = new Set<Entry>();
    private readonly frames: Observer<Scene>;
    /** The picture each node draws, and how many nodes draw each: kept by {@link drew}. */
    private readonly drawnBy = new Map<TextureUser, BaseTexture>();
    private readonly drawnCount = new Map<BaseTexture, number>();

    /**
     * Use {@link TextureCache.forScene}.
     * @param scene - The scene the textures draw in.
     * @param session - The session whose assets, gate and layers it reads.
     */
    private constructor(
        private readonly scene: Scene,
        private readonly session: TextureSession,
    ) {
        const unwatch = session.network.watchAllowed(() => {
            this.retryAllowed();
        });
        const unwatchStyles = session.on("style:changed", () => {
            this.recount();
        });
        this.frames = scene.onAfterRenderObservable.add(() => {
            this.tick();
        });
        scene.onDisposeObservable.addOnce(() => {
            unwatch();
            unwatchStyles();
            scene.onAfterRenderObservable.remove(this.frames);
            caches.delete(scene);
        });
    }

    /**
     * Whether a picture is being fetched or read, or waits for its nodes' repaint.
     * @returns True while one is.
     */
    get loading(): boolean {
        return [...this.entries.values()].some((entry) => entry.landing || entry.fetching);
    }

    /**
     * Whether a loaded picture counts down to being freed (see {@link tick}).
     * @returns True while one does.
     */
    get freeing(): boolean {
        return [...this.entries.values()].some(
            (entry) => entry.idle >= 0 && entry.texture !== null && !this.inUse(entry),
        );
    }

    /**
     * The cache of a scene, made on first use.
     * @param scene - The scene.
     * @param session - Its session, or anything without assets (then there is no cache).
     * @returns The cache, or null.
     */
    static forScene(scene: Scene, session: unknown): TextureCache | null {
        const held = session as Partial<TextureSession> | undefined;
        if (
            held?.publishModelChange === undefined ||
            held.assets === undefined ||
            held.network === undefined ||
            held.on === undefined
        ) {
            return null;
        }

        let cache = caches.get(scene);
        if (cache === undefined) {
            cache = new TextureCache(scene, held as TextureSession);
            caches.set(scene, cache);
        }

        return cache;
    }

    /**
     * The texture a node names, once it is ready; the first ask starts the load, and the node is
     * repainted when it is ready. Null while it loads, and when it failed.
     * @param user - The node.
     * @param ref - The asset id or URL `node.texture` names.
     * @returns The texture, or null.
     */
    textureFor(user: TextureUser, ref: string): BaseTexture | null {
        const entry = this.entryOf(ref);
        entry.users.add(user);
        if (entry.texture !== null) {
            entry.idle = -1;
        }

        return entry.texture;
    }

    /**
     * The texture a model's template is built with.
     * @param ref - The asset id or URL.
     * @returns The texture, or null when it could not be drawn.
     */
    load(ref: string): Promise<BaseTexture | null> {
        return this.entryOf(ref).ready;
    }

    /**
     * Count a model template built with a picture, or one disposed: a held picture is never freed.
     * @param ref - The asset id or URL.
     * @param by - 1 when a template is built with it, -1 when that template is disposed.
     */
    hold(ref: string, by: 1 | -1): void {
        const entry = this.entries.get(ref);
        if (entry !== undefined) {
            entry.holds = Math.max(0, entry.holds + by);
        }
    }

    /**
     * Note the picture a node draws now, or null when it draws none or is disposed.
     * @param user - The node.
     * @param texture - Its picture.
     */
    drew(user: TextureUser, texture: BaseTexture | null): void {
        const before = this.drawnBy.get(user) ?? null;
        if (before === texture) {
            return;
        }

        if (before !== null) {
            const left = (this.drawnCount.get(before) ?? 1) - 1;
            if (left > 0) {
                this.drawnCount.set(before, left);
            } else {
                this.drawnCount.delete(before);
            }
        }

        if (texture === null) {
            this.drawnBy.delete(user);
        } else {
            this.drawnBy.set(user, texture);
            this.drawnCount.set(texture, (this.drawnCount.get(texture) ?? 0) + 1);
        }
    }

    /**
     * Whether a model template or a node draws an entry's picture now.
     * @param entry - The entry.
     * @returns True while one does.
     */
    private inUse(entry: Entry): boolean {
        return entry.holds > 0 || (entry.texture !== null && this.drawnCount.has(entry.texture));
    }

    /** After a style change: mark the pictures no layer names any more, which {@link tick} counts down. */
    private recount(): void {
        for (const entry of this.entries.values()) {
            if (layersNaming(this.session.styles, entry.ref, "node.texture").length > 0) {
                entry.idle = -1;
            } else if (entry.idle < 0) {
                entry.idle = 0;
            }
        }
    }

    /** One frame: dispose the pictures nothing has named or drawn for {@link IDLE_FRAMES} frames. */
    private tick(): void {
        for (const entry of [...this.entries.values()]) {
            // Still loading, failed, or named: nothing to free.
            if (entry.idle < 0 || entry.texture === null || this.inUse(entry)) {
                continue;
            }

            entry.idle++;
            if (entry.idle >= IDLE_FRAMES) {
                entry.texture.dispose();
                entry.texture = null;
                this.entries.delete(entry.ref);
                this.dirty.delete(entry);
            }
        }
    }

    /**
     * An entry, started on first use.
     * @param ref - The asset id or URL.
     * @returns The entry.
     */
    private entryOf(ref: string): Entry {
        let entry = this.entries.get(ref);
        if (entry === undefined) {
            const users = new Set<TextureUser>();
            const made: Entry = {
                ref,
                landing: false,
                fetching: false,
                texture: null,
                users,
                holds: 0,
                idle: -1,
                ready: Promise.resolve(null),
            };
            entry = made;
            this.entries.set(ref, made);
            made.ready = this.start(made).then((texture) => {
                made.fetching = false;
                made.texture = texture;
                if (texture !== null) {
                    made.landing = true;
                    this.repaint(made);
                }

                return texture;
            });
        }

        return entry;
    }

    /**
     * Gate, fetch and read one picture.
     * @param entry - The picture's entry.
     * @returns The texture, or null when it was refused or failed.
     */
    private async start(entry: Entry): Promise<BaseTexture | null> {
        const { ref } = entry;
        const decided = decideFetch(this.session, ref, "node.texture");
        if (decided !== null && "code" in decided) {
            this.publish(ref, "rejected", [decided]);
            return null;
        }

        if (decided !== null) {
            this.publish(ref, "pending", []);
            if (!(await this.session.network.ask(decided))) {
                entry.denied = decided.url.host;
                this.publish(ref, "rejected", [
                    {
                        code: "E_MODEL_URL_BLOCKED",
                        params: { hosts: [decided.url.host], layerIds: [...decided.layerIds], denied: true },
                    },
                ]);
                return null;
            }
        }

        entry.fetching = true;
        this.publish(ref, "pending", []);
        const record = await this.session.assets.ready(ref);
        if (record.state !== "accepted") {
            this.publish(ref, "rejected", record.problems);
            return null;
        }

        if (record.kind !== "image") {
            this.publish(ref, "rejected", [
                {
                    code: "E_MODEL_FORMAT_UNSUPPORTED",
                    params: { format: record.format, fileName: record.path ?? "", assetKind: "model" },
                },
            ]);
            return null;
        }

        entry.id = record.id;
        this.publish(ref, "accepted", record.problems, record.id);
        try {
            const [bytes] = this.session.assets.files(record.id).values();
            return await textureOf(this.scene, bytes, `graphty-texture-${record.id}`);
        } catch {
            this.publish(ref, "failed", [{ code: "E_MODEL_PARSE", params: { format: record.format } }], record.id);
            return null;
        }
    }

    /** Start again every picture the reader refused whose host is allowed now. */
    private retryAllowed(): void {
        for (const entry of [...this.entries.values()]) {
            if (entry.denied !== undefined && this.session.network.allowed(entry.denied)) {
                this.entries.delete(entry.ref);
                const again = this.entryOf(entry.ref);
                for (const user of entry.users) {
                    again.users.add(user);
                }
            }
        }
    }

    /**
     * Repaint an entry's nodes on the next frame.
     * @param entry - The entry.
     */
    private repaint(entry: Entry): void {
        this.dirty.add(entry);
        if (this.repaintScheduled) {
            return;
        }

        this.repaintScheduled = true;
        this.scene.onBeforeRenderObservable.addOnce(() => {
            this.repaintScheduled = false;
            const entries = [...this.dirty];
            this.dirty.clear();
            for (const each of entries) {
                for (const user of [...each.users]) {
                    if (user.isDisposed()) {
                        each.users.delete(user);
                    } else {
                        user.updateStyle();
                    }
                }

                each.landing = false;
                this.publish(each.ref, "drawn", [], each.id);
            }
        });
    }

    /**
     * Publish a picture's state once per distinct event, and warn once when it is not drawn.
     * @param ref - What the layer named.
     * @param state - Its state.
     * @param problems - What is worth saying.
     * @param id - The asset, once held.
     */
    private publish(ref: string, state: ModelState, problems: readonly CodedFact[], id?: string): void {
        const signature = JSON.stringify([state, problems]);
        if (this.published.get(ref) === signature) {
            return;
        }

        this.published.set(ref, signature);
        this.session.publishModelChange(
            Object.freeze({
                ref,
                ...(id === undefined ? {} : { id: id as `asset:${string}` }),
                layerIds: Object.freeze(layersNaming(this.session.styles, ref, "node.texture")),
                state,
                problems: Object.freeze([...problems]),
            }),
        );
        if (state === "rejected" || state === "failed") {
            console.warn(`graphty-element: texture ${ref} was not drawn: ${problems[0]?.code ?? state}`);
        }
    }
}
