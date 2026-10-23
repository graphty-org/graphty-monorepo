import { type Scene, Vector3 } from "@babylonjs/core";

import { MapSurface, type MapSurfaceOptions } from "./map-surface.js";
import { latLonToSphere, sphereToLatLon } from "./projection/sphere.js";
import type { Handedness, LatLon, XYZ } from "./projection/types.js";

/** Options of {@link Globe}. */
export interface GlobeOptions extends MapSurfaceOptions {
    /** In scene units. Default 100. */
    radius?: number;
    /** The root node's name. Default `globe`. */
    name?: string;
}

/**
 * A globe centered on the origin: north pole on +y, longitude 0 facing a camera on the scene's
 * default side (-z left-handed, +z right-handed; read from `scene.useRightHandedSystem`). Each
 * tile is a patch of the sphere; patches behind the horizon or outside the view are not drawn or
 * requested. Web Mercator sources stop at +/-85.05 degrees; the poles past that are filled from the
 * source's own coarsest tile, its top and bottom rows stretched to the pole.
 */
export class Globe extends MapSurface {
    /** The scene's handedness when the globe was made. */
    readonly handedness: Handedness;
    private currentRadius: number;

    /**
     * Makes a globe; it draws once a camera renders the scene.
     * @param scene - The scene to draw in.
     * @param options - Sources, radius and level of detail.
     */
    constructor(scene: Scene, options: GlobeOptions = {}) {
        super(options.name ?? "globe", scene, options);
        this.handedness = scene.useRightHandedSystem ? "right" : "left";
        this.currentRadius = options.radius ?? 100;
        // A patch's nine sample points miss most of a level-0 or level-1 tile's curve.
        this.cullFromZoom = 2;
    }

    /**
     * The globe's radius in scene units.
     * @returns The radius.
     */
    get radius(): number {
        return this.currentRadius;
    }

    /** Moves the surface to a new radius; loaded pictures are kept. */
    set radius(radius: number) {
        this.currentRadius = radius;
        this.invalidateGeometry();
    }

    /**
     * Where a point sits on the globe, in the root node's space.
     * @param point - The point in degrees.
     * @param lift - Scene units above the surface. Default 0.
     * @returns The position.
     */
    toScene(point: LatLon, lift = 0): Vector3 {
        const { x, y, z } = latLonToSphere(point, this.currentRadius + lift, this.handedness);
        return new Vector3(x, y, z);
    }

    /**
     * The point under a position in the root node's space.
     * @param position - The position.
     * @returns The point in degrees.
     */
    fromScene(position: XYZ): LatLon {
        return sphereToLatLon(position, this.handedness);
    }

    protected override place(lat: number, lon: number, out: Vector3): void {
        const { x, y, z } = latLonToSphere({ lat, lon }, this.currentRadius, this.handedness);
        out.set(x, y, z);
    }

    protected override clipBounds(): null {
        return null;
    }

    protected override segments(lonSpan: number, latSpan: number): [number, number] {
        // about one segment per 3 degrees, so the silhouette stays round
        const count = (span: number): number => Math.min(64, Math.max(4, Math.ceil(span / 3)));
        return [count(lonSpan), count(latSpan)];
    }

    protected override surfaceProjection(): null {
        return null;
    }

    protected override fillsPoles(): boolean {
        return true;
    }

    protected override shadesAsSphere(): boolean {
        return true;
    }

    /**
     * Behind the horizon: no sample point faces the eye.
     * @param samples - Points on the tile, in the globe's own space.
     * @param eye - The camera, in the globe's own space.
     * @returns True when every point faces away.
     */
    protected override occluded(samples: Vector3[], eye: Vector3): boolean {
        const r2 = this.currentRadius * this.currentRadius;
        return samples.every((s) => Vector3.Dot(s, eye) < r2 * 0.999);
    }
}
