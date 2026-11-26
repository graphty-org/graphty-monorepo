/**
 * A label, external label or tooltip row in Style panel v2 (design/ui/style-panel-v2/design.md,
 * sections 2.4, 2.5, 5.1 and 7.3): its name, its text source (R12: today's source list, with
 * Fixed text first) as the main control, its settings button and its minus; then its Size and
 * color common lines. Added with "+", the row waits empty with its source list open, and nothing
 * is written until a source is picked or a line is set. Size and Color are drawn under it whether set or not.
 */

import "./labelRename.css";

import { ContextMenu, InlineRename } from "@graphty/compact-mantine";
import { type Channel, type ChannelDescriptor, MAIN_LABEL_ID } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import React, { useState } from "react";

import { CommandMenuItem } from "../../frame/menus";
import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { FORMATTED_STRING, SourcePicker } from "../LabelSection";
import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { type DataBinding, type Line, lineIn, propose, type TemplateWrite, textBinding, writeIn } from "../row";
import { ValueField } from "../ValueField";
import { failureWords } from "../words";
import { FormattedText } from "./FormattedText";
import { entryOf, entryWords, listChannel, nameFree, writeEntry } from "./labelEntries";
import { LabelFieldLine, type LabelLineContext, type LabelPatch } from "./LabelFieldLine";
import { LabelPopover } from "./LabelPopover";
import {
    flatOf,
    LABEL_COVERED,
    LABEL_RUBRIC,
    type LabelField,
    labelFieldDescriptor,
    labelLineFields,
    type TextThing,
} from "./labelRubric";
import { sharedWhere, sourceText, styleOf } from "./labelWords";
import { unsetIn } from "./lineWrites";
import { LineFrame } from "./RubricLine";
import { RowSettings } from "./ThingLine";
import { setOn } from "./things";
import { ValueButton } from "./ValueButton";

/**
 * The text source (R12): a field showing where the words come from, which opens today's source
 * list; Fixed text turns it into the words' own field until they are typed.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.kind - the text thing
 * @param props.title - its name with its kind ("Node label")
 * @param props.opensAtOnce - just added: the list opens at once
 * @param props.words - where the words come from now, if anywhere
 * @param props.also - where the label sits, said after its source when another label reads the same one
 * @param props.onWrite - writes picked or typed words
 * @param props.entry - a further label's id, when the row edits one
 * @param props.onTemplate - writes a formatted string; left out, the list has no Formatted string
 * @returns The control
 */
function TextSource({
    ctx,
    kind,
    title,
    opensAtOnce,
    words,
    also,
    onWrite,
    entry,
    onTemplate,
}: Readonly<{
    ctx: RowContext;
    kind: TextThing;
    title: string;
    opensAtOnce: boolean;
    words: Line | undefined;
    also: string;
    onWrite: (write: { readonly value: string } | { readonly binding: DataBinding }) => Promise<unknown>;
    entry: string | undefined;
    onTemplate?: (binding: TemplateWrite) => Promise<unknown>;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(opensAtOnce);
    const [typing, setTyping] = useState(false);
    const [formatting, setFormatting] = useState(false);
    const { session } = ctx;
    const source = sourceText(ctx, words);
    // Two labels that read one source say where each sits ("Node id, above").
    const said = words?.template === undefined ? source : FORMATTED_STRING;
    const shown = also === "" || said === "" ? said : `${said}, ${also}`;
    const bound = words?.binding !== undefined;
    const typed = words !== undefined && !bound && words.template === undefined && typeof words.value === "string";
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(title, "changed", error), error: true } });
    };
    const descriptor = shownChannel(session, ctx.side, kind.words, true);
    if (typing && descriptor !== undefined) {
        return (
            <ValueField
                descriptor={descriptor}
                label={`${title} text`}
                value={typed ? source : undefined}
                shown={undefined}
                onChange={(next) => {
                    setTyping(false);
                    onWrite({ value: String(next) }).catch(fail);
                }}
            />
        );
    }
    const template = words?.templateBinding;
    const picker = (
        <SourcePicker
            target={ctx.side}
            channel={kind.words}
            title={title}
            opened={open}
            onOpenChange={setOpen}
            inUse={bound ? [words.binding.by] : []}
            fixedInForce={typed}
            formattedInForce={template !== undefined}
            onFormatted={
                onTemplate === undefined
                    ? undefined
                    : () => {
                          setOpen(false);
                          // A new formatted string starts from what the label draws now: its value, else its words.
                          if (template === undefined) {
                              onTemplate({ template: [startLine(words, source)] }).catch(fail);
                          }
                          requestAnimationFrame(() => {
                              setFormatting(true);
                          });
                      }
            }
            onFixed={() => {
                setOpen(false);
                // The words' field opens once the closing list has handed focus back to its trigger.
                requestAnimationFrame(() => {
                    setTyping(true);
                });
            }}
            onPick={(choice) => {
                setOpen(false);
                const proposal = propose(session, choice, kind.words);
                if (proposal.ok) {
                    onWrite({ binding: textBinding(session, proposal.binding) }).catch(fail);
                }
            }}
        >
            <ValueButton
                label={`${title} source`}
                // Never empty (owner's input rules): with no source picked yet, the label draws no words.
                words={shown === "" ? NO_WORDS : shown}
                opens="dialog"
                expanded={open}
                left={bound ? <GLYPHS.link size={12} aria-hidden /> : undefined}
                right={<GLYPHS.expand size={12} aria-hidden />}
            />
        </SourcePicker>
    );
    if (onTemplate === undefined) {
        return picker;
    }
    return (
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            {picker}
            <FormattedText
                ctx={ctx}
                channel={kind.words}
                title={title}
                binding={template}
                entry={entry}
                opened={formatting}
                onOpenChange={setFormatting}
                onWrite={(next) => {
                    onTemplate(next).catch(fail);
                }}
            />
        </div>
    );
}

