/**
 * The groups behind a data pop-over's "..." (tmp/entries-first/spec.md 2.2, 2.3): a pie's Colors, Other and No values
 * and its Disc; a chart's Scale, Other and Colors and its Axis, Border, Background and Box. Each opens beside the
 * pop-over (`GroupMenu`). The data groups write the spec; the look groups are the thing's rubric lines, as the fixed
 * pop-over draws them. Colors read graphty-element's categories (`dataFacts().categories`), never the panel's own.
 */

import { CompactColorInput, PanelField, RangeSlider } from "@graphty/compact-mantine";
import type { Channel, DataCategoryFact, DataChannel, DataFacts } from "@graphty/graphty-element/catalog";
import { Group } from "@mantine/core";
import React, { useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { PaletteSelect } from "../BindingPopover";
import type { RowContext } from "../PropertyRow";
import { colorPalettes } from "../words";
import { failed, plainKeys, pruned, type Spec, word } from "./dataEntries";
import { CommitText, PopLine, Segments, WordNumber } from "./dataLines";
import { GroupMenu, type MenuGroup } from "./GroupMenu";
import { unsetIn } from "./lineWrites";
import { shownPaint, writtenPaint } from "./paint";
import { lineChannels, lineFor, rubricOf, type SubGroup } from "./rubric";
import { RubricLine } from "./RubricLine";
import { setOn } from "./things";

/** The element's gray for Other, which an unset Other color shows. */
const OTHER_GRAY = "#686868";

/** The element's gray for a node with no values, which an unset No values color shows. */
const MISSING_GRAY = "#BDBDBD";

/** The colors list a data channel's palette paints. */
const PALETTE_OF: Readonly<Record<DataChannel, Channel>> = {
    "node.pieData": "node.pieColors",
    "node.stripeData": "node.stripeColors",
    "node.chartData": "node.chartColors",
    "node.recordData": "node.labelTable",
};

/** What a data group's lines read and write. */
export interface GroupArgs {
    readonly ctx: RowContext;
    readonly channel: DataChannel;
    readonly spec: Spec;
    readonly facts: DataFacts | undefined;
    readonly put: (patch: Readonly<Record<string, unknown>>) => void;
}

/** A group in the data pop-over's "..." menu: a data group of the spec, or a look group of the rubric. */
interface DataGroup extends MenuGroup {
    readonly lines: (args: GroupArgs) => React.ReactNode;
    readonly set: (args: GroupArgs) => boolean;
    readonly unset: (args: GroupArgs) => void;
    /** Shown only when this holds. */
    readonly when?: (args: GroupArgs) => boolean;
}

/**
 * A color line: a chip, with no name unless it has one of its own (a swatch says it is a color, not which). With
 * `onOpacity`, its picker shows the opacity the part draws at, its color's alpha folded in, and an edit writes both
 * (`paint.ts`).
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.name - its name above it, when the chip alone does not say which color it is
 * @param props.label - its accessible name
 * @param props.color - the color set, if any
 * @param props.shown - the color drawn when none is set
 * @param props.onPick - called with the color, or undefined to unset it
 * @param props.opacity - the opacity set, 0 to 1, when the line has one
 * @param props.onOpacity - with an opacity: called with the color and the opacity together
 * @returns The line
 */
function ColorLine({
    ctx,
    name = null,
    label,
    color,
    shown,
    onPick,
    opacity,
    onOpacity,
}: Readonly<{
    ctx: RowContext;
    name?: string | null;
    label: string;
    color: string | undefined;
    shown: string;
    onPick: (color: string | undefined) => void;
    opacity?: number;
    onOpacity?: (color: string | undefined, opacity: number) => void;
}>): React.JSX.Element {
    return (
        <PopLine line={`data.${label}`} name={name}>
            <ColorChip
                ctx={ctx}
                label={label}
                color={color}
                shown={shown}
                onPick={onPick}
                opacity={opacity}
                onOpacity={onOpacity}
            />
        </PopLine>
    );
}

/**
 * A color chip: the color set, else the color drawn.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.label - its accessible name
 * @param props.color - the color set, if any
 * @param props.shown - the color drawn when none is set
 * @param props.onPick - called with the color, or undefined to unset it
 * @param props.opacity - the opacity set, 0 to 1, when the chip has one
 * @param props.onOpacity - with an opacity: called with the color and the opacity together
 * @returns The chip
 */
function ColorChip({
    ctx,
    label,
    color,
    shown,
    onPick,
    opacity,
    onOpacity,
}: Readonly<{
    ctx: RowContext;
    label: string;
    color: string | undefined;
    shown: string;
    onPick: (color: string | undefined) => void;
    opacity?: number;
    onOpacity?: (color: string | undefined, opacity: number) => void;
}>): React.JSX.Element {
    const paint = shownPaint(color ?? shown, opacity ?? 1);
    return (
        <CompactColorInput
            palettes={colorPalettes(ctx.session)}
            variant="chip"
            aria-label={label}
            color={onOpacity === undefined ? (color ?? shown) : paint.color}
            defaultColor={shown}
            opacity={onOpacity === undefined ? undefined : paint.percent}
            showOpacity={onOpacity !== undefined}
            showReset={color !== undefined}
            swatches={ctx.documentColors}
            onChange={(next, percent) => {
                if (onOpacity === undefined || next === undefined) {
                    onPick(next);
                    return;
                }
                const written = writtenPaint(next, percent ?? 100);
                onOpacity(written.color, written.opacity);
            }}
        />
    );
}

/**
 * The categories the Colors group lists: graphty-element's, but Other and a plain entry's (whose color and name are its
 * Entry pop-over's: owner, 2026-11-24, one path to any control).
 * @param spec - the spec.
 * @param facts - the sample's facts.
 * @returns the categories.
 */
function listedCategories(spec: Spec, facts: DataFacts | undefined): DataCategoryFact[] {
    const plain = plainKeys(spec, facts);
    return (facts?.categories ?? []).filter((each) => each.role !== "other" && !plain.has(each.key));
}

/**
 * The palette line: a chart's in its data pop-over, a pie's or stripes' first in its Colors group.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The line
 */
export function PaletteLine({ args }: Readonly<{ args: GroupArgs }>): React.JSX.Element {
    const { ctx, channel, spec, facts, put } = args;
    return (
        <PopLine line="data.palette" name={null}>
            <PaletteSelect
                session={ctx.session}
                channel={PALETTE_OF[channel]}
                value={typeof spec.palette === "string" ? spec.palette : undefined}
                shown={facts?.palette}
                inForceShown
                patch={({ palette }) => {
                    put({ palette, colors: undefined });
                }}
            />
        </PopLine>
    );
}

/** A category override, as the spec holds it. */
type Override = { color?: string; label?: string; opacity?: number };

/**
 * The Colors group: the palette, one category picked from graphty-element's categories, its color and its name, a
 * gauge's track and, for a pie, what a node with no values draws. A plain entry's color and name are its Entry
 * pop-over's, so its category is not listed here (owner, 2026-11-24: one path to any control).
 * @param props - Component props
 * @param props.args - the spec
 * @returns The lines
 */
function ColorsLines({ args }: Readonly<{ args: GroupArgs }>): React.JSX.Element {
    const { ctx, channel, spec, facts, put } = args;
    const [key, setKey] = useState<string | null>(null);
    const categories = listedCategories(spec, facts);
    const picked = categories.find((each) => each.key === key) ?? categories.at(0);
    const overrides = (spec.categories ?? {}) as Readonly<Record<string, Override>>;
    const own = picked === undefined ? undefined : overrides[picked.key];
    const override = (patch: Override): void => {
        if (picked === undefined) {
            return;
        }
        const next = pruned({ ...own, ...patch });
        const rest = Object.fromEntries(Object.entries(overrides).filter(([each]) => each !== picked.key));
        const all = Object.keys(next).length === 0 ? rest : { ...rest, [picked.key]: next };
        put({ categories: Object.keys(all).length === 0 ? undefined : all });
    };
    const whole = spec.whole as { max?: number; track?: string } | undefined;
    return (
        <>
            {channel === "node.chartData" ? null : <PaletteLine args={args} />}
            {categories.length === 0 ? null : (
                <PopLine line="data.category" name="Category">
                    <PanelField
                        label="Category"
                        kind="select"
                        width="fill"
                        value={picked?.key ?? null}
                        placeholder="None"
                        data={categories.map((each) => ({
                            value: each.key,
                            label: each.role === "missing" ? "Unknown" : each.name,
                        }))}
                        onChange={(next) => {
                            setKey(String(next));
                        }}
                    />
                </PopLine>
            )}
            {picked === undefined ? null : (
                <>
                    <ColorLine
                        ctx={ctx}
                        label={`${picked.name} color`}
                        name="Color"
                        color={own?.color}
                        shown={picked.color}
                        opacity={own?.opacity}
                        onPick={(color) => {
                            override({ color, opacity: undefined });
                        }}
                        onOpacity={(color, opacity) => {
                            override({ color, opacity: opacity === 1 ? undefined : opacity });
                        }}
                    />
                    <PopLine line="data.categoryName" name="Name">
                        <CommitText
                            label="Name"
                            value={own?.label}
                            unset={picked.name}
                            onCommit={(words) => {
                                override({ label: words === "" ? undefined : words });
                            }}
                        />
                    </PopLine>
                </>
            )}
            {whole?.max === undefined ? null : (
                <ColorLine
                    ctx={ctx}
                    name="Track"
                    label="Track color"
                    color={whole.track}
                    shown={MISSING_GRAY}
                    onPick={(track) => {
                        put({ whole: track === undefined ? { max: whole.max } : { max: whole.max, track } });
                    }}
                />
            )}
            {channel === "node.pieData" ? <EmptyLine args={args} /> : null}
        </>
    );
}

/**
 * The Keep line: All, or the Top N with N beside.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The line
 */
export function KeepLine({ args }: Readonly<{ args: GroupArgs }>): React.JSX.Element {
    const { spec, put } = args;
    const keep = typeof spec.keep === "number" ? spec.keep : undefined;
    return (
        <PopLine line="data.keep" name={keep === undefined ? "Keep" : "Keep / How many"} wide={keep !== undefined}>
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
                    width="fill"
                    label="How many"
                    kind="number"
                    value={keep}
                    min={1}
                    onChange={(next) => {
                        put({ keep: Math.max(1, Math.round(Number(next))) });
                    }}
                />
            )}
        </PopLine>
    );
}

