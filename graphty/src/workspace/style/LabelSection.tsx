import { Popout, PopoutButton, StyleSelect, ToggleIconButton } from "@graphty/compact-mantine";
import {
    type ChannelDescriptor,
    channelsFor,
    LABEL_LOOKS,
    LABEL_STYLE_DEFAULTS,
    labelLookChanges,
} from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, LabelStyle } from "@graphty/graphty-element/schema";
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
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { LabelSettings, type VaryField } from "./LabelSettings";
import { Field, type RowContext, VarySlot } from "./PropertyRow";
import {
    type DataBinding,
    type DataChoice,
    type Line,
    lineOf,
    propose,
    readsNothing,
    removeLine,
    sharesBeneath,
    sourceName,
    writeIn,
    type writeLine,
} from "./row";
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

/** Each kind of text's glyph, in the "+" menu and on its entry. */
const KIND_GLYPHS: Readonly<Record<string, (typeof GLYPHS)[keyof typeof GLYPHS]>> = {
    label: GLYPHS.label,
    tooltip: GLYPHS.tooltip,
    head: GLYPHS.captionAtTarget,
    tail: GLYPHS.captionAtSource,
};

/** Each kind's word on its entry, short enough for the label column; the full name is in the menu. */
const KIND_WORDS: Readonly<Record<string, string>> = {
    label: "Label",
    tooltip: "Tooltip",
    head: "At target",
    tail: "At source",
};

/**
 * The size a new label is drawn at, in pixels on screen: readable at any zoom, and small enough
 * that a graph of names is not a wall of text. The app's choice; the element's own default is a
 * size in the scene.
 */
const NEW_LABEL_PX = 12;

/** How a label bound to a number writes it: three significant digits, not fifteen decimals. */
const NUMBER_FORMAT = { maximumSignificantDigits: 3 } as const;

/**
 * The bottom of the app header, so a tall pop-out starts below it and never covers it.
 * @returns its bottom in viewport pixels, or 0 when there is no header.
 */
function headerBottom(): number {
    return document.querySelector(".ws-header")?.getBoundingClientRect().bottom ?? 0;
}

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
 * The names of the layers beneath the row that write a text's words, over the row's own elements
 * (`sharesBeneath`), "the default" for graphty-element's base layers.
 * @param session - the element's session.
 * @param layers - the row's layers on this side.
 * @param channel - the words channel.
 * @returns the names, each once.
 */
function writtenBeneath(session: GraphSession, layers: readonly Layer[], channel: Channel): string[] {
    return [...new Set(sharesBeneath(session, layers, channel).map((share) => share.name))];
}

/**
 * A text binding as the app writes it: a number value is written with three significant digits.
 * @param session - the element's session.
 * @param binding - the binding the element proposed.
 * @returns the binding, with a number format when it reads a number.
 */
function formatted(session: GraphSession, binding: DataBinding): DataBinding {
    const kind = session.data.readableValues().find((value) => value.path === binding.by)?.kind;
    return kind === "number" ? { ...binding, format: NUMBER_FORMAT } : binding;
}

/**
 * What the layers beneath the row write for a text's look, when they agree on one.
 * @param session - the element's session.
 * @param layers - the row's layers on this side.
 * @param channel - the style channel.
 * @returns the style, or an empty one.
 */