/**
 * A new formatted string's first line: what the label draws now, its value as `{path}`, else its typed words.
 * @param words - where the words come from now.
 * @param source - the typed words, when they are.
 * @returns the line.
 */
function startLine(words: Line | undefined, source: string): string {
    if (words?.binding !== undefined) {
        return `{${words.binding.by}}`;
    }
    return typeof words?.value === "string" ? source : "";
}

/** The text channels graphty-element draws a formatted string (`{ template }`) on. */
const FORMATTED_CHANNELS: ReadonlySet<Channel> = new Set(["node.label", "edge.label", "node.tooltip"]);

/**
 * What writes a formatted string, where the label can hold one: the main label, edge label or tooltip, or a further
 * label's words (its text address), of one row or of several edited together.
 * @param ctx - the row.
 * @param kind - the text thing.
 * @param entry - the further label's id, if it is one.
 * @returns the writer, or undefined.
 */
function formattedWriter(
    ctx: RowContext,
    kind: TextThing,
    entry: string | undefined,
): ((binding: TemplateWrite) => Promise<unknown>) | undefined {
    if (!FORMATTED_CHANNELS.has(kind.words) || (entry !== undefined && ctx.many !== undefined)) {
        return undefined;
    }
    if (entry !== undefined) {
        return (binding) => writeEntry(ctx, entry, { binding });
    }
    return (binding) => writeIn(ctx, kind.words, binding);
}

/** What a label source reads while it has none: the label draws no words. */
const NO_WORDS = "No words";

/** Props for LabelRow. */
interface LabelRowProps {
    readonly ctx: RowContext;
    readonly kind: TextThing;
    /** The thing's name ("Label"). */
    readonly name: string;
    /** Its name with its kind ("Node label"). */
    readonly title: string;
    /** Every channel of the thing. */
    readonly channels: readonly Channel[];
    /** Just added with "+", waiting for its source. */
    readonly pending: boolean;
    /** Its Switch to, when it has kinds (a node's Label: Text or Glyph). */
    readonly member?: React.ReactNode;
    readonly removeLabel: string;
    readonly onRemove: () => void;
    /** A further label's id (labelEntries.ts): the row edits that entry of the label list, not the main label. */
    readonly entry?: string;
    /** Whether its settings pop-over is open: held by the row, so a change of kind keeps it open. */
    readonly open?: boolean;
    readonly onOpenChange?: (open: boolean) => void;
}

/**
 * The fields graphty-element says a written field needs beside it to draw (`LabelStyleFieldDescriptor.needs`: an
 * alignment moves a one-line label only in a box wider than its words), for the partners the style does not set.
 * @param style - the layer's label style as written.
 * @param patch - the fields being written.
 * @returns the partners' values.
 */
function partnersOf(style: Readonly<LabelStyle>, patch: LabelPatch): LabelPatch {
    const set = (field: string): boolean => (style as Readonly<Record<string, unknown>>)[field] !== undefined;
    return Object.fromEntries(
        Object.entries(patch)
            .filter(([, value]) => value !== undefined)
            .flatMap(([field]) => labelFieldDescriptor(field as LabelField)?.needs ?? [])
            .filter((need) => !set(need.field) && !(need.field in patch))
            .map((need) => [need.field, need.value]),
    );
}

