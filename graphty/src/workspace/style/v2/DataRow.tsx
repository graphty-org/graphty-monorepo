/**
 * A Pie, Chart or Record row drawing from data (tmp/entries-first/spec.md, Part 2, option C "Entries first"): the
 * row's main control is the entries picker ("Fixed" while the layer holds fixed values), each entry is a line under
 * the row reading the sample node's value in its format, and the row's "..." holds the spec's own settings and the
 * Sample line. Every write is one `styles.update` of the spec (`dataEntries.ts`); graphty-element counts, formats and
 * colors, and the panel shows its facts (`styles.dataFacts`).
 */

import { CompactColorInput, DataFieldPicker, PanelField, SegmentedControl } from "@graphty/compact-mantine";
import {
    type Channel,
    type DataChannel,
    type DataEntry,
    type DataEntryFact,
    type DataFacts,
    type DataFormat,
    formatValue,
    writeChannelList,
} from "@graphty/graphty-element/catalog";
import type { NodeId } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";
import { dataUndrawnWords, failureWords } from "../words";
import {
    draftAfter,
    entryId,
    entryName,
    entryWords,
    fieldsFor,
    FIXED,
    holderOf,
    moved,
    type Spec,
    specOf,
    writeSpec,
} from "./dataEntries";
import { firstColors, LISTS, type ListSpec } from "./lists";
import { lineFor } from "./rubric";
import { LineFrame, RubricLine } from "./RubricLine";
import { RowSettings } from "./ThingLine";
import { ValueButton } from "./ValueButton";

/**
 * The key graphty-element gives a plain entry's one part (its category key): a field's path, else its kind and place.
 * @param entry - the entry.
 * @param at - its place.
 * @returns the key.
 */
function partKey(entry: DataEntry, at: number): string {
    if ("field" in entry) {
        return entry.field;
    }
    return "graph" in entry ? `graph.${String(at)}` : `value.${String(at)}`;
}

/** The workspace store, which a failed write tells. */
type Store = ReturnType<typeof useWorkspace>["store"];

/**
 * Report a failed write.
 * @param store - the workspace store.
 * @param what - what was being changed.
 * @returns the handler.
 */
function failed(store: Store, what: string): (error: unknown) => void {
    return (error) => {
        store.set({ notice: { message: failureWords(what, "changed", error), error: true } });
    };
}

/**
 * An option's word, or its default when the spec does not set it.
 * @param value - the option as the spec holds it.
 * @param fallback - its default.
 * @returns the word.
 */
function word(value: unknown, fallback: string): string {
    return typeof value === "string" ? value : fallback;
}

/**
 * The first fixed values a thing gets back when the reader picks "Fixed": a list thing's first item.
 * @param ctx - the row.
 * @param thing - the thing's id.
 * @param start - the thing's start channel.
 * @returns the values.
 */
function fixedStart(ctx: RowContext, thing: string, start: Channel): Partial<Record<Channel, string>> {
    const list: ListSpec | undefined = Object.hasOwn(LISTS, thing) ? LISTS[thing] : undefined;
    if (list === undefined) {
        return start === "node.shapeTexts" ? { "node.shapeTexts": '[["Field 1"]]' } : {};
    }
    const out: Partial<Record<Channel, string>> = {
        [list.colors]: writeChannelList(list.colors, firstColors(ctx).slice(0, 1)),
    };
    for (const each of list.numbers) {
        if (each.name === "Value") {
            out[each.channel] = "1";
        }
    }
    return out;
}

/** What the sample line asks graphty-element for. */
type Find = "next" | "undrawn" | "missing";

/**
 * The sample node's facts: the node the reader picked, else the first that draws, else one that draws nothing.
 * @param ctx - the row.
 * @param channel - the data channel.
 * @param picked - the node the reader picked, if any.
 * @returns the facts, or undefined when the layer or the graph holds no node to show.
 */
