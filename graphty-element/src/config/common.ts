import Color from "colorjs.io";
import { z } from "zod/v4";
// import * as z4 from "zod/v4/core";

/**
 * A record the element ingests: a node's or an edge's keys and values, as a reader yields them.
 *
 * Any plain object is one. The brand is optional, so a reader can yield `{ id: "a" }` straight from
 * `sourceFetchData()` with no cast and no helper; `DataSource.toRecord` still works and is no longer
 * needed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdHocData<KeyType extends string | number = string> = Record<KeyType, any> & {
    readonly __brand?: "AdHocData";
};

/**
 * Converts a color string to hexadecimal format.
 * @param s - Color string to convert
 * @returns Hexadecimal color string or undefined if invalid
 */
export function colorToHex(s: string): string | undefined {
    const color = new Color(s);
    let hex = color.to("srgb").toString({ format: "hex" }).toUpperCase();
    if (hex.length === 4) {
        // XXX: BabylonJS only likes the long format of hex strings
        hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }

    return hex;
}

export const ColorStyle = z.string().transform(colorToHex);
export const AdvancedColorStyle = z.discriminatedUnion("colorType", [
    z.strictObject({
        colorType: z.literal("solid"),
        value: ColorStyle,
        opacity: z.number().min(0).max(1).optional(),
    }),
    z.strictObject({
        colorType: z.literal("gradient"),
        direction: z.number().min(0).max(360),
        colors: z.array(ColorStyle),
        opacity: z.number().min(0).max(1).optional(),
    }),
    z.strictObject({
        colorType: z.literal("radial-gradient"),
        colors: z.array(ColorStyle),
        opacity: z.number().min(0).max(1).optional(),
    }),
]);
// const ColorScheme = z.array(ColorStyle);

export const TextLocation = z.enum([
    "top",
    "top-right",
    "top-left",
    "left",
    "center",
    "right",
    "bottom",
    "bottom-left",
    "bottom-right",
    "automatic",
]);

const HttpUrl = z.url({
    protocol: /^https?$/,
    hostname: z.regexes.domain,
});

// "data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
const EmbeddedBase64Image = z.string().startsWith("data:image/png;base64,");

export const ImageData = HttpUrl.or(EmbeddedBase64Image);
