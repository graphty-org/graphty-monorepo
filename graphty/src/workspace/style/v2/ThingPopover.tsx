/**
 * A thing's settings pop-over in Style panel v2 (design/ui/style-panel-v2/design.md, section 2.6):
 * its Main sub-group, always shown, then each other sub-group the layer sets or the reader added
 * from the "+" on Main's legend, each under a legend whose minus unsets every line in it. The
 * pop-over opens scrolled to its first set line.
 */

import { ControlGroup } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import { ActionIcon, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import { Field, type RowContext } from "../PropertyRow";
import { AddButton } from "../Section";
import { failureWords } from "../words";
import { groupSet, unsetIn } from "./lineWrites";
import { lineChannels, type ThingRubric } from "./rubric";
import { RubricLine } from "./RubricLine";

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
    const [added, setAdded] = useState<readonly string[]>([]);
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        box.current?.querySelector("[data-set]")?.scrollIntoView({ block: "nearest" });
    }, []);
    const groups = rubric.groups ?? [];
    const shown = groups.filter((group) => added.includes(group.name) || groupSet(ctx, group));
    const addable = groups.filter((group) => !shown.includes(group));
    const plus =
        addable.length === 0 ? undefined : (
            <AddButton
                kind={ctx.side}
                title={`${title.replace(/^(Node|Edge) /, "")} settings`}
                groups={[addable.map((group) => ({ key: group.name, label: group.name }))]}
                onAdd={(name) => {
                    setAdded((now) => [...now, name]);
                }}
            />
        );
    return (
        <div ref={box} data-thing-popover="">
            <ControlGroup label="Main" actions={plus}>
                {rubric.main.map((line) => (
                    <RubricLine key={`main-${line.channel}-${line.name ?? ""}`} ctx={ctx} line={line} />
                ))}
                {others.map((descriptor) => (
                    <Field key={descriptor.channel} ctx={ctx} descriptor={descriptor} />
                ))}
            </ControlGroup>
            {shown.map((group) => {
                const removeName = `Remove ${group.name.toLowerCase()}`;
                return (
                    <ControlGroup
                        key={group.name}
                        label={group.name}
                        actions={
                            <Tooltip label={removeName}>
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    aria-label={removeName}
                                    onClick={() => {
                                        setAdded((now) => now.filter((each) => each !== group.name));
                                        unsetIn(
                                            ctx,
                                            group.lines.flatMap((line) => lineChannels(line)),
                                        ).catch((error: unknown) => {
                                            store.set({
                                                notice: {
                                                    message: failureWords(group.name, "removed", error),
                                                    error: true,
                                                },
                                            });
                                        });
                                    }}
                                >
                                    <GLYPHS.remove size={14} aria-hidden />
                                </ActionIcon>
                            </Tooltip>
                        }
                    >
                        {group.lines.map((line) => (
                            <RubricLine key={`${group.name}-${line.channel}`} ctx={ctx} line={line} />
                        ))}
                    </ControlGroup>
                );
            })}
        </div>
    );
}
