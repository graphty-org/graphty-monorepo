/**
 * A label, external label or tooltip row in Style panel v2 (design/ui/style-panel-v2/design.md,
 * sections 2.4, 2.5, 5.1 and 7.3): its name, its text source (R12: today's source list, with
 * Fixed text first) as the main control, its settings button and its minus; then its Size and
 * color common lines. Added with "+", the row waits empty with its source list open, and nothing
 * is written until a source is picked or a line is set.
 */

import { type Channel, type ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { LabelStyle } from "@graphty/graphty-element/schema";
import React, { useState } from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { cardSummary } from "../cardLines";
import { SourcePicker } from "../LabelSection";
import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { type Line, lineIn, propose, sourceName, textBinding, writeIn } from "../row";
import { ValueField } from "../ValueField";
import { failureWords } from "../words";
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
import { unsetIn } from "./lineWrites";
import { LineFrame } from "./RubricLine";
import { RowSettings } from "./ThingLine";
import { setOn } from "./things";
import { ValueButton } from "./ValueButton";

/**
 * A layer's label style as written, or an empty one.
 * @param line - the line that writes the style channel, if any.
 * @returns the style.
 */
function styleOf(line: Line | undefined): Readonly<LabelStyle> {
    const value = line?.value;
    return typeof value === "object" && !Array.isArray(value) && !("r" in value) ? (value as LabelStyle) : {};
}

/**
 * Where the words come from, as the source field shows it: the value they read, a card's summary,
 * the typed words, or nothing.
 * @param ctx - the row.
 * @param words - the words line.
 * @returns the words.
 */
function sourceText(ctx: RowContext, words: Line | undefined): string {
    if (words === undefined) {
        return "";
    }
    if (words.template !== undefined) {
        return cardSummary(ctx.session, words.template);
    }
    if (words.binding !== undefined) {
        return sourceName(ctx.session, words.binding) ?? words.binding.by;
    }
    return typeof words.value === "string" ? words.value : "";
}

/**
 * The size a label's words start at, written with its first words (design 5.1): graphty-element's starting
 * size for the field, where neither this layer nor a layer beneath sizes it, so a new label can be read.
 * @param ctx - the row.
 * @param kind - the text thing.
 * @returns the label style to write with the words, or nothing when it is sized already.
 */
function startingSize(ctx: RowContext, kind: TextThing): Partial<Record<Channel, LabelStyle>> {
    const start = labelFieldDescriptor("size")?.start;
    const own = styleOf(lineIn(ctx, kind.style));
    const beneath = ctx.beneath(kind.style).value;
    const below = typeof beneath === "object" && beneath !== null ? (beneath as LabelStyle) : {};
    const sized = (["size", "sizePx", "letterSize"] as const).some((field) => {
        const flat = flatOf(ctx.side, kind.style, field);
        return own[field] !== undefined || below[field] !== undefined || (flat !== undefined && setOn(ctx, flat));
    });
    return typeof start !== "number" || sized ? {} : { [kind.style]: { ...own, size: start } };
}

/**
 * The text source (R12): a field showing where the words come from, which opens today's source
 * list; Fixed text turns it into the words' own field until they are typed.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.kind - the text thing
 * @param props.title - its name with its kind ("Node label")
 * @param props.opensAtOnce - just added: the list opens at once
 * @returns The control
 */
function TextSource({
    ctx,
    kind,
    title,
    opensAtOnce,
}: Readonly<{ ctx: RowContext; kind: TextThing; title: string; opensAtOnce: boolean }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(opensAtOnce);
    const [typing, setTyping] = useState(false);
    const { session } = ctx;
    const words = lineIn(ctx, kind.words);
    const shown = sourceText(ctx, words);
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
                value={typed ? shown : undefined}
                shown={undefined}
                onChange={(next) => {
                    setTyping(false);
                    writeIn(ctx, kind.words, { value: next }, startingSize(ctx, kind), true).catch(fail);
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
                    writeIn(
                        ctx,
                        kind.words,
                        { binding: textBinding(session, proposal.binding) },
                        startingSize(ctx, kind),
                        true,
                    ).catch(fail);
                }
            }}
        >
            <ValueButton
                label={`${title} source`}
                words={shown}
                opens="dialog"
                expanded={open}
                left={bound ? <GLYPHS.link size={12} aria-hidden /> : undefined}
                right={<GLYPHS.expand size={12} aria-hidden />}
            />
        </SourcePicker>
    );
}

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
    readonly removeLabel: string;
    readonly onRemove: () => void;
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
 * @param props.removeLabel - see LabelRowProps
 * @param props.onRemove - see LabelRowProps
 * @returns The row and its common lines
 */
export function LabelRow({
    ctx,
    kind,
    name,
    title,
    channels,
    pending,
    removeLabel,
    onRemove,
}: LabelRowProps): React.JSX.Element {
    const { store } = useWorkspace();
    const styleLine = lineIn(ctx, kind.style);
    const style = styleOf(styleLine);
    const write = (patch: LabelPatch, drop: readonly Channel[] = []): void => {
        const next = Object.fromEntries(
            Object.entries({ ...style, ...patch }).filter(([, value]) => value !== undefined),
        ) as LabelStyle;
        const held = drop.filter((channel) => setOn(ctx, channel));
        let done: Promise<unknown>;
        if (Object.keys(next).length === 0) {
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
    const label: LabelLineContext = { ctx, kind, title, style, write };
    // Each field's own channel a line draws in its place.
    const flats = new Set(
        [...LABEL_COVERED].flatMap((field) => {
            const flat = flatOf(ctx.side, kind.style, field);
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
    const commonFlats = new Set([...common].map((field) => flatOf(ctx.side, kind.style, field)));
    const changed =
        others.length > 0 ||
        Object.keys(style).some((field) => !common.has(field as keyof LabelStyle)) ||
        [...flats].some((flat) => !commonFlats.has(flat) && setOn(ctx, flat));
    // A field set in the style or through its own channel; each field once, the unit lines left to the pop-over.
    const fieldSet = (field: LabelField): boolean => {
        const flat = flatOf(ctx.side, kind.style, field);
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
            !fields.some((field) => fieldSet(field))
        ) {
            return false;
        }
        fields.forEach((field) => seen.add(field));
        return true;
    });
    const settings = (
        <RowSettings label={`${title} settings`} title={title} changed={changed}>
            <LabelPopover label={label} others={others} />
        </RowSettings>
    );
    return (
        <>
            <LineFrame
                line={kind.words}
                name={name}
                set
                rule="R12"
                control={
                    <TextSource
                        ctx={ctx}
                        kind={kind}
                        title={title}
                        opensAtOnce={pending && lineIn(ctx, kind.words) === undefined}
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
