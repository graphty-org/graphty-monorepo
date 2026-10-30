import type { MapFrame } from "babylonjs-map/projection";

/**
 * How far from the scene's origin a flat map can reach: the corners of the one world it draws past
 * its box (babylonjs-map's `beyond: "continue"`, 360 degrees of longitude centered on the box, every
 * latitude the projection has). The camera's far plane has to reach past it, or a view tilted over
 * a map much larger than the data cuts the map off along a line.
 * @param frame - The flat map's projection placed in the scene.
 * @returns The distance in scene units.
 */
export function flatMapReach(frame: MapFrame): number {
    const [[west], [east]] = frame.bounds;
    const center = (west + east) / 2;
    const max = frame.projection.maxLatitude;
    let reach = 0;
    for (const lon of [center - 180, center + 180]) {
        for (const lat of [-max, max]) {
            const { x, y } = frame.toScene({ lat, lon });
            reach = Math.max(reach, Math.hypot(x, y));
        }
    }
    return reach;
}
