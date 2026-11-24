/**
 * A thing's settings pop-over in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.6 and "Input rules"):
 * its first row (a tab strip or a Kind line, and Combine), its main lines, always shown, and the "..." in its header
 * listing its groups of settings, each opening its own pop-over beside it (`GroupMenu`). The pop-over opens scrolled
 * to its first set line. `PopoverShell` is that frame, shared by every thing's pop-over (a label's too).
 */

import { type ChannelDescriptor, combineDrawn } from "@graphty/graphty-element/catalog";
import React, { useEffect, useRef } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { Field, type RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";
import { channelWord, COMBINE_OPTIONS, combineOf, failureWords } from "../words";
import { dimOf, ruledOut } from "./drawn";
import { GroupMenu, type MenuGroup } from "./GroupMenu";
import { groupSet, unsetIn } from "./lineWrites";
import { lineChannels, type LineSpec, rubricChannels, type SubGroup, type ThingRubric } from "./rubric";
import { LineFrame, RubricLine, SegmentsLine } from "./RubricLine";
import { setOn } from "./things";

/** Props for PopoverShell. */
interface PopoverShellProps<G extends MenuGroup> {
    readonly ctx: RowContext;
    /** The thing's groups of settings, in "..." menu order. */
    readonly groups: readonly G[];
    /** Whether the layer sets a line of a group: its mark in the menu. */
    readonly isSet: (group: G) => boolean;
    /** Takes every line of a group off the layer. */
    readonly onUnset: (group: G) => void;
    /** The main lines. */
    readonly main: React.ReactNode;
    /** Set lines of the thing no line names, drawn as today's fields after the main lines. */
    readonly others: readonly ChannelDescriptor[];
    /** A group's lines. */
    readonly linesOf: (group: G) => React.ReactNode;
    /** The first row: a tab strip or Kind line, and Combine. */
    readonly first?: React.ReactNode;
    /** More lines after the main lines (a replace shader's parameters). */
    readonly extra?: React.ReactNode;
    /** A list always shown after the main lines (a list thing's list, R15). */
    readonly after?: React.ReactNode;
}

/**
 * A pop-over's frame: see the file header.
 * @param props - Component props
 * @param props.ctx - see PopoverShellProps
 * @param props.groups - see PopoverShellProps
 * @param props.isSet - see PopoverShellProps
 * @param props.onUnset - see PopoverShellProps
 * @param props.main - see PopoverShellProps
 * @param props.others - see PopoverShellProps
 * @param props.linesOf - see PopoverShellProps
 * @param props.first - see PopoverShellProps
 * @param props.extra - see PopoverShellProps
 * @param props.after - see PopoverShellProps
 * @returns The contents
 */
export function PopoverShell<G extends MenuGroup>({
    ctx,
    groups,
    isSet,
    onUnset,
    main,
    others,
    linesOf,
    first,
    extra,
    after,
}: PopoverShellProps<G>): React.JSX.Element {
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        box.current?.querySelector("[data-set]")?.scrollIntoView({ block: "nearest" });
    }, []);
    return (
        <div ref={box} data-thing-popover="">
            {first}
            {main}
            {others.map((descriptor) => (
                <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />
            ))}
            {extra}
            {after}
            <GroupMenu groups={groups} isSet={isSet} onUnset={onUnset} linesOf={linesOf} />
        </div>
    );
}

/**
 * The pop-over's contents: see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.rubric - the thing's rubric
 * @param props.others - set lines of the thing its rubric has no line for, drawn as today's fields
 * @param props.first - lines above Main: Combine
 * @param props.extra - more lines at the end of Main
 * @param props.after - a sub-group always shown after Main (a list thing's list)
 * @param props.head - the row's main value's line, Main's first
 * @returns The contents
 */
