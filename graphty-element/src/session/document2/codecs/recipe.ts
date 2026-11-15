/**
 * @file The `recipe` section codec, version 2: the replayable analysis steps (spec 4.3).
 * Experimental (`save-files-v2`).
 */

import { notImplemented } from "../notImplemented";
import type { SectionCodec } from "../types";

/** The `graphty-recipe` section, version 2. */
export const recipeCodec: SectionCodec = {
    section: "recipe",
    version: 2,
    reads: [2],
    bound: false,
    members: ["namespace", "commands"],
    write() {
        return Promise.reject(notImplemented("recipe.write"));
    },
    read() {
        return Promise.reject(notImplemented("recipe.read"));
    },
};
