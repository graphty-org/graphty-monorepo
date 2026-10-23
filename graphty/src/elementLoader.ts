/**
 * Loads graphty-element on demand, once. The element (Babylon.js and Lit) is most of the app's
 * code, so the start page paints its text and buttons first and loads it after; every surface
 * that draws a graph calls this and then waits for the tag to be defined.
 */

let loading: Promise<void> | null = null;

/**
 * Defines `<graphty-element>`, the first time it is called.
 *
 * GPU acceleration needs nothing here: this app installs `@graphty/webgpu-graph-algorithms`, and
 * the element finds and loads it itself the first time it probes, then reports the outcome on
 * `capabilities.acceleration`. Nothing in this application touches WebGPU.
 * @returns Settles once the tag is defined.
 */
export function loadGraphtyElement(): Promise<void> {
    loading ??= import("@graphty/graphty-element").then(() => undefined);
    return loading;
}
