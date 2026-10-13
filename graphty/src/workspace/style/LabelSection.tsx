import {
    Popout,
    PopoutButton,
    StyleNumberInput,
    StyleSelect,
    ToggleIconButton,
    VariablePill,
} from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor, LABEL_LOOKS, labelLookChanges } from "@graphty/graphty-element/catalog";
import type { Channel, LabelStyle } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Button,
    Checkbox,
    Group,
    Menu,
    Stack,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
} from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { LabelSettings, type VaryField } from "./LabelSettings";
import { Field, type RowContext, VarySlot } from "./PropertyRow";
import { type DataChoice, type Line, lineOf, propose, readsNothing, removeLine, sourceName, writeLine } from "./row";
import { focusLineNext, focusSectionNext } from "./useFocusLine";
import { ValuePicker } from "./ValuePicker";
import { labelStatement, positionWord, TEXT_KINDS, type TextKindSpec } from "./words";

/** The width of the entry's pop-outs: the source list as wide as the panel's rows, the settings wider. */
const LIST_WIDTH = 248;
const SETTINGS_WIDTH = 280;

/** The source list's first choice: words the reader types, the same on every element. */
const FIXED_TEXT = "Fixed text";

/** The six formatting tags graphty-element reads inside typed words. */
const TAGS_HELP =
    "Tags: <bold>, <italic>, <color='red'>, <size='24'>, <font='serif'>, <bg='yellow'>; close each with </>";

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
 * The names of the layers beneath the row that write a text's words: graphty-element's own answer
 * of what lies beneath the row (`styles.agreement` with `below`), over the whole graph.
 * ponytail: read over the whole graph, not the row's own elements (no scope names a layer's
 * matches); scope it when the element offers one.
 * @param session - the element's session.
 * @param layers - the row's layers on this side, bottom first.
 * @param channel - the words channel.
 * @returns the layers' names, empty when nothing beneath writes one or the row has no layer yet.
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
 * Removes channels from the row's layers that write them, layer by layer.
 * @param session - the element's session.
 * @param layers - the row's layers on this side.
 * @param channels - the channels.
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
 * A text kind's channels, for removing its entry.
 * @param kind - the kind.
 * @returns the channels.
 */
function channelsOf(kind: TextKindSpec): Channel[] {
    return [kind.words, kind.style, kind.size, kind.color, kind.background];
}

/**
 * The Text list of one kind (design 2.3): labels and tooltips on nodes, labels and end captions on
 * edges, one entry of each. "+" adds one: a menu of what can still be added, or, when one kind is
 * left, that kind at once. Picking a kind opens its source list, with "Fixed text" first, and
 * nothing is written until a source is picked or words are typed; Escape leaves nothing. The
 * title of an empty list does what "+" does for a pointer, and is not a tab stop of its own. A
 * kind a layer beneath writes, while this row has none, shows as a gray line whose eye adds an
 * entry here that draws none on these elements.
 * @param props - Component props
 * @param props.ctx - the row and side
 * @returns The list
 */
