/**
 * A label's Formatted string (owner, 2026-11-24: "The formatted string editor opens in a popout, allows adding text
 * and values (data, calculated, etc) in a string, and has a live preview"): text with values in it, written as
 * graphty-element's `{ template }` binding, one line per line of the label. Its pop-out holds the Preview (what
 * graphty-element draws for one node or edge, stepped with "<" and ">", following the selection), then each line of
 * the label as one text field with its Bold (words typed straight in, each value shown as its name in braces,
 * "{Degree}", never its path), Insert value (puts a value where the caret was) and New line, and Value formats: each
 * value's Format pop-over sets its own number, percent, money or date format and what a missing value shows.
 * graphty-element reads and writes the template (`parseLabelTemplate`, `writeLabelTemplate`) and draws it; the
 * panel only shows its parts.
 */

import { PanelField, Popout, ToggleIconButton } from "@graphty/compact-mantine";
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
import { BesidePopover, PopLine } from "./dataLines";
import { FormatLines } from "./FormatPopover";
import { LineFrame } from "./RubricLine";
import { ValueButton } from "./ValueButton";

/** The pop-out's width: the settings pop-over's own. */
const WIDTH = 264;

/** How many nodes or edges the preview looks through for one with words. */
const SAMPLES = 200;

/** What the preview shows when no node or edge draws words from the text. */
const NO_WORDS = "No words";

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

/** A value in a line's text: its name in braces, "{Degree}". */
const TOKEN = /\{([^{}]+)\}/g;

/**
 * A line as the text its field shows: its words, and each value as its name in braces.
 * @param session - the session.
 * @param line - the line.
 * @returns the text.
 */
function textOf(session: GraphSession, line: LabelTemplateParts): string {
    return line.parts.map((part) => ("text" in part ? part.text : `{${valueName(session, part)}}`)).join("");
}

/**
 * A line's text read back as parts: each `{name}` that names a value is that value, everything else is words. A
 * value keeps its own format: the first `{Degree}` takes the first Degree the line held, the second the second.
 * @param session - the session.
 * @param text - the text typed.
 * @param held - the values the template holds now, this line's first.
 * @returns the parts.
 */
function partsOf(session: GraphSession, text: string, held: readonly ValuePart[]): LabelTemplatePart[] {
    const left = [...held];
    const valueFor = (name: string): ValuePart | undefined => {
        const at = left.findIndex((part) => valueName(session, part) === name);
        if (at >= 0) {
            return left.splice(at, 1)[0];
        }
        // A value named again, or a column typed by its name.
        // ponytail: a column whose name is also typed as words in braces reads as the column.
        const again = held.find((part) => valueName(session, part) === name);
        const column = session.data.attributes().find((attribute) => attribute.name === name);
        return again ?? (column === undefined ? undefined : { path: column.path });
    };
    const parts: LabelTemplatePart[] = [];
    const words = (words: string): void => {
        const last = parts.at(-1);
        if (words === "") {
            return;
        }
        if (last !== undefined && "text" in last) {
            parts[parts.length - 1] = { text: last.text + words };
        } else {
            parts.push({ text: words });
        }
    };
    let from = 0;
    for (const match of text.matchAll(TOKEN)) {
        const value = valueFor(match[1]);
        if (value !== undefined) {
            words(text.slice(from, match.index));
            parts.push(value);
            from = match.index + match[0].length;
        }
    }
    words(text.slice(from));
    return parts;
}

/**
 * The pop-out's lines: Preview; each line of the label as one text field with its Bold; Insert value and New line;
 * and each value's Format.
 * @param props - see EditorArgs
 * @returns The lines
 */
