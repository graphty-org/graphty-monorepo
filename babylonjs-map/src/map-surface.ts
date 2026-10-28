import {
    type BaseTexture,
    BoundingInfo,
    Camera,
    Color3,
    FresnelParameters,
    Frustum,
    type Matrix,
    Mesh,
    type Nullable,
    Observable,
    type Observer,
    type Scene,
    StandardMaterial,
    Texture,
    TransformNode,
    Vector3,
    VertexData,
} from "@babylonjs/core";

import type { GeoBounds, ProjectionId } from "./projection/types.js";
import {
    type MapRect,
    type MapSource,
    mapSources,
    type ResolvedSource,
    resolveSource,
    type TileId,
} from "./sources.js";

/** Loads one tile's picture. The default makes a Babylon.js `Texture` from the URL. */
export type TextureLoader = (url: string, scene: Scene) => Promise<BaseTexture>;

/** Options every map surface takes. */
export interface MapSurfaceOptions {
    /** What to draw, bottom layer first. Default the bundled Natural Earth world image. */
    sources?: readonly MapSource[];
    /**
     * Load a finer tile once a texel of the drawn tile is larger than `lodScale` screen pixels
     * (a tile drawn more than `tileSize * lodScale` pixels across). Default 1.
     */
    lodScale?: number;
    /** At most this many tiles are drawn per source. Default 256. */
    maxTiles?: number;
    /** Loaded tiles kept for reuse; the least recently drawn beyond this are disposed. Default 256. */
    maxCachedTiles?: number;
    /** At most this many tiles load at once. Default 6. */
    maxConcurrentLoads?: number;
    /** The rendering group of every map mesh. Default 0. */
    renderingGroupId?: number;
    /** Replaces the default texture loader (tests, caching, custom headers). */
    loadTexture?: TextureLoader;
}

/** Tiles loading, loaded and failed. */
export interface TileCounts {
    loading: number;
    ready: number;
    failed: number;
}

/** What a map is doing: tiles loading, loaded and failed, over every source and per source. */
export interface MapStatus extends TileCounts {
    /** The same counts for each source, bottom layer first. */
    layers: TileCounts[];
}

/** A source's credit, and where it links to. */
export interface MapCredit {
    readonly text: string;
    /** The provider's copyright or license page, or "" when it has none. */
    readonly url: string;
}

interface Layer {
    readonly resolved: ResolvedSource;
    readonly index: number;
    /** The source, as JSON: a tile's texture is kept across `setSources` while its source stays. */
    readonly key: string;
}

interface Entry {
    readonly key: string;
    layer: Layer;
    readonly tile: TileId;
    /** Which copy of the world the tile is drawn in: 0, or one world west (-1) or east (1). */
    readonly copy: number;
    state: "queued" | "loading" | "ready" | "failed";
    texture?: BaseTexture;
    mesh?: Mesh;
    lastUsed: number;
    /** Failed loads in a row, for the backoff. */
    failures: number;
    /** When a failed tile may be asked for again, in `Date.now()` milliseconds. */
    retryAt: number;
}

/** What one wanted tile is drawn with. */
interface Pick {
    readonly entry: Entry;
    /** The nearest loaded ancestor drawn in the tile's place while it is not loaded. */
    readonly fallback: Entry | null;
}

/** The longest wait before a failed tile is asked for again, in milliseconds. */
const MAX_RETRY_MS = 60_000;

/**
 * The camera's current view-projection; `getTransformationMatrix()` can be a frame old.
 * @param camera - The camera.
 * @returns View times projection.
 */
const viewProjection = (camera: Camera): Matrix => camera.getViewMatrix().multiply(camera.getProjectionMatrix());

const tileKey = (layer: Layer, t: TileId, copy: number): string => `${layer.key}|${copy}|${t.z}/${t.x}/${t.y}`;

/**
 * A globe's shading, independent of the scene's lights: the picture at full brightness where the
 * surface faces the eye, falling to about half at the rim. (Babylon's fresnel term is
 * `(bias + |view . normal|) ^ power`, blended from `leftColor` at 0 to `rightColor` at 1.)
 * @returns The fresnel parameters for a tile's emissive picture.
 */
