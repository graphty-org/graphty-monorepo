/**
 * @file The names of the camera views the element ships, kept under the name consumers import.
 *
 * `BUILTIN_PRESETS` used to be a hand-written array sitting beside five hand-written calculation
 * functions, and it was the element's only answer to "what views are there". The views are now
 * described as data in `src/catalog/cameras.ts` and computed in `src/camera/builtins.ts`, so this
 * array is DERIVED rather than declared: there is one list of built-in view names and everything
 * reads it.
 *
 * A consumer asking what views exist should read `catalog.cameras()`, which lists the registered
 * ones too. This export stays because it is published from the root entry point and removing it
 * would break a consumer for no gain.
 */

import { KNOWN_CAMERA_IDS } from "../catalog/types";

/**
 * Every camera view the element ships, by name.
 *
 * Superseded by `session.catalog.cameras()`, which carries what each view is called in plain
 * words, which drawing modes it works in, and the views a third party registered -- none of which
 * a list of names can say. Kept because the root entry point publishes it and a consumer may be
 * reading it.
 */
export const BUILTIN_PRESETS = KNOWN_CAMERA_IDS;
