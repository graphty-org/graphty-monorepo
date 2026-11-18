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

import { cameraViewIds, isCameraViewName } from "./resolve";
import type { CameraState } from "./types";

/**
 * Every camera view the element ships, by name.
 *
 * Superseded by `session.catalog.cameras()`, which carries what each view is called in plain
 * words, which drawing modes it works in, and the views a third party registered -- none of which
 * a list of names can say. Kept because the root entry point publishes it and a consumer may be
 * reading it.
 */

/** An entry `importCameraPresets` left out, with the code `session.views.save` would refuse it with. */
export interface SkippedPreset {
    name: string;
    code: "E_PROTECTED" | "E_BAD_COMMAND";
}

/**
 * Split presets to import into the views to save and the names left out.
 *
 * A camera view's name is left out for the same reason `session.views.save` refuses it: the
 * imported entry is a fixed position, and overwriting a view with it would quietly turn a rule
 * that recomputes itself for the graph on screen into one that does not.
 * @param presets - Preset names mapped to camera states.
 * @returns The views to save, and the names left out with their codes.
 */
export function splitPresetImport(presets: Readonly<Record<string, CameraState>>): {
    views: { name: string; camera: CameraState }[];
    skipped: SkippedPreset[];
} {
    const views: { name: string; camera: CameraState }[] = [];
    const skipped: SkippedPreset[] = [];
    for (const [name, camera] of Object.entries(presets)) {
        if (name.trim() === "") {
            skipped.push({ name, code: "E_BAD_COMMAND" });
        } else if (isCameraViewName(name)) {
            skipped.push({ name, code: "E_PROTECTED" });
        } else {
            views.push({ name, camera });
        }
    }

    return { views, skipped };
}

/**
 * Every name a preset load answers to: the camera views, marked, then the saved views' states.
 * @param saved - The saved views, in project order.
 * @returns The names, mapped to the computed-view marker or the saved state.
 */
export function presetsOf(saved: Iterable<[string, CameraState]>): Record<string, CameraState | { builtin: true }> {
    const presets: Record<string, CameraState | { builtin: true }> = {};
    for (const name of cameraViewIds()) {
        presets[name] = { builtin: true };
    }
    for (const [name, state] of saved) {
        presets[name] = state;
    }
    return presets;
}

export { KNOWN_CAMERA_IDS as BUILTIN_PRESETS } from "../catalog/types";