function sampleFacts(ctx: RowContext, channel: DataChannel, picked: NodeId | null): DataFacts | undefined {
    const layer = holderOf(ctx, channel);
    if (layer === undefined) {
        return undefined;
    }
    const { styles } = ctx.session;
    const node =
        picked ?? styles.dataSample(layer.id, channel, "first") ?? styles.dataSample(layer.id, channel, "undrawn");
    if (node === null) {
        return undefined;
    }
    try {
        return styles.dataFacts(layer.id, channel, node);
    } catch {
        // The node left the graph since it was picked: no sample until the next is found.
        return undefined;
    }
}

/**
 * The row's entries picker: a multi-pick of the node's columns and results, kept as a draft and written once on
 * Done (one undo step); Escape writes nothing. "Fixed" turns the thing back into fixed values; a Record's "Text"
 * adds a fixed text entry and keeps the list open.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the data channel
 * @param props.thing - the thing's id
 * @param props.start - the thing's start channel, for "Fixed"
 * @param props.title - the thing's name
 * @returns The picker
 */
function DataPicker({
    ctx,
    channel,
    thing,
    start,
    title,
}: Readonly<{
    ctx: RowContext;
    channel: DataChannel;
    thing: string;
    start: Channel;
    title: string;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const spec = specOf(ctx, channel);
    const [draft, setDraft] = useState<readonly DataEntry[] | null>(null);
    const entries = draft ?? spec?.entries ?? [];
    const record = channel === "node.recordData";
    const first = entries.at(0);
    return (
        <DataFieldPicker
            multiple
            label={`${title} data`}
            fields={fieldsFor(ctx.session, channel, entries)}
            values={entries.map((entry, at) => entryId(entry, at))}
            shown={first === undefined ? FIXED : entryName(ctx.session, first)}
            actions={[
                { id: "fixed", label: FIXED },
                ...(record ? [{ id: "text", label: "Text", keepsOpen: true }] : []),
            ]}
            actionValue={spec === undefined && draft === null ? "fixed" : undefined}
            onChange={(checked) => {
                setDraft(draftAfter(entries, checked));
            }}
            onMatch={(query, except) => {
                setDraft([...entries, except ? { pattern: query, except: true } : { pattern: query }]);
            }}
            onAction={(id) => {
                if (id === "text") {
                    setDraft([...entries, { text: "Text" }]);
                    return;
                }
                setDraft(null);
                if (spec !== undefined) {
                    writeSpec(ctx, channel, undefined, fixedStart(ctx, thing, start)).catch(failed(store, title));
                }
            }}
            onDone={() => {
                if (draft !== null) {
                    writeSpec(ctx, channel, { ...spec, entries: draft }).catch(failed(store, title));
                }
                setDraft(null);
            }}
            onCancel={() => {
                setDraft(null);
            }}
        />
    );
}

/**
 * A text field that writes once, on Enter or when it loses focus, never per keystroke (one undo step per edit).
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - what it holds
 * @param props.unset - what it shows when it holds nothing
 * @param props.onCommit - called with the words, "" for none
 * @returns The field
 */
function CommitText({
    label,
    value,
    unset,
    onCommit,
}: Readonly<{
    label: string;
    value: string | undefined;
    unset: string;
    onCommit: (words: string) => void;
}>): React.JSX.Element {
    const [typed, setTyped] = useState<string | null>(null);
    const commit = (): void => {
        if (typed !== null && typed !== (value ?? "")) {
            onCommit(typed);
        }
        setTyped(null);
    };
    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- catches Enter and the blur bubbling from the text field inside, to write once; the field is the keyboard's door
        <div
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    commit();
                }
            }}
        >
            <PanelField
                label={label}
                kind="text"
                width="fill"
                value={typed ?? value ?? ""}
                placeholder={unset}
                onChange={(next) => {
                    setTyped(String(next));
                }}
            />
        </div>
    );
}

/** The format presets the Format line offers, by name (app words). */
const PRESETS: readonly (readonly [string, DataFormat | undefined])[] = [
    ["Auto", undefined],
    ["Whole", { maximumFractionDigits: 0 }],
    ["Fixed 2", { minimumFractionDigits: 2, maximumFractionDigits: 2 }],
    ["Signed", { signDisplay: "exceptZero" }],
    ["Percent", { style: "percent" }],
    ["Compact", { notation: "compact" }],
    ["Scientific", { notation: "scientific", maximumFractionDigits: 2 }],
    ["Money", { style: "currency", currency: "USD" }],
    ["In parentheses", { prefix: "(", suffix: ")" }],
    ["Rank (#)", { prefix: "#", maximumFractionDigits: 0 }],
];

