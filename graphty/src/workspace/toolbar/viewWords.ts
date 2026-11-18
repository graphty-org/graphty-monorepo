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
    bottomView: "Bottom",
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

/**
 * A camera view as a phrase inside a sentence: "the top view", for the Views place's Kind row
 * ("Recomputed from the top view"), so a camera renamed from Top to Overhead still says what it
 * follows rather than its own name.
 * @param id - the camera view id.
 * @param plainName - the catalog's name for it, for a view an extension registered.
 * @returns the phrase.
 */
export function cameraViewPhrase(id: string, plainName?: string): string {
    return `the ${cameraViewName(id, plainName).toLowerCase()} view`;
}

/**
 * Words for a drawing mode list, such as "3D" or "2D and 3D".
 * @param modes - the modes.
 * @param join - the word between the last two.
 * @returns the words.
 */
export function modeListWords(modes: readonly string[], join = "and"): string {
    const list = modes.map((mode) => MODE_WORDS[mode] ?? mode);
    return list.length < 2 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} ${join} ${String(list.at(-1))}`;
}

/** A drawing mode as the app writes it. */
const MODE_WORDS: Readonly<Record<string, string>> = { "2d": "2D", "3d": "3D", vr: "VR", ar: "AR" };

/**
 * Words for a mode list param.
 * @param modes - the `modes` param, such as `["3d"]`.
 * @returns such as "3D" or "2D or 3D".
 */
function modesWords(modes: unknown): string {
    return modeListWords(Array.isArray(modes) ? modes.map(String) : [], "or");
}

/**
 * Why a view cannot be applied now, from the element's `viewProblem` (or a tour stop's problem).
 * @param problem - the coded fact, or null.
 * @param saved - whether the row is a fixed saved camera, which says where it was saved ("Saved in
 *     3D"); anything else says the modes it works in ("3D only").
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
        return saved ? `Saved in ${modesWords(params.modes)}` : `${modesWords(params.modes)} only`;
    }
    switch (code) {
        case "E_UNKNOWN_CAMERA":
            return "Camera not found";
        case "E_PROTECTED":
            return "Reserved name";
        case "E_BAD_COMMAND":
            if (params.reason === "no-stops") {
                return "No stops";
            }
            if (params.reason === "name-taken") {
                return "Name in use";
            }
            return params.missing === undefined ? "No name" : "Tour not found";
        case "E_OPTION_RANGE":
            return "A time is not valid";
        default:
            return `Not available (${code})`;
    }
}

/** What judges a view name: the element's `viewProblem`, and its saved views. */
interface ViewJudge {
    viewProblem: (name: string, options?: { saved?: boolean }) => CodedFact | null;
    readonly session: { readonly views: ReadonlyMap<string, { readonly follows?: string }> };
}

/**
 * Whether a name is a fixed saved camera: a saved view no camera view has taken the name of, which
 * holds its own pose rather than following a camera view.
 * @param name - the name.
 * @param element - the element that judges it.
 * @returns true for a fixed saved camera.
 */
export function isFixedCamera(name: string, element: ViewJudge | null): boolean {
    const saved = element?.session.views.get(name);
    return (
        saved !== undefined &&
        saved.follows === undefined &&
        element?.viewProblem(name, { saved: true })?.code !== "E_PROTECTED"
    );
}

/**
 * Why a tour stop cannot be flown, from its `planTour` problem: "Saved in 3D" for a stop on a fixed
 * camera, "3D only" for one on a camera that follows a view or on a camera view id.
 * @param problem - the stop's problem, or null.
 * @param element - the element that judges the stop's view name.
 * @returns the reason, or null when it can be flown.
 */
export function stopProblemWords(problem: CodedFact | null, element: ViewJudge | null): string | null {
    const name = problem?.params.name;
    return viewProblemWords(problem, typeof name === "string" && isFixedCamera(name, element));
}

/**
 * Why a tour cannot play, from its `planTour` result: its own problem, else its first broken stop.
 * @param plan - the plan.
 * @param plan.problem - the tour's own problem.
 * @param plan.stops - the stops, each with its problem.
 * @param element - the element that judges a stop's view name.
 * @returns the reason, or null when it can play.
 */
export function tourProblemWords(
    plan: {
        readonly problem: CodedFact | null;
        readonly stops: readonly { readonly problem: CodedFact | null }[];
    },
    element: ViewJudge | null,
): string | null {
    if (plan.problem !== null) {
        return viewProblemWords(plan.problem);
    }
    const index = plan.stops.findIndex((stop) => stop.problem !== null);
    if (index === -1) {
        return null;
    }
    return `Stop ${String(index + 1)}: ${stopProblemWords(plan.stops[index].problem, element) ?? ""}`;
}

/**
 * A tour's length as a clock reads it: "0:14", "1:05".
 * @param ms - the length in milliseconds, such as `planTour(name).totalMs`.
 * @returns the words.
 */
export function lengthWords(ms: number): string {
    const seconds = Math.round(ms / 1000);
    return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, "0")}`;
}
