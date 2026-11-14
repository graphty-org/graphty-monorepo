import { ControlSection, PanelField, Popout, TargetTooltip } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import type { Channel } from "@graphty/graphty-element/schema";
import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { nodeModelsOn, selectionWorkspaceOn } from "../features";
import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { DEFAULT_NAME_KEY } from "./cards";
import { shownChannel } from "./offered";
import { GradientRow } from "./parts/GradientRow";
import { Field, type RowContext } from "./PropertyRow";
import { carriedOpacity, lineIn, partlySet, removeLine, startingAdds, writeIn } from "./row";
import { type PasteInit, ShaderEditorDialog } from "./ShaderEditorDialog";
import { type OptionTile, ShaderGallery } from "./ShaderGallery";
import { ShaderRow } from "./ShaderRow";
import { addShader, moveShader, pickedShader, shaderEntries, writeWireframe } from "./shaderSlots";
import { focusLineNext, headerBottom } from "./useFocusLine";
import {
    channelWord,
    failureWords,
    fieldName,
    OPACITY_OF,
    PICTURE_WORD,
    type SectionSpec,
    settingWord,
    TWO_WORDS,
} from "./words";

/**
 * The tab's own style options a gallery search also finds (decisions-v2, section 2.2): Outline,
 * Glow, Halo and Wireframe on the Node tab, Band on the Edge tab, each by the property its "+" adds.
 */
const OPTION_CHANNELS: Readonly<Record<"node" | "edge", readonly Channel[]>> = {
    node: ["node.outline", "node.glow", "node.haloColor", "node.wireframe"],
    edge: ["edge.bandColor"],
};

/** The sections listening for an option a gallery picked, each answering for its own properties. */
const optionAdds = new Set<(side: "node" | "edge", channel: Channel) => boolean>();

/**
 * Whether the row sets a property: a line of its own (not the element's locked base), or, for
 * several rows, a line some of them write.
 * @param ctx - the row.
 * @param descriptor - the property.
 * @returns true when the section lists it.
 */
function isSet(ctx: RowContext, descriptor: ChannelDescriptor): boolean {
    const line = lineIn(ctx, descriptor.channel);
    return (
        (line !== undefined && !line.layer.locked) ||
        partlySet(ctx, descriptor.channel) !== undefined ||
        modelSet(ctx, descriptor.channel)
    );
}

/**
 * Whether the Shape field holds a model in place of a built-in shape (node-models design 13.2),
 * with the experiment on.
 * @param ctx - the row.
 * @param channel - the property.
 * @returns true for Shape on a row whose own layer names a model.
 */
function modelSet(ctx: RowContext, channel: Channel): boolean {
    if (channel !== "node.shape" || !nodeModelsOn(ctx.session)) {
        return false;
    }
    const model = lineIn(ctx, "node.model");
    return model !== undefined && !model.layer.locked;
}

/**
 * What a section's "+" offers for a property. Visibility offers its two writes as two items, Hide
 * and Show, and Show is always offered, so a layer can be written before the layer it overrides.
 * @param descriptor - the property.
 * @returns the menu items, keyed `<channel>` or `<channel>=<value>`.
 */
function optionsFor(descriptor: ChannelDescriptor): AddOption[] {
    if (descriptor.channel === "node.visible" || descriptor.channel === "edge.visible") {
        return [
            { key: `${descriptor.channel}=false`, label: "Hide" },
            { key: `${descriptor.channel}=true`, label: "Show elements a layer beneath hides" },
        ];
    }
    if (descriptor.channel === "node.wireframe") {
        // An on/off option: picking it turns the wireframe on, with the low-detail mesh.
        return [{ key: "node.wireframe=true", label: channelWord(descriptor.channel) }];
    }
    if (descriptor.channel === "node.texture") {
        // Only Fill with the node-models experiment on lists it, by the panel's word for it.
        return [{ key: descriptor.channel, label: PICTURE_WORD }];
    }
    return [{ key: descriptor.channel, label: channelWord(descriptor.channel) }];
}

/** A list section's "+" menu key for one of its items. */
const ITEM_KEY = "item:";

/** Why an undirected graph's Arrowheads add nothing: its edges have no direction to point. */
const NO_ARROWHEADS = "Not available: undirected graph";

/**
 * Why a section's "+" adds nothing on this graph, or null: Arrowheads on an undirected graph.
 * @param ctx - the row and kind.
 * @param spec - the section.
 * @returns the words, or null.
 */