/**
 * The preset a format is, or "Custom".
 * @param format - the format.
 * @returns the preset's name.
 */
function presetOf(format: DataFormat | undefined): string {
    const found = PRESETS.find(([, each]) => JSON.stringify(each) === JSON.stringify(format));
    return found?.[0] ?? "Custom";
}

/**
 * One line of a pop-over: its name above, its control.
 * @param props - Component props
 * @param props.line - what it edits
 * @param props.name - its name
 * @param props.children - its control
 * @returns The line
 */
function PopLine({
    line,
    name,
    children,
}: Readonly<{ line: string; name: string | null; children: React.ReactNode }>): React.JSX.Element {
    return (
        <LineFrame
            line={line}
            name={name}
            set
            rule="R12"
            control={children}
            modifier={null}
            removeName={undefined}
            onRemove={() => undefined}
        />
    );
}

/**
 * A row of word segments.
 * @param props - Component props
 * @param props.label - its name
 * @param props.value - the segment in force
 * @param props.options - each segment's value and words
 * @param props.onPick - called with the segment picked
 * @returns The control
 */
function Segments({
    label,
    value,
    options,
    onPick,
}: Readonly<{
    label: string;
    value: string;
    options: readonly (readonly [string, string])[];
    onPick: (value: string) => void;
}>): React.JSX.Element {
    return (
        <SegmentedControl
            label={label}
            fullWidth
            size="xs"
            value={value}
            onChange={onPick}
            data={options.map(([each, words]) => ({ value: each, label: words }))}
        />
    );
}

/** What an entry pop-over's lines read and write. */
interface EntryArgs {
    readonly ctx: RowContext;
    readonly channel: DataChannel;
    readonly entry: DataEntry;
    readonly fact: DataEntryFact | undefined;
    readonly name: string;
    readonly put: (next: DataEntry) => void;
}

/**
 * The entry's options beside its source, for a write that changes its source.
 * @param entry - the entry.
 * @returns its options.
 */
function optionsOf(entry: DataEntry): Partial<DataEntry> {
    const { label, format, color, missing, each, at, style, opacity } = entry;
    return Object.fromEntries(
        Object.entries({ label, format, color, missing, each, at, style, opacity }).filter(([, v]) => v !== undefined),
    );
}

/**
 * The tab an entry's kind is.
 * @param entry - the entry.
 * @returns "field", "graph", "text" or "value".
 */
function kindOf(entry: DataEntry): string {
    if ("field" in entry || "pattern" in entry) {
        return "field";
    }
    if ("graph" in entry) {
        return "graph";
    }
    return "text" in entry ? "text" : "value";
}

/**
 * The Entry pop-over's tabs: Field, Graph and Value (a record's Text); picking one writes at once.
 * @param props - Component props
 * @param props.args - the entry
 * @returns The tabs
 */
function KindTabs({ args }: Readonly<{ args: EntryArgs }>): React.JSX.Element {
    const { ctx, channel, entry, name, put } = args;
    const record = channel === "node.recordData";
    return (
        <Segments
            label={`${name} kind`}
            value={kindOf(entry)}
            options={[["field", "Field"], ["graph", "Graph"], record ? ["text", "Text"] : ["value", "Value"]]}
            onPick={(next) => {
                const common = optionsOf(entry);
                const fits = fieldsFor(ctx.session, channel, []).find((field) => field.disabledReason === undefined);
                const to: Readonly<Record<string, DataEntry | undefined>> = {
                    field: fits === undefined ? undefined : { ...common, field: fits.id },
                    graph: { ...common, graph: { over: "edges", measure: "count" } },
                    value: { ...common, value: 1 },
                    text: { ...common, text: "Text" },
                };
                const written = to[next];
                if (written !== undefined) {
                    put(written);
                }
            }}
        />
    );
}

