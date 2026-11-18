/**
 * @file Which drawing modes a camera state can be applied in, and the refusals every camera door
 * shares.
 *
 * One predicate for every door (`setCameraState`, `applyCameraView`, `viewProblem`, a tour, a
 * capture's camera): a state fits a mode when its `mode` says so, or, with no `mode`, when it holds
 * at least one member that mode reads. `{}` fits both and changes nothing. A member the mode does
 * not read is ignored, so `{ target }` alone is 3D only and is refused in 2D rather than silently
 * doing nothing.
 *
 * NODE-SAFE: plain data only.
 */

import { GraphtyError } from "../errors/GraphtyError";
import type { CameraState, DrawingMode } from "./types";

/** The members a 2D camera reads. */
const READ_2D = ["zoom", "pan", "rotation"] as const satisfies readonly (keyof CameraState)[];

/** The members a 3D camera reads. */
const READ_3D = [
    "position",
    "target",
    "alpha",
    "beta",
    "radius",
    "pivotRotation",
    "cameraDistance",
    "fov",
] as const satisfies readonly (keyof CameraState)[];

/**
 * The drawing modes a state can be applied in.
 * @param state - The state.
 * @returns Its `mode` alone when it has one; else each mode it holds a member of; both for `{}`.
 */
export function stateModes(state: CameraState): readonly DrawingMode[] {
    if (state.mode !== undefined) {
        return [state.mode];
    }

    const flat = READ_2D.some((key) => state[key] !== undefined);
    const deep = READ_3D.some((key) => state[key] !== undefined);
    if (!flat && !deep) {
        return ["2d", "3d"];
    }

    return [...(flat ? (["2d"] as const) : []), ...(deep ? (["3d"] as const) : [])];
}

/** The element's drawing mode as `getViewMode()` reports it. */
export type ViewModeName = DrawingMode | "ar" | "vr";

/**
 * Why a camera state cannot be applied in a view mode, as the params of an `E_UNSUPPORTED` refusal.
 * @param state - The state.
 * @param mode - The element's view mode now.
 * @param where - The view's name and the tour stop, when there are any.
 * @param where.name - The view's name.
 * @param where.stop - The 0-based tour stop.
 * @returns The params, or null when it fits.
 */
export function stateProblem(
    state: CameraState,
    mode: ViewModeName,
    where: { readonly name?: string; readonly stop?: number } = {},
): Readonly<Record<string, string | number | readonly string[]>> | null {
    if (mode === "ar" || mode === "vr") {
        return { reason: "xr", mode };
    }

    const modes = stateModes(state);
    if (modes.includes(mode)) {
        return null;
    }

    return {
        reason: "mode",
        ...(where.name === undefined ? {} : { name: where.name }),
        ...(where.stop === undefined ? {} : { stop: where.stop }),
        modes: [...modes],
        mode,
    };
}

/**
 * The `E_UNSUPPORTED` error for a refusal `stateProblem` found.
 * @param details - The refusal's params.
 * @returns The error.
 */
export function cameraRefusal(details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message:
            details.reason === "xr"
                ? `the camera cannot be placed while the element is drawing in ${String(details.mode)}`
                : `the camera state does not fit the drawing mode ${String(details.mode)}`,
        source: "view",
        details,
    });
}

/**
 * The view a capture's `camera` option names, under either spelling.
 * @param camera - The option: a camera state, `{ view }`, or the older `{ preset }`.
 * @returns The name, or undefined for a camera state.
 */
export function cameraOptionName(camera: CameraState | { view: string } | { preset: string }): string | undefined {
    if ("view" in camera) {
        return camera.view;
    }
    return "preset" in camera ? camera.preset : undefined;
}
