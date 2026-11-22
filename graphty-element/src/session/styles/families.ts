/**
 * @file Which member of a style family a layer draws, what that member holds there, and the
 * patch that switches the layer to another member (`STYLE_FAMILIES` in the catalog).
 *
 * A node's shape is a basic shape, a model or a shader drawn in its place; its fill a flat color,
 * a gradient or a picture; an edge's line a flat color, a gradient or strands. A style editor that offers
 * "switch to" asks the element which member a layer draws and hands it the member to draw; the
 * element takes the leaving member's own settings off and keeps what belongs to the thing as a
 * whole, so no editor copies channel lists or shader places of its own.
 *
 * Pure functions over a layer; `StylesApi` wraps them (`familyMember`, `familyValues`,
 * `switchFamily`). Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { StyleFamilyDescriptor, StyleFamilyMember } from "../../catalog/families";
import type { ShaderUse } from "../../catalog/shaders";
import type { Channel, Encoding, StaticStyle } from "../../catalog/types";
import { placeOfUse } from "./channels";
import type { Layer } from "./Layer";

/**
 * What one member of a style family holds on a layer: its own channels' values and bindings, and
 * its shader uses (a shader drawn in the shape's place). Also what a switch writes for the new
 * member.
 * @since 3.59.0
 */
export interface StyleFamilyValues {
    /** The member's own channels the layer sets. */
    readonly set: StaticStyle;
    /** The member's own channels the layer binds to data. */
    readonly encode: Encoding;
    /** The member's shader uses on the target's shader list. */
    readonly uses: readonly ShaderUse[];
}

/**
 * The shader list channel of a family's target.
 * @param family - The family.
 * @returns `node.shaders` or `edge.shaders`.
 */
function shadersOf(family: StyleFamilyDescriptor): "node.shaders" | "edge.shaders" {
    return family.target === "edge" ? "edge.shaders" : "node.shaders";
}

/**
 * A layer's shader uses for a family's target.
 * @param layer - The layer.
 * @param family - The family.
 * @returns The uses, in order.
 */
function usesOf(layer: Layer, family: StyleFamilyDescriptor): readonly ShaderUse[] {
    const uses = layer.set?.[shadersOf(family)];
    return Array.isArray(uses) ? (uses as readonly ShaderUse[]) : [];
}

/**
 * Whether a use is a member's: at its place, or of its shader.
 * @param member - The member.
 * @param use - The use.
 * @returns True when the use draws that member.
 */
function usesMember(member: StyleFamilyMember, use: ShaderUse): boolean {
    if (member.place !== undefined) {
        return placeOfUse(use) === member.place;
    }

    return member.shader !== undefined && use.shader === member.shader;
}

/**
 * Whether a layer sets or binds a member's own channel, or draws one of its shader uses.
 * @param layer - The layer.
 * @param family - The family.
 * @param member - The member.
 * @returns True when the layer holds something of it.
 */
function holds(layer: Layer, family: StyleFamilyDescriptor, member: StyleFamilyMember): boolean {
    const own = member.owns as readonly Channel[];
    return (
        own.some((channel) => layer.set?.[channel] !== undefined || layer.encode?.[channel] !== undefined) ||
        usesOf(layer, family).some((use) => usesMember(member, use))
    );
}

/**
 * The member a layer draws: one drawn by a shader use first, else the first member past the
 * family's default the layer holds a channel of, else the default.
 * @param layer - The layer.
 * @param family - A node or edge family.
 * @returns The member.
 */
export function memberOf(layer: Layer, family: StyleFamilyDescriptor): StyleFamilyMember {
    const [first, ...rest] = family.members;
    const byUse = family.members.find(
        (member) => (member.place !== undefined || member.shader !== undefined) && holds(layer, family, member),
    );
    return byUse ?? rest.find((member) => holds(layer, family, member)) ?? first;
}

/**
 * What a member holds on a layer.
 * @param layer - The layer.
 * @param family - The family.
 * @param member - The member.
 * @returns Its values, bindings and shader uses there.
 */
export function valuesOf(layer: Layer, family: StyleFamilyDescriptor, member: StyleFamilyMember): StyleFamilyValues {
    const own = member.owns as readonly Channel[];
    const set: StaticStyle = {};
    const encode: Record<string, unknown> = {};
    for (const channel of own) {
        if (layer.set?.[channel] !== undefined) {
            (set as Record<string, unknown>)[channel] = layer.set[channel];
        }

        if (layer.encode?.[channel] !== undefined) {
            encode[channel] = layer.encode[channel];
        }
    }

    return {
        set,
        encode: encode as Encoding,
        uses: usesOf(layer, family).filter((use) => usesMember(member, use)),
    };
}

/**
 * The `set` and `encode` that switch a layer to another member: the member drawn now loses its own
 * channels (less those the new member keeps) and its shader uses, and the new member's values are
 * written; everything else on the layer stays.
 * @param layer - The layer.
 * @param family - The family.
 * @param to - The member to draw.
 * @param start - What to write for it.
 * @returns The layer's new `set` and `encode`.
 */
export function switchedPatch(
    layer: Layer,
    family: StyleFamilyDescriptor,
    to: StyleFamilyMember,
    start: Partial<StyleFamilyValues> = {},
): { readonly set: StaticStyle; readonly encode: Encoding } {
    const from = memberOf(layer, family);
    const keeps = new Set<string>(to.keeps ?? []);
    const set: Record<string, unknown> = { ...layer.set };
    const encode: Record<string, unknown> = { ...layer.encode };
    for (const channel of from.owns) {
        if (!keeps.has(channel)) {
            Reflect.deleteProperty(set, channel);
            Reflect.deleteProperty(encode, channel);
        }
    }

    Object.assign(set, start.set);
    Object.assign(encode, start.encode);
    const uses = [...usesOf(layer, family).filter((use) => !usesMember(from, use)), ...(start.uses ?? [])];
    const list = shadersOf(family);
    if (uses.length > 0) {
        set[list] = uses;
    } else {
        Reflect.deleteProperty(set, list);
    }

    return { set: set, encode: encode as Encoding };
}
