/**
 * What Cytoscape.js draws over a node's face: its background image (`background-image`, `-fit`, `-width`,
 * `-height`, `-width-relative-to`, `-height-relative-to`, `-position-x`/`-y`, `-offset-x`/`-y`, `-repeat`, `-clip`, `background-image-smoothing`,
 * `background-image-opacity`), its pie (`pie-size`, `pie-hole`, `pie-start-angle`, `pie-N-background-*`) and its
 * stripes (`stripe-size`, `stripe-direction`, `stripe-N-background-*`), read as parts and combined per element into
 * the neutral `image*`, `pie*` and `stripe*` properties (https://js.cytoscape.org/#style/background-image,
 * #style/pie-chart-background, #style/stripe-chart-background).
 */

import type { StyleValue } from "../types.js";
import type { CyjsPropertySpec } from "./mappers.js";

/** How many slices a pie, and bands a striped fill, has at most (Cytoscape.js's `pieBackgroundN`). */
const PIECES = 16;

const text = (property: string): CyjsPropertySpec => ({ property, type: "text" });
const color = (property: string): CyjsPropertySpec => ({ property, type: "color" });

/** The parts, by Cytoscape.js property name. */
export const CYJS_FACE_PROPERTIES: readonly [string, CyjsPropertySpec][] = [
    ["background-image", text("_bgImage")],
    ["background-fit", text("_bgFit")],
    ["background-width", text("_bgWidth")],
    ["background-height", text("_bgHeight")],
    ["background-width-relative-to", text("_bgWidthRel")],
    ["background-height-relative-to", text("_bgHeightRel")],
    ["background-position-x", text("_bgPosX")],
    ["background-position-y", text("_bgPosY")],
    ["background-offset-x", text("_bgOffX")],
    ["background-offset-y", text("_bgOffY")],
    ["background-repeat", text("_bgRepeat")],
    ["background-clip", text("_bgClip")],
    ["background-image-smoothing", text("_bgSmooth")],
    ["background-image-opacity", text("_bgOpacity")],
    ["pie-size", text("_pieSize")],
    ["pie-hole", text("_pieHole")],
    ["pie-start-angle", text("_pieStart")],
    ["stripe-size", text("_stripeSize")],
    ["stripe-direction", text("_stripeDir")],
    ...Array.from({ length: PIECES }, (_, k): [string, CyjsPropertySpec][] => [
        [`pie-${String(k + 1)}-background-color`, color(`_pieC${String(k + 1)}`)],
        [`pie-${String(k + 1)}-background-size`, text(`_pieS${String(k + 1)}`)],
        [`pie-${String(k + 1)}-background-opacity`, text(`_pieO${String(k + 1)}`)],
        [`stripe-${String(k + 1)}-background-color`, color(`_stripeC${String(k + 1)}`)],
        [`stripe-${String(k + 1)}-background-size`, text(`_stripeS${String(k + 1)}`)],
        [`stripe-${String(k + 1)}-background-opacity`, text(`_stripeO${String(k + 1)}`)],
    ]).flat(),
];

/**
 * A number and its unit: `30px` is `[30, "px"]`, `50%` `[50, "%"]`, `90deg` `[90, "deg"]`, `30` `[30, ""]`.
 * @param word - the value
 * @returns the number and its unit in lower case, or null
 */
function measure(word: string | null | undefined): [number, string] | null {
    const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)\s*([a-z%]*)$/i.exec((word ?? "").trim());
    return m === null ? null : [Number(m[1]), m[2].toLowerCase()];
}

const r6 = (v: number): number => Math.round(v * 1e6) / 1e6;

/**
 * A length in pixels, or a percentage of `of`.
 * @param word - the value
 * @param of - what a percentage is of, or null when it is not known
 * @returns the length, or null for `auto`, a value it cannot read, or below 0
 */
function length(word: string | null | undefined, of: number | null): number | null {
    const m = measure(word);
    if (m === null) {
        return null;
    }
    let out: number | null = null;
    if (m[1] === "%") {
        out = of === null ? null : (m[0] / 100) * of;
    } else if (m[1] === "px" || m[1] === "") {
        out = m[0];
    }
    return out === null || out < 0 ? null : r6(out);
}

/**
 * A node's padding in pixels: a percentage is drawn as its fraction in pixels on a node that is no compound parent
 * (cytoscape.js 3.34.3 `padding()` returns the property's `pfValue`, 0.2 for `20%`).
 * @param word - the padding as Cytoscape.js spells it, or null
 * @returns the pixels, 0 for none
 */
function paddingPixels(word: string | null): number {
    const x = Number.parseFloat(word ?? "");
    if (!Number.isFinite(x) || x <= 0) {
        return 0;
    }
    return (word ?? "").trim().endsWith("%") ? x / 100 : x;
}

/**
 * A fraction from a percentage (`50%` is 0.5), or from a plain number in 0..1.
 * @param word - the value
 * @returns the fraction, or null
 */
