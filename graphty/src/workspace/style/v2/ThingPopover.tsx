/**
 * A thing's settings pop-over in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.6):
 * its Main sub-group, always shown, then each other sub-group the layer sets or the reader added
 * from the "+" on Main's legend, each under a legend whose minus unsets every line in it. The
 * pop-over opens scrolled to its first set line. `PopoverShell` is that frame, shared by every
 * thing's pop-over (a label's too).
 */

import { ControlGroup } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import React, { useEffect, useRef, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { Field, type RowContext } from "../PropertyRow";
import { AddButton } from "../Section";
import { failureWords } from "../words";
import { groupSet, unsetIn } from "./lineWrites";
import { lineChannels, type ThingRubric } from "./rubric";
import { RemoveButton, RubricLine } from "./RubricLine";

/** Props for PopoverShell. */
interface PopoverShellProps<G extends { readonly name: string }> {
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
 * @returns The contents
 */
export function PopoverShell<G extends { readonly name: string }>({
    ctx,
    title,
    groups,
    isSet,
    onAdd,
    onUnset,
    main,
    others,
    linesOf,
}: PopoverShellProps<G>): React.JSX.Element {
    const [added, setAdded] = useState<readonly string[]>([]);
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        box.current?.querySelector("[data-set]")?.scrollIntoView({ block: "nearest" });
    }, []);
    const shown = groups.filter((group) => added.includes(group.name) || isSet(group));
    const addable = groups.filter((group) => !shown.includes(group));
    const plus =
        addable.length === 0 ? undefined : (
            <AddButton
                kind={ctx.side}
                title={`${title.replace(/^(Node|Edge) /, "")} settings`}
                groups={[addable.map((group) => ({ key: group.name, label: group.name }))]}
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
            <ControlGroup label="Main" actions={plus}>
                {main}
                {others.map((descriptor) => (
                    <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />
                ))}
            </ControlGroup>
            {shown.map((group) => (
                <ControlGroup
                    key={group.name}
                    label={group.name}
                    actions={
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
                </ControlGroup>
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
 * @returns The contents
 */
export function ThingPopover({
    ctx,
    title,
    rubric,
    others,
}: Readonly<{
    ctx: RowContext;
    title: string;
    rubric: ThingRubric;
    others: readonly ChannelDescriptor[];
}>): React.JSX.Element {
    const { store } = useWorkspace();
    return (
        <PopoverShell
            ctx={ctx}
            title={title}
            groups={rubric.groups ?? []}
            isSet={(group) => groupSet(ctx, group)}
            onUnset={(group) => {
                unsetIn(
                    ctx,
                    group.lines.flatMap((line) => lineChannels(line)),
                ).catch((error: unknown) => {
                    store.set({ notice: { message: failureWords(group.name, "removed", error), error: true } });
                });
            }}
            main={rubric.main.map((line) => (
                <RubricLine key={`main-${line.channel}-${line.name ?? ""}`} ctx={ctx} line={line} />
            ))}
            others={others}
            linesOf={(group) =>
                group.lines.map((line) => <RubricLine key={`${group.name}-${line.channel}`} ctx={ctx} line={line} />)
            }
        />
    );
}
