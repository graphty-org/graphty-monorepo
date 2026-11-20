/**
 * Style panel v2's Switch to (design/ui/style-panel-v2/design.md, section 5): which thing is a
 * style family, its members as the strip lists them, and the switch itself. Which member a layer
 * draws, what it holds, and the switch are graphty-element's (`session.styles.familyMember`,
 * `familyValues`, `switchFamily`); the app adds only which thing shows which family, the members'
 * order on the strip, the values a new member starts with, and the values a reader left behind,
 * held as UI state while the same row stays selected so switching back brings them back
 * (section 5, point 2).
 */

import {
    type Channel,
    type ShaderUse,
    STYLE_FAMILIES,
    type StyleFamilyDescriptor,
    type StyleFamilyId,
    writeChannelList,
} from "@graphty/graphty-element/catalog";
import type { GraphSession, Layer, StaticStyle, StyleFamilyValues } from "@graphty/graphty-element/session";

import { cosmographOn, nodeModelsOn } from "../../features";
import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { lineIn, needsFor, startFor, writeIn } from "../row";
import { placeOf, type ShaderEntry } from "../shaderSlots";
import { experimentChannelsOff } from "../words";

/** The family each thing's row draws, by kind and thing id. */
const THING_FAMILIES: Readonly<Record<"node" | "edge", Readonly<Record<string, StyleFamilyId>>>> = {
    node: { shape: "node.shape", fill: "node.fill" },
    edge: { line: "edge.line" },
};

/** What a member needs picked before it can be drawn: a model, a picture, a shader for the shapes' place. */
export type MemberPick = "model" | "picture" | "shader";

/** One member as the strip lists it. */
export interface MemberChoice {
    /** Its key on the strip: the member's id, or `replace:<shader>` for a shader drawn in the shape's place. */
    readonly key: string;
    readonly name: string;
    /** The channels it owns. */
    readonly owns: readonly Channel[];
    /** Another member's channels it keeps through a switch to it. */
    readonly keeps: readonly Channel[];
    /** The shader it draws in the shape's place. */
    readonly shader?: string;
    /** Turned off by an experiment the element has off: listed, never hidden, but not chosen. */
    readonly disabled: boolean;
    /** What must be picked to switch to it with no values held. */
    readonly pick?: MemberPick;
}

/**
 * The family a thing's row draws.
 * @param side - nodes or edges.
 * @param thing - the thing's id.
 * @returns the element's family, or undefined for a thing that is not one.
 */
export function familyOf(side: "node" | "edge", thing: string): StyleFamilyDescriptor | undefined {
    const id = THING_FAMILIES[side][thing] as StyleFamilyId | undefined;
    return id === undefined ? undefined : STYLE_FAMILIES.find((family) => family.id === id);
}

/**
 * The catalog shader a use names: a project copy's original, else its own id.
 * @param ctx - the row.
 * @param use - the use.
 * @returns the id.
 */
function catalogIdOf(ctx: RowContext, use: ShaderUse): string {
    return ctx.session.shaders.describe(use.shader)?.copyOf ?? use.shader;
}

/**
 * Whether a use draws in the shape's place.
 * @param ctx - the row.
 * @param use - the use.
 * @returns true for a `replace` use.
 */
export function replaces(ctx: RowContext, use: ShaderUse): boolean {
    return placeOf({ use, descriptor: ctx.session.shaders.describe(use.shader) }) === "replace";
}

/**
 * The shader the row draws in its shapes' place, if any.
 * @param ctx - the row.
 * @returns the use.
 */
export function replaceUse(ctx: RowContext): ShaderUse | undefined {
    if (ctx.side !== "node") {
        return undefined;
    }
    const value = lineIn(ctx, "node.shaders")?.value;
    return Array.isArray(value) ? (value as readonly ShaderUse[]).find((use) => replaces(ctx, use)) : undefined;
}

/**
 * A family's members as the strip lists them, every one, those an experiment has off disabled.
 * @param ctx - the row.
 * @param family - the family.
 * @returns the members, in the element's order.
 */
