/**
 * @file The camera catalogue: the named views the element can put the viewer in.
 *
 * A view is a way of DECIDING where the viewer stands and what they look at -- not a camera, not
 * an input model, not a projection. That distinction is what makes the point publishable: a view
 * is a pure function of a bounding box, so it can be described as data here and written by a
 * third party against a Node-safe entry point.
 *
 * `modes` is the field that did not exist before and had to. The five views below are not all
 * usable in both drawing modes, and the old code said so by throwing from inside a switch once a
 * view had already been chosen. A picker cannot read a throw, so a view unusable in 2D was
 * offered in 2D. With the modes declared, a picker offers only what will work and the element
 * refuses the rest with `E_UNSUPPORTED` before calling anything.
 *
 * None of the five takes options. That is a fact about the built-ins rather than a limit on the
 * point: a registered view declares `OptionDescriptor[]` like every other extension, and gets
 * them resolved against its defaults before `compute` is called.
 *
 * THIS TABLE MEANS "WHAT THE ELEMENT SHIPS" and never grows. Registrations live in
 * `./cameraRegistry`, the lookups below consult it after the table, and `session.catalog`
 * composes the two.
 */

import { registeredCameraById, registeredCameraDescriptors } from "./cameraRegistry";
import type { CameraDescriptor, CameraId, DrawingMode } from "./types";

/** Every camera view the element ships. */
export const CAMERA_DESCRIPTORS: readonly CameraDescriptor[] = Object.freeze([
    {
        id: "fitToGraph",
        plainName: "Fit to graph",
        description: "Frames every element, from an angle in 3D and straight on in 2D.",
        modes: ["2d", "3d"],
        options: [],
    },
    {
        id: "topView",
        plainName: "From above",
        description: "Looks straight down at the graph. The natural view for a flat arrangement.",
        modes: ["2d", "3d"],
        options: [],
    },
    {
        id: "sideView",
        plainName: "From the side",
        description: "Looks along the x axis, which shows how deep an arrangement is.",
        modes: ["3d"],
        options: [],
    },
    {
        id: "frontView",
        plainName: "From the front",
        description: "Looks along the z axis, straight at the face of the arrangement.",
        modes: ["3d"],
        options: [],
    },
    {
        id: "isometric",
        plainName: "Isometric",
        description: "The classic three-quarter view: 45 degrees around and about 35 degrees up.",
        modes: ["3d"],
        options: [],
    },
] satisfies readonly CameraDescriptor[]);

/**
 * Find one camera view by its name.
 *
 * The element's own views are searched first, so a registration can never change what an
 * existing name means.
 * @param id - The view name, such as "isometric".
 * @returns The descriptor, or undefined when nothing answers to that name.
 */
export function cameraDescriptor(id: CameraId): CameraDescriptor | undefined {
    return CAMERA_DESCRIPTORS.find((descriptor) => descriptor.id === id) ?? registeredCameraById(id)?.descriptor;
}

/**
 * The views that can be computed in one drawing mode, which is what a picker offers.
 * @param mode - The mode the element is drawing in.
 * @returns Every view usable in that mode, the element's own first.
 */
export function camerasForMode(mode: DrawingMode): readonly CameraDescriptor[] {
    return [...CAMERA_DESCRIPTORS, ...registeredCameraDescriptors()].filter((descriptor) =>
        descriptor.modes.includes(mode),
    );
}
