import type { OptionDescriptor } from "@graphty/graphty-element/catalog";

/** The option types the form draws a control for; the rest keep their defaults. */
const DRAWN = new Set<OptionDescriptor["type"]>([
    "number",
    "color",
    "integer",
    "enum",
    "boolean",
    "string",
    "attribute",
    "partition",
    "node-id",
]);

/**
 * The options a form would draw, key ones and advanced ones apart, for a caller that draws the
 * advanced ones somewhere else (a row's settings popover). Internal options are neither.
 * @param options - The element's option descriptors
 * @returns The key options and the advanced ones, in catalog order
 */
export function splitOptions(options: readonly OptionDescriptor[]): {
    key: OptionDescriptor[];
    advanced: OptionDescriptor[];
} {
    const drawn = options.filter((o) => o.internal !== true && DRAWN.has(o.type));
    return { key: drawn.filter((o) => o.advanced !== true), advanced: drawn.filter((o) => o.advanced === true) };
}
