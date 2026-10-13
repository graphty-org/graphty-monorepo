import { CompactColorInput, Popout, PopoutButton, ToggleIconButton } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Group, Menu, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { Field, type RowContext } from "./PropertyRow";
import { lineIn, type lineOf, removeLine, sharesBeneath, type Target, writeIn } from "./row";
import { channelWord, hexOf } from "./words";

/** The width of an entry's settings pop-out, as the property rows'. */
const POPOUT_WIDTH = 248;

/** One kind of effect: the channel its entry's value writes, and the settings behind its button. */
interface EffectKind {
    readonly name: string;
    readonly glyph: (typeof GLYPHS)[keyof typeof GLYPHS];
    /** The channel the entry's own value writes: a color, or Motion's speed. */
    readonly channel: Channel;
    /** The rarer numbers behind the entry's settings button. */
    readonly settings: readonly Channel[];
}

/** The effects of each kind, in the order the "+" menu lists them (tier3 design, section 2.2). */
const KINDS: Readonly<Record<Target, readonly EffectKind[]>> = {
    node: [
        { name: "Outline", glyph: GLYPHS.outline, channel: "node.outline", settings: [] },
        {
            name: "Glow",
            glyph: GLYPHS.glow,
            channel: "node.glow",
            settings: ["node.glowStrength"],
        },
        {
            name: "Halo",
            glyph: GLYPHS.halo,
            channel: "node.haloColor",
            settings: ["node.haloSize", "node.haloOpacity"],
        },
    ],
    edge: [
        {
            name: "Band",
            glyph: GLYPHS.band,
            channel: "edge.bandColor",
            settings: ["edge.bandWidth", "edge.bandOpacity"],
        },
        { name: "Motion", glyph: GLYPHS.motion, channel: "edge.animationSpeed", settings: [] },
    ],
};

/**
 * Whether a value is the channel's value that draws nothing (`ChannelDescriptor.off`): `"none"`
 * as written, a resolved color whose hex is `"none"`, or Motion's 0.
 * @param value - the value, as written or as resolved.
 * @param off - the channel's off value.
 * @returns true when it draws nothing.
 */
function isOff(value: unknown, off: string | number | undefined): boolean {
    if (off === undefined) {
        return false;
    }
    if (typeof value === "object" && value !== null && "hex" in value) {
        return value.hex === off;
    }
    return value === off;
}

/**
 * The Effects list of one kind (tier3 design, sections 1.2 and 2.2): Outline, Glow and Halo on
 * nodes, Band and Motion on edges, one of each. "+" (and the title, while the list is empty) opens
 * a menu with a glyph per effect; an effect already here is disabled with its reason. Picking one
 * opens its settings with focus in its value and writes nothing until a value is chosen; Escape
 * leaves nothing behind and puts focus back on "+". Each entry has an eye that writes the effect's off value (it covers what the
 * layers beneath write) and a minus that takes the entry away. An effect a layer beneath writes,
 * while this row has none, is a gray line whose eye adds an off entry here.
 * The settings behind an entry's button are fields like every other, each with its own Clear.
 * @param props - Component props
 * @param props.ctx - the row and side
 * @returns The list
 */
