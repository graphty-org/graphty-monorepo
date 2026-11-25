/**
 * Style panel v2's one list editor (design/ui/style-panel-v2/design.md, section 6, R15): every list a thing
 * holds -- a pie's slices, stripes and a chart's values (graphty-element's parallel `listOf` channels) and the
 * structured text channels (polygon points, bends, inner lines, a Record's fields, an end's caps, table cells)
 * -- drawn alike: a "+" list whose items are lines, each with its own minus.
 */

import type { Channel } from "@graphty/graphty-element/catalog";
import React from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";
import { AddButton } from "../Section";
import { failureWords } from "../words";
import { colorItems } from "./colorItems";
import { ITEM_KINDS } from "./ItemList";
import { unsetIn } from "./lineWrites";
import type { ItemList, ListSpec } from "./lists";
import { PlusList } from "./PlusList";
import { LineFrame } from "./RubricLine";

/** Props for ItemListEditor. */
interface ItemListEditorProps {
    readonly ctx: RowContext;
    /** The list: a parallel color list (`LISTS`) or a structured text channel's (`ITEM_LISTS`). */
    readonly list: ListSpec | ItemList;
    /** A structured list's channel; a parallel list names its own. */
    readonly channel?: Channel;
    /**
     * "group": its own sub-group under a legend (a thing's whole Main, Inner lines' Lines); "line": a named
     * line holding "+", inside the sub-group it belongs to (a structured list only).
     */
    readonly legend: "group" | "line";
}

/**
 * The editor: see the file header.
 * @param props - Component props
 * @param props.ctx - see ItemListEditorProps
 * @param props.list - see ItemListEditorProps
 * @param props.channel - see ItemListEditorProps
 * @param props.legend - see ItemListEditorProps
 * @returns The list, or nothing for a channel the element does not offer here
 */
export function ItemListEditor({ ctx, list, channel, legend }: ItemListEditorProps): React.JSX.Element | null {
    const { store } = useWorkspace();
    const fail = (error: unknown): void => {
        store.set({ notice: { message: failureWords(list.name, "changed", error), error: true } });
    };
    let items: {
        readonly lines: React.ReactNode;
        readonly add: (() => void) | undefined;
        readonly tools?: React.ReactNode;
    };
    let value: unknown = undefined;
    if ("colors" in list) {
        items = colorItems({ ctx, list, fail });
    } else {
        const descriptor = channel === undefined ? undefined : shownChannel(ctx.session, ctx.side, channel, true);
        if (channel === undefined || descriptor === undefined) {
            return null;
        }
        value = lineIn(ctx, channel)?.value;
        const write = (text: string | undefined): void => {
            (text === undefined ? unsetIn(ctx, [channel]) : writeIn(ctx, channel, { value: text })).catch(fail);
        };
        items = ITEM_KINDS[list.kind]({ ctx, list, descriptor, value, write });
    }
    const { add } = items;
    const plus =
        add === undefined ? null : (
            <AddButton
                kind={ctx.side}
                title={list.name}
                name={`Add ${list.item.toLowerCase()}`}
                inRow={legend === "line"}
                options={[{ key: "item", label: list.item }]}
                onAdd={add}
            />
        );
    if (legend === "group" || channel === undefined) {
        return (
            <PlusList
                level="group"
                title={list.name}
                add={
                    items.tools === undefined ? (
                        plus
                    ) : (
                        // The legend's buttons: Equal shares and Reverse order, then "+" (stripes design 3.1).
                        <span className="ws-list-tools">
                            {items.tools}
                            {plus}
                        </span>
                    )
                }
            >
                {items.lines}
            </PlusList>
        );
    }
    const set = value !== undefined && value !== "";
    return (
        <>
            <LineFrame
                line={channel}
                name={list.name}
                set={set}
                rule="R15"
                control={null}
                modifier={plus}
                removeName={set ? `Remove ${list.name.toLowerCase()}` : undefined}
                onRemove={() => {
                    unsetIn(ctx, [channel]).catch(fail);
                }}
            />
            {items.lines}
        </>
    );
}