/**
 * The Other group: its name and color (a chart's also its Keep).
 * @param props - Component props
 * @param props.args - the spec
 * @returns The lines
 */
function OtherLines({ args }: Readonly<{ args: GroupArgs }>): React.JSX.Element {
    const { ctx, channel, spec, put } = args;
    const other = (spec.other ?? {}) as { label?: string; color?: string };
    const write = (patch: { label?: string; color?: string }): void => {
        const next = pruned({ ...other, ...patch });
        put({ other: Object.keys(next).length === 0 ? undefined : next });
    };
    return (
        <>
            {channel === "node.chartData" ? <KeepLine args={args} /> : null}
            <PopLine line="data.otherName" name="Name">
                <CommitText
                    label="Other name"
                    value={other.label}
                    unset="Other"
                    onCommit={(words) => {
                        write({ label: words === "" ? undefined : words });
                    }}
                />
            </PopLine>
            <ColorLine
                ctx={ctx}
                label="Other color"
                name="Color"
                color={other.color}
                shown={OTHER_GRAY}
                onPick={(color) => {
                    write({ color });
                }}
            />
        </>
    );
}

/**
 * The No values line: what a node with no value draws, and its color beside once it draws one. A pie's is a line of
 * its Colors group; stripes', whose main pop-over has room, a line of that (a group of one line joins it).
 * @param props - Component props
 * @param props.args - the spec
 * @returns The line
 */
