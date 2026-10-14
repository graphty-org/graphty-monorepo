import { ControlSection } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { arrowheadNote } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import { Field, type RowContext } from "./PropertyRow";
import { lineIn, partlySet, startFor, writeIn } from "./row";
import { focusLineNext } from "./useFocusLine";
import { channelWord, failureWords, fieldName, type SectionSpec } from "./words";

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
 * What a section's "+" offers for a property. Visibility offers its two writes as two items, Hide
 * and Show, and Show is always offered, so a layer can be written before the layer it overrides.
 * @param descriptor - the property.
 * @returns the menu items, keyed `<channel>` or `<channel>=<value>`.
 */
function optionsFor(descriptor: ChannelDescriptor): AddOption[] {
    if (descriptor.channel === "node.visible" || descriptor.channel === "edge.visible") {
        return [
            { key: `${descriptor.channel}=false`, label: "Hide" },
            { key: `${descriptor.channel}=true`, label: "Show elements a layer beneath hides" },
        ];
    }
    return [{ key: descriptor.channel, label: channelWord(descriptor.channel) }];
}

/**
 * A section's one help line, or null: on edges, Arrowheads says what arrowheads follow on a graph
 * that is not directed; on nodes, Effects with an outline says where its width is set.
 * @param ctx - the row and kind.
 * @param spec - the section.
 * @param set - the properties the row sets in it.
 * @returns the words, or null.
 */
function sectionNote(ctx: RowContext, spec: SectionSpec, set: readonly ChannelDescriptor[]): string | null {
    if (ctx.side === "edge" && spec.id === "ends") {
        return arrowheadNote(ctx.session.data.statistics().directedness);
    }
    if (ctx.side === "node" && spec.id === "effects" && set.some((d) => d.channel === "node.outline")) {
        return "Every outline is drawn at one width, set in Graph settings. For a ring this layer sizes, use Halo.";
    }
    return null;
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
    const note = sectionNote(ctx, spec, set);
    const unset = descriptors.filter((d) => !set.includes(d));
    const add = (descriptor: ChannelDescriptor, value = startFor(ctx, descriptor)): void => {
        focusLineNext(descriptor.channel);
        writeIn(ctx, descriptor.channel, { value })
            .then(() => {
                store.set({ announcement: `${fieldName(descriptor.channel)} added` });
            })
            .catch((error: unknown) => {
                focusLineNext(null);
                store.set({
                    notice: { message: failureWords(channelWord(descriptor.channel), "added", error), error: true },
                });
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
                        options={unset.flatMap(optionsFor)}
                        onAdd={(key) => {
                            const [channel, pick] = key.split("=");
                            const descriptor = unset.find((d) => d.channel === channel);
                            if (descriptor !== undefined) {
                                add(descriptor, ...(pick === undefined ? [] : [pick === "true"]));
                            }
                        }}
                    />
                }
            >
                {set.map((d) => (
                    <Field key={d.channel} ctx={ctx} descriptor={d} />
                ))}
            </ControlSection>
            {/* Outside the section's body, so it shows while the section sets nothing yet. */}
            {note !== null && (
                <Text size="xs" c="dimmed" px={16} pb={4} data-testid={`${ctx.side}-${spec.id}-note`}>
                    {note}
                </Text>
            )}
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
