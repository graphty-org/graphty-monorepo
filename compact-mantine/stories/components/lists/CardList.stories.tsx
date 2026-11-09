import { Button } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { CardList, type CardListItem } from "../../../src";

const COLORS = ["#009E73", "#E69F00", "#56B4E9", "#CC79A7", "#D55E00"];

/**
 * An ordered stack of cards, each with a header (grip, fold, color chit, title, a slot beside the
 * title, a slot at the end, a menu and an x), a body and a footer. The caller owns the cards and
 * their order; the list draws them, folds them, renames, removes and reorders them by dragging
 * the grip. Keys that move a card are the caller's, shown on its menu.
 *
 * ## When to use it
 *
 * Reach for `CardList` when the reader builds a short list of things, each with its own controls,
 * whose order matters: the groups of a selection, the conditions of a filter. Reach for `Tree`
 * for rows that nest, and `PageList` for flat places one of which is on screen.
 *
 * ## Usage
 *
 * ```tsx
 * import { CardList } from "@graphty/compact-mantine";
 *
 * <CardList
 *     label="Groups"
 *     items={groups.map((group) => ({ id: group.id, title: group.name, color: group.color, children: <Body group={group} /> }))}
 *     onRename={(id, title) => rename(id, title)}
 *     onRemove={(id) => remove(id)}
 *     onReorder={(id, to) => move(id, to)}
 *     add={<Button onClick={addGroup}>Card</Button>}
 * />
 * ```
 *
 * A card appended at the end folds the others (`autoFold`, on by default). A long title is cut
 * with an ellipsis before anything else in the header shrinks, so nothing in the header ever
 * covers it.
 */
const meta: Meta<typeof CardList> = {
    title: "Components/Lists and trees/CardList",
    component: CardList,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
    argTypes: { items: { control: false } },
};

export default meta;
type Story = StoryObj<typeof CardList>;

/**
 * Cards a story drives, as a consumer owns them.
 * @param props - Component props
 * @param props.start - the first titles
 * @returns The list
 */
function Cards({ start }: Readonly<{ start: readonly string[] }>): React.JSX.Element {
    const [cards, setCards] = useState(start.map((title, at) => ({ id: `c${String(at)}`, title })));
    const [next, setNext] = useState(start.length);
    const items: CardListItem[] = cards.map((card, at) => ({
        id: card.id,
        title: card.title,
        color: COLORS[at % COLORS.length],
        summary: "Degree 6 to 10",
        aside: (
            <Button size="compact-xs" variant="default">
                No nodes
            </Button>
        ),
        header: <span>12 of 77</span>,
        children: <p style={{ margin: 0, padding: 8 }}>{`${card.title}: the card's controls`}</p>,
        footer: (
            <Button size="compact-xs" variant="subtle">
                Keep
            </Button>
        ),
    }));
    return (
        <div style={{ width: 320 }}>
            <CardList
                label="Groups"
                items={items}
                empty={<p>No cards yet</p>}
                add={
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        onClick={() => {
                            setCards((now) => [
                                ...now,
                                { id: `c${String(next)}`, title: String.fromCodePoint(65 + next) },
                            ]);
                            setNext(next + 1);
                        }}
                    >
                        Card
                    </Button>
                }
                onRename={(id, title) => {
                    setCards((now) => now.map((card) => (card.id === id ? { ...card, title } : card)));
                }}
                onRemove={(id) => {
                    setCards((now) => now.filter((card) => card.id !== id));
                }}
                onReorder={(id, to) => {
                    setCards((now) => {
                        const moved = now.find((card) => card.id === id);
                        const rest = now.filter((card) => card.id !== id);
                        if (moved !== undefined) {
                            rest.splice(to, 0, moved);
                        }
                        return rest;
                    });
                }}
            />
        </div>
    );
}

/** Three colored cards; the third has a long title, cut before the button beside it. */
export const Default: Story = {
    render: () => <Cards start={["A", "B", "A title much too long to fit beside its start button"]} />,
};

/** Card adds a card at the bottom and folds the others. */
export const AddFoldsTheOthers: Story = {
    render: () => <Cards start={["A", "B"]} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: "Card" }));
        const regions = await canvas.findAllByRole("region");
        await expect(regions.map((region) => region.getAttribute("aria-label"))).toEqual(["A", "B", "C"]);
        await expect(regions[0]).toHaveAttribute("data-folded");
    },
};

/** With no cards, the empty slot. */
export const Empty: Story = {
    render: () => <Cards start={[]} />,
};