export function LabelSection({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const { element, store } = useWorkspace();
    const [menuOpen, setMenuOpen] = useState(false);
    // The kind picked from "+" whose source list is open, and the kind whose fixed words are being typed.
    const [picking, setPicking] = useState<string | null>(null);
    const [typing, setTyping] = useState<string | null>(null);
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
    const { session, row, side: target, layers, fresh } = ctx;
    const kinds = TEXT_KINDS[target];
    const kindWord = target === "node" ? "Node" : "Edge";
    const listName = `${kindWord} text`;
    const hasEntry = (kind: TextKindSpec): boolean =>
        lineOf(layers, kind.words) !== undefined || lineOf(layers, kind.style) !== undefined;
    const addable = kinds.filter((kind) => !hasEntry(kind) && picking !== kind.id && typing !== kind.id);
    const empty = kinds.every((kind) => !hasEntry(kind)) && picking === null && typing === null;
    const fail = (): void => {
        store.set({ notice: { message: "The text could not be changed" } });
    };
    const writeWords = (kind: TextKindSpec, write: { value: string } | { choice: DataChoice }): void => {
        let next: Parameters<typeof writeLine>[4];
        if ("value" in write) {
            next = { value: write.value };
        } else {
            const proposal = propose(session, write.choice, kind.words);
            if (!proposal.ok) {
                return;
            }
            next = { binding: proposal.binding };
        }
        focusLineNext(kind.words);
        // Only the words: the look, the size and the position stay what the layers beneath give.
        writeLine(session, row, target, kind.words, next, fresh).catch(() => {
            focusLineNext(null);
            fail();
        });
    };
    const start = (kind: TextKindSpec): void => {
        setMenuOpen(false);
        setPicking(kind.id);
    };
    const onAdd = (): void => {
        if (addable.length === 1) {
            start(addable[0]);
        } else if (addable.length > 1) {
            setMenuOpen(true);
        }
    };

    // One "+" per list. A menu that would list one kind is that kind's own button.
    const plusName = addable.length === 1 ? `Add ${addable[0].name.toLowerCase()}` : `Add to ${listName.toLowerCase()}`;
    const plusButton = (
        <Tooltip label={addable.length === 0 ? `${listName}: one of each kind already` : plusName}>
            <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={addable.length === 0 ? `${listName}: one of each kind already` : plusName}
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
            Text
        </Text>
    );

    return (
        // Named by kind: a layer on nodes and edges draws both lists, and no two controls share a name.
        <Stack gap={2} role="group" aria-label={listName} data-section="label">
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
                                const there = !addable.includes(kind);
                                return (
                                    <Menu.Item
                                        key={kind.id}
                                        leftSection={<GLYPHS.category size={14} aria-hidden />}
                                        disabled={there}
                                        onClick={() => {
                                            start(kind);
                                        }}
                                    >
                                        <div>{kind.name}</div>
                                        {there ? (
                                            <Text size="xs" c="dimmed">
                                                {`One ${kind.name.toLowerCase()} per element`}
                                            </Text>
                                        ) : null}
                                    </Menu.Item>
                                );
                            })}
                        </Menu.Dropdown>
                    </Menu>
                ) : (
                    plusButton
                )}
            </Group>
            {kinds.map((kind) => {
                if (picking === kind.id) {
                    return (
                        <SourcePicker
                            key={kind.id}
                            target={target}
                            channel={kind.words}
                            title={kind.name}
                            opened
                            onOpenChange={(open) => {
                                if (!open) {
                                    setPicking(null);
                                }
                            }}
                            onFixed={() => {
                                setPicking(null);
                                setTyping(kind.id);
                            }}
                            onPick={(choice) => {
                                setPicking(null);
                                writeWords(kind, { choice });
                            }}
                        >
                            <Button size="compact-xs" variant="default" c="dimmed" fullWidth justify="flex-start">
                                Pick a value
                            </Button>
                        </SourcePicker>
                    );
                }
                if (typing === kind.id) {
                    return (
                        <WordsInput
                            key={kind.id}
                            label={`${kindWord} ${kind.name.toLowerCase()} text`}
                            words=""
                            autoFocus
                            onDone={(words) => {
                                setTyping(null);
                                if (words !== undefined && words !== "") {
                                    writeWords(kind, { value: words });
                                }
                            }}
                        />
                    );
                }
                if (hasEntry(kind)) {
                    return <TextEntry key={kind.id} ctx={ctx} kind={kind} onWords={writeWords} onFail={fail} />;
                }
                return <BeneathLine key={kind.id} ctx={ctx} kind={kind} onFail={fail} />;
            })}
            {target === "node" && lineOf(layers, "node.label") !== undefined && element !== null ? (
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
 * A kind of text a layer beneath writes while this row writes none: a gray line whose eye adds an
 * entry here that draws none on these elements (`enabled: false`).
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.kind - the kind
 * @param props.onFail - reports a refused write
 * @returns The line, or nothing when no layer beneath writes the kind
 */
function BeneathLine({
    ctx,
    kind,
    onFail,
}: Readonly<{ ctx: RowContext; kind: TextKindSpec; onFail: () => void }>): React.JSX.Element | null {
    const beneath = writtenBeneath(ctx.session, ctx.layers, kind.words);
    if (beneath.length === 0) {
        return null;
    }
    const from = beneath.join(" and ");
    return (
        <Group gap={4} pl={4} wrap="nowrap" data-beneath={kind.words}>
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
                        writeLine(
                            ctx.session,
                            ctx.row,
                            ctx.side,
                            kind.style,
                            { value: { enabled: false } },
                            ctx.fresh,
                        ).catch(onFail);
                    }
                }}
            />
        </Group>
    );
}

