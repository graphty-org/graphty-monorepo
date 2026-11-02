import { ControlSection, PanelField, Popout, PopoutButton, ToggleIconButton } from "@graphty/compact-mantine";
import {
    type ChannelDescriptor,
    channelsFor,
    LABEL_LOOKS,
    LABEL_STYLE_DEFAULTS,
    labelLookChanges,
} from "@graphty/graphty-element/catalog";
import { type Channel, type LabelStyle, labelTemplateLine } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useAnnounceChange } from "../state/useAnnounceChange";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { cardLines, cardSummary } from "./cardLines";
import { CARD_LOOK, isCard } from "./cardLook";
import { CardContents } from "./LabelCard";
import { LabelSettings, type VaryField } from "./LabelSettings";
import { Field, type RowContext, VarySlot } from "./PropertyRow";
import {
    type DataChoice,
    type Line,
    lineIn,
    partlySet,
    propose,
    readsNothing,
    removeLine,
    sourceName,
    startFor,
    textBinding,
    writeIn,
    writeLine,
} from "./row";
import { AddButton, type AddOption } from "./Section";
import { focusLineNext, focusSectionNext, headerBottom, lineTarget } from "./useFocusLine";
import { ValuePicker } from "./ValuePicker";
import { failureWords, labelStatement, positionWord, TEXT_KINDS, type TextKindSpec } from "./words";

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
    return typeof value === "object" && !Array.isArray(value) && !("r" in value) ? (value as LabelStyle) : {};
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
 * The Text section of one kind (the owner's style panel design, 2026-10-13): labels and tooltips
 * on nodes, labels and end captions on edges, one entry of each. A layer that writes no text shows
 * only the dimmed title and "+". "+" ("Add to Text") lists the kinds of text not here yet and, for
 * each entry here, its look, size and position while it does not set them. Picking a kind opens its
 * source list, with "Fixed text" first, and nothing is written until a source is picked or words
 * are typed; Escape leaves nothing. Picking a look, size or position adds it with its starting
 * value. Nothing from the layers beneath is drawn.
 * @param props - Component props
 * @param props.ctx - the row and side
 * @returns The section
 */
export function LabelSection({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const { element, store } = useWorkspace();
    // The kind picked from "+" whose source list is open, and the kind whose fixed words are being typed.
    const [picking, setPicking] = useState<string | null>(null);
    const [typing, setTyping] = useState<string | null>(null);
    // Focus goes back to "+" when a kind picked from it is dropped: its own controls go with it.
    const [refocus, setRefocus] = useState(false);
    const list = useRef<HTMLDivElement>(null);
    // Whether the open source list ended in a pick (focus then goes to the new entry).
    const picked = useRef(false);
    // Whether the label being added is a card: its first value becomes the card's first row.
    const asCard = useRef(false);
    useEffect(() => {
        if (refocus) {
            setRefocus(false);
            list.current?.querySelector<HTMLElement>("[data-plus]")?.focus();
        }
    }, [refocus]);
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
    const { session, side: target } = ctx;
    const kinds = TEXT_KINDS[target];
    const kindWord = target === "node" ? "Node" : "Edge";
    // The label count is said when it changes (a label added, Show all labels); not the count the
    // section opens with, nor "0 labels" while a graph is still loading. A label line added while
    // the section is open makes its first count news: "24 labels, 4 hidden".
    const labeled = lineIn(ctx, "node.label") !== undefined;
    const openedLabeled = useRef(labeled);
    const labelCounts = target === "node" && labeled && element !== null ? element.nodeLabelCounts : null;
    useAnnounceChange(
        labelCounts === null || labelCounts.labeled === 0 ? null : labelStatement(labelCounts, !allLabelsShown),
        openedLabeled.current,
    );
    const hasEntry = (kind: TextKindSpec): boolean =>
        lineIn(ctx, kind.words) !== undefined || lineIn(ctx, kind.style) !== undefined;
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords("The text", "changed", error), error: true } });
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
            next = { binding: textBinding(session, proposal.binding) };
        }
        focusLineNext(session, kind.words);
        const card = asCard.current;
        asCard.current = false;
        // A card: the card look and the picked value as its first row, in bold, in one step.
        // Otherwise only the words: a size, a unit or a look is the reader's to add from "+".
        const written =
            card && "binding" in next && ctx.many === undefined
                ? writeLine(
                      session,
                      ctx.row,
                      target,
                      kind.words,
                      { template: [labelTemplateLine({ text: "", path: next.binding.by, bold: true })] },
                      ctx.fresh,
                      { [kind.style]: { ...CARD_LOOK } },
                  )
                : writeIn(ctx, kind.words, next);
        written
            .then(() => {
                store.set({ announcement: `${kindWord} ${card ? "card" : kind.name.toLowerCase()} added` });
            })
            .catch((error: unknown) => {
                focusLineNext(session, null);
                fail(error);
            });
    };
    const options: AddOption[] = kinds.flatMap((kind) => {
        if (!hasEntry(kind)) {
            if (picking === kind.id || typing === kind.id) {
                return [];
            }
            // A node or edge label can also start as a card (a row of one layer only).
            return kind.id === "label" && ctx.many === undefined
                ? [
                      { key: kind.id, label: kind.name },
                      { key: `${kind.id}:card`, label: "Card" },
                  ]
                : [{ key: kind.id, label: kind.name }];
        }
        const style = styleOf(lineIn(ctx, kind.style));
        const parts: AddOption[] = [];
        if (style.look === undefined) {
            parts.push({ key: `${kind.id}:look`, label: `${kind.name} look` });
        }
        if (lineIn(ctx, kind.size) === undefined && descriptorOf(target, kind.size) !== undefined) {
            parts.push({ key: `${kind.id}:size`, label: `${kind.name} size` });
        }
        if (style.location === undefined) {
            parts.push({ key: `${kind.id}:position`, label: `${kind.name} position` });
        }
        return parts;
    });
    const onAdd = (key: string): void => {
        const [id, part] = key.split(":");
        const kind = kinds.find((each) => each.id === id);
        if (kind === undefined) {
            return;
        }
        if (part === undefined || part === "card") {
            picked.current = false;
            asCard.current = part === "card";
            setPicking(kind.id);
            return;
        }
        const styleLine = lineIn(ctx, kind.style);
        const style = styleOf(styleLine);
        let write: Promise<unknown>;
        if (part === "size") {
            const size = descriptorOf(target, kind.size);
            if (size === undefined) {
                return;
            }
            focusLineNext(session, kind.size);
            write = writeIn(ctx, kind.size, { value: startFor(ctx, size) });
        } else {
            const patch: Partial<LabelStyle> =
                part === "look"
                    ? { look: LABEL_LOOKS[0]?.id ?? "default" }
                    : { location: LABEL_STYLE_DEFAULTS.location ?? "top" };
            write = writeIn(ctx, kind.style, { value: { ...style, ...patch } });
        }
        write
            .then(() => {
                store.set({ announcement: `${kindWord} ${kind.name.toLowerCase()} ${part} added` });
            })
            .catch(fail);
    };
    // "Add label line" with no attribute open asks for a kind of text here: its source list opens
    // as Text "+" opens it, or, when the row already writes that text, its line takes focus.
    const textNext = useWorkspaceState((state) => state.textNext);
    const asked = kinds.find((each) => each.words === textNext);
    const askedHas = asked !== undefined && hasEntry(asked);
    useEffect(() => {
        if (asked === undefined) {
            return;
        }
        store.set({ textNext: null });
        if (askedHas) {
            lineTarget(list.current?.querySelector(`[data-line="${asked.words}"]`))?.focus();
        } else {
            picked.current = false;
            setPicking(asked.id);
        }
    }, [asked, askedHas, store]);
    const shown = kinds.filter((kind) => hasEntry(kind) || picking === kind.id || typing === kind.id);
    const partial = kinds.filter((kind) => !shown.includes(kind) && partlySet(ctx, kind.words, kind.style));

    return (
        <div ref={list} data-section={`${target}-text`} className="ws-section">
            <ControlSection
                label="Text"
                headingLevel={3}
                empty={shown.length === 0 && partial.length === 0}
                collapsible={false}
                actions={<AddButton kind={target} title="Text" options={options} onAdd={onAdd} />}
            >
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
                                        if (!picked.current) {
                                            asCard.current = false;
                                            // The line goes with its list: said, not silent.
                                            store.set({
                                                notice: { message: `${kind.name} not added: no value was picked` },
                                            });
                                        }
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
                                <Button size="compact-xs" variant="default" fullWidth justify="flex-start">
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
                                        store.set({
                                            notice: { message: `${kind.name} not added: no words were typed` },
                                        });
                                    }
                                }}
                            />
                        );
                    }
                    if (hasEntry(kind)) {
                        return <TextEntry key={kind.id} ctx={ctx} kind={kind} onWords={writeWords} onFail={fail} />;
                    }
                    const some = partlySet(ctx, kind.words, kind.style);
                    const { many } = ctx;
                    if (some === undefined || many === undefined) {
                        return null;
                    }
                    const noun = kind.name.toLowerCase();
                    return (
                        <Group key={kind.id} gap={4} wrap="nowrap" mih={28} data-line={kind.words}>
                            <span className="ws-text-kind">
                                {React.createElement(KIND_GLYPHS[kind.id] ?? GLYPHS.label, {
                                    size: 14,
                                    "aria-hidden": true,
                                })}
                                <span className="ws-field-name">{KIND_WORDS[kind.id] ?? kind.name}</span>
                            </span>
                            <Text size="xs" style={{ flex: 1 }}>
                                {some.set < some.of ? `Set on ${String(some.set)} of ${String(some.of)}` : "Mixed"}
                            </Text>
                            <Tooltip label={`Remove ${noun} from every row`}>
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    aria-label={`Remove ${noun} from every row`}
                                    onClick={() => {
                                        Promise.all(channelsOf(kind).map((c) => many.clear(c))).catch(fail);
                                    }}
                                >
                                    <GLYPHS.remove size={14} aria-hidden />
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    );
                })}
                {target === "node" && lineIn(ctx, "node.label") !== undefined && element !== null ? (
                    <Group gap={8} wrap="nowrap">
                        <Text size="xs" c="dimmed">
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
            </ControlSection>
        </div>
    );
}

