import {
    ComboInput,
    CompactColorInput,
    Popout,
    PopoutButton,
    StyleSelect,
    VariablePill,
} from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer, LegendBlock } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Text, TextInput, Tooltip } from "@mantine/core";
import React, { useLayoutEffect, useRef, useState } from "react";

import { factSentence, paintWords, swatchName } from "../canvas/legendWords";
import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { BindingPopover } from "./BindingPopover";
import {
    type DataBinding,
    type DataChoice,
    layerWord,
    type Line,
    lineIn,
    type LiteralWrite,
    type NewLayer,
    type PaintedOver,
    partlySet,
    propose,
    readsNothing,
    removeLine,
    sourceName,
    startingValue,
    type Target,
    writeIn,
} from "./row";
import { focusLineNext, listOpensNext, openListNext } from "./useFocusLine";
import { ValueField } from "./ValueField";
import { ValuePicker } from "./ValuePicker";
import {
    bindLabel,
    channelWord,
    COMBINE_WORDS,
    enumWords,
    failureWords,
    fieldName,
    hexOf,
    isPercent,
    listWords,
    paletteWord,
    SCALE_WORDS,
    takesBinding,
    valueWords,
} from "./words";

/** The width of a field's pop-outs (the vary list, a binding, a row's settings): 240 px at every window size. */
const POPOUT_WIDTH = 240;

/** The first choice of a vary list that keeps the field's own value. */
const FIXED_LABELS: Partial<Record<Channel, string>> = { "node.size": "Fixed size", "node.tooltip": "Fixed text" };

/**
 * What the layers beneath a row paint for one channel, when they paint one plain value on all of
 * its elements. Never shown: "+" starts a property from it.
 */
export interface BeneathValue {
    readonly value?: unknown;
}

/** Everything a field of one row needs: the row, where it writes, and what lies beneath it. */
export interface RowContext {
    readonly session: GraphSession;
    /** The row's layers. */
    readonly row: readonly LayerId[];
    /** Nodes or edges. */
    readonly side: Target;
    /** The row's layers on this side, bottom first. */
    readonly layers: readonly Layer[];
    /** The layer the row's first edit adds, when the row adds one. */
    readonly fresh?: NewLayer;
    /** What the layers beneath the row paint for a channel, for "+" to start from. */
    readonly beneath: (channel: Channel) => BeneathValue;
    /** The colors the document already uses, offered in the color picker. */
    readonly documentColors: readonly string[];
    /** Several rows edited together: what they share, and writes that reach every one of them. */
    readonly many?: ManyRows;
    /** Which of the row's fields a layer above covers, where the row is a tree row. */
    readonly paintedOver?: (channel: Channel) => PaintedOver | undefined;
}

/** Several rows edited as one: each write reaches every row, one undo step. */
export interface ManyRows {
    /** The line every row writes alike, or undefined when none writes it or they differ. */
    readonly line: (channel: Channel) => Line | undefined;
    /** How many of the rows write the channel. */
    readonly count: (channel: Channel) => number;
    /** How many rows are edited together. */
    readonly of: number;
    /** Writes one value or binding to every row. */
    readonly write: (channel: Channel, write: LiteralWrite | { readonly binding: DataBinding }) => Promise<unknown>;
    /** Takes the channel off every row. */
    readonly clear: (channel: Channel) => Promise<unknown>;
    /**
     * Which rows set the channel, which do not, how many values they set it to, and the locked
     * rows an edit leaves alone.
     */
    readonly breakdown?: (channel: Channel) => Breakdown;
    /**
     * The layers Vary by data would write: of those a write reaches, the ones that each hold one
     * value of a field (a group of a run), and the names of the rows left out.
     */
    readonly varies?: (channel: Channel) => { readonly layers: readonly Layer[]; readonly left: readonly string[] };
    /** Copies a binding into each layer `varies` names, as its own rule. */
    readonly vary?: (channel: Channel, binding: DataBinding) => Promise<unknown>;
    /** What the last write of the channel did, while it is the last write. */
    readonly receipt?: (channel: Channel) => BulkReceipt | undefined;
    /** Writes the last write again to the rows it left unset. */
    readonly alsoSet?: (channel: Channel) => Promise<unknown>;
    /** Puts the receipt away. */
    readonly dismiss?: () => void;
}

/** Who sets a channel among several rows edited together. */
export interface Breakdown {
    readonly set: readonly string[];
    readonly unset: readonly string[];
    readonly values: number;
    readonly locked: readonly string[];
}

/** What a write to several rows did: shown under the field it came from. */
export interface BulkReceipt {
    /** How many layers it changed. */
    readonly changed: number;
    /** The rows it left unset because they did not set the property, by name. */
    readonly unset: readonly string[];
    /** How many locked layers it skipped. */
    readonly locked: number;
    /** The rows Vary by data left as they were, holding more than one group, by name. */
    readonly kept?: readonly string[];
    /** Of the rows left unset, those that reach every element: setting them paints over everything. */
    readonly everything?: readonly string[];
}

/**
 * The words under a Mixed field: "3 layers set fill, to 3 values; not set: Top 10 labels".
 * @param name - the property's name.
 * @param breakdown - who sets it.
 * @param breakdown.set - the rows that set it.
 * @param breakdown.unset - the rows that do not.
 * @param breakdown.values - how many values they set.
 * @param breakdown.locked - the locked rows an edit leaves alone.
 * @returns the words.
 */
