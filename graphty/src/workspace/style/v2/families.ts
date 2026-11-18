/**
 * Style panel v2's Switch to (design/ui/style-panel-v2/design.md, section 5): which thing is a
 * style family, its members as the strip lists them, the member a row draws now, and the switch
 * itself. What each member owns and what stays through a switch is graphty-element's family data
 * (`STYLE_FAMILIES`); the app adds only which thing shows which family, the members' order on the
 * strip, and the values a reader left behind, held while the same row stays selected so switching
 * back brings them back (section 5, point 2).
 *
 * Temporary workaround, tracked in #8880: graphty-element has no API that says which member a
 * layer draws now, or that switches a layer from one member to another in one undo step. Until it
 * has (for example `session.styles.familyMember(layer, family)` and
 * `session.styles.switchFamily(layer, family, member)`), `currentMember`, `switchMember` and their
 * helpers do that work here from `STYLE_FAMILIES`, and every other consumer would have to repeat
 * it. They move into the element, and this file shrinks to calling it.
 */

import {
    type Channel,
    type ChannelValue,
    type ShaderUse,
    STYLE_FAMILIES,
    type StyleFamilyDescriptor,
    type StyleFamilyId,
    writeChannelList,
} from "@graphty/graphty-element/catalog";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";

import { cosmographOn, nodeModelsOn } from "../../features";
import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { lineIn, startFor, writeIn } from "../row";
import type { ShaderEntry } from "../shaderSlots";
import { experimentChannelsOff } from "../words";
import { setOn } from "./things";

/** The family each thing's row draws, by kind and thing id. */
const THING_FAMILIES: Readonly<Record<"node" | "edge", Readonly<Record<string, StyleFamilyId>>>> = {
    node: { shape: "node.shape", fill: "node.fill" },
    edge: { line: "edge.line" },
};

