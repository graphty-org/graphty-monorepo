import { type Scene, Vector3 } from "@babylonjs/core";

import { MapSurface, type MapSurfaceOptions } from "./map-surface.js";
import { createMapFrame, type MapFrame, type MapFrameOptions } from "./projection/frame.js";
import type { GeoBounds, LatLon, ProjectionId, UnitXY } from "./projection/types.js";

/** Options of {@link FlatMap}. */
export interface FlatMapOptions extends MapSurfaceOptions {
    /** The projection, the box shown and its size; default the whole Web Mercator world, 100 units across. */
    frame?: MapFrame | MapFrameOptions;
    /** The root node's name. Default `flat-map`. */
    name?: string;
    /**
     * How the map looks past the frame's box: `clip` ends the picture at the box (the default);
     * `continue` draws every source whole, repeated a world to the east and west, so panning or
     * zooming out past the data still shows map.
     */
    beyond?: "clip" | "continue";
}

/**
 * A flat map in the x-y plane at z = 0, north up (+y), east right (+x), the shown box centered on
 * the origin. It looks the same from either side, so it works in left- and right-handed scenes
 * and under an orthographic 2D camera or a perspective 3D one. Pictures in another projection
 * than the frame's (the bundled equirectangular world on a Web Mercator map) are reprojected per
 * vertex. The map ends at the frame's box, or with `beyond: "continue"` goes on past it. A box
 * whose east edge is past 180 degrees (data across the antimeridian) is drawn from a second copy
 * of the world.
 */
export class FlatMap extends MapSurface {
    private currentFrame: MapFrame;
    private currentBeyond: "clip" | "continue";

    /**
     * Makes a flat map; it draws once a camera renders the scene.
     * @param scene - The scene to draw in.
     * @param options - Sources, frame and level of detail.
     */
    constructor(scene: Scene, options: FlatMapOptions = {}) {
        super(options.name ?? "flat-map", scene, options);
        this.currentFrame = toFrame(options.frame);
        this.currentBeyond = options.beyond ?? "clip";
    }

    /**
     * How the map looks past the frame's box.
     * @returns `clip` or `continue`.
     */
    get beyond(): "clip" | "continue" {
        return this.currentBeyond;
    }

    /** Ends the map at the box, or draws it on past it. */
    set beyond(beyond: "clip" | "continue") {
        if (beyond !== this.currentBeyond) {
            this.currentBeyond = beyond;
            this.invalidateGeometry();
        }
    }

    /**
     * The projection, box and size the map is drawn in.
     * @returns The frame.
     */
    get frame(): MapFrame {
        return this.currentFrame;
    }

    /** Redraws the map in a new frame; loaded pictures are kept. */
    set frame(frame: MapFrame | MapFrameOptions) {
        this.currentFrame = toFrame(frame);
        this.invalidateGeometry();
    }

    /**
     * Where a point lands on the map, in the root node's space.
     * @param point - The point in degrees.
     * @returns The position, z = 0.
     */
    toScene(point: LatLon): Vector3 {
        const { x, y } = this.currentFrame.toScene(point);
        return new Vector3(x, y, 0);
    }

    /**
     * The point under a position in the root node's space (z is ignored).
     * @param position - The position.
     * @returns The point in degrees.
     */
    fromScene(position: UnitXY): LatLon {
        return this.currentFrame.fromScene(position);
    }

    protected override place(lat: number, lon: number, out: Vector3): void {
        const { x, y } = this.currentFrame.toScene({ lat, lon });
        out.set(x, y, 0);
    }

    protected override clipBounds(): GeoBounds | null {
        return this.currentBeyond === "clip" ? this.currentFrame.bounds : null;
    }

    protected override copies(): number[] {
        const [[west], [east]] = this.currentFrame.bounds;
        // A world copy is one map unit wide: x = (lon + 180) / 360 in both projections.
        const first = Math.floor((west + 180) / 360);
        const last = Math.ceil((east + 180) / 360) - 1;
        const extra = this.currentBeyond === "continue" ? 1 : 0;
        const out: number[] = [];
        for (let k = first - extra; k <= last + extra; k++) {
            out.push(k);
        }
        return out;
    }

    protected override segments(_lonSpan: number, _latSpan: number, reprojected: boolean): [number, number] {
        // Longitude maps to x linearly in every projection here; only latitude needs rows.
        return [1, reprojected ? 32 : 1];
    }

    protected override surfaceProjection(): ProjectionId {
        return this.currentFrame.projection.id;
    }

    protected override occluded(): boolean {
        return false;
    }
}

function toFrame(frame: MapFrame | MapFrameOptions | undefined): MapFrame {
    return frame && "toScene" in frame ? frame : createMapFrame(frame);
}