export function Effects({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [menuOpen, setMenuOpen] = useState(false);
    const [adding, setAdding] = useState<Channel | null>(null);
    // Focus goes back to "+" once a pending entry is dropped: its own controls go with it.
    const [refocus, setRefocus] = useState(false);
    const list = useRef<HTMLDivElement>(null);
    const { session, side: target, layers } = ctx;
    const descriptors = channelsFor(target);
    const descriptorOf = (channel: Channel): ChannelDescriptor | undefined =>
        descriptors.find((d) => d.channel === channel);
    const fail = (): void => {
        store.set({ notice: { message: "The effect could not be changed" } });
    };
    const ownLine = (channel: Channel): ReturnType<typeof lineOf> => {
        const line = lineIn(ctx, channel);
        return line === undefined || line.layer.locked ? undefined : line;
    };
    const present = (kind: EffectKind): boolean =>
        [kind.channel, ...kind.settings].some((c) => ownLine(c) !== undefined);
    const write = (channel: Channel, value: ChannelValue): Promise<unknown> => writeIn(ctx, channel, { value });
    const kinds = KINDS[target];
    // A picked entry is the row's own once its value is written, wherever it was written from.
    const written = adding !== null && kinds.some((kind) => kind.channel === adding && present(kind));
    useEffect(() => {
        if (written) {
            setAdding(null);
        }
    }, [written]);
    useEffect(() => {
        if (refocus) {
            setRefocus(false);
            list.current?.querySelector<HTMLElement>("[data-plus]")?.focus();
        }
    }, [refocus]);
    const shown = kinds.filter((kind) => present(kind) || adding === kind.channel);
    const empty = shown.length === 0;
    const groupName = `${target === "node" ? "Node" : "Edge"} effects`;
    // The kinds "+" can still add: drawn, and not already here.
    const addable = kinds.filter(
        (kind) => descriptorOf(kind.channel)?.renderable === true && !present(kind) && adding !== kind.channel,
    );
    const onAdd = (): void => {
        if (addable.length === 1) {
            setAdding(addable[0].channel);
        } else if (addable.length > 1) {
            setMenuOpen(true);
        }
    };
    // One "+" per list. A menu that would list one effect is that effect's own button.
    let plusName = `Add to ${groupName.toLowerCase()}`;
    if (addable.length === 0) {
        plusName = `${groupName}: every effect already here`;
    } else if (addable.length === 1) {
        plusName = `Add ${addable[0].name.toLowerCase()}`;
    }
    const plusButton = (
        <Tooltip label={plusName}>
            <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={plusName}
                data-plus
                aria-disabled={addable.length === 0 ? true : undefined}
                data-disabled={addable.length === 0 ? true : undefined}
                // Only the direct button handles its own click; in the menu's case the menu does.
                {...(addable.length === 1 ? { onClick: onAdd } : {})}
            >
                <GLYPHS.add size={14} aria-hidden />
            </ActionIcon>
        </Tooltip>
    );
    const title = (
        <Text size="xs" fw={600} pl={4}>
            Effects
        </Text>
    );

    return (
        <Stack ref={list} gap={2} role="group" aria-label={groupName} data-section="effects">
            <Group gap={4} h={24} wrap="nowrap" justify="space-between">
                {empty ? (
                    // For a pointer, an empty list's title does what "+" does (Figma's empty Fill
                    // title); the "+" is the one control a keyboard or a screen reader reaches.
                    <UnstyledButton tabIndex={-1} aria-hidden onClick={onAdd}>
                        {title}
                    </UnstyledButton>
                ) : (
                    title
                )}
                {addable.length > 1 ? (
                    <Menu opened={menuOpen} onChange={setMenuOpen} position="bottom-end">
                        <Menu.Target>{plusButton}</Menu.Target>
                        <Menu.Dropdown>
                            {kinds.map((kind) => {
                                const descriptor = descriptorOf(kind.channel);
                                let reason: string | undefined;
                                if (descriptor?.renderable !== true) {
                                    reason = descriptor?.unsupportedReason ?? "Not drawn yet";
                                } else if (!addable.includes(kind)) {
                                    reason = `One ${kind.name.toLowerCase()} per element`;
                                }
                                return (
                                    <Menu.Item
                                        key={kind.channel}
                                        leftSection={<kind.glyph size={14} aria-hidden />}
                                        disabled={reason !== undefined}
                                        onClick={() => {
                                            setAdding(kind.channel);
                                        }}
                                    >
                                        <div>{kind.name}</div>
                                        {reason === undefined ? null : (
                                            <Text size="xs" c="dimmed">
                                                {reason}
                                            </Text>
                                        )}
                                    </Menu.Item>
                                );
                            })}
                        </Menu.Dropdown>
                    </Menu>
                ) : (
                    plusButton
                )}
            </Group>
            {shown.map((kind) => {
                const descriptor = descriptorOf(kind.channel);
                if (descriptor === undefined) {
                    return null;
                }
                const line = ownLine(kind.channel);
                return (
                    <EffectEntry
                        key={kind.channel}
                        ctx={ctx}
                        kind={kind}
                        descriptor={descriptor}
                        value={line?.value}
                        bound={line?.binding !== undefined}
                        pending={!present(kind)}
                        settings={kind.settings.flatMap((c) => descriptorOf(c) ?? [])}
                        onCancel={() => {
                            setAdding(null);
                            setRefocus(true);
                        }}
                        onWrite={(value) => {
                            write(kind.channel, value).catch(fail);
                        }}
                        onRemove={() => {
                            removeOwn(layers, [kind.channel, ...kind.settings], session).catch(fail);
                        }}
                    />
                );
            })}
            {kinds
                .filter((kind) => !shown.includes(kind))
                .map((kind) => {
                    const off = descriptorOf(kind.channel)?.off;
                    const names = [
                        ...new Set(
                            sharesBeneath(session, layers, kind.channel)
                                .filter((share) => !isOff(share.value, off))
                                .map((share) => share.name),
                        ),
                    ];
                    if (names.length === 0 || off === undefined) {
                        return null;
                    }
                    const from = names.join(" and ");
                    return (
                        <Group key={kind.channel} gap={4} pl={4} wrap="nowrap" data-beneath={kind.channel}>
                            <kind.glyph size={14} aria-hidden style={{ opacity: 0.5 }} />
                            <Text size="sm" c="var(--cm-text-secondary)" truncate style={{ flex: 1 }}>
                                {`${kind.name}, from ${from}`}
                            </Text>
                            <ToggleIconButton
                                variant="swap"
                                label={`Hide ${kind.name.toLowerCase()} from ${from}`}
                                checked={false}
                                icon={<GLYPHS.show size={14} />}
                                checkedIcon={<GLYPHS.hide size={14} />}
                                onChange={(hide) => {
                                    if (hide) {
                                        write(kind.channel, off).catch(fail);
                                    }
                                }}
                            />
                        </Group>
                    );
                })}
        </Stack>
    );
}

/**
 * A setting's name inside its effect's pop-out: "Width" for "Band width".
 * @param channel - the setting.
 * @param kind - the effect.
 * @returns the name.
 */
function shortWord(channel: Channel, kind: EffectKind): string {
    const word = channelWord(channel).replace(new RegExp(`^${kind.name} `, "i"), "");
    return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Takes channels off the row's layers that write them, layer by layer.
 * @param layers - the row's layers on this side.
 * @param channels - the channels.
 * @param session - the element's session.
 */
async function removeOwn(layers: readonly Layer[], channels: readonly Channel[], session: GraphSession): Promise<void> {
    for (const layer of layers) {
        const held = channels.filter((c) => layer.set?.[c] !== undefined || layer.encode?.[c] !== undefined);
        if (!layer.locked && held.length > 0) {
            await removeLine(session, layer, ...held);
        }
    }
}

/** Props for EffectEntry. */
interface EffectEntryProps {
    /** The row, for the settings' own fields. */
    ctx: RowContext;
    kind: EffectKind;
    descriptor: ChannelDescriptor;
    /** What this row writes for the entry's own channel, if anything. */
    value: ChannelValue | undefined;
    /** Whether the entry's own channel varies by a value: the chip then gives way to its glyph. */
    bound?: boolean;
    /** Picked from the menu and not written yet: its settings open with focus in its value. */
    pending: boolean;
    /** The element's descriptors of its settings. */
    settings: readonly ChannelDescriptor[];
    /** Drops a pending entry; focus goes back to the list's "+". */
    onCancel: () => void;
    /** Writes the entry's own value. */
    onWrite: (value: ChannelValue) => void;
    onRemove: () => void;
}

/**
 * One effect on one line, as Figma draws an effect row: a color chip (or the effect's glyph, for
 * Motion and for a color that varies by a value), the effect's name, its settings button, the eye
 * and the minus. Every value of the effect -- its color or speed, with its vary glyph, then its
 * strength, size or opacity -- is a field in the settings pop-out, each with its own Clear. An
 * entry just picked from the "+" menu opens its settings at once with focus in its value; closing
 * them before a value is written drops it.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.kind - the effect
 * @param props.descriptor - the element's descriptor of its channel
 * @param props.value - what this row writes for it
 * @param props.bound - whether its own channel varies by a value
 * @param props.pending - whether it is picked and not written yet
 * @param props.settings - its settings
 * @param props.onCancel - drops a pending entry
 * @param props.onWrite - writes its value
 * @param props.onRemove - takes the entry away
 * @returns The entry
 */
function EffectEntry({
    ctx,
    kind,
    descriptor,
    value,
    bound = false,
    pending,
    settings,
    onCancel,
    onWrite,
    onRemove,
}: Readonly<EffectEntryProps>): React.JSX.Element {
    const [settingsOpen, setSettingsOpen] = useState(pending);
    const off = isOff(value, descriptor.off);
    const noun = kind.name.toLowerCase();
    // The value the eye turns back on to.
    // ponytail: the eye forgets the color it turned off; it comes back as the element's default.
    const onValue: ChannelValue = descriptor.default ?? descriptor.min ?? 1;
    const lead =
        descriptor.accepts === "color" && !bound ? (
            <CompactColorInput
                variant="chip"
                aria-label={kind.name}
                color={off ? undefined : (hexOf(value) ?? undefined)}
                defaultColor={hexOf(descriptor.default) ?? "#000000"}
                showOpacity={false}
                swatches={ctx.documentColors}
                onChangeEnd={(next) => {
                    if (next !== undefined) {
                        onWrite(next.toUpperCase());
                    }
                }}
            />
        ) : (
            <span className="ws-slot" aria-hidden>
                <kind.glyph size={14} />
            </span>
        );
    // A new entry: the pop-out starts in its value (the pop-out's data-autofocus), so typing a hex
    // or a speed writes it.
    const onPanel = (node: HTMLDivElement | null): void => {
        node?.querySelector(`[data-line="${descriptor.channel}"] input`)?.toggleAttribute("data-autofocus", pending);
    };
    return (
        <Group
            className="ws-effect"
            gap={4}
            pl={4}
            wrap="nowrap"
            align="center"
            data-effect={kind.name}
            data-line={descriptor.channel}
            data-hidden={off ? true : undefined}
        >
            {lead}
            <Text size="sm" style={{ flex: 1, minWidth: 0 }} truncate aria-hidden>
                {kind.name}
            </Text>
            <Popout
                opened={settingsOpen}
                onOpenChange={(open) => {
                    setSettingsOpen(open);
                    if (!open && pending) {
                        onCancel();
                    }
                }}
            >
                <Popout.Trigger>
                    <Tooltip label={`${kind.name} settings`}>
                        <PopoutButton
                            icon={<GLYPHS.settings size={14} aria-hidden />}
                            aria-label={`${kind.name} settings`}
                            aria-haspopup="dialog"
                            aria-expanded={settingsOpen}
                        />
                    </Tooltip>
                </Popout.Trigger>
                <Popout.Panel
                    width={POPOUT_WIDTH}
                    placement="left"
                    alignment="start"
                    header={{ variant: "title", title: `${kind.name} settings` }}
                >
                    <Popout.Content>
                        <div ref={onPanel}>
                            <Stack gap={0}>
                                {/* Named without the effect's name, which the pop-out's title gives. */}
                                <Field
                                    ctx={ctx}
                                    descriptor={descriptor}
                                    word={descriptor.accepts === "color" ? "Color" : "Speed"}
                                />
                                {settings.map((d) => (
                                    <Field key={d.channel} ctx={ctx} descriptor={d} word={shortWord(d.channel, kind)} />
                                ))}
                            </Stack>
                        </div>
                    </Popout.Content>
                </Popout.Panel>
            </Popout>
            {pending ? null : (
                <>
                    <ToggleIconButton
                        variant="swap"
                        label={`Hide ${noun}`}
                        checked={off}
                        icon={<GLYPHS.show size={14} />}
                        checkedIcon={<GLYPHS.hide size={14} />}
                        onChange={(hide) => {
                            onWrite(hide ? (descriptor.off ?? onValue) : onValue);
                        }}
                    />
                    <Tooltip label={`Remove ${noun}`}>
                        <ActionIcon variant="subtle" size="sm" aria-label={`Remove ${noun}`} onClick={onRemove}>
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </>
            )}
        </Group>
    );
}