function notAvailable(ctx: RowContext, spec: SectionSpec): string | null {
    return ctx.side === "edge" && spec.id === "ends" && ctx.session.data.statistics().directedness === "undirected"
        ? NO_ARROWHEADS
        : null;
}

/**
 * A section's one help line, or null: on edges, Arrowheads says they are not available on an
 * undirected graph; on nodes, Shape with an outline says where its width is set.
 * @param ctx - the row and kind.
 * @param spec - the section.
 * @param set - the properties the row sets in it.
 * @returns the words, or null.
 */
function sectionNote(ctx: RowContext, spec: SectionSpec, set: readonly ChannelDescriptor[]): string | null {
    const blocked = notAvailable(ctx, spec);
    if (blocked !== null) {
        return blocked;
    }
    if (ctx.side === "node" && spec.id === "shape" && set.some((d) => d.channel === "node.outline")) {
        return selectionWorkspaceOn(ctx.session)
            ? "Width: Graph settings"
            : "Every outline is drawn at one width, set in Graph settings. For a ring this layer sizes, use Halo.";
    }
    return null;
}

/**
 * One section of the Style tab (the owner's design, 2026-10-13, after Figma's sections): its title
 * and a "+" at the header's right end. A section the layer does not write is only its dimmed title
 * and "+". One it writes lists only the properties the layer sets, each with its value and a
 * minus. "+" opens a menu of the section's styles not set yet (with one left, it adds it); a
 * style's settings (Halo's size and opacity) are added from the style's own row and drawn under it;
 * picking one adds its line waiting for a value, showing what the row's elements draw now (else
 * graphty-element's starting value), says so, and puts focus in it. Nothing is written, so the
 * drawing and the key change only once the reader picks a value.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.spec - the section
 * @param props.actions - more header buttons, before its "+"
 * @param props.itemActions - more buttons on a list section's item heading, by item id
 * @returns The section
 */
export function Section({ ctx, spec, actions, itemActions }: Readonly<SectionProps>): React.JSX.Element | null {
    return spec.shaders === true ? (
        <ShadersSection ctx={ctx} spec={spec} />
    ) : (
        <PropertySection ctx={ctx} spec={spec} actions={actions} itemActions={itemActions} />
    );
}

/** What {@link Section} takes. */
interface SectionProps {
    /** The row and kind. */
    readonly ctx: RowContext;
    /** The section. */
    readonly spec: SectionSpec;
    /** More buttons on the header, before its "+" (a settings page's button). */
    readonly actions?: React.ReactNode;
    /** More buttons on a list section's item heading, by item id. */
    readonly itemActions?: (item: string) => React.ReactNode;
}

/**
 * A section of properties: see {@link Section}.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.spec - the section
 * @param props.actions - more header buttons
 * @param props.itemActions - more buttons on an item heading
 * @returns The section
 */
