import type { LocationMapFrame } from "../layout/locationMap/place";
import { GraphtyLogger, type Logger } from "../logging/GraphtyLogger.js";

/**
 * What the reader sees, for whoever reads the log afterwards: layout changes, the location map's
 * frame and tiles, camera fits and moves, what is drawn, the drawing context and the page's
 * visibility. Silent unless a consumer turns on the `view` module.
 */
export const viewLog: Logger = GraphtyLogger.getLogger(["graphty", "view"]);

/** How often a moving camera is logged at most, in milliseconds (4 lines a second). */
export const CAMERA_LOG_INTERVAL_MS = 250;

/**
 * A gate that opens at most once per interval.
 * @param intervalMs - The shortest time between two openings.
 * @param now - The clock, in milliseconds.
 * @returns A function that answers true when the gate opens now.
 */
export function throttle(intervalMs: number, now: () => number = () => performance.now()): () => boolean {
    let last = -Infinity;
    return () => {
        const t = now();
        if (t - last < intervalMs) {
            return false;
        }

        last = t;
        return true;
    };
}

/**
 * A location map frame as plain facts for a log line.
 * @param frame - The frame, or null when the layout draws no map.
 * @returns The surface, its center and extent in degrees, and its size in scene units.
 */
export function frameFacts(frame: LocationMapFrame | null): Record<string, unknown> {
    if (frame === null) {
        return { surface: null };
    }

    const [[west, south], [east, north]] = frame.bounds;
    // A box across the antimeridian has its east edge west of its west edge.
    const span = east >= west ? east - west : east + 360 - west;
    const lon = west + span / 2;
    const facts: Record<string, unknown> = {
        surface: frame.surface,
        dimensions: frame.dimensions,
        center: [lon > 180 ? lon - 360 : lon, (south + north) / 2],
        extent: [span, north - south],
        bounds: frame.bounds,
        size: frame.size,
        mapScale: frame.mapScale,
    };
    if (frame.surface === "globe") {
        facts.radius = frame.radius;
        facts.world = frame.world;
    } else {
        facts.projection = frame.projection;
        facts.width = frame.mapFrame.width;
        facts.height = frame.mapFrame.height;
    }

    return facts;
}
