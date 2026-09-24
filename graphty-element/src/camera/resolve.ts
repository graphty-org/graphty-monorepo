/**
 * @file Turning a camera view's name into a camera state.
 *
 * This is the whole of what "naming a view" means, and it is one lookup rather than the five-case
 * `switch` it replaces. The element's own views are consulted first and the registry second, so a
 * registration can never change what an existing name means, and a plugin's view is reached by
 * exactly the same call the element makes for `"isometric"` -- from the public API, from a
 * screenshot's `{ preset }`, and from the natural-language layer.
 *
 * THREE THINGS HAPPEN HERE AND ALL THREE ARE PART OF THE CONTRACT.
 *
 * 1. A name nothing answers to is `E_UNKNOWN_CAMERA` carrying every name that would have worked,
 *    so a consumer can show the list rather than guess.
 * 2. A view asked for in a drawing mode it does not declare is `E_UNSUPPORTED` BEFORE `compute`
 *    is called, carrying the modes it does declare. Availability used to be expressed by throwing
 *    from inside the switch, which a picker cannot read; now it is data on the descriptor and the
 *    refusal comes from the declaration.
 * 3. The caller's options are resolved against the ones the descriptor declares -- defaults
 *    filled, an unknown name refused with `E_UNKNOWN_OPTION`, a bad value with `E_OPTION_RANGE` --
 *    by the same function every other extension point uses.
 *
 * NODE-SAFE. Nothing here names a Babylon type: the caller measures the box, reads the field of
 * view and the render size, and passes numbers.
 */

import { registeredCameraById, registeredCameraDescriptors } from "../catalog/cameraRegistry";
import { CAMERA_DESCRIPTORS } from "../catalog/cameras";
import { resolveOptionValues } from "../catalog/options";
import type { CameraDescriptor } from "../catalog/types";
import { GraphtyError } from "../errors";
import { builtInCameraView } from "./builtins";
import type { CameraState, CameraViewInput, DrawingMode, GraphBounds } from "./types";

/** Everything the element measures before it can ask a view where the viewer stands. */
export interface CameraViewContext {
    /** The box to frame: the whole graph, or whatever subset the caller scoped to. */
    readonly bounds: GraphBounds;
    /** Which way the element is drawing. */
    readonly mode: DrawingMode;
    /** The viewport's width divided by its height. */
    readonly aspect: number;
    /** How big the drawing surface is, in device pixels. */
    readonly viewport: { readonly width: number; readonly height: number };
    /** The vertical field of view in radians, when the current camera has one. */
    readonly fov?: number;
    /** Where the camera is right now, so a view can be relative to it. */
    readonly current: CameraState;
    /** What the caller configured, before the declared defaults are filled in. */
    readonly options?: Readonly<Record<string, unknown>>;
}

/**
 * Every camera view that can be named right now: the element's own, then the registered ones.
 * @returns The names, the element's own first.
 */
export function cameraViewIds(): readonly string[] {
    return [
        ...CAMERA_DESCRIPTORS.map((descriptor) => descriptor.id),
        ...registeredCameraDescriptors().map((descriptor) => descriptor.id),
    ];
}

/**
 * Whether a name already belongs to a camera view, the element's own or a registered one.
 *
 * What `saveCameraPreset` asks before it stores a snapshot: a snapshot that shadowed a view would
 * turn a rule that recomputes itself for whatever is on screen into a fixed position, silently.
 * @param name - The name being claimed.
 * @returns True when a view already holds it.
 */
export function isCameraViewName(name: string): boolean {
    return CAMERA_DESCRIPTORS.some((descriptor) => descriptor.id === name) || registeredCameraById(name) !== undefined;
}

/**
 * The descriptor and the arithmetic behind one name, wherever it came from.
 * @param id - The view name.
 * @returns Both halves, or undefined when nothing answers to the name.
 */
function lookup(
    id: string,
): { descriptor: CameraDescriptor; compute: (input: CameraViewInput) => CameraState } | undefined {
    const builtIn = builtInCameraView(id);
    if (builtIn !== undefined) {
        const descriptor = CAMERA_DESCRIPTORS.find((candidate) => candidate.id === id);
        return descriptor === undefined ? undefined : { descriptor, compute: builtIn };
    }

    const registered = registeredCameraById(id);

    return registered === undefined ? undefined : { descriptor: registered.descriptor, compute: registered.compute };
}

/**
 * Ask a named view where the viewer should stand.
 * @param id - The view name a consumer typed or a saved document recorded.
 * @param context - What the element measured: the box, the drawing mode, the viewport and where
 *   the camera is now.
 * @returns The state the view computed.
 * @throws A `GraphtyError` with `E_UNKNOWN_CAMERA` when nothing answers to the name,
 * `E_UNSUPPORTED` when the view does not declare the current drawing mode, or
 * `E_UNKNOWN_OPTION` / `E_OPTION_RANGE` when the caller's options are not ones it declared.
 */
export function resolveCameraView(id: string, context: CameraViewContext): CameraState {
    const found = lookup(id);

    if (found === undefined) {
        const available = cameraViewIds();
        throw new GraphtyError({
            code: "E_UNKNOWN_CAMERA",
            message: `no camera view is named "${id}". The views that can be named are: ${available.join(", ")}`,
            source: "view",
            details: { name: id, available },
        });
    }

    const { descriptor, compute } = found;

    if (!descriptor.modes.includes(context.mode)) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message:
                `the camera view "${id}" cannot be computed while the element is drawing in ` +
                `${context.mode}: it declares ${descriptor.modes.join(" and ")}`,
            source: "view",
            details: {
                name: id,
                reason: `the "${id}" view is not available in ${context.mode}`,
                mode: context.mode,
                modes: [...descriptor.modes],
            },
        });
    }

    const options = resolveOptionValues(descriptor.options, context.options ?? {}, { kind: "camera", id });

    const input: CameraViewInput = {
        bounds: context.bounds,
        mode: context.mode,
        aspect: context.aspect,
        viewport: context.viewport,
        ...(context.fov === undefined ? {} : { fov: context.fov }),
        current: context.current,
        options,
    };

    return compute(input);
}