function PropertySection({ ctx, spec, actions, itemActions }: Readonly<SectionProps>): React.JSX.Element | null {
    const { store } = useWorkspace();
    // The properties "+" added that the row does not set yet, waiting for a value, so adding one
    // writes nothing until the reader picks one.
    const [waiting, setWaiting] = useState<readonly string[]>([]);
    // What the element offers, and a property the row already sets even when it is not offered,
    // so the reader can see it and take it out.
    const descriptors = spec.channels.flatMap((channel) => {
        const held = channelsFor(ctx.side).find((d) => d.channel === channel && d.renderable);
        const shown = held === undefined ? undefined : shownChannel(ctx.session, ctx.side, channel, isSet(ctx, held));
        return shown?.renderable === true ? [shown] : [];
    });
    const set = descriptors.filter((d) => isSet(ctx, d));
    // Properties drawn together (both arrow ends): once one is set, the rest wait for a value.
    const together = spec.together ?? [];
    const joined = together.some((channel) => set.some((d) => d.channel === channel));
    const pending = descriptors.filter(
        (d) => !set.includes(d) && (waiting.includes(d.channel) || (joined && together.includes(d.channel))),
    );
    const note = sectionNote(ctx, spec, set);
    // Opacity is set in the color's own box, so "+" never offers it, and a color line set to a
    // value carries it; a row that sets opacity alone, or varies it by data, keeps its own line.
    const folded = new Set(
        set.flatMap((d) => (OPACITY_OF[d.channel] === undefined ? [] : (carriedOpacity(ctx, d.channel) ?? []))),
    );
    const boxed = new Set(Object.values(OPACITY_OF));
    const unset = descriptors.filter(
        (d) =>
            !set.includes(d) &&
            !pending.includes(d) &&
            !boxed.has(d.channel) &&
            (spec.offer === undefined || spec.offer.includes(d.channel)),
    );
    // A line "+" added keeps the place it was added at, below the lines set before it, once its
    // value is written too: drawn in the section's order, it would jump above them under the
    // reader's eyes.
    const added = waiting.flatMap((channel) => descriptors.find((d) => d.channel === channel) ?? []);
    const flat = [
        ...set.filter((d) => !added.includes(d)),
        ...added.filter((d) => set.includes(d) || pending.includes(d)),
        ...pending.filter((d) => !added.includes(d)),
    ].filter((d) => !folded.has(d.channel));
    if (joined) {
        flat.sort((a, b) => descriptors.indexOf(a) - descriptors.indexOf(b));
    }
    // A style's settings (graphty-element's `modifies`: Halo's size and opacity, Glow's strength)
    // are added from the style's own row and drawn under it, never listed by the section's "+".
    const isSetting = (d: ChannelDescriptor): boolean =>
        d.modifies !== undefined && descriptors.some((style) => style.channel === d.modifies);
    const under = (d: ChannelDescriptor): boolean => isSetting(d) && flat.some((style) => style.channel === d.modifies);
    const lines = flat
        .filter((d) => !under(d))
        .flatMap((d) => [d, ...flat.filter((each) => each.modifies === d.channel && under(each))]);
    const fail = (verb: string) => (error: unknown) => {
        focusLineNext(ctx.session, null);
        startingAdds.delete(ctx.session);
        store.set({ notice: { message: failureWords(spec.title, verb, error), error: true } });
    };
    const write = (descriptor: ChannelDescriptor, value: boolean): void => {
        const written =
            descriptor.channel === "node.wireframe"
                ? writeWireframe(ctx, value)
                : writeIn(ctx, descriptor.channel, { value });
        written
            .then(() => {
                store.set({ announcement: `${fieldName(descriptor.channel)} added` });
            })
            .catch(fail("added"));
    };
    const add = (descriptor: ChannelDescriptor, value?: boolean): void => {
        focusLineNext(ctx.session, descriptor.channel);
        if (value === undefined) {
            setWaiting((now) => (now.includes(descriptor.channel) ? now : [...now, descriptor.channel]));
            const every = ctx.many === undefined ? "" : " for every layer";
            store.set({ announcement: `${fieldName(descriptor.channel)} added: pick a value${every}` });
            return;
        }
        // Hide or Show is the reader's pick. The first one on a selection makes its layer:
        // Escape before any other change takes it back.
        if (
            ctx.many === undefined &&
            ctx.layers.length === 0 &&
            ctx.fresh?.userData?.[DEFAULT_NAME_KEY] !== undefined
        ) {
            startingAdds.add(ctx.session);
        }
        write(descriptor, value);
    };
    // An option a gallery search picked (Glow from "glow") is added here, as from this "+".
    const answer = useRef<(side: "node" | "edge", channel: Channel) => boolean>(() => false);
    answer.current = (side, channel) => {
        const descriptor = descriptors.find((d) => d.channel === channel);
        if (side !== ctx.side || descriptor === undefined) {
            return false;
        }
        if (set.includes(descriptor)) {
            focusLineNext(ctx.session, channel);
            setWaiting((now) => [...now]);
        } else {
            add(descriptor, channel === "node.wireframe" ? true : undefined);
        }
        return true;
    };
    useEffect(() => {
        const listener = (side: "node" | "edge", channel: Channel): boolean => answer.current(side, channel);
        optionAdds.add(listener);
        return () => {
            optionAdds.delete(listener);
        };
    }, []);
    // A style's own "+": the settings it does not set yet, named under it ("Size" under Halo).
    const settingsAdd = (style: ChannelDescriptor): React.ReactNode => {
        const options = unset.flatMap((d) =>
            d.modifies === style.channel ? [{ key: d.channel, label: settingWord(style.channel, d.channel) }] : [],
        );
        return options.length === 0 ? undefined : (
            <AddButton
                kind={ctx.side}
                title={channelWord(style.channel)}
                options={options}
                inRow
                onAdd={(key) => {
                    const descriptor = unset.find((d) => d.channel === key);
                    if (descriptor !== undefined) {
                        add(descriptor);
                    }
                }}
            />
        );
    };
    // A list section's "+" offers its items (a paint, an effect), each one the row has not started.
    const itemOptions = spec.items?.flatMap((item) => {
        const started = [...set, ...pending].some((d) => item.channels.includes(d.channel));
        const offered = unset.some((d) => item.channels.includes(d.channel));
        return started || !offered ? [] : [{ key: `${ITEM_KEY}${item.id}`, label: item.name }];
    });
    // Adding an item adds every property "+" offers of it, waiting for values, in one go.
    const addItem = (id: string): void => {
        const item = spec.items?.find((each) => each.id === id);
        const adds = unset.filter((d) => item?.channels.includes(d.channel) === true).map((d) => d.channel);
        if (item === undefined || adds.length === 0) {
            return;
        }
        focusLineNext(ctx.session, adds[0]);
        setWaiting((now) => [...now, ...adds.filter((channel) => !now.includes(channel))]);
        store.set({ announcement: `${item.name} added: pick its values` });
    };
    // A list section's item heading, before the first line of each item the row sets.
    const headed = new Set<string>();
    const itemHead = (d: ChannelDescriptor): React.ReactNode => {
        const item = spec.items?.find((each) => each.channels.includes(d.channel));
        if (item === undefined || headed.has(item.id)) {
            return null;
        }
        headed.add(item.id);
        return (
            <ItemHead
                key={`item-${item.id}`}
                ctx={ctx}
                item={item}
                actions={itemActions?.(item.id)}
                onFail={fail("removed")}
            />
        );
    };
    if (descriptors.length === 0) {
        return null;
    }
    return (
        // The section is the group, named by its title, a heading so a screen reader moves from
        // section to section; a wrapper group named "Node shape" read the name twice.
        <div data-section={`${ctx.side}-${spec.id}`} className="ws-section">
            <ControlSection
                label={spec.title}
                headingLevel={3}
                empty={set.length + pending.length === 0}
                hasConfiguredValues={spec.configured}
                collapsible={false}
                actions={
                    <>
                        {actions}
                        <AddButton
                            kind={ctx.side}
                            title={spec.title}
                            options={itemOptions ?? unset.filter((d) => !isSetting(d)).flatMap(optionsFor)}
                            disabledReason={notAvailable(ctx, spec) ?? undefined}
                            onAdd={(key) => {
                                if (key.startsWith(ITEM_KEY)) {
                                    addItem(key.slice(ITEM_KEY.length));
                                    return;
                                }
                                const [channel, pick] = key.split("=");
                                const descriptor = unset.find((d) => d.channel === channel);
                                if (descriptor !== undefined) {
                                    add(descriptor, ...(pick === undefined ? [] : [pick === "true"]));
                                }
                            }}
                        />
                    </>
                }
            >
                {lines.map((d) => [
                    itemHead(d),
                    specialLine(ctx, spec, d) ?? (
                        <Field
                            key={d.channel}
                            ctx={ctx}
                            descriptor={d}
                            word={
                                under(d) && d.modifies !== undefined
                                    ? settingWord(d.modifies, d.channel)
                                    : spec.words?.[d.channel]
                            }
                            setting={under(d)}
                            settings={settingsAdd(d)}
                            pending={pending.includes(d)}
                            onCancel={() => {
                                setWaiting((now) => now.filter((channel) => channel !== d.channel));
                            }}
                        />
                    ),
                ])}
            </ControlSection>
            {/* Outside the section's body, so it shows while the section sets nothing yet. */}
            {note !== null && (
                <Text size="xs" c="dimmed" px={16} pb={4} data-testid={`${ctx.side}-${spec.id}-note`}>
                    {note}
                </Text>
            )}
        </div>
    );
}