function fraction(word: string | null | undefined): number | null {
    const m = measure(word);
    if (m === null) {
        return null;
    }
    if (m[1] === "%") {
        return r6(m[0] / 100);
    }
    return m[1] === "" ? r6(m[0]) : null;
}

/**
 * The first image of a background image list: `url(...)` unwrapped; `none` is none.
 * @param word - the value
 * @returns the URI, or null
 */
function firstImage(word: string | null | undefined): string | null {
    const first = (word ?? "").trim().split(/\s+/)[0] ?? "";
    const unwrapped = /^url\((['"]?)(.*)\1\)$/.exec(first)?.[2] ?? first;
    return unwrapped === "" || unwrapped === "none" ? null : unwrapped;
}

/**
 * An angle in degrees from 0 up to 360, from `90deg`, `1.5rad` or a number of degrees.
 * @param word - the value
 * @returns the angle, or null
 */
function degrees(word: string | null | undefined): number | null {
    const m = measure(word);
    if (m === null) {
        return null;
    }
    if (m[1] !== "rad" && m[1] !== "deg" && m[1] !== "") {
        return null;
    }
    const deg = m[1] === "rad" ? (m[0] * 180) / Math.PI : m[0];
    return r6(((deg % 360) + 360) % 360);
}

/**
 * The slices or bands of one element: each `N` whose size is above 0, with its color (Cytoscape.js's default
 * black), size and opacity (default 1).
 * @param words - the parts
 * @param prefix - `_pie` or `_stripe`
 * @param i - the element
 * @returns the colors, sizes and opacities as lists separated by spaces, or null with no slice
 */
function pieces(
    words: ReadonlyMap<string, (string | null)[]>,
    prefix: string,
    i: number,
): { colors: string; sizes: string; opacities: string | null } | null {
    const colors: string[] = [];
    const sizes: string[] = [];
    const opacities: string[] = [];
    for (let k = 1; k <= PIECES; k++) {
        // a slice's size is a percentage, written with or without its sign
        const m = measure(words.get(`${prefix}S${String(k)}`)?.[i]);
        const size = m !== null && (m[1] === "%" || m[1] === "") ? r6(m[0] / 100) : null;
        if (size === null || size <= 0) {
            continue;
        }
        colors.push(words.get(`${prefix}C${String(k)}`)?.[i] ?? "#000000");
        sizes.push(String(size));
        const o = Number(words.get(`${prefix}O${String(k)}`)?.[i] ?? "1");
        opacities.push(String(Number.isFinite(o) ? Math.max(0, Math.min(1, o)) : 1));
    }
    if (colors.length === 0) {
        return null;
    }
    return {
        colors: colors.join(" "),
        sizes: sizes.join(" "),
        opacities: opacities.every((o) => o === "1") ? null : opacities.join(" "),
    };
}

/** One element's parts, and where its values go. */
interface FaceElement {
    /** a part's word for this element, or null */
    readonly word: (part: string) => string | null;
    /** sets one of this element's values */
    readonly put: (property: string, value: StyleValue) => void;
    /** the node's width, Cytoscape.js's default 30 unset */
    readonly w: number;
    /** the node's height, Cytoscape.js's default 30 unset */
    readonly h: number;
}

/**
 * Combines the parts of what is drawn over a node's face into the neutral properties, per element.
 * @param n - the element count
 * @param words - the parts by internal name
 * @param values - the values; changed in place
 */
export function combineFace(
    n: number,
    words: ReadonlyMap<string, (string | null)[]>,
    values: Record<string, (StyleValue | null)[]>,
): void {
    const col = (property: string): (StyleValue | null)[] =>
        (values[property] ??= new Array<StyleValue | null>(n).fill(null));
    const num = (property: string, i: number): number | null => {
        const v = values[property]?.[i];
        return typeof v === "number" ? v : null;
    };
    for (let i = 0; i < n; i++) {
        const el: FaceElement = {
            word: (part) => words.get(part)?.[i] ?? null,
            put: (property, value) => {
                col(property)[i] = value;
            },
            // Cytoscape.js's default node is 30 x 30
            w: num("width", i) ?? 30,
            h: num("height", i) ?? 30,
        };
        faceImage(el);
        const pie = pieces(words, "_pie", i);
        if (pie !== null) {
            facePie(el, pie);
        }
        const stripe = pieces(words, "_stripe", i);
        if (stripe !== null) {
            faceStripes(el, stripe);
        }
    }
}

/**
 * An element's background image: the picture, how it fits, its size, place and look.
 * @param el - the element
 */
function faceImage(el: FaceElement): void {
    const image = firstImage(el.word("_bgImage"));
    if (image === null) {
        return;
    }
    el.put("image", image);
    const fit = el.word("_bgFit") ?? "none";
    el.put("imageFit", ["none", "contain", "cover"].includes(fit) ? fit : "none");
    imageSize(el);
    imagePlace(el);
    imageLook(el);
}

/**
 * A background image's width and height. A percentage is of the node's padding box (`-relative-to: include-padding`,
 * the default), its padding on both sides taken in, or of its inner box (`inner`) (cytoscape.js 3.34.3
 * drawInscribedImage: `nodeTW`).
 * @param el - the element
 */
function imageSize(el: FaceElement): void {
    const pad = paddingPixels(el.word("_padding"));
    const of = (rel: string | null, side: number): number => (rel === "inner" ? side : side + 2 * pad);
    // a repeated picture is tiled at its own size whatever its width and height say (Cytoscape.js 3.34
    // `drawInscribedImage`: a canvas pattern of the picture as loaded)
    const tiled = ["repeat", "repeat-x", "repeat-y"].includes(el.word("_bgRepeat") ?? "");
    const bw = tiled ? null : length(el.word("_bgWidth"), of(el.word("_bgWidthRel"), el.w));
    const bh = tiled ? null : length(el.word("_bgHeight"), of(el.word("_bgHeightRel"), el.h));
    if (bw !== null) {
        el.put("imageWidth", bw);
    }
    if (bh !== null) {
        el.put("imageHeight", bh);
    }
    // a side left `auto` is the picture's own (Cytoscape.js's `auto`: "uses the width of the image"), not in
    // proportion to the side given
    if ((bw === null) !== (bh === null)) {
        el.put("imageAutoSize", "natural");
    }
}

/**
 * A background image's position and offset.
 * @param el - the element
 */
function imagePlace(el: FaceElement): void {
    const px = fraction(el.word("_bgPosX"));
    const py = fraction(el.word("_bgPosY"));
    if (px !== null && px >= 0) {
        el.put("imagePositionX", px);
    }
    if (py !== null && py >= 0) {
        el.put("imagePositionY", py);
    }
    const ox = length(el.word("_bgOffX"), el.w);
    const oy = length(el.word("_bgOffY"), el.h);
    if (ox !== null) {
        el.put("imageOffsetX", ox);
    }
    if (oy !== null) {
        el.put("imageOffsetY", oy);
    }
}

/**
 * A background image's repeat, clip, smoothing and opacity.
 * @param el - the element
 */
function imageLook(el: FaceElement): void {
    const repeat = el.word("_bgRepeat");
    if (repeat !== null && ["repeat", "repeat-x", "repeat-y", "no-repeat"].includes(repeat)) {
        el.put("imageRepeat", repeat);
    }
    const clip = el.word("_bgClip");
    if (clip !== null) {
        el.put("imageClip", clip === "none" ? "none" : "node");
    }
    const smooth = el.word("_bgSmooth");
    if (smooth === "yes" || smooth === "no") {
        el.put("imageSmoothing", smooth === "yes");
    }
    const opacity = Number(el.word("_bgOpacity") ?? Number.NaN);
    if (Number.isFinite(opacity)) {
        el.put("imageOpacity", Math.max(0, Math.min(1, opacity)));
    }
}

/**
 * An element's pie: its slices, radius, hole and start angle.
 * @param el - the element
 * @param pie - its slices
 * @param pie.colors - the slices' colors
 * @param pie.sizes - the slices' sizes
 * @param pie.opacities - the slices' opacities, or null when all are 1
 */
function facePie(el: FaceElement, pie: { colors: string; sizes: string; opacities: string | null }): void {
    el.put("pieColors", pie.colors);
    el.put("pieSizes", pie.sizes);
    if (pie.opacities !== null) {
        el.put("pieOpacities", pie.opacities);
    }
    const size = el.word("_pieSize");
    // in pixels, the pie's diameter; as a fraction, of the node's shorter side
    const px = measure(size)?.[1] === "px" ? length(size, null) : null;
    const r = px === null ? fraction(size) : px / Math.min(el.w, el.h);
    if (r !== null) {
        el.put("pieRadius", r6(r));
    }
    const hole = fraction(el.word("_pieHole"));
    if (hole !== null && hole >= 0 && hole <= 1) {
        el.put("pieHole", hole);
    }
    const start = degrees(el.word("_pieStart"));
    if (start !== null) {
        el.put("pieRotation", start);
    }
}

/**
 * An element's stripes: their bands, direction and size.
 * @param el - the element
 * @param stripe - its bands
 * @param stripe.colors - the bands' colors
 * @param stripe.sizes - the bands' sizes
 * @param stripe.opacities - the bands' opacities, or null when all are 1
 */
function faceStripes(el: FaceElement, stripe: { colors: string; sizes: string; opacities: string | null }): void {
    el.put("stripeColors", stripe.colors);
    el.put("stripeSizes", stripe.sizes);
    if (stripe.opacities !== null) {
        el.put("stripeOpacities", stripe.opacities);
    }
    // Cytoscape.js turns its stripes a quarter for `righward` (its spelling); anything else is `vertical`
    if (el.word("_stripeDir") === "righward") {
        el.put("stripeDirection", "right");
    }
    const size = fraction(el.word("_stripeSize"));
    if (size !== null && size >= 0) {
        el.put("stripeSize", size);
    }
}
