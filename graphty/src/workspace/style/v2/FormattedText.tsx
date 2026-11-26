/**
 * A label's Formatted string (owner, 2026-11-24: "The formatted string editor opens in a popout, allows adding text
 * and values (data, calculated, etc) in a string, and has a live preview"): text with values in it, written as
 * graphty-element's `{ template }` binding, one line per line of the label. Its pop-out holds the Preview (what
 * graphty-element draws for one node or edge, stepped with "<" and ">", following the selection), the Text line
 * (the template with each value by its name, never `{path}`, opening its parts beside) and Insert value. The parts
 * list (tmp/formatted-string/design-parts-list.md 4.2) holds each line (its Bold), its words and its values; a
 * value's Format pop-over sets its own number, percent, money or date format and what a missing value shows.
 * graphty-element reads and writes the template (`parseLabelTemplate`, `writeLabelTemplate`) and draws it; the
 * panel only shows its parts.
 */

import { Popout, ToggleIconButton } from "@graphty/compact-mantine";
import type { Channel, DataEntry } from "@graphty/graphty-element/catalog";
import {
    type LabelTemplatePart,
    type LabelTemplateParts,
    parseLabelTemplate,
    writeLabelTemplate,
} from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Group, Stack, Textarea } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";
import { propose, sourceName, type TemplateWrite } from "../row";
import { useStyleVersion } from "../useStyleVersion";
import { ValuePicker } from "../ValuePicker";
import { BesidePopover, CommitText, PopLine } from "./dataLines";
import { FormatLines } from "./FormatPopover";
import { LineFrame } from "./RubricLine";
import { ValueButton } from "./ValueButton";

/** The pop-out's width: the settings pop-over's own. */
const WIDTH = 264;

/** How many nodes or edges the preview looks through for one with words. */
const SAMPLES = 200;

/** What the preview shows when no node or edge draws words from the text. */
const NO_WORDS = "No words";

/** What separates two lines where a template is shown on one line. */
const LINE_BREAK = " / ";

/** One value part of a line. */
type ValuePart = Extract<LabelTemplatePart, { path: string }>;

/**
 * The words graphty-element draws for one node or edge on the channel (a further label's own words, when `entry`).
 * @param session - the session.
 * @param side - nodes or edges.
 * @param channel - the text channel.
 * @param entry - a further label's id.
 * @param id - the node or edge.
 * @returns the words, or undefined when none are drawn.
 */
function wordsOf(
    session: GraphSession,
    side: RowContext["side"],
    channel: Channel,
    entry: string | undefined,
    id: string,
): string | undefined {
    try {
        const merged = session.styles.explain(side === "node" ? { node: id } : { edge: id }).merged as Readonly<
            Record<string, unknown>
        >;
        const value =
            entry === undefined
                ? merged[channel]
                : (merged[`${side}.labels`] as readonly { id: string; text?: string }[] | undefined)?.find(
                      (each) => each.id === entry,
                  )?.text;
        return typeof value === "string" && value !== "" ? value : undefined;
    } catch {
        // It left the graph since it was listed.
        return undefined;
    }
}

/**
 * The node or edge the preview shows: the one stepped to, else the selected one, else the first that draws words;
 * and the next and previous ones that draw words, in the graph's order, wrapping at the ends.
 * @param session - the session.
 * @param side - nodes or edges.
 * @param draws - whether one draws words.
 * @param stepped - the one stepped to, if any.
 * @returns the one shown, and its neighbors.
 */
function samplesOf(
    session: GraphSession,
    side: RowContext["side"],
    draws: (id: string) => boolean,
    stepped: string | null,
): { readonly shown: string | undefined; readonly step: (by: 1 | -1) => string | undefined } {
    const ids = (side === "node" ? session.data.nodes() : session.data.edges()).map((each) => String(each.id));
    const picked = (side === "node" ? session.selection.nodes : session.selection.edges).map(String);
    // ponytail: looks through SAMPLES of them each way; a layer query of its own elements if big graphs need it.
    const shown =
        stepped !== null && ids.includes(stepped)
            ? stepped
            : [...picked, ...ids].slice(0, SAMPLES).find((id) => draws(id));
    const step = (by: 1 | -1): string | undefined => {
        const from = shown === undefined ? -1 : ids.indexOf(shown);
        for (let n = 1; n <= Math.min(ids.length, SAMPLES); n++) {
            const id = ids[(((from + by * n) % ids.length) + ids.length) % ids.length];
            if (draws(id)) {
                return id;
            }
        }
        return undefined;
    };
    return { shown, step };
}

/**
 * A value's name, as the panel lists it ("Degree"), with what it counts for `count` and `rank`.
 * @param session - the session.
 * @param part - the value.
 * @returns the name.
 */