export function membersOf(ctx: RowContext, family: StyleFamilyDescriptor): readonly MemberChoice[] {
    const off = experimentChannelsOff({ cosmograph: cosmographOn(ctx.session), nodeModels: nodeModelsOn(ctx.session) });
    return family.members.flatMap((member): MemberChoice[] => {
        const owns = member.owns as readonly Channel[];
        const keeps = (member.keeps ?? []) as readonly Channel[];
        if (member.place === "replace") {
            return ctx.session.catalog
                .shaders()
                .filter((shader) => shader.target === "node" && shader.place === "replace")
                .map((shader) => ({
                    key: `replace:${shader.id}`,
                    name: shader.plainName,
                    owns,
                    keeps,
                    shader: shader.id,
                    disabled: false,
                    pick: "shader" as const,
                }));
        }
        let pick: MemberPick | undefined;
        if (owns.includes("node.model")) {
            pick = "model";
        } else if (owns.includes("node.texture")) {
            pick = "picture";
        }
        return [
            {
                key: member.id,
                name: member.plainName,
                owns,
                keeps,
                disabled: owns.some((channel) => off.has(channel)),
                pick,
            },
        ];
    });
}

/**
 * The member's id in graphty-element's family: a shader drawn in the shape's place is the
 * family's `replace` member, whichever shader it is.
 * @param member - the member as the strip lists it.
 * @returns the element's member id.
 */
function memberId(member: MemberChoice): string {
    return member.shader === undefined ? member.key : "replace";
}

/**
 * The layer a switch writes: the unlocked layer that holds something of the family's member drawn
 * there, else the row's first unlocked layer.
 * @param ctx - the row.
 * @param family - the family.
 * @returns the layer, or undefined for a row with none yet.
 */
function layerOf(ctx: RowContext, family: StyleFamilyDescriptor): Layer | undefined {
    const layers = ctx.layers.filter((layer) => !layer.locked);
    return layers.find((layer) => holdsAny(ctx.session.styles.familyValues(layer.id, family.id))) ?? layers[0];
}

/**
 * The member the row draws now, as graphty-element says its layer draws it.
 * @param ctx - the row.
 * @param family - the family.
 * @param members - the family's members as the strip lists them.
 * @returns its key.
 */
export function currentMember(
    ctx: RowContext,
    family: StyleFamilyDescriptor,
    members: readonly MemberChoice[],
): string {
    const layer = layerOf(ctx, family);
    const id = layer === undefined ? undefined : ctx.session.styles.familyMember(layer.id, family.id);
    const use = id === "replace" ? replaceUse(ctx) : undefined;
    if (use !== undefined) {
        return `replace:${catalogIdOf(ctx, use)}`;
    }
    const plain = members.filter((member) => member.shader === undefined);
    return (plain.find((member) => member.key === id) ?? plain[0]).key;
}

/**
 * The values left members held, while one row stays selected (design 5, point 2): reader UI state,
 * per session so another project never gets them, keyed by layer, family and member. A switch on
 * another row starts it again.
 */
const held = new WeakMap<GraphSession, { row: string; values: Map<string, StyleFamilyValues> }>();

/**
 * The held values of the row a switch is on, starting them again for another row.
 * @param ctx - the row.
 * @returns the map.
 */
function heldFor(ctx: RowContext): Map<string, StyleFamilyValues> {
    const row = `${ctx.side}:${ctx.row.join(",")}`;
    const now = held.get(ctx.session);
    if (now?.row === row) {
        return now.values;
    }
    const values = new Map<string, StyleFamilyValues>();
    held.set(ctx.session, { row, values });
    return values;
}

/**
 * Whether held values hold anything.
 * @param values - the values.
 * @returns true when they set, bind or use something.
 */
function holdsAny(values: StyleFamilyValues | undefined): values is StyleFamilyValues {
    return (
        values !== undefined &&
        (Object.keys(values.set).length > 0 || Object.keys(values.encode).length > 0 || values.uses.length > 0)
    );
}

/**
 * The value a member starts with when nothing of it is held (design 5.1), for the members that
 * need no pick.
 * @param ctx - the row.
 * @param to - the member.
 * @param leaving - the values the member being left had.
 * @returns the writes.
 */
function startOf(ctx: RowContext, to: MemberChoice, leaving: Readonly<Record<string, unknown>>): StaticStyle {
    const [main] = to.owns;
    if (main === undefined) {
        return {};
    }
    if (main === "node.gradientColors" || main === "edge.gradientColors") {
        // Two stops: the color the thing had, else the element's own, into white.
        const colorChannel: Channel = ctx.side === "node" ? "node.color" : "edge.color";
        const had = leaving[colorChannel];
        const drawn = ctx.session.styles.defaultValue(colorChannel);
        const own = typeof drawn === "string" ? drawn : "#FFFFFF";
        const from = typeof had === "string" ? had : own;
        return { [main]: writeChannelList(main, [from, "#FFFFFF"]) };
    }
    const descriptor = shownChannel(ctx.session, ctx.side, main, false);
    return descriptor === undefined ? {} : { [main]: startFor(ctx, descriptor) };
}