/**
 * A channel's descriptor on one kind, when graphty-element draws it.
 * @param target - nodes or edges.
 * @param channel - the channel.
 * @returns the descriptor, or undefined.
 */
function descriptorOf(target: RowContext["side"], channel: Channel): ChannelDescriptor | undefined {
    return channelsFor(target).find((d) => d.channel === channel && d.renderable);
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
 * @param props.fixedInForce - whether the line holds typed words, so Fixed text is marked
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
    fixedInForce = false,
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
    fixedInForce?: boolean;
    title: string;
    children: React.ReactElement;
}>): React.JSX.Element {
    return (
        <Popout opened={opened} onOpenChange={onOpenChange}>
            <Popout.Trigger>{children}</Popout.Trigger>
            <Popout.Panel
                width={LIST_WIDTH}
                placement="left"
                alignment="start"
                header={{ variant: "title", title }}
                closeLabel={`Close ${title}`}
            >
                <ValuePicker
                    title={title}
                    target={target}
                    channel={channel}
                    inUse={inUse}
                    onPick={onPick}
                    fixedLabel={onFixed === undefined ? undefined : FIXED_TEXT}
                    onFixed={onFixed}
                    fixedInForce={fixedInForce}
                    onClose={() => {
                        onOpenChange(false);
                    }}
                />
            </Popout.Panel>
        </Popout>
    );
}