function valueName(session: GraphSession, part: ValuePart): string {
    const name = sourceName(session, { by: part.path }) ?? part.path.split(".").at(-1) ?? part.path;
    return part.op === undefined ? name : `${name} ${part.op}`;
}

/**
 * A template's lines as one line of words, each value by its name: "Name (Degree) / Gene".
 * @param session - the session.
 * @param lines - the lines.
 * @returns the words.
 */
function shownLines(session: GraphSession, lines: readonly LabelTemplateParts[]): string {
    return lines
        .map((line) => line.parts.map((part) => ("text" in part ? part.text : valueName(session, part))).join(""))
        .join(LINE_BREAK);
}

/**
 * Whether a value takes a number or date format: a number or a time, as graphty-element reports the value.
 * @param session - the session.
 * @param part - the value.
 * @returns whether it does.
 */
function numericValue(session: GraphSession, part: ValuePart): boolean {
    const value = session.data.readableValues().find((each) => each.path === part.path);
    return value === undefined || part.op !== undefined || value.kind === "number" || value.valueKind === "time";
}

/**
 * A template binding's lines, or one empty line for a template graphty-element cannot read.
 * @param binding - the binding.
 * @returns the lines.
 */
function linesOf(binding: TemplateWrite | undefined): LabelTemplateParts[] {
    if (binding === undefined) {
        return [];
    }
    try {
        return parseLabelTemplate(binding);
    } catch {
        return [{ bold: false, parts: [] }];
    }
}

/**
 * The Formatted string pop-out, beside the panel, anchored to the label's line.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the text channel (`node.label`, `edge.label`, `node.tooltip`)
 * @param props.title - the label's name with its kind ("Node label")
 * @param props.binding - the template binding the label holds
 * @param props.entry - a further label's id, when the row edits one
 * @param props.opened - whether it is open
 * @param props.onOpenChange - opens or closes it
 * @param props.onWrite - writes the binding (one undo step each)
 * @returns The pop-out
 */
