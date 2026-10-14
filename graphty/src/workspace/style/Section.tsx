import { ControlSection } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import { ActionIcon, Menu, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { Field, type RowContext } from "./PropertyRow";
import { lineIn, partlySet, startFor, writeIn } from "./row";
import { focusLineNext } from "./useFocusLine";
import { channelWord, fieldName, type SectionSpec } from "./words";

/**
 * Whether the row sets a property: a line of its own (not the element's locked base), or, for
 * several rows, a line some of them write.
 * @param ctx - the row.
 * @param descriptor - the property.
 * @returns true when the section lists it.
 */
function isSet(ctx: RowContext, descriptor: ChannelDescriptor): boolean {
    const line = lineIn(ctx, descriptor.channel);
    return (line !== undefined && !line.layer.locked) || partlySet(ctx, descriptor.channel) !== undefined;
}

/**
 * One section of the Style tab (the owner's design, 2026-10-13, after Figma's sections): its title
 * and a "+" at the header's right end. A section the layer does not write is only its dimmed title
 * and "+". One it writes lists only the properties the layer sets, each with its value and a
 * minus. "+" opens a menu of the section's properties not set yet; picking one adds it with a
 * starting value (what the layers beneath paint when they paint one plain value, else
 * graphty-element's starting value), says so, and puts focus in it.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.spec - the section
 * @returns The section
 */
export function Section({ ctx, spec }: Readonly<{ ctx: RowContext; spec: SectionSpec }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const descriptors = spec.channels.flatMap(
        (channel) => channelsFor(ctx.side).find((d) => d.channel === channel && d.renderable) ?? [],
    );
    if (descriptors.length === 0) {
        return null;
    }
    const set = descriptors.filter((d) => isSet(ctx, d));
    const unset = descriptors.filter((d) => !set.includes(d));
    const add = (descriptor: ChannelDescriptor): void => {
        focusLineNext(descriptor.channel);
        writeIn(ctx, descriptor.channel, { value: startFor(ctx, descriptor) })
            .then(() => {
                store.set({ announcement: `${fieldName(descriptor.channel)} added` });
            })
            .catch(() => {
                focusLineNext(null);
                store.set({ notice: { message: `${channelWord(descriptor.channel)} could not be added` } });
            });
    };
    return (
        <div
            role="group"
            aria-label={`${ctx.side === "node" ? "Node" : "Edge"} ${spec.title.toLowerCase()}`}
            data-section={`${ctx.side}-${spec.id}`}
            className="ws-section"
        >
            <ControlSection
                label={spec.title}
                empty={set.length === 0}
                collapsible={false}
                actions={
                    <AddButton
                        kind={ctx.side}
                        title={spec.title}
                        options={unset.map((d) => ({ key: d.channel, label: channelWord(d.channel) }))}
                        onAdd={(key) => {
                            const descriptor = unset.find((d) => d.channel === key);
                            if (descriptor !== undefined) {
                                add(descriptor);
                            }
                        }}
                    />
                }
            >
                {set.map((d) => (
                    <Field key={d.channel} ctx={ctx} descriptor={d} />
                ))}
            </ControlSection>
        </div>
    );
}

/** One thing a section's "+" can add: its key and its name in the menu. */
export interface AddOption {
    readonly key: string;
    readonly label: string;
}

/**
 * A section's "+", named for the kind and the section ("Add to node shape"), so a layer on nodes
 * and edges never has two controls with one name: a menu of what it can still add. With nothing
 * left it stays in place, disabled, saying so.
 * @param props - Component props
 * @param props.kind - nodes or edges
 * @param props.title - the section's title
 * @param props.options - what it can add, in menu order
 * @param props.onAdd - adds one, by its key
 * @returns The button and its menu
 */
export function AddButton({
    kind,
    title,
    options,
    onAdd,
}: Readonly<{
    kind: "node" | "edge";
    title: string;
    options: readonly AddOption[];
    onAdd: (key: string) => void;
}>): React.JSX.Element {
    const name = `Add to ${kind} ${title.toLowerCase()}`;
    const full = options.length === 0;
    const button = (
        <ActionIcon
            variant="subtle"
            size="sm"
            className="cm-section-add"
            aria-label={name}
            aria-disabled={full ? true : undefined}
            data-disabled={full ? true : undefined}
            data-plus
        >
            <GLYPHS.add size={14} aria-hidden />
        </ActionIcon>
    );
    if (full) {
        return <Tooltip label={`Everything in ${kind} ${title.toLowerCase()} is set`}>{button}</Tooltip>;
    }
    return (
        <Menu position="bottom-end">
            <Menu.Target>
                <Tooltip label={name}>{button}</Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
                {options.map((option) => (
                    <Menu.Item
                        key={option.key}
                        onClick={() => {
                            onAdd(option.key);
                        }}
                    >
                        {option.label}
                    </Menu.Item>
                ))}
            </Menu.Dropdown>
        </Menu>
    );
}
