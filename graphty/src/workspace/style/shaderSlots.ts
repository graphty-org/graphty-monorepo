/**
 * The shader rows of the Style tab's sections, as data and writes: which rows a section's shader
 * slot draws from what the row's layer writes, and every write a row makes (a pick from the
 * gallery, a swap, a parameter, an effect's eye, an effect written off, a removal), each one
 * undoable step on the element. What a shader covers beneath it is the element's to report
 * (`styles.agreement`, `styles.counts`); nothing here decides it.
 */

import type {
    ShaderDescriptor,
    ShaderEffects,
    ShaderKind,
    ShaderParams as Params,
    ShaderParamSets,
} from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, Encoding } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";

import type { RowContext } from "./PropertyRow";
import { type DataBinding, EVERYTHING_KEY, lineIn, writeLine } from "./row";
import { effectOffWords, MATERIAL_WORDS, SHADER_ROW_WORDS, SHADER_STEP_WORDS } from "./words";

/** What one value on a layer writes; undefined takes the channel off the layer. */
type Writes = Partial<Record<Channel, ChannelValue | undefined>>;

/**
 * Where a section's shaders live: the channel a surface or sprite is written to
 * (`<target>.shader`) or the effects map (`<target>.effects`), and where its parameters go.
 */
export interface ShaderSlot {
    /** A surface or sprite (one per layer), the Material row (a surface, Plain or Wireframe), or effects (any number). */
    readonly role: "drawn" | "material" | "effect";
    readonly channel: Channel;
    /** The map the parameters land in: `<target>.shaderParams`, or the effects map itself. */
    readonly params: Channel;
    /** The kinds of shader the section takes. */
    readonly kinds: readonly ShaderKind[];
    /** The label column's word: Material, Sprite, Surface, Effect. */
    readonly word: string;
}

/**
 * The shader slot a section holds, from its kinds: an effect section's effects map, Rendering's
 * Material row, else the section's surface or sprite.
 * @param target - nodes or edges.
 * @param kinds - the kinds the section takes.
 * @returns the slot, or undefined for a section with no shaders.
 */
export function slotOf(target: "node" | "edge", kinds: readonly ShaderKind[] | undefined): ShaderSlot | undefined {
    const [kind] = kinds ?? [];
    if (kind === undefined) {
        return undefined;
    }
    const word = SHADER_ROW_WORDS[kind];
    if (kind === "node-effect" || kind === "edge-effect") {
        const channel: Channel = `${target}.effects`;
        return { role: "effect", channel, params: channel, kinds: kinds ?? [], word };
    }
    return {
        role: kind === "node-surface" ? "material" : "drawn",
        channel: `${target}.shader`,
        params: `${target}.shaderParams`,
        kinds: kinds ?? [],
        word,
    };
}

/** One row a slot draws: a surface or sprite by id, Plain or Wireframe, or one effect entry. */
export interface ShaderEntry {
    /** The row's line key, also its focus key. */
    readonly key: string;
    /** The shader's id, or a Material choice's value (`plain`, `wireframe`). */
    readonly id: string;
    /** The catalog's entry; undefined for Plain and Wireframe and an id the catalog does not list. */
    readonly descriptor?: ShaderDescriptor;
    /** An effect written off over a layer beneath ("Aura off"). */
    readonly off?: boolean;
    /** An effect whose eye is closed. */
    readonly hidden?: boolean;
}

/**
 * A shader by id, from the catalog the element publishes.
 * @param ctx - the row.
 * @param id - the id.
 * @returns the entry, or undefined.
 */
function shaderOf(ctx: Pick<RowContext, "session">, id: string): ShaderDescriptor | undefined {
    return ctx.session.catalog.shaders().find((descriptor) => descriptor.id === id);
}

/**
 * The effects map the row writes, or an empty one.
 * @param ctx - the row.
 * @param channel - the effects channel.
 * @returns the map.
 */
