/**
 * @file The `view` section codec, version 1: the camera, saved views, selection, placed positions, sets and layers that name elements, visibility and runs a recipe cannot hold (spec 4.7).
 * Experimental (`save-files-v2`).
 */

import { notImplemented } from "../notImplemented";
import type { SectionCodec } from "../types";

/** The `graphty-view` section, version 1. */
export const viewCodec: SectionCodec = {
    section: "view",
    version: 1,
    reads: [1],
    bound: true,
    members: [
        "camera",
        "xr",
        "views",
        "selection",
        "placed",
        "sets",
        "visibility",
        "timeline",
        "viewRotation",
        "framing",
        "hiddenColumns",
        "layers",
        "runs",
    ],
    write() {
        return Promise.reject(notImplemented("view.write"));
    },
    read() {
        return Promise.reject(notImplemented("view.read"));
    },
};