export function EmptyLine({ args }: Readonly<{ args: GroupArgs }>): React.JSX.Element {
    const { ctx, channel, spec, put } = args;
    const empty = word(spec.empty, "none");
    // Stripes draw a node with no value as one full band; a pie as a ring or one full slice.
    const shapes: readonly (readonly [string, string])[] =
        channel === "node.stripeData"
            ? [["band", "Unknown"]]
            : [
                  ["ring", "Ring"],
                  ["slice", "Unknown"],
              ];
    return (
        <PopLine line="data.empty" name="No values" wide={empty !== "none"} first={empty === "none" ? undefined : 156}>
            <Segments
                label="No values"
                value={empty}
                options={[["none", "None"], ...shapes]}
                onPick={(next) => {
                    put({ empty: next === "none" ? undefined : next });
                }}
            />
            {empty === "none" ? null : (
                <ColorChip
                    ctx={ctx}
                    label="No values color"
                    color={typeof spec.emptyColor === "string" ? spec.emptyColor : undefined}
                    shown={MISSING_GRAY}
                    onPick={(emptyColor) => {
                        put({ emptyColor });
                    }}
                />
            )}
        </PopLine>
    );
}

/** A chart's scale, as the spec holds it. */
interface Scale {
    share?: string;
    min?: number;
    max?: number;
    center?: number;
    clip?: readonly [number, number];
    normalize?: string;
}