function effectsOf(ctx: RowContext, channel: Channel): ShaderEffects {
    const value = lineIn(ctx, channel)?.value;
    return typeof value === "object" && value !== null ? (value as ShaderEffects) : {};
}

/**
 * The parameter sets the row writes, or none.
 * @param ctx - the row.
 * @param channel - the parameters channel.
 * @returns the sets.
 */
function paramSetsOf(ctx: RowContext, channel: Channel): ShaderParamSets {
    const value = lineIn(ctx, channel)?.value;
    return typeof value === "object" && value !== null ? (value as ShaderParamSets) : {};
}

/**
 * The rows a slot draws, from what the row writes.
 * @param ctx - the row.
 * @param slot - the slot.
 * @returns the rows, in the order the layer writes them.
 */
export function shaderEntries(ctx: RowContext, slot: ShaderSlot): ShaderEntry[] {
    if (slot.role === "effect") {
        return Object.entries(effectsOf(ctx, slot.channel)).map(([id, value]) => ({
            key: `${slot.channel}:${id}`,
            id,
            descriptor: shaderOf(ctx, id),
            off: value === false,
            hidden: typeof value === "object" && value.visible === false,
        }));
    }
    const value = lineIn(ctx, slot.channel)?.value;
    const descriptor = typeof value === "string" ? shaderOf(ctx, value) : undefined;
    if (descriptor !== undefined && slot.kinds.includes(descriptor.kind)) {
        return [{ key: `${slot.channel}:${descriptor.id}`, id: descriptor.id, descriptor }];
    }
    if (slot.role !== "material") {
        return [];
    }
    const wireframe = lineIn(ctx, "node.wireframe")?.value;
    if (wireframe === true) {
        return [{ key: `${slot.channel}:wireframe`, id: "wireframe" }];
    }
    return wireframe === false || value === "none" ? [{ key: `${slot.channel}:plain`, id: "plain" }] : [];
}

/**
 * Whether the row writes anything the slot draws.
 * @param ctx - the row.
 * @param slot - the slot.
 * @returns true when it draws a row.
 */
export function slotIsSet(ctx: RowContext, slot: ShaderSlot): boolean {
    return shaderEntries(ctx, slot).length > 0;
}

/**
 * The layer a row's shader writes go to: its topmost unlocked layer (on the Everything row, the
 * one with the Everything selector). None for several rows edited together, or a row with no
 * layer yet.
 * @param ctx - the row.
 * @returns the layer, or undefined.
 */
export function ownLayer(ctx: RowContext): Layer | undefined {
    if (ctx.many !== undefined) {
        return undefined;
    }
    const everything = ctx.fresh?.selector.match === "everything";
    const home = JSON.stringify(ctx.fresh?.selector);
    return [...ctx.layers]
        .reverse()
        .find((layer) => !layer.locked && (!everything || JSON.stringify(layer.selector) === home));
}

/**
 * Writes several channels of the row's own layer as one undoable step: the layer the row writes,
 * else (a row not written yet) its first layer. Encode keys `drop` names go in the same step.
 * @param ctx - the row.
 * @param writes - the values, undefined to take a channel off.
 * @param drop - the encode keys to take off with them.
 * @param words - the step's name, for Undo and Redo.
 * @returns when it is written.
 */
async function writeRow(
    ctx: RowContext,
    writes: Writes,
    drop: (key: string) => boolean = () => false,
    words?: string,
): Promise<void> {
    // Named, so Undo reads "Undid changing Reticle spin"; several rows name each write their own way.
    if (words !== undefined && ctx.many === undefined) {
        await ctx.session.transaction(words, (tx) =>
            writeRowNow({ ...ctx, session: tx as GraphSession }, writes, drop),
        );
        return;
    }
    await writeRowNow(ctx, writes, drop);
}