/**
 * The Entry pop-over's source line: a Field's picker, a Graph value's sentence, a fixed Value or Text.
 * @param props - Component props
 * @param props.args - the entry
 * @returns The line
 */
function SourceLine({ args }: Readonly<{ args: EntryArgs }>): React.JSX.Element {
    const { ctx, channel, entry, name, put } = args;
    if ("field" in entry || "pattern" in entry) {
        return (
            <PopLine line="entry.field" name="Field">
                <DataFieldPicker
                    label="Field"
                    fields={fieldsFor(ctx.session, channel, []).filter((field) => field.group !== "Calculated")}
                    value={"field" in entry ? entry.field : null}
                    actionValue={"pattern" in entry ? "pattern" : undefined}
                    actions={"pattern" in entry ? [{ id: "pattern", label: name }] : []}
                    onChange={(next) => {
                        if (next !== null) {
                            put({ ...optionsOf(entry), field: next });
                        }
                    }}
                />
            </PopLine>
        );
    }
    if ("graph" in entry) {
        return (
            <PopLine line="entry.graph" name="Value">
                <ValueButton label="Graph value" words={name} onClick={() => undefined} />
            </PopLine>
        );
    }
    if ("value" in entry) {
        return (
            <PopLine line="entry.value" name="Value">
                <PanelField
                    label="Value"
                    kind="number"
                    width="fill"
                    value={entry.value}
                    onChange={(next) => {
                        put({ ...optionsOf(entry), value: Number(next) });
                    }}
                />
            </PopLine>
        );
    }
    return (
        <PopLine line="entry.text" name="Text">
            <CommitText
                label="Text"
                value={"text" in entry ? entry.text : ""}
                unset="Text"
                onCommit={(words) => {
                    put({ ...optionsOf(entry), text: words });
                }}
            />
        </PopLine>
    );
}

/**
 * The Entry pop-over's "Each value" line, for a list field: Count or Equal share for words, Each item or one
 * statistic for numbers.
 * @param props - Component props
 * @param props.args - the entry
 * @returns The line, or nothing for an entry that does not spread
 */
function EachLine({ args }: Readonly<{ args: EntryArgs }>): React.JSX.Element | null {
    const { entry, fact, put } = args;
    if (!("field" in entry) || fact?.parts === undefined || fact.parts.length === 0) {
        return null;
    }
    const words = Array.isArray(fact.value) && (fact.value as unknown[]).some((v) => typeof v !== "number");
    return (
        <PopLine line="entry.each" name="Each value">
            {words ? (
                <Segments
                    label="Each value"
                    value={entry.each === "equal" ? "equal" : "count"}
                    options={[
                        ["count", "Count"],
                        ["equal", "Equal share"],
                    ]}
                    onPick={(next) => {
                        put({ ...entry, each: next === "equal" ? "equal" : "count" });
                    }}
                />
            ) : (
                <PanelField
                    label="Each value"
                    kind="select"
                    width="fill"
                    value={entry.each ?? "items"}
                    data={[
                        { value: "items", label: "Each item" },
                        { value: "sum", label: "Sum" },
                        { value: "mean", label: "Mean" },
                        { value: "min", label: "Min" },
                        { value: "max", label: "Max" },
                    ]}
                    onChange={(next) => {
                        put({ ...entry, each: String(next) as DataEntry["each"] });
                    }}
                />
            )}
        </PopLine>
    );
}

/**
 * The Entry pop-over's Format line: the presets, each followed by the sample value in it.
 * @param props - Component props
 * @param props.args - the entry
 * @returns The line
 */
function FormatLine({ args }: Readonly<{ args: EntryArgs }>): React.JSX.Element {
    const { entry, fact, put } = args;
    const sample = fact?.value ?? 1234.5;
    const now = presetOf(entry.format);
    return (
        <PopLine line="entry.format" name="Format">
            <PanelField
                label="Format"
                kind="select"
                width="fill"
                value={now}
                data={[
                    ...PRESETS.map(([words, preset]) => ({
                        value: words,
                        label: `${words}: ${formatValue(sample, preset)}`,
                    })),
                    ...(now === "Custom" ? [{ value: "Custom", label: "Custom" }] : []),
                ]}
                onChange={(next) => {
                    const preset = PRESETS.find(([words]) => words === next);
                    if (preset !== undefined) {
                        put({ ...entry, format: preset[1] });
                    }
                }}
            />
        </PopLine>
    );
}