/**
 * The scale with some parts changed, written whole (or taken off when nothing is left).
 * @param args - the spec.
 * @param patch - the parts.
 */
function putScale(args: GroupArgs, patch: Partial<Scale>): void {
    const next = pruned({ ...(args.spec.scale as Scale | undefined), ...patch });
    args.put({ scale: Object.keys(next).length === 0 ? undefined : next });
}

/**
 * The Clip line: the percentiles the scale is clipped at, a range slider with each end's number field beside it, so
 * each is read and typed (design "Input rules": a range is a slider with its number field beside it).
 * @param props - Component props
 * @param props.args - the spec
 * @param props.clip - the percentiles now
 * @returns The line
 */
function ClipLine({ args, clip }: Readonly<{ args: GroupArgs; clip: readonly [number, number] }>): React.JSX.Element {
    // The thumbs follow a drag before it is written.
    const [moving, setMoving] = useState<[number, number] | null>(null);
    const [low, high] = moving ?? clip;
    const write = (from: number, to: number): void => {
        putScale(args, { clip: from === 0 && to === 100 ? undefined : [from, to] });
    };
    const end = (value: string | number, at: 0 | 1): number => {
        const next = Math.round(Math.min(100, Math.max(0, Number(value))));
        return at === 0 ? Math.min(next, high - 1) : Math.max(next, low + 1);
    };
    return (
        <PopLine line="data.clip" name="Clip">
            <Group gap={4} wrap="nowrap">
                <RangeSlider
                    size="xs"
                    style={{ flex: 1, minWidth: 0 }}
                    min={0}
                    max={100}
                    step={1}
                    minRange={1}
                    label={null}
                    thumbFromLabel="Clip from"
                    thumbToLabel="Clip to"
                    value={[low, high]}
                    onChange={setMoving}
                    onChangeEnd={([from, to]: [number, number]) => {
                        setMoving(null);
                        write(from, to);
                    }}
                />
                <div style={{ flex: "0 0 52px", minWidth: 0 }}>
                    <PanelField
                        width="fill"
                        label="Clip from"
                        kind="number"
                        value={low}
                        onChange={(next) => {
                            write(end(next, 0), high);
                        }}
                    />
                </div>
                <div style={{ flex: "0 0 52px", minWidth: 0 }}>
                    <PanelField
                        width="fill"
                        label="Clip to"
                        kind="number"
                        value={high}
                        onChange={(next) => {
                            write(low, end(next, 1));
                        }}
                    />
                </div>
            </Group>
        </PopLine>
    );
}

