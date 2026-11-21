import { detCos, detSin, type F64, type GraphSnapshot } from "@graphty/graph-format";

import { type LayoutResult, rescaleInPlace } from "../positions.js";
import { type CommonLayoutOptions, planar, refusal, resolve, result } from "./common.js";

/** Options of the index-based spiral layout. */
export interface SpiralLayoutOptions extends CommonLayoutOptions {
    /** Angle between consecutive nodes, in radians, or the start angle when equidistant; default 0.35. */
    readonly resolution?: number | undefined;
    /** Space consecutive nodes one unit apart along the spiral instead of by equal angles; default false. */
    readonly equidistant?: boolean | undefined;
    /**
     * In 3D, how far the spiral rises for each unit its radius grows, so the nodes lie on a cone with the first node at
     * its tip and node order reads as height; default 1 (a cone as tall as it is wide in radius). 0 gives a flat spiral
     * in the plane of the center's z, and a negative value a cone opening downwards. Any finite number; ignored in 2D.
     */
    readonly height?: number | undefined;
}

/**
 * Archimedean-spiral rows in node order, rescaled so the farthest node is `scale` from the center.
 * @param n - node count
 * @param scale - distance of the farthest node from the center
 * @param center - at least 2 components
 * @param resolution - see SpiralLayoutOptions
 * @param equidistant - see SpiralLayoutOptions
 * @returns `2 * n` values
 */
function spiralRows(
    n: number,
    scale: number,
    center: readonly number[],
    resolution: number,
    equidistant: boolean,
): F64 {
    const rows = new Float64Array(2 * n);
    if (equidistant) {
        const chord = 1;
        const step = 0.5;
        let theta = resolution;
        theta += chord / (step * theta);
        for (let i = 0; i < n; i++) {
            const r = step * theta;
            theta += chord / r;
            rows[2 * i] = detCos(theta) * r;
            rows[2 * i + 1] = detSin(theta) * r;
        }
    } else {
        for (let i = 0; i < n; i++) {
            rows[2 * i] = detCos(resolution * i) * i;
            rows[2 * i + 1] = detSin(resolution * i) * i;
        }
    }
    return rescaleInPlace(rows, 2, scale, center);
}

/**
 * Conical-spiral rows in node order: the 2D spiral's angle and radius, with z rising `height` per unit of radius,
 * rescaled so the farthest node is `scale` from the center. In equidistant mode consecutive nodes are one unit apart
 * along the 3D curve (before rescaling).
 * @param n - node count
 * @param scale - distance of the farthest node from the center
 * @param center - 3 components
 * @param resolution - see SpiralLayoutOptions
 * @param equidistant - see SpiralLayoutOptions
 * @param height - see SpiralLayoutOptions
 * @returns `3 * n` values
 */
function coneRows(
    n: number,
    scale: number,
    center: readonly number[],
    resolution: number,
    equidistant: boolean,
    height: number,
): F64 {
    const rows = new Float64Array(3 * n);
    const put = (i: number, theta: number, r: number): void => {
        rows[3 * i] = detCos(theta) * r;
        rows[3 * i + 1] = detSin(theta) * r;
        rows[3 * i + 2] = height * r;
    };
    if (equidistant) {
        const step = 0.5;
        // the curve's length per radian at radius r: sqrt(r^2 + (dr/dtheta)^2 + (dz/dtheta)^2)
        const speed = (r: number): number => Math.sqrt(r * r + step * step * (1 + height * height));
        let theta = resolution;
        theta += 1 / speed(step * theta);
        for (let i = 0; i < n; i++) {
            const r = step * theta;
            theta += 1 / speed(r);
            put(i, theta, r);
        }
    } else {
        for (let i = 0; i < n; i++) {
            put(i, resolution * i, i);
        }
    }
    return rescaleInPlace(rows, 3, scale, center);
}

/**
 * Nodes along an Archimedean spiral from the center outwards, in node-index order. In 3D the spiral is conical: it
 * keeps the 2D spiral's angle and radius and rises with the radius (`height`), so node order reads as height, a fit
 * for ranked or time-ordered nodes. This differs from 3D `circular`, which spreads nodes evenly over a sphere's
 * surface: here the first node is at the cone's tip and each later node is farther out and higher.
 * @param s - the snapshot; only its node count is read
 * @param options - `scale` is the distance of the farthest node from the center
 * @returns the layout
 */
export function spiral(s: GraphSnapshot, options: SpiralLayoutOptions = {}): LayoutResult {
    const { n, dim, scale, center } = resolve(s, options);
    const resolution = options.resolution ?? 0.35;
    const equidistant = options.equidistant ?? false;
    const height = options.height ?? 1;
    if (!Number.isFinite(height)) {
        throw refusal(new RangeError(`height must be a finite number, got ${String(height)}`), "E_BAD_OPTION", {
            option: "height",
            value: height,
        });
    }
    if (dim === 3) {
        return result(coneRows(n, scale, center, resolution, equidistant, height), dim, n);
    }
    return result(planar(spiralRows(n, scale, center, resolution, equidistant), dim, center), dim, n);
}
