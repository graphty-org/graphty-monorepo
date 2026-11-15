/**
 * @file The `data` section codec, version 2: the sources (embedded or referenced), the reader source, the type registry, data issues, the join history and the merged graph (spec 4.1).
 * Experimental (`save-files-v2`).
 */

import { notImplemented } from "../notImplemented";
import type { SectionCodec } from "../types";

/** The `graphty-data` section, version 2. */
export const dataCodec: SectionCodec = {
    section: "data",
    version: 2,
    reads: [2],
    bound: false,
    members: ["sources", "types", "issues", "joins", "rekeys", "graph"],
    write() {
        return Promise.reject(notImplemented("data.write"));
    },
    read() {
        return Promise.reject(notImplemented("data.read"));
    },
};