/**
 * The write itself, with no step name of its own.
 * @param ctx - the row.
 * @param writes - the values, undefined to take a channel off.
 * @param drop - the encode keys to take off with them.
 * @returns when it is written.
 */
async function writeRowNow(ctx: RowContext, writes: Writes, drop: (key: string) => boolean): Promise<void> {
    const { session, many } = ctx;
    const entries = Object.entries(writes) as [Channel, ChannelValue | undefined][];
    if (many !== undefined) {
        // ponytail: several rows take each channel as its own write; one step per channel.
        for (const [channel, value] of entries) {
            await (value === undefined ? many.clear(channel) : many.write(channel, { value }));
        }
        return;
    }
    const own = ownLayer(ctx);
    if (own === undefined) {
        const values = entries.filter((entry): entry is [Channel, ChannelValue] => entry[1] !== undefined);
        const [first, ...rest] = values;
        if (first === undefined) {
            return;
        }
        await writeLine(session, ctx.row, ctx.side, first[0], { value: first[1] }, ctx.fresh, Object.fromEntries(rest));
        return;
    }
    // The layer's other values kept, the written ones in their place; undefined takes one off.
    const kept = Object.entries(own.set ?? {}).filter(([channel]) => !(channel in writes));
    const written = entries.filter(([, value]) => value !== undefined);
    const set = Object.fromEntries([...kept, ...written]) as Partial<Record<Channel, ChannelValue>>;
    const encode = Object.fromEntries(Object.entries(own.encode ?? {}).filter(([key]) => !drop(key))) as Encoding;
    const empty = (record: object): boolean => Object.keys(record).length === 0;
    if (empty(set) && empty(encode) && own.userData?.[EVERYTHING_KEY] === true) {
        await session.styles.remove(own.id);
        return;
    }
    await session.styles.update(
        own.id,
        { set: empty(set) ? undefined : set, encode: empty(encode) ? undefined : encode },
        { keepEmpty: true },
    );
}

/**
 * A shader as the history names it: its catalog name, Plain or Wireframe.
 * @param session - the session.
 * @param id - the shader.
 * @returns its name.
 */
function nameOf(session: GraphSession, id: string): string {
    if (id === "plain" || id === "wireframe") {
        return MATERIAL_WORDS[id];
    }
    return session.catalog.shaders().find((each) => each.id === id)?.plainName ?? SHADER_STEP_WORDS.unknown;
}

/**
 * The parameter sets without one shader's.
 * @param sets - the sets.
 * @param id - the shader whose set goes.
 * @returns the rest, or undefined when none is left.
 */
function withoutSet(sets: ShaderParamSets, id: string | undefined): ShaderParamSets | undefined {
    const rest = Object.fromEntries(Object.entries(sets).filter(([key]) => key !== id));
    return Object.keys(rest).length === 0 ? undefined : rest;
}

/**
 * Whether an encode key binds a parameter of one shader in one map.
 * @param channel - the map channel.
 * @param id - the shader.
 * @returns the test.
 */
function bindsOf(channel: Channel, id: string | undefined): (key: string) => boolean {
    return (key) => id !== undefined && key.startsWith(`${channel}.${id}.`);
}

/** The row whose settings open when it is next drawn: a pick from the gallery opens its new row's. */
let settingsNext: string | null = null;

/**
 * Asks a row's settings to open when it is next drawn.
 * @param key - the row's key (`<channel>:<shader id>`).
 */
export function openSettingsNext(key: string): void {
    settingsNext = key;
}

/**
 * Whether a row's settings are the ones asked to open, taking the ask.
 * @param key - the row's key.
 * @returns true once, for the row asked.
 */
export function takeSettingsNext(key: string): boolean {
    if (settingsNext !== key) {
        return false;
    }
    settingsNext = null;
    return true;
}

