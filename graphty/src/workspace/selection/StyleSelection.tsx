/**
 * The selection editor in its first host: a style layer's Which nodes / Which edges
 * (design/ui/selection-groups/spec.md, section 2). The base is the filtered graph, references
 * follow the reader, and a group's count selects what it counts. A layer's selector is read as a
 * selection (a tier 4 flat rule through graphty-element's `scope.asUnion`, starting All), and every
 * edit writes the layer's selector as a `union` rule, one undo step per edit. The outline is drawn
 * at rest: it is the layer's recipe, one line per step.
 */

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import React, { useRef, useState } from "react";

import type { Side } from "../style/cards";
import { useStepWriter } from "../style/useStepWriter";
import { SelectionEditor } from "./SelectionEditor";
import { layerSelection } from "./values";

/**
 * The editor on one layer.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.layer - the layer of this side
 * @param props.name - the layer's row name, for the undo step's words
 * @param props.side - nodes or edges
 * @param props.autoFocus - takes focus on arrival
 * @returns The editor
 */
export function StyleSelection({
    session,
    layer,
    name,
    side,
    autoFocus = false,
}: Readonly<{
    session: GraphSession;
    layer: Layer;
    name: string;
    side: Side;
    autoFocus?: boolean;
}>): React.JSX.Element | null {
    // The rule as last edited, until the element holds it: typing is never undone by a write on its way.
    const [local, setLocal] = useState<UnionLeaf | null>(null);
    const busy = useRef<() => boolean>(() => false);
    const writer = useStepWriter(session, `changing the conditions on ${name}`, () => {
        // Called just before the write counts as done: look once it has.
        queueMicrotask(() => {
            if (!busy.current()) {
                setLocal(null);
            }
        });
    });
    busy.current = writer.busy;
    const held = layerSelection(session, layer.selector, side);
    if (held === null) {
        return null;
    }
    return (
        <SelectionEditor
            session={session}
            rule={local ?? held}
            host="selector"
            ownerName={name}
            autoFocus={autoFocus}
            onChange={(next) => {
                setLocal(next);
                writer.write([{ id: layer.id, patch: { selector: { match: "rule", where: next } } }]);
            }}
        />
    );
}
