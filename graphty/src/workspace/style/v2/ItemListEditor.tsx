/**
 * Style panel v2's one list editor (design/ui/style-panel-v2/design.md, section 6, R15): every list a thing
 * holds -- a pie's slices, stripes and a chart's values (graphty-element's parallel `listOf` channels) and the
 * structured text channels (polygon points, bends, inner lines, a Record's fields, an end's caps, table cells)
 * -- drawn alike: a "+" list whose items are lines, each with its own minus.
 *
 * A list grows without bound, so it never sits in a pop-over's own rows (owner's input rules: at most 6 rows): the
 * pop-over holds one line for it, its control showing the list (its swatches, or its first item), which opens the
 * list in a pop-over of its own beside (design "Lists in pop-overs"). That pop-over is a dedicated list, as a
 * drop-down's is, so it may open from a group pop-over; past six items it scrolls.
 */

import type { Channel } from "@graphty/graphty-element/catalog";
import React, { useId, useState } from "react";

import { useWorkspace } from "../../state/WorkspaceContext";
import { shownChannel } from "../offered";
import type { RowContext } from "../PropertyRow";
import { lineIn, writeIn } from "../row";
import { AddButton } from "../Section";
import { failureWords } from "../words";
import { colorItems, swatchesOf } from "./colorItems";
import { BesidePopover } from "./dataLines";
import { ITEM_KINDS } from "./ItemList";
import { unsetIn } from "./lineWrites";
import { firstItemWords, type ItemList, type ListSpec } from "./lists";
import { PlusList } from "./PlusList";
import { LineFrame } from "./RubricLine";
import { ValueButton } from "./ValueButton";

/**
 * A list's line address: a color list's is its colors' (a chart's Values, never its Kind), so each value has one
 * address; another list's, its channel's.
 * @param list - the list.
 * @param channel - the channel it edits, if any.
 * @returns the address.
 */
function addressOf(list: ListSpec | ItemList, channel: Channel | undefined): string {
    return "colors" in list ? list.colors : (channel ?? list.name);
}

/** Props for ItemListEditor. */
interface ItemListEditorProps {
    readonly ctx: RowContext;
    /** The list: a parallel color list (`LISTS`) or a structured text channel's (`ITEM_LISTS`). */
    readonly list: ListSpec | ItemList;
    /** A structured list's channel; a parallel list names its own. */
    readonly channel?: Channel;
    /** Drawn under its row in the panel rather than in a pop-over: its items stay in place, under a "+" line. */
    readonly inline?: boolean;
}

/**
 * The editor: see the file header.
 * @param props - Component props
 * @param props.ctx - see ItemListEditorProps
 * @param props.list - see ItemListEditorProps
 * @param props.channel - see ItemListEditorProps
 * @param props.inline - see ItemListEditorProps
 * @returns The list, or nothing for a channel the element does not offer here
 */
export function ItemListEditor({ ctx, list, channel, inline = false }: ItemListEditorProps): React.JSX.Element | null {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const listId = useId();
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
    if (inline && channel !== undefined) {
        const held = value !== undefined && value !== "";
        return (
            <>
                <LineFrame
                    line={channel}
                    name={list.name}
                    set={held}
                    rule="R15"
                    control={null}
                    modifier={<ListAdd ctx={ctx} list={list} add={add} inRow />}
                    removeName={held ? `Remove ${list.name.toLowerCase()}` : undefined}
                    onRemove={() => {
                        unsetIn(ctx, [channel]).catch(fail);
                    }}
                />
                {items.lines}
            </>
        );
    }
    const shown =
        "colors" in list ? (
            <ValueButton
                label={`Edit ${list.name.toLowerCase()}`}
                swatches={swatchesOf(ctx, list)}
                opens="dialog"
                controls={listId}
                expanded={open}
                onClick={() => {
                    setOpen(!open);
                }}
            />
        ) : (
            <ValueButton
                label={`Edit ${list.name.toLowerCase()}`}
                words={firstItemWords(list, value) || list.item}
                opens="dialog"
                controls={listId}
                expanded={open}
                onClick={() => {
                    setOpen(!open);
                }}
            />
        );
    const set = "colors" in list || (value !== undefined && value !== "");
    return (
        <>
            <LineFrame
                line={addressOf(list, channel)}
                name={list.name}
                set={set}
                rule="R15"
                control={shown}
                modifier={null}
                removeName={channel !== undefined && set ? `Remove ${list.name.toLowerCase()}` : undefined}
                onRemove={() => {
                    if (channel !== undefined) {
                        unsetIn(ctx, [channel]).catch(fail);
                    }
                }}
            />
            <BesidePopover id={listId} title={list.name} opened={open} onOpenChange={setOpen}>
                <div data-list-popover="" style={{ maxHeight: "calc(7 * 28px)", overflowY: "auto" }}>
                    <PlusList
                        level="group"
                        title={list.name}
                        add={<ListAdd ctx={ctx} list={list} add={add} tools={items.tools} inRow={false} />}
                    >
                        {items.lines}
                    </PlusList>
                </div>
            </BesidePopover>
        </>
    );
}

/**
 * A list's "+", after its legend's other buttons (stripes design 3.1: Equal shares and Reverse order), or nothing while
 * the list takes no item.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.list - the list
 * @param props.add - adds an item, if the list takes one
 * @param props.tools - the legend's other buttons
 * @param props.inRow - drawn in a line's trailing slot rather than a legend
 * @returns The buttons
 */
function ListAdd({
    ctx,
    list,
    add,
    tools,
    inRow,
}: Readonly<{
    ctx: RowContext;
    list: ListSpec | ItemList;
    add: (() => void) | undefined;
    tools?: React.ReactNode;
    inRow: boolean;
}>): React.ReactNode {
    const plus =
        add === undefined ? null : (
            <AddButton
                kind={ctx.side}
                title={list.name}
                name={`Add ${list.item.toLowerCase()}`}
                inRow={inRow}
                options={[{ key: "item", label: list.item }]}
                onAdd={add}
            />
        );
    return tools === undefined ? (
        plus
    ) : (
        <span className="ws-list-tools">
            {tools}
            {plus}
        </span>
    );
}
