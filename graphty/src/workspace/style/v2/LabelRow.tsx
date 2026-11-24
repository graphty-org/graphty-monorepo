/**
 * A label, external label or tooltip row in Style panel v2 (design/ui/style-panel-v2/design.md,
 * sections 2.4, 2.5, 5.1 and 7.3): its name, its text source (R12: today's source list, with
 * Fixed text first) as the main control, its settings button and its minus; then its Size and
 * color common lines. Added with "+", the row waits empty with its source list open, and nothing
 * is written until a source is picked or a line is set. Size and Color are drawn under it whether set or not.
 */

import { type Channel, type ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import React, { useState } from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { SourcePicker } from "../LabelSection";
import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { type DataBinding, type Line, lineIn, propose, textBinding, writeIn } from "../row";
import { ValueField } from "../ValueField";
import { failureWords } from "../words";
import { entryOf, entryWords, listChannel, writeEntry } from "./labelEntries";
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
}: Readonly<{
    ctx: RowContext;
    kind: TextThing;
    title: string;
    opensAtOnce: boolean;
    words: Line | undefined;
    also: string;
    onWrite: (write: { readonly value: string } | { readonly binding: DataBinding }) => Promise<unknown>;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(opensAtOnce);
    const [typing, setTyping] = useState(false);
    const { session } = ctx;
    const source = sourceText(ctx, words);
    // Two labels that read one source say where each sits ("Node id, above").
    const shown = also === "" || source === "" ? source : `${source}, ${also}`;
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
    return (
        <SourcePicker
            target={ctx.side}
            channel={kind.words}
            title={title}
            opened={open}
            onOpenChange={setOpen}
            inUse={bound ? [words.binding.by] : []}
            fixedInForce={typed}
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
}: LabelRowProps): React.JSX.Element {
    const { store } = useWorkspace();
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
        <RowSettings label={`${title} settings`} title={title} changed={changed}>
            <LabelPopover label={label} others={others} first={member} />
        </RowSettings>
    );
    return (
        <>
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
                    />
                }
                modifier={settings}
                removeName={removeLabel}
                onRemove={onRemove}
            />
            {/* Every line of the label the layer sets, in the pop-over's order, named (design 2.5). */}
            {setLines.map((line) => (
                <LabelFieldLine key={`${line.field}-${line.name ?? ""}`} label={label} line={line} named />
            ))}
        </>
    );
}