/**
 * The field for typed words: Enter or leaving it keeps them, Escape drops the edit. Its tooltip
 * lists the formatting tags the words may carry.
 * @param props - Component props
 * @param props.label - its accessible name
 * @param props.words - the words it starts with
 * @param props.autoFocus - takes focus when drawn
 * @param props.onDone - called with the words, or undefined for Escape
 * @returns The field
 */
function WordsInput({
    label,
    words,
    autoFocus = false,
    onDone,
}: Readonly<{
    label: string;
    words: string;
    autoFocus?: boolean;
    onDone: (words: string | undefined) => void;
}>): React.JSX.Element {
    return (
        <Tooltip label={TAGS_HELP} multiline w={220} openDelay={500}>
            <TextInput
                // Keyed by the words, so Undo, Redo or another edit shows the new text.
                key={words}
                size="xs"
                aria-label={label}
                aria-description={TAGS_HELP}
                placeholder="Type the words"
                defaultValue={words}
                autoFocus={autoFocus}
                style={{ flex: 1, minWidth: 0 }}
                onBlur={(event) => {
                    onDone(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.currentTarget.blur();
                    } else if (event.key === "Escape") {
                        event.stopPropagation();
                        // Blur writes what the field holds: put the start back first.
                        event.currentTarget.value = words;
                        onDone(undefined);
                    }
                }}
            />
        </Tooltip>
    );
}

/**
 * The source list in a pop-out, docked to its trigger, with "Fixed text" first.
 * @param props - Component props
 * @param props.target - nodes or edges
 * @param props.channel - the channel the pick goes on
 * @param props.opened - whether it is open
 * @param props.onOpenChange - opens or closes it
 * @param props.onPick - called with the pick
 * @param props.onFixed - called when the reader picks Fixed text; left out, the list has no such row
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
    onFixed,
    inUse = [],
    title,
    children,
}: Readonly<{
    target: RowContext["side"];
    channel: Channel;
    opened: boolean;
    onOpenChange: (open: boolean) => void;
    onPick: (choice: DataChoice) => void;
    onFixed?: () => void;
    inUse?: readonly string[];
    title: string;
    children: React.ReactElement;
}>): React.JSX.Element {
    return (
        <Popout opened={opened} onOpenChange={onOpenChange}>
            <Popout.Trigger>{children}</Popout.Trigger>
            <Popout.Panel width={LIST_WIDTH} placement="left" alignment="start" header={{ variant: "title", title }}>
                <ValuePicker
                    title={title}
                    target={target}
                    channel={channel}
                    inUse={inUse}
                    onPick={onPick}
                    fixedLabel={onFixed === undefined ? undefined : FIXED_TEXT}
                    onFixed={onFixed}
                    onClose={() => {
                        onOpenChange(false);
                    }}
                />
            </Popout.Panel>
        </Popout>
    );
}

/** Props for TextEntry. */
interface TextEntryProps {
    ctx: RowContext;
    kind: TextKindSpec;
    /** Writes the words: typed, or read from a value. */
    onWords: (kind: TextKindSpec, write: { value: string } | { choice: DataChoice }) => void;
    onFail: () => void;
}