/**
 * What a pick from a slot's gallery writes, as one step: a surface or sprite in place of the one
 * the row draws (its parameter set and bindings going with it), Plain or Wireframe, or an effect
 * added (or in place of one, on a swap). A pick over a layer beneath that draws a surface or a
 * sprite writes `"none"` for Plain and Wireframe, which covers it. Its row's settings open next.
 * @param ctx - the row.
 * @param slot - the slot.
 * @param id - the picked id, or Plain's or Wireframe's value.
 * @param was - the row's id it replaces, on a swap.
 * @param params - parameter values to write with it (a pasted shader that equals a known one).
 * @returns when it is written.
 */
export async function pickShader(
    ctx: RowContext,
    slot: ShaderSlot,
    id: string,
    was?: string,
    params: Params = {},
): Promise<void> {
    const given = Object.keys(params).length > 0;
    if (slot.role === "effect") {
        const kept = Object.entries(effectsOf(ctx, slot.channel)).filter(([key]) => key !== was);
        const value = given ? params : (Object.fromEntries(kept)[id] ?? true);
        const map: ShaderEffects = { ...Object.fromEntries(kept), [id]: value };
        settingsNext = `${slot.channel}:${id}`;
        await writeRow(
            ctx,
            { [slot.channel]: map },
            bindsOf(slot.params, was === id ? undefined : was),
            pickWords(ctx, id, was),
        );
        return;
    }
    const sets = paramSetsOf(ctx, slot.params);
    const drawn = lineIn(ctx, slot.channel)?.value;
    const prev = typeof drawn === "string" && drawn !== id ? drawn : undefined;
    const rest = withoutSet(sets, prev);
    const writes: Writes = { [slot.params]: given ? { ...rest, [id]: params } : rest };
    if (slot.role === "material" && (id === "plain" || id === "wireframe")) {
        const beneath = ctx.beneath(slot.channel).value;
        const covers = typeof beneath === "string" && beneath !== "none";
        writes[slot.channel] = covers ? "none" : undefined;
        writes["node.wireframe"] = id === "wireframe";
    } else {
        writes[slot.channel] = id;
        if (slot.role === "material") {
            writes["node.wireframe"] = undefined;
        }
        settingsNext = `${slot.channel}:${id}`;
    }
    await writeRow(ctx, writes, bindsOf(slot.params, prev), pickWords(ctx, id, was ?? prev));
}

/**
 * What Undo calls a pick: adding the shader, or changing the one it replaces to it.
 * @param ctx - the row.
 * @param id - the picked id.
 * @param was - the id it replaces.
 * @returns the words.
 */
function pickWords(ctx: RowContext, id: string, was: string | undefined): string {
    const name = nameOf(ctx.session, id);
    return was === undefined || was === id
        ? SHADER_STEP_WORDS.add(name)
        : SHADER_STEP_WORDS.swap(nameOf(ctx.session, was), name);
}

/**
 * Takes a row away, with its parameters and bindings, as one step.
 * @param ctx - the row.
 * @param slot - the slot.
 * @param entry - the row.
 * @returns when it is written.
 */
export async function removeShader(ctx: RowContext, slot: ShaderSlot, entry: ShaderEntry): Promise<void> {
    if (slot.role === "effect") {
        const map = Object.fromEntries(Object.entries(effectsOf(ctx, slot.channel)).filter(([id]) => id !== entry.id));
        await writeRow(
            ctx,
            { [slot.channel]: Object.keys(map).length === 0 ? undefined : map },
            bindsOf(slot.params, entry.id),
            SHADER_STEP_WORDS.remove(nameOf(ctx.session, entry.id)),
        );
        return;
    }
    const writes: Writes = {
        [slot.channel]: undefined,
        [slot.params]: withoutSet(paramSetsOf(ctx, slot.params), entry.id),
    };
    if (slot.role === "material") {
        writes["node.wireframe"] = undefined;
    }
    await writeRow(
        ctx,
        writes,
        bindsOf(slot.params, entry.id),
        SHADER_STEP_WORDS.remove(nameOf(ctx.session, entry.id)),
    );
}

