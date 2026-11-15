/**
 * @file The `notes` section codec, version 2: people's notes on the graph, its elements, sets and results (spec 4.6).
 * Experimental (`save-files-v2`).
 */

import { notImplemented } from "../notImplemented";
import type { SectionCodec } from "../types";

/** The `graphty-notes` section, version 2. */
export const notesCodec: SectionCodec = {
    section: "notes",
    version: 2,
    reads: [2],
    bound: true,
    members: ["notes"],
    write() {
        return Promise.reject(notImplemented("notes.write"));
    },
    read() {
        return Promise.reject(notImplemented("notes.read"));
    },
};