export function ThingPopover({
    ctx,
    rubric,
    others,
    first,
    extra,
    after,
    head,
}: Readonly<{
    ctx: RowContext;
    rubric: ThingRubric;
    others: readonly ChannelDescriptor[];
    first?: React.ReactNode;
    extra?: React.ReactNode;
    after?: React.ReactNode;
    head?: LineSpec;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    // Main starts with the row's main value, which binds from its by-data link like every line (design 2.6).
    const lines = [...(rubric.common ?? []), ...rubric.main];
    // The tab strip shows the row's main value when it is the same channel (a route): no line of its own then.
    const mainLines =
        head === undefined ||
        head.channel === rubric.strip?.channel ||
        lines.some((line) => line.channel === head.channel)
            ? lines
            : [head, ...lines];
    // A line another setting of the row rules out appears once it applies (design "Input rules", "Tabs").
    const own = [...rubricChannels(rubric), ...(head === undefined ? [] : [head.channel])];
    const shown = (line: LineSpec): boolean =>
        !ruledOut(
            ctx,
            line.channel,
            // A condition on the line's own other value (a pair's second number) never hides it.
            own.filter((channel) => !lineChannels(line).includes(channel)),
        ) || lineChannels(line).some((channel) => setOn(ctx, channel));
    const groups = rubric.groups ?? [];
    const onUnset = (group: SubGroup): void => {
        unsetIn(
            ctx,
            group.lines.flatMap((line) => lineChannels(line)),
        ).catch((error: unknown) => {
            store.set({ notice: { message: failureWords(group.name, "removed", error), error: true } });
        });
    };
    const linesOf = (group: SubGroup): React.ReactNode =>
        group.lines
            .filter((line) => shown(line))
            .map((line) => <RubricLine key={`${group.name}-${line.channel}`} ctx={ctx} line={line} />);
    return (
        <PopoverShell
            ctx={ctx}
            first={
                <>
                    {first}
                    {rubric.strip === undefined ? null : (
                        <div data-strip="">
                            <RubricLine ctx={ctx} line={rubric.strip} />
                        </div>
                    )}
                </>
            }
            extra={extra}
            after={after}
            groups={groups}
            isSet={(group) => groupSet(ctx, group)}
            onUnset={onUnset}
            // The row's common lines lead the main lines: under the row only once set, here always (design 2.5).
            main={mainLines
                .filter((line) => shown(line))
                .map((line) => (
                    <RubricLine key={`main-${line.channel}-${line.name ?? ""}`} ctx={ctx} line={line} />
                ))}
            others={others}
            linesOf={linesOf}
        />
    );
}

/**
 * What the layers beneath a row paint for a number channel, as `combineDrawn` reads it.
 * @param ctx - the row.
 * @param channel - the channel.
 * @returns one number, "mixed", or undefined where they paint nothing.
 */
function beneathNumber(ctx: RowContext, channel: ChannelDescriptor["channel"]): number | "mixed" | undefined {
    const beneath = ctx.beneath(channel);
    if (beneath.mixed === true) {
        return "mixed";
    }
    return typeof beneath.value === "number" ? beneath.value : undefined;
}

/**
 * A pop-over's line above Main (design 2.6): Combine, on a number the layer sets combined with what lies
 * beneath. A plain number gets none: what a number does with the value underneath is chosen where it is linked
 * to data, in the link dialog (owner, 2026-11-23); this line only keeps a combine a file or an earlier version
 * wrote changeable. There is no By data line: the main value binds from its own line's by-data link, Main's
 * first.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.main - the row's main value
 * @returns The line
 */
export function FirstLines({ ctx, main }: Readonly<{ ctx: RowContext; main: ChannelDescriptor }>): React.JSX.Element {
    const { store } = useWorkspace();
    const own = lineIn(ctx, main.channel);
    const number =
        main.accepts === "number" && typeof own?.value === "number" && own.combine !== undefined
            ? own.value
            : undefined;
    return (
        <>
            {number === undefined ? null : (
                <LineFrame
                    line={`combine:${main.channel}`}
                    name="Combine"
                    set={own?.combine !== undefined}
                    rule="R8f"
                    control={
                        <SegmentsLine
                            label="Combine"
                            // A mode that paints what Replace does here (Multiply over a size of 1) is dimmed.
                            options={COMBINE_OPTIONS.map((option) => {
                                const found = combineDrawn(
                                    main.channel,
                                    option.value,
                                    beneathNumber(ctx, main.channel),
                                );
                                return found.drawn
                                    ? option
                                    : {
                                          ...option,
                                          dimmed: `Same as Set over a ${channelWord(main.channel).toLowerCase()} of ${String(found.unmet.base)}`,
                                      };
                            })}
                            value={own?.combine ?? "replace"}
                            onPick={(mode) => {
                                const combine = combineOf(mode);
                                writeIn(ctx, main.channel, { value: number, combine }).catch((error: unknown) => {
                                    store.set({
                                        notice: { message: failureWords("Combine", "changed", error), error: true },
                                    });
                                });
                            }}
                        />
                    }
                    modifier={null}
                    removeName={undefined}
                    onRemove={() => undefined}
                    // Combine meets the main value, so it draws nothing wherever that value does not (a 2D-only
                    // raised edge's in 3D).
                    dimmed={dimOf(ctx, main.channel)}
                />
            )}
        </>
    );
}
