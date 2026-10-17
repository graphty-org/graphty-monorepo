import { Popout } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import { type GraphSession, OVERFLOW_SHAPES } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { BindingPopover } from "./BindingPopover";
import {
    appRange,
    type DataBinding,
    type DataChoice,
    groupPalettes,
    type LayerBinding,
    type LayerValues,
    layerValues,
    propose,
    sourceName,
} from "./row";
import { bindingTitle } from "./words";

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

/** The binding the popover holds while it is open: by Layer, or by a value of the data. */
type Held =
    | { readonly kind: "layers"; readonly binding: LayerBinding }
    | { readonly kind: "data"; readonly binding: DataBinding };

/** Props for BulkBinding. */
interface BulkBindingProps {
    readonly session: GraphSession;
    readonly descriptor: ChannelDescriptor;
    /** The layers a write reaches, in list order (top first), with their row names. */
    readonly layers: readonly { readonly id: LayerId; readonly name: string }[];
    /** What it reads first: Layer, or a value of the data. */
    readonly start: DataChoice | "layer";
    /** By Layer: each layer's value now, so each row starts on it and is edited from there. */
    readonly prefill?: readonly { readonly id: LayerId; readonly value: ChannelValue }[];
    /** What the popover sits beside: the property's row. */
    readonly anchor: React.RefObject<HTMLElement | null>;
    /** By Layer: writes each layer its value, when the popover closes. */
    readonly onApplyEach: (sequence: LayerSequence, combine: LayerBinding["combine"]) => void;
    /** By a value of the data: copies the binding into each layer, when the popover closes. */
    readonly onApplyBinding: (binding: DataBinding) => void;
    /** Closed with nothing to write. */
    readonly onCancel: () => void;
}

/**
 * Varying a property of several layers: the one binding popover, opened beside the property's row,
 * holding its binding until it closes. Closing it writes, as one undo step, each layer its own
 * plain value (by Layer) or its own copy of the binding (by a value of the data). Change source
 * moves between them without writing.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.descriptor - the property
 * @param props.layers - the layers, top first
 * @param props.start - what it reads first
 * @param props.prefill - each layer's value now
 * @param props.anchor - the property's row
 * @param props.onApplyEach - writes each layer its value
 * @param props.onApplyBinding - copies a binding into each layer
 * @param props.onCancel - closed with nothing to write
 * @returns The popover
 */
export function BulkBinding({
    session,
    descriptor,
    layers,
    start,
    prefill,
    anchor,
    onApplyEach,
    onApplyBinding,
    onCancel,
}: BulkBindingProps): React.JSX.Element | null {
    const { channel } = descriptor;
    const heldFor = (pick: DataChoice | "layer"): Held | null => {
        if (pick === "layer") {
            const binding = startingBinding(session, descriptor);
            // Each layer's own value is its row's entry: nothing is kept between openings.
            const map = Object.fromEntries((prefill ?? []).map((each) => [each.id, each.value]));
            return {
                kind: "layers",
                binding: prefill === undefined ? binding : { ...binding, map: map as LayerBinding["map"] },
            };
        }
        const proposal = propose(session, pick, channel);
        return proposal.ok ? { kind: "data", binding: proposal.binding } : null;
    };
    const [held, setHeld] = useState<Held | null>(() => heldFor(start));
    // Opened on the layers' own values and closed unchanged: nothing to write.
    const [first] = useState(held);
    const [open, setOpen] = useState(true);
    const ids = layers.map((layer) => layer.id);
    if (held === null || ids.length === 0) {
        return null;
    }
    const source = held.kind === "layers" ? "layer" : (sourceName(session, held.binding) ?? held.binding.by);
    const change = (choice: DataChoice): void => {
        setHeld(heldFor(choice) ?? held);
    };
    return (
        <Popout
            opened={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) {
                    return;
                }
                if (prefill !== undefined && held === first) {
                    onCancel();
                    return;
                }
                if (held.kind === "layers") {
                    const { binding } = held;
                    onApplyEach((count) => layerValues(session, binding, channel, ids, count) ?? [], binding.combine);
                } else {
                    onApplyBinding(held.binding);
                }
            }}
        >
            <Popout.Panel
                width={POPOUT_WIDTH}
                placement="left"
                alignment="start"
                anchorY={anchor}
                header={{ variant: "title", title: bindingTitle(channel, source) }}
            >
                <Popout.Content>
                    {held.kind === "layers" ? (
                        <BindingPopover
                            descriptor={descriptor}
                            layers={ids}
                            binding={held.binding}
                            onChange={(binding) => {
                                setHeld({ kind: "layers", binding });
                            }}
                            onSource={change}
                        />
                    ) : (
                        <BindingPopover
                            descriptor={descriptor}
                            layerId={ids[0]}
                            binding={held.binding}
                            source={source}
                            held
                            onChange={(binding) => {
                                setHeld({ kind: "data", binding });
                            }}
                            onSource={change}
                        />
                    )}
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}
