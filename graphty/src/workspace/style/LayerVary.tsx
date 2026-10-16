import { Popout } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { LayerId } from "@graphty/graphty-element/schema";
import { type GraphSession, OVERFLOW_SHAPES } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { LayerBindingPopover } from "./BindingPopover";
import { appRange, type DataChoice, groupPalettes, type LayerBinding, type LayerValues, layerValues } from "./row";
import { channelWord } from "./words";

export type { LayerValues } from "./row";

/** What a property varied by Layer writes: the values of the first `count` layers in list order. */
export type LayerSequence = (count: number) => readonly LayerValues[];

/** The width of the popover, as every field's pop-out. */
const POPOUT_WIDTH = 240;

/**
 * The shape list with the shapes graphty-element keeps apart past a palette first (its
 * "repeat colors, change shape" overflow), then the rest in the channel's order.
 * @param descriptor - the node shape channel.
 * @returns every shape, most distinct first.
 */
function shapesApartFirst(descriptor: ChannelDescriptor): string[] {
    const first: readonly string[] = OVERFLOW_SHAPES;
    return [...first, ...(descriptor.values ?? []).filter((shape) => !first.includes(shape))];
}

/**
 * The binding Vary by Layer starts from: the first group palette with every layer its own color
 * for a color, the shapes kept apart first for a shape, the app's range for a number.
 * @param session - the element's session.
 * @param descriptor - the property.
 * @returns the binding.
 */
function startingBinding(session: GraphSession, descriptor: ChannelDescriptor): LayerBinding {
    const isColor = descriptor.accepts === "color";
    const palette = isColor ? groupPalettes(session)[0]?.id : undefined;
    const { range } = appRange(descriptor.channel);
    return {
        ...(palette === undefined ? {} : { palette }),
        ...(isColor ? { overflow: "extend" as const } : {}),
        ...(descriptor.channel === "node.shape" ? { choices: shapesApartFirst(descriptor) } : {}),
        ...(range === undefined ? {} : { range: [range[0], range[1]] }),
    };
}

/** Props for LayerVary. */
interface LayerVaryProps {
    readonly session: GraphSession;
    readonly descriptor: ChannelDescriptor;
    /** The layers it gives a value each, in list order (top first), with their row names. */
    readonly layers: readonly { readonly id: LayerId; readonly name: string }[];
    /** What the popover sits beside: the property's row. */
    readonly anchor: React.RefObject<HTMLElement | null>;
    /** Writes each layer its value; called when the popover closes. */
    readonly onApply: (sequence: LayerSequence) => void;
    /** Reads a value of the data instead (Change source). */
    readonly onSource: (choice: DataChoice) => void;
}

/**
 * Vary by Layer: the binding popover with Layer as its source, opened beside the property's row.
 * Each selected layer is one group; closing the popover gives each its own plain value as one undo
 * step.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the property
 * @param props.layers - the layers, top first
 * @param props.anchor - the property's row
 * @param props.onApply - writes the values
 * @param props.onSource - reads a value of the data instead
 * @returns The popover
 */
export function LayerVary({
    session,
    descriptor,
    layers,
    anchor,
    onApply,
    onSource,
}: LayerVaryProps): React.JSX.Element {
    const { channel } = descriptor;
    const [binding, setBinding] = useState<LayerBinding>(() => startingBinding(session, descriptor));
    const [open, setOpen] = useState(true);
    const sequence: LayerSequence = (count) => layerValues(session, binding, channel, count) ?? [];
    return (
        <Popout
            opened={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    onApply(sequence);
                }
            }}
        >
            <Popout.Panel
                width={POPOUT_WIDTH}
                placement="left"
                alignment="start"
                anchorY={anchor}
                header={{ variant: "title", title: `${channelWord(channel)} by layer` }}
            >
                <Popout.Content>
                    <LayerBindingPopover
                        descriptor={descriptor}
                        layers={layers}
                        binding={binding}
                        onChange={setBinding}
                        onSource={(choice) => {
                            setOpen(false);
                            onSource(choice);
                        }}
                    />
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}