/**
 * The channel a label setting varies through: the text color, background and size vary by a value
 * through their own channels.
 * @param kind - the kind of text.
 * @param key - the setting.
 * @returns its channel, or undefined when it does not vary.
 */
function varyChannelOf(kind: TextKindSpec, key: keyof LabelStyle): Channel | undefined {
    if (key === "color") {
        return kind.color;
    }
    if (key === "background") {
        return kind.background;
    }
    return key === "sizePx" ? kind.size : undefined;
}

/**
 * A label setting's field when it varies through its own channel: the row's field when the row
 * holds that channel and is not locked, else the slot that starts varying it.
 * @param ctx - the row.
 * @param kind - the kind of text.
 * @param key - the setting.
 * @param descriptorOf - the row's descriptor of a channel.
 * @returns the field, or undefined when the setting does not vary.
 */
function varyFieldOf(
    ctx: RowContext,
    kind: TextKindSpec,
    key: keyof LabelStyle,
    descriptorOf: (channel: Channel) => ChannelDescriptor | undefined,
): VaryField | undefined {
    const channel = varyChannelOf(kind, key);
    const descriptor = channel === undefined ? undefined : descriptorOf(channel);
    if (channel === undefined || descriptor === undefined) {
        return undefined;
    }
    const line = lineIn(ctx, channel);
    return line !== undefined && !line.layer.locked
        ? { field: <Field ctx={ctx} descriptor={descriptor} /> }
        : { slot: <VarySlot ctx={ctx} descriptor={descriptor} /> };
}