function breakdownWords(name: string, { set, unset, values, locked }: Breakdown): string {
    const plural = (n: number, noun: string): string => `${String(n)} ${noun}${n === 1 ? "" : "s"}`;
    const verb = set.length === 1 ? "sets" : "set";
    const setWords = `${plural(set.length, "layer")} ${verb} ${name.toLowerCase()}${values > 1 ? `, to ${plural(values, "value")}` : ""}`;
    return [
        setWords,
        ...(unset.length === 0 ? [] : [`not set: ${namesWords(unset)}`]),
        ...(locked.length === 0 ? [] : [`locked, left alone: ${namesWords(locked)}`]),
    ].join("; ");
}

/**
 * Some row names, the first three and how many more.
 * @param names - the names.
 * @returns the words.
 */
function namesWords(names: readonly string[]): string {
    return names.length <= 3
        ? listWords(names)
        : `${names.slice(0, 3).join(", ")} and ${String(names.length - 3)} more`;
}

/**
 * The receipt under a field after a write to several rows: "Fill: 5 changed, 1 left unset, 1
 * locked skipped", with "Also set those 1" and Undo.
 * @param props - Component props
 * @param props.ctx - the rows
 * @param props.channel - the channel written
 * @param props.name - the property's name
 * @param props.receipt - what the write did
 * @returns The receipt
 */
function Receipt({
    ctx,
    channel,
    name,
    receipt,
}: Readonly<{ ctx: RowContext; channel: Channel; name: string; receipt: BulkReceipt }>): React.JSX.Element {
    const { store } = useWorkspace();
    const kept = receipt.kept ?? [];
    const words = [
        `${String(receipt.changed)} changed`,
        ...(receipt.unset.length === 0 ? [] : [`${String(receipt.unset.length)} left unset`]),
        ...(kept.length === 0 ? [] : [`${String(kept.length)} left as ${kept.length === 1 ? "it was" : "they were"}`]),
        ...(receipt.locked === 0 ? [] : [`${String(receipt.locked)} locked skipped`]),
    ].join(", ");
    const everything = receipt.everything ?? [];
    return (
        <div className="ws-bulk-receipt" role="status" data-receipt={channel}>
            <Text className="ws-bulk-words">
                {name}: {words}
            </Text>
            {kept.length === 0 ? null : (
                <Text className="ws-bulk-words">
                    {`${namesWords(kept)} ${kept.length === 1 ? "holds" : "hold"} more than one group, so no one rule fits`}
                </Text>
            )}
            {everything.length === 0 ? null : (
                <Text className="ws-bulk-words" data-covers-everything>
                    {`${namesWords(everything)} ${everything.length === 1 ? "covers" : "cover"} every ${ctx.side === "node" ? "node" : "edge"}: setting ${name.toLowerCase()} there paints over all the others`}
                </Text>
            )}
            {receipt.unset.length > 0 && (
                <Button
                    size="compact-xs"
                    variant="subtle"
                    title={`Set ${name.toLowerCase()} on ${namesWords(receipt.unset)} too`}
                    onClick={() => {
                        void ctx.many?.alsoSet?.(channel);
                    }}
                >
                    {`Also set those ${String(receipt.unset.length)}`}
                </Button>
            )}
            <Button
                size="compact-xs"
                variant="subtle"
                // Named for its edit, so it is not a second plain "Undo" beside the top bar's.
                aria-label={`Undo the ${name.toLowerCase()} change`}
                onClick={() => {
                    ctx.many?.dismiss?.();
                    store.set({ announcement: `Undid changing ${name.toLowerCase()}` });
                    void ctx.session.undo();
                }}
            >
                Undo
            </Button>
        </div>
    );
}

/**
 * The words under a set field a layer above covers: "Covered by Degree on 77 of 77".
 * @param over - who covers it, and where.
 * @returns the words.
 */
function coveredWords(over: PaintedOver): string {
    return `Covered by ${listWords(over.by)} on ${String(over.count)} of ${String(over.of)}`;
}

/**
 * Hands focus to its section's "+" when a row that holds focus goes away (its minus, Delete, or an
 * Undo of the add), so focus never falls to the page (WCAG 2.4.3).
 * @param box - the row.
 */
function useFocusOnRemoval(box: React.RefObject<HTMLElement | null>): void {
    useLayoutEffect(() => {
        const node = box.current;
        return () => {
            if (node === null || !node.contains(document.activeElement)) {
                return;
            }
            const section = node.closest<HTMLElement>("[data-section]")?.dataset.section;
            requestAnimationFrame(() => {
                if (section !== undefined && (document.activeElement === document.body || !node.isConnected)) {
                    document.querySelector<HTMLElement>(`[data-section="${section}"] [data-plus]`)?.focus();
                }
            });
        };
    }, [box]);
}

/** Props for Field. */
interface FieldProps {
    /** The row the field belongs to. */
    readonly ctx: RowContext;
    /** The property. */
    readonly descriptor: ChannelDescriptor;
    /** The name drawn in the label column, when not the property's own ("Color" in an effect's pop-out). */
    readonly word?: string;
    /**
     * Several rows: the property was just added with "+" and none of them sets it yet. The field
     * shows what lies beneath and writes to every row once a value is picked.
     */
    readonly pending?: boolean;
    /** Takes a property added with "+" away again before any row sets it. */
    readonly onCancel?: () => void;
}