/**
 * The Entry pop-over's lines (spec 2.1, at most six): its kind, its source, how a list spreads, its name, its format
 * and, for a pie's or chart's plain entry, its color.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the data channel
 * @param props.spec - the spec
 * @param props.at - the entry's place
 * @param props.fact - its facts on the sample
 * @param props.color - the color graphty-element draws it in, when it is one part
 * @returns The lines
 */
function EntryLines({
    ctx,
    channel,
    spec,
    at,
    fact,
    color,
}: Readonly<{
    ctx: RowContext;
    channel: DataChannel;
    spec: Spec;
    at: number;
    fact: DataEntryFact | undefined;
    color: string | undefined;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const entry = spec.entries[at];
    const name = entryName(ctx.session, entry);
    const put = (next: DataEntry): void => {
        writeSpec(ctx, channel, { ...spec, entries: spec.entries.map((each, i) => (i === at ? next : each)) }).catch(
            failed(store, name),
        );
    };
    const args: EntryArgs = { ctx, channel, entry, fact, name, put };
    const spreads = (fact?.parts?.length ?? 0) > 0 || "pattern" in entry;
    const colored = channel !== "node.recordData" && !spreads;
    return (
        <>
            <KindTabs args={args} />
            <SourceLine args={args} />
            <EachLine args={args} />
            <PopLine line="entry.label" name="Name">
                <CommitText
                    label="Name"
                    value={entry.label}
                    unset={entryName(ctx.session, { ...entry, label: undefined })}
                    onCommit={(words) => {
                        put({ ...entry, label: words === "" ? undefined : words });
                    }}
                />
            </PopLine>
            <FormatLine args={args} />
            {colored ? (
                <PopLine line="entry.color" name={null}>
                    <CompactColorInput
                        variant="chip"
                        aria-label={`${name} color`}
                        color={entry.color ?? color ?? "#888888"}
                        defaultColor={color ?? "#888888"}
                        showOpacity={false}
                        showReset={false}
                        swatches={ctx.documentColors}
                        onChange={(next) => {
                            if (next !== undefined) {
                                put({ ...entry, color: next });
                            }
                        }}
                    />
                </PopLine>
            ) : null}
        </>
    );
}

/** The choices the Sample line offers, with their words. */
const SAMPLE_CHOICES: readonly (readonly [Find, string])[] = [
    ["next", "Next node"],
    ["undrawn", "A node that draws nothing"],
    ["missing", "A node with a missing value"],
];

/**
 * The Sample line: the sample node's name (with why it draws nothing, when it does not), and the choices that find
 * another (graphty-element's `dataSample`); a choice that finds none is disabled and says "None".
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the data channel
 * @param props.facts - the sample's facts
 * @param props.onSample - called with the node found
 * @returns The line
 */
function SampleLine({
    ctx,
    channel,
    facts,
    onSample,
}: Readonly<{
    ctx: RowContext;
    channel: DataChannel;
    facts: DataFacts | undefined;
    onSample: (node: NodeId) => void;
}>): React.JSX.Element {
    const layer = holderOf(ctx, channel);
    const found = new Map(
        SAMPLE_CHOICES.map(([what]) => [
            what,
            layer === undefined ? null : ctx.session.styles.dataSample(layer.id, channel, what, facts?.node),
        ]),
    );
    const why = facts?.undrawn === null || facts === undefined ? "" : `: ${dataUndrawnWords(facts.undrawn)}`;
    const shown = facts === undefined ? "None" : facts.name + why;
    return (
        <PopLine line="data.sample" name="Sample">
            <PanelField
                label="Sample"
                kind="select"
                width="fill"
                value="shown"
                data={[
                    { value: "shown", label: shown },
                    ...SAMPLE_CHOICES.map(([what, words]) => ({
                        value: what,
                        label: found.get(what) === null ? `${words}: None` : words,
                        disabled: found.get(what) === null,
                    })),
                ]}
                onChange={(next) => {
                    const node = found.get(next as Find);
                    if (node !== undefined && node !== null) {
                        onSample(node);
                    }
                }}
            />
        </PopLine>
    );
}

/** What a data pop-over's own lines read and write. */
interface SpecArgs {
    readonly ctx: RowContext;
    readonly channel: DataChannel;
    readonly spec: Spec;
    readonly put: (patch: Readonly<Record<string, unknown>>) => void;
}

/**
 * The Order line, a pie's and a chart's.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The line
 */
function OrderLine({ args }: Readonly<{ args: SpecArgs }>): React.JSX.Element {
    const { channel, spec, put } = args;
    return (
        <PopLine line="data.order" name="Order">
            <Segments
                label="Order"
                value={word(spec.order, "listed")}
                options={[
                    ["listed", "Listed"],
                    ["largest", channel === "node.chartData" ? "Value" : "Largest"],
                    ["name", "Name"],
                ]}
                onPick={(next) => {
                    put({ order: next === "listed" ? undefined : next });
                }}
            />
        </PopLine>
    );
}

/**
 * A channel's own line in a data pop-over (a pie's Hole, a chart's Kind), as the thing's fixed pop-over draws it.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the channel
 * @returns The line, or nothing where the rubric has none
 */
function ChannelField({ ctx, channel }: Readonly<{ ctx: RowContext; channel: Channel }>): React.JSX.Element | null {
    const found = lineFor(ctx.side, channel);
    return found === undefined ? null : <RubricLine ctx={ctx} line={found.line} />;
}

/**
 * A pie's data lines: Hole, Whole, Order, Keep and On slices.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The lines
 */
function PieLines({ args }: Readonly<{ args: SpecArgs }>): React.JSX.Element {
    const { ctx, spec, put } = args;
    const max = (spec.whole as { max?: number } | undefined)?.max;
    const keep = typeof spec.keep === "number" ? spec.keep : undefined;
    return (
        <>
            <ChannelField ctx={ctx} channel="node.pieHole" />
            <PopLine line="data.whole" name="Whole">
                <Segments
                    label="Whole"
                    value={max === undefined ? "total" : "max"}
                    options={[
                        ["total", "Total"],
                        ["max", "Set max"],
                    ]}
                    onPick={(next) => {
                        put({ whole: next === "total" ? undefined : { max: 100 } });
                    }}
                />
                {max === undefined ? null : (
                    <PanelField
                        label="Max"
                        kind="number"
                        value={max}
                        onChange={(next) => {
                            put({ whole: Number(next) > 0 ? { max: Number(next) } : undefined });
                        }}
                    />
                )}
            </PopLine>
            <OrderLine args={args} />
            <PopLine line="data.keep" name="Keep">
                <Segments
                    label="Keep"
                    value={keep === undefined ? "all" : "top"}
                    options={[
                        ["all", "All"],
                        ["top", "Top N"],
                    ]}
                    onPick={(next) => {
                        put({ keep: next === "all" ? undefined : 5 });
                    }}
                />
                {keep === undefined ? null : (
                    <PanelField
                        label="N"
                        kind="number"
                        value={keep}
                        min={1}
                        onChange={(next) => {
                            put({ keep: Math.max(1, Math.round(Number(next))) });
                        }}
                    />
                )}
            </PopLine>
            <PopLine line="data.labels" name="On slices">
                <Segments
                    label="On slices"
                    value={word(spec.labels, "none")}
                    options={[
                        ["none", "None"],
                        ["value", "Value"],
                        ["percent", "Percent"],
                    ]}
                    onPick={(next) => {
                        put({ labels: next === "none" ? undefined : next });
                    }}
                />
            </PopLine>
        </>
    );
}

/**
 * A chart's data lines: Kind, Series, Order and Scale.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The lines
 */
function ChartLines({ args }: Readonly<{ args: SpecArgs }>): React.JSX.Element {
    const { ctx, spec, put } = args;
    const scale = (spec.scale ?? {}) as { readonly share?: string };
    return (
        <>
            <ChannelField ctx={ctx} channel="node.chartKind" />
            <PopLine line="data.series" name="Series">
                <Segments
                    label="Series"
                    value={typeof spec.series === "object" ? "name" : "each"}
                    options={[
                        ["each", "Each"],
                        ["name", "Name part"],
                    ]}
                    onPick={(next) => {
                        put({ series: next === "each" ? undefined : { separator: "_" } });
                    }}
                />
            </PopLine>
            <OrderLine args={args} />
            <PopLine line="data.scale" name="Scale">
                <Segments
                    label="Scale"
                    value={scale.share === "node" ? "node" : "shared"}
                    options={[
                        ["shared", "Shared"],
                        ["node", "Per node"],
                    ]}
                    onPick={(next) => {
                        put({ scale: next === "node" ? { ...scale, share: "node" } : undefined });
                    }}
                />
            </PopLine>
        </>
    );
}

/**
 * A record's data lines: Layout, Header, Rows and Most rows.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The lines
 */
function RecordLines({ args }: Readonly<{ args: SpecArgs }>): React.JSX.Element {
    const { ctx, channel, spec, put } = args;
    return (
        <>
            <PopLine line="data.layout" name="Layout">
                <Segments
                    label="Layout"
                    value={word(spec.layout, "table")}
                    options={[
                        ["table", "Table"],
                        ["points", "Points"],
                    ]}
                    onPick={(next) => {
                        put({ layout: next === "table" ? undefined : next });
                    }}
                />
            </PopLine>
            <PopLine line="data.header" name="Header">
                <DataFieldPicker
                    label="Header"
                    clearable
                    fields={fieldsFor(ctx.session, channel, []).filter((each) => each.group !== "Calculated")}
                    value={typeof spec.header === "string" ? spec.header : null}
                    onChange={(next) => {
                        put({ header: next ?? undefined });
                    }}
                />
            </PopLine>
            <PopLine line="data.rows" name="Rows">
                <Segments
                    label="Rows"
                    value={word(spec.rows, "plain")}
                    options={[
                        ["plain", "Plain"],
                        ["lines", "Lines"],
                        ["zebra", "Zebra"],
                    ]}
                    onPick={(next) => {
                        put({ rows: next === "plain" ? undefined : next });
                    }}
                />
            </PopLine>
            <PopLine line="data.most" name="Most rows">
                <PanelField
                    label="Most rows"
                    kind="number"
                    width="fill"
                    value={typeof spec.most === "number" ? spec.most : null}
                    placeholder="All"
                    min={1}
                    onChange={(next) => {
                        put({ most: Number(next) >= 1 ? Math.round(Number(next)) : undefined });
                    }}
                />
            </PopLine>
        </>
    );
}

/**
 * The data pop-over's own lines before Sample, by channel.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the data channel
 * @param props.spec - the spec
 * @returns The lines
 */
function SpecLines({
    ctx,
    channel,
    spec,
}: Readonly<{ ctx: RowContext; channel: DataChannel; spec: Spec }>): React.JSX.Element {
    const { store } = useWorkspace();
    const put = (patch: Readonly<Record<string, unknown>>): void => {
        const next = Object.fromEntries(Object.entries({ ...spec, ...patch }).filter(([, v]) => v !== undefined));
        writeSpec(ctx, channel, next as unknown as Spec).catch(failed(store, "Data"));
    };
    const args: SpecArgs = { ctx, channel, spec, put };
    if (channel === "node.pieData") {
        return <PieLines args={args} />;
    }
    return channel === "node.chartData" ? <ChartLines args={args} /> : <RecordLines args={args} />;
}

/**
 * One entry's line under the row: its name above, the sample's value in its format, its "..." (the Entry pop-over)
 * and its "-". Alt+ArrowUp and Alt+ArrowDown move it.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the data channel
 * @param props.spec - the spec
 * @param props.at - the entry's place
 * @param props.fact - its facts on the sample
 * @param props.write - writes the entries
 * @param props.color - the color graphty-element draws the entry in, when it is one part
 * @returns The line
 */
function EntryLine({
    ctx,
    channel,
    spec,
    at,
    fact,
    write,
    color,
}: Readonly<{
    ctx: RowContext;
    channel: DataChannel;
    spec: Spec;
    at: number;
    fact: DataEntryFact | undefined;
    write: (entries: readonly DataEntry[]) => void;
    color: string | undefined;
}>): React.JSX.Element {
    const name = entryName(ctx.session, spec.entries[at]);
    return (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- catches Alt+ArrowUp/Down bubbling from the line's own controls to move the entry; the line's controls are the keyboard's doors
        <div
            data-entry={at}
            onKeyDown={(event) => {
                if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                    event.preventDefault();
                    const next = moved(spec.entries, at, event.key === "ArrowUp" ? -1 : 1);
                    if (next !== spec.entries) {
                        write(next);
                    }
                }
            }}
        >
            <LineFrame
                line={`${channel}.entries.${String(at)}`}
                name={name}
                set
                rule="R12"
                control={<ValueButton label={name} words={entryWords(fact)} onClick={() => undefined} />}
                modifier={
                    <RowSettings label={`${name} settings`} title={name}>
                        <EntryLines ctx={ctx} channel={channel} spec={spec} at={at} fact={fact} color={color} />
                    </RowSettings>
                }
                removeName={`Remove ${name}`}
                onRemove={() => {
                    write(spec.entries.filter((_, i) => i !== at));
                }}
            />
        </div>
    );
}

