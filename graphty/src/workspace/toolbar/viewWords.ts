/**
 * The app's words for camera views, saved views and tours: the names of graphty-element's camera
 * views, and its coded view and tour problems (`viewProblem`, `planTour`) worded for a row. The
 * element decides; these only say it.
 */

import type { CodedFact } from "@graphty/graphty-element/session";

/** The app's words for the element's camera view ids, wherever the app shows one. */
const CAMERA_VIEW_WORDS: Readonly<Record<string, string>> = {
    fitToGraph: "Fit",
    frontView: "Front",
    sideView: "Side",
    topView: "Top",
    isometric: "Isometric",
};

/**
 * A camera view's name: the app's word for a built-in id, else the name its registrant gave it.
 * @param id - the camera view id.
 * @param plainName - the catalog's name for it, for a view an extension registered.
 * @returns the name.
 */
export function cameraViewName(id: string, plainName?: string): string {
    return CAMERA_VIEW_WORDS[id] ?? plainName ?? id;
}

/** A drawing mode as the app writes it. */
const MODE_WORDS: Readonly<Record<string, string>> = { "2d": "2D", "3d": "3D", vr: "VR", ar: "AR" };

/**
 * Words for a mode list param.
 * @param modes - the `modes` param, such as `["3d"]`.
 * @returns such as "3D" or "2D or 3D".
 */
function modesWords(modes: unknown): string {
    const list = Array.isArray(modes) ? modes.map((mode) => MODE_WORDS[String(mode)] ?? String(mode)) : [];
    return list.join(" or ");
}

/**
 * Why a view cannot be applied now, from the element's `viewProblem` (or a tour stop's problem).
 * @param problem - the coded fact, or null.
 * @param saved - whether the row is a saved view, which says where it was saved ("Saved in 3D").
 * @returns the reason, or null when it can be applied.
 */
export function viewProblemWords(problem: CodedFact | null, saved = false): string | null {
    if (problem === null) {
        return null;
    }
    const { code, params } = problem;
    if (code === "E_UNSUPPORTED" && params.reason === "xr") {
        return `Not in ${MODE_WORDS[String(params.mode)] ?? "VR or AR"}`;
    }
    if (code === "E_UNSUPPORTED" && params.reason === "mode") {
        return `${saved ? "Saved in" : "Only in"} ${modesWords(params.modes)}`;
    }
    switch (code) {
        case "E_UNKNOWN_CAMERA":
            return "View not found";
        case "E_PROTECTED":
            return "A camera view has this name";
        case "E_BAD_COMMAND":
            if (params.reason === "no-stops") {
                return "No stops";
            }
            return params.missing === undefined ? "No name" : "Tour not found";
        case "E_OPTION_RANGE":
            return "A time is not valid";
        default:
            return `Not available (${code})`;
    }
}

/**
 * Why a tour cannot play, from its `planTour` result: its own problem, else its first broken stop.
 * @param plan - the plan.
 * @param plan.problem - the tour's own problem.
 * @param plan.stops - the stops, each with its problem.
 * @returns the reason, or null when it can play.
 */
export function tourProblemWords(plan: {
    readonly problem: CodedFact | null;
    readonly stops: readonly { readonly problem: CodedFact | null }[];
}): string | null {
    if (plan.problem !== null) {
        return viewProblemWords(plan.problem);
    }
    const index = plan.stops.findIndex((stop) => stop.problem !== null);
    if (index === -1) {
        return null;
    }
    return `Stop ${String(index + 1)}: ${viewProblemWords(plan.stops[index].problem, true) ?? ""}`;
}