/**
 * The parameters a row's shader is drawn with on this layer.
 * @param ctx - the row.
 * @param slot - the slot.
 * @param id - the shader.
 * @returns its values.
 */
export function paramsOf(ctx: RowContext, slot: ShaderSlot, id: string): Params {
    if (slot.role === "effect") {
        const value = effectsOf(ctx, slot.channel)[id];
        if (typeof value !== "object") {
            return {};
        }
        return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "visible"));
    }
    return paramSetsOf(ctx, slot.params)[id] ?? {};
}

/**
 * Writes one parameter of a row's shader; undefined clears it back to its default.
 * @param ctx - the row.
 * @param slot - the slot.
 * @param id - the shader.
 * @param name - the parameter.
 * @param value - its value.
 * @returns when it is written.
 */
export async function writeParam(
    ctx: RowContext,
    slot: ShaderSlot,
    id: string,
    name: string,
    value: Params[string] | undefined,
): Promise<void> {
    const apply = (params: Params): Params => {
        const rest = Object.fromEntries(Object.entries(params).filter(([key]) => key !== name));
        return value === undefined ? rest : { ...rest, [name]: value };
    };
    const words = SHADER_STEP_WORDS.param(nameOf(ctx.session, id), paramName(ctx.session, id, name));
    if (slot.role === "effect") {
        const map = effectsOf(ctx, slot.channel);
        const was = map[id];
        const next = apply(typeof was === "object" ? was : {});
        await writeRow(
            ctx,
            { [slot.channel]: { ...map, [id]: Object.keys(next).length === 0 ? true : next } },
            undefined,
            words,
        );
        return;
    }
    const sets = paramSetsOf(ctx, slot.params);
    const next = apply(sets[id] ?? {});
    const rest = withoutSet(sets, id) ?? {};
    await writeRow(
        ctx,
        { [slot.params]: Object.keys(next).length === 0 ? withoutSet(sets, id) : { ...rest, [id]: next } },
        undefined,
        words,
    );
}

/**
 * A parameter as the history names it: its catalog name.
 * @param session - the session.
 * @param id - the shader.
 * @param name - the parameter's id.
 * @returns its name.
 */
function paramName(session: GraphSession, id: string, name: string): string {
    const shader = session.catalog.shaders().find((each) => each.id === id);
    return shader?.params.find((param) => param.name === name)?.plainName ?? name;
}

/**
 * Opens or closes an effect's eye: closed keeps the entry and its parameters and draws nothing.
 * @param ctx - the row.
 * @param slot - the slot.
 * @param id - the effect.
 * @param shown - whether it draws.
 * @returns when it is written.
 */
export async function writeShown(ctx: RowContext, slot: ShaderSlot, id: string, shown: boolean): Promise<void> {
    const map = effectsOf(ctx, slot.channel);
    const was = map[id];
    const rest = Object.fromEntries(
        Object.entries(typeof was === "object" ? was : {}).filter(([key]) => key !== "visible"),
    );
    const params: Params = shown ? rest : { ...rest, visible: false };
    await writeRow(
        ctx,
        { [slot.channel]: { ...map, [id]: Object.keys(params).length === 0 ? true : params } },
        undefined,
        SHADER_STEP_WORDS.shown(nameOf(ctx.session, id), shown),
    );
}

/**
 * The parameters of a row's shader the row binds to data, by parameter id.
 * @param ctx - the row.
 * @param slot - the slot.
 * @param id - the shader.
 * @returns the bindings.
 */
export function bindingsOf(ctx: RowContext, slot: ShaderSlot, id: string): Record<string, DataBinding> {
    const prefix = `${slot.params}.${id}.`;
    const found: Record<string, DataBinding> = {};
    for (const layer of ctx.layers) {
        for (const [key, binding] of Object.entries(layer.encode ?? {})) {
            if (key.startsWith(prefix) && binding !== undefined && "by" in binding) {
                found[key.slice(prefix.length)] = binding;
            }
        }
    }
    return found;
}

