import { ControlSection, PanelField, Popout } from "@graphty/compact-mantine";
import {
    type ChannelDescriptor,
    LABEL_LOOKS,
    LABEL_STYLE_DEFAULTS,
    labelLookChanges,
} from "@graphty/graphty-element/catalog";
import { type Channel, type LabelStyle, labelTemplateLine } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { SettingsPopout } from "../options/SettingsPopout";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { cardLines, cardSummary } from "./cardLines";
import { CARD_LOOK, isCard } from "./cardLook";
import { CardContents } from "./LabelCard";
import { LabelSettings, type VaryField } from "./LabelSettings";
import { fieldChannelOf, offeredChannel, shownChannel } from "./offered";
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
import { failureWords, positionWord, takesBinding, TEXT_KINDS, type TextKindSpec } from "./words";

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
    return [
        kind.words,
        kind.style,
        kind.size,
        kind.color,
        kind.background,
        ...(kind.table === undefined ? [] : [kind.table]),
    ];
}

/**
 * The Text section of one kind (the owner's style panel design, 2026-10-13): labels and tooltips
 * on nodes, labels and end captions on edges, one entry of each. A layer that writes no text shows
 * only the dimmed title and "+". "+" ("Add to Text") lists the kinds of text not here yet; each
 * entry's own "+" adds its look, size and position while it does not set them. Picking a kind opens its
 * source list, with "Fixed text" first, and nothing is written until a source is picked or words
 * are typed; Escape leaves nothing. Picking a look, size or position adds it with its starting
 * value. Nothing from the layers beneath is drawn.
 * @param props - Component props
 * @param props.ctx - the row and side
 * @returns The section
 */
export function LabelSection({ ctx }: Readonly<{ ctx: RowContext }>): React.JSX.Element {
    const { store } = useWorkspace();
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
    const { session, side: target } = ctx;
    const kinds = TEXT_KINDS[target];
    const kindWord = target === "node" ? "Node" : "Edge";
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
        // Its look, size and position are added from the entry's own "+".
        return [];
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
            const size = descriptorOf(session, target, kind.size);
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
                        return (
                            <TextEntry
                                key={kind.id}
                                ctx={ctx}
                                kind={kind}
                                onWords={writeWords}
                                onPart={onAdd}
                                onFail={fail}
                            />
                        );
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
            </ControlSection>
        </div>
    );
}

/**
 * A channel's descriptor on one kind, when the element offers it and draws it.
 * @param session - the element's session.
 * @param target - nodes or edges.
 * @param channel - the channel.
 * @returns the descriptor, or undefined.
 */
function descriptorOf(
    session: RowContext["session"],
    target: RowContext["side"],
    channel: Channel,
): ChannelDescriptor | undefined {
    const descriptor = offeredChannel(session, target, channel);
    return descriptor?.renderable === true ? descriptor : undefined;
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
 * A label setting's field when it varies through its own channel (graphty-element's `labelField`:
 * the text color, the background, the size, the letter size, ...): the row's field when the row
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
    const channel = fieldChannelOf(ctx.side, kind.words, key);
    const descriptor = channel === undefined ? undefined : descriptorOf(channel);
    if (channel === undefined || descriptor === undefined) {
        return undefined;
    }
    const line = lineIn(ctx, channel);
    if (line !== undefined && !line.layer.locked) {
        return { field: <Field ctx={ctx} descriptor={descriptor} /> };
    }
    // A yes-or-no field varies by nothing: no glyph, and no empty column beside it.
    return takesBinding(descriptor) ? { slot: <VarySlot ctx={ctx} descriptor={descriptor} /> } : undefined;
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

/**
 * A text entry's own "+" ("Add to node label"): its look, size, position and table while it sets none.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.kind - the kind of text
 * @param props.locked - the entry's layer is locked, so nothing is added
 * @param props.onPart - adds one, by `<kind>:<part>`
 * @returns The button, or nothing when the entry sets all three or is locked
 */