/**
 * One property this layer sets (the owner's style panel design, 2026-10-13): its name, its value,
 * the vary glyph, and a minus that removes it so the layers beneath show through. A property the
 * layer does not set has no row at all, so nothing here ever shows a value from beneath. Several
 * rows edited together that do not all set it alike read "Set on 1 of 2" with no value.
 * Delete or Backspace on a closed select or color chit, or Enter in an emptied typed field, removes
 * it too. A layer above that covers it adds a caption: "Covered by Degree on 77 of 77".
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.word - the name drawn in the label column, when not the property's own
 * @param props.pending - just added with "+" on several rows, waiting for a value
 * @param props.onCancel - takes a just-added property away again
 * @returns The row, or nothing when the layer does not set the property
 */
export function Field({
    ctx,
    descriptor,
    word,
    pending = false,
    onCancel,
}: Readonly<FieldProps>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const box = useRef<HTMLDivElement>(null);
    const { session } = ctx;
    const { channel } = descriptor;
    // "=" in a field opens the value picker, as Figma's "apply variable" does (a typed text keeps
    // its "="). A Tooltip just added opens it at once: an empty tooltip says nothing.
    const [varyOpen, setVaryOpen] = useState(() => listOpensNext(channel));
    // Several layers: the value picked in Vary, waiting for Apply under its per-layer preview.
    const [pendingVary, setPendingVary] = useState<DataChoice | null>(null);
    useFocusOnRemoval(box);
    const line = lineIn(ctx, channel);
    // A line on a locked layer (the element's own base layers) is not this row's.
    const own = line !== undefined && !line.layer.locked ? line : undefined;
    const partly = own === undefined ? partlySet(ctx, channel) : undefined;
    if (own === undefined && partly === undefined && !pending) {
        return null;
    }
    const name = fieldName(channel);
    const receipt = ctx.many?.receipt?.(channel);
    // A layer above covers this row's value on some of its elements (a shown row only).
    const over = own === undefined || !own.layer.enabled ? undefined : ctx.paintedOver?.(channel);
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(channelWord(channel), "changed", error), error: true } });
    };
    const write = (next: LiteralWrite | { binding: DataBinding }): void => {
        writeIn(ctx, channel, next).catch(fail);
    };
    const writeValue = (value: ChannelValue): void => {
        write(own?.combine === undefined ? { value } : { value, combine: own.combine });
    };
    const remove = (): void => {
        store.set({ announcement: `${name} removed` });
        // A property "+" added is no longer waiting, set or not.
        onCancel?.();
        if (own === undefined && partly === undefined) {
            // Added with "+" and set on no row yet: nothing to write.
            return;
        }
        const { many } = ctx;
        if (many !== undefined) {
            many.clear(channel).catch(fail);
            return;
        }
        if (own === undefined) {
            return;
        }
        // One step, named so Undo reads "Undid removing node size from Key people".
        session
            .transaction(
                `removing ${name.toLowerCase()} from ${layerWord(session, own.layer.id) ?? "the default"}`,
                async (tx) => {
                    const layer = tx.styles.get(own.layer.id);
                    if (layer !== undefined) {
                        await removeLine(tx, layer, channel);
                    }
                },
            )
            .catch(fail);
    };
    const bind = (choice: DataChoice): void => {
        const proposal = propose(session, choice, channel);
        if (!proposal.ok) {
            return;
        }
        // Several layers: show what the copy paints in each before writing it.
        if (ctx.many === undefined) {
            write({ binding: proposal.binding });
        } else {
            setPendingVary(choice);
        }
    };
    const varies =
        takesBinding(descriptor) &&
        ((own !== undefined && own.binding === undefined) || (own === undefined && ctx.many !== undefined));
    // The keyboard's remove: empty a typed field and press Enter, or Delete / Backspace on a
    // closed select or a color chit.
    const onKeyDownCapture = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        const target = event.target as HTMLElement;
        if (target.closest(".ws-field-control") === null) {
            return;
        }
        if (event.key === "=" && varies && descriptor.accepts !== "text" && target instanceof HTMLInputElement) {
            event.preventDefault();
            event.stopPropagation();
            setVaryOpen(true);
            return;
        }
        const typed = target instanceof HTMLInputElement && !target.readOnly;
        const closed = target.getAttribute("aria-expanded") !== "true";
        if (
            (event.key === "Enter" && typed && target.value.trim() === "") ||
            ((event.key === "Delete" || event.key === "Backspace") && !typed && closed)
        ) {
            event.preventDefault();
            event.stopPropagation();
            remove();
        }
    };

    let control: React.ReactNode;
    if (own === undefined) {
        // Several rows that set it differently: Mixed, with no value borrowed from any of them,
        // and a typed or picked value writes to them. Just added with "+": what lies beneath,
        // as a field not set yet, until a value is picked.
        control = (
            <ValueField
                descriptor={descriptor}
                label={name}
                value={undefined}
                shown={pending && partly === undefined ? ctx.beneath(channel).value : undefined}
                mixed={!pending || partly !== undefined}
                onChange={(value) => {
                    write({ value });
                }}
            />
        );
    } else if (own.binding !== undefined) {
        control = (
            <BoundValue
                ctx={ctx}
                descriptor={descriptor}
                layer={own.layer}
                binding={own.binding}
                write={write}
                bind={bind}
            />
        );
    } else if (descriptor.accepts === "color") {
        const hex = hexOf(own.value) ?? "#000000";
        control = (
            <CompactColorInput
                aria-label={name}
                width="100%"
                color={hex}
                defaultColor={hex}
                showOpacity={false}
                showReset={false}
                swatches={ctx.documentColors}
                onChangeEnd={(next) => {
                    if (next !== undefined && next.toUpperCase() !== hex) {
                        writeValue(next.toUpperCase());
                    }
                }}
            />
        );
    } else if (descriptor.accepts === "enum" || descriptor.accepts === "boolean") {
        control = (
            <ValueField
                descriptor={descriptor}
                label={name}
                value={own.value}
                shown={own.value}
                onChange={writeValue}
            />
        );
    } else if (descriptor.accepts === "number") {
        const prefix = own.combine === undefined ? undefined : COMBINE_WORDS[own.combine].prefix;
        // An opacity reads and types as a percent, as a color field's opacity does.
        const percent = isPercent(descriptor);
        const scale = percent ? 100 : 1;
        control = (
            <ComboInput
                label={name}
                width="100%"
                numeric
                variant="outlined"
                options={[]}
                value={typeof own.value === "number" ? Math.round(own.value * scale * 100) / 100 : ""}
                suffix={percent ? "%" : undefined}
                glyph={prefix === undefined ? undefined : <Text size="xs">{prefix}</Text>}
                min={descriptor.min === undefined ? undefined : descriptor.min * scale}
                max={descriptor.max === undefined ? undefined : descriptor.max * scale}
                step={!percent && descriptor.max !== undefined && descriptor.max <= 1 ? 0.1 : 1}
                onChange={(next) => {
                    if (typeof next === "number") {
                        writeValue(next / scale);
                    }
                }}
            />
        );
    } else {
        const text = typeof own.value === "string" ? own.value : "";
        control = (
            <TextInput
                // Keyed by the value, so Undo, Redo or another edit shows the new text.
                key={text}
                size="xs"
                variant="outlined"
                aria-label={name}
                defaultValue={text}
                onBlur={(event) => {
                    const next = event.currentTarget.value;
                    if (next !== "" && next !== text) {
                        writeValue(next);
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && event.currentTarget.value !== "") {
                        event.currentTarget.blur();
                    }
                }}
            />
        );
    }

    let varySlot: React.ReactNode = null;
    if (own?.binding !== undefined) {
        // A bound field's Stop varying sits where its vary glyph sat (Figma's detach on a variable
        // field). It is the one way back to a single value, so its words say what it does.
        const one = descriptor.accepts === "color" ? "one color" : "one value";
        varySlot = (
            <Tooltip label={`Stop varying by data: use ${one} for all`}>
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={`Stop varying ${name.toLowerCase()} by data`}
                    onClick={() => {
                        // A property set for a few groups goes back to the one value the rest have.
                        const value = own.binding?.otherwise ?? startingValue(descriptor, session, own.layer.selector);
                        // Focus stays on the property: its field, now holding the one value.
                        focusLineNext(channel, "fixed");
                        store.set({
                            announcement: `${name} no longer varies by data, now ${valueWords(descriptor, value)}`,
                        });
                        write({ value });
                    }}
                >
                    <GLYPHS.unlink size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        );
    } else if (varies) {
        const off = ctx.many === undefined ? null : varyOffReason(ctx, channel);
        varySlot =
            off === null ? (
                <VaryButton
                    ctx={ctx}
                    descriptor={descriptor}
                    onPick={bind}
                    open={varyOpen}
                    onOpenChange={setVaryOpen}
                />
            ) : (
                <Tooltip label={off} multiline w={220}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={`${name} by attribute: ${off}`}
                        aria-disabled
                        data-disabled
                        onClick={(event) => {
                            event.preventDefault();
                        }}
                    >
                        <GLYPHS.link size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            );
    }
    const removeName =
        ctx.many === undefined ? `Remove ${name.toLowerCase()}` : `Remove ${name.toLowerCase()} from every layer`;
    return (
        <div
            ref={box}
            className="ws-row"
            data-line={channel}
            data-set=""
            data-accepts={descriptor.accepts}
            data-bound={own?.binding === undefined ? undefined : ""}
            data-covered={over === undefined ? undefined : ""}
            onKeyDownCapture={onKeyDownCapture}
        >
            {/* One line: the name, the field, then two reserved 24 px columns, vary and minus,
                so the field keeps its width (Figma's property row). */}
            <div className="ws-field ws-varies" data-named="">
                <span className="ws-field-label">
                    <span className="ws-field-name" title={word ?? channelWord(channel)} aria-hidden>
                        {word ?? channelWord(channel)}
                    </span>
                </span>
                <div className="ws-field-control">{control}</div>
                <span className="ws-slot ws-vary">{varySlot}</span>
                <span className="ws-slot">
                    <Tooltip label={removeName}>
                        <ActionIcon variant="subtle" size="sm" aria-label={removeName} onClick={remove}>
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            </div>
            {over === undefined ? null : (
                <Text size="xs" c="var(--cm-text-secondary)" className="ws-field-covered" data-covered-caption>
                    {coveredWords(over)}
                </Text>
            )}
            {ctx.many?.breakdown !== undefined &&
            (own === undefined || ctx.many.count(channel) < ctx.many.of) &&
            (!pending || partly !== undefined) ? (
                <Text className="ws-field-covered ws-bulk-words" data-breakdown>
                    {breakdownWords(word ?? channelWord(channel), ctx.many.breakdown(channel))}
                </Text>
            ) : null}
            {pendingVary === null ? null : (
                <VaryPreview
                    ctx={ctx}
                    descriptor={descriptor}
                    choice={pendingVary}
                    onApply={(binding) => {
                        setPendingVary(null);
                        // Focus goes to the receipt's first action, where the next step is: the
                        // field's own tooltip would cover the receipt.
                        ctx.many
                            ?.vary?.(channel, binding)
                            .then(() => {
                                requestAnimationFrame(() => {
                                    box.current?.querySelector<HTMLElement>("[data-receipt] button")?.focus();
                                });
                            })
                            .catch(fail);
                    }}
                    onCancel={() => {
                        setPendingVary(null);
                    }}
                />
            )}
            {receipt === undefined ? null : (
                <Receipt ctx={ctx} channel={channel} name={word ?? channelWord(channel)} receipt={receipt} />
            )}
        </div>
    );
}