/**
 * A line drawn by its own control rather than a property field: Shape's Wireframe, and in a list
 * section (the panel by part) the gradient's stops, which stand for its colors and their places.
 * @param ctx - the row.
 * @param spec - the section.
 * @param d - the property.
 * @returns the line; false to draw no line for it; undefined for an ordinary field.
 */
function specialLine(ctx: RowContext, spec: SectionSpec, d: ChannelDescriptor): React.ReactNode {
    if (d.channel === "node.wireframe") {
        return <WireframeRow key={d.channel} ctx={ctx} />;
    }
    if (spec.items !== undefined && d.channel === "node.gradientColors") {
        return <GradientRow key={d.channel} ctx={ctx} />;
    }
    // The stops row edits the stops too: they keep a line of their own only where a layer sets
    // them without colors, so that value can be seen and removed.
    if (
        spec.items !== undefined &&
        d.channel === "node.gradientStops" &&
        (lineIn(ctx, "node.gradientColors") !== undefined || lineIn(ctx, "node.gradientStops") === undefined)
    ) {
        return false;
    }
    return undefined;
}

/**
 * A list section's heading line for one item the row sets (Drop shadow, Gradient): its name, and a
 * minus that takes every property of the item off the row in one step per layer.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.item - the item
 * @param props.actions - more buttons before its minus
 * @param props.onFail - reports a failed removal
 * @returns The line
 */
