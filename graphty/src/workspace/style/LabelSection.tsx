import {
    Popout,
    PopoutButton,
    StyleNumberInput,
    StyleSelect,
    ToggleIconButton,
    VariablePill,
} from "@graphty/compact-mantine";
import { channelsFor, LABEL_LOOKS, labelLookChanges } from "@graphty/graphty-element/catalog";
import type { Channel, LabelStyle, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, Group, Menu, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { LabelSettings } from "./LabelSettings";
import {
    type DataBinding,
    type DataChoice,
    type Line,
    lineOf,
    type NewLayer,
    propose,
    readsNothing,
    removeLine,
    sourceName,
    type Target,
    writeLine,
} from "./row";
import { focusLineNext, focusSectionNext } from "./useFocusLine";
import { ValuePicker } from "./ValuePicker";
import { labelStatement, positionWord } from "./words";

/** Props for LabelSection. */
interface LabelSectionProps {
    /** Nodes or edges. */
    target: Target;
    /** The row's layers. */
    row: readonly LayerId[];
    /** The row's layers on this side, bottom first. */
    layers: readonly Layer[];
    /** The layer the row's first edit adds, when it is not the Everything row. */
    fresh?: NewLayer;
}

/** The label's channels, by target: its words, its style, and its size. */
const CHANNELS = {
    node: { label: "node.label", style: "node.labelStyle", size: "node.labelSize" },
    edge: { label: "edge.label", style: "edge.labelStyle", size: "edge.labelSize" },
} as const satisfies Record<Target, { label: Channel; style: Channel; size: Channel }>;

/** Why "+" adds no second label. */
const ONE_LABEL = "One label per element";

/** The width of the entry's pop-outs: the source list as wide as the panel's rows, the settings wider. */
const LIST_WIDTH = 248;
const SETTINGS_WIDTH = 280;

/** Where a label can sit, in the order the position select lists them. */
const LOCATIONS = [
    "top",
    "top-right",
    "right",
    "bottom-right",
    "bottom",
    "bottom-left",
    "left",
    "top-left",
    "center",
    "automatic",
] as const satisfies readonly NonNullable<LabelStyle["location"]>[];

/**
 * A layer's label style as written, or an empty one.
 * @param line - the line that writes the style channel, if any.
 * @returns the style.
 */
function styleOf(line: Line | undefined): LabelStyle {
    const value = line?.value;
    return typeof value === "object" && !("r" in value) ? value : {};
}

/**
 * The names of the layers beneath the row that write this kind's label words: graphty-element's
 * own answer of what lies beneath the row (`styles.agreement` with `below`), over the whole graph.
 * ponytail: read over the whole graph, not the row's own elements (no scope names a layer's
 * matches); scope it when the element offers one.
 * @param session - the element's session.
 * @param layers - the row's layers on this side, bottom first.
 * @param channel - the label channel.
 * @returns the layers' names, empty when nothing beneath writes a label or the row has no layer yet.
 */
function writtenBeneath(session: GraphSession, layers: readonly Layer[], channel: Channel): string[] {
    const own = layers.find((layer) => !layer.locked);
    if (own === undefined) {
        return [];
    }
    let channels: ReturnType<GraphSession["styles"]["agreement"]>["channels"];
    try {
        ({ channels } = session.styles.agreement("graph", channel, { below: own.row ?? own.id }));
    } catch {
        // A row the element's tree does not hold (a run's own layers) has no "beneath" to read.
        return [];
    }
    const ids = channels.flatMap((found) => {
        if (found.state === "agree") {
            return found.value === undefined ? [] : [found.layerId];
        }
        return found.breakdown.filter((share) => share.value !== undefined).map((share) => share.layerId);
    });
    return [...new Set(ids)].map((id) => session.styles.get(id)?.name ?? id);
}

/**
 * The Text list of one kind (design 2.3): a label entry, or none. "+" (and the title, while the
 * list is empty) opens a menu of what can be added; Label opens the source picker, and nothing is
 * written until a source is picked. While this row has no entry, a label a layer beneath writes
 * shows as a gray line whose eye adds an entry here that draws no label on these elements.
 * ponytail: Label is the only kind in the menu; the Tooltip and the edge captions join it when
 * their own sections move into this list.
 * @param props - Component props
 * @param props.target - nodes or edges
 * @param props.row - the row's layers
 * @param props.layers - the row's layers on this side
 * @param props.fresh - the layer the row's first edit adds, when the row adds one
 * @returns The section
 */
export function LabelSection({ target, row, layers, fresh }: Readonly<LabelSectionProps>): React.JSX.Element | null {
    const { session, element, store } = useWorkspace();
    const [menuOpen, setMenuOpen] = useState(false);
    const [picking, setPicking] = useState(false);
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
    if (session === null) {
        return null;
    }
    const channels = CHANNELS[target];
    const words = lineOf(layers, channels.label);
    const styleLine = lineOf(layers, channels.style);
    const style = styleOf(styleLine);
    const hasEntry = words !== undefined || styleLine !== undefined;
    const beneath = hasEntry ? [] : writtenBeneath(session, layers, channels.label);
    const fail = (): void => {
        store.set({ notice: { message: "The label could not be changed" } });
    };
    const writeStyle = (patch: Partial<LabelStyle>): void => {
        const next = Object.fromEntries(
            Object.entries({ ...style, ...patch }).filter(([, value]) => value !== undefined),
        ) as LabelStyle;
        const done =
            Object.keys(next).length === 0 && styleLine !== undefined
                ? removeLine(session, styleLine.layer, channels.style)
                : writeLine(session, row, target, channels.style, { value: next }, fresh);
        done.catch(fail);
    };
    const pick = (choice: DataChoice): void => {
        setPicking(false);
        const proposal = propose(session, choice, channels.label);
        if (proposal.ok) {
            focusLineNext(channels.label, true);
            writeLine(session, row, target, channels.label, { binding: proposal.binding }, fresh).catch(() => {
                focusLineNext(null);
                fail();
            });
        }
    };
    const title = (
        <Text size="xs" fw={600} pl={4}>
            Text
        </Text>
    );

    return (
        <Stack gap={2} role="group" aria-label="Text" data-section="label">
            <Menu opened={menuOpen} onChange={setMenuOpen} position="bottom-end">
                <Group gap={4} h={24} wrap="nowrap" justify="space-between">
                    {/* An empty list's title opens the "+" menu too, as Figma's empty Fill title does. */}
                    {hasEntry || picking ? (
                        title
                    ) : (
                        <UnstyledButton
                            aria-label="Add text"
                            onClick={() => {
                                setMenuOpen(true);
                            }}
                        >
                            {title}
                        </UnstyledButton>
                    )}
                    <Menu.Target>
                        <Tooltip label="Add text">
                            <ActionIcon variant="subtle" size="sm" aria-label="Add to Text">
                                <GLYPHS.add size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    </Menu.Target>
                </Group>
                <Menu.Dropdown>
                    <Menu.Item
                        leftSection={<GLYPHS.category size={14} aria-hidden />}
                        disabled={hasEntry}
                        onClick={() => {
                            setPicking(true);
                        }}
                    >
                        <div>Label</div>
                        {hasEntry ? (
                            <Text size="xs" c="dimmed">
                                {ONE_LABEL}
                            </Text>
                        ) : null}
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
            {picking && !hasEntry ? (
                <SourcePicker target={target} channel={channels.label} opened onOpenChange={setPicking} onPick={pick}>
                    <Button size="compact-xs" variant="default" c="dimmed" fullWidth justify="flex-start">
                        Pick a value
                    </Button>
                </SourcePicker>
            ) : null}
            {hasEntry ? (
                <LabelEntry
                    session={session}
                    target={target}
                    words={words}
                    style={style}
                    styleLine={styleLine}
                    size={lineOf(layers, channels.size)}
                    beneath={writtenBeneath(session, layers, channels.label)}
                    onPick={pick}
                    onStyle={writeStyle}
                    onSize={(write) => {
                        const line = lineOf(layers, channels.size);
                        if (write !== undefined) {
                            writeLine(session, row, target, channels.size, write, fresh).catch(fail);
                        } else if (line !== undefined) {
                            removeLine(session, line.layer, channels.size).catch(fail);
                        }
                    }}
                    onRemove={() => {
                        removeEntry(session, layers, Object.values(channels)).catch(fail);
                    }}
                />
            ) : null}
            {beneath.length > 0 && !picking ? (
                <Group gap={4} pl={4} wrap="nowrap" data-beneath={channels.label}>
                    <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
                        {`Label, from ${beneath.join(" and ")}`}
                    </Text>
                    <ToggleIconButton
                        variant="swap"
                        label={`Hide label from ${beneath.join(" and ")}`}
                        checked={false}
                        icon={<GLYPHS.show size={14} />}
                        checkedIcon={<GLYPHS.hide size={14} />}
                        onChange={(hide) => {
                            if (hide) {
                                writeStyle({ enabled: false });
                            }
                        }}
                    />
                </Group>
            ) : null}
            {words !== undefined && target === "node" && element !== null ? (
                <Group gap={8} pl={4} wrap="nowrap">
                    <Text size="xs" c="dimmed" aria-live="polite">
                        {labelStatement(element.nodeLabelCounts, !allLabelsShown)}
                    </Text>
                    <Checkbox
                        size="xs"
                        ml="auto"
                        label="Show all labels"
                        checked={allLabelsShown}
                        onChange={(event) => {
                            store.set({ allLabelsShown: event.currentTarget.checked });
                        }}
                    />
                </Group>
            ) : null}
        </Stack>
    );
}

/**
 * Removes every channel of the label from the row's layers that write it, layer by layer.
 * @param session - the element's session.
 * @param layers - the row's layers on this side.
 * @param channels - the label's channels.
 */
async function removeEntry(
    session: GraphSession,
    layers: readonly Layer[],
    channels: readonly Channel[],
): Promise<void> {
    for (const layer of layers) {
        const held = channels.filter((c) => layer.set?.[c] !== undefined || layer.encode?.[c] !== undefined);
        if (!layer.locked && held.length > 0) {
            await removeLine(session, layer, ...held);
        }
    }
}

/**
 * The source list in a pop-out, docked to its trigger.
 * @param props - Component props
 * @param props.target - nodes or edges
 * @param props.channel - the channel the pick goes on
 * @param props.opened - whether it is open
 * @param props.onOpenChange - opens or closes it
 * @param props.onPick - called with the pick
 * @param props.inUse - the path already read, listed first
 * @param props.title - the pop-out's title
 * @param props.children - the trigger
 * @returns The pop-out
 */
function SourcePicker({
    target,
    channel,
    opened,
    onOpenChange,
    onPick,
    inUse = [],
    title = "Label",
    children,
}: Readonly<{
    target: Target;
    channel: Channel;
    opened: boolean;
    onOpenChange: (open: boolean) => void;
    onPick: (choice: DataChoice) => void;
    inUse?: readonly string[];
    title?: string;
    children: React.ReactElement;
}>): React.JSX.Element {
    return (
        <Popout opened={opened} onOpenChange={onOpenChange}>
            <Popout.Trigger>{children}</Popout.Trigger>
            <Popout.Panel width={LIST_WIDTH} placement="left" alignment="start" header={{ variant: "title", title }}>
                <ValuePicker
                    target={target}
                    channel={channel}
                    inUse={inUse}
                    onPick={onPick}
                    onClose={() => {
                        onOpenChange(false);
                    }}
                />
            </Popout.Panel>
        </Popout>
    );
}

/** Props for LabelEntry. */
interface LabelEntryProps {
    session: GraphSession;
    target: Target;
    /** The line that writes the words, if this row writes them. */
    words: Line | undefined;
    /** The label style this row writes. */
    style: LabelStyle;
    /** The line that writes the style, if any. */
    styleLine: Line | undefined;
    /** The line that writes the label size, if any. */
    size: Line | undefined;
    /** The layers beneath that write label words, for an entry that writes none of its own. */
    beneath: readonly string[];
    onPick: (choice: DataChoice) => void;
    /** Writes fields of the style; a field given as undefined is cleared. */
    onStyle: (patch: Partial<LabelStyle>) => void;
    /** Writes the size, or clears it with undefined. */
    onSize: (write: { value: number } | { binding: DataBinding } | undefined) => void;
    onRemove: () => void;
}

/**
 * One label entry at rest (design 2.3), two lines. Line 1: the settings button, the source, the
 * eye (`LabelStyle.enabled`), the minus. Line 2: the look (previews; "Card, edited" while a field
 * differs, from graphty-element's `labelLookChanges`), the size with its vary glyph, the position.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.target - nodes or edges
 * @param props.words - the line that writes the words, if this row writes them
 * @param props.style - the label style this row writes
 * @param props.styleLine - the line that writes the style, if any
 * @param props.size - the line that writes the label size, if any
 * @param props.beneath - the layers beneath that write label words
 * @param props.onPick - called with a new source
 * @param props.onStyle - writes fields of the style
 * @param props.onSize - writes or clears the size
 * @param props.onRemove - removes the entry
 * @returns The entry
 */
function LabelEntry({
    session,
    target,
    words,
    style,
    styleLine,
    size,
    beneath,
    onPick,
    onStyle,
    onSize,
    onRemove,
}: Readonly<LabelEntryProps>): React.JSX.Element {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [sourceOpen, setSourceOpen] = useState(false);
    const [sizeOpen, setSizeOpen] = useState(false);
    const channels = CHANNELS[target];
    const locked = (words ?? styleLine)?.layer.locked === true;
    const hidden = style.enabled === false;
    let source: string;
    if (words === undefined) {
        source = beneath.length === 0 ? "No words" : `From ${beneath.join(" and ")}`;
    } else if (words.binding === undefined) {
        source = typeof words.value === "string" ? words.value : "";
    } else {
        source = readsNothing(session, target, channels.label, words.binding)
            ? "reads nothing"
            : (sourceName(session, words.binding) ?? words.binding.by);
    }
    const lookId = style.look ?? "default";
    const edited = labelLookChanges(style).length > 0;
    const looks = LABEL_LOOKS.map((look) => ({
        value: look.id,
        label: look.id === lookId && edited ? `${look.plainName}, edited` : look.plainName,
        glyph: <LookPreview background={look.style.background} color={look.style.color} />,
    }));
    const sizeDescriptor = channelsFor(target).find((d) => d.channel === channels.size);
    const sizeDefault = typeof sizeDescriptor?.default === "number" ? sizeDescriptor.default : 48;

    return (
        <Stack
            gap={4}
            pl={4}
            data-line={channels.label}
            data-bound={words?.binding === undefined ? undefined : true}
            data-hidden={hidden ? true : undefined}
        >
            <Group gap={4} wrap="nowrap">
                <Popout opened={settingsOpen} onOpenChange={setSettingsOpen}>
                    <Popout.Trigger>
                        <Tooltip label="Label settings">
                            <PopoutButton
                                icon={<GLYPHS.settings size={14} aria-hidden />}
                                aria-label="Label settings"
                                aria-haspopup="dialog"
                                aria-expanded={settingsOpen}
                            />
                        </Tooltip>
                    </Popout.Trigger>
                    <Popout.Panel
                        width={SETTINGS_WIDTH}
                        placement="left"
                        alignment="start"
                        header={{ variant: "title", title: "Label settings" }}
                    >
                        <Popout.Content>
                            <LabelSettings style={style} onChange={onStyle} />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
                <SourcePicker
                    target={target}
                    channel={channels.label}
                    opened={sourceOpen}
                    onOpenChange={setSourceOpen}
                    inUse={words?.binding === undefined ? [] : [words.binding.by]}
                    onPick={(choice) => {
                        setSourceOpen(false);
                        onPick(choice);
                    }}
                >
                    <Button
                        size="compact-xs"
                        variant="default"
                        c={words === undefined ? "dimmed" : undefined}
                        fullWidth
                        justify="flex-start"
                        aria-label={`Label source: ${source}`}
                        style={{ flex: 1, minWidth: 0 }}
                    >
                        {source}
                    </Button>
                </SourcePicker>
                <ToggleIconButton
                    variant="swap"
                    label="Hide label"
                    checked={hidden}
                    icon={<GLYPHS.show size={14} />}
                    checkedIcon={<GLYPHS.hide size={14} />}
                    onChange={(hide) => {
                        onStyle({ enabled: hide ? false : undefined });
                    }}
                />
                {locked ? null : (
                    <Tooltip label="Remove label">
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label="Remove label"
                            onClick={(event) => {
                                // The minus goes with the entry: focus moves to the list's "+".
                                focusSectionNext(event.currentTarget, channels.label);
                                onRemove();
                            }}
                        >
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                )}
            </Group>
            <StyleSelect
                label="Look"
                value={style.look}
                defaultValue="default"
                options={looks}
                onChange={(look) => {
                    onStyle({ look: look as LabelStyle["look"] });
                }}
            />
            <Group gap={4} wrap="nowrap" align="flex-end">
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-end", gap: 2 }}>
                    {size?.binding === undefined ? (
                        <StyleNumberInput
                            label="Size"
                            value={typeof size?.value === "number" ? size.value : undefined}
                            defaultValue={sizeDefault}
                            min={1}
                            onChange={(value) => {
                                onSize(value === undefined ? undefined : { value });
                            }}
                        />
                    ) : (
                        <VariablePill
                            name={sourceName(session, size.binding) ?? size.binding.by}
                            width="100%"
                            detachLabel="Detach label size"
                            onDetach={() => {
                                onSize(undefined);
                            }}
                            onClick={() => {
                                setSizeOpen(true);
                            }}
                        />
                    )}
                    <SourcePicker
                        target={target}
                        channel={channels.size}
                        opened={sizeOpen}
                        onOpenChange={setSizeOpen}
                        title="Label size by attribute"
                        onPick={(choice) => {
                            setSizeOpen(false);
                            const proposal = propose(session, choice, channels.size);
                            if (proposal.ok) {
                                onSize({ binding: proposal.binding });
                            }
                        }}
                    >
                        <Tooltip label="Label size by attribute">
                            <PopoutButton
                                icon={<GLYPHS.link size={14} aria-hidden />}
                                aria-label="Label size by attribute"
                                aria-haspopup="dialog"
                                aria-expanded={sizeOpen}
                            />
                        </Tooltip>
                    </SourcePicker>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <StyleSelect
                        label="Position"
                        value={style.location}
                        defaultValue="top"
                        options={LOCATIONS.map((location) => ({ value: location, label: positionWord(location) }))}
                        onChange={(location) => {
                            onStyle({ location: location as LabelStyle["location"] });
                        }}
                    />
                </div>
            </Group>
        </Stack>
    );
}

/**
 * A look's small preview: "Ab" in its text color on its background.
 * @param props - Component props
 * @param props.background - the look's background, if it sets one
 * @param props.color - the look's text color, if it sets one
 * @returns The preview
 */
function LookPreview({ background, color }: Readonly<{ background?: string; color?: string }>): React.JSX.Element {
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 16,
                borderRadius: 3,
                fontSize: 10,
                background: background ?? "transparent",
                color: color ?? "currentColor",
                border: background === undefined ? "1px dashed currentColor" : undefined,
            }}
        >
            Ab
        </span>
    );
}
