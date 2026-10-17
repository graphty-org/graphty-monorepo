import { Popout } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { BindingPopover } from "./BindingPopover";
import {
    type DataBinding,
    type DataChoice,
    type LayerBinding,
    layersBinding,
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
 * A new palette by Layer: every row still on the value its layer had when the popover opened takes
 * the palette's color, so the choice shows at once (every row starts as its layer's own value, and
 * an own value outranks the palette). A row changed in this popover keeps its color, as an own
 * value on one layer keeps it.
 * @param before - the binding before the change
 * @param after - the binding after it
 * @param prefill - each layer's value when the popover opened
 * @returns the binding to hold
 */
function repaletted(before: LayerBinding, after: LayerBinding, prefill: BulkBindingProps["prefill"]): LayerBinding {
    if (after.palette === before.palette || after.map === undefined || prefill === undefined) {
        return after;
    }
    const opened = new Map<string, unknown>(prefill.map((each) => [each.id, each.value]));
    const map = Object.fromEntries(
        Object.entries(after.map).filter(([id, value]) => !sameValue(opened.get(id), value)),
    ) as LayerBinding["map"];
    return { ...after, map };
}

/**
 * Whether two values are one, a hex color in either case.
 * @param a - one value
 * @param b - the other
 * @returns whether they are the same
 */
function sameValue(a: unknown, b: unknown): boolean {
    return typeof a === "string" && typeof b === "string" ? a.toLowerCase() === b.toLowerCase() : a === b;
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
            return { kind: "layers", binding: layersBinding(session, descriptor, prefill) };
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
    const source = held.kind === "layers" ? undefined : (sourceName(session, held.binding) ?? held.binding.by);
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
                                setHeld({ kind: "layers", binding: repaletted(held.binding, binding, prefill) });
                            }}
                            onSource={change}
                        />
                    ) : (
                        <BindingPopover
                            descriptor={descriptor}
                            layerId={ids[0]}
                            binding={held.binding}
                            source={sourceName(session, held.binding) ?? held.binding.by}
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