/**
 * Where an entry's words come from, in words: none, a card, typed words, or a value they read.
 * @param ctx - the row.
 * @param kind - the kind of text.
 * @param words - the entry's words line.
 * @returns the source, in words.
 */
function sourceWordsOf(ctx: RowContext, kind: TextKindSpec, words: ReturnType<typeof lineIn>): string {
    const { session, side: target } = ctx;
    if (words === undefined) {
        return "No words";
    }
    if (words.template !== undefined) {
        return cardSummary(session, words.template);
    }
    if (words.binding === undefined) {
        return typeof words.value === "string" ? words.value : "";
    }
    return readsNothing(session, target, kind.words, words.binding)
        ? "reads nothing"
        : (sourceName(session, words.binding) ?? words.binding.by);
}

/** Props for TextEntry. */
interface TextEntryProps {
    ctx: RowContext;
    kind: TextKindSpec;
    /** Writes the words: typed, or read from a value. */
    onWords: (kind: TextKindSpec, write: { value: string } | { choice: DataChoice }) => void;
    onFail: (error: unknown) => void;
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
    const words = lineIn(ctx, kind.words);
    const styleLine = lineIn(ctx, kind.style);
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
    const vary = (key: keyof LabelStyle): VaryField | undefined => varyFieldOf(ctx, kind, key, descriptorOf);

    const typed = words !== undefined && words.binding === undefined && typeof words.value === "string";
    // A card's contents are edited in its settings; a card on several rows at once is not.
    const card = kind.id === "label" && words !== undefined && isCard(style) && ctx.many === undefined;
    const source = sourceWordsOf(ctx, kind, words);
    const lookId = style.look ?? "default";
    const edited = labelLookChanges(style).length > 0;
    const looks = LABEL_LOOKS.map((look) => ({
        value: look.id,
        label: look.id === lookId && edited ? `${look.plainName}, edited` : look.plainName,
    }));
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
            fixedInForce={typed}
            onFixed={() => {
                setSourceOpen(false);
                // The words box opens once the closing list has handed focus back to its trigger,
                // so it takes the focus and keeps it.
                requestAnimationFrame(() => {
                    setTyping(true);
                });
            }}
            onPick={(choice) => {
                setSourceOpen(false);
                onWords(kind, { choice });
            }}
        >
            {trigger}
        </SourcePicker>
    );

    // Typed words name their source "Fixed text" on line 1 and get a line of their own, on the
    // field column, wide enough to show what is typed: beside the entry's buttons the box was
    // about 30 px.
    const fixed = typed || typing;
    const sourceWord = fixed ? FIXED_TEXT : source;
    // The button is narrow and cuts its words short ("Fixed t..."), so its tooltip says them whole,
    // in the words of its name.
    const sourceName = `${kind.name} source: ${sourceWord}`;
    const sourceControl = sourcePicker(
        <Tooltip label={sourceName}>
            <Button
                size="compact-xs"
                variant="default"
                c={words === undefined ? "dimmed" : undefined}
                fullWidth
                justify="flex-start"
                aria-label={sourceName}
                aria-haspopup="dialog"
                aria-expanded={sourceOpen}
                style={{ flex: 1, minWidth: 0 }}
            >
                {sourceWord}
            </Button>
        </Tooltip>,
    );

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
                        <Tooltip label={`${where} settings`}>
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
                        closeLabel={`Close ${kind.name} settings`}
                    >
                        <Popout.Content>
                            {card && words !== undefined ? (
                                <CardContents
                                    session={session}
                                    target={target}
                                    channel={kind.words}
                                    lines={cardLines(words)}
                                    onLines={(lines) => {
                                        writeLine(
                                            session,
                                            ctx.row,
                                            target,
                                            kind.words,
                                            { template: lines },
                                            ctx.fresh,
                                        ).catch(onFail);
                                    }}
                                    onFail={(message) => {
                                        onFail(new Error(message));
                                    }}
                                />
                            ) : null}
                            <LabelSettings style={style} onChange={writeStyle} vary={vary} />
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
                                focusSectionNext(session, event.currentTarget, kind.words);
                                removeEntry(session, layers, channelsOf(kind)).catch(onFail);
                            }}
                        >
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                )}
            </Group>
            {fixed ? (
                <div className="ws-field" data-named="">
                    <span className="ws-field-label">
                        <span className="ws-field-name" aria-hidden>
                            Text
                        </span>
                    </span>
                    <div className="ws-field-control">
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
                    </div>
                    <span className="ws-slot ws-vary" />
                    <span className="ws-slot" />
                </div>
            ) : null}
            <UndrawnNote session={session} line={words} channel={kind.words} />
            {/* The look, the size and the position on the panel's field column, each with Clear. */}
            <StyleLine
                word="Look"
                name={`${where} look`}
                set={style.look !== undefined}
                onRemove={() => {
                    writeStyle({ look: undefined });
                }}
            >
                <PanelField
                    label={`${where} look`}
                    kind="select"
                    width="fill"
                    data={looks}
                    value={style.look ?? null}
                    onChange={(look) => {
                        writeStyle({ look: String(look) as LabelStyle["look"] });
                    }}
                />
            </StyleLine>
            {sizeDescriptor === undefined ? null : <Field ctx={ctx} descriptor={sizeDescriptor} word="Size" />}
            <StyleLine
                word="Position"
                name={`${where} position`}
                set={style.location !== undefined}
                onRemove={() => {
                    writeStyle({ location: undefined });
                }}
            >
                <PanelField
                    label={`${where} position`}
                    kind="select"
                    width="fill"
                    data={LOCATIONS.map((location) => ({ value: location, label: positionWord(location) }))}
                    value={style.location ?? null}
                    onChange={(location) => {
                        writeStyle({ location: String(location) as LabelStyle["location"] });
                    }}
                />
            </StyleLine>
        </Stack>
    );
}