/** An effect a row was copied with, for Paste on another layer's Effects. */
let copied: { readonly kinds: readonly ShaderKind[]; readonly id: string; readonly params: Params } | null = null;

/**
 * What a slot adds to its section's "+": the gallery (opened by the section) for effects and the
 * Material row, "<effect> off" for each effect a layer beneath adds and the row does not write,
 * and Paste when a shader of the slot's kinds was copied. A sprite or an edge surface is picked in
 * its property's picker instead (Shape, Pattern: design 6.1), so its slot adds no gallery.
 * @param ctx - the row.
 * @param slot - the slot.
 * @returns the items, keyed `shader:gallery`, `shader:off:<id>` and `shader:paste`.
 */
export function slotAddOptions(ctx: RowContext, slot: ShaderSlot): { key: string; label: string }[] {
    const gallery =
        slot.role === "effect" || (slot.role === "material" && !slotIsSet(ctx, slot))
            ? [{ key: "shader:gallery", label: `${slot.word}...` }]
            : [];
    const paste =
        canPaste(slot) && copied !== null
            ? [{ key: "shader:paste", label: `Paste ${shaderOf(ctx, copied.id)?.plainName ?? copied.id}` }]
            : [];
    if (slot.role !== "effect") {
        return [...gallery, ...paste];
    }
    const own = effectsOf(ctx, slot.channel);
    const beneath = ctx.beneath(slot.channel).value;
    const offs = Object.entries(typeof beneath === "object" && beneath !== null ? (beneath as ShaderEffects) : {})
        .filter(([id, value]) => value !== false && own[id] === undefined)
        .map(([id]) => ({ key: `shader:off:${id}`, label: effectOffWords(shaderOf(ctx, id)?.plainName ?? id) }));
    return [...gallery, ...offs, ...paste];
}

/**
 * Does what a slot's "+" item asked, other than opening the gallery: writes an effect off, or
 * pastes the copied effect.
 * @param ctx - the row.
 * @param slot - the slot.
 * @param key - the item's key.
 * @returns when it is written.
 */
export async function slotAdd(ctx: RowContext, slot: ShaderSlot, key: string): Promise<void> {
    const map = effectsOf(ctx, slot.channel);
    if (key.startsWith("shader:off:")) {
        await writeRow(ctx, { [slot.channel]: { ...map, [key.slice("shader:off:".length)]: false } });
        return;
    }
    if (key === "shader:paste" && copied !== null) {
        const { id, params } = copied;
        if (slot.role !== "effect") {
            // A surface or sprite takes the place of the one the row draws, in one step.
            await pickShader(ctx, slot, id, shaderEntries(ctx, slot)[0]?.id, params);
            return;
        }
        await writeRow(ctx, { [slot.channel]: { ...map, [id]: Object.keys(params).length === 0 ? true : params } });
    }
}

/**
 * Copies a row's shader and its parameters, for Paste on a section that takes its kind.
 * @param ctx - the row.
 * @param slot - the slot.
 * @param id - the shader.
 */
export function copyShader(ctx: RowContext, slot: ShaderSlot, id: string): void {
    copied = { kinds: slot.kinds, id, params: paramsOf(ctx, slot, id) };
}

/**
 * Whether a slot can paste what was copied: a shader of a kind the slot takes. An effect joins the
 * row's effects; a surface or sprite replaces the row's.
 * @param slot - the slot.
 * @returns true when Paste is offered.
 */
export function canPaste(slot: ShaderSlot): boolean {
    return copied !== null && copied.kinds.some((kind) => slot.kinds.includes(kind));
}

/** The value a property picker's shader choice carries, so it never meets a shape's or pattern's. */
export const SHADER_CHOICE = "shader:";