/**
 * A Pie, Chart or Record row: see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.thing - the thing's id
 * @param props.start - its start channel (its first fixed list)
 * @param props.channel - its data channel
 * @param props.name - its row name
 * @param props.title - its name in titles
 * @param props.fixedSettings - while it holds fixed values: its fixed settings pop-over
 * @param props.removeLabel - its minus's name
 * @param props.onRemove - takes the whole thing off
 * @param props.fixedLines - while it holds fixed values: the fixed lines the layer sets, drawn under the row
 * @returns The row and its entry lines
 */
export function DataRow({
    ctx,
    thing,
    start,
    channel,
    name,
    title,
    fixedSettings,
    removeLabel,
    onRemove,
    fixedLines,
}: Readonly<{
    ctx: RowContext;
    thing: string;
    start: Channel;
    channel: DataChannel;
    name: string;
    title: string;
    fixedSettings: React.ReactNode;
    removeLabel: string;
    onRemove: () => void;
    fixedLines: React.ReactNode;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const [picked, setPicked] = useState<NodeId | null>(null);
    const [open, setOpen] = useState(false);
    const spec = specOf(ctx, channel);
    const facts = spec === undefined ? undefined : sampleFacts(ctx, channel, picked);
    const write = (entries: readonly DataEntry[]): void => {
        if (spec !== undefined) {
            writeSpec(ctx, channel, { ...spec, entries }).catch(failed(store, title));
        }
    };
    const settings =
        spec === undefined ? (
            fixedSettings
        ) : (
            <RowSettings label={`${title} settings`} title={title} changed opened={open} onOpenChange={setOpen}>
                <SpecLines ctx={ctx} channel={channel} spec={spec} />
                <SampleLine ctx={ctx} channel={channel} facts={facts} onSample={setPicked} />
            </RowSettings>
        );
    return (
        <>
            <LineFrame
                line={spec === undefined ? start : channel}
                name={name}
                set
                rule="R12"
                control={<DataPicker ctx={ctx} channel={channel} thing={thing} start={start} title={title} />}
                modifier={settings}
                removeName={removeLabel}
                onRemove={onRemove}
            />
            {spec === undefined ? fixedLines : null}
            {(spec?.entries ?? []).map((entry, at) =>
                spec === undefined ? null : (
                    <EntryLine
                        key={`${entryId(entry, at)}-${String(at)}`}
                        ctx={ctx}
                        channel={channel}
                        spec={spec}
                        at={at}
                        fact={facts?.entries[at]}
                        write={write}
                        color={facts?.categories.find((each) => each.key === partKey(entry, at))?.color}
                    />
                ),
            )}
        </>
    );
}