/**
 * Why an end label draws nothing, worded from the element's `caption.noArrow` fact: an end label
 * hangs from that end's arrowhead, and these edges draw none.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.line - the layer line that writes the words, if any
 * @param props.channel - the words' channel
 * @returns The note, or nothing while the element reports no undrawn text on this channel
 */
function UndrawnNote({
    session,
    line,
    channel,
}: Readonly<{ session: GraphSession; line: Line | undefined; channel: Channel }>): React.JSX.Element | null {
    if (line === undefined) {
        return null;
    }
    const fact = session.styles
        .counts(line.layer.id)
        ?.undrawn.find((f) => f.code === "caption.noArrow" && f.params.channel === channel);
    if (fact === undefined) {
        return null;
    }
    const end = fact.params.arrow === "edge.arrowTail" ? "source" : "target";
    const count = Number(fact.params.count);
    const edges = count === 1 ? "1 edge" : `${String(count)} edges`;
    return (
        <Text size="xs" c="dimmed" pl={4}>
            {`Not drawn on ${edges}: it shows beside a ${end} arrowhead, and they have none. Add one under Arrowheads.`}
        </Text>
    );
}

/**
 * One line of a text entry on the panel's field column, drawn only while the layer sets it: its
 * word in the label column, the control, an empty vary column, and a minus that removes it.
 * @param props - Component props
 * @param props.word - the word in the label column
 * @param props.name - the field's accessible name, with its kind ("Node label look")
 * @param props.set - whether the layer sets it
 * @param props.onRemove - removes it, so the layers beneath show through
 * @param props.children - the control
 * @returns The line, or nothing while the layer does not set it
 */
function StyleLine({
    word,
    name,
    set,
    onRemove,
    children,
}: Readonly<{
    word: string;
    name: string;
    set: boolean;
    onRemove: () => void;
    children: React.ReactNode;
}>): React.JSX.Element | null {
    if (!set) {
        return null;
    }
    return (
        <div className="ws-field" data-named="" data-set="">
            <span className="ws-field-label">
                <span className="ws-field-name" aria-hidden>
                    {word}
                </span>
            </span>
            <div className="ws-field-control">{children}</div>
            <span className="ws-slot ws-vary" />
            <span className="ws-slot">
                <Tooltip label={`Remove ${name.toLowerCase()}`}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={`Remove ${name.toLowerCase()}`}
                        onClick={(event) => {
                            // The line goes: focus moves to its section's "+".
                            event.currentTarget
                                .closest("[data-section]")
                                ?.querySelector<HTMLElement>("[data-plus]")
                                ?.focus();
                            onRemove();
                        }}
                    >
                        <GLYPHS.remove size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </span>
        </div>
    );
}
