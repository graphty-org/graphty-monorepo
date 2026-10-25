/**
 * Loads graphty-element on demand, once. The element (Babylon.js and Lit) is most of the app's
 * code, so the start page paints its text and buttons first and loads it after; every surface
 * that draws a graph calls this and then waits for the tag to be defined.
 */

import { loadSiteConfig } from "./siteConfig";

let loading: Promise<void> | null = null;

/**
 * Defines `<graphty-element>` and switches on its optional GPU peer, the first time it is called.
 * @returns Settles once the tag is defined. It does not wait for the GPU peer, and a GPU peer
 * that fails to load does not reject it: the graph is drawn either way.
 */
export function loadGraphtyElement(): Promise<void> {
    // The site's configuration first, so the element's first session has the site's experiments.
    loading ??= loadSiteConfig().then(async () => {
        await import("@graphty/graphty-element");
        // The element's optional GPU peer, switched on. This is the whole integration: the
        // element probes, constructs, attaches, applies its threshold and recovers, and reports
        // through `capabilities.acceleration` -- including a peer that never loaded, as
        // `E_NO_ACCELERATOR_REGISTERED`. Nothing in this application touches WebGPU.
        import("@graphty/graphty-element/webgpu").catch((error: unknown) => {
            console.error("[graphty] the WebGPU accelerator could not be loaded:", error);
        });
    });
    return loading;
}
