/**
 * Loads graphty-element on demand, once. The element (Babylon.js and Lit) is most of the app's
 * code, so the start page paints its text and buttons first and loads it after; every surface
 * that draws a graph calls this and then waits for the tag to be defined.
 */

import { loadSiteConfig } from "./siteConfig";

let loading: Promise<void> | null = null;

/**
 * Defines `<graphty-element>`, the first time it is called.
 *
 * GPU acceleration needs nothing here: this app installs `@graphty/webgpu-graph-algorithms`, and
 * the element finds and loads it itself the first time it probes, then reports the outcome on
 * `capabilities.acceleration`. Nothing in this application touches WebGPU.
 * @returns Settles once the tag is defined. It rejects when the element itself could not be
 * loaded, and the next call tries again.
 */
export function loadGraphtyElement(): Promise<void> {
    // The site's configuration first, so the element's first session has the site's experiments.
    loading ??= loadSiteConfig().then(async () => {
        await import("@graphty/graphty-element");
    });
    // A failed load is not kept: the next call (a Retry) loads again.
    loading.catch(() => {
        loading = null;
    });
    return loading;
}
