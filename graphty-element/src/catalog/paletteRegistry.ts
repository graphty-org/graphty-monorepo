/**
 * @file The palettes a third party registered.
 *
 * A palette is the one extension point with no code in it. Nothing in the element ever asks a
 * palette for behaviour: the categorical index path, the continuous interpolation path, the step
 * table, the over-subscription refusal, the legend and the reversal flag are all implemented by
 * code that reads six fields off a descriptor. So the descriptor is the whole unit, and a class
 * would be a data carrier wearing a constructor.
 *
 * WHAT REGISTRATION CHECKS, AND WHY EACH CHECK IS AT THE DOOR RATHER THAN IN THE REPAINT.
 *
 * - An anchor that is not a colour is refused here. The same mistake used to be caught inside
 *   the ramp builder, one repaint after it was made, by which point the author is looking at a
 *   picture rather than at their registration call.
 * - Anchors are normalised to six-digit hex here, so an author may write `oklch(...)` or a CSS
 *   colour name and the renderer, the legend and a saved document all read the same hexes. The
 *   interpolation path reads six digits and answers magenta for anything else, so without this a
 *   palette written in named colours produces correct endpoints and a magenta middle.
 * - `kind` is authoritative and `capacity` is derived from it: a categorical palette carries as
 *   many values as it has colours, and a continuous one carries anchors to interpolate between
 *   rather than a fixed set. A descriptor whose `capacity` contradicts its `kind` is refused
 *   rather than silently corrected, because the contradiction means the author believes one of
 *   the two and the element cannot tell which.
 *
 * A palette declares no options. Every knob -- scale, domain, clamp, midpoint, reverse, missing,
 * bins -- belongs to the binding that names the palette, no built-in palette takes configuration,
 * and inventing an options surface no built-in has would be inventing a parity gap rather than
 * closing one.
 */

import { GraphtyError } from "../errors";
import { normalizeHexAnchor } from "./color";
import { createPluginRegistry, type RegisterOptions } from "./pluginRegistry";
import { KNOWN_PALETTE_IDS, type PaletteDescriptor, type PaletteId } from "./types";

/**
 * The content of a descriptor, as one string.
 *
 * WHY CONTENT RATHER THAN OBJECT IDENTITY decides whether a second registration is a re-import.
 * A palette is data, and `registerPalette({ ... })` writes an object literal that a bundler
 * re-evaluating the module rebuilds from scratch -- a new object every time, describing exactly
 * the same palette. Comparing the objects would call that a collision and warn about a palette
 * nobody changed.
 * @param descriptor - The normalised descriptor.
 * @returns A key two identical palettes share.
 */
function contentKey(descriptor: PaletteDescriptor): string {
    return JSON.stringify([descriptor.id, descriptor.kind, descriptor.colors, descriptor.capacity, descriptor.colorblindSafe]);
}

const registry = createPluginRegistry<PaletteDescriptor, PaletteDescriptor>({
    kind: "palette",
    idOf: (descriptor) => descriptor.id,
    descriptorOf: (descriptor) => descriptor,
    implementationOf: contentKey,
    builtInIds: () => KNOWN_PALETTE_IDS,
});

/**
 * Refuse a registration and say which field was wrong.
 * @param id - The palette being registered, for the message.
 * @param field - The field at fault.
 * @param message - What is wrong with it, as a sentence.
 * @throws A `GraphtyError` with `E_BAD_COMMAND`.
 */
function refuse(id: unknown, field: string, message: string): never {
    throw new GraphtyError({
        code: "E_BAD_COMMAND",
        message,
        source: "registry",
        details: { kind: "palette", name: typeof id === "string" ? id : "", field },
    });
}

/**
 * Register a palette so that a style layer, a legend and a saved document can all name it.
 * @param descriptor - The palette: an id, a plain name, a kind, its colour anchors, its capacity
 *   and whatever colour-blindness safety it claims.
 * @param options - Whether a collision with an existing registration throws instead of replacing.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the descriptor is malformed, naming the
 * field, or with `E_DUPLICATE_PLUGIN` when the id is one the element ships.
 */
export function registerPalette(descriptor: PaletteDescriptor, options?: RegisterOptions): void {
    if (typeof descriptor !== "object") {
        refuse("", "descriptor", "registerPalette takes a palette descriptor");
    }

    if (descriptor.plainName === undefined || descriptor.plainName === "") {
        refuse(descriptor.id, "plainName", `the palette "${String(descriptor.id)}" was registered without a plain name`);
    }

    if (descriptor.kind !== "sequential" && descriptor.kind !== "diverging" && descriptor.kind !== "categorical") {
        refuse(
            descriptor.id,
            "kind",
            `the palette "${String(descriptor.id)}" must be sequential, diverging or categorical`,
        );
    }

    if (!Array.isArray(descriptor.colors) || descriptor.colors.length === 0) {
        refuse(descriptor.id, "colors", `the palette "${String(descriptor.id)}" was registered with no colours`);
    }

    const colors: string[] = [];
    for (const color of descriptor.colors) {
        const hex = normalizeHexAnchor(color);
        if (hex === null) {
            refuse(descriptor.id, "colors", `"${String(color)}" in the palette "${String(descriptor.id)}" is not a colour`);
        }

        colors.push(hex);
    }

    const capacity = descriptor.kind === "categorical" ? colors.length : null;
    if (descriptor.capacity !== undefined && descriptor.capacity !== capacity) {
        refuse(
            descriptor.id,
            "capacity",
            `the palette "${String(descriptor.id)}" is ${descriptor.kind}, so its capacity is ` +
                `${capacity === null ? "null" : String(capacity)} rather than ${String(descriptor.capacity)}`,
        );
    }

    /*
     * A MISSING SAFETY CLAIM BECOMES AN EMPTY ONE rather than a refusal. An empty list means the
     * palette makes no claim, which is already what the element's own red-to-blue descriptor
     * says, and it is not the same as a palette known to fail. Refusing a palette for declining
     * to answer a question about colour blindness would be the element overruling an author about
     * their own palette; a picker that wants the answer computes it with `isPaletteSafe`.
     */
    registry.register(
        Object.freeze({
            ...descriptor,
            colors: Object.freeze(colors),
            capacity,
            colorblindSafe: Object.freeze(descriptor.colorblindSafe ?? []),
        }),
        options,
    );
}

/**
 * What those palettes publish, in registration order.
 *
 * The same array until something registers, which is the identity promise `session.catalog`
 * composes against.
 * @returns The descriptors.
 */
export function registeredPaletteDescriptors(): readonly PaletteDescriptor[] {
    return registry.descriptors();
}

/**
 * One registered palette, by its id.
 * @param id - The palette name.
 * @returns The descriptor, or undefined when nothing registered that name.
 */
export function registeredPaletteById(id: PaletteId): PaletteDescriptor | undefined {
    return registry.byId(id);
}

/**
 * Forget every registered palette.
 *
 * FOR TESTS, and named so that a reader cannot mistake it for part of the plugin contract.
 */
export function clearRegisteredPalettesForTesting(): void {
    registry.clearForTesting();
}
