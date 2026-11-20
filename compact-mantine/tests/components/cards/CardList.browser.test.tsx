/**
 * The CardList, driven by the real pointer and keyboard: cards draw in the caller's order and an
 * appended card draws last and folds the others; the x moves focus to the next card; the grip
 * reorders by drag and takes no keys; the title renames on Enter and keeps its name on Escape; the
 * empty slot shows with no cards; and a long title truncates so the control beside it never overlaps it.
 * With keyboardReorder the grip moves its card on Alt+ArrowUp/Down, keeps focus and announces the
 * move; onReorderEnd fires once when a drag ends, with null when the browser cancels it.
 */
import { screen, waitFor, within } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { CardList, type CardListItem } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";
import { drag, moveTo, press, release } from "../../harness/mouse";
import { touchCancel, touchStart } from "../../harness/touch";

afterEach(resetHarness);

const COLORS = ["#009E73", "#E69F00", "#56B4E9", "#CC79A7"];

/**
 * A list the test drives: it owns its cards as a consumer would.
 * @param props - Component props
 * @param props.start - the first titles
 * @param props.width - the list's width
 * @returns The list
 */
function Harness({
    start,
    width = 320,
    keyboardReorder,
    onReorderEnd,
    ids = (at: number) => `c${String(at)}`,
    label = "Cards",
    nested,
}: Readonly<{
    start: readonly string[];
    width?: number;
    keyboardReorder?: boolean;
    onReorderEnd?: (id: string, toIndex: number | null) => void;
    ids?: (at: number) => string;
    label?: string;
    nested?: React.ReactNode;
}>): React.JSX.Element {
    const [titles, setTitles] = useState(start.map((title, at) => ({ id: ids(at), title })));
    const items: CardListItem[] = titles.map((card, at) => ({
        id: card.id,
        title: card.title,
        color: COLORS[at % COLORS.length],
        summary: `${card.title} summary`,
        aside: <button type="button">Nodes</button>,
        header: <span>8 of 77</span>,
        children: (
            <>
                <p>{`${card.title} body`}</p>
                {at === 0 ? nested : null}
            </>
        ),
    }));
    return (
        <div style={{ width }}>
            <CardList
                label={label}
                items={items}
                keyboardReorder={keyboardReorder}
                onReorderEnd={onReorderEnd}
                empty={<p>No cards</p>}
                add={
                    <button
                        type="button"
                        onClick={() => {
                            setTitles((now) => [...now, { id: `c${String(now.length + 10)}`, title: "New" }]);
                        }}
                    >
                        Add card
                    </button>
                }
                onRemove={(id) => {
                    setTitles((now) => now.filter((card) => card.id !== id));
                }}
                onRename={(id, title) => {
                    setTitles((now) => now.map((card) => (card.id === id ? { ...card, title } : card)));
                }}
                onReorder={(id, to) => {
                    setTitles((now) => {
                        const next = now.filter((card) => card.id !== id);
                        const moved = now.find((card) => card.id === id);
                        if (moved !== undefined) {
                            next.splice(to, 0, moved);
                        }
                        return next;
                    });
                }}
            />
        </div>
    );
}

const titles = (root: ParentNode = document): string[] =>
    [...root.querySelectorAll<HTMLElement>("[data-card-id]")].map((card) => card.getAttribute("aria-label") ?? "");