export function FormattedText({
    ctx,
    channel,
    title,
    binding,
    entry,
    opened,
    onOpenChange,
    onWrite,
}: Readonly<{
    ctx: RowContext;
    channel: Channel;
    title: string;
    binding: TemplateWrite | undefined;
    entry: string | undefined;
    opened: boolean;
    onOpenChange: (open: boolean) => void;
    onWrite: (binding: TemplateWrite) => void;
}>): React.JSX.Element {
    return (
        <Popout opened={opened} onOpenChange={onOpenChange}>
            <Popout.Trigger>
                {/* The pop-out opens from the source list's "Formatted string", level with this line. */}
                <span aria-hidden data-formatted-anchor="" style={{ position: "absolute", width: 0, height: 0 }} />
            </Popout.Trigger>
            <Popout.Panel
                width={WIDTH}
                placement="left"
                alignment="start"
                header={{ variant: "title", title: `${title} text` }}
                closeLabel={`Close ${title} text`}
            >
                <Popout.Content>
                    {opened ? (
                        <Editor
                            ctx={ctx}
                            channel={channel}
                            title={title}
                            binding={binding}
                            entry={entry}
                            onWrite={onWrite}
                        />
                    ) : null}
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/** What the editor's lines share. */
interface EditorArgs {
    readonly ctx: RowContext;
    readonly channel: Channel;
    readonly title: string;
    readonly binding: TemplateWrite | undefined;
    readonly entry: string | undefined;
    readonly onWrite: (binding: TemplateWrite) => void;
}

/**
 * The pop-out's lines: Preview, Text and Insert value.
 * @param props - see EditorArgs
 * @returns The lines
 */
function Editor(props: EditorArgs): React.JSX.Element {
    const { ctx, channel, title, binding, entry, onWrite } = props;
    const { session, element } = useWorkspace();
    // The preview follows every write the element settles.
    useStyleVersion(session, element);
    const [stepped, setStepped] = useState<string | null>(null);
    const [listOpen, setListOpen] = useState(false);
    const [picking, setPicking] = useState(false);
    // Parts not yet written (a new empty line or words not typed yet), until the element hands back a new binding.
    const key = JSON.stringify(binding ?? null);
    const [held, setHeld] = useState<{ readonly key: string; readonly lines: LabelTemplateParts[] } | null>(null);
    const lines = held?.key === key ? held.lines : linesOf(binding);
    // A click on the Graph that selects a node moves the preview to it.
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        return session.on("selection:changed", () => {
            setStepped(null);
        });
    }, [session]);
    if (session === null) {
        return <Stack gap={8} data-formatted-text="" />;
    }
    const put = (next: LabelTemplateParts[]): void => {
        setHeld({ key, lines: next });
        // A line with no parts yet waits: it is written once it holds one.
        const kept = next.filter((line) => line.parts.length > 0);
        const written: TemplateWrite = {
            ...writeLabelTemplate(kept.length === 0 ? [{ bold: false, parts: [] }] : kept),
            ...(binding?.format === undefined ? {} : { format: binding.format }),
        };
        if (JSON.stringify(written) !== key) {
            onWrite(written);
        }
    };
    const draws = (id: string): boolean => wordsOf(session, ctx.side, channel, entry, id) !== undefined;
    const { shown, step } = samplesOf(session, ctx.side, draws, stepped);
    const preview = shown === undefined ? undefined : wordsOf(session, ctx.side, channel, entry, shown);
    const thing = ctx.side === "node" ? "node" : "edge";
    const stepButton = (by: 1 | -1): React.JSX.Element => (
        <ActionIcon
            variant="subtle"
            size="sm"
            aria-label={by === 1 ? `Next ${thing}` : `Previous ${thing}`}
            disabled={shown === undefined}
            onClick={() => {
                setStepped(step(by) ?? null);
            }}
        >
            {by === 1 ? <GLYPHS.next size={14} aria-hidden /> : <GLYPHS.back size={14} aria-hidden />}
        </ActionIcon>
    );
    return (
        <Stack gap={8} data-formatted-text="">
            <PopLine
                line="template.preview"
                name={shown === undefined ? "Preview" : `Preview, ${thing} ${shown}`}
                modifier={
                    <Group gap={0} wrap="nowrap">
                        {stepButton(-1)}
                        {stepButton(1)}
                    </Group>
                }
            >
                <Textarea
                    aria-label="Preview"
                    readOnly
                    autosize
                    minRows={1}
                    maxRows={4}
                    value={preview ?? NO_WORDS}
                    data-formatted-preview=""
                />
            </PopLine>
            <PopLine line="template.text" name="Text">
                <ValueButton
                    label={`${title} parts`}
                    words={shownLines(session, lines) || "None"}
                    opens="dialog"
                    expanded={listOpen}
                    onClick={() => {
                        setListOpen(!listOpen);
                    }}
                />
                <BesidePopover title="Text" opened={listOpen} onOpenChange={setListOpen}>
                    <PartsList session={session} lines={lines} put={put} />
                </BesidePopover>
            </PopLine>
            <PopLine line="template.insert" name={null}>
                <Popout opened={picking} onOpenChange={setPicking}>
                    <Popout.Trigger>
                        <ValueButton
                            label={`${title} insert value`}
                            words="Insert value"
                            opens="dialog"
                            expanded={picking}
                            left={<GLYPHS.add size={12} aria-hidden />}
                            right={<GLYPHS.expand size={12} aria-hidden />}
                        />
                    </Popout.Trigger>
                    <Popout.Panel
                        width={260}
                        placement="beside"
                        header={{ variant: "title", title: "Insert value" }}
                        closeLabel="Close Insert value"
                    >
                        <ValuePicker
                            title="Insert value"
                            target={ctx.side}
                            channel={channel}
                            onPick={(choice) => {
                                setPicking(false);
                                const proposal = propose(session, choice, channel);
                                if (!proposal.ok || !("by" in proposal.binding)) {
                                    return;
                                }
                                // The value goes at the end of the last line.
                                const last = lines.at(-1) ?? { bold: false, parts: [] };
                                put([
                                    ...lines.slice(0, -1),
                                    { ...last, parts: [...last.parts, { path: proposal.binding.by }] },
                                ]);
                            }}
                            onClose={() => {
                                setPicking(false);
                            }}
                        />
                    </Popout.Panel>
                </Popout>
            </PopLine>
        </Stack>
    );
}

/**
 * The parts list, beside the editor: each line with its Bold, then its words and values, each with its minus; Add
 * text and New line at the foot. A value opens its Format pop-over beside.
 * @param props - Component props
 * @param props.session - the session
 * @param props.lines - the lines
 * @param props.put - writes the lines
 * @returns The list
 */
