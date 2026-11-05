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
import type { Scene } from "@babylonjs/core/scene.js";

import type { NetworkApiInternal } from "../session/network";
import type { CodedFact } from "../session/shared";
import type { ModelChange, ModelState } from "../session/types";
import { decideFetch, type GateSession, layersNaming } from "./fetchGate";

/** A node that draws a picture. */
export interface TextureUser {
    isDisposed(): boolean;
    /** Draw the node again from its current paint. */
    updateStyle(): void;
}

/** What the cache reads from the session. */
interface TextureSession extends GateSession {
    readonly network: NetworkApiInternal;
    publishModelChange(change: ModelChange): void;
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
    ready: Promise<BaseTexture | null>;
}

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

/** The pictures one scene draws. */
export class TextureCache {
    private readonly entries = new Map<string, Entry>();
    private readonly published = new Map<string, string>();
    private repaintScheduled = false;
    private readonly dirty = new Set<Entry>();

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
        scene.onDisposeObservable.addOnce(unwatch);
    }

    /**
     * Whether a picture is being fetched or read, or waits for its nodes' repaint.
     * @returns True while one is.
     */
    get loading(): boolean {
        return [...this.entries.values()].some((entry) => entry.landing || entry.fetching);
    }

    /**
     * The cache of a scene, made on first use.
     * @param scene - The scene.
     * @param session - Its session, or anything without assets (then there is no cache).
     * @returns The cache, or null.
     */
    static forScene(scene: Scene, session: unknown): TextureCache | null {
        const held = session as Partial<TextureSession> | undefined;
        if (held?.publishModelChange === undefined || held.assets === undefined || held.network === undefined) {
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