function EntryAdd({
    ctx,
    kind,
    locked,
    onPart,
}: Readonly<{
    ctx: RowContext;
    kind: TextKindSpec;
    locked: boolean;
    onPart: (key: string) => void;
}>): React.JSX.Element | null {
    const parts = locked ? [] : partsOf(ctx, kind);
    return parts.length === 0 ? null : (
        <AddButton kind={ctx.side} title={kind.name} options={parts} inRow onAdd={onPart} />
    );
}

/** Props for TextEntry. */
interface TextEntryProps {
    ctx: RowContext;
    kind: TextKindSpec;
    /** Writes the words: typed, or read from a value. */
    onWords: (kind: TextKindSpec, write: { value: string } | { choice: DataChoice }) => void;
    /** Adds the entry's look, size, position or table, by `<kind>:<part>`. */
    onPart: (key: string) => void;
    onFail: (error: unknown) => void;
}

/**
 * What a text entry's own "+" can still add: its look, size, position and table while it sets none.
 * @param ctx - the row.
 * @param kind - the kind of text.
 * @returns the menu items, keyed `<kind>:<part>`.
 */
function partsOf(ctx: RowContext, kind: TextKindSpec): AddOption[] {
    const style = styleOf(lineIn(ctx, kind.style));
    const parts: AddOption[] = [];
    if (style.look === undefined) {
        parts.push({ key: `${kind.id}:look`, label: "Look" });
    }
    if (lineIn(ctx, kind.size) === undefined && descriptorOf(ctx.session, ctx.side, kind.size) !== undefined) {
        parts.push({ key: `${kind.id}:size`, label: "Size" });
    }
    const location = fieldChannelOf(ctx.side, kind.words, "location");
    if (style.location === undefined && (location === undefined || lineIn(ctx, location) === undefined)) {
        parts.push({ key: `${kind.id}:position`, label: "Position" });
    }
    // A table is drawn in place of the label's words; it is typed as the element's table JSON.
    if (
        kind.table !== undefined &&
        lineIn(ctx, kind.table) === undefined &&
        descriptorOf(ctx.session, ctx.side, kind.table) !== undefined
    ) {
        parts.push({ key: `${kind.id}:table`, label: "Table" });
    }
    return parts;
}

/**
 * One text entry at rest (design 2.3). Line 1: the kind's glyph and word in the label column, the
 * source (typed words, or a value the words read), the settings button, the minus. Then the look (previews; "Card, edited" while a field differs,
 * from graphty-element's `labelLookChanges`), the size with its vary glyph, and the position, each
 * on the panel's field column with its Clear. Accessible names carry the kind ("Node label size"),
 * since a layer on nodes and edges draws two entries.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.kind - the kind of text
 * @param props.onWords - writes the words
 * @param props.onPart - adds its look, size or position
 * @param props.onFail - reports a refused write
 * @returns The entry
 */
