/**
 * @file The `style` section codec, version 2: style layers, palettes, shaders, the style tree, value labels and the assets the layers draw (spec 4.2).
 * Experimental (`save-files-v2`).
 */

import { notImplemented } from "../notImplemented";
import type { SectionCodec } from "../types";

/** The `graphty-style` section, version 2. */
export const styleCodec: SectionCodec = {
    section: "style",
    version: 2,
    reads: [2],
    bound: false,
    members: ["palettes", "shaders", "layers", "tree", "valueLabels", "assets"],
    write() {
        return Promise.reject(notImplemented("style.write"));
    },
    read() {
        return Promise.reject(notImplemented("style.read"));
    },
};