/**
 * Why several layers cannot vary a property by data, or null when they can: they can when at
 * least one layer the write reaches holds one value of a field its rule selects by (a group of a
 * run); the layers that hold more are left as they are, and the preview says so.
 * @param ctx - the rows.
 * @param channel - the channel.
 * @returns the reason, or null.
 */
function varyOffReason(ctx: RowContext, channel: Channel): string | null {
    const varies = ctx.many?.varies?.(channel);
    if (varies === undefined || varies.layers.length > 0) {
        return null;
    }
    const { left } = varies;
    const whose = left.length === 0 ? "None of these layers" : namesWords(left);
    return `Varying by data copies one rule into each layer that holds one group. ${whose} ${left.length === 1 ? "holds" : "hold"} more than one group, or none.`;
}

/**
 * The palettes a rule copied into several group layers can paint with: the categorical ones.
 * @param session - the element's session.
 * @returns the palettes.
 */
function groupPalettes(session: GraphSession): ReturnType<GraphSession["catalog"]["palettes"]> {
    // Two-color highlight palettes name one value against the rest, never a set of groups.
    return session.catalog.palettes().filter((p) => p.kind === "categorical" && p.colors.length > 2);
}

/**
 * The rule a value picked in Vary copies into several layers that each hold one group: each layer
 * is one group, so the rule reads the value as categories (one color, shape or pattern per
 * value), with every value past the palette given a color of its own rather than folded into
 * "other". A number or a size keeps the element's own proposal. Falls back to it when the element
 * refuses categories.
 * @param session - the element's session.
 * @param choice - the value picked.
 * @param descriptor - the property.
 * @param palette - a palette the reader picked.
 * @returns the binding, or null when the element refuses the channel.
 */
