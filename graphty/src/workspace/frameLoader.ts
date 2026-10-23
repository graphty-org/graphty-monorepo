/**
 * The open project's frame (header, rail, canvas, panels) is most of the workspace's code, and the
 * start page needs none of it, so it is loaded on demand, once: after the start page's first frame,
 * or when a project opens, whichever comes first.
 */

import type { Frame as FrameComponent } from "./frame/Frame";

let loaded: typeof FrameComponent | null = null;
let loading: Promise<typeof FrameComponent> | null = null;

/**
 * Loads the frame's code, the first time it is called.
 * @returns Settles with the frame once loaded.
 */
export function loadFrame(): Promise<typeof FrameComponent> {
    loading ??= import("./frame/Frame").then((module) => {
        loaded = module.Frame;
        return module.Frame;
    });
    return loading;
}

/**
 * The frame, once its code has loaded.
 * @returns It, or null while it loads.
 */
export function loadedFrame(): typeof FrameComponent | null {
    return loaded;
}