describe("CardList", () => {
    it("draws the cards in order; an added card is last and the others fold", async () => {
        await renderThemed(<Harness start={["A", "B"]} />);
        assert.deepEqual(titles(), ["A", "B"]);
        await userEvent.click(screen.getByRole("button", { name: "Add card" }));
        await waitFor(() => {
            assert.deepEqual(titles(), ["A", "B", "New"]);
        });
        await waitFor(() => {
            assert.isTrue(screen.getByRole("region", { name: "A" }).hasAttribute("data-folded"));
        });
        assert.isTrue(screen.getByRole("region", { name: "B" }).hasAttribute("data-folded"));
        assert.isFalse(screen.getByRole("region", { name: "New" }).hasAttribute("data-folded"));
        assert.include(screen.getByRole("region", { name: "A" }).textContent ?? "", "A summary");
        assert.isNull(screen.queryByText("A body"), "a folded card hides its body");
        await userEvent.click(screen.getByRole("button", { name: "Expand A" }));
        await screen.findByText("A body");
    });

    it("the x removes a card and moves focus to the next one", async () => {
        await renderThemed(<Harness start={["A", "B", "C"]} />);
        await userEvent.click(screen.getByRole("button", { name: "Delete A" }));
        await waitFor(() => {
            assert.deepEqual(titles(), ["B", "C"]);
        });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, screen.getByRole("region", { name: "B" }));
        });
    });

    it("the grip reorders by drag; its arrow keys move nothing, and its tooltip names no key", async () => {
        await renderThemed(<Harness start={["A", "B", "C"]} />);
        const grip = screen.getByRole("button", { name: "Move C" });
        const top = screen.getByRole("region", { name: "A" }).getBoundingClientRect();
        const from = grip.getBoundingClientRect();
        await drag(
            grip,
            { x: from.width / 2, y: from.height / 2 },
            { x: 0, y: top.top + 2 - (from.top + from.height / 2) },
        );
        await waitFor(() => {
            assert.deepEqual(titles(), ["C", "A", "B"]);
        });
        // Every hotkey needs a visible button showing its key: the grip has none, so it takes none.
        screen.getByRole("button", { name: "Move C" }).focus();
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}");
        assert.deepEqual(titles(), ["C", "A", "B"], "the arrows leave the order");
        await userEvent.hover(screen.getByRole("button", { name: "Move C" }));
        const tip = await screen.findByRole("tooltip");
        assert.strictEqual(tip.textContent, "Drag to reorder");
    });

    it("with keyboardReorder, Alt+ArrowDown and Alt+ArrowUp move the card, keep focus and announce", async () => {
        await renderThemed(<Harness start={["A", "B", "C"]} keyboardReorder />);
        await userEvent.hover(screen.getByRole("button", { name: "Move A" }));
        const tip = await screen.findByRole("tooltip");
        assert.strictEqual(tip.textContent, "Drag to reorder (Alt+Up, Alt+Down)");
        screen.getByRole("button", { name: "Move A" }).focus();
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        await waitFor(() => {
            assert.deepEqual(titles(), ["B", "A", "C"]);
        });
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Move A" }));
        assert.strictEqual(screen.getByRole("status").textContent, "Moved to position 2 of 3");
        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
        await waitFor(() => {
            assert.deepEqual(titles(), ["A", "B", "C"]);
        });
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Move A" }));
        assert.strictEqual(screen.getByRole("status").textContent, "Moved to position 1 of 3");
        // At the top Alt+ArrowUp moves nothing; a plain arrow moves nothing.
        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}{ArrowDown}");
        assert.deepEqual(titles(), ["A", "B", "C"]);
    });

    it("a nested list whose ids repeat the outer ones keeps focus on its own grip", async () => {
        const id = (at: number): string => String(at);
        await renderThemed(
            <Harness
                start={["Outer A", "Outer B"]}
                ids={id}
                keyboardReorder
                nested={<Harness start={["Inner A", "Inner B"]} ids={id} label="Inner" keyboardReorder />}
            />,
        );
        screen.getByRole("button", { name: "Move Inner A" }).focus();
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        const inner = screen.getByRole("group", { name: "Inner" });
        await waitFor(() => {
            assert.deepEqual(titles(inner), ["Inner B", "Inner A"]);
        });
        assert.strictEqual(document.activeElement, screen.getByRole("button", { name: "Move Inner A" }));
        assert.deepEqual(
            titles().filter((title) => title.startsWith("Outer")),
            ["Outer A", "Outer B"],
        );
    });

    it("a drag fires onReorderEnd once, with the final index", async () => {
        const ends: Array<[string, number | null]> = [];
        await renderThemed(<Harness start={["A", "B", "C"]} onReorderEnd={(id, to) => ends.push([id, to])} />);
        const grip = screen.getByRole("button", { name: "Move A" });
        const bottom = screen.getByRole("region", { name: "C" }).getBoundingClientRect();
        await press(grip);
        await moveTo({ x: grip.getBoundingClientRect().left + 4, y: bottom.bottom - 2 });
        await waitFor(() => {
            assert.deepEqual(titles(), ["B", "C", "A"]);
        });
        assert.deepEqual(ends, [], "nothing ends while the button is held");
        await release();
        await waitFor(() => {
            assert.deepEqual(ends, [["c0", 2]]);
        });
    });

    it("a cancelled drag fires onReorderEnd with null", async () => {
        const ends: Array<[string, number | null]> = [];
        await renderThemed(<Harness start={["A", "B"]} onReorderEnd={(id, to) => ends.push([id, to])} />);
        await touchStart(screen.getByRole("button", { name: "Move B" }));
        await touchCancel();
        await waitFor(() => {
            assert.deepEqual(ends, [["c1", null]]);
        });
    });

    it("without keyboardReorder, Alt+arrows move nothing and no status region is drawn", async () => {
        await renderThemed(<Harness start={["A", "B"]} />);
        screen.getByRole("button", { name: "Move A" }).focus();
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        assert.deepEqual(titles(), ["A", "B"]);
        assert.isNull(screen.queryByRole("status"));
    });

    it("the title renames on Enter and keeps its name on Escape", async () => {
        await renderThemed(<Harness start={["A"]} />);
        await userEvent.click(screen.getByRole("button", { name: "Rename A" }));
        const field = await screen.findByRole("textbox", { name: "Rename A" });
        await userEvent.keyboard("Ones{Enter}");
        await waitFor(() => {
            assert.deepEqual(titles(), ["Ones"]);
        });
        assert.isFalse(field.isConnected);
        await userEvent.click(screen.getByRole("button", { name: "Rename Ones" }));
        await screen.findByRole("textbox", { name: "Rename Ones" });
        await userEvent.keyboard("Other{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("textbox"));
        });
        assert.deepEqual(titles(), ["Ones"]);
    });

    it("reports no rename when the title is committed unchanged", async () => {
        const renamed: string[] = [];
        await renderThemed(
            <CardList
                label="Cards"
                items={[{ id: "a", title: "A", off: true, className: "mine" }]}
                onRename={(_id, title) => renamed.push(title)}
            />,
        );
        const card = screen.getByRole("region", { name: "A" });
        assert.isTrue(card.hasAttribute("data-off"));
        assert.isFalse(card.hasAttribute("data-colored"));
        assert.isTrue(card.classList.contains("mine"));
        await userEvent.click(screen.getByRole("button", { name: "Rename A" }));
        await screen.findByRole("textbox", { name: "Rename A" });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("textbox"));
        });
        assert.deepEqual(renamed, []);
    });

    it("shows the empty slot when there are no cards", async () => {
        await renderThemed(<Harness start={["A"]} />);
        await userEvent.click(screen.getByRole("button", { name: "Delete A" }));
        await screen.findByText("No cards");
    });

    for (const width of [240, 320, 400]) {
        it(`a 60-character title truncates and never meets the slot beside it at ${String(width)}px`, async () => {
            const long = "A title of sixty characters that will never fit on one line";
            await renderThemed(<Harness start={[long]} width={width} />);
            const card = screen.getByRole("region", { name: long });
            const title = card.querySelector<HTMLElement>(".cm-card-title");
            const slot = within(card).getByRole("button", { name: "Nodes" }).getBoundingClientRect();
            assert.isNotNull(title);
            const box = title?.getBoundingClientRect();
            assert.isAtMost(box?.right ?? Infinity, slot.left, "the title ends before the slot starts");
            assert.isAbove(title?.scrollWidth ?? 0, title?.clientWidth ?? 0, "it is cut with an ellipsis");
            assert.isAtMost(card.getBoundingClientRect().right, width + 1, "the card stays in the list");
        });
    }
});
