import { ControlSection, Popout } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor, type ShaderDescriptor } from "@graphty/graphty-element/catalog";
import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { arrowheadNote } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { DEFAULT_NAME_KEY } from "./cards";
import { type PasteInit, PasteShaderDialog } from "./PasteShaderDialog";
import { Field, type RowContext } from "./PropertyRow";
import { lineIn, partlySet, startingAdds, writeIn } from "./row";
import { ShaderRow, SlotGallery } from "./ShaderRow";
import {
    pickShader,
    shaderEntries,
    type ShaderSlot,
    slotAdd,
    slotAddOptions,
    slotIsSet,
    slotOf,
    spriteOn,
} from "./shaderSlots";
import { focusLineNext, headerBottom } from "./useFocusLine";
import { channelWord, failureWords, fieldName, materialBlockedWords, type SectionSpec } from "./words";

/**
 * Whether the row sets a property: a line of its own (not the element's locked base), or, for
 * several rows, a line some of them write.
 * @param ctx - the row.
 * @param descriptor - the property.
 * @returns true when the section lists it.
 */
function isSet(ctx: RowContext, descriptor: ChannelDescriptor): boolean {
    const line = lineIn(ctx, descriptor.channel);
    return (line !== undefined && !line.layer.locked) || partlySet(ctx, descriptor.channel) !== undefined;
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
    return [{ key: descriptor.channel, label: channelWord(descriptor.channel) }];
}

/**
 * What a section's "+" offers: its properties not set yet, then its shader slot's adds (none while
 * the layer draws a sprite, which Material would replace).
 * @param ctx - the row.
 * @param unset - the section's properties not set yet.
 * @param slot - the section's shader slot, or undefined.
 * @param sprite - the sprite the layer draws, or undefined.
 * @returns the menu items.
 */
function addOptions(
    ctx: RowContext,
    unset: readonly ChannelDescriptor[],
    slot: ShaderSlot | undefined,
    sprite: ShaderDescriptor | undefined,
): AddOption[] {
    return [
        ...unset.flatMap(optionsFor),
        ...(slot === undefined || sprite !== undefined ? [] : slotAddOptions(ctx, slot)),
    ];
}

/**
 * A section's one help line, or null: on edges, Arrowheads says what arrowheads follow on a graph
 * that is not directed; on nodes, Effects with an outline says where its width is set.
 * @param ctx - the row and kind.
 * @param spec - the section.
 * @param set - the properties the row sets in it.
 * @returns the words, or null.
 */
function sectionNote(ctx: RowContext, spec: SectionSpec, set: readonly ChannelDescriptor[]): string | null {
    if (ctx.side === "edge" && spec.id === "ends") {
        return arrowheadNote(ctx.session.data.statistics().directedness);
    }
    if (ctx.side === "node" && spec.id === "effects" && set.some((d) => d.channel === "node.outline")) {
        return "Every outline is drawn at one width, set in Graph settings. For a ring this layer sizes, use Halo.";
    }
    return null;
}

/**
 * One section of the Style tab (the owner's design, 2026-10-13, after Figma's sections): its title
 * and a "+" at the header's right end. A section the layer does not write is only its dimmed title
 * and "+". One it writes lists only the properties the layer sets, each with its value and a
 * minus. "+" opens a menu of the section's properties not set yet (with one left, it adds it);
 * picking one adds its line waiting for a value, showing what the row's elements draw now (else
 * graphty-element's starting value), says so, and puts focus in it. Nothing is written, so the
 * drawing and the key change only once the reader picks a value.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.spec - the section
 * @returns The section
 */
