import {
    type BaseTexture,
    BoundingInfo,
    Camera,
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
    /** Load a finer tile once a tile is drawn more than `tileSize * lodScale` pixels across. Default 1. */
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

/** What a map is doing: tiles loading, loaded and failed, counted over every source. */
export interface MapStatus {
    loading: number;
    ready: number;
    failed: number;
}

interface Layer {
    readonly resolved: ResolvedSource;
    readonly index: number;
}

interface Entry {
    readonly key: string;
    readonly layer: Layer;
    readonly tile: TileId;
    state: "queued" | "loading" | "ready" | "failed";
    texture?: BaseTexture;
    mesh?: Mesh;
    lastUsed: number;
}

/**
 * The camera's current view-projection; `getTransformationMatrix()` can be a frame old.
 * @param camera - The camera.
 * @returns View times projection.
 */
const viewProjection = (camera: Camera): Matrix => camera.getViewMatrix().multiply(camera.getProjectionMatrix());

const tileKey = (layer: Layer, t: TileId): string => `${layer.index}:${t.z}/${t.x}/${t.y}`;

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
 * The machinery a flat map and a globe share: a tile pyramid per source, picked by how many
 * pixels each tile covers on screen, loaded on demand with a cap on concurrent requests, drawn
 * coarse-under-fine so zooming never shows holes, cached and disposed least recently used first.
 * Only tiles in view are ever requested.
 */
export abstract class MapSurface {
    /** Every map mesh is a child of this node; move, rotate or scale it to place the map. */
    readonly root: TransformNode;
    /** Fires when the drawn picture changes (a tile loaded or failed); render a frame then. */
    readonly onChangedObservable = new Observable<MapSurface>();

    protected readonly scene: Scene;
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
    }

    /**
     * The sources drawn, bottom layer first.
     * @returns The sources.
     */
    get sources(): MapSource[] {
        return this.layers.map((l) => l.resolved.source);
    }

    /**
     * The credits of every source drawn, without repeats. Show them whenever the map is visible.
     * @returns The credits.
     */
    get attribution(): string[] {
        return [...new Set(this.layers.map((l) => l.resolved.attribution).filter((a) => a !== ""))];
    }

    /**
     * Tiles loading, loaded and failed.
     * @returns The counts.
     */
    get status(): MapStatus {
        const status = { loading: 0, ready: 0, failed: 0 };
        for (const e of this.entries.values()) {
            status[e.state === "queued" ? "loading" : e.state]++;
        }
        return status;
    }

    /**
     * Replaces what the map draws. Tiles of the old sources are disposed.
     * @param sources - The sources, bottom layer first.
     */
    setSources(sources: readonly MapSource[]): void {
        this.clear();
        this.layers = sources.map((source, index) => ({ resolved: resolveSource(source), index }));
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
        const planes = Frustum.GetPlanes(viewProjection(camera));
        const shown = new Set<Entry>();
        this.queue.length = 0;
        for (const layer of this.layers) {
            for (const tile of this.select(layer, camera, planes)) {
                this.want(layer, tile, shown);
            }
        }
        for (const e of this.entries.values()) {
            if (e.mesh) {
                e.mesh.setEnabled(shown.has(e));
            }
        }
        for (const e of shown) {
            e.lastUsed = this.clock;
            this.showMesh(e);
        }
        for (const e of [...this.entries.values()]) {
            if (e.state === "queued" && !this.queue.includes(e)) {
                this.entries.delete(e.key); // out of view before it started: never fetched
            }
        }
        this.pump();
        this.evict(shown);
    }

    /** Disposes every mesh, material and texture, and stops following the camera. */
    dispose(): void {
        this.disposed = true;
        this.scene.onBeforeRenderObservable.remove(this.beforeRender);
        this.clear();
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

    /** Drops every tile's mesh (the geometry changed) and redraws; keeps loaded textures. */
    protected invalidateGeometry(): void {
        for (const e of this.entries.values()) {
            this.disposeMesh(e);
        }
        this.dirty = true;
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
     * The part of a tile the surface shows, in the source's map units, or null if none.
     * @param layer - The source's layer.
     * @param tile - The tile.
     * @returns The rectangle, or null.
     */
    private clipped(layer: Layer, tile: TileId): MapRect | null {
        const r = layer.resolved.rect(tile);
        const bounds = this.clipBounds();
        if (!bounds) {
            return r;
        }
        const p = layer.resolved.projection;
        const a = p.forward({ lat: bounds[1][1], lon: bounds[0][0] });
        const b = p.forward({ lat: bounds[0][1], lon: bounds[1][0] });
        const c = {
            x0: Math.max(r.x0, a.x),
            y0: Math.max(r.y0, a.y),
            x1: Math.min(r.x1, b.x),
            y1: Math.min(r.y1, b.y),
        };
        return c.x1 > c.x0 && c.y1 > c.y0 ? c : null;
    }

    private mapToScene(layer: Layer, x: number, y: number, out: Vector3): Vector3 {
        const { lat, lon } = layer.resolved.projection.inverse({ x, y });
        this.place(lat, lon, out);
        return out;
    }

    /**
     * The tiles of one source to draw: breadth first from the roots, split while too coarse.
     * @param layer - The source's layer.
     * @param camera - The active camera.
     * @param planes - The camera's frustum.
     * @returns The tiles.
     */
    private select(layer: Layer, camera: Camera, planes: ReturnType<typeof Frustum.GetPlanes>): TileId[] {
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
            const rect = this.clipped(layer, tile);
            if (!rect) {
                continue;
            }
            const samples: Vector3[] = [];
            for (let j = 0; j <= 2; j++) {
                for (let i = 0; i <= 2; i++) {
                    const x = rect.x0 + ((rect.x1 - rect.x0) * i) / 2;
                    const y = rect.y0 + ((rect.y1 - rect.y0) * j) / 2;
                    samples.push(this.mapToScene(layer, x, y, new Vector3()));
                }
            }
            if (tile.z >= 2) {
                const min = samples.reduce((a, b) => Vector3.Minimize(a, b));
                const max = samples.reduce((a, b) => Vector3.Maximize(a, b));
                const info = new BoundingInfo(min, max, world);
                if (!info.isInFrustum(planes) || this.occluded(samples, eye)) {
                    continue;
                }
            }
            const edge = Math.max(
                Vector3.Distance(samples[0], samples[2]),
                Vector3.Distance(samples[6], samples[8]),
                Vector3.Distance(samples[0], samples[6]),
                Vector3.Distance(samples[2], samples[8]),
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
     * Shows a wanted tile if it is loaded; otherwise requests it and shows its nearest loaded ancestor.
     * @param layer - The source's layer.
     * @param tile - The tile.
     * @param shown - Collects the entries to draw.
     */
    private want(layer: Layer, tile: TileId, shown: Set<Entry>): void {
        const key = tileKey(layer, tile);
        let entry = this.entries.get(key);
        if (entry?.state === "ready") {
            shown.add(entry);
            return;
        }
        if (!entry) {
            entry = { key, layer, tile, state: "queued", lastUsed: this.clock };
            this.entries.set(key, entry);
        }
        if (entry.state === "queued") {
            this.queue.push(entry);
        }
        let { z, x, y } = tile;
        while (z > layer.resolved.minZoom) {
            z--;
            x >>= 1;
            y >>= 1;
            const ancestor = this.entries.get(tileKey(layer, { z, x, y }));
            if (ancestor?.state === "ready") {
                shown.add(ancestor);
                return;
            }
        }
    }

    private pump(): void {
        while (this.inflight < this.options.maxConcurrentLoads && this.queue.length > 0) {
            const entry = this.queue.shift() as Entry;
            entry.state = "loading";
            this.inflight++;
            this.options.loadTexture(entry.layer.resolved.url(entry.tile), this.scene).then(
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
        } else {
            entry.state = "failed";
        }
        this.dirty = true;
        this.pump();
        this.onChangedObservable.notifyObservers(this);
    }

    private showMesh(entry: Entry): void {
        if (entry.mesh || !entry.texture) {
            entry.mesh?.setEnabled(true);
            return;
        }
        const { layer, tile } = entry;
        const rect = this.clipped(layer, tile);
        if (!rect) {
            return;
        }
        const square = layer.resolved.square(tile);
        const { projection } = layer.resolved;
        const [cols, rows] = this.segments(
            (rect.x1 - rect.x0) * 360,
            projection.inverse({ x: 0, y: rect.y0 }).lat - projection.inverse({ x: 0, y: rect.y1 }).lat,
            projection.id !== this.surfaceProjection(),
        );
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
                uvs.push((x - square.x0) / (square.x1 - square.x0), 1 - (y - square.y0) / (square.y1 - square.y0));
                if (i < cols && j < rows) {
                    const a = j * (cols + 1) + i;
                    const b = a + cols + 1;
                    indices.push(a, b, a + 1, a + 1, b, b + 1);
                }
            }
        }
        const mesh = new Mesh(`${this.root.name}-tile-${entry.key}`, this.scene);
        const vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.uvs = uvs;
        vertexData.indices = indices;
        vertexData.applyToMesh(mesh);
        const material = new StandardMaterial(`${mesh.name}-material`, this.scene);
        material.disableLighting = true;
        material.emissiveTexture = entry.texture;
        material.backFaceCulling = false;
        // Higher layers and finer tiles win where they overlap a coarser tile still shown.
        material.zOffsetUnits = 2 * (255 - Math.min(255, layer.index * 32 + tile.z));
        mesh.material = material;
        mesh.parent = this.root;
        mesh.isPickable = false;
        mesh.renderingGroupId = this.options.renderingGroupId;
        entry.mesh = mesh;
    }

    private evict(shown: Set<Entry>): void {
        const extra = this.entries.size - this.options.maxCachedTiles;
        if (extra <= 0) {
            return;
        }
        const idle = [...this.entries.values()]
            .filter((e) => !shown.has(e) && (e.state === "ready" || e.state === "failed"))
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

    private disposeEntry(e: Entry): void {
        this.disposeMesh(e);
        e.texture?.dispose();
        this.entries.delete(e.key);
    }

    private clear(): void {
        for (const e of [...this.entries.values()]) {
            this.disposeEntry(e);
        }
        this.queue.length = 0;
    }
}