/**
 * One text entry at rest (design 2.3), two lines. Line 1: the settings button, the source (typed
 * words, or a value the words read), the eye (`LabelStyle.enabled`), the minus. Line 2: the look
 * (previews; "Card, edited" while a field differs, from graphty-element's `labelLookChanges`), the
 * size with its vary glyph, the position.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.kind - the kind of text
 * @param props.onWords - writes the words
 * @param props.onFail - reports a refused write
 * @returns The entry
 */
function TextEntry({ ctx, kind, onWords, onFail }: Readonly<TextEntryProps>): React.JSX.Element {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [sourceOpen, setSourceOpen] = useState(false);
    const [sizeOpen, setSizeOpen] = useState(false);
    const [typing, setTyping] = useState(false);
    const { session, row, side: target, layers, fresh } = ctx;
    const noun = kind.name.toLowerCase();
    const kindWord = target === "node" ? "Node" : "Edge";
    const words = lineOf(layers, kind.words);
    const styleLine = lineOf(layers, kind.style);
    const style = styleOf(styleLine);
    const size = lineOf(layers, kind.size);
    const locked = (words ?? styleLine)?.layer.locked === true;
    const hidden = style.enabled === false;
    const descriptors = channelsFor(target);
    const descriptorOf = (channel: Channel): ChannelDescriptor | undefined =>
        descriptors.find((d) => d.channel === channel);
    const writeStyle = (patch: Partial<LabelStyle>): void => {
        const next = Object.fromEntries(
            Object.entries({ ...style, ...patch }).filter(([, value]) => value !== undefined),
        ) as LabelStyle;
        const done =
            Object.keys(next).length === 0 && styleLine !== undefined
                ? removeLine(session, styleLine.layer, kind.style)
                : writeLine(session, row, target, kind.style, { value: next }, fresh);
        done.catch(onFail);
    };
    const writeSize = (write: Parameters<typeof writeLine>[4] | undefined): void => {
        if (write !== undefined) {
            writeLine(session, row, target, kind.size, write, fresh).catch(onFail);
        } else if (size !== undefined) {
            removeLine(session, size.layer, kind.size).catch(onFail);
        }
    };
    // The text color and background vary by a value through their own channels.
    const vary = (key: keyof LabelStyle): VaryField | undefined => {
        let channel: Channel | undefined;
        if (key === "color") {
            channel = kind.color;
        } else if (key === "background") {
            channel = kind.background;
        }
        const descriptor = channel === undefined ? undefined : descriptorOf(channel);
        if (channel === undefined || descriptor === undefined) {
            return undefined;
        }
        const line = lineOf(layers, channel);
        return line !== undefined && !line.layer.locked
            ? { field: <Field ctx={ctx} descriptor={descriptor} /> }
            : { slot: <VarySlot ctx={ctx} descriptor={descriptor} /> };
    };

    const typed = words !== undefined && words.binding === undefined && typeof words.value === "string";
    let source: string;
    if (words === undefined) {
        const beneath = writtenBeneath(session, layers, kind.words);
        source = beneath.length === 0 ? "No words" : `From ${beneath.join(" and ")}`;
    } else if (words.binding === undefined) {
        source = typeof words.value === "string" ? words.value : "";
    } else {
        source = readsNothing(session, target, kind.words, words.binding)
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
    const sizeDescriptor = descriptorOf(kind.size);
    const sizeDefault = typeof sizeDescriptor?.default === "number" ? sizeDescriptor.default : 48;
    const sourcePicker = (trigger: React.ReactElement): React.JSX.Element => (
        <SourcePicker
            target={target}
            channel={kind.words}
            title={kind.name}
            opened={sourceOpen}
            onOpenChange={setSourceOpen}
            inUse={words?.binding === undefined ? [] : [words.binding.by]}
            onFixed={() => {
                setSourceOpen(false);
                setTyping(true);
            }}
            onPick={(choice) => {
                setSourceOpen(false);
                onWords(kind, { choice });
            }}
        >
            {trigger}
        </SourcePicker>
    );

    let sourceControl: React.JSX.Element;
    if (typed || typing) {
        sourceControl = (
            <>
                <WordsInput
                    label={`${kindWord} ${noun} text`}
                    words={typed ? source : ""}
                    autoFocus={typing}
                    onDone={(next) => {
                        setTyping(false);
                        if (next !== undefined && next !== "" && next !== (typed ? source : "")) {
                            onWords(kind, { value: next });
                        }
                    }}
                />
                {sourcePicker(
                    <Tooltip label={`${kind.name} by attribute`}>
                        <PopoutButton
                            icon={<GLYPHS.link size={14} aria-hidden />}
                            aria-label={`${kind.name} by attribute`}
                            aria-haspopup="dialog"
                            aria-expanded={sourceOpen}
                        />
                    </Tooltip>,
                )}
            </>
        );
    } else {
        sourceControl = sourcePicker(
            <Button
                size="compact-xs"
                variant="default"
                c={words === undefined ? "dimmed" : undefined}
                fullWidth
                justify="flex-start"
                aria-label={`${kind.name} source: ${source}`}
                style={{ flex: 1, minWidth: 0 }}
            >
                {source}
            </Button>,
        );
    }

    return (
        <Stack
            gap={4}
            pl={4}
            data-line={kind.words}
            data-bound={words?.binding === undefined ? undefined : true}
            data-hidden={hidden ? true : undefined}
        >
            <Group gap={4} wrap="nowrap">
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
                        width={SETTINGS_WIDTH}
                        placement="left"
                        alignment="start"
                        header={{ variant: "title", title: `${kind.name} settings` }}
                    >
                        <Popout.Content>
                            <LabelSettings style={style} onChange={writeStyle} vary={vary} />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
                {sourceControl}
                <ToggleIconButton
                    variant="swap"
                    label={`Hide ${noun}`}
                    checked={hidden}
                    icon={<GLYPHS.show size={14} />}
                    checkedIcon={<GLYPHS.hide size={14} />}
                    onChange={(hide) => {
                        writeStyle({ enabled: hide ? false : undefined });
                    }}
                />
                {locked ? null : (
                    <Tooltip label={`Remove ${noun}`}>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            aria-label={`Remove ${noun}`}
                            onClick={(event) => {
                                // The minus goes with the entry: focus moves to the list's "+".
                                focusSectionNext(event.currentTarget, kind.words);
                                removeEntry(session, layers, channelsOf(kind)).catch(onFail);
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
                    writeStyle({ look: look as LabelStyle["look"] });
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
                                writeSize(value === undefined ? undefined : { value });
                            }}
                        />
                    ) : (
                        <VariablePill
                            name={sourceName(session, size.binding) ?? size.binding.by}
                            width="100%"
                            detachLabel={`Detach ${noun} size`}
                            onDetach={() => {
                                writeSize(undefined);
                            }}
                            onClick={() => {
                                setSizeOpen(true);
                            }}
                        />
                    )}
                    <SourcePicker
                        target={target}
                        channel={kind.size}
                        opened={sizeOpen}
                        onOpenChange={setSizeOpen}
                        title={`${kind.name} size by attribute`}
                        onPick={(choice) => {
                            setSizeOpen(false);
                            const proposal = propose(session, choice, kind.size);
                            if (proposal.ok) {
                                writeSize({ binding: proposal.binding });
                            }
                        }}
                    >
                        <Tooltip label={`${kind.name} size by attribute`}>
                            <PopoutButton
                                icon={<GLYPHS.link size={14} aria-hidden />}
                                aria-label={`${kind.name} size by attribute`}
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
                            writeStyle({ location: location as LabelStyle["location"] });
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
