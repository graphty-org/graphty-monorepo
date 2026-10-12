import { CompactColorInput, Popout, PopoutButton, StyleNumberInput, ToggleIconButton } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Group, Menu, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { Field, type RowContext } from "./PropertyRow";
import { lineOf, removeLine, sharesBeneath, type Target, writeLine } from "./row";
import { hexOf } from "./words";

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
 * opens its value field with focus in it and writes nothing until a value is chosen; Escape leaves
 * nothing behind. Each entry has an eye that writes the effect's off value (it covers what the
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
    const { session, row, side: target, layers, fresh } = ctx;
    const descriptors = channelsFor(target);
    const descriptorOf = (channel: Channel): ChannelDescriptor | undefined =>
        descriptors.find((d) => d.channel === channel);
    const fail = (): void => {
        store.set({ notice: { message: "The effect could not be changed" } });
    };
    const ownLine = (channel: Channel): ReturnType<typeof lineOf> => {
        const line = lineOf(layers, channel);
        return line === undefined || line.layer.locked ? undefined : line;
    };
    const present = (kind: EffectKind): boolean =>
        [kind.channel, ...kind.settings].some((c) => ownLine(c) !== undefined);
    const write = (channel: Channel, value: ChannelValue): Promise<LayerId> =>
        writeLine(session, row, target, channel, { value }, fresh);
    const kinds = KINDS[target];
    const shown = kinds.filter((kind) => present(kind) || adding === kind.channel);
    const empty = shown.length === 0;
    const groupName = `${target === "node" ? "Node" : "Edge"} effects`;
    const title = (
        <Text size="xs" fw={600} pl={4} c={empty ? "dimmed" : undefined}>
            Effects
        </Text>
    );

    return (
        <Stack gap={2} role="group" aria-label={groupName} data-section="effects">
            <Menu opened={menuOpen} onChange={setMenuOpen} position="bottom-end">
                <Group gap={4} h={24} wrap="nowrap" justify="space-between">
                    {/* An empty list's title opens the "+" menu too, as Figma's empty Fill title does. */}
                    {empty ? (
                        <UnstyledButton
                            aria-label={`Add ${target} effect`}
                            onClick={() => {
                                setMenuOpen(true);
                            }}
                        >
                            {title}
                        </UnstyledButton>
                    ) : (
                        title
                    )}
                    <Menu.Target>
                        <Tooltip label="Add effect">
                            <ActionIcon variant="subtle" size="sm" aria-label={`Add to ${groupName.toLowerCase()}`}>
                                <GLYPHS.add size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    </Menu.Target>
                </Group>
                <Menu.Dropdown>
                    {kinds.map((kind) => {
                        const descriptor = descriptorOf(kind.channel);
                        let reason: string | undefined;
                        if (descriptor?.renderable !== true) {
                            reason = descriptor?.unsupportedReason ?? "Not drawn yet";
                        } else if (present(kind) || adding === kind.channel) {
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
                        pending={!present(kind)}
                        settings={kind.settings.flatMap((c) => descriptorOf(c) ?? [])}
                        onCancel={() => {
                            setAdding(null);
                        }}
                        onWrite={(value) => {
                            write(kind.channel, value)
                                .then(() => {
                                    setAdding(null);
                                })
                                .catch(fail);
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
                            <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
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
    /** Picked from the menu and not written yet: its field takes focus, Escape drops it. */
    pending: boolean;
    /** The element's descriptors of its settings. */
    settings: readonly ChannelDescriptor[];
    onCancel: () => void;
    /** Writes the entry's own value. */
    onWrite: (value: ChannelValue) => void;
    onRemove: () => void;
}

/**
 * One effect: the settings button (where the effect has settings), its value (a color, or Motion's
 * speed), the eye and the minus.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.kind - the effect
 * @param props.descriptor - the element's descriptor of its channel
 * @param props.value - what this row writes for it
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
    pending,
    settings,
    onCancel,
    onWrite,
    onRemove,
}: Readonly<EffectEntryProps>): React.JSX.Element {
    const box = useRef<HTMLDivElement>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const off = isOff(value, descriptor.off);
    const color = descriptor.accepts === "color";
    // The value the eye turns back on to, and the field's own default.
    // ponytail: the eye forgets the color it turned off; it comes back as the element's default.
    const onValue: ChannelValue = descriptor.default ?? descriptor.min ?? 1;
    useEffect(() => {
        if (pending) {
            box.current?.querySelector<HTMLInputElement>("input[type=text], input:not([type])")?.focus();
        }
    }, [pending]);
    return (
        <Group
            ref={box}
            gap={4}
            pl={4}
            wrap="nowrap"
            align="flex-end"
            data-line={descriptor.channel}
            data-hidden={off ? true : undefined}
            // Captured: the hex box handles its own Escape (a revert) and stops it there.
            onKeyDownCapture={(event) => {
                if (pending && event.key === "Escape") {
                    onCancel();
                }
            }}
        >
            {settings.length === 0 ? null : (
                <Popout opened={settingsOpen} onOpenChange={setSettingsOpen}>
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
                            <Stack gap={6}>
                                {settings.map((d) => (
                                    <Field key={d.channel} ctx={ctx} descriptor={d} />
                                ))}
                            </Stack>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                {color ? (
                    <CompactColorInput
                        label={kind.name}
                        width="100%"
                        color={off ? undefined : (hexOf(value) ?? undefined)}
                        defaultColor={hexOf(descriptor.default) ?? "#000000"}
                        showOpacity={false}
                        showReset={false}
                        swatches={ctx.documentColors}
                        onChangeEnd={(next) => {
                            if (next !== undefined) {
                                onWrite(next);
                            }
                        }}
                    />
                ) : (
                    <StyleNumberInput
                        label={`${kind.name} speed`}
                        value={typeof value === "number" && !off ? value : undefined}
                        defaultValue={typeof onValue === "number" ? onValue : 1}
                        min={descriptor.min}
                        step={0.1}
                        onChange={(next) => {
                            if (next !== undefined) {
                                onWrite(next);
                            }
                        }}
                    />
                )}
            </div>
            {pending ? null : (
                <>
                    <ToggleIconButton
                        variant="swap"
                        label={`Hide ${kind.name.toLowerCase()}`}
                        checked={off}
                        icon={<GLYPHS.show size={14} />}
                        checkedIcon={<GLYPHS.hide size={14} />}
                        onChange={(hide) => {
                            onWrite(hide ? (descriptor.off ?? onValue) : onValue);
                        }}
                    />
                    <Tooltip label={`Remove ${kind.name.toLowerCase()}`}>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={`Remove ${kind.name.toLowerCase()}`}
                            onClick={onRemove}
                        >
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </>
            )}
        </Group>
    );
}
