/**
 * @file `@graphty/graphty-element/catalog`: what the element can do, published as plain JSON.
 *
 * ```js
 * import { BUILT_IN_ALGORITHMS, LAYOUT_DESCRIPTORS } from "@graphty/graphty-element/catalog";
 * ```
 *
 * Every algorithm, layout, file format, palette, camera view, log destination and scale the
 * element offers is described here as data: a plain name, a technical name, what it computes,
 * what it costs and what it can be configured with. An options form, a metrics panel, a file
 * picker, a camera menu and a cost gate can all be built from these tables without importing a
 * class, a renderer or a 3D engine -- which is the point, because the alternative is an
 * application that hard-codes its own list and falls silently out of step the first time the
 * element gains or loses a capability.
 *
 * Option schemas cross this boundary as {@link OptionDescriptor}, never as Zod objects. Shipping
 * Zod across a package boundary makes the consumer's Zod version part of this package's API and
 * forces it to read Zod internals to recover a type, a default and a range.
 *
 * The descriptor barrel is re-exported wholesale on purpose: the catalogue module's own public
 * list is the single declaration of what a descriptor is, and restating it here would guarantee
 * the two drift. The tables are listed by name, because a table is a thing a consumer asks for
 * by name.
 *
 * Node-safety is enforced by a test: `test/packaging/node-safe-entries.test.ts` resolves this
 * module's import graph and fails if Babylon.js, Lit or a DOM global appears in it.
 */

export * from "./src/catalog/index";

// ---------------------------------------------------------------------------------------------
// The tables
// ---------------------------------------------------------------------------------------------

export type { BuiltInAlgorithmDescriptor, LegacyAlgorithmKey, LegacyAlgorithmMapping } from "./src/catalog/algorithms";
export { algorithmByKey, algorithmByLegacyKey, BUILT_IN_ALGORITHMS } from "./src/catalog/algorithms";
export { CAMERA_DESCRIPTORS, cameraDescriptor, camerasForMode } from "./src/catalog/cameras";
export type { DetectionInput } from "./src/catalog/detect";
export { detectFormat, detectFormats } from "./src/catalog/detect";
export type { UnservedFormat } from "./src/catalog/formats";
export { FORMAT_DESCRIPTORS, formatDescriptor, formatsForExtension, UNSERVED_FORMAT_IDS } from "./src/catalog/formats";
export type { LayoutCatalogEntry, LayoutImplementation, UnservedLayout } from "./src/catalog/layouts";
export {
    LAYOUT_CATALOG,
    LAYOUT_DESCRIPTORS,
    layoutDescriptor,
    layoutEntry,
    layoutIdForEngine,
    UNSERVED_LAYOUT_IDS,
} from "./src/catalog/layouts";
export { LOG_SINK_DESCRIPTORS, logSinkDescriptor } from "./src/catalog/logSinks";
export { PALETTE_DESCRIPTORS, paletteDescriptor, palettesOfKind } from "./src/catalog/palettes";
export { SCALE_DESCRIPTORS, scaleDescriptor, scalesForDomain } from "./src/catalog/scales";