function manyBinding(
    session: GraphSession,
    choice: DataChoice,
    descriptor: ChannelDescriptor,
    palette: string | undefined,
): DataBinding | null {
    const plain = propose(session, choice, descriptor.channel);
    if (descriptor.accepts !== "color") {
        return plain.ok ? plain.binding : null;
    }
    // A categorical palette unless the reader picks another: past its colors, each group still
    // gets one of its own ("extend"), never a ramp chosen for the number of groups.
    const named = palette ?? groupPalettes(session)[0]?.id;
    const options = {
        channel: descriptor.channel,
        scale: "ordinal",
        overflow: "extend",
        ...(named === undefined ? {} : { palette: named }),
    } as const;
    const proposal =
        choice.kind === "column"
            ? session.styles.proposeEncoding({ column: choice.column, ...options })
            : session.styles.proposeEncoding({ run: choice.runId, field: choice.field, ...options });
    if (proposal.ok) {
        return proposal.binding;
    }
    return plain.ok ? plain.binding : null;
}

/**
 * What a binding copied into each of several layers would paint in each, before it is written:
 * for a color, a palette to pick; one line per layer, top first, with its values
 * (`styles.preview` within the layer); the layers left as they are; then Apply and Cancel.
 * @param props - Component props
 * @param props.ctx - the rows
 * @param props.descriptor - the property
 * @param props.choice - the value picked
 * @param props.onApply - writes the binding
 * @param props.onCancel - drops it
 * @returns The preview
 */
