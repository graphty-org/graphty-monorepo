/**
 * @file Reading which nodes a real model painted red, through the session's style explanation.
 */

import type { GraphSession } from "../../../session";

/**
 * Whether a resolved color is red: its red part well above the other two.
 * @param value - The color as the session resolves it (a hex string, or channels).
 * @returns Whether it is red.
 */
function isRed(value: unknown): boolean {
    const color = value as { r?: number; g?: number; b?: number; hex?: string } | string | undefined;
    const hex = typeof color === "string" ? color : color?.hex;
    if (typeof hex === "string" && /^#[0-9a-f]{6}/i.test(hex)) {
        const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
        return r > 2 * g && r > 2 * b;
    }

    if (typeof color === "object" && typeof color.r === "number") {
        return color.r > 2 * (color.g ?? 0) && color.r > 2 * (color.b ?? 0);
    }

    return hex?.toLowerCase() === "red";
}

/**
 * The nodes the session paints red.
 * @param session - The session.
 * @param nodes - The graph's nodes.
 * @returns Their ids.
 */
export function redNodes(session: GraphSession, nodes: readonly { readonly id: string }[]): string[] {
    return nodes
        .map((node) => node.id)
        .filter((id) => isRed(session.styles.explain({ node: id }).merged["node.color" as never]));
}
