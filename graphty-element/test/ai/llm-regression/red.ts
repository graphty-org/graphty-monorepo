/**
 * @file Reading which nodes and edges a real model painted a given hue, through the session's
 * style explanation.
 */

import type { GraphSession } from "../../../session";

/** A primary hue a prompt asks for. */
export type Hue = "red" | "green" | "blue";

const CHANNEL_AT: Record<Hue, number> = { red: 0, green: 1, blue: 2 };

/**
 * The red, green and blue parts of a resolved color, when it has them.
 * @param value - The color as the session resolves it (a hex string, or channels).
 * @returns The three parts, or undefined for anything else.
 */
function rgbOf(value: unknown): [number, number, number] | undefined {
    const color = value as { r?: number; g?: number; b?: number; hex?: string } | string | undefined;
    const hex = typeof color === "string" ? color : color?.hex;
    if (typeof hex === "string" && /^#[0-9a-f]{6}/i.test(hex)) {
        const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
        return [r, g, b];
    }

    if (typeof color === "object" && typeof color.r === "number") {
        return [color.r, color.g ?? 0, color.b ?? 0];
    }

    return undefined;
}

/**
 * Whether a resolved color is the hue: that part well above the other two.
 * @param value - The color as the session resolves it (a hex string, or channels).
 * @param hue - The hue.
 * @returns Whether it is that hue.
 */
export function isHue(value: unknown, hue: Hue): boolean {
    const rgb = rgbOf(value);
    if (rgb === undefined) {
        return typeof value === "string" && value.toLowerCase() === hue;
    }

    const at = CHANNEL_AT[hue];
    return rgb.every((part, index) => index === at || rgb[at] > 2 * part);
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
