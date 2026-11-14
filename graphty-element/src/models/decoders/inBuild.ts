/**
 * @file Whether this build carries the Draco decoder and the KTX2 transcoders. `./bundle` replaces
 * this module with one that says false and leaves both decoder modules out (vite.bundle.config.ts):
 * one file cannot carry their WebAssembly beside it, so there a model that needs them reports
 * `E_MODEL_DECODER_UNAVAILABLE` with `reason: "missing"`.
 */

/** True: this build has the Draco and KTX2 decoder modules and their files. */
export const DECODERS_IN_BUILD: boolean = true;
