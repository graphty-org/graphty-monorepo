// The package's helper functions: gradient stops, hex colour arithmetic, theme
// composition and text direction.
//
// This barrel is wider than the package entry point. `mergeExtensions*` and the
// four inline-geometry helpers below are reachable from here for the library's
// own components and for tests, but are not re-exported from src/index.ts: they
// are the machinery a row type is built out of rather than API a consumer
// composes with, and a test asserts that they stay off the entry point.

export { createColorStop, createDefaultGradientStops } from "./color-stops";
export {
    isValidHex,
    MAX_ALPHA_HEX,
    MAX_OPACITY_PERCENT,
    opacityToAlphaHex,
    parseAlphaFromHexa,
    parseHexaColor,
    toHexaColor,
} from "./color-utils";
export { mergeExtensions, mergeExtensions3, mergeExtensions4 } from "./merge-extensions";
export {
    inlineFraction,
    inlineGradientDirection,
    inlineX,
    isRtl,
    mirrorInline,
    useDirection,
} from "./rtl";
