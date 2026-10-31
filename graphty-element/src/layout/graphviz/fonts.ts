/**
 * @file The font Graphviz sizes a label in: the face the element draws that label in (issue #5116).
 *
 * Graphviz in WebAssembly has no font files. It sizes a label's text from width tables built in for a few families
 * (`lib/common/textspan_lut.c`), picked by the `fontname`, and from Times for a name it does not know. The element
 * draws the same label in whatever face the browser gives the font the `fontname` reads as -- Verdana where Verdana
 * is installed, the browser's fallback face where it is not. Sized in one face and drawn in another, every label is
 * laid out wider or narrower than it is drawn, and the whole drawing with it (9 percent wider for a Verdana file drawn
 * in a Times-like fallback).
 *
 * So each label's `fontname` is handed to Graphviz as the built-in family whose widths are nearest those of the face
 * the browser draws it in, measured on a canvas. This covers every label Graphviz takes room for -- a node's, an
 * edge's, a cluster's -- on every engine, and needs no knowledge of which fonts a machine has.
 */

import type { DotStructure } from "./toDot";

/** The text the drawn face and Graphviz's tables are compared on: lower case, capitals and digits. */
export const FONT_PROBE = "The quick brown fox jumps over the lazy dog 0123456789 THE QUICK BROWN FOX";

/**
 * Each family Graphviz has a width table for, by a name it knows it by, with its width of {@link FONT_PROBE} at one
 * point (measured with `@hpcc-js/wasm-graphviz` 1.29: a `plaintext` node with no margin). Bold and italic names
 * fall back to the upright table, so a bold face is matched by width like any other.
 */
export const GRAPHVIZ_FAMILIES: readonly (readonly [name: string, width: number])[] = [
    ["Times", 35.3563],
    ["Helvetica", 37.7942],
    ["Courier", 44.4074],
    ["Verdana", 42.1394],
    ["Georgia", 37.5696],
    ["Trebuchet MS", 36.553],
    ["Calibri", 33.4678],
    ["DejaVu Sans", 41.611],
    ["Consolas", 40.6858],
    ["Open Sans", 38.2946],
];

/** Graphviz's own default `fontname`. */
const DEFAULT_FONTNAME = "Times-Roman";

/** The font size the probe is measured at, in CSS pixels: large, so the width is not rounded. */
const MEASURE_PX = 100;

/** A font as the element draws it: a CSS family list, and whether it is bold and italic. */
export interface DrawnFont {
    readonly family: string;
    readonly bold: boolean;
    readonly italic: boolean;
}

/** The width of a text drawn in a CSS font (`italic bold 100px Verdana, sans-serif`). */
export type MeasureText = (cssFont: string, text: string) => number;

/**
 * A text measurer on a canvas, where there is one.
 * @returns the measurer, or null where there is no canvas (Node)
 */
export function canvasMeasure(): MeasureText | null {
    const context =
        typeof OffscreenCanvas === "undefined"
            ? (globalThis.document?.createElement("canvas").getContext("2d") ?? null)
            : new OffscreenCanvas(1, 1).getContext("2d");
    if (context === null) {
        return null;
    }

    return (cssFont, text) => {
        context.font = cssFont;
        return context.measureText(text).width;
    };
}

/**
 * The family Graphviz sizes a font's text nearest to how the browser draws it.
 * @param font - the font as the element draws it
 * @param measure - measures text in a CSS font
 * @returns the name of the Graphviz family whose widths are nearest the drawn face's
 */
export function graphvizFamilyFor(font: DrawnFont, measure: MeasureText): string {
    const css = `${font.italic ? "italic" : "normal"} ${font.bold ? "bold" : "normal"} ${MEASURE_PX}px ${font.family}`;
    const drawn = measure(css, FONT_PROBE) / MEASURE_PX;
    let best = GRAPHVIZ_FAMILIES[0];
    for (const family of GRAPHVIZ_FAMILIES) {
        if (Math.abs(Math.log(drawn / family[1])) < Math.abs(Math.log(drawn / best[1]))) {
            best = family;
        }
    }

    // ponytail: nearest table, not the drawn width: a face between two tables is sized up to half their gap
    // (about 3 percent) off; hand Graphviz a scaled fontsize too if that shows.
    return best[0];
}

/**
 * The structure with each label's `fontname` replaced by the Graphviz family nearest the face the element draws it
 * in. A label with no `fontname` is in Graphviz's default, Times-Roman, which the element draws as the file does.
 * @param structure - the structure as the file gave it
 * @param drawnFont - the font the element draws a `fontname` in
 * @param measure - measures text in a CSS font
 * @returns the structure to hand Graphviz
 */
export function withDrawnFonts(
    structure: DotStructure,
    drawnFont: (fontname: string) => DrawnFont,
    measure: MeasureText,
): DotStructure {
    const families = new Map<string, string>();
    const familyOf = (fontname: string): string => {
        let family = families.get(fontname);
        if (family === undefined) {
            family = graphvizFamilyFor(drawnFont(fontname), measure);
            families.set(fontname, family);
        }

        return family;
    };
    const fix = (attributes: Readonly<Record<string, string>>): Readonly<Record<string, string>> => {
        if (attributes.label === undefined) {
            return attributes;
        }

        const fontname = attributes.fontname ?? DEFAULT_FONTNAME;
        const family = familyOf(fontname);
        // Graphviz's own reading of its default is already Times
        return attributes.fontname === undefined && family === "Times"
            ? attributes
            : { ...attributes, fontname: family };
    };
    const fixAll = <K>(
        map: ReadonlyMap<K, Readonly<Record<string, string>>> | undefined,
    ): ReadonlyMap<K, Readonly<Record<string, string>>> | undefined =>
        map === undefined ? undefined : new Map([...map].map(([key, attributes]) => [key, fix(attributes)]));

    return {
        ...structure,
        ...(structure.edges === undefined
            ? {}
            : {
                  edges: structure.edges.map((edge) =>
                      edge.attributes === undefined ? edge : { ...edge, attributes: fix(edge.attributes) },
                  ),
              }),
        groupAttributes: fixAll(structure.groupAttributes),
        nodeAttributes: fixAll(structure.nodeAttributes),
    };
}