/**
 * The slot whose shaders join a property's own picker (design 6.1): the sprites after the shapes
 * in Shape, the edge surfaces after the patterns in Pattern.
 * @param channel - the property.
 * @returns the slot, or undefined for a property whose picker lists no shaders.
 */
export function pickerSlot(channel: Channel): ShaderSlot | undefined {
    if (channel === "node.shape") {
        return slotOf("node", ["node-sprite"]);
    }
    return channel === "edge.style" ? slotOf("edge", ["edge-surface"]) : undefined;
}

/** One shader choice in a property's picker. */
export interface PickerChoice {
    readonly value: string;
    readonly label: string;
    readonly picture?: string;
    /** It cannot be picked: the row's layer draws a surface, which the sprite would replace. */
    readonly disabled?: boolean;
}

/**
 * The shader choices a property's picker lists after its own: the catalog's shaders of the slot's
 * kinds that can be drawn here. A sprite is disabled while the row's layer draws a surface, since
 * both are the one `node.shader`.
 * @param ctx - the row.
 * @param slot - the picker's slot.
 * @returns the choices, valued `shader:<id>`.
 */
export function pickerChoices(ctx: RowContext, slot: ShaderSlot): PickerChoice[] {
    const surface = slot.kinds.includes("node-sprite") && surfaceOn(ctx) !== undefined;
    return ctx.session.catalog
        .shaders()
        .filter(
            (descriptor) => slot.kinds.includes(descriptor.kind) && ctx.session.shaders.availability(descriptor.id).ok,
        )
        .map((descriptor) => ({
            value: `${SHADER_CHOICE}${descriptor.id}`,
            label: descriptor.plainName,
            picture: descriptor.thumbnail,
            disabled: surface,
        }));
}

/**
 * The surface the row's layer draws (its Material row), if any.
 * @param ctx - the row.
 * @returns the surface, or undefined.
 */
function surfaceOn(ctx: RowContext): ShaderDescriptor | undefined {
    const slot = slotOf("node", ["node-surface"]);
    return slot === undefined
        ? undefined
        : shaderEntries(ctx, slot).find((entry) => entry.descriptor !== undefined)?.descriptor;
}

/**
 * The sprite the row's layer draws (its Shape section's sprite row), if any: while it is set, the
 * Material row's "+" adds nothing, since both are the one `node.shader`.
 * @param ctx - the row.
 * @returns the sprite, or undefined.
 */
export function spriteOn(ctx: RowContext): ShaderDescriptor | undefined {
    const slot = slotOf("node", ["node-sprite"]);
    return slot === undefined ? undefined : shaderEntries(ctx, slot)[0]?.descriptor;
}

/**
 * Stops one parameter varying by data: takes its binding off the layer, one step.
 * @param ctx - the row.
 * @param slot - the slot.
 * @param id - the shader.
 * @param param - the parameter.
 * @returns when it is written.
 */
export function unbindParam(ctx: RowContext, slot: ShaderSlot, id: string, param: string): Promise<void> {
    const key = `${slot.params}.${id}.${param}`;
    return writeRow(
        ctx,
        {},
        (each) => each === key,
        SHADER_STEP_WORDS.unbind(nameOf(ctx.session, id), paramName(ctx.session, id, param)),
    );
}

/**
 * Puts a shader's text on the clipboard. The text is handed over as a promise, so Safari keeps the
 * click's permission while the element reads it.
 * @param session - the element's session.
 * @param id - the shader.
 * @param params - the values the row sets, which the copy carries as its defaults.
 * @returns when it is copied.
 */
export async function copyShaderText(session: GraphSession, id: string, params: Params = {}): Promise<void> {
    const text = session.shaders.source(id, { params });
    if (typeof ClipboardItem !== "undefined" && typeof navigator.clipboard.write === "function") {
        const blob = text.then((each) => new Blob([each], { type: "text/plain" }));
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
        return;
    }
    await navigator.clipboard.writeText(await text);
}