function styleBeneath(session: GraphSession, layers: readonly Layer[], channel: Channel): LabelStyle {
    const shares = sharesBeneath(session, layers, channel);
    const value = shares.length === 1 ? shares[0].value : undefined;
    return typeof value === "object" && value !== null && !("r" in value) ? value : {};
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
    // Focus goes back to "+" when a kind picked from it is dropped: its own controls go with it.
    const [refocus, setRefocus] = useState(false);
    const list = useRef<HTMLDivElement>(null);
    // Whether the open source list ended in a pick (focus then goes to the new entry).
    const picked = useRef(false);
    useEffect(() => {
        if (refocus) {
            setRefocus(false);
            list.current?.querySelector<HTMLElement>("[data-plus]")?.focus();
        }
    }, [refocus]);
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
    const { session, side: target, layers } = ctx;
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
            next = { binding: formatted(session, proposal.binding) };
        }
        focusLineNext(kind.words);
        // A new entry is sized on screen; the look and the position stay what the layers beneath give.
        const also: Partial<Record<Channel, ChannelValue>> = hasEntry(kind)
            ? {}
            : { [kind.style]: { sizeUnit: "screen" }, [kind.size]: NEW_LABEL_PX };
        writeIn(ctx, kind.words, next, also).catch(() => {
            focusLineNext(null);
            fail();
        });
    };
    const start = (kind: TextKindSpec): void => {
        picked.current = false;
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
            Text
        </Text>
    );

    return (
        // Named by kind: a layer on nodes and edges draws both lists, and no two controls share a name.
        <Stack ref={list} gap={2} role="group" aria-label={listName} data-section="label">
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
                                        leftSection={React.createElement(KIND_GLYPHS[kind.id] ?? GLYPHS.label, {
                                            size: 14,
                                            "aria-hidden": true,
                                        })}
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
                                    setRefocus(!picked.current);
                                }
                            }}
                            onFixed={() => {
                                picked.current = true;
                                setPicking(null);
                                setTyping(kind.id);
                            }}
                            onPick={(choice) => {
                                picked.current = true;
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
                                } else {
                                    setRefocus(true);
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
            {React.createElement(KIND_GLYPHS[kind.id] ?? GLYPHS.label, {
                size: 14,
                "aria-hidden": true,
                style: { flex: "none", color: "var(--cm-text-secondary)" },
            })}
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
                        writeIn(ctx, kind.style, { value: { enabled: false } }).catch(onFail);
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
 * One text entry at rest (design 2.3). Line 1: the kind's glyph and word in the label column, the
 * source (typed words, or a value the words read), the settings button, the eye
 * (`LabelStyle.enabled`), the minus. Then the look (previews; "Card, edited" while a field differs,
 * from graphty-element's `labelLookChanges`), the size with its vary glyph, and the position, each
 * on the panel's field column with its Clear. Accessible names carry the kind ("Node label size"),
 * since a layer on nodes and edges draws two entries.
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
    const [typing, setTyping] = useState(false);
    const { session, side: target, layers } = ctx;
    const noun = kind.name.toLowerCase();
    const kindWord = target === "node" ? "Node" : "Edge";
    const words = lineOf(layers, kind.words);
    const styleLine = lineOf(layers, kind.style);
    const style = styleOf(styleLine);
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
                : writeIn(ctx, kind.style, { value: next });
        done.catch(onFail);
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
    const beneathStyle = styleBeneath(session, layers, kind.style);
    const sizeDescriptor = descriptorOf(kind.size);
    const where = `${kindWord} ${noun}`;
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
                    label={`${where} text`}
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
            gap={0}
            pl={4}
            data-line={kind.words}
            data-bound={words?.binding === undefined ? undefined : true}
            data-hidden={hidden ? true : undefined}
        >
            {/* Line 1: what kind of text it is, where its words come from, its settings, eye and minus. */}
            <Group gap={4} wrap="nowrap" mih={28}>
                <span className="ws-text-kind">
                    {React.createElement(KIND_GLYPHS[kind.id] ?? GLYPHS.label, { size: 14, "aria-hidden": true })}
                    <span className="ws-field-name" title={kind.name}>
                        {KIND_WORDS[kind.id] ?? kind.name}
                    </span>
                </span>
                {sourceControl}
                <Popout opened={settingsOpen} onOpenChange={setSettingsOpen}>
                    <Popout.Trigger>
                        <Tooltip label={`${kind.name} settings`}>
                            <PopoutButton
                                icon={<GLYPHS.settings size={14} aria-hidden />}
                                aria-label={`${where} settings`}
                                aria-haspopup="dialog"
                                aria-expanded={settingsOpen}
                            />
                        </Tooltip>
                    </Popout.Trigger>
                    <Popout.Panel
                        width={SETTINGS_WIDTH}
                        placement="left"
                        alignment="start"
                        boundaryTop={settingsOpen ? headerBottom() : 0}
                        header={{ variant: "title", title: `${kind.name} settings` }}
                    >
                        <Popout.Content>
                            <LabelSettings style={style} beneath={beneathStyle} onChange={writeStyle} vary={vary} />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
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
                {locked ? (
                    <span className="ws-slot" />
                ) : (
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
            {/* The look, the size and the position on the panel's field column, each with Clear. */}
            <StyleLine
                word="Look"
                name={`${where} look`}
                set={style.look !== undefined}
                onClear={() => {
                    writeStyle({ look: undefined });
                }}
            >
                <StyleSelect
                    // Keyed by the value: an undefined value leaves the select uncontrolled, so a
                    // Clear or an Undo would keep showing the old choice.
                    key={style.look ?? ""}
                    label=""
                    aria-label={`${where} look`}
                    value={style.look}
                    defaultValue="default"
                    showReset={false}
                    options={looks}
                    onChange={(look) => {
                        writeStyle({ look: look as LabelStyle["look"] });
                    }}
                />
            </StyleLine>
            {sizeDescriptor === undefined ? null : <Field ctx={ctx} descriptor={sizeDescriptor} word="Size" />}
            <StyleLine
                word="Position"
                name={`${where} position`}
                set={style.location !== undefined}
                onClear={() => {
                    writeStyle({ location: undefined });
                }}
            >
                <StyleSelect
                    key={style.location ?? ""}
                    label=""
                    aria-label={`${where} position`}
                    value={style.location}
                    defaultValue={beneathStyle.location ?? LABEL_STYLE_DEFAULTS.location ?? "top"}
                    showReset={false}
                    options={LOCATIONS.map((location) => ({ value: location, label: positionWord(location) }))}
                    onChange={(location) => {
                        writeStyle({ location: location as LabelStyle["location"] });
                    }}
                />
            </StyleLine>
        </Stack>
    );
}

/**
 * One line of a text entry on the panel's field column: its word in the label column, the
 * control, an empty vary column, and Clear while the layer sets it.
 * @param props - Component props
 * @param props.word - the word in the label column
 * @param props.name - the field's accessible name, with its kind ("Node label look")
 * @param props.set - whether the layer sets it
 * @param props.onClear - clears it back to what lies beneath
 * @param props.children - the control
 * @returns The line
 */
function StyleLine({
    word,
    name,
    set,
    onClear,
    children,
}: Readonly<{
    word: string;
    name: string;
    set: boolean;
    onClear: () => void;
    children: React.ReactNode;
}>): React.JSX.Element {
    return (
        <div className="ws-field" data-named="" data-set={set ? "" : undefined}>
            <span className="ws-field-label">
                <span className="ws-field-name" aria-hidden>
                    {word}
                </span>
            </span>
            <div className="ws-field-control">{children}</div>
            <span className="ws-slot ws-vary" />
            <span className="ws-slot">
                {set && (
                    <Tooltip label="Clear: back to what lies beneath">
                        <ActionIcon variant="subtle" size="sm" aria-label={`Clear ${name}`} onClick={onClear}>
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                )}
            </span>
        </div>
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
