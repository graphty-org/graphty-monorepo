/**
 * The Shaders section's rows, as data and writes (decisions-v2, section 2.1): the rows are the
 * uses on the row's layer's `node.shaders` or `edge.shaders` list, in its order, and every write a
 * row makes (an add from the gallery, a place, a parameter, a move, a removal) is one undoable step
 * on the element. On several layers edited together a write reaches each layer's own list in the
 * same step. What a shader covers beneath it is the element's to report (`styles.agreement`,
 * `styles.counts`); nothing here decides it.
 */

import type {
    ShaderDescriptor,
    ShaderParams as Params,
    ShaderParamValue,
    ShaderPlace,
    ShaderUse,
} from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, Encoding } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";

import type { RowContext } from "./PropertyRow";
import { type DataBinding, EVERYTHING_KEY, lineIn, writeLine } from "./row";
import { focusLineNext } from "./useFocusLine";
import { SHADER_STEP_WORDS } from "./words";

/** What one value on a layer writes; undefined takes the channel off the layer. */
type Writes = Partial<Record<Channel, ChannelValue | undefined>>;

/** One row of the Shaders section: one use on the layer's list. */
export interface ShaderEntry {
    /** The row's key, also its focus key: `<channel>:<index>`. */
    readonly key: string;
    /** Its place in the layer's list. */
    readonly index: number;
    readonly use: ShaderUse;
    /** The catalog's entry; undefined for an id the catalog does not list. */
    readonly descriptor?: ShaderDescriptor;
}

/**
 * The shader list channel of a tab.
 * @param side - nodes or edges.
 * @returns `node.shaders` or `edge.shaders`.
 */
export function shadersChannel(side: "node" | "edge"): Channel {
    return side === "node" ? "node.shaders" : "edge.shaders";
}

/**
 * A layer's own shader list on a tab.
 * @param layer - the layer.
 * @param side - nodes or edges.
 * @returns its uses, or none.
 */
function usesOf(layer: Layer | undefined, side: "node" | "edge"): readonly ShaderUse[] {
    const value = layer?.set?.[shadersChannel(side)];
    return Array.isArray(value) ? (value as readonly ShaderUse[]) : [];
}

/**
 * A shader by id, from the catalog the element publishes.
 * @param session - the element's session.
 * @param id - the id.
 * @returns the entry, or undefined.
 */
export function shaderOf(session: GraphSession, id: string): ShaderDescriptor | undefined {
    return session.catalog.shaders().find((descriptor) => descriptor.id === id);
}

/**
 * Where a use draws: its own place, else its shader's.
 * @param entry - the row.
 * @returns the place.
 */
export function placeOf(entry: Pick<ShaderEntry, "use" | "descriptor">): ShaderPlace | undefined {
    return entry.use.place ?? entry.descriptor?.place;
}

/**
 * The rows the Shaders section draws, from the list the row writes, in its order.
 * @param ctx - the row.
 * @returns the rows.
 */
