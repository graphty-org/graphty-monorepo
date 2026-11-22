/**
 * A thing's settings pop-over in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.6):
 * its Main sub-group, always shown, then each other sub-group the layer sets or the reader added
 * from the "+" on Main's legend, each under a legend whose minus unsets every line in it. The
 * pop-over opens scrolled to its first set line. `PopoverShell` is that frame, shared by every
 * thing's pop-over (a label's too).
 */

import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { Field, type RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";
import { AddButton } from "../Section";
import { COMBINE_WORDS, failureWords } from "../words";
import { dimOf } from "./drawn";
import { groupSet, unsetIn } from "./lineWrites";
import { PlusList } from "./PlusList";
import { lineChannels, type LineSpec, type ThingRubric } from "./rubric";
import { LineFrame, RemoveButton, RubricLine, SegmentsLine } from "./RubricLine";

/** Combine's options, in today's words. */
const COMBINE_OPTIONS = Object.entries(COMBINE_WORDS).map(([value, { word }]) => ({ value, name: word }));

/** A sub-group "+" can add: its name, and whether a divider follows it in the menu (a rarer tier next). */
interface ShellGroup {
    readonly name: string;
    readonly divider?: true;
}

/** Props for PopoverShell. */
interface PopoverShellProps<G extends ShellGroup> {
    readonly ctx: RowContext;
    /** The thing's name with its kind ("Node border"). */
    readonly title: string;
    /** Every sub-group "+" can add, in its menu's order. */
    readonly groups: readonly G[];
    /** Whether the layer sets a line of a sub-group, so it shows without being added. */
    readonly isSet: (group: G) => boolean;
    /** Called when "+" adds a sub-group. */
    readonly onAdd?: (group: G) => void;
    /** Takes every line of a sub-group off the layer. */
    readonly onUnset: (group: G) => void;
    /** Main's lines. */
    readonly main: React.ReactNode;
    /** Set lines of the thing no line names, drawn as today's fields at the end of Main. */
    readonly others: readonly ChannelDescriptor[];
    /** A sub-group's lines. */
    readonly linesOf: (group: G) => React.ReactNode;
    /** Lines above Main (design 2.6): Combine. */
    readonly first?: React.ReactNode;
    /** More lines at the end of Main (a replace shader's parameters). */
    readonly extra?: React.ReactNode;
    /** A sub-group always shown after Main (a list thing's list, R15). */
    readonly after?: React.ReactNode;
    /** Why a sub-group draws nothing in this view, for its dimmed "+" item (every line of it a 3D-only one). */
    readonly dimmedOf?: (group: G) => string | undefined;
}

/**
 * A pop-over's frame: see the file header.
 * @param props - Component props
 * @param props.ctx - see PopoverShellProps
 * @param props.title - see PopoverShellProps
 * @param props.groups - see PopoverShellProps
 * @param props.isSet - see PopoverShellProps
 * @param props.onAdd - see PopoverShellProps
 * @param props.onUnset - see PopoverShellProps
 * @param props.main - see PopoverShellProps
 * @param props.others - see PopoverShellProps
 * @param props.linesOf - see PopoverShellProps
 * @param props.first - see PopoverShellProps
 * @param props.extra - see PopoverShellProps
 * @param props.after - see PopoverShellProps
 * @param props.dimmedOf - see PopoverShellProps
 * @returns The contents
 */
export function PopoverShell<G extends ShellGroup>({
    ctx,
    title,
    groups,
    isSet,
    onAdd,
    onUnset,
    main,
    others,
    linesOf,
    first,
    extra,
    after,
    dimmedOf,
}: PopoverShellProps<G>): React.JSX.Element {
    const [added, setAdded] = useState<readonly string[]>([]);
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        box.current?.querySelector("[data-set]")?.scrollIntoView({ block: "nearest" });
    }, []);
    const shown = groups.filter((group) => added.includes(group.name) || isSet(group));
    const mainEmpty =
        Array.isArray(main) && main.length === 0 && others.length === 0 && (extra === undefined || extra === null);
    const addable = groups.filter((group) => !shown.includes(group));
    const plus =
        addable.length === 0 ? undefined : (
            <AddButton
                kind={ctx.side}
                title={`${title.replace(/^(Node|Edge) /, "")} settings`}
                groups={groups
                    .reduce<G[][]>(
                        (tiers, group) => {
                            tiers.at(-1)?.push(group);
                            return group.divider === true ? [...tiers, []] : tiers;
                        },
                        [[]],
                    )
                    .map((tier) =>
                        tier
                            .filter((group) => addable.includes(group))
                            .map((group) => ({ key: group.name, label: group.name, dimmed: dimmedOf?.(group) })),
                    )}
                alwaysMenu
                onAdd={(name) => {
                    setAdded((now) => [...now, name]);
                    const group = groups.find((each) => each.name === name);
                    if (group !== undefined) {
                        onAdd?.(group);
                    }
                }}
            />
        );
    return (
        <div ref={box} data-thing-popover="">
            {first}
            {/* An empty Main with nothing to add draws no legend (Solid fill). */}
            {mainEmpty && plus === undefined ? null : (
                <PlusList level="group" title="Main" add={plus}>
                    {main}
                    {others.map((descriptor) => (
                        <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />
                    ))}
                    {extra}
                </PlusList>
            )}
            {after}
            {shown.map((group) => (
                <PlusList
                    key={group.name}
                    level="group"
                    title={group.name}
                    add={undefined}
                    remove={
                        <RemoveButton
                            label={`Remove ${group.name.toLowerCase()}`}
                            onClick={() => {
                                setAdded((now) => now.filter((each) => each !== group.name));
                                onUnset(group);
                            }}
                        />
                    }
                >
                    {linesOf(group)}
                </PlusList>
            ))}
        </div>
    );
}

