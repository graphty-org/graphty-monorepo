import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { Scene } from "@babylonjs/core/scene.js";
import type { FlatMap, Globe, MapCredit, MapSource } from "babylonjs-map";

import type { BasemapConfig, BasemapStatus, GlobeLook } from "../config/Basemap";
import type { BasemapStatusEvent } from "../events";
import type { LocationMapFrame } from "../layout/locationMap/place";
import { viewLog } from "./viewLog";

type MapModule = typeof import("babylonjs-map");

/** How far behind the graph's plane the flat map lies, as a share of its size, so lines on z = 0 stay in front. */
const FLAT_MAP_BEHIND = 0.001;

/**
 * The most animation frames a frame is asked for while a new map mesh waits to be drawn (its
 * shader compiling); one that never draws is left to the next change.
 */
const MAX_DRAW_FRAMES = 600;

/**
 * A geographic frame's extent in the scene, as two corners of its box: a flat map's rectangle at
 * z = 0, or the box around a globe. Framing the whole graph frames these too.
 * @param frame - The frame.
 * @returns The corners.
 */
export function mapCorners(frame: LocationMapFrame): Vector3[] {
    if (frame.surface === "globe") {
        const r = frame.radius;
        return [new Vector3(-r, -r, -r), new Vector3(r, r, r)];
    }

    const { width, height } = frame.mapFrame;
    return [new Vector3(-width / 2, -height / 2, 0), new Vector3(width / 2, height / 2, 0)];
}

/**
 * The name the status reports for a basemap setting.
 * @param basemap - The setting; unset is the bundled world image.
 * @returns The named source's id, or "tiles" or "image" for a custom one.
 */
function nameOf(basemap: BasemapConfig | undefined): string {
    if (basemap === undefined) {
        return "natural-earth";
    }

    if ("source" in basemap) {
        return basemap.source;
    }

    return "tiles" in basemap ? "tiles" : "image";
}

/**
 * The sources a basemap setting draws, bottom layer first. A tile service is drawn over the
 * bundled world image, which then shows wherever a tile has not arrived or failed; a picture (the
 * bundled world, its gray version, a custom image) is drawn alone.
 * @param m - babylonjs-map.
 * @param basemap - The setting; unset is the bundled world image.
 * @returns The sources, the name the status reports, and whether a named source was unknown.
 */
function sourcesOf(
    m: MapModule,
    basemap: BasemapConfig | undefined,
): { sources: MapSource[]; name: string; unknown: boolean } {
    const world = m.mapSources["natural-earth"];
    const name = nameOf(basemap);
    if (basemap === undefined) {
        return { sources: [world], name, unknown: false };
    }

    if ("source" in basemap) {
        const named = Object.hasOwn(m.mapSources, basemap.source)
            ? m.mapSources[basemap.source as keyof typeof m.mapSources]
            : undefined;
        if (named === undefined) {
            return { sources: [world], name, unknown: true };
        }

        return { sources: "image" in named ? [named] : [world, named], name, unknown: false };
    }

    const { attributionShown: _shown, beyond: _beyond, ...source } = basemap;
    if ("tiles" in source) {
        return { sources: [world, source], name, unknown: false };
    }

    return { sources: [source], name, unknown: false };
}

/**
 * Draws the map under a geographic layout: a flat map or a globe from babylonjs-map, loaded the
 * first time one is needed, in the frame the `location-map` layout published, with the sources the
 * `basemap` setting names. The credits of the sources drawn are reported in `status` as data and
 * never drawn over the canvas (owner, 2026-11-15). Tiles are picked by babylonjs-map before each
 * frame from the camera, so zooming in loads finer ones. Every change of state (loading, drawn, fallen back to the bundled world) is told to
 * `emit` once, as a `basemap-status` event.
 */
export class BasemapManager {
    #module: Promise<MapModule> | null = null;
    #surface: FlatMap | Globe | null = null;
    #frame: LocationMapFrame | null = null;
    #basemap: BasemapConfig | undefined | null = null;
    #config = "";
    #name = "none";
    #unknown = false;
    #generation = 0;
    /** The status last told to `emit`, as JSON, so each change is told once. */
    #told = "";
    /** The scene the surface was made in; a renderer swap (WebGPU) brings a new one. */
    #scene: Scene | null = null;

    /**
     * Make the manager; nothing is loaded until a geographic layout publishes a frame.
     * @param getScene - The scene to draw in, read on every sync.
     * @param requestFrame - Asks for a frame when a picture arrives.
     * @param emit - Told each change of the map's state.
     */
    constructor(
        private readonly getScene: () => Scene,
        private readonly requestFrame: () => void,
        private readonly emit: (event: Omit<BasemapStatusEvent, "type">) => void = () => undefined,
    ) {}

    /** How a globe looks beyond its map; see {@link GlobeLook}. */
    #look: GlobeLook = {};