/**
 * The Scale group: what the shared scale spans (or the set range), its center, how values are normalized and the
 * percentiles it is clipped at.
 * @param props - Component props
 * @param props.args - the spec
 * @returns The lines
 */
function ScaleLines({ args }: Readonly<{ args: GroupArgs }>): React.JSX.Element {
    const horizontal = lineFor("node", "node.chartHorizontal");
    const scale = (args.spec.scale ?? {}) as Scale;
    const fixed = scale.min !== undefined && scale.max !== undefined;
    const clip = scale.clip ?? [0, 100];
    return (
        <>
            {fixed ? (
                <PopLine line="data.range" name="Min / Max" wide>
                    <PanelField
                        width="fill"
                        label="Min"
                        kind="number"
                        value={scale.min ?? 0}
                        onChange={(next) => {
                            putScale(args, { min: Number(next) });
                        }}
                    />
                    <PanelField
                        width="fill"
                        label="Max"
                        kind="number"
                        value={scale.max ?? 1}
                        onChange={(next) => {
                            putScale(args, { max: Number(next) });
                        }}
                    />
                </PopLine>
            ) : null}
            {!fixed && scale.share !== "node" ? (
                <PopLine line="data.share" name="Shared over">
                    <Segments
                        label="Shared over"
                        value={scale.share ?? "layer"}
                        options={[
                            ["layer", "Layer"],
                            ["graph", "Graph"],
                        ]}
                        onPick={(next) => {
                            putScale(args, { share: next === "layer" ? undefined : next });
                        }}
                    />
                </PopLine>
            ) : null}
            <PopLine line="data.center" name="Center">
                <WordNumber
                    label="Center"
                    value={scale.center}
                    unset="Auto"
                    onWrite={(center) => {
                        putScale(args, { center });
                    }}
                />
            </PopLine>
            <PopLine line="data.normalize" name="Normalize">
                <Segments
                    label="Normalize"
                    value={scale.normalize ?? "raw"}
                    options={[
                        ["raw", "Raw"],
                        ["share", "Share"],
                        ["rank", "Rank"],
                    ]}
                    onPick={(next) => {
                        putScale(args, { normalize: next === "raw" ? undefined : next });
                    }}
                />
            </PopLine>
            <ClipLine args={args} clip={clip} />
            {horizontal === undefined ? null : <RubricLine ctx={args.ctx} line={horizontal.line} />}
        </>
    );
}

/**
 * Whether the spec sets any of its options.
 * @param spec - the spec.
 * @param keys - the options.
 * @returns whether one is set.
 */
function holds(spec: Spec, keys: readonly string[]): boolean {
    return keys.some((key) => spec[key] !== undefined);
}

/**
 * The spec with options taken off.
 * @param keys - the options.
 * @returns the unset.
 */
function without(keys: readonly string[]): (args: GroupArgs) => void {
    return (args) => {
        args.put(Object.fromEntries(keys.map((key) => [key, undefined])));
    };
}

/** The options the Colors group writes. */
const COLOR_KEYS = ["palette", "colors", "categories"];

/** The Colors group. */
const COLORS: DataGroup = {
    name: "Colors",
    heading: "Data",
    lines: (args) => <ColorsLines args={args} />,
    set: (args) => holds(args.spec, COLOR_KEYS),
    unset: without(COLOR_KEYS),
};

/**
 * The look groups of a thing's rubric, drawn as its fixed pop-over draws them.
 * @param ctx - the row.
 * @param thing - the thing.
 * @param main - its main channel.
 * @param drop - channels a data spec writes, left out of their group.
 * @returns the groups.
 */
