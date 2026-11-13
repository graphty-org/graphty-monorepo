import Color from "colorjs.io";
import { z } from "zod";

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
    let hex: string;
    try {
        hex = new Color(s).to("srgb").toString({ format: "hex" }).toUpperCase();
    } catch {
        // colorjs.io throws on a string it cannot parse.
        return undefined;
    }

    // BabylonJS only reads the long forms, so a collapsed #RGB or #RGBA is expanded.
    if (hex.length === 4 || hex.length === 5) {
        hex = hex.replace(/[0-9A-F]/g, "$&$&");
    }

    return hex;
}

// The output type stays `string | undefined`, as published: narrowing it would break code that
// builds a parsed style by hand with a colour it has not got yet.
export const ColorStyle = z.string().transform((s, ctx): string | undefined => {
    const hex = colorToHex(s);
    if (hex === undefined) {
        ctx.addIssue({ code: "custom", message: `not a color: ${JSON.stringify(s)}` });
        return z.NEVER;
    }

    return hex;
});
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
        /** Where each color sits, 0 to 1; left out, or not one per color, the colors are evenly spaced. */
        stops: z.array(z.number().min(0).max(1)).optional(),
        opacity: z.number().min(0).max(1).optional(),
    }),
    z.strictObject({
        colorType: z.literal("radial-gradient"),
        colors: z.array(ColorStyle),
        /** Where each color sits, 0 at the middle to 1; left out, or not one per color, evenly spaced. */
        stops: z.array(z.number().min(0).max(1)).optional(),
        /** Where the gradient's middle is across the node's box, 0 at its left side to 1 at its right; left out, 0.5. */
        centerX: z.number().optional(),
        /** Where the gradient's middle is down the node's box, 0 at its top to 1 at its bottom; left out, 0.5. */
        centerY: z.number().optional(),
        /** How far the gradient reaches from its middle, in halves of the node's side; left out, 1 (to its edge); 0, all the last color. */
        radius: z.number().min(0).optional(),
        opacity: z.number().min(0).max(1).optional(),
    }),
]);

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
    // Inside the node against that side or in that corner, as a group's header label.
    "inside-top",
    "inside-bottom",
    "inside-left",
    "inside-right",
    "inside-top-left",
    "inside-top-right",
    "inside-bottom-left",
    "inside-bottom-right",
    "automatic",
]);

// Any http(s) host, including localhost and an IP address: a page served from a dev server or a
// local network loads its skybox from there.
const HttpUrl = z.url({
    protocol: /^https?$/,
});

// "data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
const EmbeddedBase64Image = z.string().startsWith("data:image/png;base64,");

export const ImageData = HttpUrl.or(EmbeddedBase64Image);