/**
 * Switches a family's row from one member to another as one undo step (design 5, point 1):
 * graphty-element takes the leaving member's own lines and uses off; the app holds them for a
 * switch back, and hands the element the new member's held values, else what was picked for it,
 * else its start.
 * @param ctx - the row.
 * @param family - the family.
 * @param members - its members.
 * @param fromKey - the member drawn now.
 * @param toKey - the member to draw.
 * @param picked - what was picked for a member that needs a pick (a model, a picture).
 * @returns when it is written.
 */
export async function switchMember(
    ctx: RowContext,
    family: StyleFamilyDescriptor,
    members: readonly MemberChoice[],
    fromKey: string,
    toKey: string,
    picked?: string,
): Promise<void> {
    const from = members.find((member) => member.key === fromKey);
    const to = members.find((member) => member.key === toKey);
    if (from === undefined || to === undefined || fromKey === toKey) {
        return;
    }
    const layer = layerOf(ctx, family);
    if (layer === undefined) {
        // A row with no layer yet: its first line makes one.
        const [main] = to.owns;
        const start = picked ?? startOf(ctx, to, {})[main ?? ""];
        if (main !== undefined && start !== undefined) {
            await writeIn(ctx, main, { value: start }, needsFor(ctx, main, start));
        }
        return;
    }
    const store = heldFor(ctx);
    const keyOf = (member: MemberChoice): string => `${layer.id}|${family.id}|${member.key}`;
    const left = ctx.session.styles.familyValues(layer.id, family.id) ?? { set: {}, encode: {}, uses: [] };
    store.set(keyOf(from), left);
    // A member left with nothing of its own set starts again, so the row never empties.
    const back = store.get(keyOf(to));
    let start: Partial<StyleFamilyValues>;
    if (holdsAny(back)) {
        start = back;
    } else if (to.shader !== undefined) {
        // The shader picked for the shapes' place (a preset of it, or the member's own).
        start = { uses: [{ shader: picked ?? to.shader }] };
    } else if (picked !== undefined && to.owns[0] !== undefined) {
        start = { set: { [to.owns[0]]: picked } };
    } else {
        // A kind's start, with what graphty-element says it needs to draw (design 5.1).
        const set = startOf(ctx, to, left.set);
        const [main] = to.owns;
        start = { set: main === undefined ? set : { ...needsFor(ctx, main, set[main]), ...set } };
    }
    await ctx.session.transaction(`switching ${family.plainName.toLowerCase()} to ${to.name.toLowerCase()}`, (tx) =>
        tx.styles.switchFamily(layer.id, family.id, memberId(to), start),
    );
}

/**
 * Whether a member's values are held from an earlier switch on this row, so switching back needs no pick.
 * @param ctx - the row.
 * @param family - the family.
 * @param key - the member.
 * @returns true when they are.
 */
export function isHeld(ctx: RowContext, family: StyleFamilyDescriptor, key: string): boolean {
    const layer = layerOf(ctx, family);
    return layer !== undefined && holdsAny(heldFor(ctx).get(`${layer.id}|${family.id}|${key}`));
}

/**
 * The shaders graphty-element's Group outline family draws (Bubble, Hull), in its order.
 * @returns their catalog ids.
 */
export function groupOutlineShaders(): readonly string[] {
    const family = STYLE_FAMILIES.find((each) => each.id === "node.groupOutline");
    return (family?.members ?? []).flatMap((member) => (member.shader === undefined ? [] : [member.shader]));
}

/**
 * Whether a shader use is a group outline (design 4.1): it sits in Order and groups, not Shaders.
 * @param ctx - the row.
 * @param entry - the use.
 * @returns true for one of the Group outline family's shaders.
 */
export function isGroupOutline(ctx: RowContext, entry: ShaderEntry): boolean {
    return groupOutlineShaders().includes(ctx.session.shaders.describe(entry.use.shader)?.copyOf ?? entry.use.shader);
}

/**
 * Draws another shader in the shapes' place, the Shape row staying on its shader member (design
 * 7.1, "replace shader": the row's control is its preset), one undo step.
 * @param ctx - the row.
 * @param family - the Shape family.
 * @param shader - the shader picked.
 * @returns when it is written.
 */
export async function pickReplace(ctx: RowContext, family: StyleFamilyDescriptor, shader: string): Promise<void> {
    const layer = layerOf(ctx, family);
    if (layer === undefined) {
        return;
    }
    await ctx.session.transaction(`changing ${family.plainName.toLowerCase()}`, (tx) =>
        tx.styles.switchFamily(layer.id, family.id, "replace", { uses: [{ shader }] }),
    );
}