function VaryPreview({
    ctx,
    descriptor,
    choice,
    onApply,
    onCancel,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor;
    choice: DataChoice;
    onApply: (binding: DataBinding) => void;
    onCancel: () => void;
}>): React.JSX.Element | null {
    const [palette, setPalette] = useState<string | undefined>(undefined);
    const { session } = ctx;
    const name = channelWord(descriptor.channel);
    const binding = manyBinding(session, choice, descriptor, palette);
    const varies = ctx.many?.varies?.(descriptor.channel) ?? { layers: [], left: [] };
    if (binding === null) {
        return null;
    }
    const source = sourceName(session, binding) ?? binding.by;
    const palettes = descriptor.accepts === "color" ? groupPalettes(session) : [];
    return (
        <div className="ws-bulk-vary" role="group" aria-label={`${name} by ${source}, in each layer`}>
            {palettes.length === 0 ? null : (
                <StyleSelect
                    label="Palette"
                    value={binding.palette}
                    defaultValue={binding.palette ?? palettes[0].id}
                    options={palettes.map((p) => ({
                        value: p.id,
                        label: paletteWord(p.id),
                        glyph: (
                            <span
                                aria-hidden
                                className="ws-bulk-vary-palette"
                                style={{ background: `linear-gradient(to right, ${p.colors.slice(0, 8).join(", ")})` }}
                            />
                        ),
                    }))}
                    onChange={(next) => {
                        setPalette(next);
                    }}
                />
            )}
            <Text className="ws-bulk-words">Each layer gets its own rule:</Text>
            <ul className="ws-bulk-vary-list">
                {varies.layers.map((layer) => {
                    const bins = session.styles
                        .preview(binding, { channel: descriptor.channel, within: layer.id })
                        .bins.filter((bin) => bin.count > 0);
                    const shown = bins.slice(0, 4);
                    const rowName = layerWord(session, layer.id) ?? layer.name;
                    return (
                        <li key={layer.id} data-layer={layer.id} aria-label={rowName}>
                            <Text span truncate className="ws-bulk-vary-name ws-bulk-words">
                                {rowName}
                            </Text>
                            {shown.map((bin, at) => {
                                const hex = descriptor.accepts === "color" ? hexOf(bin.paints) : null;
                                // The bins of one preview, in its order: their place is their key.
                                const key = String(at);
                                return hex === null ? (
                                    <Text key={key} size="xs" span>
                                        {valueWords(descriptor, bin.paints)}
                                    </Text>
                                ) : (
                                    <span
                                        key={key}
                                        className="ws-bulk-vary-chit"
                                        role="img"
                                        aria-label={hex}
                                        style={{ background: hex }}
                                    />
                                );
                            })}
                            {bins.length > shown.length ? (
                                <Text size="xs" span>{`+${String(bins.length - shown.length)}`}</Text>
                            ) : null}
                        </li>
                    );
                })}
            </ul>
            {varies.left.length === 0 ? null : (
                <Text className="ws-bulk-words" data-vary-left>
                    {`Left as ${varies.left.length === 1 ? "it is" : "they are"}: ${namesWords(varies.left)}, which ${varies.left.length === 1 ? "holds" : "hold"} more than one group`}
                </Text>
            )}
            <div className="ws-bulk-vary-actions">
                <Button
                    size="compact-xs"
                    onClick={() => {
                        onApply(binding);
                    }}
                >
                    Apply
                </Button>
                <Button size="compact-xs" variant="subtle" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </div>
    );
}

/**
 * The vary glyph in its reserved 24 px column, for a field drawn outside a property row (an effect
 * entry): picking a value binds the channel on the row.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @returns The column, empty when the channel takes no binding
 */
export function VarySlot({
    ctx,
    descriptor,
}: Readonly<{ ctx: RowContext; descriptor: ChannelDescriptor }>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const bind = (choice: DataChoice): void => {
        const proposal = propose(ctx.session, choice, descriptor.channel);
        if (!proposal.ok) {
            return;
        }
        writeIn(ctx, descriptor.channel, { binding: proposal.binding }).catch((error: unknown) => {
            store.set({
                notice: { message: failureWords(channelWord(descriptor.channel), "changed", error), error: true },
            });
        });
    };
    return (
        <span className="ws-slot ws-vary">
            {takesBinding(descriptor) && (
                <VaryButton ctx={ctx} descriptor={descriptor} onPick={bind} open={open} onOpenChange={setOpen} />
            )}
        </span>
    );
}

/**
 * The vary glyph: opens the list of values the property can follow.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.onPick - binds the property to the picked value
 * @param props.open - whether the picker is open
 * @param props.onOpenChange - opens or closes it
 * @returns The button and its pop-out
 */
function VaryButton({
    ctx,
    descriptor,
    onPick,
    open,
    onOpenChange: setOpen,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor;
    onPick: (choice: DataChoice) => void;
    /** Whether the picker is open; the field opens it on "=" too. */
    open: boolean;
    onOpenChange: (open: boolean) => void;
}>): React.JSX.Element {
    const { channel } = descriptor;
    const openList = (next: boolean): void => {
        if (!next) {
            openListNext(null);
        }
        setOpen(next);
    };
    const label = bindLabel(descriptor);
    return (
        <Popout opened={open} onOpenChange={openList}>
            <Popout.Trigger>
                {/* The Tooltip passes the trigger's click and ref to the button, but not its ARIA,
                    so the button states its own. */}
                <Tooltip label={label}>
                    <PopoutButton
                        icon={<GLYPHS.link size={14} aria-hidden />}
                        aria-label={`${fieldName(channel)} by attribute`}
                        aria-haspopup="dialog"
                        aria-expanded={open}
                    />
                </Tooltip>
            </Popout.Trigger>
            <Popout.Panel
                width={POPOUT_WIDTH}
                placement="left"
                alignment="start"
                header={{ variant: "title", title: label }}
            >
                <ValuePicker
                    title={label}
                    target={ctx.side}
                    channel={channel}
                    fixedLabel={FIXED_LABELS[channel]}
                    onFixed={() => {
                        openList(false);
                        // The field keeps its value; focus goes to it to change it.
                        focusLineNext(channel);
                    }}
                    onPick={(choice) => {
                        openList(false);
                        // Several layers: the preview opens first, and Apply moves focus on.
                        if (ctx.many === undefined) {
                            focusLineNext(channel, true);
                        }
                        onPick(choice);
                    }}
                    onClose={() => {
                        openList(false);
                    }}
                />
            </Popout.Panel>
        </Popout>
    );
}