export function shaderEntries(ctx: RowContext): ShaderEntry[] {
    const channel = shadersChannel(ctx.side);
    const value = lineIn(ctx, channel)?.value;
    const uses = Array.isArray(value) ? (value as readonly ShaderUse[]) : [];
    return uses.map((use, index) => ({
        key: `${channel}:${String(index)}`,
        index,
        use,
        descriptor: shaderOf(ctx.session, use.shader),
    }));
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
export async function writeRow(
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
 * The layers a list write reaches: every unlocked layer of several rows edited together, else the
 * row's own layer.
 * @param ctx - the row.
 * @returns the layers; none for a row with no layer yet.
 */
function targetsOf(ctx: RowContext): Layer[] {
    if (ctx.many !== undefined) {
        return ctx.layers.filter((layer) => !layer.locked);
    }
    const own = ownLayer(ctx);
    return own === undefined ? [] : [own];
}

/**
 * Changes the shader list of every layer a write reaches, as one undo step: each layer's own list
 * edited by `edit`. A row with no layer yet gets one, as its first edit of any property would.
 * @param ctx - the row.
 * @param words - the step's name.
 * @param edit - the list each layer holds after, from its own.
 * @param drop - the encode keys (parameter bindings) to take off with it.
 * @returns when it is written.
 */
async function editUses(
    ctx: RowContext,
    words: string,
    edit: (uses: readonly ShaderUse[]) => readonly ShaderUse[],
    drop?: (key: string) => boolean,
): Promise<void> {
    const channel = shadersChannel(ctx.side);
    const targets = targetsOf(ctx);
    const valueOf = (uses: readonly ShaderUse[]): ChannelValue | undefined => (uses.length === 0 ? undefined : uses);
    if (ctx.many === undefined || targets.length === 0) {
        const own = targets[0];
        await writeRow(ctx, { [channel]: valueOf(edit(usesOf(own, ctx.side))) }, drop, words);
        return;
    }
    const patches = targets.map((layer) => {
        const kept = Object.entries(layer.set ?? {}).filter(([key]) => key !== channel);
        const next = valueOf(edit(usesOf(layer, ctx.side)));
        const set = Object.fromEntries(next === undefined ? kept : [...kept, [channel, next]]) as Partial<
            Record<Channel, ChannelValue>
        >;
        return { id: layer.id, patch: { set } };
    });
    await ctx.session.transaction(words, (tx) => tx.styles.updateMany(patches, { keepEmpty: true }));
}

/**
 * A shader as the history names it: its catalog name.
 * @param session - the session.
 * @param id - the shader.
 * @returns its name.
 */
function nameOf(session: GraphSession, id: string): string {
    return shaderOf(session, id)?.plainName ?? SHADER_STEP_WORDS.unknown;
}

/**
 * Whether an encode key binds a parameter of one shader on a list channel.
 * @param channel - the list channel.
 * @param id - the shader.
 * @returns the test.
 */
function bindsOf(channel: Channel, id: string): (key: string) => boolean {
    return (key) => key.startsWith(`${channel}.${id}.`);
}

/** The row whose handle takes focus when it is next drawn: a row just moved, so focus moves with it. */
let focusNext: string | null = null;

/**
 * Whether a row is the one a pick asked focus for, taking the ask.
 * @param key - the row's key.
 * @returns true once, for the row asked.
 */
export function takeFocusNext(key: string): boolean {
    if (focusNext !== key) {
        return false;
    }
    focusNext = null;
    return true;
}

/**
 * Adds a shader at its own place to the end of the list of every layer a
 * write reaches, as one step. The new row takes focus when it is drawn.
 * @param ctx - the row.
 * @param id - the shader.
 * @param params - parameter values to write with it (a pasted shader that equals a known one).
 * @returns when it is written.
 */
export async function addShader(ctx: RowContext, id: string, params: Params = {}): Promise<void> {
    const use: ShaderUse = { shader: id, ...(Object.keys(params).length === 0 ? {} : { params }) };
    const at = ctx.many === undefined ? usesOf(targetsOf(ctx)[0], ctx.side).length : shaderEntries(ctx).length;
    // The new row takes focus once it is drawn.
    focusLineNext(`${shadersChannel(ctx.side)}:${String(at)}` as Channel);
    await editUses(ctx, SHADER_STEP_WORDS.add(nameOf(ctx.session, id)), (uses) => [...uses, use]);
}

/**
 * Changes one use, on every layer a write reaches that holds that shader at that index.
 * @param ctx - the row.
 * @param entry - the row.
 * @param words - the step's name.
 * @param change - the use after, from the one before.
 * @returns when it is written.
 */
function changeUse(
    ctx: RowContext,
    entry: ShaderEntry,
    words: string,
    change: (use: ShaderUse) => ShaderUse,
): Promise<void> {
    return editUses(ctx, words, (uses) =>
        uses.map((use, index) => (index === entry.index && use.shader === entry.use.shader ? change(use) : use)),
    );
}

/**
 * Takes a row away as one step, with its parameters' bindings when no other row uses that shader.
 * @param ctx - the row.
 * @param entry - the row.
 * @returns when it is written.
 */
export function removeShader(ctx: RowContext, entry: ShaderEntry): Promise<void> {
    const channel = shadersChannel(ctx.side);
    const others = shaderEntries(ctx).some(
        (each) => each.index !== entry.index && each.use.shader === entry.use.shader,
    );
    return editUses(
        ctx,
        SHADER_STEP_WORDS.remove(nameOf(ctx.session, entry.use.shader)),
        (uses) => uses.filter((use, index) => !(index === entry.index && use.shader === entry.use.shader)),
        others ? undefined : bindsOf(channel, entry.use.shader),
    );
}

/**
 * Moves a row to another place in the list (its draw order inside one place), as one step.
 * @param ctx - the row.
 * @param from - its index now.
 * @param to - its index after.
 * @returns when it is written.
 */
export function moveShader(ctx: RowContext, from: number, to: number): Promise<void> {
    const entry = shaderEntries(ctx)[from];
    if (entry === undefined || from === to) {
        return Promise.resolve();
    }
    focusNext = `${shadersChannel(ctx.side)}:${String(to)}`;
    return editUses(ctx, SHADER_STEP_WORDS.move(nameOf(ctx.session, entry.use.shader)), (uses) => {
        if (uses[from]?.shader !== entry.use.shader) {
            return uses;
        }
        const next = [...uses];
        const [moved] = next.splice(from, 1);
        next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
        return next;
    });
}

/**
 * Groups a group outline's members by a data path, or by nothing, as one step.
 * @param ctx - the row.
 * @param entry - the row.
 * @param path - the path, or undefined for one outline around every member.
 * @returns when it is written.
 */
export function writeGroupBy(ctx: RowContext, entry: ShaderEntry, path: string | undefined): Promise<void> {
    return changeUse(ctx, entry, SHADER_STEP_WORDS.add(nameOf(ctx.session, entry.use.shader)), (use) => {
        const { groupBy: _was, ...rest } = use;
        return path === undefined ? rest : { ...rest, groupBy: path };
    });
}

/**
 * The parameter values a row sets.
 * @param entry - the row.
 * @returns its values, clock bindings included.
 */
export function paramsOf(entry: ShaderEntry): Readonly<Record<string, ShaderParamValue>> {
    return entry.use.params ?? {};
}

/**
 * Writes one parameter of a row's shader; undefined clears it back to its default.
 * @param ctx - the row.
 * @param entry - the row.
 * @param name - the parameter.
 * @param value - its value.
 * @returns when it is written.
 */
export function writeParam(
    ctx: RowContext,
    entry: ShaderEntry,
    name: string,
    value: ShaderParamValue | undefined,
): Promise<void> {
    const id = entry.use.shader;
    const words = SHADER_STEP_WORDS.param(nameOf(ctx.session, id), paramName(ctx.session, id, name));
    return changeUse(ctx, entry, words, (use) => {
        const { params: was, ...rest } = use;
        const kept = Object.fromEntries(Object.entries(was ?? {}).filter(([key]) => key !== name));
        const params = value === undefined ? kept : { ...kept, [name]: value };
        return Object.keys(params).length === 0 ? rest : { ...rest, params };
    });
}

/**
 * A parameter as the history names it: its catalog name.
 * @param session - the session.
 * @param id - the shader.
 * @param name - the parameter's id.
 * @returns its name.
 */
function paramName(session: GraphSession, id: string, name: string): string {
    return shaderOf(session, id)?.params.find((param) => param.name === name)?.plainName ?? name;
}

/**
 * The parameters of a row's shader the row binds to data, by parameter id.
 * @param ctx - the row.
 * @param entry - the row.
 * @returns the bindings.
 */
export function bindingsOf(ctx: RowContext, entry: ShaderEntry): Record<string, DataBinding> {
    const prefix = `${shadersChannel(ctx.side)}.${entry.use.shader}.`;
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

/**
 * Stops one parameter varying by data: takes its binding off the layer, one step.
 * @param ctx - the row.
 * @param entry - the row.
 * @param param - the parameter.
 * @returns when it is written.
 */
export function unbindParam(ctx: RowContext, entry: ShaderEntry, param: string): Promise<void> {
    const id = entry.use.shader;
    const key = `${shadersChannel(ctx.side)}.${id}.${param}`;
    return writeRow(
        ctx,
        {},
        (each) => each === key,
        SHADER_STEP_WORDS.unbind(nameOf(ctx.session, id), paramName(ctx.session, id, param)),
    );
}

/**
 * Turns the Shape section's Wireframe row on or off, or takes it away, as one step: on writes
 * `node.wireframe` true with `node.meshDetail` "low", the app's choice of a readable wireframe
 * through the element's own option (decisions-v2, section 7); off writes false and drops the
 * detail; undefined takes both off.
 * @param ctx - the row.
 * @param on - on, off, or undefined to take the row away.
 * @returns when it is written.
 */
export function writeWireframe(ctx: RowContext, on: boolean | undefined): Promise<void> {
    return writeRow(
        ctx,
        { "node.wireframe": on, "node.meshDetail": on === true ? "low" : undefined },
        undefined,
        SHADER_STEP_WORDS.wireframe(on === true),
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

/**
 * A row's fixed parameter values, for a copy of its text: clock bindings are not a text default.
 * @param entry - the row.
 * @returns the fixed values.
 */
export function fixedParams(entry: ShaderEntry): Params {
    return Object.fromEntries(
        Object.entries(paramsOf(entry)).filter(([, value]) => typeof value !== "object"),
    ) as Params;
}
