/**
 * @file The `settings` section codec, version 1: project settings no other section holds, and timeline playback (spec 4.4).
 * Experimental (`save-files-v2`).
 */

import { notImplemented } from "../notImplemented";
import type { SectionCodec } from "../types";

/** The `graphty-settings` section, version 1. */
export const settingsCodec: SectionCodec = {
    section: "settings",
    version: 1,
    reads: [1],
    bound: false,
    members: ["settings", "playback"],
    write() {
        return Promise.reject(notImplemented("settings.write"));
    },
    read() {
        return Promise.reject(notImplemented("settings.read"));
    },
};
