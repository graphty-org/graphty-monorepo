import { SegmentedControl } from "@graphty/compact-mantine";
import { type ChannelDescriptor, channelsFor, toColorValue } from "@graphty/graphty-element/catalog";
import type { LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { ActionIcon, Group, Indicator, Menu, Stack, Text, Tooltip, VisuallyHidden } from "@mantine/core";
import { Plus } from "lucide-react";
import React, { useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { LabelSection } from "./LabelSection";
import { everythingRow, lineOf, rowLayers, startingValue, type Target, writeLine } from "./row";
import { SetLine } from "./SetLine";
import { useStyleVersion } from "./useStyleVersion";
import { channelWord, isLineChannel, SECTIONS, type StyleSection } from "./words";

/** Props for StyleTab. */
interface StyleTabProps {
    /**
     * The row's style layers (one per side it paints). Left out, the row is the inspected one when
     * the inspector names a layer, else the Everything row.
     */
    layers?: readonly LayerId[];
}

/**
 * The row the Style tab edits when the caller names none: the Everything row while nothing with
 * an id is inspected, the inspected layer, and nothing at all for anything else (a run, a group),
 * so an edit never lands on a row the reader is not looking at.
 * @param session - the element's session.
 * @param inspected - the inspected id, if any.
 * @returns the row's layer ids, or null when the inspected thing is not a layer.
 */
function defaultRow(session: GraphSession, inspected: string | undefined): readonly LayerId[] | null {
    if (inspected === undefined) {
        return everythingRow(session);
    }
    return session.styles.get(inspected) === undefined ? null : [inspected];
}

/**
 * Every color the document's layers set, for the Color popover's swatches.
 * @param session - the element's session.
 * @returns the colors as hex, each once.
 */
function documentColors(session: GraphSession): string[] {
    const colors = new Set<string>();
    for (const layer of session.styles.list()) {
        for (const [channel, value] of Object.entries(layer.set ?? {})) {
            const descriptor = channelsFor(layer.target).find((d) => d.channel === channel);
            if (descriptor?.accepts === "color" && (typeof value === "string" || typeof value === "object")) {
                const color = toColorValue(value as Parameters<typeof toColorValue>[0]);
                if (color !== null) {
                    colors.add(color.hex.toUpperCase());
                }
            }
        }
    }
    return [...colors];
}

/**
 * The Style tab of every row that paints (tier1-design.md section 2.8): the Nodes | Edges switch,
 * the fixed sections, each listing only what the row sets, with "+" adding what it does not.
 * Generated from graphty-element's channel descriptors (`channelsFor`), never typed.
 * @param props - Component props
 * @param props.layers - the row's style layers
 * @returns The tab, or nothing before the element has come up
 */
export function StyleTab({ layers }: StyleTabProps): React.JSX.Element | null {
    const { session, element } = useWorkspace();
    useStyleVersion(session, element);
    const inspected = useWorkspaceState((state) => state.inspected?.id);
    if (session === null) {
        return null;
    }
    const row = layers ?? defaultRow(session, inspected);
    if (row === null) {
        return null;
    }
    // Keyed by the row, so an empty label line and the side are dropped when the selection changes.
    return <RowStyle key={row.join(" ")} session={session} row={row} />;
}

/**
 * One row's Style tab.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.row - the row's layers
 * @returns The tab
 */
function RowStyle({ session, row }: { session: GraphSession; row: readonly LayerId[] }): React.JSX.Element {
    // The reader's own lines only: the element's locked base layers set something on both sides
    // of the Everything row, which would make the dot say nothing.
    const sets = (target: Target): boolean =>
        rowLayers(session, row, target).some((l) => !l.locked && (l.set !== undefined || l.encode !== undefined));
    const [side, setSide] = useState<Target>(() => (!sets("node") && sets("edge") ? "edge" : "node"));
    const layers = rowLayers(session, row, side);
    const colors = documentColors(session);
    const sideLabel = (target: Target, words: string): React.JSX.Element =>
        sets(target) ? (
            <Indicator size={5} offset={-4} position="middle-end">
                <span aria-hidden>{words}</span>
                <VisuallyHidden>{words}, set</VisuallyHidden>
            </Indicator>
        ) : (
            <span>{words}</span>
        );

    return (
        <Stack gap={8} p={8} data-testid="style-tab">
            <SegmentedControl
                size="xs"
                aria-label="Paints"
                value={side}
                onChange={(value) => {
                    setSide(value === "edge" ? "edge" : "node");
                }}
                data={[
                    { value: "node", label: sideLabel("node", "Nodes") },
                    { value: "edge", label: sideLabel("edge", "Edges") },
                ]}
            />
            {SECTIONS[side].map((section) =>
                section.id === "label" ? (
                    <LabelSection key={section.id} target={side} row={row} layers={layers} />
                ) : (
                    <Section
                        key={section.id}
                        section={section}
                        target={side}
                        row={row}
                        layers={layers}
                        documentColors={colors}
                    />
                ),
            )}
        </Stack>
    );
}

/**
 * One fixed section: its header with "+", and a line for each property the row sets. "+" adds the
 * one property left, or opens a menu of the unset ones; one the element cannot draw is listed
 * disabled with the reason.
 * @param props - Component props
 * @param props.section - the section
 * @param props.target - nodes or edges
 * @param props.row - the row's layers
 * @param props.layers - the row's layers on this side
 * @param props.documentColors - colors the document uses
 * @returns The section
 */
function Section({
    section,
    target,
    row,
    layers,
    documentColors: colors,
}: {
    section: StyleSection;
    target: Target;
    row: readonly LayerId[];
    layers: readonly Layer[];
    documentColors: readonly string[];
}): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    if (session === null) {
        return null;
    }
    const channels = channelsFor(target).filter((d) => section.holds(d) && isLineChannel(d));
    const set = channels.flatMap((d) => {
        const line = lineOf(layers, d.channel);
        return line === undefined ? [] : [{ descriptor: d, line }];
    });
    const unset = channels.filter((d) => lineOf(layers, d.channel) === undefined);
    const add = (descriptor: ChannelDescriptor): void => {
        writeLine(session, row, target, descriptor.channel, { value: startingValue(descriptor) }).catch(() => {
            store.set({ notice: { message: `${channelWord(descriptor.channel)} could not be added` } });
        });
    };
    const addLabel = `Add to ${section.title}`;
    let plus: React.JSX.Element | null = null;
    if (unset.length === 1 && unset[0].renderable) {
        plus = (
            <Tooltip label={`Add ${channelWord(unset[0].channel)}`}>
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={`Add ${channelWord(unset[0].channel)}`}
                    onClick={() => {
                        add(unset[0]);
                    }}
                >
                    <Plus size={14} aria-hidden />
                </ActionIcon>
            </Tooltip>
        );
    } else if (unset.length > 0) {
        plus = (
            <Menu position="bottom-end">
                <Menu.Target>
                    <Tooltip label={addLabel}>
                        <ActionIcon variant="subtle" size="sm" aria-label={addLabel}>
                            <Plus size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                    {unset.map((d) => (
                        <Menu.Item
                            key={d.channel}
                            disabled={!d.renderable}
                            onClick={() => {
                                add(d);
                            }}
                        >
                            <div>{channelWord(d.channel)}</div>
                            {d.renderable ? null : (
                                <Text size="xs" c="dimmed">
                                    Not drawn yet
                                </Text>
                            )}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
        );
    }

    return (
        <Stack gap={2} role="group" aria-label={section.title} data-section={section.id}>
            <Group gap={4} h={24} wrap="nowrap" justify="space-between">
                <Text size="xs" fw={600} pl={4}>
                    {section.title}
                </Text>
                {plus}
            </Group>
            {set.map(({ descriptor, line }) => (
                <SetLine
                    key={descriptor.channel}
                    descriptor={descriptor}
                    line={line}
                    row={row}
                    documentColors={colors}
                />
            ))}
        </Stack>
    );
}