    /**
     * How a globe looks beyond its map: its air's glow and its sun. Applied to the globe drawn now,
     * and to every globe made after.
     * @param look - The look.
     */
    set globeLook(look: GlobeLook) {
        this.#look = look;
        if (this.#surface !== null && this.#module !== null) {
            void this.#module.then((m) => {
                if (this.#surface instanceof m.Globe) {
                    this.#lookOf(this.#surface);
                }
            });
        }
    }

    /**
     * Gives a globe the look.
     * @param globe - The globe.
     */
    #lookOf(globe: Globe): void {
        globe.atmosphere = this.#look.atmosphere === true;
        const sun = this.#look.sun ?? null;
        if (JSON.stringify(sun) !== JSON.stringify(globe.sun)) {
            globe.sun = sun;
        }
    }

    /**
     * Follows the active layout's frame and the basemap setting; cheap when neither changed.
     * @param frame - The geographic frame, or null when the active layout has none.
     * @param basemap - The setting.
     */
    sync(frame: LocationMapFrame | null, basemap: BasemapConfig | undefined): void {
        const scene = this.getScene();
        if (scene !== this.#scene) {
            this.#clear();
            this.#scene = scene;
            this.#basemap = null;
        }

        if (frame === this.#frame && basemap === this.#basemap) {
            return;
        }

        const config = JSON.stringify(basemap ?? null);
        const sourcesChanged = config !== this.#config;
        this.#frame = frame;
        this.#basemap = basemap;
        this.#config = config;
        const generation = ++this.#generation;
        if (frame === null || (basemap !== undefined && "source" in basemap && basemap.source === "none")) {
            this.#pending = false;
            this.#clear();
            this.#name = basemap !== undefined && "source" in basemap ? basemap.source : "none";
            this.#tell();
            return;
        }

        this.#module ??= import("babylonjs-map");
        this.#pending = true;
        this.#name = nameOf(basemap);
        void this.#module.then((m) => {
            if (generation === this.#generation) {
                this.#pending = false;
                this.#draw(m, frame, basemap, sourcesChanged);
            }
        });
    }

    /** Whether a frame or setting has come in that the map has not been drawn for yet. */
    #pending = false;

    /**
     * What the map is doing. `fallback` when a named source is unknown, or when a tile service
     * drew no tile and some failed: the bundled world image under it is what shows, told once that
     * image is drawn.
     * @returns The status.
     */
    get status(): BasemapStatus {
        const surface = this.#surface;
        if (surface === null) {
            return { source: this.#name, state: this.#pending ? "loading" : "off", attribution: [] };
        }

        let state: BasemapStatus["state"] = "ready";
        if (this.loading) {
            state = "loading";
        } else if (this.#unknown || this.#unreachable(surface).includes(true)) {
            state = "fallback";
        }

        const attribution = [...surface.attribution];
        for (const credit of this.#placeCredits()) {
            if (!attribution.includes(credit.text)) {
                attribution.push(credit.text);
            }
        }

        return { source: this.#name, state, attribution };
    }

    /**
     * Whether the map is still on its way to the screen: its module is loading, a frame or setting
     * came in it has not been drawn for, or a tile is. Asked by the graph's record of pending work
     * every time it asks whether the picture is final, so it reads state and builds nothing.
     * @returns True while the map's state is `loading`.
     */
    get loading(): boolean {
        if (this.#pending) {
            return true;
        }

        const surface = this.#surface;
        if (surface === null) {
            return false;
        }

        const { ready, failed, layers } = surface.status;
        const unreachable = this.#unreachable(surface);
        const meshes = surface.root.getChildMeshes();
        // No tile asked for yet (the map was just made or its source changed) is loading too, and
        // so is a loaded tile not drawn again yet after a source change, and a tile whose shader is
        // still compiling: it is not on screen yet. A fallback waits for this too, so it is told
        // only once the bundled world it falls back to is drawn and credited; the unreachable
        // service's own retries do not hold it.
        return (
            layers.some((layer, i) => !unreachable[i] && layer.loading > 0) ||
            ready + failed === 0 ||
            !meshes.some((m) => m.isEnabled()) ||
            meshes.some((m) => m.isEnabled() && !m.isReady(true))
        );
    }

    /**
     * Which of a surface's layers is a tile service (not a picture) that drew nothing and failed:
     * the base shows instead.
     * @param surface - The surface.
     * @returns One flag per layer.
     */
    #unreachable(surface: FlatMap | Globe): boolean[] {
        const { sources } = surface;
        return surface.status.layers.map(
            (layer, i) => !("image" in sources[i]) && layer.ready === 0 && layer.failed > 0,
        );
    }

    /**
     * The credits owed for the place names the layout read (GeoNames, while city data is in use).
     * @returns The credits, none when the locations were not place names.
     */
    #placeCredits(): readonly MapCredit[] {
        const location = this.#frame?.location;
        return location?.kind === "place" ? location.attribution : [];
    }

    /** Removes the map. */
    dispose(): void {
        this.#generation++;
        this.#clear();
    }

    /**
     * Draws the map in a frame, reusing the surface when its kind is the same.
     * @param m - babylonjs-map.
     * @param frame - The frame.
     * @param basemap - The setting.
     * @param sourcesChanged - Whether the setting changed since the surface was made.
     */
    #draw(m: MapModule, frame: LocationMapFrame, basemap: BasemapConfig | undefined, sourcesChanged: boolean): void {
        const { sources, name, unknown } = sourcesOf(m, basemap);
        this.#name = name;
        this.#unknown = unknown;
        let surface = this.#surface;
        const kindMatches = frame.surface === "globe" ? surface instanceof m.Globe : surface instanceof m.FlatMap;
        if (surface === null || !kindMatches) {
            this.#clear();
            surface =
                frame.surface === "globe"
                    ? new m.Globe(this.getScene(), { sources, radius: frame.radius, name: "graphty-globe" })
                    : new m.FlatMap(this.getScene(), { sources, frame: frame.mapFrame, name: "graphty-flat-map" });
            viewLog.info("map surface", { surface: frame.surface, source: name, layers: sources.length });
            surface.onChangedObservable.add(() => {
                this.#changed();
            });
            this.#surface = surface;
        } else if (sourcesChanged) {
            surface.setSources(sources);
        }

        if (frame.surface === "globe" && surface instanceof m.Globe) {
            surface.radius = frame.radius;
            this.#lookOf(surface);
            const r = frame.rotation;
            surface.root.rotationQuaternion = Quaternion.FromRotationMatrix(
                Matrix.FromValues(r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, 0, 0, 0, 1),
            );
        } else if (frame.surface === "flat" && surface instanceof m.FlatMap) {
            surface.frame = frame.mapFrame;
            surface.beyond = basemap?.beyond ?? "continue";
            surface.root.position.z = frame.size * FLAT_MAP_BEHIND;
        }

        this.#changed();
    }

    /** A picture arrived or the map moved: keep its meshes out of picking, redraw, and tell the status. */
    #changed(): void {
        const surface = this.#surface;
        if (surface === null) {
            return;
        }

        for (const mesh of surface.root.getChildMeshes()) {
            mesh.isPickable = false;
        }

        this.#drawSoon();
        this.#tell();
    }

    /** The map meshes drawn at least once, so a frame is asked for until each new one is. */
    readonly #drawnMeshes = new WeakSet<AbstractMesh>();

    /** The map meshes already waiting for their first draw, so each gets one observer. */
    readonly #awaitedMeshes = new WeakSet<AbstractMesh>();

    /** Whether frames are being asked for until every shown map mesh has been drawn. */
    #drawing = false;

    /**
     * Asks for frames until every map mesh shown has been drawn once. A tile shown just before the
     * scene draws, whose shader then compiles, can otherwise be left out of every frame of a scene
     * that draws only on demand and freezes its list of drawn meshes once still.
     */
    #drawSoon(): void {
        this.requestFrame();
        const surface = this.#surface;
        if (surface === null) {
            return;
        }

        for (const mesh of surface.root.getChildMeshes()) {
            // A cached tile not shown is disabled: it is awaited once it is shown again.
            if (mesh instanceof Mesh && mesh.isEnabled() && !this.#awaitedMeshes.has(mesh)) {
                this.#awaitedMeshes.add(mesh);
                mesh.onAfterRenderObservable.addOnce(() => {
                    this.#drawnMeshes.add(mesh);
                });
            }
        }

        if (this.#drawing) {
            return;
        }

        this.#drawing = true;
        let frames = 0;
        const check = (): void => {
            const shown = this.#surface?.root.getChildMeshes().filter((m) => m.isEnabled()) ?? [];
            if (shown.some((m) => !this.#drawnMeshes.has(m)) && ++frames < MAX_DRAW_FRAMES) {
                this.requestFrame();
                requestAnimationFrame(check);
            } else {
                this.#drawing = false;
                // Every tile is on screen now, which may turn loading into ready.
                this.#tell();
            }
        };
        requestAnimationFrame(check);
    }

    /** Tells `emit` the status, when it changed since it was last told. */
    #tell(): void {
        const { status } = this;
        const text = JSON.stringify(status);
        if (text === this.#told) {
            return;
        }

        this.#told = text;
        const counts = this.#surface?.status;
        viewLog.info("map tiles", {
            source: status.source,
            state: status.state,
            unknownSource: this.#unknown,
            ready: counts?.ready ?? 0,
            failed: counts?.failed ?? 0,
        });
        this.emit({
            source: status.source,
            state: status.state,
            attribution: status.attribution,
            ...(status.state === "fallback"
                ? { error: { code: "E_BASEMAP_UNREACHABLE" as const, params: { source: status.source, status: null } } }
                : {}),
        });
    }

    /** Disposes the surface. */
    #clear(): void {
        this.#surface?.dispose();
        this.#surface = null;
        this.#unknown = false;
        this.requestFrame();
    }
}
