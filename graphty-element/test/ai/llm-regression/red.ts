/**
 * @file Reading which nodes and edges a real model painted a given hue, through the session's
 * style explanation.
 */

import Color from "colorjs.io";

import type { GraphSession } from "../../../session";

/** A primary hue a prompt asks for. */
export type Hue = "red" | "green" | "blue";

/** The hue angles, in degrees, each primary hue spans: about 30 to 45 degrees either side of it. */
const HUE_SPAN: Record<Hue, readonly [number, number][]> = {
    red: [
        [0, 30],
        [330, 360],
    ],
    green: [[75, 165]],
    blue: [[195, 260]],
};

/** The least spread between the strongest and weakest part, on 0 to 1, for a color to have a hue at all. */
const MIN_CHROMA = 0.3;

/**
 * The red, green and blue parts of a resolved color, each from 0 to 1, when it is one.
 * @param value - The color as the session resolves it: any CSS color string, or channels.
 * @returns The three parts, or undefined for anything else.
 */
function rgbOf(value: unknown): [number, number, number] | undefined {
    if (typeof value === "object" && value !== null && typeof (value as { r?: unknown }).r === "number") {
        const { r, g, b, hex } = value as { r: number; g?: number; b?: number; hex?: string };
        if (typeof hex === "string") {
            return rgbOf(hex);
        }

        // Channels are 0-255 or 0-1; either way the hue and the share of chroma come out the same.
        const scale = Math.max(r, g ?? 0, b ?? 0) > 1 ? 255 : 1;
        return [r / scale, (g ?? 0) / scale, (b ?? 0) / scale];
    }

    if (typeof value !== "string") {
        return undefined;
    }

    try {
        const [r, g, b] = new Color(value).to("srgb").coords;
        return [r ?? 0, g ?? 0, b ?? 0];
    } catch {
        // colorjs.io throws on a string it cannot parse.
        return undefined;
    }
}

/**
 * Whether a resolved color is the hue: any CSS color (a name, rgb(), hsl(), any hex) or channels,
 * read as a hue angle, with enough chroma that it is not a gray.
 * @param value - The color as the session resolves it.
 * @param hue - The hue.
 * @returns Whether it is that hue.
 */
export function isHue(value: unknown, hue: Hue): boolean {
    const rgb = rgbOf(value);
    if (rgb === undefined) {
        return false;
    }

    const [r, g, b] = rgb.map((part) => Math.min(1, Math.max(0, part)));
    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);
    if (chroma < MIN_CHROMA) {
        return false;
    }

    let angle: number;
    if (max === r) {
        angle = (((g - b) / chroma) % 6) * 60;
    } else if (max === g) {
        angle = ((b - r) / chroma + 2) * 60;
    } else {
        angle = ((r - g) / chroma + 4) * 60;
    }

    const degrees = (angle + 360) % 360;
    return HUE_SPAN[hue].some(([from, to]) => degrees >= from && degrees <= to);
}

/**
 * The nodes the session paints a hue.
 * @param session - The session.
 * @param nodes - The graph's nodes.
 * @param hue - The hue.
 * @returns Their ids.
 */
export function nodesPainted(session: GraphSession, nodes: readonly { readonly id: string }[], hue: Hue): string[] {
    return nodes
        .map((node) => node.id)
        .filter((id) => isHue(session.styles.explain({ node: id }).merged["node.color" as never], hue));
}

/**
 * The edges the session paints a hue.
 * @param session - The session.
 * @param hue - The hue.
 * @returns Their ids, in the graph's order.
 */
export function edgesPainted(session: GraphSession, hue: Hue): string[] {
    return session.data
        .edges()
        .filter((edge) => isHue(session.styles.explain({ edge: edge.id }).merged["edge.color" as never], hue))
        .map((edge) => edge.id);
}

/**
 * The nodes the session paints red.
 * @param session - The session.
 * @param nodes - The graph's nodes.
 * @returns Their ids.
 */
export function redNodes(session: GraphSession, nodes: readonly { readonly id: string }[]): string[] {
    return nodesPainted(session, nodes, "red");
}