function lookGroups(ctx: RowContext, thing: string, main: Channel, drop: readonly Channel[]): DataGroup[] {
    const groups: readonly SubGroup[] = rubricOf("node", thing, main)?.groups ?? [];
    return groups.flatMap((group): DataGroup[] => {
        const lines = group.lines.filter((line) => !drop.includes(line.channel));
        const channels = lines.flatMap((line) => lineChannels(line));
        return lines.length === 0
            ? []
            : [
                  {
                      name: group.name,
                      heading: "Look",
                      lines: () => lines.map((line) => <RubricLine key={line.channel} ctx={ctx} line={line} />),
                      set: () => channels.some((channel) => setOn(ctx, channel)),
                      unset: () => {
                          unsetIn(ctx, channels).catch(() => undefined);
                      },
                  },
              ];
    });
}

/**
 * The groups of a data pop-over, by channel.
 * @param ctx - the row.
 * @param channel - the data channel.
 * @returns the groups.
 */
function groupsOf(ctx: RowContext, channel: DataChannel): DataGroup[] {
    if (channel === "node.pieData" || channel === "node.stripeData") {
        const stripes = channel === "node.stripeData";
        return [
            stripes
                ? COLORS
                : {
                      ...COLORS,
                      set: (args) => holds(args.spec, [...COLOR_KEYS, "empty", "emptyColor"]),
                      unset: without([...COLOR_KEYS, "empty", "emptyColor"]),
                  },
            {
                name: "Other",
                heading: "Data",
                lines: (args) => <OtherLines args={args} />,
                set: (args) => holds(args.spec, ["other"]),
                unset: without(["other"]),
                when: (args) => typeof args.spec.keep === "number",
            },
            ...(stripes
                ? lookGroups(ctx, "stripes", "node.stripeColors", ["node.stripeDirection"])
                : lookGroups(ctx, "pie", "node.pieColors", [])),
        ];
    }
    if (channel === "node.chartData") {
        return [
            {
                name: "Scale",
                heading: "Data",
                lines: (args) => <ScaleLines args={args} />,
                set: (args) => {
                    const { share: _share, ...rest } = (args.spec.scale ?? {}) as Scale;
                    return Object.keys(rest).length > 0 || setOn(args.ctx, "node.chartHorizontal");
                },
                unset: (args) => {
                    const share = (args.spec.scale as Scale | undefined)?.share;
                    args.put({ scale: share === undefined ? undefined : { share } });
                },
            },
            {
                name: "Other",
                heading: "Data",
                lines: (args) => <OtherLines args={args} />,
                set: (args) => holds(args.spec, ["keep", "other"]),
                unset: without(["keep", "other"]),
            },
            {
                ...COLORS,
                // The chart's palette is in its data pop-over: Colors holds the categories, when any is listed.
                set: (args) => holds(args.spec, ["categories"]),
                unset: without(["categories"]),
                when: (args) => listedCategories(args.spec, args.facts).length > 0,
            },
            // The scale writes a chart's range from data, so Axis would hold Horizontal alone: it joins Scale.
            ...lookGroups(ctx, "chart", "node.chartKind", ["node.chartMin", "node.chartHorizontal"]),
        ];
    }
    return [];
}

/**
 * The data pop-over's "...": its groups, each beside it.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the data channel
 * @param props.spec - the spec
 * @param props.facts - the sample's facts, for the categories
 * @param props.put - writes options of the spec
 * @returns The groups' menu and pop-overs
 */
export function DataGroups({
    ctx,
    channel,
    spec,
    facts,
    put,
}: Readonly<{
    ctx: RowContext;
    channel: DataChannel;
    spec: Spec;
    facts: DataFacts | undefined;
    put: (patch: Readonly<Record<string, unknown>>) => void;
}>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const args: GroupArgs = { ctx, channel, spec, facts, put };
    const groups = groupsOf(ctx, channel).filter((group) => group.when?.(args) ?? true);
    return (
        <GroupMenu
            groups={groups}
            isSet={(group) => group.set(args)}
            onUnset={(group) => {
                try {
                    group.unset(args);
                } catch (error) {
                    failed(store, group.name)(error);
                }
            }}
            linesOf={(group) => group.lines(args)}
        />
    );
}
