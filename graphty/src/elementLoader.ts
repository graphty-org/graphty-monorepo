/**
 * Loads graphty-element on demand, once. The element (Babylon.js and Lit) is most of the app's
 * code, so the start page paints its text and buttons first and loads it after; every surface
 * that draws a graph calls this and then waits for the tag to be defined.
 */

let loading: Promise<void> | null = null;

/**
 * Defines `<graphty-element>` and switches on its optional GPU peer, the first time it is called.
 * @returns Settles once the tag is defined.
 */
export function loadGraphtyElement(): Promise<void> {
    loading ??= import("@graphty/graphty-element")
        // The element's optional GPU peer, switched on. This is the whole integration: the
        // element probes, constructs, attaches, applies its threshold and recovers, and reports
        // through `capabilities.acceleration`. Nothing in this application touches WebGPU.
        .then(() => import("@graphty/graphty-element/webgpu"))
        .then(() => undefined);
    return loading;
}
