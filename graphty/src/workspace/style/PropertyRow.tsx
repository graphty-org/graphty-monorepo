import { ComboInput, CompactColorInput, Popout, PopoutButton, VariablePill } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { Channel, ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, HistoryStepId, Layer, LayerGroup, LegendBlock } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Text, TextInput, Tooltip, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { factSentence, paintWords, swatchName } from "../canvas/legendWords";
import { focusIsLost } from "../frame/focus";
import { GLYPHS } from "../glyphs";
import { LayerLink } from "../inspector/WhyThisLook";
import { count } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { BindingPopover } from "./BindingPopover";
import { BulkBinding, type LayerSequence } from "./BulkBinding";
import {
    type DataBinding,
    type DataChoice,
    layersBinding,
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
import { pickerChoices, pickerSlot, pickShader, SHADER_CHOICE } from "./shaderSlots";
import { focusLineNext, focusSectionNext, lineTarget, listOpensNext, openListNext } from "./useFocusLine";
import { ValueField } from "./ValueField";
import { ValuePicker } from "./ValuePicker";
import {
    bindingTitle,
    bindLabel,
    channelWord,
    colorName,
    COMBINE_WORDS,
    enumWords,
    failureWords,
    fieldName,
    firstValueWords,
    hexOf,
    isPercent,
    LAYER_TOKEN,
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
     * The plain values the layers a write reaches hold, one per layer in list order (top first),
     * when they hold different plain values; undefined when they share one or one holds a binding.
     */
    readonly plain?: (channel: Channel) => readonly LayerValue[] | undefined;
    /** Copies a binding into each layer a write reaches, as its own rule; `after` merges it into that undo step. */
    readonly vary?: (channel: Channel, binding: DataBinding, after?: HistoryStepId) => Promise<unknown>;
    /**
     * The layers Vary by Layer gives a value each, in list order (top first): of those a write
     * reaches, one layer per row, with the row's name.
     */
    readonly inOrder?: (channel: Channel) => readonly { readonly id: LayerId; readonly name: string }[];
    /** Writes each layer of `inOrder` its own plain values, met with the layers beneath by `combine`, as one undo step. */
    readonly writeEach?: (
        channel: Channel,
        sequence: LayerSequence,
        combine?: DataBinding["combine"],
        after?: HistoryStepId,
    ) => Promise<unknown>;
    /** What the last write of the channel did, while it is the last write. */
    readonly receipt?: (channel: Channel) => BulkReceipt | undefined;
    /** Writes the last write again to the rows it left unset. */
    readonly alsoSet?: (channel: Channel) => Promise<unknown>;
    /** Puts the receipt away. */
    readonly dismiss?: () => void;
}

/** One layer's own plain value for a channel, with its row's name. */
export interface LayerValue {
    readonly id: LayerId;
    readonly name: string;
    readonly value: ChannelValue;
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
 * @param spread - the field shows each layer's value: only the rows it leaves out are named.
 * @returns the words.
 */
function breakdownWords(name: string, { set, unset, values, locked }: Breakdown, spread: boolean): string {
    const plural = (n: number, noun: string): string => `${String(n)} ${noun}${n === 1 ? "" : "s"}`;
    const verb = set.length === 1 ? "sets" : "set";
    const setWords = `${plural(set.length, "layer")} ${verb} ${name.toLowerCase()}${values > 1 ? `, to ${plural(values, "value")}` : ""}`;
    const words = [
        ...(spread ? [] : [setWords]),
        ...(unset.length === 0 ? [] : [`not set: ${namesWords(unset)}`]),
        ...(locked.length === 0 ? [] : [`locked, left alone: ${namesWords(locked)}`]),
    ].join("; ");
    // Under the spread values the line starts with what was a later clause: "Not set: Labels".
    return words.charAt(0).toUpperCase() + words.slice(1);
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
    const words = [
        `${String(receipt.changed)} changed`,
        ...(receipt.unset.length === 0 ? [] : [`${String(receipt.unset.length)} left unset`]),
        ...(receipt.locked === 0 ? [] : [`${String(receipt.locked)} locked skipped`]),
    ].join(", ");
    const everything = receipt.everything ?? [];
    const covers =
        everything.length === 0
            ? null
            : `${namesWords(everything)} ${everything.length === 1 ? "covers" : "cover"} every ${ctx.side === "node" ? "node" : "edge"}: setting ${name.toLowerCase()} there paints over all the others`;
    // Each write's receipt is spoken once by the status line already on the page, its words only:
    // the receipt arrives with them, and its buttons are not part of the sentence.
    const spoken = covers === null ? `${name}: ${words}` : `${name}: ${words}. ${covers}`;
    useEffect(() => {
        // Once per write: a new receipt is a new write, even with the same words.
        store.set({ announcement: spoken });
    }, [receipt, spoken, store]);
    return (
        <div className="ws-bulk-receipt" data-receipt={channel}>
            <Text className="ws-bulk-words">
                {name}: {words}
            </Text>
            {covers === null ? null : (
                <Text className="ws-bulk-words" data-covers-everything>
                    {covers}
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
 * A change's words with how many elements the written layer paints with it: "Node color now
 * orange, on 77 nodes". The words alone when the write named no layer.
 * @param session - the element's session.
 * @param id - what the write resolved to: the layer written, for one row.
 * @param channel - the channel written.
 * @param side - nodes or edges.
 * @param words - the change.
 * @returns the words.
 */
function reachWords(session: GraphSession, id: unknown, channel: Channel, side: Target, words: string): string {
    if (typeof id !== "string") {
        return words;
    }
    const counts = session.styles.counts(id);
    return `${words}, on ${count(counts.painted[channel] ?? counts.matched, side)}`;
}

/** What a field's caption says when the element draws nothing for the value it sets, by the element's code. */
const UNDRAWN_WORDS: Readonly<Record<string, string>> = { "edge.lift-needs-flat-layout": "Flat in this view" };

/**
 * The element's code for why a channel a layer sets draws nothing, among the ones a field words.
 * @param session - the element's session.
 * @param layer - the layer.
 * @param channel - the channel.
 * @returns the code, or undefined when it draws.
 */
function undrawnCode(session: GraphSession, layer: LayerId, channel: Channel): string | undefined {
    if (channel !== "edge.lift") {
        return undefined;
    }
    return session.styles.counts(layer).undrawn.find((fact) => UNDRAWN_WORDS[fact.code] !== undefined)?.code;
}

/** The most layers a coverage caption names; past it, "and N more", as the line under a field. */
const COVERED_NAMES = 3;

/**
 * The line under a set field a layer above covers: "Covered by Degree on 77 of 77", each layer's
 * name a link that opens it, as in Why this look. Past three layers it names the first three and
 * counts the rest, so a folder of 35 is one short line.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.over - who covers it, and where
 * @returns The line; the count is drawn on one line ("on 24 of 24", never "on 2" above "4 of 24")
 */
function CoveredLine({ session, over }: Readonly<{ session: GraphSession; over: PaintedOver }>): React.JSX.Element {
    const rest = over.by.length - COVERED_NAMES;
    const shown = rest > 1 ? COVERED_NAMES : over.by.length;
    const between = (at: number): string => {
        if (at === 0) {
            return "";
        }
        return at === shown - 1 && rest <= 1 ? " and " : ", ";
    };
    const links = over.by.slice(0, shown).map((name, at) => (
        <React.Fragment key={over.layers[at]}>
            {between(at)}
            <LayerLink session={session} layer={over.layers[at]} name={name} />
        </React.Fragment>
    ));
    return (
        <Text size="xs" c="var(--cm-text-secondary)" className="ws-field-covered" data-covered-caption>
            Covered by {links}
            {rest > 1 ? ` and ${String(rest)} more` : ""}{" "}
            <span style={{ whiteSpace: "nowrap" }}>{`on ${String(over.count)} of ${String(over.of)}`}</span>
        </Text>
    );
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
            // Only focus that fell to the page: a tab that replaced this row's (a selection's first
            // line made a layer) may already have handed focus to its own copy of the row.
            requestAnimationFrame(() => {
                if (section !== undefined && (document.activeElement ?? document.body) === document.body) {
                    document.querySelector<HTMLElement>(`[data-section="${section}"] [data-plus]`)?.focus();
                }
            });
        };
    }, [box]);
}

/**
 * The control of a line keyboard focus is on, or on its way to: a Tab out of a box that writes
 * moves focus on as the write redraws the line, so the control it was going to can leave the page
 * before focus lands on it. Module state, so the line's copy in a tab drawn anew (a selection's
 * first value makes its layer) takes it up.
 */
let kept: { readonly element: HTMLElement; readonly line: string; readonly label: string | null } | null = null;

/** What can take keyboard focus inside a line. */
const LINE_CONTROL = "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Keeps keyboard focus in a line whose controls are drawn anew in place: the first value of a line
 * "+" added turns its waiting field into the set one, an Undo puts a binding's pill back where a
 * color box was, a Tab out of a box writes and the line is redrawn under the control it moved to.
 * The control focus was on (or going to) leaves the page, so focus would fall to the page and then
 * to whatever had it before (the section's "+", the Style tab); it goes to the same control in the
 * line's new drawing instead: the control of the same name, else the line's field.
 * @param box - the line.
 */
function useFocusKept(box: React.RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const node = box.current;
        if (node === null) {
            return undefined;
        }
        const keep = (element: EventTarget | null): void => {
            if (element instanceof HTMLElement) {
                kept = { element, line: node.dataset.line ?? "", label: element.getAttribute("aria-label") };
            }
        };
        const onIn = (event: FocusEvent): void => {
            keep(event.target);
        };
        const onOut = (event: FocusEvent): void => {
            const to = event.relatedTarget;
            if (to instanceof HTMLElement && node.contains(to)) {
                // On its way to another control of the line: that is the one to keep.
                keep(to);
            } else if (to instanceof Node) {
                kept = null;
            }
            // No next focus: the control is leaving the page, so the line takes focus back.
        };
        node.addEventListener("focusin", onIn);
        node.addEventListener("focusout", onOut);
        return () => {
            node.removeEventListener("focusin", onIn);
            node.removeEventListener("focusout", onOut);
        };
    }, [box]);
    // No dependency list: the control is drawn anew on whatever render the element's change causes.
    useLayoutEffect(() => {
        const node = box.current;
        const was = kept;
        if (node === null || was === null || was.line !== node.dataset.line || was.element.isConnected) {
            return;
        }
        if (!focusIsLost()) {
            return;
        }
        const same = [...node.querySelectorAll<HTMLElement>(LINE_CONTROL)].find(
            (control) => was.label !== null && control.getAttribute("aria-label") === was.label,
        );
        (same ?? lineTarget(node))?.focus();
    });
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
     * The property was just added with "+" and the row (or none of several rows) sets it yet. The
     * field shows what its elements draw now and writes once a value is picked.
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
 * @param props.pending - just added with "+", waiting for a value
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
    // Several layers: the value picked in Vary ("layer" for Layer), held in the binding popover
    // until it closes.
    const [pendingVary, setPendingVary] = useState<DataChoice | "layer" | null>(null);
    // Its writes, one at a time, as one undo step: each change shows on the drawing as it is made.
    const bulkStep = useRef<HistoryStepId | undefined>(undefined);
    // The several-layer popover was closed by Escape: focus goes back to the pill (afterBulk).
    const escapedBulk = useRef(false);
    const bulkChain = useRef<Promise<unknown>>(Promise.resolve());
    useFocusOnRemoval(box);
    useFocusKept(box);
    const line = lineIn(ctx, channel);
    // A line on a locked layer (the element's own base layers) is not this row's.
    const own = line !== undefined && !line.layer.locked ? line : undefined;
    const partly = own === undefined ? partlySet(ctx, channel) : undefined;
    // Several layers holding different plain values: each one's value, and a click edits them.
    const spread = own === undefined && !pending ? ctx.many?.plain?.(channel) : undefined;
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
    // A change to one layer is said once it is written, with how many it reaches: "Node color now
    // orange, on 77 nodes". Several layers: the receipt says it.
    const write = (next: LiteralWrite | { binding: DataBinding }, words?: string): void => {
        writeIn(ctx, channel, next)
            .then((id) => {
                if (words !== undefined && ctx.many === undefined) {
                    store.set({ announcement: reachWords(session, id, channel, ctx.side, words) });
                }
            })
            .catch(fail);
    };
    // Several layers: focus goes to the receipt's first action, where the next step is: the
    // field's own tooltip would cover the receipt. Closed by Escape, or with no receipt, to the
    // field's pill that opened the popover, never to the page.
    const afterBulk = (done: Promise<unknown> | undefined): void => {
        const toPill = escapedBulk.current;
        escapedBulk.current = false;
        done?.then(() => {
            requestAnimationFrame(() => {
                const row = box.current;
                const receipt = toPill ? null : row?.querySelector<HTMLElement>("[data-receipt] button");
                (receipt ?? row?.querySelector<HTMLElement>(".ws-varied button"))?.focus();
            });
        }).catch(fail);
    };
    // A write from the binding popover of several layers: each change as it is made, merged into
    // the first one's undo step; the last, when the popover closes, ends the step.
    const bulkWrite = (
        run: (after: HistoryStepId | undefined) => Promise<unknown> | undefined,
        last: boolean,
    ): void => {
        const done = bulkChain.current.then(async () => {
            const at = session.history.position;
            await run(bulkStep.current);
            if (bulkStep.current === undefined && session.history.position !== at) {
                bulkStep.current = session.history.steps[session.history.position - 1]?.id;
            }
            if (last) {
                bulkStep.current = undefined;
            }
        });
        bulkChain.current = done.catch(fail);
        if (last) {
            setPendingVary(null);
            afterBulk(done);
        }
    };
    const writeValue = (value: ChannelValue): void => {
        // A list's new value is read by the list itself as it closes; a typed or picked value is not.
        const listed = descriptor.accepts === "enum" || descriptor.accepts === "boolean";
        write(
            own?.combine === undefined ? { value } : { value, combine: own.combine },
            listed ? undefined : `${name} now ${valueWords(descriptor, value)}`,
        );
    };
    const remove = (): void => {
        store.set({ announcement: `${name} removed` });
        // Focus goes to the section's "+", never onto the line that slides up into this one's place.
        if (box.current?.contains(document.activeElement) === true) {
            focusSectionNext(box.current, channel);
        }
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
        // Several layers: the binding popover holds it, and closing it copies it into each.
        if (ctx.many === undefined) {
            write(
                { binding: proposal.binding },
                `${name} varies by ${sourceName(session, proposal.binding) ?? proposal.binding.by}`,
            );
        } else {
            setPendingVary(choice);
        }
    };
    const varies =
        takesBinding(descriptor) &&
        ((own !== undefined && own.binding === undefined) ||
            (own === undefined && (ctx.many !== undefined || pending)));
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
        // Escape before any value is picked takes back the line "+" added: nothing was written.
        if (event.key === "Escape" && closed && pending && own === undefined && partly === undefined) {
            event.preventDefault();
            event.stopPropagation();
            store.set({ announcement: `${name} not added` });
            onCancel?.();
            return;
        }
        if (
            (event.key === "Enter" && typed && target.value.trim() === "") ||
            ((event.key === "Delete" || event.key === "Backspace") && !typed && closed)
        ) {
            event.preventDefault();
            event.stopPropagation();
            remove();
        }
    };

    // Shape lists the sprites after its shapes, Pattern the edge surfaces after its patterns
    // (shader-styles design, 6.1): a pick writes the shader, as the gallery does, not the property.
    const picker = pickerSlot(channel);
    const extraChoices = picker === undefined ? undefined : pickerChoices(ctx, picker);
    const pick = (value: ChannelValue): void => {
        if (picker === undefined || typeof value !== "string" || !value.startsWith(SHADER_CHOICE)) {
            writeValue(value);
            return;
        }
        if (own === undefined && partly === undefined) {
            onCancel?.();
        }
        pickShader(ctx, picker, value.slice(SHADER_CHOICE.length)).catch(fail);
    };

    let control: React.ReactNode;
    // Every layer a write reaches, those holding no value among them.
    const reached = ctx.many?.inOrder?.(channel).length ?? 0;
    if (spread !== undefined) {
        // Drawn as a field bound to data is, with Layer as its source.
        control = (
            <BoundValue
                ctx={ctx}
                descriptor={descriptor}
                source={{
                    kind: "layers",
                    values: spread,
                    count: reached,
                    onOpen: () => {
                        setPendingVary("layer");
                    },
                }}
            />
        );
    } else if (own === undefined) {
        // Several rows that set it differently: Mixed, with no value borrowed from any of them,
        // and a typed or picked value writes to them. Just added with "+": what the elements draw
        // now, else the element's starting value, as a field not set yet, until a value is picked.
        control = (
            <ValueField
                descriptor={descriptor}
                label={name}
                value={undefined}
                shown={
                    pending && partly === undefined
                        ? (ctx.beneath(channel).value ?? startingValue(descriptor, session))
                        : undefined
                }
                mixed={!pending || partly !== undefined}
                swatches={ctx.documentColors}
                extraChoices={extraChoices}
                onChange={pick}
            />
        );
    } else if (own.binding !== undefined) {
        control = (
            <BoundValue
                ctx={ctx}
                descriptor={descriptor}
                source={{ kind: "data", layer: own.layer, binding: own.binding, write, bind }}
            />
        );
    } else if (descriptor.accepts === "color") {
        const hex = hexOf(own.value) ?? "#000000";
        control = (
            <CompactColorInput
                aria-label={name}
                // The box is read with the color's word beside its hex: "Color, set, red".
                valueText={colorName(hex)}
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
                extraChoices={extraChoices}
                onChange={pick}
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
                    // Enter commits and keeps focus in the field (drawn again with the new text,
                    // it takes focus back), never on the page.
                    const next = event.currentTarget.value;
                    if (event.key === "Enter" && next !== "" && next !== text) {
                        writeValue(next);
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
    } else if (spread !== undefined) {
        // Several layers each on its own value: the same detach, giving them all the top one's.
        const { value } = spread[0];
        const words = valueWords(descriptor, value);
        const oneName = `Give all ${String(reached)} layers one ${name.toLowerCase()}`;
        varySlot = (
            <Tooltip label={`One value for all: use ${words} for all ${String(reached)} layers`}>
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={oneName}
                    onClick={() => {
                        focusLineNext(channel);
                        store.set({ announcement: `${name} is ${words} on every layer` });
                        write({ value });
                    }}
                >
                    <GLYPHS.unlink size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        );
    } else if (varies) {
        varySlot = (
            <VaryButton
                ctx={ctx}
                descriptor={descriptor}
                onPick={bind}
                onLayer={() => {
                    setPendingVary("layer");
                }}
                open={varyOpen}
                onOpenChange={setVaryOpen}
            />
        );
    }
    // Who sets it, where not every row sets it alike; with each layer's value shown, only who does not.
    const breakdown =
        ctx.many?.breakdown !== undefined &&
        (own === undefined || ctx.many.count(channel) < ctx.many.of) &&
        (!pending || partly !== undefined)
            ? breakdownWords(word ?? channelWord(channel), ctx.many.breakdown(channel), spread !== undefined)
            : "";
    const removeName =
        ctx.many === undefined ? `Remove ${name.toLowerCase()}` : `Remove ${name.toLowerCase()} from every layer`;
    // A value the element draws nothing for here (a lift outside a flat layout in 3D).
    const undrawn = own === undefined ? undefined : undrawnCode(session, own.layer.id, channel);
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
                    <Tooltip label={removeName} position="top">
                        <ActionIcon variant="subtle" size="sm" aria-label={removeName} onClick={remove}>
                            <GLYPHS.remove size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            </div>
            {over === undefined ? null : <CoveredLine session={session} over={over} />}
            {undrawn === undefined ? null : (
                <Text size="xs" c="var(--cm-text-secondary)" className="ws-field-covered" data-undrawn>
                    {UNDRAWN_WORDS[undrawn]}
                </Text>
            )}
            {/* Just added on a selection with no layer yet: the value drawn is not set, and the
                first one picked makes the layer. */}
            {pending &&
            own === undefined &&
            ctx.many === undefined &&
            ctx.layers.length === 0 &&
            ctx.fresh !== undefined ? (
                <Text size="xs" c="var(--cm-text-secondary)" className="ws-field-covered" data-first-value>
                    {firstValueWords(word ?? channelWord(channel))}
                </Text>
            ) : null}
            {breakdown === "" ? null : (
                <Text className="ws-field-covered ws-bulk-words" data-breakdown>
                    {breakdown}
                </Text>
            )}
            {pendingVary === null ? null : (
                <BulkBinding
                    session={session}
                    descriptor={descriptor}
                    layers={ctx.many?.inOrder?.(channel) ?? []}
                    start={pendingVary}
                    prefill={pendingVary === "layer" ? spread : undefined}
                    anchor={box}
                    onApplyEach={(sequence, combine, last) => {
                        bulkWrite((after) => ctx.many?.writeEach?.(channel, sequence, combine, after), last);
                    }}
                    onApplyBinding={(binding, last) => {
                        bulkWrite((after) => ctx.many?.vary?.(channel, binding, after), last);
                    }}
                    onEscaped={() => {
                        escapedBulk.current = true;
                    }}
                    onCancel={() => {
                        setPendingVary(null);
                        // Closed unchanged: focus goes back to the field's pill, as on one layer.
                        requestAnimationFrame(() => {
                            box.current?.querySelector<HTMLElement>(".ws-varied button")?.focus();
                        });
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
 * The vary glyph in its reserved 24 px column, for a field drawn outside a property row (an effect
 * entry): picking a value binds the channel on the row.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.label - the glyph's name, when the property has no channel word
 * @param props.onFail - says a refused binding
 * @returns The column, empty when the channel takes no binding
 */
export function VarySlot({
    ctx,
    descriptor,
    label,
    onFail,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor;
    /** The glyph's name, when the property is not a channel of its own (a shader parameter). */
    label?: string;
    /** Says a refused binding, when the property has no channel word. */
    onFail?: (error: unknown) => void;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const bind = (choice: DataChoice): void => {
        const proposal = propose(ctx.session, choice, descriptor.channel);
        if (!proposal.ok) {
            return;
        }
        writeIn(ctx, descriptor.channel, { binding: proposal.binding }).catch((error: unknown) => {
            if (onFail !== undefined) {
                onFail(error);
                return;
            }
            store.set({
                notice: { message: failureWords(channelWord(descriptor.channel), "changed", error), error: true },
            });
        });
    };
    return (
        <span className="ws-slot ws-vary">
            {takesBinding(descriptor) && (
                <VaryButton
                    ctx={ctx}
                    descriptor={descriptor}
                    label={label}
                    onPick={bind}
                    open={open}
                    onOpenChange={setOpen}
                />
            )}
        </span>
    );
}

/**
 * The vary glyph: opens the list of values the property can follow.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.label - the button's name, when not the channel's
 * @param props.onPick - binds the property to the picked value
 * @param props.onLayer - several layers: gives each its own value
 * @param props.open - whether the picker is open
 * @param props.onOpenChange - opens or closes it
 * @returns The button and its pop-out
 */
function VaryButton({
    ctx,
    descriptor,
    label: named,
    onPick,
    onLayer,
    open,
    onOpenChange: setOpen,
}: Readonly<{
    ctx: RowContext;
    descriptor: ChannelDescriptor;
    /** The button's name, when not the channel's ("Spin by attribute"). */
    label?: string;
    onPick: (choice: DataChoice) => void;
    /** Several layers: gives each its own value ("Layer" in the list). */
    onLayer?: () => void;
    /** Whether the picker is open; the field opens it on "=" too. */
    open: boolean;
    onOpenChange: (open: boolean) => void;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const { channel } = descriptor;
    const openList = (next: boolean): void => {
        if (!next) {
            openListNext(null);
        }
        setOpen(next);
    };
    const label = named ?? bindLabel(descriptor);
    const layers = ctx.many?.inOrder?.(channel).length ?? 0;
    return (
        <Popout opened={open} onOpenChange={openList}>
            <Popout.Trigger>
                {/* The Tooltip passes the trigger's click and ref to the button, but not its ARIA,
                    so the button states its own. */}
                {/* Above the row, so it never covers the line under the field. */}
                <Tooltip label={label} position="top">
                    <PopoutButton
                        icon={<GLYPHS.link size={14} aria-hidden />}
                        // One name for the button, its tooltip and the pop-out it opens.
                        aria-label={label}
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
                    byLayer={
                        onLayer === undefined || layers < 2
                            ? undefined
                            : {
                                  count: layers,
                                  onPick: () => {
                                      openList(false);
                                      onLayer();
                                  },
                              }
                    }
                    onFixed={() => {
                        openList(false);
                        // The field keeps its value; focus goes to it to change it, and the list
                        // closing is said, not silent.
                        store.set({
                            announcement: `${named === undefined ? fieldName(channel) : label} stays a fixed value`,
                        });
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
 * What a bound field reads: one layer's binding of a value of the data, or several layers each
 * holding its own plain value (the Layer source, while they are edited together).
 */
type BoundSource =
    | {
          readonly kind: "data";
          /** The layer that holds the binding. */
          readonly layer: Layer;
          readonly binding: DataBinding;
          /** Writes the field. */
          readonly write: (next: LiteralWrite | { binding: DataBinding }) => void;
          /** Binds the field to another value. */
          readonly bind: (choice: DataChoice) => void;
      }
    | {
          readonly kind: "layers";
          /** Each layer's own value, top first. */
          readonly values: readonly LayerValue[];
          /** How many layers a write reaches, those holding no value among them. */
          readonly count: number;
          /** Opens the binding popover by Layer. */
          readonly onOpen: () => void;
      };

/**
 * A varied value: what it reads and its range or palette, as a value pill that opens the binding
 * popover, and under it the line of its colors or values. One drawing for a layer bound to data
 * and for several layers each on its own value: the second shows Layer where the first shows the
 * source's name.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.descriptor - the property
 * @param props.source - what it reads
 * @returns The pill and its popover
 */
function BoundValue({
    ctx,
    descriptor,
    source,
}: Readonly<{ ctx: RowContext; descriptor: ChannelDescriptor; source: BoundSource }>): React.JSX.Element {
    const { session } = ctx;
    const [open, setOpen] = useState(false);
    // Several layers: the popover holds its edits, and closing it writes them to every layer.
    const [draft, setDraft] = useState<DataBinding | null>(null);
    const pill = useRef<HTMLDivElement>(null);
    const describedId = useId();
    const { channel } = descriptor;
    const isColor = descriptor.accepts === "color";
    const view =
        source.kind === "layers" ? layersView(session, descriptor, source) : dataView(session, descriptor, source);
    const described = describedWords(view.list);
    const groups = groupWords(descriptor, view.list);
    const drawn = (onClick: () => void): React.JSX.Element => (
        <>
            <VariablePill
                name={view.name}
                // The pill names the column ("donations") where the line under it says the range
                // ("From 1 to 3"); both are in the tooltip.
                value={isColor || view.list === undefined ? view.detail : undefined}
                tooltip={[view.plain ?? view.name, view.detail].filter((w) => w !== undefined).join("\n")}
                tone={view.tone}
                swatch={isColor ? stripOf(view.list, view.fallback) : undefined}
                swatchWidth={isColor ? SWATCH_STRIP : undefined}
                width="100%"
                aria-label={`${fieldName(channel)}: ${view.spoken}${groups === "" ? "" : `: ${groups}`}`}
                aria-describedby={described === "" ? undefined : describedId}
                onClick={onClick}
            />
            <VariedLine list={view.list} />
            {described === "" ? null : <VisuallyHidden id={describedId}>{described}</VisuallyHidden>}
        </>
    );
    if (source.kind === "layers") {
        // The popover is the row's BulkBinding, opened by Layer on each layer's value.
        return <div className="ws-varied">{drawn(source.onOpen)}</div>;
    }
    const { binding, layer, write, bind } = source;
    const sourceWords = view.name;
    // The pill opens the popover itself (no Popout.Trigger), so it takes focus back itself: on
    // Escape or Done, while focus is still in the popover or has fallen to the page, never after a
    // click elsewhere took it.
    const openChange = (next: boolean): void => {
        const inside = focusIsLost() || document.activeElement?.closest("[role=dialog]") !== null;
        setOpen(next);
        if (!next && draft !== null) {
            setDraft(null);
            write({ binding: draft });
        }
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
                    label={fieldName(channel)}
                    value={otherwise}
                    shown={otherwise}
                    swatches={ctx.documentColors}
                    onChange={(next) => {
                        write({ binding: { ...binding, otherwise: typeof next === "boolean" ? String(next) : next } });
                    }}
                />
                <Button
                    size="compact-xs"
                    variant="subtle"
                    className="ws-varied-few"
                    aria-label={`${fieldName(channel)}: ${entriesWords(descriptor, binding)} by ${sourceWords}`}
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
                {few ??
                    drawn(() => {
                        setOpen(true);
                    })}
            </div>
            <Popout.Panel
                width={POPOUT_WIDTH}
                placement="left"
                alignment="start"
                anchorY={pill}
                header={{ variant: "title", title: bindingTitle(channel, sourceWords) }}
            >
                <Popout.Content>
                    <BindingPopover
                        descriptor={descriptor}
                        layerId={layer.id}
                        binding={draft ?? binding}
                        source={sourceWords}
                        held={ctx.many !== undefined}
                        onChange={(next) => {
                            if (ctx.many === undefined) {
                                write({ binding: next });
                            } else {
                                setDraft(next);
                            }
                        }}
                        onSource={bind}
                    />
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/** What a bound field's pill and line draw, from either source. */
interface BoundView {
    /** The source's name in the pill: "Louvain", or the Layer token. */
    readonly name: string;
    /** The name without the token's marks, where words are read rather than set off: "Layer". */
    readonly plain?: string;
    readonly tone?: "component";
    /** The pill's second fact: a palette's name, a range, "reads nothing"; a color's tooltip line. */
    readonly detail?: string;
    /** What the pill says after the field's name. */
    readonly spoken: string;
    readonly list?: LineList;
    /** The colors the strip draws when the list has none (a path that reads nothing). */
    readonly fallback?: readonly string[];
}

/**
 * A layer's binding of a value of the data, as its pill and line draw it.
 * @param session - the element's session.
 * @param descriptor - the property.
 * @param source - the layer and its binding.
 * @param source.layer - the layer.
 * @param source.binding - its binding.
 * @returns the view.
 */
function dataView(
    session: GraphSession,
    descriptor: ChannelDescriptor,
    { layer, binding }: Readonly<{ layer: Layer; binding: DataBinding }>,
): BoundView {
    const word = channelWord(descriptor.channel);
    // Whether the path answers is graphty-element's call (its validate), not a search of the data.
    const unresolved = readsNothing(session, descriptor.target, descriptor.channel, binding);
    const name = sourceName(session, binding) ?? binding.by;
    // The layer's own block: a copy the legend folds with others is still read on its own.
    const block = session.styles.legendOf(layer.id).find((b) => b.channel === descriptor.channel);
    // The binding's palette, else the one the element paints with by default.
    const paletteId = binding.palette ?? block?.palette?.name;
    const palette = paletteId === undefined ? undefined : session.catalog.palettes().find((p) => p.id === paletteId);
    // Never empty, so two fields reading one source never share an accessible name -- except a
    // text field (Tooltip), whose words are the source's own values: it shows the source.
    // A pill with no swatch shows its detail in place of the source's name, so a shape or a
    // pattern by data shows the source ("Louvain"), never the property's own name.
    let detail: string | undefined = palette === undefined ? word : paletteWord(palette.id);
    if (descriptor.accepts !== "color") {
        detail = undefined;
    }
    if (unresolved) {
        detail = "reads nothing";
    } else if (binding.range !== undefined) {
        detail = `${String(binding.range[0])} to ${String(binding.range[1])}`;
    }
    const list = block === undefined ? undefined : lineOfBlock(block);
    // The count always: "Louvain, 6 groups, Okabe-Ito"; "Degree, 1 to 36, Purple to yellow".
    let size: string | undefined;
    if (unresolved) {
        size = undefined;
    } else if (list?.kind === "categorical") {
        size = count(list.entries.length + list.hidden, "group");
    } else if (list?.ends !== undefined) {
        size = `${list.ends[0]} to ${list.ends[1]}`;
    }
    const spoken = [name, size, detail === word ? undefined : detail].filter((w) => w !== undefined).join(", ");
    return { name, detail, spoken, list, fallback: palette?.colors };
}

/**
 * Several layers each on its own value, as the Layer source's pill and line draw them: one group
 * per layer, top first, read from graphty-element's `styles.layerGroups` as the popover reads them.
 * @param session - the element's session.
 * @param descriptor - the property.
 * @param source - each layer's value, and how many layers a write reaches.
 * @param source.values - each layer's value, top first.
 * @param source.count - how many layers a write reaches.
 * @returns the view.
 */
function layersView(
    session: GraphSession,
    descriptor: ChannelDescriptor,
    { values, count: reached }: Readonly<{ values: readonly LayerValue[]; count: number }>,
): BoundView {
    const { channel } = descriptor;
    const groups = session.styles.layerGroups(
        values.map((each) => each.id),
        layersBinding(session, descriptor, values),
        { channel },
    );
    // The line shows what the layers paint now: a layer painted over everywhere, or hidden, adds
    // nothing to the drawing, so it adds nothing to the line (the popover still lists it).
    const painting = groups.filter(
        (group) => !group.hidden && (session.styles.counts(group.value).painted[channel] ?? 0) > 0,
    );
    const list = lineOfLayers(descriptor, painting.length === 0 ? groups : painting);
    const isColor = descriptor.accepts === "color";
    const distinct = new Set(values.map((each) => (isColor ? hexOf(each.value) : null) ?? JSON.stringify(each.value)))
        .size;
    const none = reached - values.length;
    // "from each layer, 10 layers, 7 colors, 1 has no value": the guillemets are never spoken.
    const spoken = [
        "from each layer",
        count(reached, "layer"),
        count(distinct, isColor ? "color" : "value"),
        ...(none > 0 ? [`${String(none)} ${none === 1 ? "has" : "have"} no value`] : []),
    ].join(", ");
    return {
        name: LAYER_TOKEN,
        // The tooltip says what the name says ("from each layer, 10 layers"), in the same words.
        plain: "From each layer",
        tone: "component",
        // A color's pill shows only the name; this is its tooltip's second line.
        detail: isColor ? count(reached, "layer") : undefined,
        spoken,
        list,
    };
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

/** One group a varied field's line draws: its name, its color, what it paints in words. */
interface LineEntry {
    readonly name: string;
    readonly color?: string;
    readonly words: string;
}

/**
 * What a varied field's second line draws, the same from one layer's legend block and from
 * several layers' own values, so both draw alike.
 */
interface LineList {
    /** Groups (chits, or words when none has a color), or a ramp (its ends). */
    readonly kind: "categorical" | "continuous";
    /** The groups in list order, Other left out; for a ramp, its colors. */
    readonly entries: readonly LineEntry[];
    /** The bucket the paint lumped the smaller groups into. */
    readonly other?: LineEntry;
    /** Groups the element left out of the entries (its row cap). */
    readonly hidden: number;
    /** A ramp's domain ends, as words. */
    readonly ends?: readonly [string, string];
    /** A number's output range. */
    readonly range?: readonly [number, number];
    /** A note for each non-neutral setting ("Log scale"), and the legend's facts. */
    readonly notes: readonly string[];
}

/** How many groups' paints a varied field's second line names, for a property that is not a color. */
const MAX_WORDS = 3;

/** Up to this many groups, the line draws a chit for every one; past it, the first `SHOWN_CHITS` and "+N". */
const ALL_CHITS = 6;

/** How many chits the line draws past `ALL_CHITS`, so "+N" is never "+1". */
const SHOWN_CHITS = 5;

/** The scales a varied field's second line says nothing about: the neutral ones. */
const NEUTRAL_SCALES: ReadonlySet<string> = new Set(["linear", "ordinal", "passthrough"]);

/**
 * One layer's legend block for a field, as its line draws it.
 * @param block - the block.
 * @returns the line's list.
 */
function lineOfBlock(block: LegendBlock): LineList {
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
    const entry = (swatch: LegendBlock["swatches"][number]): LineEntry => ({
        name: swatchName(block, swatch),
        color: swatch.color,
        words: paintWords(swatch) ?? swatchName(block, swatch),
    });
    if (block.kind === "categorical") {
        const other = block.swatches.find((s) => s.role === "other");
        return {
            kind: "categorical",
            entries: block.swatches.filter((s) => s.role !== "other").map(entry),
            ...(other === undefined ? {} : { other: entry(other) }),
            hidden: block.overflow?.hidden ?? 0,
            notes,
        };
    }
    const end = (n: number): string => String(Number(n.toPrecision(4)));
    const { range, domain } = block;
    return {
        kind: "continuous",
        entries: block.swatches.map(entry),
        hidden: 0,
        ...(range === undefined ? {} : { range: [range.min, range.max] as const }),
        ...(range !== undefined || domain === undefined ? {} : { ends: [end(domain.min), end(domain.max)] as const }),
        notes,
    };
}

/**
 * Several layers' groups (`styles.layerGroups`), as the line draws them: one entry per layer, top first.
 * @param descriptor - the property.
 * @param groups - the groups.
 * @returns the line's list.
 */
function lineOfLayers(descriptor: ChannelDescriptor, groups: readonly LayerGroup[]): LineList {
    return {
        kind: "categorical",
        entries: groups.map((group) => {
            const value = group.paints[descriptor.channel];
            const color = descriptor.accepts === "color" ? hexOf(value) : null;
            return { name: group.name, words: valueWords(descriptor, value), ...(color === null ? {} : { color }) };
        }),
        hidden: 0,
        notes: [],
    };
}

/**
 * The groups a line draws and how many it leaves to "+N": every one up to 6, else the first 5.
 * For words (no color), the first 3.
 * @param list - the line's list.
 * @returns the entries drawn and how many more there are.
 */
function shownOf(list: LineList): { readonly shown: readonly LineEntry[]; readonly more: number } {
    const total = list.entries.length + list.hidden;
    const colored = list.entries.some((e) => e.color !== undefined);
    let cap = MAX_WORDS;
    if (colored) {
        cap = total <= ALL_CHITS ? ALL_CHITS : SHOWN_CHITS;
    }
    const shown = list.entries.slice(0, cap);
    return { shown, more: total - shown.length };
}

/**
 * The groups a bound pill's line draws, each with its color or value in words, "and N more" past
 * the ones it draws: part of the pill's name, so a reader hears which group paints what without
 * reaching the chits, which are not controls. Empty for a ramp or a number.
 * @param descriptor - the property.
 * @param list - the line's list.
 * @returns the words.
 */
function groupWords(descriptor: ChannelDescriptor, list: LineList | undefined): string {
    if (list?.kind !== "categorical") {
        return "";
    }
    const { shown, more } = shownOf(list);
    const words = (e: LineEntry): string =>
        `${e.name} ${e.color === undefined ? e.words : valueWords(descriptor, e.color)}`;
    const entries = [...shown, ...(list.other === undefined ? [] : [list.other])].map(words).join(", ");
    return more > 0 ? `${entries} and ${String(more)} more` : entries;
}

/**
 * What a screen reader hears after a bound pill's name: a ramp's or a number's ends, then the
 * notes. A list of groups is in the name itself (`groupWords`).
 * @param list - the line's list.
 * @returns the words.
 */
function describedWords(list: LineList | undefined): string {
    if (list === undefined) {
        return "";
    }
    let entries = "";
    if (list.kind === "categorical") {
        entries = ""; // its groups are said in the name
    } else if (list.range !== undefined) {
        entries = `From ${String(list.range[0])} to ${String(list.range[1])}`;
    } else if (list.ends !== undefined) {
        entries = `From ${list.ends[0]} to ${list.ends[1]}`;
    }
    return [entries, ...list.notes].filter((w) => w !== "").join(", ");
}

/**
 * A varied field's second line (tier3 design, section 2.2; studio decision 2026-10-16): one row of
 * group chits -- all up to 6, else the first 5 and "+N", the lumped Other's gray chit last -- or
 * the first 3 values in words and "+N", a ramp's domain ends, or a number's From / To; then a note
 * for each non-neutral setting ("Log scale") and the legend's facts. Hidden from a screen reader:
 * the pill's description says the same.
 * @param props - Component props
 * @param props.list - what to draw, if the element has painted the field
 * @returns The line, or nothing before the element has painted the field
 */
function VariedLine({ list }: Readonly<{ list: LineList | undefined }>): React.JSX.Element | null {
    if (list === undefined) {
        return null;
    }
    let summary: React.ReactNode = null;
    const colored = list.entries.some((e) => e.color !== undefined);
    if (list.kind === "categorical") {
        const { shown, more } = shownOf(list);
        const plus = more > 0 ? `+${String(more)}` : null;
        summary = !colored ? (
            `${shown.map((e) => e.words).join(", ")}${plus === null ? "" : ` ${plus}`}`
        ) : (
            <span className="ws-varied-chits">
                {[...shown, ...(list.other === undefined ? [] : [list.other])].map((entry, at) => (
                    // Two layers may share a name: the place in the list keeps each its own.
                    <Tooltip key={`${String(at)}:${entry.name}`} label={entry.name}>
                        <span
                            className="ws-varied-chit"
                            data-name={entry.name}
                            data-other={entry === list.other ? "" : undefined}
                            style={{ background: entry.color ?? "var(--mantine-color-gray-5)" }}
                        />
                    </Tooltip>
                ))}
                {plus === null ? null : (
                    <Text span size="xs" c="var(--cm-text-secondary)" data-more>
                        {plus}
                    </Text>
                )}
            </span>
        );
    } else if (list.range !== undefined) {
        summary = `From ${String(list.range[0])} to ${String(list.range[1])}`;
    } else if (list.ends !== undefined) {
        summary = (
            <span className="ws-varied-ends">
                <span>{list.ends[0]}</span>
                <span>{list.ends[1]}</span>
            </span>
        );
    }
    if (summary === null && list.notes.length === 0) {
        return null;
    }
    return (
        <div className="ws-varied-line" data-varied-line aria-hidden>
            {summary === null ? null : (
                <Text size="xs" c="var(--cm-text-secondary)" component="div">
                    {summary}
                </Text>
            )}
            {list.notes.map((note) => (
                <Text key={note} size="xs" c="var(--cm-text-secondary)" data-varied-note>
                    {note}
                </Text>
            ))}
        </div>
    );
}

/** How wide a bound color's strip is at rest: a ramp, or up to four group colors side by side. */
const SWATCH_STRIP = 24;

/**
 * A bound color's strip: groups as hard stops, the first 4 in list order; a ramp as a gradient.
 * The strip never carries a count: the line under it does.
 * @param list - the line's list.
 * @param fallback - the palette's colors, when the list has none.
 * @returns the strip's background.
 */
function stripOf(list: LineList | undefined, fallback: readonly string[] | undefined): string {
    const painted = list?.entries.flatMap((e) => (e.color === undefined ? [] : [e.color])) ?? [];
    const colors = painted.length > 0 ? painted : fallback;
    if (colors === undefined || colors.length === 0) {
        return "var(--mantine-color-gray-5)";
    }
    return `linear-gradient(to right, ${(list?.kind === "categorical" ? chits(colors) : colors).join(", ")})`;
}

/**
 * Category colors as hard gradient stops, so each reads as its own chit: at most four, each at
 * least 6 px of the 24 px strip.
 * @param colors - the colors.
 * @returns the stops.
 */
function chits(colors: readonly string[]): string[] {
    const shown = colors.slice(0, 4);
    const step = 100 / shown.length;
    return shown.map((c, i) => `${c} ${String(i * step)}% ${String((i + 1) * step)}%`);
}