/**
 * A varied value: what it reads and its range or palette, as a value pill that opens the binding
 * popover and fixes it at a value.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.layer - the layer that holds the binding
 * @param props.binding - the binding
 * @param props.write - writes the field
 * @param props.bind - binds the field to another value
 * @returns The pill and its popover
 */
function BoundValue({
    ctx,
    descriptor,
    layer,
    binding,
    write,
    bind,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor;
    layer: Layer;
    binding: DataBinding;
    write: (next: LiteralWrite | { binding: DataBinding }) => void;
    bind: (choice: DataChoice) => void;
}>): React.JSX.Element {
    const { session } = ctx;
    const [open, setOpen] = useState(false);
    const pill = useRef<HTMLDivElement>(null);
    const name = channelWord(descriptor.channel);
    // Whether the path answers is graphty-element's call (its validate), not a search of the data.
    const unresolved = readsNothing(session, descriptor.target, descriptor.channel, binding);
    const source = sourceName(session, binding) ?? binding.by;
    const palette =
        binding.palette === undefined ? undefined : session.catalog.palettes().find((p) => p.id === binding.palette);
    // Never empty, so two fields reading one source never share an accessible name -- except a
    // text field (Tooltip), whose words are the source's own values: it shows the source.
    // A pill with no swatch shows its detail in place of the source's name, so a shape or a
    // pattern by data shows the source ("Louvain"), never the property's own name.
    let detail: string | undefined = palette === undefined ? name : paletteWord(palette.id);
    if (descriptor.accepts !== "color") {
        detail = undefined;
    }
    if (unresolved) {
        detail = "reads nothing";
    } else if (binding.range !== undefined) {
        detail = `${String(binding.range[0])} to ${String(binding.range[1])}`;
    }
    // The layer's own block: a copy the legend folds with others is still read on its own.
    const block = session.styles.legendOf(layer.id).find((b) => b.channel === descriptor.channel);
    let swatch: string | undefined;
    if (descriptor.accepts === "color") {
        // The colors the element paints for this field, from its legend; the named palette when
        // it has none to report (a path that reads nothing).
        const painted = block?.swatches.flatMap((s) => (s.color === undefined ? [] : [s.color]));
        const colors = painted !== undefined && painted.length > 0 ? painted : palette?.colors;
        // At rest a ramp is a strip and categories are chits side by side (hard stops).
        swatch =
            colors === undefined
                ? "var(--mantine-color-gray-5)"
                : `linear-gradient(to right, ${(block?.kind === "categorical" ? chits(colors) : colors).join(", ")})`;
    }
    // What the pill says to a screen reader after the field's name: the source, then its range or
    // palette by name ("Node size: Degree rank, 1 to 3").
    const spoken = detail === undefined || detail === name ? source : `${source}, ${detail}`;
    // The pill opens the popover itself (no Popout.Trigger), so it takes focus back itself: on
    // Escape or Done, while focus is still in the popover, never after a click elsewhere took it.
    const openChange = (next: boolean): void => {
        const inside = document.activeElement?.closest("[role=dialog]") !== null;
        setOpen(next);
        if (!next && inside) {
            pill.current?.querySelector<HTMLElement>("button")?.focus();
        }
    };

    // A property set for a few groups only (tier3 decisions, round 6): the row keeps the one value
    // every other group paints, editable here, and a second line says which groups differ.
    const { otherwise } = binding;
    const few =
        otherwise === undefined ? null : (
            <>
                <ValueField
                    descriptor={descriptor}
                    label={fieldName(descriptor.channel)}
                    value={otherwise}
                    shown={otherwise}
                    onChange={(next) => {
                        write({ binding: { ...binding, otherwise: typeof next === "boolean" ? String(next) : next } });
                    }}
                />
                <Button
                    size="compact-xs"
                    variant="subtle"
                    className="ws-varied-few"
                    aria-label={`${fieldName(descriptor.channel)}: ${entriesWords(descriptor, binding)} by ${source}`}
                    onClick={() => {
                        setOpen(true);
                    }}
                >
                    {entriesWords(descriptor, binding)}
                </Button>
            </>
        );
    return (
        // No Popout.Trigger: its click would also fire for the pill's detach button inside it, so
        // the pill opens the panel itself and the panel docks to it.
        <Popout opened={open} onOpenChange={openChange}>
            <div ref={pill} className="ws-varied">
                {few ?? (
                    <>
                        <VariablePill
                            name={source}
                            value={detail}
                            swatch={swatch}
                            swatchWidth={swatch === undefined ? undefined : SWATCH_STRIP}
                            width="100%"
                            aria-label={`${fieldName(descriptor.channel)}: ${spoken}`}
                            onClick={() => {
                                setOpen(true);
                            }}
                        />
                        <VariedLine block={block} />
                    </>
                )}
            </div>
            <Popout.Panel
                width={POPOUT_WIDTH}
                placement="left"
                alignment="start"
                anchorY={pill}
                header={{ variant: "title", title: `${name} from data` }}
            >
                <Popout.Content>
                    <BindingPopover
                        descriptor={descriptor}
                        layerId={layer.id}
                        binding={binding}
                        source={source}
                        onChange={(next) => {
                            write({ binding: next });
                        }}
                        onSource={bind}
                    />
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * The groups a property set for a few groups gives a value of their own, by value: "Box for 1
 * group", "Box for 2 groups, Star for 1 group".
 * @param descriptor - the property.
 * @param binding - its binding.
 * @returns the words.
 */
function entriesWords(descriptor: ChannelDescriptor, binding: DataBinding): string {
    const counts = new Map<string, number>();
    for (const entry of Object.values(binding.map ?? {})) {
        const words = valueWords(descriptor, entry);
        counts.set(words, (counts.get(words) ?? 0) + 1);
    }
    if (counts.size === 0) {
        return "No group has its own";
    }
    return [...counts]
        .map(
            ([words, n]) =>
                `${words.charAt(0).toUpperCase()}${words.slice(1)} for ${String(n)} ${n === 1 ? "group" : "groups"}`,
        )
        .join(", ");
}

/** How many groups' paints a varied field's second line names, for a property that is not a color. */
const MAX_WORDS = 3;

/** How many category chits a varied field's second line shows before "+N". */
const MAX_CHITS = 8;

/** The scales a varied field's second line says nothing about: the neutral ones. */
const NEUTRAL_SCALES: ReadonlySet<string> = new Set(["linear", "ordinal", "passthrough"]);

/**
 * A varied field's second line (tier3 design, section 2.2): up to 8 category chits and "+N", a
 * ramp's domain ends, or a number's From / To; then a note for each non-neutral setting ("Log
 * scale", the element's legend facts but the one the field's coverage caption already says), as
 * plain secondary text. All of it from the element's
 * legend block for the field.
 * @param props - Component props
 * @param props.block - the field's legend block, if the element has painted it
 * @returns The line, or nothing before the element has painted the field
 */
function VariedLine({ block }: Readonly<{ block: LegendBlock | undefined }>): React.JSX.Element | null {
    if (block === undefined) {
        return null;
    }
    const notes = [
        ...(block.scale === undefined || NEUTRAL_SCALES.has(block.scale.kind)
            ? []
            : [`${SCALE_WORDS[block.scale.kind] ?? enumWords(block.scale.kind)} scale`]),
        // The field's own coverage caption ("Covered by ... on 77 of 77") says who paints over it.
        ...block.facts.flatMap((fact) => {
            const sentence = fact.code === "legend.painted-over" ? null : factSentence(fact);
            return sentence === null ? [] : [sentence.charAt(0).toUpperCase() + sentence.slice(1)];
        }),
    ];
    let summary: React.ReactNode = null;
    if (block.kind === "categorical" && block.swatches.every((s) => s.color === undefined)) {
        // A shape, a pattern, a number or words by group: what each group paints, as words, since
        // a chit shows only a color.
        const rows = block.swatches.filter((s) => s.role !== "other");
        const shown = rows.slice(0, MAX_WORDS);
        const more = rows.length - shown.length + (block.overflow?.hidden ?? 0);
        summary = `${shown.map((s) => paintWords(s) ?? swatchName(block, s)).join(", ")}${more > 0 ? ` +${String(more)}` : ""}`;
    } else if (block.kind === "categorical") {
        const rows = block.swatches.filter((s) => s.role !== "other");
        const shown = rows.slice(0, MAX_CHITS);
        const more = rows.length - shown.length + (block.overflow?.hidden ?? 0);
        summary = (
            <span className="ws-varied-chits">
                {shown.map((swatch) => (
                    <span
                        key={swatchName(block, swatch)}
                        className="ws-varied-chit"
                        title={swatchName(block, swatch)}
                        style={{ background: swatch.color ?? "var(--mantine-color-gray-5)" }}
                    />
                ))}
                {more > 0 && <Text span size="xs" c="var(--cm-text-secondary)">{`+${String(more)}`}</Text>}
            </span>
        );
    } else if (block.range !== undefined) {
        summary = `From ${String(block.range.min)} to ${String(block.range.max)}`;
    } else if (block.domain !== undefined) {
        const end = (n: number): string => String(Number(n.toPrecision(4)));
        summary = (
            <span className="ws-varied-ends">
                <span>{end(block.domain.min)}</span>
                <span>{end(block.domain.max)}</span>
            </span>
        );
    }
    if (summary === null && notes.length === 0) {
        return null;
    }
    return (
        <div className="ws-varied-line" data-varied-line>
            {summary === null ? null : (
                <Text size="xs" c="var(--cm-text-secondary)" component="div">
                    {summary}
                </Text>
            )}
            {notes.map((note) => (
                <Text key={note} size="xs" c="var(--cm-text-secondary)" data-varied-note>
                    {note}
                </Text>
            ))}
        </div>
    );
}

/** How wide a bound color's swatch is at rest: a ramp strip, or six group chits side by side. */
const SWATCH_STRIP = 20;

/**
 * Category colors as hard gradient stops, so each reads as its own chit: at most six.
 * @param colors - the colors.
 * @returns the stops.
 */
function chits(colors: readonly string[]): string[] {
    const shown = colors.slice(0, 6);
    const step = 100 / shown.length;
    return shown.map((c, i) => `${c} ${String(i * step)}% ${String((i + 1) * step)}%`);
}