function Editor(props: EditorArgs): React.JSX.Element {
    const { ctx, channel, title, binding, entry, onWrite } = props;
    const { session, element } = useWorkspace();
    // The preview follows every write the element settles.
    useStyleVersion(session, element);
    // on reload: fresh: pointer: the sample the preview was stepped to for a look
    const [stepped, setStepped] = useState<string | null>(null);
    // on reload: fresh: pointer: a picker held open by the pointer
    const [picking, setPicking] = useState(false);
    // on reload: fresh: pointer: the value whose Format pop-over is open, by its line and place
    const [formatting, setFormatting] = useState<string | null>(null);
    // on reload: fresh: in flight: words typed in a line and not yet written, by line
    const [typed, setTyped] = useState<Readonly<Partial<Record<number, string>>>>({});
    // Where Insert value puts a value: the line and caret the reader left; the end of the last line until then.
    // on reload: fresh: pointer: the caret
    const [caret, setCaret] = useState<{ readonly line: number; readonly at: number } | null>(null);
    // Lines not yet written (a new empty line), until the element hands back a new binding.
    const key = JSON.stringify(binding ?? null);
    // on reload: fresh: in flight: lines not yet written
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
    const shownLines = lines.length === 0 ? [{ bold: false, parts: [] }] : lines;
    const put = (next: LabelTemplateParts[]): void => {
        setHeld({ key, lines: next });
        setTyped({});
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
    const values = (first: number): ValuePart[] =>
        [shownLines[first], ...shownLines.filter((_, i) => i !== first)].flatMap((line) =>
            line.parts.filter((part): part is ValuePart => "path" in part),
        );
    const textAt = (at: number): string => typed[at] ?? textOf(session, shownLines[at]);
    // Every line as typed, read back as parts.
    const read = (): LabelTemplateParts[] =>
        shownLines.map((line, at) => {
            const text = typed[at];
            return text === undefined ? line : { ...line, parts: partsOf(session, text, values(at)) };
        });
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
    const insertValue = (part: ValuePart): void => {
        const line = caret !== null && caret.line < shownLines.length ? caret.line : shownLines.length - 1;
        const text = textAt(line);
        const at = Math.min(caret?.line === line ? caret.at : text.length, text.length);
        const parts = [
            ...partsOf(session, text.slice(0, at), values(line)),
            part,
            ...partsOf(session, text.slice(at), values(line)),
        ];
        const next = read();
        next[line] = { ...next[line], parts };
        put(next);
        setCaret(null);
    };
    // Each value the label shows, in order, each opening its Format pop-over.
    const formats = shownLines.flatMap((line, at) =>
        line.parts.flatMap((part, k) => ("path" in part ? [{ at, k, part }] : [])),
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
            {shownLines.map((line, at) => {
                const n = String(at + 1);
                return (
                    <LineFrame
                        // eslint-disable-next-line react/no-array-index-key -- a line is its place in the template
                        key={at}
                        line={`template.line.${String(at)}`}
                        name={`Line ${n}`}
                        set
                        rule="R12"
                        control={
                            // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- catches Enter and the blur bubbling from the text field inside, to write once and keep the caret; the field is the keyboard's door
                            <div
                                onBlur={(event) => {
                                    const field = event.target as HTMLInputElement;
                                    setCaret({ line: at, at: field.selectionStart ?? field.value.length });
                                    if (typed[at] !== undefined) {
                                        put(read());
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && typed[at] !== undefined) {
                                        put(read());
                                    }
                                }}
                            >
                                <PanelField
                                    label={`Line ${n}`}
                                    kind="text"
                                    width="fill"
                                    value={textAt(at)}
                                    onChange={(next) => {
                                        setTyped({ ...typed, [at]: String(next) });
                                    }}
                                />
                            </div>
                        }
                        modifier={
                            <ToggleIconButton
                                label={`Bold line ${n}`}
                                icon={<GLYPHS.fontBold size={14} aria-hidden />}
                                checked={line.bold}
                                onChange={(on) => {
                                    const next = read();
                                    next[at] = { ...next[at], bold: on };
                                    put(next);
                                }}
                            />
                        }
                        // The only line is never removed.
                        removeName={shownLines.length === 1 ? undefined : `Remove line ${n}`}
                        onRemove={() => {
                            put(read().filter((_, i) => i !== at));
                        }}
                    />
                );
            })}
            <PopLine line="template.insert" name={null}>
                <Group gap={8} wrap="nowrap">
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
                                    if (proposal.ok && "by" in proposal.binding) {
                                        insertValue({ path: proposal.binding.by });
                                    }
                                }}
                                onClose={() => {
                                    setPicking(false);
                                }}
                            />
                        </Popout.Panel>
                    </Popout>
                    <Button
                        size="compact-xs"
                        variant="default"
                        leftSection={<GLYPHS.add size={12} aria-hidden />}
                        onClick={() => {
                            put([...read(), { bold: false, parts: [] }]);
                        }}
                    >
                        New line
                    </Button>
                </Group>
            </PopLine>
            {formats.length === 0 ? null : (
                <PopLine line="template.formats" name="Value formats">
                    <Group gap={4}>
                        {formats.map(({ at, k, part }) => {
                            const id = `${String(at)}.${String(k)}`;
                            const name = valueName(session, part);
                            // The Format pop-over edits the value as a data entry: its format and what a missing
                            // value does.
                            const asEntry: DataEntry = {
                                field: part.path,
                                ...(part.format === undefined ? {} : { format: part.format }),
                                ...(part.missing === undefined ? {} : { missing: part.missing }),
                            };
                            return (
                                <React.Fragment key={id}>
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
                                                const lines = read();
                                                lines[at] = {
                                                    ...lines[at],
                                                    parts: lines[at].parts.map((each, i) =>
                                                        i === k
                                                            ? {
                                                                  path: part.path,
                                                                  ...(part.op === undefined ? {} : { op: part.op }),
                                                                  ...(format === undefined ? {} : { format }),
                                                                  ...(missing === "drop" ||
                                                                  missing === "skip" ||
                                                                  typeof missing === "object"
                                                                      ? { missing }
                                                                      : {}),
                                                              }
                                                            : each,
                                                    ),
                                                };
                                                put(lines);
                                            }}
                                        />
                                    </BesidePopover>
                                </React.Fragment>
                            );
                        })}
                    </Group>
                </PopLine>
            )}
        </Stack>
    );
}
