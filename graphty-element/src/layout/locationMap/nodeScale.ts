/**
 * @file The scale the location map layout's `nodeScale: "screen"` draws nodes at. No Babylon.js,
 * so it is tested on its own and costs the main entry nothing.
 */

/** What the scale reads of the view: a perspective camera's field of view and the depth of the map in front of it, or an orthographic view's height. */
export type ScreenView = { readonly fov: number; readonly depth: number } | { readonly orthoHeight: number };

/**
 * The scale that draws a node of size 1 at `1 / size` of the view's height, whatever the zoom: one
 * scene unit as it looks when the map's drawn extent (`size` scene units) fills the view's height.
 * @param view - The view.
 * @param size - Scene units across the map's data as drawn.
 * @returns The scale, or null when the view has no height.
 */
export function screenNodeScale(view: ScreenView, size: number): number | null {
    const height = "orthoHeight" in view ? view.orthoHeight : 2 * view.depth * Math.tan(view.fov / 2);
    return height > 0 && size > 0 ? height / size : null;
}

/**
 * How deep the map's surface lies in front of the camera, which a node on it is drawn at: the
 * distance to the point the camera turns about on a flat map, and the camera's height above a
 * globe, which a node on the side facing the camera stands on.
 * @param eye - The camera's distance from the point it turns about (flat) or from the globe's center.
 * @param radius - The globe's radius, or 0 for a flat map.
 * @returns The depth, at least a millionth of the eye's distance.
 */
export function mapDepth(eye: number, radius: number): number {
    return Math.max(eye - radius, eye * 1e-6);
}
