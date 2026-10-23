import {
    Color3,
    Constants,
    CreateSphere,
    FresnelParameters,
    Mesh,
    type Scene,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";

import { MapSurface, type MapSurfaceOptions } from "./map-surface.js";
import { latLonToSphere, sphereToLatLon } from "./projection/sphere.js";
import type { Handedness, LatLon, XYZ } from "./projection/types.js";

/** Options of {@link Globe}. */
export interface GlobeOptions extends MapSurfaceOptions {
    /** In scene units. Default 100. */
    radius?: number;
    /** The root node's name. Default `globe`. */
    name?: string;
    /**
     * Where the sun is overhead: the half of the globe facing it is drawn at full brightness, the
     * other half dark, with a soft twilight between. Default null: no sun, every side lit alike.
     */
    sun?: LatLon | null;
    /** A thin glow of air around the globe's rim, as the earth is seen from space. Default false. */
    atmosphere?: boolean;
}

/** How bright the night side is, as a share of the day side. */
const NIGHT = 0.2;

/** The twilight band, in the cosine of the angle from the sun: from night at -0.1 to day at 0.15. */
const TWILIGHT: readonly [number, number] = [-0.1, 0.15];

/** How far the air's glow reaches past the surface, as a share of the radius. */
const AIR = 0.06;

/**
 * How bright a point of a globe is under a sun: full on the day side, {@link NIGHT} on the night
 * side, smooth across the twilight band.
 * @param point - The point, from the globe's center; any length but zero.
 * @param sun - The direction of the sun from the center, of length 1.
 * @returns The brightness, from {@link NIGHT} to 1.
 */
export function sunShade(point: XYZ, sun: XYZ): number {
    const length = Math.hypot(point.x, point.y, point.z) || 1;
    const cos = (point.x * sun.x + point.y * sun.y + point.z * sun.z) / length;
    const t = Math.min(1, Math.max(0, (cos - TWILIGHT[0]) / (TWILIGHT[1] - TWILIGHT[0])));
    return NIGHT + (1 - NIGHT) * t * t * (3 - 2 * t);
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
    private currentSun: LatLon | null;
    private air: Mesh | null = null;

    /**
     * Makes a globe; it draws once a camera renders the scene.
     * @param scene - The scene to draw in.
     * @param options - Sources, radius and level of detail.
     */
    constructor(scene: Scene, options: GlobeOptions = {}) {
        super(options.name ?? "globe", scene, options);
        this.handedness = scene.useRightHandedSystem ? "right" : "left";
        this.currentRadius = options.radius ?? 100;
        this.currentSun = options.sun ?? null;
        // A patch's nine sample points miss most of a level-0 or level-1 tile's curve.
        this.cullFromZoom = 2;
        this.atmosphere = options.atmosphere ?? false;
    }

    /**
     * Where the sun is overhead, or null for none.
     * @returns The point.
     */
    get sun(): LatLon | null {
        return this.currentSun;
    }

    /** Moves the sun; the surface is shaded again, its pictures kept. */
    set sun(sun: LatLon | null) {
        this.currentSun = sun;
        this.invalidateGeometry();
        this.changed();
    }

    /**
     * Whether the air's glow is drawn around the rim.
     * @returns True when it is.
     */
    get atmosphere(): boolean {
        return this.air !== null;
    }

    /** Draws or removes the air's glow. */
    set atmosphere(on: boolean) {
        if (on === (this.air !== null)) {
            return;
        }
        if (!on) {
            this.air?.material?.dispose();
            this.air?.dispose();
            this.air = null;
            this.changed();
            return;
        }
        // The inside of a slightly larger ball: only its far half shows, around the globe, and
        // it fades to nothing at its own edge (where the view grazes it) and is brightest at the
        // globe's rim. Added on top of what is behind it, so it never darkens the background.
        const air = CreateSphere(
            `${this.root.name}-atmosphere`,
            { diameter: 2, segments: 48, sideOrientation: Mesh.BACKSIDE },
            this.scene,
        );
        const material = new StandardMaterial(`${air.name}-material`, this.scene);
        material.disableLighting = true;
        material.emissiveColor = new Color3(0.42, 0.66, 1);
        material.alphaMode = Constants.ALPHA_ADD;
        // The fresnel term is added to the material's alpha: 0, so the glow is the term alone,
        // nothing at the shell's own edge and most at the globe's rim.
        material.alpha = 0;
        material.opacityFresnelParameters = new FresnelParameters({
            bias: 0,
            power: 1.5,
            leftColor: Color3.Black(),
            rightColor: new Color3(4, 4, 4),
        });
        air.material = material;
        air.parent = this.root;
        air.isPickable = false;
        air.scaling.setAll(this.currentRadius * (1 + AIR));
        this.air = air;
        this.changed();
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
        this.air?.scaling.setAll(radius * (1 + AIR));
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

    protected override pointShade(): ((x: number, y: number, z: number) => number) | null {
        if (this.currentSun === null) {
            return null;
        }
        const sun = latLonToSphere(this.currentSun, 1, this.handedness);
        return (x, y, z) => sunShade({ x, y, z }, sun);
    }

    /** Disposes the globe, its air's glow, and everything its map drew. */
    override dispose(): void {
        this.air?.material?.dispose();
        this.air = null;
        super.dispose();
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