/** What a member needs picked before it can be drawn: a model, a picture. */
export type MemberPick = "model" | "picture";

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
function replaces(ctx: RowContext, use: ShaderUse): boolean {
    return (use.place ?? ctx.session.shaders.describe(use.shader)?.place) === "replace";
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
 * The member the row draws now: a shader in the shape's place, else the first member past the
 * family's default that the row sets a channel of, else the default.
 * @param ctx - the row.
 * @param members - the family's members.
 * @returns its key.
 */
export function currentMember(ctx: RowContext, members: readonly MemberChoice[]): string {
    const use = members.some((member) => member.shader !== undefined) ? replaceUse(ctx) : undefined;
    if (use !== undefined) {
        return `replace:${catalogIdOf(ctx, use)}`;
    }
    const [first, ...rest] = members.filter((member) => member.shader === undefined);
    const set = rest.find((member) => member.owns.some((channel) => setOn(ctx, channel)));
    return (set ?? first).key;
}

/** What a member left behind on a layer: its lines and its shader uses. */
interface Held {
    readonly set: Readonly<Record<string, unknown>>;
    readonly encode: Readonly<Record<string, unknown>>;
    readonly uses: readonly ShaderUse[];
}

/**
 * The values left members held, while one row stays selected (design 5, point 2): per session, so
 * another project never gets them, keyed by layer, family and member. A switch on another row
 * starts it again.
 */
const held = new WeakMap<GraphSession, { row: string; values: Map<string, Held> }>();

/**
 * The held values of the row a switch is on, starting them again for another row.
 * @param ctx - the row.
 * @returns the map.
 */
function heldFor(ctx: RowContext): Map<string, Held> {
    const row = `${ctx.side}:${ctx.row.join(",")}`;
    const now = held.get(ctx.session);
    if (now?.row === row) {
        return now.values;
    }
    const values = new Map<string, Held>();
    held.set(ctx.session, { row, values });
    return values;
}

/**
 * The layer a switch writes: the unlocked layer that holds the family's lines, else the row's first
 * unlocked layer.
 * @param ctx - the row.
 * @param members - the family's members.
 * @returns the layer, or undefined for a row with none yet.
 */
function layerOf(ctx: RowContext, members: readonly MemberChoice[]): Layer | undefined {
    const layers = ctx.layers.filter((layer) => !layer.locked);
    const owned = new Set<string>(members.flatMap((member) => member.owns));
    const holds = (layer: Layer): boolean =>
        Object.keys({ ...layer.set, ...layer.encode }).some((channel) => owned.has(channel)) ||
        (Array.isArray(layer.set?.["node.shaders"]) &&
            (layer.set["node.shaders"] as readonly ShaderUse[]).some((use) => replaces(ctx, use)));
    return layers.find((layer) => holds(layer)) ?? layers[0];
}

/**
 * The value a member starts with when nothing of it is held (design 5.1), for the members that
 * need no pick.
 * @param ctx - the row.
 * @param to - the member.
 * @param leaving - the values the member being left had.
 * @returns the writes.
 */
function startOf(
    ctx: RowContext,
    to: MemberChoice,
    leaving: Readonly<Record<string, unknown>>,
): Record<string, ChannelValue> {
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
 * Switches a family's row from one member to another as one undo step (design 5, point 1): takes
 * the leaving member's own lines and uses off the layer, holding them for a switch back, and
 * writes the new member's held values, else its start, else what was picked for it.
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
    const layer = layerOf(ctx, members);
    if (layer === undefined) {
        // A row with no layer yet: its first line makes one.
        const [main] = to.owns;
        const start = picked ?? startOf(ctx, to, {})[main ?? ""];
        if (main !== undefined && start !== undefined) {
            await writeIn(ctx, main, { value: start });
        }
        return;
    }
    const store = heldFor(ctx);
    const keyOf = (member: MemberChoice): string => `${layer.id}|${family.id}|${member.key}`;
    await ctx.session.transaction(
        `switching ${family.plainName.toLowerCase()} to ${to.name.toLowerCase()}`,
        async (tx) => {
            const now = tx.styles.get(layer.id);
            if (now === undefined) {
                return;
            }
            const set: Record<string, unknown> = { ...now.set };
            const encode: Record<string, unknown> = { ...now.encode };
            const uses = Array.isArray(set["node.shaders"]) ? (set["node.shaders"] as readonly ShaderUse[]) : [];
            // The leaving member's own lines, less what the new one keeps; and its shader, if it is one.
            const leaving = from.owns.filter((channel) => !to.keeps.includes(channel));
            const left: Held = {
                set: Object.fromEntries(leaving.filter((c) => set[c] !== undefined).map((c) => [c, set[c]])),
                encode: Object.fromEntries(leaving.filter((c) => encode[c] !== undefined).map((c) => [c, encode[c]])),
                uses: from.shader === undefined ? [] : uses.filter((use) => replaces(ctx, use)),
            };
            store.set(keyOf(from), left);
            for (const channel of leaving) {
                Reflect.deleteProperty(set, channel);
                Reflect.deleteProperty(encode, channel);
            }
            let kept = from.shader === undefined ? uses : uses.filter((use) => !replaces(ctx, use));
            // The new member: what it held, else what was picked, else its start.
            const stashed = store.get(keyOf(to));
            // A member left with nothing of its own set starts again, so the row never empties.
            const back =
                stashed === undefined ||
                (Object.keys(stashed.set).length === 0 &&
                    Object.keys(stashed.encode).length === 0 &&
                    stashed.uses.length === 0)
                    ? undefined
                    : stashed;
            if (back !== undefined) {
                Object.assign(set, back.set);
                Object.assign(encode, back.encode);
                kept = [...kept, ...back.uses];
            } else if (to.shader !== undefined) {
                kept = [...kept, { shader: to.shader }];
            } else if (picked !== undefined && to.owns[0] !== undefined) {
                set[to.owns[0]] = picked;
            } else {
                Object.assign(set, startOf(ctx, to, left.set));
            }
            if (kept.length > 0) {
                set["node.shaders"] = kept;
            } else {
                Reflect.deleteProperty(set, "node.shaders");
            }
            await tx.styles.update(layer.id, { set, encode } as Partial<Layer>, { keepEmpty: true });
        },
    );
}

/**
 * Whether a member's values are held from an earlier switch on this row, so switching back needs no pick.
 * @param ctx - the row.
 * @param family - the family.
 * @param members - its members.
 * @param key - the member.
 * @returns true when they are.
 */
export function isHeld(
    ctx: RowContext,
    family: StyleFamilyDescriptor,
    members: readonly MemberChoice[],
    key: string,
): boolean {
    const layer = layerOf(ctx, members);
    return layer !== undefined && heldFor(ctx).has(`${layer.id}|${family.id}|${key}`);
}

/**
 * Takes the row's shader drawn in its shapes' place off its layer, as part of a whole-thing removal.
 * @param ctx - the row.
 * @param set - the layer's `set`, changed in place.
 */
export function dropReplace(ctx: RowContext, set: Record<string, unknown>): void {
    const uses = set["node.shaders"];
    if (!Array.isArray(uses)) {
        return;
    }
    const kept = (uses as readonly ShaderUse[]).filter((use) => !replaces(ctx, use));
    if (kept.length > 0) {
        set["node.shaders"] = kept;
    } else {
        Reflect.deleteProperty(set, "node.shaders");
    }
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