function ItemHead({
    ctx,
    item,
    actions,
    onFail,
}: Readonly<{
    ctx: RowContext;
    item: NonNullable<SectionSpec["items"]>[number];
    actions?: React.ReactNode;
    onFail: (error: unknown) => void;
}>): React.JSX.Element {
    const remove = async (): Promise<void> => {
        const { many } = ctx;
        if (many !== undefined) {
            for (const channel of item.channels) {
                if (many.count(channel) > 0) {
                    await many.clear(channel);
                }
            }
            return;
        }
        for (const layer of ctx.layers) {
            const held = item.channels.filter(
                (channel) => layer.set?.[channel] !== undefined || layer.encode?.[channel] !== undefined,
            );
            if (held.length > 0 && !layer.locked) {
                await removeLine(ctx.session, layer, ...held);
            }
        }
    };
    const label = `Remove ${item.name.toLowerCase()}`;
    return (
        <div className="ws-row ws-item-head" data-item={item.id}>
            <div className="ws-field" data-named="">
                <span className="ws-field-label">
                    <Text span size="xs" fw={600} className="ws-field-name">
                        {item.name}
                    </Text>
                </span>
                <div className="ws-field-control" />
                <span className="ws-slot">{actions}</span>
                <span className="ws-slot">
                    <Tooltip label={label} position="top">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={label}
                            onClick={() => {
                                remove().catch(onFail);
                            }}
                        >
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            </div>
        </div>
    );
}

/**
 * The Shape section's Wireframe row: On or Off, and a minus. On writes `node.wireframe` with the
 * low-detail mesh, off writes it off and drops the detail, the minus takes both away; each is one
 * undo step (decisions-v2, section 7).
 * @param props - Component props
 * @param props.ctx - the row
 * @returns The row
 */
