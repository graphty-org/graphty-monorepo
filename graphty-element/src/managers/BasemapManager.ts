import { Matrix, Quaternion, type Scene } from "@babylonjs/core";
import type { FlatMap, Globe, MapSource } from "babylonjs-map";

import type { BasemapConfig, BasemapStatus } from "../config/Basemap";
import type { LocationMapFrame } from "../layout/locationMap/place";

type MapModule = typeof import("babylonjs-map");

/** How far behind the graph's plane the flat map lies, as a share of its size, so lines on z = 0 stay in front. */
const FLAT_MAP_BEHIND = 0.001;

/**
 * The sources a basemap setting draws, bottom layer first. A network source is drawn over the
 * bundled world image, which then shows wherever a tile has not arrived or failed, and covers the
 * poles a Web Mercator source cannot.
 * @param m - babylonjs-map.
 * @param basemap - The setting; unset is the bundled world image.
 * @returns The sources, the name the status reports, and whether a named source was unknown.
 */
function sourcesOf(
    m: MapModule,
    basemap: BasemapConfig | undefined,
): { sources: MapSource[]; name: string; unknown: boolean } {
    const world = m.mapSources["natural-earth"];
    if (basemap === undefined) {
        return { sources: [world], name: "natural-earth", unknown: false };
    }

    if ("source" in basemap) {
        const named = Object.hasOwn(m.mapSources, basemap.source)
            ? m.mapSources[basemap.source as keyof typeof m.mapSources]
            : undefined;
        if (named === undefined) {
            return { sources: [world], name: basemap.source, unknown: true };
        }

        return { sources: named === world ? [world] : [world, named], name: basemap.source, unknown: false };
    }

    const { attributionShown: _shown, ...source } = basemap;
    if ("tiles" in source) {
        return { sources: [world, source], name: "tiles", unknown: false };
    }

    return { sources: [source], name: "image", unknown: false };
}

/**
 * Draws the map under a geographic layout: a flat map or a globe from babylonjs-map, loaded the
 * first time one is needed, in the frame the `location-map` layout published, with the sources the
 * `basemap` setting names, and a strip of credits in the canvas's bottom-right corner. Tiles are
 * picked by babylonjs-map before each frame from the camera, so zooming in loads finer ones.
 */
export class BasemapManager {
    #module: Promise<MapModule> | null = null;
    #surface: FlatMap | Globe | null = null;
    #frame: LocationMapFrame | null = null;
    #basemap: BasemapConfig | undefined | null = null;
    #config = "";
    #name = "none";
    #unknown = false;
    #shown = true;
    #generation = 0;
    readonly #strip: HTMLDivElement;

    /** The scene the surface was made in; a renderer swap (WebGPU) brings a new one. */
    #scene: Scene | null = null;

    /**
     * Make the manager; nothing is loaded until a geographic layout publishes a frame.
     * @param getScene - The scene to draw in, read on every sync.
     * @param container - The element the canvas is in; the credits are drawn over its corner.
     * @param requestFrame - Asks for a frame when a picture arrives.
     */
    constructor(
        private readonly getScene: () => Scene,
        container: Element,
        private readonly requestFrame: () => void,
    ) {
        this.#strip = document.createElement("div");
        this.#strip.dataset.graphtyAttribution = "";
        Object.assign(this.#strip.style, {
            position: "absolute",
            right: "0",
            bottom: "0",
            padding: "1px 4px",
            font: "11px sans-serif",
            color: "#333",
            background: "rgba(255, 255, 255, 0.75)",
            pointerEvents: "none",
            display: "none",
        });
        container.appendChild(this.#strip);
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
        this.#shown = basemap?.attributionShown !== false;
        const generation = ++this.#generation;
        if (frame === null || (basemap !== undefined && "source" in basemap && basemap.source === "none")) {
            this.#clear();
            this.#name = basemap !== undefined && "source" in basemap ? basemap.source : "none";
            return;
        }

        this.#module ??= import("babylonjs-map");
        void this.#module.then((m) => {
            if (generation === this.#generation) {
                this.#draw(m, frame, basemap, sourcesChanged);
            }
        });
    }

    /**
     * What the map is doing.
     * @returns The status.
     */
    get status(): BasemapStatus {
        const surface = this.#surface;
        if (surface === null) {
            return { source: this.#name, state: "off", attribution: [] };
        }

        const { loading, failed } = surface.status;
        let state: BasemapStatus["state"] = "ready";
        if (this.#unknown || failed > 0) {
            state = "fallback";
        } else if (loading > 0) {
            state = "loading";
        }

        return { source: this.#name, state, attribution: surface.attribution };
    }

    /** Removes the map and the credits. */
    dispose(): void {
        this.#generation++;
        this.#clear();
        this.#strip.remove();
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
            surface.onChangedObservable.add(() => {
                this.#changed();
            });
            this.#surface = surface;
        } else if (sourcesChanged) {
            surface.setSources(sources);
        }

        if (frame.surface === "globe" && surface instanceof m.Globe) {
            surface.radius = frame.radius;
            const r = frame.rotation;
            surface.root.rotationQuaternion = Quaternion.FromRotationMatrix(
                Matrix.FromValues(r[0], r[1], r[2], 0, r[3], r[4], r[5], 0, r[6], r[7], r[8], 0, 0, 0, 0, 1),
            );
        } else if (frame.surface === "flat" && surface instanceof m.FlatMap) {
            surface.frame = frame.mapFrame;
            surface.root.position.z = frame.size * FLAT_MAP_BEHIND;
        }

        this.#changed();
    }

    /** A picture arrived or the map moved: keep its meshes out of picking, redraw, and refresh the credits. */
    #changed(): void {
        const surface = this.#surface;
        if (surface === null) {
            return;
        }

        for (const mesh of surface.root.getChildMeshes()) {
            mesh.isPickable = false;
        }

        const { attribution } = surface;
        this.#strip.textContent = attribution.join(" | ");
        this.#strip.style.display = this.#shown && attribution.length > 0 ? "block" : "none";
        this.requestFrame();
    }

    /** Disposes the surface and hides the credits. */
    #clear(): void {
        this.#surface?.dispose();
        this.#surface = null;
        this.#unknown = false;
        this.#strip.style.display = "none";
        this.#strip.textContent = "";
        this.requestFrame();
    }
}
