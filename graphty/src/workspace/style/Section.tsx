import { ControlSection } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor } from "@graphty/graphty-element/catalog";
import { ActionIcon, Menu, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace } from "../state/WorkspaceContext";
import { DEFAULT_NAME_KEY } from "./cards";
import { Field, type RowContext } from "./PropertyRow";
import { carriedOpacity, lineIn, partlySet, startingAdds, writeIn } from "./row";
import { focusLineNext } from "./useFocusLine";
import { channelWord, failureWords, fieldName, OPACITY_OF, type SectionSpec } from "./words";

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

/** Why an undirected graph's Arrowheads add nothing: its edges have no direction to point. */
const NO_ARROWHEADS = "Not available: undirected graph";

/**
 * Why a section's "+" adds nothing on this graph, or null: Arrowheads on an undirected graph.
 * @param ctx - the row and kind.
 * @param spec - the section.
 * @returns the words, or null.
 */
function notAvailable(ctx: RowContext, spec: SectionSpec): string | null {
    return ctx.side === "edge" && spec.id === "ends" && ctx.session.data.statistics().directedness === "undirected"
        ? NO_ARROWHEADS
        : null;
}

/**
 * A section's one help line, or null: on edges, Arrowheads says they are not available on an
 * undirected graph; on nodes, Effects with an outline says where its width is set.
 * @param ctx - the row and kind.
 * @param spec - the section.
 * @param set - the properties the row sets in it.
 * @returns the words, or null.
 */