/**
 * One text thing's row: see the file header.
 * @param props - Component props
 * @param props.ctx - see LabelRowProps
 * @param props.kind - see LabelRowProps
 * @param props.name - see LabelRowProps
 * @param props.title - see LabelRowProps
 * @param props.channels - see LabelRowProps
 * @param props.pending - see LabelRowProps
 * @param props.member - see LabelRowProps
 * @param props.removeLabel - see LabelRowProps
 * @param props.onRemove - see LabelRowProps
 * @param props.entry - see LabelRowProps
 * @param props.open - see LabelRowProps
 * @param props.onOpenChange - see LabelRowProps
 * @returns The row and its common lines
 */
export function LabelRow({
    ctx,
    kind,
    name,
    title,
    channels,
    pending,
    member,
    removeLabel,
    onRemove,
    entry,
    open,
    onOpenChange,
}: LabelRowProps): React.JSX.Element {
    const { store } = useWorkspace();
    const [renaming, setRenaming] = useState(false);
    const styleLine = entry === undefined ? lineIn(ctx, kind.style) : undefined;
    const style = entry === undefined ? styleOf(styleLine) : (entryOf(ctx, entry)?.style ?? {});
    const words = entry === undefined ? lineIn(ctx, kind.words) : entryWords(ctx, entry);
    const writeWords = (next: { readonly value: string } | { readonly binding: DataBinding }): Promise<unknown> =>
        entry === undefined
            ? writeIn(ctx, kind.words, next, {}, true)
            : writeEntry(ctx, entry, "binding" in next ? { binding: next.binding } : { text: next.value });
    const write = (patch: LabelPatch, drop: readonly Channel[] = []): void => {
        const next = Object.fromEntries(
            Object.entries({ ...partnersOf(style, patch), ...style, ...patch }).filter(
                ([, value]) => value !== undefined,
            ),
        ) as LabelStyle;
        const held = drop.filter((channel) => setOn(ctx, channel));
        let done: Promise<unknown>;
        if (entry !== undefined) {
            // A further label's style lives in its entry; it has no channels of its own to drop.
            done = writeEntry(ctx, entry, { style: next });
        } else if (Object.keys(next).length === 0) {
            done = unsetIn(ctx, [kind.style, ...held]);
        } else if (
            held.length > 0 &&
            ctx.many === undefined &&
            styleLine !== undefined &&
            !styleLine.layer.locked &&
            held.every((channel) => lineIn(ctx, channel)?.layer.id === styleLine.layer.id)
        ) {
            // The style keeps other fields: write it and take the dropped channels off, one undo step.
            const { id } = styleLine.layer;
            done = ctx.session.transaction(`changing ${title.toLowerCase()}`, async (tx) => {
                const own = tx.styles.get(id);
                const keep = <T,>(
                    record: Readonly<Partial<Record<Channel, T>>> | undefined,
                ): Partial<Record<Channel, T>> =>
                    Object.fromEntries(Object.entries(record ?? {}).filter(([c]) => !held.includes(c as Channel)));
                await tx.styles.update(
                    id,
                    { set: { ...keep(own?.set), [kind.style]: next }, encode: keep(own?.encode) },
                    { keepEmpty: true },
                );
            });
        } else {
            // ponytail: dropped channels on another layer, or several rows, go in a second undo step.
            done = writeIn(ctx, kind.style, { value: next }).then(() => unsetIn(ctx, held));
        }
        done.catch((error: unknown) => {
            store.set({ notice: { message: failureWords(title, "changed", error), error: true } });
        });
    };
    // A further label's lines are its entry's fields (`node.labels.<id>.<field>`), with no channels of their own.
    const label: LabelLineContext =
        entry === undefined
            ? { ctx, kind, title, style, write }
            : {
                  ctx,
                  kind: { ...kind, style: listChannel(ctx.side) },
                  title,
                  style,
                  write,
                  address: `${ctx.side}.labels.${entry}`,
              };
    // Each field's own channel a line draws in its place.
    const flats = new Set(
        [...LABEL_COVERED].flatMap((field) => {
            const flat = flatOf(ctx.side, label.kind.style, field);
            return flat === undefined ? [] : [flat];
        }),
    );
    // The thing's other set channels (a tooltip's size, an external label's offset): today's fields in Main.
    const others = channels.flatMap((channel): ChannelDescriptor[] => {
        if (
            channel === kind.words ||
            channel === kind.style ||
            channel === kind.distance ||
            flats.has(channel) ||
            !setOn(ctx, channel)
        ) {
            return [];
        }
        const descriptor = shownChannel(ctx.session, ctx.side, channel, true);
        return descriptor?.renderable === true ? [descriptor] : [];
    });
    const common = new Set(LABEL_RUBRIC.common.flatMap((line) => labelLineFields(line)));
    const commonFlats = new Set([...common].map((field) => flatOf(ctx.side, label.kind.style, field)));
    const changed =
        others.length > 0 ||
        Object.keys(style).some((field) => field !== "look" && !common.has(field as keyof LabelStyle)) ||
        [...flats].some((flat) => !commonFlats.has(flat) && setOn(ctx, flat));
    // A field set in the style or through its own channel; each field once, the unit lines left to the pop-over.
    const fieldSet = (field: LabelField): boolean => {
        const flat = flatOf(ctx.side, label.kind.style, field);
        return (
            (style as Readonly<Record<string, unknown>>)[field] !== undefined ||
            (flat !== undefined && setOn(ctx, flat))
        );
    };
    const seen = new Set<LabelField>();
    const setLines = [
        ...LABEL_RUBRIC.common,
        ...LABEL_RUBRIC.main,
        ...LABEL_RUBRIC.groups.flatMap((group) => group.lines),
    ].filter((line) => {
        const fields = labelLineFields(line);
        if (
            line.unit !== undefined ||
            fields.some((field) => seen.has(field)) ||
            // Size and Color are drawn on the row set or not (ia-design 2); every other line once set.
            (!fields.some((field) => fieldSet(field)) && !LABEL_RUBRIC.common.includes(line))
        ) {
            return false;
        }
        fields.forEach((field) => seen.add(field));
        return true;
    });
    const settings = (
        <RowSettings
            label={`${title} settings`}
            title={title}
            changed={changed}
            opened={open}
            onOpenChange={onOpenChange}
        >
            <LabelPopover label={label} others={others} first={member} />
        </RowSettings>
    );
    const frame = (
        <LineFrame
            line={entry === undefined ? kind.words : `${ctx.side}.labels.${entry}.text`}
            name={name}
            set
            rule="R12"
            control={
                <TextSource
                    ctx={ctx}
                    kind={kind}
                    title={title}
                    opensAtOnce={pending && words === undefined}
                    words={words}
                    also={sharedWhere(ctx, kind, entry)}
                    onWrite={writeWords}
                    entry={entry}
                    onTemplate={formattedWriter(ctx, kind, entry)}
                />
            }
            modifier={settings}
            removeName={removeLabel}
            onRemove={onRemove}
        />
    );
    // A label is renamed in place (its entry's name; the main label's is the entry with its id): a double-click on
    // its name, F2 on the row, or the row's menu (a right-click, a touch held, Shift+F10). An empty name, its own or
    // another label's writes nothing. A tooltip or an external label keeps its thing's name.
    const named = entry ?? (kind.list === undefined ? undefined : MAIN_LABEL_ID);
    const rename = (typed: string): void => {
        setRenaming(false);
        const next = typed.trim();
        if (named === undefined || !nameFree(ctx, named, next)) {
            return;
        }
        writeEntry(ctx, named, { name: next }).catch((error: unknown) => {
            store.set({ notice: { message: failureWords(title, "renamed", error), error: true } });
        });
    };
    const startRename = (): void => {
        setRenaming(true);
    };
    const head =
        named === undefined ? (
            frame
        ) : (
            <ContextMenu
                target={
                    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- only catches a double-click on the name and F2 bubbling from the row's own controls; the menu's Rename is the keyboard and touch door
                    <div
                        className="sp2-label-head"
                        data-renaming={renaming ? "" : undefined}
                        onDoubleClick={(event) => {
                            if ((event.target as Element).closest('[data-testid="control-group-label"]') !== null) {
                                startRename();
                            }
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "F2") {
                                event.preventDefault();
                                startRename();
                            }
                        }}
                    >
                        {renaming ? (
                            <InlineRename
                                value={name}
                                label={`${title} name`}
                                onCommit={rename}
                                onCancel={() => {
                                    setRenaming(false);
                                }}
                            />
                        ) : null}
                        {frame}
                    </div>
                }
            >
                <CommandMenuItem
                    icon={<GLYPHS.rename size={14} aria-hidden />}
                    label="Rename"
                    shortcut="F2"
                    reason={null}
                    onRun={startRename}
                />
            </ContextMenu>
        );
    return (
        <>
            {head}
            {/* Every line of the label the layer sets, in the pop-over's order, named (design 2.5). */}
            {setLines.map((line) => (
                <LabelFieldLine key={`${line.field}-${line.name ?? ""}`} label={label} line={line} named />
            ))}
        </>
    );
}