function PartsList({
    session,
    lines,
    put,
}: Readonly<{
    session: GraphSession;
    lines: readonly LabelTemplateParts[];
    put: (next: LabelTemplateParts[]) => void;
}>): React.JSX.Element {
    // The value whose Format pop-over is open, by its line and place.
    const [formatting, setFormatting] = useState<string | null>(null);
    const withLine = (at: number, line: LabelTemplateParts): LabelTemplateParts[] =>
        lines.map((each, i) => (i === at ? line : each));
    const withPart = (at: number, k: number, part: LabelTemplatePart | null): LabelTemplateParts[] => {
        const line = lines[at];
        const parts =
            part === null ? line.parts.filter((_, i) => i !== k) : line.parts.map((p, i) => (i === k ? part : p));
        return withLine(at, { ...line, parts });
    };
    const shown = lines.length === 0 ? [{ bold: false, parts: [] }] : lines;
    return (
        <div data-template-parts="">
            {shown.map((line, at) => (
                // eslint-disable-next-line react/no-array-index-key -- a line is its place in the template
                <React.Fragment key={at}>
                    <LineFrame
                        line={`template.line.${String(at)}`}
                        name={`Line ${String(at + 1)}`}
                        set
                        rule="R12"
                        control={
                            <ToggleIconButton
                                label={`Bold line ${String(at + 1)}`}
                                icon={<GLYPHS.fontBold size={14} aria-hidden />}
                                checked={line.bold}
                                onChange={(on) => {
                                    put(withLine(at, { ...line, bold: on }));
                                }}
                            />
                        }
                        modifier={null}
                        // The first line is never removed; a later one joins the line before it.
                        removeName={at === 0 ? undefined : `Remove line ${String(at + 1)}`}
                        onRemove={() => {
                            const before = lines[at - 1];
                            put([
                                ...lines.slice(0, at - 1),
                                { ...before, parts: [...before.parts, ...line.parts] },
                                ...lines.slice(at + 1),
                            ]);
                        }}
                    />
                    {line.parts.map((part, k) => {
                        const id = `${String(at)}.${String(k)}`;
                        if ("text" in part) {
                            return (
                                <LineFrame
                                    key={id}
                                    line={`template.part.${id}`}
                                    name="Words"
                                    set
                                    rule="R12"
                                    control={
                                        <CommitText
                                            label="Words"
                                            value={part.text === "" ? undefined : part.text}
                                            unset="None"
                                            onCommit={(words) => {
                                                put(withPart(at, k, { text: words }));
                                            }}
                                        />
                                    }
                                    modifier={null}
                                    removeName="Remove words"
                                    onRemove={() => {
                                        put(withPart(at, k, null));
                                    }}
                                />
                            );
                        }
                        const name = valueName(session, part);
                        // The Format pop-over edits the value as a data entry: its format and what a missing value does.
                        const asEntry: DataEntry = {
                            field: part.path,
                            ...(part.format === undefined ? {} : { format: part.format }),
                            ...(part.missing === undefined ? {} : { missing: part.missing }),
                        };
                        return (
                            <LineFrame
                                key={id}
                                line={`template.part.${id}`}
                                name="Value"
                                set
                                rule="R12"
                                control={
                                    <>
                                        <ValueButton
                                            label={`${name} format`}
                                            words={name}
                                            opens="dialog"
                                            expanded={formatting === id}
                                            onClick={() => {
                                                setFormatting(formatting === id ? null : id);
                                            }}
                                        />
                                        <BesidePopover
                                            title="Format"
                                            opened={formatting === id}
                                            onOpenChange={(open) => {
                                                setFormatting(open ? id : null);
                                            }}
                                        >
                                            <FormatLines
                                                channel="template"
                                                entry={asEntry}
                                                numeric={numericValue(session, part)}
                                                put={(next) => {
                                                    const { format, missing } = next;
                                                    put(
                                                        withPart(at, k, {
                                                            path: part.path,
                                                            ...(part.op === undefined ? {} : { op: part.op }),
                                                            ...(format === undefined ? {} : { format }),
                                                            ...(missing === "drop" ||
                                                            missing === "skip" ||
                                                            typeof missing === "object"
                                                                ? { missing }
                                                                : {}),
                                                        }),
                                                    );
                                                }}
                                            />
                                        </BesidePopover>
                                    </>
                                }
                                modifier={null}
                                removeName={`Remove ${name}`}
                                onRemove={() => {
                                    put(withPart(at, k, null));
                                }}
                            />
                        );
                    })}
                </React.Fragment>
            ))}
            <Group gap={8} mt={4}>
                <Button
                    size="compact-xs"
                    variant="default"
                    leftSection={<GLYPHS.add size={12} aria-hidden />}
                    onClick={() => {
                        const at = shown.length - 1;
                        put(
                            shown.map((line, i) =>
                                i === at ? { ...line, parts: [...line.parts, { text: "" }] } : line,
                            ),
                        );
                    }}
                >
                    Add words
                </Button>
                <Button
                    size="compact-xs"
                    variant="default"
                    leftSection={<GLYPHS.add size={12} aria-hidden />}
                    onClick={() => {
                        put([...shown, { bold: false, parts: [] }]);
                    }}
                >
                    New line
                </Button>
            </Group>
        </div>
    );
}
