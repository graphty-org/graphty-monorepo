/**
 * @file The camera views a third party registered.
 *
 * WHAT A CAMERA EXTENSION IS, AND WHAT IT IS NOT. The word "camera" covers two things in this
 * package and only one of them can honestly be an extension point. A named VIEW is a pure
 * function from a bounding box to a camera state -- which is exactly what the five built-ins
 * are, and what the element's animation, easing, queueing, cancellation, state-changed event and
 * screenshot framing are already built around. A camera CONTROLLER is a Babylon camera plus an
 * input handler; it cannot be published without Babylon types in its signature, the element does
 * not use its own controller seam for its third camera, and six branches decide a controller's
 * behaviour by duck-typing its property names. Views are the extension point; controllers stay
 * internal.
 *
 * So a registration is plain data and one function, and this module names no Babylon type. The
 * element measures the box, reads the field of view and the render size, and hands the view
 * everything it needs.
 */

import type { CameraViewRegistration } from "../camera/types";
import { GraphtyError } from "../errors";
import { createPluginRegistry, type RegisterOptions } from "./pluginRegistry";
import { type CameraDescriptor, type CameraId, KNOWN_CAMERA_IDS } from "./types";

const registry = createPluginRegistry<CameraViewRegistration, CameraDescriptor>({
    kind: "camera",
    idOf: (entry) => entry.descriptor.id,
    descriptorOf: (entry) => entry.descriptor,
    implementationOf: (entry) => entry.compute,
    builtInIds: () => KNOWN_CAMERA_IDS,
});

/**
 * Register a camera view so it can be named wherever a built-in view can.
 * @param registration - The descriptor and the pure function that computes the state.
 * @param options - Whether a collision with an existing registration throws instead of replacing.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the registration is malformed, naming the
 * field, or with `E_DUPLICATE_PLUGIN` when the id is one the element ships.
 */
export function registerCameraView(registration: CameraViewRegistration, options?: RegisterOptions): void {
    const descriptor = registration.descriptor as CameraDescriptor | undefined;

    if (descriptor === undefined || typeof descriptor !== "object") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: "registerCameraView takes a camera view with a descriptor",
            source: "registry",
            details: { kind: "camera", field: "descriptor" },
        });
    }

    if (!Array.isArray(descriptor.modes) || descriptor.modes.length === 0) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message:
                `the camera view "${String(descriptor.id)}" declares no drawing modes, so nothing could ever ` +
                "offer it: a view says where it works with `modes`, and the element refuses the rest",
            source: "registry",
            details: { kind: "camera", name: String(descriptor.id), field: "modes" },
        });
    }

    if (!Array.isArray(descriptor.options)) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message:
                `the camera view "${String(descriptor.id)}" declares no options list. A view that takes no ` +
                "configuration declares an empty one, so a form has something to render and the element has " +
                "something to check a caller's values against",
            source: "registry",
            details: { kind: "camera", name: String(descriptor.id), field: "options" },
        });
    }

    if (typeof registration.compute !== "function") {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `the camera view "${String(descriptor.id)}" was registered without a compute function`,
            source: "registry",
            details: { kind: "camera", name: String(descriptor.id), field: "compute" },
        });
    }

    registry.register(registration, options);
}

/**
 * What those views publish, in registration order.
 *
 * The same array until something registers, which is the identity promise `session.catalog`
 * composes against.
 * @returns The descriptors.
 */
export function registeredCameraDescriptors(): readonly CameraDescriptor[] {
    return registry.descriptors();
}

/**
 * One registered camera view, by its id.
 * @param id - The view name.
 * @returns The registration, or undefined when nothing registered that name.
 */
export function registeredCameraById(id: CameraId): CameraViewRegistration | undefined {
    return registry.byId(id);
}

/**
 * Forget every registered camera view.
 *
 * FOR TESTS, and named so that a reader cannot mistake it for part of the plugin contract.
 */
export function clearRegisteredCamerasForTesting(): void {
    registry.clearForTesting();
}
