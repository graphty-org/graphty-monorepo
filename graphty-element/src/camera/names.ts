/**
 * @file Which names belong to a camera view. Kept apart from the views' arithmetic so a reader of
 * names (the project file, the session's view commands) loads no renderer math.
 */

import { registeredCameraById, registeredCameraDescriptors } from "../catalog/cameraRegistry";
import { CAMERA_DESCRIPTORS } from "../catalog/cameras";

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