function sectionNote(ctx: RowContext, spec: SectionSpec, set: readonly ChannelDescriptor[]): string | null {
    const blocked = notAvailable(ctx, spec);
    if (blocked !== null) {
        return blocked;
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
 * minus. "+" opens a menu of the section's properties not set yet (with one left, it adds it);
 * picking one adds its line waiting for a value, showing what the row's elements draw now (else
 * graphty-element's starting value), says so, and puts focus in it. Nothing is written, so the
 * drawing and the key change only once the reader picks a value.
 * @param props - Component props
 * @param props.ctx - the row and kind
 * @param props.spec - the section
 * @returns The section
 */
export function Section({ ctx, spec }: Readonly<{ ctx: RowContext; spec: SectionSpec }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    // The properties "+" added that the row does not set yet, waiting for a value, so adding one
    // writes nothing until the reader picks one.
    const [waiting, setWaiting] = useState<readonly string[]>([]);
    const descriptors = spec.channels.flatMap(
        (channel) => channelsFor(ctx.side).find((d) => d.channel === channel && d.renderable) ?? [],
    );
    if (descriptors.length === 0) {
        return null;
    }
    const set = descriptors.filter((d) => isSet(ctx, d));
    const pending = descriptors.filter((d) => !set.includes(d) && waiting.includes(d.channel));
    const note = sectionNote(ctx, spec, set);
    // Opacity is set in the color's own box, so "+" never offers it, and a color line set to a
    // value carries it; a row that sets opacity alone, or varies it by data, keeps its own line.
    const folded = new Set(
        set.flatMap((d) => (OPACITY_OF[d.channel] === undefined ? [] : (carriedOpacity(ctx, d.channel) ?? []))),
    );
    const boxed = new Set(Object.values(OPACITY_OF));
    const unset = descriptors.filter((d) => !set.includes(d) && !pending.includes(d) && !boxed.has(d.channel));
    // A line "+" added keeps the place it was added at, below the lines set before it, once its
    // value is written too: drawn in the section's order, it would jump above them under the
    // reader's eyes.
    const added = waiting.flatMap((channel) => descriptors.find((d) => d.channel === channel) ?? []);
    const lines = [
        ...set.filter((d) => !added.includes(d)),
        ...added.filter((d) => set.includes(d) || pending.includes(d)),
    ].filter((d) => !folded.has(d.channel));
    const write = (descriptor: ChannelDescriptor, value: boolean): void => {
        writeIn(ctx, descriptor.channel, { value })
            .then(() => {
                store.set({ announcement: `${fieldName(descriptor.channel)} added` });
            })
            .catch((error: unknown) => {
                focusLineNext(null);
                startingAdds.delete(ctx.session);
                store.set({
                    notice: { message: failureWords(channelWord(descriptor.channel), "added", error), error: true },
                });
            });
    };
    const add = (descriptor: ChannelDescriptor, value?: boolean): void => {
        focusLineNext(descriptor.channel);
        if (value === undefined) {
            setWaiting((now) => [...now, descriptor.channel]);
            const every = ctx.many === undefined ? "" : " for every layer";
            store.set({ announcement: `${fieldName(descriptor.channel)} added: pick a value${every}` });
            return;
        }
        // Hide or Show is the reader's pick. The first one on a selection makes its layer:
        // Escape before any other change takes it back.
        if (
            ctx.many === undefined &&
            ctx.layers.length === 0 &&
            ctx.fresh?.userData?.[DEFAULT_NAME_KEY] !== undefined
        ) {
            startingAdds.add(ctx.session);
        }
        write(descriptor, value);
    };
    return (
        // The section is the group, named by its title, a heading so a screen reader moves from
        // section to section; a wrapper group named "Node shape" read the name twice.
        <div data-section={`${ctx.side}-${spec.id}`} className="ws-section">
            <ControlSection
                label={spec.title}
                headingLevel={3}
                empty={set.length + pending.length === 0}
                collapsible={false}
                actions={
                    <AddButton
                        kind={ctx.side}
                        title={spec.title}
                        options={unset.flatMap(optionsFor)}
                        disabledReason={notAvailable(ctx, spec) ?? undefined}
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
                {lines.map((d) => (
                    <Field
                        key={d.channel}
                        ctx={ctx}
                        descriptor={d}
                        pending={pending.includes(d)}
                        onCancel={() => {
                            setWaiting((now) => now.filter((channel) => channel !== d.channel));
                        }}
                    />
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
 * and edges never has two controls with one name: a menu of what it can still add, or, with one
 * thing left, a button that adds it. With nothing
 * left it stays in place, disabled, saying so in its tooltip on hover, and is no Tab stop: a "+"
 * that adds nothing is a dead stop on a keyboard walk, and the lines it would add are already
 * there, each one a stop of its own.
 * @param props - Component props
 * @param props.kind - nodes or edges
 * @param props.title - the section's title
 * @param props.options - what it can add, in menu order
 * @param props.onAdd - adds one, by its key
 * @param props.disabledReason - why it adds nothing on this graph, which disables it as a full one is
 * @returns The button and its menu
 */
export function AddButton({
    kind,
    title,
    options,
    onAdd,
    disabledReason,
}: Readonly<{
    kind: "node" | "edge";
    title: string;
    options: readonly AddOption[];
    onAdd: (key: string) => void;
    disabledReason?: string;
}>): React.JSX.Element {
    const name = `Add to ${kind} ${title.toLowerCase()}`;
    const full = options.length === 0 || disabledReason !== undefined;
    const reason = disabledReason ?? `Everything in ${kind} ${title.toLowerCase()} is set`;
    const button = (
        <ActionIcon
            variant="subtle"
            size="sm"
            className="cm-section-add"
            aria-label={name}
            aria-disabled={full ? true : undefined}
            data-disabled={full ? true : undefined}
            aria-description={full ? reason : undefined}
            tabIndex={full ? -1 : undefined}
            data-plus
        >
            <GLYPHS.add size={14} aria-hidden />
        </ActionIcon>
    );
    if (full) {
        return <Tooltip label={reason}>{button}</Tooltip>;
    }
    const [only] = options;
    if (options.length === 1) {
        // A menu of one item is one more click for nothing: the "+" adds it. Its tooltip is its
        // name, so a reader who hovers it and one who hears it meet one name.
        return (
            <Tooltip label={name}>
                {React.cloneElement(button, {
                    onClick: () => {
                        onAdd(only.key);
                    },
                })}
            </Tooltip>
        );
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