export function WireframeRow({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const { store } = useWorkspace();
    const value = lineIn(ctx, "node.wireframe")?.value;
    const label = channelWord("node.wireframe");
    const fail = (verb: string) => (error: unknown) => {
        store.set({ notice: { message: failureWords(label, verb, error), error: true } });
    };
    const words = TWO_WORDS["node.wireframe"] ?? [];
    return (
        <div className="ws-row" data-line="node.wireframe" data-set="">
            <div className="ws-field" data-named="">
                <span className="ws-field-label">
                    <span className="ws-field-name" title={label} aria-hidden>
                        {label}
                    </span>
                </span>
                <div className="ws-field-control">
                    <PanelField
                        label={fieldName("node.wireframe")}
                        kind="select"
                        width="fill"
                        value={value === true ? "on" : "off"}
                        data={words.map(([on, word]) => ({ value: on ? "on" : "off", label: word }))}
                        onChange={(picked) => {
                            if (picked === "on" || picked === "off") {
                                writeWireframe(ctx, picked === "on").catch(fail("changed"));
                            }
                        }}
                    />
                </div>
                <span className="ws-slot" />
                <span className="ws-slot">
                    <Tooltip label={`Remove ${label.toLowerCase()}`} position="top">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={`Remove ${label.toLowerCase()}`}
                            onClick={() => {
                                writeWireframe(ctx, undefined).catch(fail("removed"));
                            }}
                        >
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            </div>
        </div>
    );
}

/**
 * A tab's Shaders section (decisions-v2, section 2.1): one "+" that opens the shared gallery, and
 * one row per use on the layer's list in its order. A pick adds the shader at its own place, to
 * every selected layer in one undo step, and hands focus to the new row's place. A search hit on
 * one of the tab's own style options adds that option's row in its section instead. "New
 * shader..." opens the code dialog, which asks the place. Control+V on the section opens the
 * dialog with the clipboard's text.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.spec - the section
 * @returns The section
 */
function ShadersSection({ ctx, spec }: Readonly<{ ctx: RowContext; spec: SectionSpec }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [gallery, setGallery] = useState(false);
    const [code, setCode] = useState<PasteInit | null>(null);
    const sectionBox = useRef<HTMLDivElement>(null);
    const tab = ctx.side;
    const entries = shaderEntries(ctx);
    const options: OptionTile[] = OPTION_CHANNELS[tab].map((channel) => ({
        key: channel,
        label: channelWord(channel),
    }));
    const fail = (verb: string) => (error: unknown) => {
        store.set({ notice: { message: failureWords(spec.title, verb, error), error: true } });
    };
    // Show in Style on a notice asks for this side's "+": it takes focus once the section is drawn.
    const shaderNext = useWorkspaceState((state) => state.shaderNext);
    useEffect(() => {
        if (shaderNext === tab) {
            store.set({ shaderNext: null });
            sectionBox.current?.querySelector<HTMLElement>("[data-plus]")?.focus();
        }
    }, [shaderNext, tab, store]);
    const pick = async (id: string): Promise<void> => {
        const name = ctx.session.shaders.describe(id)?.plainName ?? id;
        await addShader(ctx, await pickedShader(ctx.session, id));
        store.set({ announcement: `${name} added` });
    };
    return (
        <div // NOSONAR(S6848): only catches the paste shortcut bubbling from the section's own controls
            ref={sectionBox}
            data-section={`${ctx.side}-${spec.id}`}
            className="ws-section"
            onKeyDown={(event) => {
                pasteKey(event, setCode);
            }}
        >
            <ControlSection
                label={spec.title}
                headingLevel={3}
                empty={entries.length === 0}
                collapsible={false}
                actions={
                    <AddButton
                        kind={ctx.side}
                        title={spec.title}
                        options={[{ key: "shader:gallery", label: `${spec.title}...` }]}
                        expanded={gallery}
                        onAdd={() => {
                            setGallery(true);
                        }}
                    />
                }
            >
                {entries.map((entry) => (
                    <ShaderRow
                        key={entry.key}
                        ctx={ctx}
                        entry={entry}
                        count={entries.length}
                        onMove={(from, to) => {
                            moveShader(ctx, from, to).catch(fail("changed"));
                        }}
                        onCode={setCode}
                    />
                ))}
            </ControlSection>
            <Popout
                opened={gallery}
                onOpenChange={(open) => {
                    setGallery(open);
                    // Closed with nothing picked: focus goes back to the section's "+".
                    if (!open && (document.activeElement ?? document.body) === document.body) {
                        sectionBox.current?.querySelector<HTMLElement>("[data-plus]")?.focus();
                    }
                }}
            >
                <Popout.Panel
                    width={280}
                    placement="left"
                    alignment="start"
                    anchorY={sectionBox}
                    boundaryTop={gallery ? headerBottom() : 0}
                    header={{ variant: "title", title: spec.title }}
                    closeLabel={`Close ${spec.title}`}
                >
                    <Popout.Content>
                        <ShaderGallery
                            session={ctx.session}
                            tab={tab}
                            options={options}
                            marked={entries.map((entry) => entry.use.shader)}
                            onPick={(id) => {
                                setGallery(false);
                                pick(id).catch(fail("added"));
                            }}
                            onOption={(channel) => {
                                setGallery(false);
                                for (const answer of optionAdds) {
                                    if (answer(tab, channel as Channel)) {
                                        break;
                                    }
                                }
                            }}
                            onNew={() => {
                                setGallery(false);
                                setCode({});
                            }}
                            onDelete={(id) => {
                                const name = ctx.session.shaders.describe(id)?.plainName ?? id;
                                ctx.session.shaders
                                    .remove(id)
                                    .then(() => {
                                        store.set({ announcement: `${name} deleted` });
                                    })
                                    .catch(fail("deleted"));
                            }}
                        />
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
            {code !== null && (
                <ShaderEditorDialog
                    session={ctx.session}
                    tab={tab}
                    put={(scope, id, params) => addShader(ctx, id, params, scope)}
                    init={code}
                    onClose={() => {
                        setCode(null);
                    }}
                />
            )}
        </div>
    );
}

/**
 * Control+V (Command+V) with focus on a control of the Shaders section, not in a text field: opens
 * the code dialog with the clipboard's text, or with the unsent draft when the browser will not
 * read the clipboard.
 * @param event - the key.
 * @param open - opens the dialog.
 */
function pasteKey(event: React.KeyboardEvent, open: (init: PasteInit) => void): void {
    const target = event.target as HTMLElement;
    const typing = target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA";
    if (typing || !(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "v") {
        return;
    }
    event.preventDefault();
    const read = navigator.clipboard?.readText?.();
    if (read === undefined) {
        open({});
        return;
    }
    read.then(
        (text) => {
            open(text.trim() === "" ? {} : { text });
        },
        () => {
            open({});
        },
    );
}

/** One thing a section's "+" can add: its key and its name in the menu. */
export interface AddOption {
    readonly key: string;
    readonly label: string;
}

/**
 * A section's "+", named for the kind and the section ("Add to node shape"), so a layer on nodes
 * and edges never has two controls with one name: a menu of what it can still add, or, with one
 * thing left, a button that adds it. With nothing
 * left it stays in place, disabled, saying so in its tooltip on hover, and is no Tab stop: a "+"
 * that adds nothing is a dead stop on a keyboard walk, and the lines it would add are already
 * there, each one a stop of its own.
 * @param props - Component props
 * @param props.kind - nodes or edges
 * @param props.title - the section's title
 * @param props.options - what it can add, in menu order
 * @param props.onAdd - adds one, by its key
 * @param props.disabledReason - why it adds nothing on this graph, which disables it as a full one is
 * @param props.expanded - whether the pop-out its one item opens is open (a shader gallery)
 * @param props.inRow - a style's own "+" on its row ("Add to node halo"), which adds its settings
 * @returns The button and its menu
 */
export function AddButton({
    kind,
    title,
    options,
    onAdd,
    disabledReason,
    expanded,
    inRow = false,
}: Readonly<{
    kind: "node" | "edge" | "background";
    title: string;
    options: readonly AddOption[];
    onAdd: (key: string) => void;
    disabledReason?: string;
    expanded?: boolean;
    /** A style's own "+" on its row, adding the style's settings: never its section's "+". */
    inRow?: boolean;
}>): React.JSX.Element {
    const name = `Add to ${kind} ${title.toLowerCase()}`;
    const full = options.length === 0 || disabledReason !== undefined;
    const reason = disabledReason ?? `Everything in ${kind} ${title.toLowerCase()} is set`;
    const button = (
        <ActionIcon
            variant="subtle"
            size="sm"
            className={inRow ? "ws-row-add" : "cm-section-add"}
            aria-label={name}
            aria-disabled={full ? true : undefined}
            data-disabled={full ? true : undefined}
            aria-description={full ? reason : undefined}
            tabIndex={full ? -1 : undefined}
            data-plus={inRow ? undefined : ""}
        >
            <GLYPHS.add size={14} aria-hidden />
        </ActionIcon>
    );
    if (full) {
        return <Tooltip label={reason}>{button}</Tooltip>;
    }
    const [only] = options;
    if (options.length === 1) {
        // A menu of one item is one more click for nothing: the "+" adds it. Its tooltip is its
        // name, so a reader who hovers it and one who hears it meet one name. One that opens a
        // gallery says it opens one, and whether it is open.
        const opens = only.key === "shader:gallery";
        return (
            <Tooltip label={name}>
                {React.cloneElement(button, {
                    "aria-haspopup": opens ? "dialog" : undefined,
                    "aria-expanded": opens ? expanded === true : undefined,
                    onClick: () => {
                        onAdd(only.key);
                    },
                })}
            </Tooltip>
        );
    }
    return (
        <Menu position="bottom-end">
            <Menu.Target>
                <TargetTooltip label={name}>{button}</TargetTooltip>
            </Menu.Target>
            <Menu.Dropdown>
                {options.map((option) => (
                    <Menu.Item
                        key={option.key}
                        onClick={() => {
                            onAdd(option.key);
                        }}
                    >
                        {option.label}
                    </Menu.Item>
                ))}
            </Menu.Dropdown>
        </Menu>
    );
}
