import { Popout } from "@graphty/compact-mantine";
import type { ChannelDescriptor } from "@graphty/graphty-element/catalog";
import type { ChannelValue, LayerId } from "@graphty/graphty-element/schema";
import type { GraphSession } from "@graphty/graphty-element/session";
import React, { useEffect, useRef, useState } from "react";

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
    /**
     * By Layer: writes each layer its value, at each change (`last` false) and when the popover
     * closes (`last` true); the caller makes them one undo step.
     */
    readonly onApplyEach: (sequence: LayerSequence, combine: LayerBinding["combine"], last: boolean) => void;
    /** By a value of the data: copies the binding into each layer, at each change and when it closes. */
    readonly onApplyBinding: (binding: DataBinding, last: boolean) => void;
    /** Closed with nothing to write. */
    readonly onCancel: () => void;
    /** Closed by Escape after a change: the caller hands focus back to what opened it. */
    readonly onEscaped?: () => void;
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
 * Varying a property of several layers: the one binding popover, opened beside the property's row.
 * Each change is written as it is made, so the drawing and the key show it, and the writes of one
 * open are one undo step: each layer its own plain value (by Layer) or its own copy of the binding
 * (by a value of the data). Closed unchanged, it writes nothing.
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
 * @param props.onEscaped - closed by Escape after a change
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
    onEscaped,
}: BulkBindingProps): React.JSX.Element | null {
    const { channel } = descriptor;
    const heldFor = (pick: DataChoice | "layer"): Held | null => {
        if (pick === "layer") {
            return { kind: "layers", binding: layersBinding(session, descriptor, prefill, layers.length) };
        }
        const proposal = propose(session, pick, channel);
        return proposal.ok ? { kind: "data", binding: proposal.binding } : null;
    };
    const [held, setHeldState] = useState<Held | null>(() => heldFor(start));
    // Opened on the layers' own values and closed unchanged: nothing to write.
    const [first] = useState(held);
    // The values when it opened: each change is written at once, so the layers' values move on.
    const [opened] = useState(prefill);
    const [open, setOpen] = useState(true);
    // Whether the key that closes it is Escape: the pop-out's manager closes it on that key,
    // after this listener heard it on the way down.
    const escaping = useRef(false);
    useEffect(() => {
        const hear = (event: KeyboardEvent | PointerEvent): void => {
            escaping.current = event instanceof KeyboardEvent && event.key === "Escape";
        };
        document.addEventListener("keydown", hear, true);
        document.addEventListener("pointerdown", hear, true);
        return () => {
            document.removeEventListener("keydown", hear, true);
            document.removeEventListener("pointerdown", hear, true);
        };
    }, []);
    const ids = layers.map((layer) => layer.id);
    const apply = (next: Held, last: boolean): void => {
        if (next.kind === "layers") {
            const { binding } = next;
            onApplyEach((count) => layerValues(session, binding, channel, ids, count) ?? [], binding.combine, last);
        } else {
            onApplyBinding(next.binding, last);
        }
    };
    const setHeld = (next: Held): void => {
        setHeldState(next);
        apply(next, false);
    };
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
                if (opened !== undefined && held === first) {
                    onCancel();
                    return;
                }
                if (escaping.current) {
                    onEscaped?.();
                }
                apply(held, true);
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
                                setHeld({ kind: "layers", binding: repaletted(held.binding, binding, opened) });
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
