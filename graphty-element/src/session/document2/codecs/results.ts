/**
 * @file The `results` section codec, version 2: the record of each run and its outputs (spec 4.5).
 * Experimental (`save-files-v2`).
 */

import { notImplemented } from "../notImplemented";
import type { SectionCodec } from "../types";

/** The `graphty-results` section, version 2. */
export const resultsCodec: SectionCodec = {
    section: "results",
    version: 2,
    reads: [2],
    bound: true,
    members: ["runs"],
    write() {
        return Promise.reject(notImplemented("results.write"));
    },
    read() {
        return Promise.reject(notImplemented("results.read"));
    },
};