function TextEntry({ ctx, kind, onWords, onPart, onFail }: Readonly<TextEntryProps>): React.JSX.Element {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [sourceOpen, setSourceOpen] = useState(false);
    const [typing, setTyping] = useState(false);
    // The table "+" added, waiting for its words: nothing is written until they are typed.
    const [tableWaiting, setTableWaiting] = useState(false);
    const { session, side: target, layers } = ctx;
    const noun = kind.name.toLowerCase();
    const kindWord = target === "node" ? "Node" : "Edge";
    const words = lineIn(ctx, kind.words);
    const styleLine = lineIn(ctx, kind.style);
    const style = styleOf(styleLine);
    const locked = (words ?? styleLine)?.layer.locked === true;
    // What the element offers, and a setting the row already sets even when it is not offered.
    const descriptorOf = (channel: Channel): ChannelDescriptor | undefined =>
        shownChannel(session, target, channel, lineIn(ctx, channel) !== undefined);
    // A write from the row drops `enabled: false`, which the row no longer sets: a label hidden
    // before the row lost its eye is drawn again once the reader changes it here.
    const writeStyle = (patch: Partial<LabelStyle>): void => {
        const next = Object.fromEntries(
            Object.entries({ ...style, enabled: undefined, ...patch }).filter(([, value]) => value !== undefined),
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
    // The position varies by a value from its own line, as a setting varies from Label settings.
    const locationVary = vary("location");
    const addPart = (key: string): void => {
        if (key === `${kind.id}:table` && kind.table !== undefined) {
            focusLineNext(session, kind.table);
            setTableWaiting(true);
            return;
        }
        onPart(key);
    };
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
        <Stack gap={0} pl={4} data-line={kind.words} data-bound={words?.binding === undefined ? undefined : true}>
            {/* Line 1: what kind of text it is, where its words come from, its settings and minus. */}
            <Group gap={4} wrap="nowrap" mih={28}>
                <span className="ws-text-kind">
                    {React.createElement(KIND_GLYPHS[kind.id] ?? GLYPHS.label, { size: 14, "aria-hidden": true })}
                    <span className="ws-field-name" title={kind.name}>
                        {KIND_WORDS[kind.id] ?? kind.name}
                    </span>
                    <EntryAdd ctx={ctx} kind={kind} locked={locked} onPart={addPart} />
                </span>
                {sourceControl}
                <SettingsPopout
                    label={`${where} settings`}
                    title={`${kind.name} settings`}
                    opened={settingsOpen}
                    onOpenChange={setSettingsOpen}
                    width={SETTINGS_WIDTH}
                    boundaryTop={settingsOpen ? headerBottom() : 0}
                >
                    {card && words !== undefined ? (
                        <CardContents
                            session={session}
                            target={target}
                            channel={kind.words}
                            lines={cardLines(words)}
                            onLines={(lines) => {
                                writeLine(session, ctx.row, target, kind.words, { template: lines }, ctx.fresh).catch(
                                    onFail,
                                );
                            }}
                            onFail={(message) => {
                                onFail(new Error(message));
                            }}
                        />
                    ) : null}
                    <LabelSettings style={style} onChange={writeStyle} vary={vary} target={target} />
                </SettingsPopout>
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
            <TableLine
                ctx={ctx}
                descriptor={kind.table === undefined ? undefined : descriptorOf(kind.table)}
                waiting={tableWaiting}
                onCancel={() => {
                    setTableWaiting(false);
                }}
            />
            {locationVary?.field ?? (
                <StyleLine
                    word="Position"
                    name={`${where} position`}
                    set={style.location !== undefined}
                    vary={locationVary?.slot}
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
            )}
        </Stack>
    );
}

/**
 * A label's table, drawn as a words field: while "+" has added it and nothing is typed yet, it waits
 * for the table's words, writing nothing.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the table's channel, when the element offers it
 * @param props.waiting - whether "+" added it
 * @param props.onCancel - drops it while it waits
 * @returns The line, or nothing
 */
function TableLine({
    ctx,
    descriptor,
    waiting,
    onCancel,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor | undefined;
    waiting: boolean;
    onCancel: () => void;
}>): React.JSX.Element | null {
    if (descriptor === undefined) {
        return null;
    }
    return (
        <Field
            ctx={ctx}
            descriptor={descriptor}
            word="Table"
            pending={waiting && lineIn(ctx, descriptor.channel) === undefined}
            onCancel={onCancel}
        />
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
 * word in the label column, the control, its vary glyph (else an empty column), and a minus that removes it.
 * @param props - Component props
 * @param props.word - the word in the label column
 * @param props.name - the field's accessible name, with its kind ("Node label look")
 * @param props.set - whether the layer sets it
 * @param props.vary - the glyph that varies it by a value, if it varies
 * @param props.onRemove - removes it, so the layers beneath show through
 * @param props.children - the control
 * @returns The line, or nothing while the layer does not set it
 */
function StyleLine({
    word,
    name,
    set,
    vary,
    onRemove,
    children,
}: Readonly<{
    word: string;
    name: string;
    set: boolean;
    vary?: React.ReactNode;
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
            {vary ?? <span className="ws-slot ws-vary" />}
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
