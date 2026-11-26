/**
 * A Pie, Chart or Record row drawing from data (tmp/entries-first/spec.md, Part 2, option C "Entries first"): the
 * row's main control is the entries picker ("Fixed" while the layer holds fixed values), each entry is a line under
 * the row reading the sample node's value in its format, and the row's "..." holds the spec's own settings and the
 * Sample line. Every write is one `styles.update` of the spec (`dataEntries.ts`); graphty-element counts, formats and
 * colors, and the panel shows its facts (`styles.dataFacts`).
 */

import { CompactColorInput, DataFieldPicker, PanelField } from "@graphty/compact-mantine";
import {
    type Channel,
    type DataChannel,
    type DataEntry,
    type DataEntryFact,
    type DataFacts,
    formatValue,
    writeChannelList,
} from "@graphty/graphty-element/catalog";
import type { NodeId } from "@graphty/graphty-element/session";
import React, { useEffect, useId, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";
import { colorPalettes, dataUndrawnWords } from "../words";
import { CalculateLines } from "./CalculatePopover";
import {
    draftAfter,
    entryId,
    entryName,
    failed,
    fieldsFor,
    FIXED,
    holderOf,
    moved,
    NONE,
    partKey,
    pruned,
    sampleFacts,
    type Spec,
    specOf,
    word,
    writeSpec,
} from "./dataEntries";
import { DataGroups, EmptyLine, KeepLine, PaletteLine } from "./DataGroups";
import { BesidePopover, CommitText, PopLine, Segments, WordNumber } from "./dataLines";
import { FormatLines } from "./FormatPopover";
import { firstColors, LISTS, type ListSpec } from "./lists";
import { shownPaint, writtenPaint } from "./paint";
import { lineFor } from "./rubric";
import { LineFrame, RubricLine } from "./RubricLine";
import { RowSettings } from "./ThingLine";
import { ValueButton } from "./ValueButton";

/**
 * The first fixed values a thing gets back when the reader picks "Fixed": a list thing's first item (stripes' first
 * two, as "+" Stripes writes: one band would read as a plain fill).
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
        [list.colors]: writeChannelList(list.colors, firstColors(ctx).slice(0, thing === "stripes" ? 2 : 1)),
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

/** A new Graph value's first definition: a count of the node's edges, which Calculate then edits. */
const NEW_GRAPH: DataEntry = { graph: { over: "edges", measure: "count" } };

/**
 * The row's entries picker: a multi-pick of the node's columns and results, kept as a draft and written once on
 * Done (one undo step); Escape writes nothing. "Fixed" turns the thing back into fixed values; a Record's "Text"
 * adds a fixed text entry and keeps the list open; "Calculate..." writes the draft with a new Graph value after it
 * and opens that value's Calculate pop-over.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the data channel
 * @param props.thing - the thing's id
 * @param props.start - the thing's start channel, for "Fixed"
 * @param props.title - the thing's name
 * @param props.onCalculate - called with the new Graph value's place, once it is written
 * @param props.picking - just added: the list opens at once
 * @returns The picker
 */
function DataPicker({
    ctx,
    channel,
    thing,
    start,
    title,
    onCalculate,
    picking,
}: Readonly<{
    ctx: RowContext;
    channel: DataChannel;
    thing: string;
    start: Channel;
    title: string;
    onCalculate: (at: number) => void;
    picking: boolean;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const spec = specOf(ctx, channel);
    const [draft, setDraft] = useState<readonly DataEntry[] | null>(null);
    const entries = draft ?? spec?.entries ?? [];
    const record = channel === "node.recordData";
    return (
        <DataFieldPicker
            multiple
            defaultOpened={picking}
            label={`${title} data`}
            fields={fieldsFor(ctx.session, channel, entries)}
            values={entries.map((entry, at) => entryId(entry, at))}
            shown={shownEntries(ctx, entries)}
            actions={[
                { id: "fixed", label: FIXED },
                ...(record ? [{ id: "text", label: "Text", keepsOpen: true }] : []),
                { id: "calculate", label: "Calculate..." },
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
                if (id === "calculate") {
                    writeSpec(ctx, channel, { ...spec, entries: [...entries, NEW_GRAPH] })
                        .then(() => {
                            onCalculate(entries.length);
                        })
                        .catch(failed(store, title));
                    return;
                }
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
 * What the row's picker reads: "Fixed" with no entries, its one entry's name, else how many entries it holds, so a
 * pie of two fields never reads as its first alone.
 * @param ctx - the row.
 * @param entries - the entries.
 * @returns the words.
 */
function shownEntries(ctx: RowContext, entries: readonly DataEntry[]): string {
    const first = entries.at(0);
    if (first === undefined) {
        return FIXED;
    }
    return entries.length === 1 ? entryName(ctx.session, first) : `${String(entries.length)} entries`;
}

/** Which pop-over an Entry pop-over has open beside it. */
type Beside = "calculate" | "format" | null;

/** What an entry pop-over's lines read and write. */
interface EntryArgs {
    readonly ctx: RowContext;
    readonly channel: DataChannel;
    readonly entry: DataEntry;
    readonly fact: DataEntryFact | undefined;
    readonly name: string;
    readonly put: (next: DataEntry) => void;
    readonly beside: Beside;
    readonly setBeside: (open: Beside) => void;
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
        <div data-strip="">
            <PopLine line="entry.kind" name={null}>
                <Segments
                    label={`${name} kind`}
                    value={kindOf(entry)}
                    options={[["field", "Field"], ["graph", "Graph"], record ? ["text", "Text"] : ["value", "Value"]]}
                    onPick={(next) => {
                        const common = optionsOf(entry);
                        const fits = fieldsFor(ctx.session, channel, []).find(
                            (field) => field.disabledReason === undefined,
                        );
                        const to: Readonly<Record<string, DataEntry | undefined>> = {
                            field: fits === undefined ? undefined : { ...common, field: fits.id },
                            graph: { ...common, ...NEW_GRAPH },
                            value: { ...common, value: 1 },
                            text: { ...common, text: "Text" },
                        };
                        const written = to[next];
                        if (written !== undefined) {
                            put(written);
                        }
                    }}
                />
            </PopLine>
        </div>
    );
}

/**
 * An entry's source control: a Field's picker, a Graph value's button (opening Calculate beside), a fixed Value or
 * Text. It is drawn on the entry's line under the row alone, never again in the Entry pop-over (owner, 2026-11-24:
 * one path to any control).
 * @param props - Component props
 * @param props.args - the entry
 * @returns The control
 */
function SourceControl({ args }: Readonly<{ args: EntryArgs }>): React.JSX.Element {
    const { ctx, channel, entry, name, put, beside, setBeside } = args;
    // The Calculate pop-over the Graph value opens, named by the button (aria-controls).
    const calculateId = useId();
    if ("field" in entry || "pattern" in entry) {
        return (
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
        );
    }
    if ("graph" in entry) {
        return (
            <>
                <ValueButton
                    label="Graph value"
                    words={entryName(ctx.session, { ...entry, label: undefined })}
                    opens="dialog"
                    controls={calculateId}
                    expanded={beside === "calculate"}
                    onClick={() => {
                        setBeside(beside === "calculate" ? null : "calculate");
                    }}
                />
                <BesidePopover
                    id={calculateId}
                    title="Calculate"
                    opened={beside === "calculate"}
                    onOpenChange={(open) => {
                        setBeside(open ? "calculate" : null);
                    }}
                >
                    <CalculateLines
                        session={ctx.session}
                        graph={entry.graph}
                        put={(graph) => {
                            put({ ...optionsOf(entry), graph });
                        }}
                    />
                </BesidePopover>
            </>
        );
    }
    if ("value" in entry) {
        return (
            <PanelField
                label="Value"
                kind="number"
                width="fill"
                value={entry.value}
                onChange={(next) => {
                    put({ ...optionsOf(entry), value: Number(next) });
                }}
            />
        );
    }
    return (
        <CommitText
            label="Text"
            value={"text" in entry ? entry.text : ""}
            unset="Text"
            onCommit={(words) => {
                put({ ...optionsOf(entry), text: words });
            }}
        />
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
    const { ctx, entry, put } = args;
    // Whether the field holds lists, and of what, is the column's (graphty-element's `spread`), never one node's.
    const spread =
        "field" in entry
            ? ctx.session.data.readableValues().find((each) => each.path === entry.field && each.on === "node")?.spread
            : undefined;
    if (spread === undefined) {
        return null;
    }
    const words = spread === "categories";
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
                        put({ ...entry, each: next === "equal" ? "equal" : undefined });
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
                        put({ ...entry, each: next === "items" ? undefined : (String(next) as DataEntry["each"]) });
                    }}
                />
            )}
        </PopLine>
    );
}

/**
 * A value the Format line's presets show the sample in: the entry's own number on the sample, its first part's when
 * it spreads, else a stand-in number.
 * @param fact - the entry's facts on the sample.
 * @returns the number.
 */
function sampleNumber(fact: DataEntryFact | undefined): number {
    if (typeof fact?.value === "number") {
        return fact.value;
    }
    const part = fact?.parts?.find((each) => typeof each.value === "number")?.value;
    return typeof part === "number" ? part : 1234.5;
}

/**
 * Whether an entry's value is a number (a text value takes no number format).
 * @param entry - the entry.
 * @param fact - its facts on the sample.
 * @returns whether it is.
 */
function numericEntry(entry: DataEntry, fact: DataEntryFact | undefined): boolean {
    if ("text" in entry) {
        return false;
    }
    if (!("field" in entry) || fact === undefined || fact.value === null) {
        return true;
    }
    return typeof fact.value === "number" || (fact.parts ?? []).some((part) => typeof part.value === "number");
}

/**
 * The Entry pop-over's Format line: the sample value in the entry's format, opening the Format pop-over beside, the
 * one place a format is set (owner, 2026-11-24: one path to any control).
 * @param props - Component props
 * @param props.args - the entry
 * @returns The line
 */
function FormatLine({ args }: Readonly<{ args: EntryArgs }>): React.JSX.Element {
    const { channel, entry, fact, name, put, beside, setBeside } = args;
    const numeric = numericEntry(entry, fact);
    const sample = numeric ? sampleNumber(fact) : (fact?.text ?? "Text");
    // The Format pop-over the line's button opens, named by the button (aria-controls).
    const formatId = useId();
    return (
        <PopLine line="entry.format" name="Format">
            <ValueButton
                label={`${name} format`}
                words={formatValue(sample, entry.format)}
                opens="dialog"
                controls={formatId}
                expanded={beside === "format"}
                onClick={() => {
                    setBeside(beside === "format" ? null : "format");
                }}
            />
            <BesidePopover
                id={formatId}
                title="Format"
                opened={beside === "format"}
                onOpenChange={(open) => {
                    setBeside(open ? "format" : null);
                }}
            >
                <FormatLines channel={channel} entry={entry} numeric={numeric} put={put} />
            </BesidePopover>
        </PopLine>
    );
}

/**
 * The Entry pop-over's lines (spec 2.1, at most six): its kind (its source is its line's under the row), how a list
 * spreads, its name, its format and, for a pie's or chart's plain entry, its color.
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
    const [beside, setBeside] = useState<Beside>(null);
    const entry = spec.entries[at];
    const name = entryName(ctx.session, entry);
    const put = (next: DataEntry): void => {
        writeSpec(ctx, channel, { ...spec, entries: spec.entries.map((each, i) => (i === at ? next : each)) }).catch(
            failed(store, name),
        );
    };
    const args: EntryArgs = { ctx, channel, entry, fact, name, put, beside, setBeside };
    const spreads = (fact?.parts?.length ?? 0) > 0 || "pattern" in entry;
    const paint = shownPaint(entry.color ?? color ?? "#888888", entry.opacity ?? 1);
    const colored = channel !== "node.recordData" && !spreads;
    return (
        <>
            <KindTabs args={args} />
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
                        palettes={colorPalettes(ctx.session)}
                        variant="chip"
                        aria-label={`${name} color`}
                        color={paint.color}
                        defaultColor={color ?? "#888888"}
                        opacity={paint.percent}
                        showReset={entry.color !== undefined}
                        swatches={ctx.documentColors}
                        onChange={(next, percent) => {
                            if (next === undefined) {
                                put({ ...entry, color: undefined, opacity: undefined });
                                return;
                            }
                            // The picker's opacity is what draws, the color's own alpha folded in (paint.ts).
                            const written = writtenPaint(next, percent ?? 100);
                            put({
                                ...entry,
                                color: written.color,
                                opacity: written.opacity === 1 ? undefined : written.opacity,
                            });
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
    readonly facts: DataFacts | undefined;
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
 * The Whole line, a pie's and stripes': Total, or Set max with Max beside.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The line
 */
function WholeLine({ args }: Readonly<{ args: SpecArgs }>): React.JSX.Element {
    const { spec, put } = args;
    const whole = spec.whole as { max?: number; track?: string } | undefined;
    return (
        <PopLine
            line="data.whole"
            name={whole?.max === undefined ? "Whole" : "Whole / Max"}
            wide={whole?.max !== undefined}
        >
            <Segments
                label="Whole"
                value={whole?.max === undefined ? "total" : "max"}
                options={[
                    ["total", "Total"],
                    ["max", "Set max"],
                ]}
                onPick={(next) => {
                    put({ whole: next === "total" ? undefined : { max: 100 } });
                }}
            />
            {whole?.max === undefined ? null : (
                <PanelField
                    label="Max"
                    kind="number"
                    width="fill"
                    value={whole.max}
                    onChange={(next) => {
                        put({ whole: Number(next) > 0 ? { ...whole, max: Number(next) } : undefined });
                    }}
                />
            )}
        </PopLine>
    );
}

/**
 * A pie's data lines: Hole, Whole, Order, Keep and On slices.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The lines
 */
function PieLines({ args }: Readonly<{ args: SpecArgs }>): React.JSX.Element {
    const { ctx, spec, put } = args;
    return (
        <>
            <ChannelField ctx={ctx} channel="node.pieHole" />
            <WholeLine args={args} />
            <OrderLine args={args} />
            <KeepLine args={args} />
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
 * The chart extent graphty-element draws the sample node at now, as a Set scale's start.
 * @param ctx - the row.
 * @param facts - the sample's facts.
 * @returns its min and max, 0 to 1 where none is drawn.
 */
function drawnExtent(ctx: RowContext, facts: DataFacts | undefined): { min: number; max: number } {
    let merged: Readonly<Record<string, unknown>> = {};
    if (facts !== undefined) {
        try {
            ({ merged } = ctx.session.styles.explain({ node: facts.node }));
        } catch {
            // The sample is gone: the default extent.
        }
    }
    const min = Number(merged["node.chartMin"]);
    const max = Number(merged["node.chartMax"]);
    return Number.isFinite(min) && Number.isFinite(max) && max > min ? { min, max } : { min: 0, max: 1 };
}

/**
 * Stripes' data lines: Direction, Whole, Order, Keep and No values (a pie's, without Hole and On slices: stripes draw
 * no text). No values is a line here, not a group of one line (owner, 2026-11-24), and keeps the pop-over at five rows.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The lines
 */
function StripeLines({ args }: Readonly<{ args: SpecArgs }>): React.JSX.Element {
    return (
        <>
            <ChannelField ctx={args.ctx} channel="node.stripeDirection" />
            <WholeLine args={args} />
            <OrderLine args={args} />
            <KeepLine args={args} />
            <EmptyLine args={args} />
        </>
    );
}

/**
 * A chart's data lines: Kind, Series, Order, its palette and Scale.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The lines
 */
function ChartLines({ args }: Readonly<{ args: SpecArgs }>): React.JSX.Element {
    const { ctx, spec, put } = args;
    const scale = (spec.scale ?? {}) as { readonly share?: string; readonly min?: number; readonly max?: number };
    const series = typeof spec.series === "object" ? (spec.series as { separator: string }) : undefined;
    let shared = "shared";
    if (scale.min !== undefined && scale.max !== undefined) {
        shared = "set";
    } else if (scale.share === "node") {
        shared = "node";
    }
    return (
        <>
            <ChannelField ctx={ctx} channel="node.chartKind" />
            <PopLine
                line="data.series"
                name={series === undefined ? "Series" : "Series / Split at"}
                wide={series !== undefined}
            >
                <Segments
                    label="Series"
                    value={series === undefined ? "each" : "name"}
                    options={[
                        ["each", "Each"],
                        ["name", "Name part"],
                    ]}
                    onPick={(next) => {
                        put({ series: next === "each" ? undefined : { separator: "_" } });
                    }}
                />
                {series === undefined ? null : (
                    <CommitText
                        label="Split at"
                        value={series.separator}
                        unset="_"
                        onCommit={(words) => {
                            put({ series: { separator: words === "" ? "_" : words } });
                        }}
                    />
                )}
            </PopLine>
            <OrderLine args={args} />
            <PaletteLine args={args} />
            <PopLine line="data.scale" name="Scale">
                <Segments
                    label="Scale"
                    value={shared}
                    options={[
                        ["shared", "Shared"],
                        ["node", "Per node"],
                        ["set", "Set"],
                    ]}
                    onPick={(next) => {
                        const { share: _share, min: _min, max: _max, ...rest } = scale;
                        const by: Readonly<Record<string, Record<string, unknown>>> = {
                            shared: rest,
                            node: { ...rest, share: "node" },
                            // Set starts at the extent drawn now, so no bar is clipped until the reader changes it.
                            set: { ...rest, ...drawnExtent(ctx, args.facts) },
                        };
                        const written = by[next];
                        put({ scale: Object.keys(written).length === 0 ? undefined : written });
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
                    fields={fieldsFor(ctx.session, channel, []).filter((each) => each.group !== "Calculated")}
                    value={typeof spec.header === "string" ? spec.header : null}
                    actions={[NONE]}
                    actionValue={typeof spec.header === "string" ? undefined : NONE.id}
                    onAction={() => {
                        put({ header: undefined });
                    }}
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
                <WordNumber
                    label="Most rows"
                    value={typeof spec.most === "number" ? spec.most : undefined}
                    unset="All"
                    min={1}
                    onWrite={(most) => {
                        put({ most: most !== undefined && most >= 1 ? Math.round(most) : undefined });
                    }}
                />
            </PopLine>
        </>
    );
}

/**
 * The data pop-over's own lines before Sample, by channel, and its "..." groups.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the data channel
 * @param props.spec - the spec
 * @param props.facts - the sample's facts
 * @returns The lines
 */
function SpecLines({
    ctx,
    channel,
    spec,
    facts,
}: Readonly<{ ctx: RowContext; channel: DataChannel; spec: Spec; facts: DataFacts | undefined }>): React.JSX.Element {
    const { store } = useWorkspace();
    const put = (patch: Readonly<Record<string, unknown>>): void => {
        writeSpec(ctx, channel, pruned({ ...spec, ...patch })).catch(failed(store, "Data"));
    };
    const args: SpecArgs = { ctx, channel, spec, facts, put };
    let lines: React.JSX.Element = <RecordLines args={args} />;
    if (channel === "node.pieData") {
        lines = <PieLines args={args} />;
    } else if (channel === "node.chartData") {
        lines = <ChartLines args={args} />;
    } else if (channel === "node.stripeData") {
        lines = <StripeLines args={args} />;
    }
    return (
        <>
            {lines}
            <DataGroups ctx={ctx} channel={channel} spec={spec} facts={facts} put={put} />
        </>
    );
}

/**
 * One entry's line under the row: its name above, its source control, its "..." (the Entry pop-over) and its "-". Alt+ArrowUp and Alt+ArrowDown move it.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the data channel
 * @param props.spec - the spec
 * @param props.at - the entry's place
 * @param props.fact - its facts on the sample
 * @param props.write - writes the entries
 * @param props.color - the color graphty-element draws the entry in, when it is one part
 * @param props.calculate - open its Calculate pop-over from its Graph value once it is drawn
 * @param props.onCalculating - called once the Calculate pop-over is asked open
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
    calculate,
    onCalculating,
}: Readonly<{
    ctx: RowContext;
    channel: DataChannel;
    spec: Spec;
    at: number;
    fact: DataEntryFact | undefined;
    write: (entries: readonly DataEntry[]) => void;
    color: string | undefined;
    calculate: boolean;
    onCalculating: () => void;
}>): React.JSX.Element {
    const entry = spec.entries[at];
    const name = entryName(ctx.session, entry);
    const [open, setOpen] = useState(false);
    const [beside, setBeside] = useState<Beside>(null);
    const args: EntryArgs = {
        ctx,
        channel,
        entry,
        fact,
        name,
        put: (next) => {
            write(spec.entries.map((each, i) => (i === at ? next : each)));
        },
        beside,
        setBeside,
    };
    // Asked once, when the picker adds this Graph value: its Calculate pop-over opens from the line's Graph value.
    useEffect(() => {
        if (calculate) {
            setBeside("calculate");
            onCalculating();
        }
    }, [calculate, onCalculating]);
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
                // What the entry reads, never one node's values: the sidebar holds controls. Its "..." is the one way
                // to the Entry pop-over (owner, 2026-11-24: one path to any control).
                control={<SourceControl args={args} />}
                modifier={
                    <RowSettings label={`${name} settings`} title={name} opened={open} onOpenChange={setOpen}>
                        <div data-thing-popover="">
                            <EntryLines ctx={ctx} channel={channel} spec={spec} at={at} fact={fact} color={color} />
                        </div>
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
 * @param props.picking - just added: its data picker opens at once
 * @param props.heading - its data pop-over's title, when not its title
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
    picking = false,
    heading,
}: Readonly<{
    ctx: RowContext;
    picking?: boolean;
    heading?: string;
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
    // The place of a Graph value the picker just added, whose Calculate pop-over opens once its line is drawn.
    const [calculating, setCalculating] = useState<number | null>(null);
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
            <RowSettings
                label={`${title} settings`}
                title={heading ?? title}
                changed
                opened={open}
                onOpenChange={setOpen}
            >
                <div data-thing-popover="">
                    <SpecLines ctx={ctx} channel={channel} spec={spec} facts={facts} />
                    <SampleLine ctx={ctx} channel={channel} facts={facts} onSample={setPicked} />
                </div>
            </RowSettings>
        );
    const calculated = React.useCallback(() => {
        setCalculating(null);
    }, []);
    return (
        <>
            <LineFrame
                line={spec === undefined ? start : channel}
                name={name}
                set
                rule="R12"
                control={
                    <DataPicker
                        ctx={ctx}
                        channel={channel}
                        thing={thing}
                        start={start}
                        title={title}
                        onCalculate={setCalculating}
                        picking={picking}
                    />
                }
                modifier={settings}
                removeName={removeLabel}
                onRemove={onRemove}
            />
            {spec === undefined ? fixedLines : null}
            {(spec?.entries ?? []).map((entry, at) =>
                spec === undefined ? null : (
                    <EntryLine
                        // By place: a line keeps its pop-over open while its entry's kind or source changes.
                        // eslint-disable-next-line react/no-array-index-key -- keyed by place on purpose: an entry's own id changes with its source
                        key={String(at)}
                        ctx={ctx}
                        channel={channel}
                        spec={spec}
                        at={at}
                        fact={facts?.entries[at]}
                        write={write}
                        color={facts?.categories.find((each) => each.key === partKey(entry, at))?.color}
                        calculate={calculating === at}
                        onCalculating={calculated}
                    />
                ),
            )}
        </>
    );
}
