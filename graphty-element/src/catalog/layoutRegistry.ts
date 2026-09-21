/**
 * @file The layout engines a third party registered.
 *
 * WHAT WAS MISSING. A layout engine registered and ran -- `LayoutEngine.register` filed it and
 * `setLayout` found it -- and reached no catalogue: it could not appear in a picker, it declared
 * no options a form could render, and `layoutIdForEngine` could not answer its name. Everything
 * the element knows about its own twelve arrangements was unavailable to a thirteenth.
 *
 * ONE KEY, NOT TWO. The element has two names for a layout: the ENGINE name (`ngraph`,
 * `circular`), which `setLayout` takes, and the ARRANGEMENT name (`force`, `circular`), which the
 * catalogue uses. For the element's own twelve that distinction carries editorial judgement --
 * which of several engines is preferred for an arrangement, and why. A plugin declares ONE key:
 * `descriptor.id` must equal `static type`, so nothing is named twice and `layoutIdForEngine`
 * answers a plugin's own id.
 *
 * A plugin cannot add an engine to an EXISTING arrangement -- a third force-directed
 * implementation behind `force`, say -- and that is deliberate rather than an oversight: the
 * arrangement table encodes the element's judgement about which of its own engines to prefer,
 * which is not a judgement a third party can make on the element's behalf.
 *
 * Nothing here imports an engine class. The class stays in `LayoutEngine`'s own map; this holds
 * the catalogue half, which is what keeps `./catalog` free of the layout runtime.
 */

import { createPluginRegistry, type RegisterOptions } from "./pluginRegistry";
import { KNOWN_LAYOUT_IDS, type LayoutDescriptor, type LayoutId } from "./types";

/** One layout a third party registered: what a picker reads, and the key `setLayout` takes. */
export interface RegisteredLayout {
    /** What the catalogue publishes about it. */
    readonly descriptor: LayoutDescriptor;
    /** The name `LayoutEngine.register` filed the class under. Equal to `descriptor.id`. */
    readonly type: string;
}

const registry = createPluginRegistry<RegisteredLayout, LayoutDescriptor>({
    kind: "layout",
    idOf: (entry) => entry.descriptor.id,
    descriptorOf: (entry) => entry.descriptor,
    implementationOf: (entry) => entry.descriptor,
    builtInIds: () => KNOWN_LAYOUT_IDS,
});

/**
 * Publish a registered layout to the catalogue.
 *
 * Called by `LayoutEngine.register` for a class that declares a descriptor, and by nothing else:
 * a descriptor filed without its engine would be an arrangement a consumer can pick and then be
 * told does not exist.
 * @param entry - The descriptor and the registry type.
 * @param options - Whether a collision throws instead of replacing.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the descriptor carries no id, or with
 * `E_DUPLICATE_PLUGIN` when the id is one of the element's own arrangements.
 */
export function publishLayoutDescriptor(entry: RegisteredLayout, options?: RegisterOptions): void {
    registry.register(entry, options);
}

/**
 * What those layouts publish, in registration order.
 *
 * The same array until something registers, which is the identity promise `session.catalog`
 * composes against.
 * @returns The descriptors.
 */
export function registeredLayoutDescriptors(): readonly LayoutDescriptor[] {
    return registry.descriptors();
}

/**
 * One registered layout, by its id.
 * @param id - The layout name, which is also the engine name.
 * @returns The entry, or undefined when nothing registered that name.
 */
export function registeredLayoutById(id: LayoutId): RegisteredLayout | undefined {
    return registry.byId(id);
}

/**
 * Forget every registered layout.
 *
 * FOR TESTS, and named so that a reader cannot mistake it for part of the plugin contract. It
 * clears the catalogue half only: a suite that also registered an engine class clears that
 * through `LayoutEngine`.
 */
export function clearRegisteredLayoutsForTesting(): void {
    registry.clearForTesting();
}
