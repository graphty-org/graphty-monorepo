// The pose templates. handy-work.json holds handy-work's seven shipped poses (MIT, Copyright (c)
// 2022 Ada Rose Cannon; LICENSE-handy-work.txt), the bytes of its poses/*.handpose files as base64,
// recorded on Ada Rose Cannon's hands. handy-work ships no thumbs up, so it is composed here: the
// fingers of its fist with the extended thumb of its flat hand. The recorder replaces any of these
// for the session with one recorded from the owner's hand, and logs it so it can be saved here.

import { decode, splice, THUMB } from "../recognizer";
import shipped from "./handy-work.json";

/** Poses a binding may fire. */
export const BINDABLE = ["thumbs-up", "shaka", "horns", "vulcan", "point"] as const;
/**
 * Poses that only compete, so a hand in them never matches a bindable one: the fist (the squeeze
 * channel, handling's grab), the relaxed hand and the flat hand.
 */
const REJECTERS = ["fist", "relax", "flat"] as const;

/**
 * Every template, by name: the shipped ones plus the composed thumbs up.
 * @returns a fresh map (the recorder replaces entries in it)
 */
export function loadTemplates(): Map<string, Float32Array> {
    const raw = shipped as Record<string, string>;
    const t = new Map<string, Float32Array>();
    for (const name of [...BINDABLE, ...REJECTERS]) {
        if (raw[name]) {
            t.set(name, decode(raw[name]));
        }
    }
    const fist = t.get("fist");
    const flat = t.get("flat");
    if (fist && flat) {
        t.set("thumbs-up", splice(fist, flat, THUMB));
    }
    return t;
}