function rimShade(): FresnelParameters {
    return new FresnelParameters({
        bias: 0.2,
        power: 1,
        leftColor: new Color3(0.35, 0.37, 0.42),
        rightColor: Color3.White(),
    });
}

/**
 * Loads a URL as a Babylon.js texture; rejects when the image fails (CORS, 403, 404, 429).
 * @param url - The picture's URL.
 * @param scene - The scene to load it into.
 * @returns The loaded texture.
 */
export const loadTexture: TextureLoader = (url, scene) =>
    new Promise((resolve, reject) => {
        const texture: Texture = new Texture(url, scene, {
            onLoad: () => {
                resolve(texture);
            },
            onError: (message, exception) => {
                texture.dispose();
                reject(exception instanceof Error ? exception : new Error(message ?? url));
            },
        });
    });

/**
 * A picture as a light gray backdrop: each pixel's luminance, compressed into the light end, so
 * the land and water still read and anything drawn over it stands out. Needs a DOM canvas; without
 * one (Node) the picture is returned as it is.
 * @param url - The picture's URL.
 * @returns A data URL of the gray picture, or `url`.
 */
async function grayPicture(url: string): Promise<string> {
    if (typeof document === "undefined" || typeof Image === "undefined") {
        return url;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
        image.onload = () => {
            resolve();
        };
        image.onerror = () => {
            reject(new Error(url));
        };
        image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (context === null) {
        return url;
    }
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = pixels;
    for (let i = 0; i < data.length; i += 4) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const gray = 176 + luminance * 0.27; // 176 (dark land) to 245 (white)
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * The machinery a flat map and a globe share: a tile pyramid per source, picked by how large a
 * texel is drawn on screen, loaded on demand with a cap on concurrent requests, drawn
 * coarse-under-fine so zooming never shows holes, cached and disposed least recently used first.
 * Only tiles in view are ever requested. A tile that fails is asked for again after a backoff
 * (1 s, doubling, at most a minute) and at once when the browser comes back online; while it is
 * missing its loaded siblings give way to their common parent, so an area is never drawn from two
 * levels once loading settles.
 */
export abstract class MapSurface {
    /** Every map mesh is a child of this node; move, rotate or scale it to place the map. */
    readonly root: TransformNode;
    /**
     * Fires when the drawn picture changes (a tile loaded or failed, or the sources drawn and so the
     * credits changed); render a frame then.
     */
    readonly onChangedObservable = new Observable<MapSurface>();

    protected readonly scene: Scene;
    /** Tiles coarser than this level are never culled (their few sample points miss a curved patch). */
    protected cullFromZoom = 0;
    private layers: Layer[] = [];
    private readonly entries = new Map<string, Entry>();
    private readonly queue: Entry[] = [];
    private readonly options: Required<Omit<MapSurfaceOptions, "sources">>;
    private inflight = 0;
    private clock = 0;
    private dirty = true;
    private disposed = false;
    private readonly lastView = new Float32Array(18);
    private readonly beforeRender: Nullable<Observer<Scene>>;
    /** The layers that drew at least one tile in the last update: the credits shown. */
    private drawn = new Set<Layer>();
    /** Polar caps of the layers that stop short of the poles, by layer key and pole. */
    private readonly caps = new Map<string, Mesh>();
    private readonly timers = new Set<ReturnType<typeof setTimeout>>();
    private readonly online = (): void => {
        for (const e of this.entries.values()) {
            e.retryAt = 0;
        }
        this.changed();
    };

    protected constructor(name: string, scene: Scene, options: MapSurfaceOptions) {
        this.scene = scene;
        this.root = new TransformNode(name, scene);
        this.options = {
            lodScale: options.lodScale ?? 1,
            maxTiles: options.maxTiles ?? 256,
            maxCachedTiles: options.maxCachedTiles ?? 256,
            maxConcurrentLoads: options.maxConcurrentLoads ?? 6,
            renderingGroupId: options.renderingGroupId ?? 0,
            loadTexture: options.loadTexture ?? loadTexture,
        };
        this.setSources(options.sources ?? [mapSources["natural-earth"]]);
        this.beforeRender = scene.onBeforeRenderObservable.add(() => {
            if (this.dirty || this.viewChanged()) {
                this.update();
            }
        });
        (globalThis as { addEventListener?: (type: string, listener: () => void) => void }).addEventListener?.(
            "online",
            this.online,
        );
    }

    /**
     * The sources drawn, bottom layer first.
     * @returns The sources.
     */
    get sources(): MapSource[] {
        return this.layers.map((l) => l.resolved.source);
    }

    /**
     * The credits of the sources that drew a tile in the last update, without repeats. Show them
     * whenever the map is visible; a source whose tiles all failed is not drawn and not credited.
     * @returns The credits.
     */
    get attribution(): string[] {
        return this.credits.map((c) => c.text);
    }

    /**
     * The credits of the sources drawn, each with the page it links to.
     * @returns The credits, bottom layer first, without repeats.
     */
    get credits(): MapCredit[] {
        const seen = new Map<string, MapCredit>();
        for (const layer of this.layers) {
            const { attribution: text, attributionUrl: url } = layer.resolved;
            if (this.drawn.has(layer) && text !== "" && !seen.has(text)) {
                seen.set(text, { text, url });
            }
        }
        return [...seen.values()];
    }

    /**
     * Tiles loading, loaded and failed, in all and per source.
     * @returns The counts.
     */
    get status(): MapStatus {
        const layers = this.layers.map(() => ({ loading: 0, ready: 0, failed: 0 }));
        const status = { loading: 0, ready: 0, failed: 0 };
        for (const e of this.entries.values()) {
            const state = e.state === "queued" ? "loading" : e.state;
            status[state]++;
            layers[e.layer.index][state]++;
        }
        return { ...status, layers };
    }

    /**
     * Replaces what the map draws. Tiles of sources no longer drawn are disposed; a source that
     * stays (the bundled base under a changed tile service) keeps its loaded pictures.
     * @param sources - The sources, bottom layer first.
     */
    setSources(sources: readonly MapSource[]): void {
        const counts = new Map<string, number>();
        this.layers = sources.map((source, index) => {
            const json = JSON.stringify(source);
            const n = counts.get(json) ?? 0;
            counts.set(json, n + 1);
            return { resolved: resolveSource(source), index, key: n === 0 ? json : `${json}#${String(n)}` };
        });
        const byKey = new Map(this.layers.map((l) => [l.key, l]));
        for (const e of [...this.entries.values()]) {
            const layer = byKey.get(e.layer.key);
            if (layer === undefined) {
                this.disposeEntry(e);
            } else {
                // Its stacking order may have moved: the mesh is rebuilt, the picture kept.
                this.disposeMesh(e);
                e.layer = layer;
            }
        }
        this.disposeCaps();
        this.queue.length = 0;
        this.drawn = new Set();
        this.dirty = true;
    }

    /**
     * Picks, requests and shows the tiles for the active camera now. The map also does this
     * before every render in which the camera moved or a tile arrived.
     */
    update(): void {
        const camera = this.scene.activeCamera;
        if (this.disposed || !camera) {
            return;
        }
        this.dirty = false;
        this.clock++;
        const now = Date.now();
        const planes = Frustum.GetPlanes(viewProjection(camera));
        const shown = new Set<Entry>();
        const drawn = new Set<Layer>();
        this.queue.length = 0;
        for (const layer of this.layers) {
            // The caps' tiles first, so they load ahead of the finer ones.
            if (this.fillsPoles() && layer.resolved.projection.maxLatitude < 90 && this.drawCaps(layer, now)) {
                drawn.add(layer);
            }
            for (const copy of this.copies()) {
                const picks = this.select(layer, copy, camera, planes).map((tile) => this.want(layer, tile, copy, now));
                for (const entry of this.settledPicks(picks)) {
                    shown.add(entry);
                    drawn.add(layer);
                }
            }
        }
        // The credits follow what is drawn: a host showing them hears when that changes.
        const creditsChanged = drawn.size !== this.drawn.size || [...drawn].some((l) => !this.drawn.has(l));
        this.drawn = drawn;
        let meshesChanged = false;
        for (const e of this.entries.values()) {
            if (e.mesh && e.mesh.isEnabled(false) !== shown.has(e)) {
                e.mesh.setEnabled(shown.has(e));
                meshesChanged = true;
            }
        }
        for (const e of shown) {
            e.lastUsed = this.clock;
            if (!e.mesh) {
                meshesChanged = true;
            }
            this.showMesh(e);
        }
        for (const e of [...this.entries.values()]) {
            if (e.state === "queued" && !this.queue.includes(e)) {
                this.entries.delete(e.key); // out of view before it started: never fetched
            }
        }
        this.pump();
        this.evict(shown);
        // A host that draws only on demand (or freezes its list of drawn meshes) draws the frame
        // these meshes and credits appeared in again.
        if (creditsChanged || meshesChanged) {
            this.onChangedObservable.notifyObservers(this);
        }
    }

    /** Disposes every mesh, material and texture, and stops following the camera. */
    dispose(): void {
        this.disposed = true;
        this.scene.onBeforeRenderObservable.remove(this.beforeRender);
        (globalThis as { removeEventListener?: (type: string, listener: () => void) => void }).removeEventListener?.(
            "online",
            this.online,
        );
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        this.timers.clear();
        for (const e of [...this.entries.values()]) {
            this.disposeEntry(e);
        }
        this.disposeCaps();
        this.queue.length = 0;
        this.root.dispose();
        this.onChangedObservable.clear();
    }

    /** Writes the scene position of a latitude and longitude into `out`. */
    protected abstract place(lat: number, lon: number, out: Vector3): void;

    /** The box the surface shows, or null for the whole map. */
    protected abstract clipBounds(): GeoBounds | null;

    /**
     * Columns and rows of a tile's mesh.
     * @param lonSpan - Degrees of longitude the tile's mesh covers.
     * @param latSpan - Degrees of latitude it covers.
     * @param reprojected - Whether the source's projection is not the surface's.
     */
    protected abstract segments(lonSpan: number, latSpan: number, reprojected: boolean): [number, number];

    /** The surface's own projection, if it is flat. */
    protected abstract surfaceProjection(): ProjectionId | null;

    /** Whether a tile whose sample points are these is out of sight for reasons other than the frustum. */
    protected abstract occluded(samples: Vector3[], eye: Vector3): boolean;

    /**
     * The copies of the world a source is drawn in, as whole-world offsets: `[0]` for one world,
     * more where a flat map shows past 180 degrees.
     * @returns The offsets.
     */
    protected copies(): number[] {
        return [0];
    }

    /**
     * Whether the poles beyond a source's last latitude are filled from its coarsest tile's edge.
     * @returns True for a globe.
     */
    protected fillsPoles(): boolean {
        return false;
    }

    /**
     * Whether the surface is shaded as a ball: full brightness where it faces the eye, darker toward
     * its rim, so an unlit picture wrapped on a sphere reads as round rather than as a flat disc.
     * @returns True for a globe.
     */
    protected shadesAsSphere(): boolean {
        return false;
    }

    /** Drops every tile's mesh (the geometry changed) and redraws; keeps loaded textures. */
    protected invalidateGeometry(): void {
        for (const e of this.entries.values()) {
            this.disposeMesh(e);
        }
        this.disposeCaps();
        this.dirty = true;
    }

    /** Something changed the picture: update before the next render, and tell the host to render. */
    private changed(): void {
        this.dirty = true;
        this.onChangedObservable.notifyObservers(this);
    }

    private viewChanged(): boolean {
        const camera = this.scene.activeCamera;
        if (!camera) {
            return false;
        }
        const engine = this.scene.getEngine();
        const { m } = viewProjection(camera);
        const view = [...m, engine.getRenderWidth(), engine.getRenderHeight()];
        let changed = false;
        for (let i = 0; i < view.length; i++) {
            if (this.lastView[i] !== Math.fround(view[i])) {
                changed = true;
                this.lastView[i] = view[i];
            }
        }
        return changed;
    }

    /**
     * The part of a tile the surface shows, in the source's map units shifted by its world copy,
     * or null if none.
     * @param layer - The source's layer.
     * @param tile - The tile.
     * @param copy - The world copy.
     * @returns The rectangle, or null.
     */
    private clipped(layer: Layer, tile: TileId, copy: number): MapRect | null {
        const r = this.shifted(layer.resolved.rect(tile), copy);
        const bounds = this.clipBounds();
        if (!bounds) {
            return r;
        }
        const p = layer.resolved.projection;
        const a = p.forward({ lat: bounds[1][1], lon: 0 });
        const b = p.forward({ lat: bounds[0][1], lon: 0 });
        const c = {
            x0: Math.max(r.x0, (bounds[0][0] + 180) / 360),
            y0: Math.max(r.y0, a.y),
            x1: Math.min(r.x1, (bounds[1][0] + 180) / 360),
            y1: Math.min(r.y1, b.y),
        };
        return c.x1 > c.x0 && c.y1 > c.y0 ? c : null;
    }

    private shifted(r: MapRect, copy: number): MapRect {
        return copy === 0 ? r : { x0: r.x0 + copy, y0: r.y0, x1: r.x1 + copy, y1: r.y1 };
    }

    private mapToScene(layer: Layer, x: number, y: number, out: Vector3): Vector3 {
        const { lat, lon } = layer.resolved.projection.inverse({ x, y });
        this.place(lat, lon, out);
        return out;
    }

    /**
     * Nine points over a rectangle in scene units.
     * @param layer - The source's layer.
     * @param rect - The rectangle in map units.
     * @returns The points, row by row.
     */
    private samplesOf(layer: Layer, rect: MapRect): Vector3[] {
        const samples: Vector3[] = [];
        for (let j = 0; j <= 2; j++) {
            for (let i = 0; i <= 2; i++) {
                const x = rect.x0 + ((rect.x1 - rect.x0) * i) / 2;
                const y = rect.y0 + ((rect.y1 - rect.y0) * j) / 2;
                samples.push(this.mapToScene(layer, x, y, new Vector3()));
            }
        }
        return samples;
    }

    /**
     * The tiles of one source to draw: breadth first from the roots, split while a texel is drawn
     * larger than a screen pixel. A tile cut by the map's edge is sized as the whole tile, so the
     * ring at the edge loads at the same level as its neighbors.
     * @param layer - The source's layer.
     * @param copy - The world copy.
     * @param camera - The active camera.
     * @param planes - The camera's frustum.
     * @returns The tiles.
     */
    private select(layer: Layer, copy: number, camera: Camera, planes: ReturnType<typeof Frustum.GetPlanes>): TileId[] {
        const { resolved } = layer;
        const height = this.scene.getEngine().getRenderHeight();
        // Everything below is in the root's own space, so a moved or scaled map still picks right.
        const world = this.root.computeWorldMatrix(true);
        const eye = Vector3.TransformCoordinates(camera.globalPosition, world.clone().invert());
        const ortho =
            camera.mode === Camera.ORTHOGRAPHIC_CAMERA && camera.orthoTop !== null && camera.orthoBottom !== null
                ? (camera.orthoTop - camera.orthoBottom) / this.root.absoluteScaling.x
                : 0;
        const pending = resolved.roots();
        const wanted: TileId[] = [];
        while (pending.length > 0) {
            const tile = pending.shift() as TileId;
            const rect = this.clipped(layer, tile, copy);
            if (!rect) {
                continue;
            }
            const samples = this.samplesOf(layer, rect);
            if (tile.z >= this.cullFromZoom) {
                const min = samples.reduce((a, b) => Vector3.Minimize(a, b), samples[0]);
                const max = samples.reduce((a, b) => Vector3.Maximize(a, b), samples[0]);
                const info = new BoundingInfo(min, max, world);
                if (!info.isInFrustum(planes) || this.occluded(samples, eye)) {
                    continue;
                }
            }
            const whole = this.samplesOf(layer, this.shifted(resolved.rect(tile), copy));
            const edge = Math.max(
                Vector3.Distance(whole[0], whole[2]),
                Vector3.Distance(whole[6], whole[8]),
                Vector3.Distance(whole[0], whole[6]),
                Vector3.Distance(whole[2], whole[8]),
            );
            let pixels: number;
            if (ortho > 0) {
                pixels = (edge * height) / ortho;
            } else {
                const distance = Math.max(1e-9, Math.min(...samples.map((s) => Vector3.Distance(s, eye))));
                pixels = (edge * height) / (2 * distance * Math.tan(camera.fov / 2));
            }
            const children = tile.z < resolved.maxZoom ? resolved.children(tile) : [];
            const split =
                children.length > 0 &&
                pixels > resolved.tileSize * this.options.lodScale &&
                wanted.length + pending.length + children.length <= this.options.maxTiles;
            if (split) {
                pending.push(...children);
            } else {
                wanted.push(tile);
            }
        }
        return wanted;
    }

    /**
     * A wanted tile: requested if it is not loaded (again, once a failed one's backoff is over),
     * with its nearest loaded ancestor to draw meanwhile.
     * @param layer - The source's layer.
     * @param tile - The tile.
     * @param copy - The world copy.
     * @param now - The time, for retries.
     * @returns The tile's entry and its stand-in.
     */
    private want(layer: Layer, tile: TileId, copy: number, now: number): Pick {
        const entry = this.request(layer, tile, copy, now);
        if (entry.state === "ready") {
            return { entry, fallback: null };
        }
        let { z, x, y } = tile;
        while (z > layer.resolved.minZoom) {
            z--;
            x >>= 1;
            y >>= 1;
            const ancestor = this.entries.get(tileKey(layer, { z, x, y }, copy));
            if (ancestor?.state === "ready") {
                return { entry, fallback: ancestor };
            }
        }
        return { entry, fallback: null };
    }

    /**
     * A tile's entry, made and queued if new, queued again if it failed and its wait is over.
     * @param layer - The source's layer.
     * @param tile - The tile.
     * @param copy - The world copy.
     * @param now - The time.
     * @returns The entry.
     */
    private request(layer: Layer, tile: TileId, copy: number, now: number): Entry {
        const key = tileKey(layer, tile, copy);
        let entry = this.entries.get(key);
        if (!entry) {
            entry = { key, layer, tile, copy, state: "queued", lastUsed: this.clock, failures: 0, retryAt: 0 };
            this.entries.set(key, entry);
        }
        if (entry.state === "failed" && now >= entry.retryAt) {
            entry.state = "queued";
        }
        if (entry.state === "queued") {
            this.queue.push(entry);
        }
        return entry;
    }

    /**
     * What to draw for one source's wanted tiles: each loaded tile, and for one still missing its
     * loaded ancestor. Where a tile FAILED, its ancestor stands in for every wanted tile under it,
     * loaded or not, so a failed tile never leaves a scaled-up parent beside sharp siblings.
     * @param picks - The wanted tiles.
     * @returns The entries to draw.
     */
    private settledPicks(picks: readonly Pick[]): Entry[] {
        const covers = new Set(picks.filter((p) => p.entry.state === "failed" && p.fallback).map((p) => p.fallback));
        const out = new Set<Entry>();
        for (const { entry, fallback } of picks) {
            const cover = covers.size > 0 ? this.coveringAncestor(entry, covers) : null;
            if (cover) {
                out.add(cover);
            } else if (entry.state === "ready") {
                out.add(entry);
            } else if (fallback) {
                out.add(fallback);
            }
        }
        return [...out];
    }

    private coveringAncestor(entry: Entry, covers: ReadonlySet<Entry | null>): Entry | null {
        let { z, x, y } = entry.tile;
        while (z > entry.layer.resolved.minZoom) {
            z--;
            x >>= 1;
            y >>= 1;
            const ancestor = this.entries.get(tileKey(entry.layer, { z, x, y }, entry.copy));
            if (ancestor && covers.has(ancestor)) {
                return ancestor;
            }
        }
        return null;
    }

    private pump(): void {
        while (this.inflight < this.options.maxConcurrentLoads && this.queue.length > 0) {
            const entry = this.queue.shift() as Entry;
            entry.state = "loading";
            this.inflight++;
            const url = entry.layer.resolved.url(entry.tile);
            const load =
                entry.layer.resolved.tone === "gray"
                    ? grayPicture(url).then((source) => this.options.loadTexture(source, this.scene))
                    : this.options.loadTexture(url, this.scene);
            load.then(
                (texture) => {
                    this.loaded(entry, texture);
                },
                () => {
                    this.loaded(entry, null);
                },
            );
        }
    }

    private loaded(entry: Entry, texture: BaseTexture | null): void {
        this.inflight--;
        if (this.disposed || this.entries.get(entry.key) !== entry) {
            texture?.dispose();
            return;
        }
        if (texture) {
            texture.wrapU = Texture.CLAMP_ADDRESSMODE;
            texture.wrapV = Texture.CLAMP_ADDRESSMODE;
            entry.texture = texture;
            entry.state = "ready";
            entry.failures = 0;
        } else {
            entry.state = "failed";
            entry.failures++;
            const wait = Math.min(MAX_RETRY_MS, 1000 * 2 ** (entry.failures - 1));
            entry.retryAt = Date.now() + wait;
            const timer = setTimeout(() => {
                this.timers.delete(timer);
                if (!this.disposed) {
                    this.changed();
                }
            }, wait);
            this.timers.add(timer);
        }
        this.pump();
        this.changed();
    }

    private showMesh(entry: Entry): void {
        if (entry.mesh || !entry.texture) {
            entry.mesh?.setEnabled(true);
            return;
        }
        const { layer, tile } = entry;
        const rect = this.clipped(layer, tile, entry.copy);
        if (!rect) {
            return;
        }
        const square = this.shifted(layer.resolved.square(tile), entry.copy);
        const { projection } = layer.resolved;
        const [cols, rows] = this.segments(
            (rect.x1 - rect.x0) * 360,
            projection.inverse({ x: 0, y: rect.y0 }).lat - projection.inverse({ x: 0, y: rect.y1 }).lat,
            projection.id !== this.surfaceProjection(),
        );
        const uv = (x: number, y: number): [number, number] => [
            (x - square.x0) / (square.x1 - square.x0),
            1 - (y - square.y0) / (square.y1 - square.y0),
        ];
        entry.mesh = this.patch(
            `${this.root.name}-tile-${entry.key}`,
            layer,
            tile.z,
            entry.texture,
            rect,
            cols,
            rows,
            uv,
        );
    }

    /**
     * A grid mesh over a map rectangle with a texture.
     * @param name - The mesh's name.
     * @param layer - The source's layer, for the stacking order.
     * @param z - The tile level, for the stacking order.
     * @param texture - The picture.
     * @param rect - The rectangle in map units.
     * @param cols - Columns of the grid.
     * @param rows - Rows of the grid.
     * @param uv - The texture coordinates of a map point.
     * @returns The mesh, a child of the root.
     */
    private patch(
        name: string,
        layer: Layer,
        z: number,
        texture: BaseTexture,
        rect: MapRect,
        cols: number,
        rows: number,
        uv: (x: number, y: number) => [number, number],
    ): Mesh {
        const positions: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const p = new Vector3();
        for (let j = 0; j <= rows; j++) {
            const y = rect.y0 + ((rect.y1 - rect.y0) * j) / rows;
            for (let i = 0; i <= cols; i++) {
                const x = rect.x0 + ((rect.x1 - rect.x0) * i) / cols;
                this.mapToScene(layer, x, y, p);
                positions.push(p.x, p.y, p.z);
                uvs.push(...uv(x, y));
                if (i < cols && j < rows) {
                    const a = j * (cols + 1) + i;
                    const b = a + cols + 1;
                    indices.push(a, b, a + 1, a + 1, b, b + 1);
                }
            }
        }
        return this.meshOf(name, layer, z, texture, positions, uvs, indices);
    }

    private meshOf(
        name: string,
        layer: Layer,
        z: number,
        texture: BaseTexture,
        positions: number[],
        uvs: number[],
        indices: number[],
    ): Mesh {
        const mesh = new Mesh(name, this.scene);
        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.uvs = uvs;
        vertexData.indices = indices;
        const sphere = this.shadesAsSphere();
        if (sphere) {
            // A ball centered on the root: every point's normal is its own direction.
            vertexData.normals = positions.map((v, i) => {
                const at = i - (i % 3);
                return v / (Math.hypot(positions[at], positions[at + 1], positions[at + 2]) || 1);
            });
        }
        vertexData.applyToMesh(mesh);
        const material = new StandardMaterial(`${mesh.name}-material`, this.scene);
        material.disableLighting = true;
        material.emissiveTexture = texture;
        if (sphere) {
            material.emissiveFresnelParameters = rimShade();
        }
        material.backFaceCulling = false;
        // Higher layers and finer tiles win where they overlap a coarser tile still shown.
        material.zOffsetUnits = 2 * (255 - Math.min(255, layer.index * 32 + z));
        mesh.material = material;
        mesh.parent = this.root;
        mesh.isPickable = false;
        mesh.renderingGroupId = this.options.renderingGroupId;
        return mesh;
    }

    /**
     * Fills the poles a source stops short of (Web Mercator ends at 85.05 degrees) with its own
     * coarsest tiles' edge rows stretched to the pole, so a satellite map has no pale disk there.
     * @param layer - The source's layer.
     * @param now - The time, for retries.
     * @returns Whether a cap is drawn.
     */
    private drawCaps(layer: Layer, now: number): boolean {
        const { resolved } = layer;
        const roots = resolved.roots();
        const lastRow = Math.max(...roots.map((t) => t.y));
        let drew = false;
        for (const tile of roots) {
            const entry = this.request(layer, tile, 0, now);
            entry.lastUsed = this.clock;
            if (entry.state !== "ready" || !entry.texture) {
                continue;
            }
            for (const pole of ["north", "south"] as const) {
                if ((pole === "north" && tile.y !== 0) || (pole === "south" && tile.y !== lastRow)) {
                    continue;
                }
                const key = `${entry.key}|${pole}`;
                if (!this.caps.has(key)) {
                    this.caps.set(key, this.cap(`${this.root.name}-cap-${key}`, layer, entry, pole));
                }
                drew = true;
            }
        }
        return drew;
    }

    private cap(name: string, layer: Layer, entry: Entry, pole: "north" | "south"): Mesh {
        const r = layer.resolved.rect(entry.tile);
        const square = layer.resolved.square(entry.tile);
        const max = layer.resolved.projection.maxLatitude;
        const [from, to] = pole === "north" ? [90, max] : [-max, -90];
        // The tile's edge row, a texel in from the edge so the sampler does not wrap.
        const v = pole === "north" ? 0.999 : 0.001;
        const cols = Math.max(4, Math.ceil(((r.x1 - r.x0) * 360) / 3));
        const positions: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const p = new Vector3();
        for (let j = 0; j <= 1; j++) {
            const lat = j === 0 ? from : to;
            for (let i = 0; i <= cols; i++) {
                const x = r.x0 + ((r.x1 - r.x0) * i) / cols;
                this.place(lat, x * 360 - 180, p);
                positions.push(p.x, p.y, p.z);
                uvs.push((x - square.x0) / (square.x1 - square.x0), v);
                if (i < cols && j === 0) {
                    const a = i;
                    const b = a + cols + 1;
                    indices.push(a, b, a + 1, a + 1, b, b + 1);
                }
            }
        }
        return this.meshOf(name, layer, entry.tile.z, entry.texture as BaseTexture, positions, uvs, indices);
    }

    private evict(shown: Set<Entry>): void {
        const extra = this.entries.size - this.options.maxCachedTiles;
        if (extra <= 0) {
            return;
        }
        const idle = [...this.entries.values()]
            .filter((e) => !shown.has(e) && e.lastUsed < this.clock && (e.state === "ready" || e.state === "failed"))
            .sort((a, b) => a.lastUsed - b.lastUsed);
        for (const e of idle.slice(0, extra)) {
            this.disposeEntry(e);
        }
    }

    private disposeMesh(e: Entry): void {
        if (e.mesh) {
            e.mesh.material?.dispose();
            e.mesh.dispose();
            e.mesh = undefined;
        }
    }

    private disposeCaps(): void {
        for (const mesh of this.caps.values()) {
            mesh.material?.dispose();
            mesh.dispose();
        }
        this.caps.clear();
    }

    private disposeEntry(e: Entry): void {
        this.disposeMesh(e);
        for (const [key, mesh] of [...this.caps]) {
            if (key.startsWith(`${e.key}|`)) {
                mesh.material?.dispose();
                mesh.dispose();
                this.caps.delete(key);
            }
        }
        e.texture?.dispose();
        this.entries.delete(e.key);
    }
}