/**
 * The pop-over's contents: see the file header.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.title - the thing's name with its kind ("Node border")
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
    title,
    rubric,
    others,
    first,
    extra,
    after,
    head,
}: Readonly<{
    ctx: RowContext;
    title: string;
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
    const mainLines =
        head === undefined || lines.some((line) => line.channel === head.channel) ? lines : [head, ...lines];
    return (
        <PopoverShell
            ctx={ctx}
            title={title}
            first={first}
            extra={extra}
            after={after}
            groups={rubric.groups ?? []}
            isSet={(group) => groupSet(ctx, group)}
            dimmedOf={(group) => {
                const why = group.lines.map((line) => dimOf(ctx, line.channel));
                return why.every((each) => each !== undefined) ? why[0] : undefined;
            }}
            onUnset={(group) => {
                unsetIn(
                    ctx,
                    group.lines.flatMap((line) => lineChannels(line)),
                ).catch((error: unknown) => {
                    store.set({ notice: { message: failureWords(group.name, "removed", error), error: true } });
                });
            }}
            // The row's common lines lead Main: under the row only once set, here always (design 2.5).
            main={mainLines.map((line) => (
                <RubricLine key={`main-${line.channel}-${line.name ?? ""}`} ctx={ctx} line={line} />
            ))}
            others={others}
            linesOf={(group) =>
                group.lines.map((line) => <RubricLine key={`${group.name}-${line.channel}`} ctx={ctx} line={line} />)
            }
        />
    );
}

/**
 * A pop-over's line above Main (design 2.6): Combine, on a number the layer sets. There is no By data line:
 * the main value binds from its own line's by-data link, Main's first.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.main - the row's main value
 * @returns The line
 */
export function FirstLines({ ctx, main }: Readonly<{ ctx: RowContext; main: ChannelDescriptor }>): React.JSX.Element {
    const { store } = useWorkspace();
    const own = lineIn(ctx, main.channel);
    const number = main.accepts === "number" && typeof own?.value === "number" ? own.value : undefined;
    return (
        <>
            {number === undefined ? null : (
                <LineFrame
                    line={`combine:${main.channel}`}
                    name={null}
                    set={own?.combine !== undefined}
                    rule="R8f"
                    control={
                        <SegmentsLine
                            label="Combine"
                            options={COMBINE_OPTIONS}
                            value={own?.combine ?? "replace"}
                            onPick={(mode) => {
                                const combine = mode === "multiply" || mode === "add" ? mode : undefined;
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
                />
            )}
        </>
    );
}
