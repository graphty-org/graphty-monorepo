import { ControlSection, PanelField, TargetTooltip } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import type { Channel } from "@graphty/graphty-element/schema";
import { ActionIcon, Menu, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { ControlLabel } from "./ControlLabel";
import { shownChannel } from "./offered";
import { GradientRow } from "./parts/GradientRow";
import { Field, type RowContext } from "./PropertyRow";
import { carriedOpacity, lineIn, partlySet, removeLine, writeIn } from "./row";
import { listenForOptions, useShaderList } from "./shaderList";
import { writeWireframe } from "./shaderSlots";
import { focusLineNext, useFocusOnRemoval } from "./useFocusLine";
import { PlusList } from "./v2/PlusList";
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
 * Whether the Shape field holds a model in place of a built-in shape (node-models design 13.2).
 * @param ctx - the row.
 * @param channel - the property.
 * @returns true for Shape on a row whose own layer names a model.
 */
function modelSet(ctx: RowContext, channel: Channel): boolean {
    if (channel !== "node.shape") {
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
        // Only Fill lists it, by the panel's word for it.
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
 * One section of the Style tab (the owner's design, 2026-10-13, after Figma's sections): its title
 * and a "+" at the header's right end. A section the layer does not write is only its dimmed title
 * and "+". One it writes lists only the properties the layer sets, each with its value and a
 * minus. "+" opens a menu of the section's styles not set yet (with one left, it adds it); a
 * style's settings (Glow's strength) are added from the style's own row and drawn under it;
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
 * The color lines of a section whose field is too narrow to draw its opacity box: compact-mantine
 * drops the box below its own width, which only the drawn field knows, so it is read off the page
 * each time the section changes size or gains a line.
 * @returns the ref for the section, and the color channels whose opacity box is not drawn.
 */
function useHiddenOpacityBoxes(): [(element: HTMLElement | null) => void, readonly string[]] {
    const [element, ref] = useState<HTMLElement | null>(null);
    const [hidden, setHidden] = useState<readonly string[]>([]);
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        const read = (): void => {
            const now = [...element.querySelectorAll<HTMLElement>(".ws-row[data-line]")].flatMap((row) => {
                const box = row.querySelector(".cm-paint-opacity");
                return box !== null && getComputedStyle(box).display === "none" ? [row.dataset.line ?? ""] : [];
            });
            setHidden((was) => (was.join() === now.join() ? was : now));
        };
        const observer = new ResizeObserver(read);
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, [element]);
    return [ref, hidden];
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
    // Opacity is set in the color's own box, so "+" never offers it, and a color line set to a
    // value carries it; a row that sets opacity alone, or varies it by data, keeps its own line,
    // and so does one whose color field is too narrow to draw the box (#9295).
    const [measured, narrowColors] = useHiddenOpacityBoxes();
    const folded = new Set(
        set.flatMap((d) =>
            OPACITY_OF[d.channel] === undefined || narrowColors.includes(d.channel)
                ? []
                : (carriedOpacity(ctx, d.channel) ?? []),
        ),
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
    // A style's settings (graphty-element's `modifies`: Glow's strength)
    // are added from the style's own row and drawn under it, never listed by the section's "+".
    const isSetting = (d: ChannelDescriptor): boolean =>
        d.modifies !== undefined && descriptors.some((style) => style.channel === d.modifies);
    const under = (d: ChannelDescriptor): boolean => isSetting(d) && flat.some((style) => style.channel === d.modifies);
    const lines = flat
        .filter((d) => !under(d))
        .flatMap((d) => [d, ...flat.filter((each) => each.modifies === d.channel && under(each))]);
    const fail = (verb: string) => (error: unknown) => {
        focusLineNext(ctx.session, null);
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
        return listenForOptions(listener);
    }, []);
    // A style's own "+": the settings it does not set yet, named under it ("Strength" under Glow).
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
                onCancel={() => {
                    setWaiting((now) => now.filter((channel) => item.channels.every((each) => each !== channel)));
                }}
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
        <div ref={measured} data-section={`${ctx.side}-${spec.id}`} className="ws-section">
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
                            options={itemOptions ?? unset.filter((d) => !isSetting(d)).flatMap((d) => optionsFor(d))}
                            disabledReason={notAvailable(ctx, spec) ?? undefined}
                            onAdd={(key) => {
                                if (key.startsWith(ITEM_KEY)) {
                                    addItem(key.slice(ITEM_KEY.length));
                                    return;
                                }
                                const parts = key.split("=");
                                const channel = parts[0];
                                const pick = parts.at(1);
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
 * minus that takes every property of the item off the row in one step per layer, its lines still
 * waiting for a value too, says so, and hands focus to the section's "+".
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.item - the item
 * @param props.actions - more buttons before its minus
 * @param props.onCancel - takes back the item's lines still waiting for a value
 * @param props.onFail - reports a failed removal
 * @returns The line
 */
function ItemHead({
    ctx,
    item,
    actions,
    onCancel,
    onFail,
}: Readonly<{
    ctx: RowContext;
    item: NonNullable<SectionSpec["items"]>[number];
    actions?: React.ReactNode;
    onCancel: () => void;
    onFail: (error: unknown) => void;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    useFocusOnRemoval(box);
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
        <div ref={box} className="ws-row ws-item-head" data-item={item.id}>
            <div className="ws-field" data-named="">
                <span className="ws-field-label">
                    <ControlLabel span size="xs" fw={600} className="ws-field-name">
                        {item.name}
                    </ControlLabel>
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
                                store.set({ announcement: `${item.name} removed` });
                                onCancel();
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
 * A tab's Shaders section: one "+" that opens the shared gallery, and one row per use (see
 * {@link useShaderList}). Control+V on the section opens the dialog with the clipboard's text.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.spec - the section
 * @returns The section
 */
function ShadersSection({ ctx, spec }: Readonly<{ ctx: RowContext; spec: SectionSpec }>): React.JSX.Element {
    const sectionBox = useRef<HTMLDivElement>(null);
    const list = useShaderList(ctx, spec, sectionBox);
    // "+" opens ONE list of the tab's shaders, built-in and custom alike, "New shader..." first; in Style panel v2
    // a place is chosen only when a shader is created, in the code dialog (E368, E381).
    const add = (
        <AddButton
            kind={ctx.side}
            title={spec.title}
            options={[{ key: "shader:gallery", label: `${spec.title}...` }]}
            expanded={list.galleryOpen}
            onAdd={list.openGallery}
        />
    );
    return (
        <div // eslint-disable-line jsx-a11y/no-static-element-interactions -- only catches the paste shortcut bubbling from the section's own controls
            ref={sectionBox}
            data-section={`${ctx.side}-${spec.id}`}
            className="ws-section"
            onKeyDown={list.onKeyDown}
        >
            {spec.shapeOwnsReplace === true ? (
                // Style panel v2: the one "+" list (v2/PlusList.tsx).
                <PlusList
                    level="section"
                    title={spec.title}
                    empty={list.entries.length === 0}
                    collapseKey={`${ctx.side}:${spec.id}`}
                    add={add}
                >
                    {list.rows}
                </PlusList>
            ) : (
                <ControlSection
                    label={spec.title}
                    headingLevel={3}
                    empty={list.entries.length === 0}
                    collapsible={false}
                    actions={add}
                >
                    {list.rows}
                </ControlSection>
            )}
            {list.overlays}
        </div>
    );
}

/**
 * One thing a section's "+" can add: its key and its name in the menu, or, with `choices`, a
 * submenu whose items are what is added.
 */
export interface AddOption {
    readonly key: string;
    readonly label: string;
    readonly choices?: readonly AddOption[];
    /** Words drawn at the item's end, such as how many values will not convert. */
    readonly detail?: string;
    /** Shown but not pickable: its name only. */
    readonly disabled?: boolean;
    /** What it does, as its tooltip, where its name alone does not say. */
    readonly hint?: string;
    /** Drawn before its name, such as a pencil on an item that edits something already there. */
    readonly icon?: React.ReactNode;
    /** Its accessible name, where it says more than its words ("Edit card 2"); it holds them. */
    readonly name?: string;
}

/**
 * A "+" button's name: "Add to node shape", or "Add to background" where the title is the kind.
 * @param kind - nodes, edges or the background.
 * @param title - what it adds to.
 * @returns the name.
 */
function addName(kind: string, title: string): string {
    const what = title.toLowerCase();
    return what === kind ? `Add to ${kind}` : `Add to ${kind} ${what}`;
}

/**
 * A section's "+", named for the kind and the section ("Add to node shape"), so a layer on nodes
 * and edges never has two controls with one name: a menu of what it can still add, or, with one
 * thing left, a button that adds it. An option with choices opens a submenu of them. With nothing
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
 * @param props.inRow - a style's own "+" on its row ("Add to node glow"), which adds its settings
 * @param props.groups - what it can add in groups, a divider between each two; in place of `options`
 * @param props.opened - whether its menu is open, when the caller drives it
 * @param props.onOpenChange - called when its menu opens or closes
 * @param props.alwaysMenu - opens its menu even for one item (Style panel v2)
 * @param props.name - its accessible name and tooltip, in place of "Add to <kind> <title>" (a list's
 *   "Add slice", Style panel v2)
 * @returns The button and its menu
 */
export function AddButton({
    kind,
    title,
    options: flat = [],
    onAdd,
    disabledReason,
    expanded,
    inRow = false,
    groups,
    opened,
    onOpenChange,
    alwaysMenu = false,
    name: named,
}: Readonly<{
    kind: "node" | "edge" | "background";
    title: string;
    options?: readonly AddOption[];
    onAdd: (key: string) => void;
    disabledReason?: string;
    expanded?: boolean;
    /** A style's own "+" on its row, adding the style's settings: never its section's "+". */
    inRow?: boolean;
    groups?: readonly (readonly AddOption[])[];
    opened?: boolean;
    onOpenChange?: (opened: boolean) => void;
    /** Opens its menu even for one item, so the reader sees what it adds (Style panel v2). */
    alwaysMenu?: boolean;
    name?: string;
}>): React.JSX.Element | null {
    const shown = menuGroups(groups, flat);
    const options = shown.flat();
    const name = named ?? addName(kind, title);
    const full = options.every((option) => option.disabled === true) || disabledReason !== undefined;
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
    if (options.length === 1 && only.choices === undefined && !alwaysMenu) {
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
        <AddMenu
            groups={shown}
            onAdd={onAdd}
            opened={opened}
            onOpenChange={onOpenChange}
            target={<TargetTooltip label={name}>{button}</TargetTooltip>}
        />
    );
}

/**
 * A "+" menu's groups: the groups given, less the empty ones, else the one list.
 * @param groups - the groups, if any.
 * @param flat - the one list.
 * @returns the groups to draw.
 */
function menuGroups(
    groups: readonly (readonly AddOption[])[] | undefined,
    flat: readonly AddOption[],
): readonly (readonly AddOption[])[] {
    return groups === undefined ? [flat] : groups.filter((group) => group.length > 0);
}

/**
 * A "+" menu, a divider between each two groups. Without a target it opens from a zero-width
 * anchor at the header's end, beside the "+" an empty section carries; with nothing pickable it
 * draws nothing.
 * @param props - Component props
 * @param props.groups - the items, in groups
 * @param props.onAdd - adds one, by its key
 * @param props.opened - whether it is open, when the caller drives it
 * @param props.onOpenChange - called when it opens or closes
 * @param props.target - the "+" that opens it
 * @returns The menu
 */
function AddMenu({
    groups,
    onAdd,
    opened,
    onOpenChange,
    target = <span aria-hidden style={{ display: "inline-block", width: 0, height: 24 }} />,
}: Readonly<{
    groups: readonly (readonly AddOption[])[];
    onAdd: (key: string) => void;
    opened?: boolean;
    onOpenChange?: (opened: boolean) => void;
    target?: React.JSX.Element;
}>): React.JSX.Element | null {
    // on reload: fresh: pointer: a menu held open by its control
    const [own, setOwn] = useState(false);
    const isOpen = opened ?? own;
    const dropdown = useRef<HTMLDivElement>(null);
    const change = (next: boolean): void => {
        setOwn(next);
        onOpenChange?.(next);
    };
    const changeRef = useRef(change);
    changeRef.current = change;
    // A menu whose first item is disabled opens with focus left on its "+", where the menu's own Escape never
    // hears the key: Escape there closes it too, as it does with focus in the menu.
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }
        const onKey = (event: KeyboardEvent): void => {
            const inMenu = dropdown.current?.contains(document.activeElement) === true;
            if (event.key === "Escape" && !inMenu) {
                changeRef.current(false);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
        };
    }, [isOpen]);
    if (groups.flat().every((option) => option.disabled === true)) {
        return null;
    }
    return (
        <Menu position="bottom-end" opened={isOpen} onChange={change}>
            <Menu.Target>{target}</Menu.Target>
            <Menu.Dropdown ref={dropdown}>
                {groups.flatMap((group, at) => [
                    ...(at === 0 ? [] : [<Menu.Divider key={`divider-${String(at)}`} />]),
                    ...group.map((option) => menuItem(option, onAdd)),
                ])}
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * One item of a "+" menu, or a submenu of its choices.
 * @param option - the item.
 * @param onAdd - adds one, by its key.
 * @returns the menu item.
 */
function menuItem(option: AddOption, onAdd: (key: string) => void): React.JSX.Element {
    const item = (each: AddOption): React.JSX.Element => (
        <Menu.Item
            key={each.key}
            leftSection={each.icon}
            rightSection={each.detail}
            aria-label={each.name}
            disabled={each.disabled}
            data-named={each.name === undefined ? undefined : ""}
            title={each.hint}
            onClick={() => {
                onAdd(each.key);
            }}
        >
            {each.label}
        </Menu.Item>
    );
    return option.choices === undefined ? (
        item(option)
    ) : (
        <Menu.Sub key={option.key}>
            <Menu.Sub.Target>
                <Menu.Sub.Item>{option.label}</Menu.Sub.Item>
            </Menu.Sub.Target>
            <Menu.Sub.Dropdown>{option.choices.map((each) => item(each))}</Menu.Sub.Dropdown>
        </Menu.Sub>
    );
}