export function Section({ ctx, spec }: Readonly<{ ctx: RowContext; spec: SectionSpec }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    // The properties "+" added that the row does not set yet, waiting for a value, so adding one
    // writes nothing until the reader picks one.
    const [waiting, setWaiting] = useState<readonly string[]>([]);
    // The section's shader gallery, opened by its "+".
    const [gallery, setGallery] = useState(false);
    // The Paste shader dialog, open with what it starts from.
    const [paste, setPaste] = useState<PasteInit | null>(null);
    const sectionBox = useRef<HTMLDivElement>(null);
    // The section's shaders: a sprite, a surface (the Material row, which also holds Wireframe), an
    // edge surface, or effects. Their channels are drawn as shader rows, never as fields.
    const slot = slotOf(ctx.side, spec.shaderKinds);
    const descriptors = spec.channels.flatMap(
        (channel) =>
            channelsFor(ctx.side).find(
                (d) =>
                    d.channel === channel &&
                    d.renderable &&
                    d.shaderSlot === undefined &&
                    !(slot?.role === "material" && d.channel === "node.wireframe"),
            ) ?? [],
    );
    if (descriptors.length === 0 && slot === undefined) {
        return null;
    }
    const shaders = slot === undefined ? [] : shaderEntries(ctx, slot);
    // A sprite and a surface are the one node.shader: while the layer draws a sprite, Material
    // adds nothing, and says why, instead of a pick that would silently replace the sprite.
    const sprite = slot?.role === "material" ? spriteOn(ctx) : undefined;
    const set = descriptors.filter((d) => isSet(ctx, d));
    const pending = descriptors.filter((d) => !set.includes(d) && waiting.includes(d.channel));
    const note = sectionNote(ctx, spec, set);
    const unset = descriptors.filter((d) => !set.includes(d) && !pending.includes(d));
    // A line "+" added keeps the place it was added at, below the lines set before it, once its
    // value is written too: drawn in the section's order, it would jump above them under the
    // reader's eyes.
    const added = waiting.flatMap((channel) => descriptors.find((d) => d.channel === channel) ?? []);
    const lines = [
        ...set.filter((d) => !added.includes(d)),
        ...added.filter((d) => set.includes(d) || pending.includes(d)),
    ];
    const write = (descriptor: ChannelDescriptor, value: boolean): void => {
        writeIn(ctx, descriptor.channel, { value })
            .then(() => {
                store.set({ announcement: `${fieldName(descriptor.channel)} added` });
            })
            .catch((error: unknown) => {
                focusLineNext(null);
                startingAdds.delete(ctx.session);
                store.set({
                    notice: { message: failureWords(channelWord(descriptor.channel), "added", error), error: true },
                });
            });
    };
    const add = (descriptor: ChannelDescriptor, value?: boolean): void => {
        focusLineNext(descriptor.channel);
        if (value === undefined) {
            setWaiting((now) => [...now, descriptor.channel]);
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
    return (
        // The section is the group, named by its title, a heading so a screen reader moves from
        // section to section; a wrapper group named "Node shape" read the name twice.
        <div // NOSONAR(S6848): only catches the paste shortcut bubbling from the section's own controls
            ref={sectionBox}
            data-section={`${ctx.side}-${spec.id}`}
            className="ws-section"
            onKeyDown={
                slot === undefined
                    ? undefined
                    : (event) => {
                          pasteKey(event, setPaste);
                      }
            }
        >
            <ControlSection
                label={spec.title}
                headingLevel={3}
                empty={set.length + pending.length === 0 && (slot === undefined || !slotIsSet(ctx, slot))}
                collapsible={false}
                actions={
                    <AddButton
                        kind={ctx.side}
                        title={spec.title}
                        options={addOptions(ctx, unset, slot, sprite)}
                        blocked={sprite === undefined ? undefined : materialBlockedWords(sprite.plainName)}
                        expanded={gallery}
                        onAdd={(key) => {
                            if (slot !== undefined && key === "shader:gallery") {
                                setGallery(true);
                                return;
                            }
                            if (slot !== undefined && key.startsWith("shader:")) {
                                slotAdd(ctx, slot, key).catch((error: unknown) => {
                                    store.set({
                                        notice: { message: failureWords(spec.title, "changed", error), error: true },
                                    });
                                });
                                return;
                            }
                            const [channel, pick] = key.split("=");
                            const descriptor = unset.find((d) => d.channel === channel);
                            if (descriptor !== undefined) {
                                add(descriptor, ...(pick === undefined ? [] : [pick === "true"]));
                            }
                        }}
                    />
                }
            >
                {lines.map((d) => (
                    <Field
                        key={d.channel}
                        ctx={ctx}
                        descriptor={d}
                        pending={pending.includes(d)}
                        onCancel={() => {
                            setWaiting((now) => now.filter((channel) => channel !== d.channel));
                        }}
                    />
                ))}
                {slot === undefined
                    ? null
                    : shaders.map((entry) => (
                          <ShaderRow key={entry.key} ctx={ctx} slot={slot} entry={entry} onPaste={setPaste} />
                      ))}
            </ControlSection>
            {slot === undefined ? null : (
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
                        width={240}
                        placement="left"
                        alignment="start"
                        anchorY={sectionBox}
                        boundaryTop={gallery ? headerBottom() : 0}
                        header={{ variant: "title", title: slot.word }}
                    >
                        <Popout.Content>
                            <SlotGallery
                                ctx={ctx}
                                slot={slot}
                                title={slot.word}
                                onPaste={() => {
                                    setGallery(false);
                                    setPaste({});
                                }}
                                onPick={(id) => {
                                    setGallery(false);
                                    pickShader(ctx, slot, id).catch((error: unknown) => {
                                        store.set({
                                            notice: {
                                                message: failureWords(slot.word, "added", error),
                                                error: true,
                                            },
                                        });
                                    });
                                }}
                            />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            )}
            {slot !== undefined && paste !== null && (
                <PasteShaderDialog
                    session={ctx.session}
                    kinds={slot.kinds}
                    put={(scope, id, params) => pickShader({ ...ctx, session: scope }, slot, id, undefined, params)}
                    init={paste}
                    onClose={() => {
                        setPaste(null);
                    }}
                />
            )}
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
 * Control+V (Command+V) with focus on a control of a shader section, not in a text field: opens
 * Paste shader with the clipboard's text, or with the unsent draft when the browser will not read
 * the clipboard.
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
 * @param props.blocked - why it adds nothing, when that is not that everything is set
 * @param props.expanded - whether the pop-out its one item opens is open (a shader gallery)
 * @returns The button and its menu
 */
export function AddButton({
    kind,
    title,
    options,
    onAdd,
    blocked,
    expanded,
}: Readonly<{
    kind: "node" | "edge";
    title: string;
    options: readonly AddOption[];
    onAdd: (key: string) => void;
    blocked?: string;
    expanded?: boolean;
}>): React.JSX.Element {
    const name = `Add to ${kind} ${title.toLowerCase()}`;
    const full = options.length === 0;
    const reason = blocked ?? `Everything in ${kind} ${title.toLowerCase()} is set`;
    const button = (
        <ActionIcon
            variant="subtle"
            size="sm"
            className="cm-section-add"
            aria-label={name}
            aria-disabled={full ? true : undefined}
            data-disabled={full ? true : undefined}
            aria-description={full ? reason : undefined}
            tabIndex={full ? -1 : undefined}
            data-plus
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
                <Tooltip label={name}>{button}</Tooltip>
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
