/**
 * @file Whether this build carries the in-page code sandbox. `./bundle` replaces this module with
 * one that says false (vite.bundle.config.ts), so the assistant reports in-page code unsupported
 * there without loading anything.
 */

/** True: this build has the sandbox's chunk and its WebAssembly. */
export const PROGRAM_IN_BUILD: boolean = true;
