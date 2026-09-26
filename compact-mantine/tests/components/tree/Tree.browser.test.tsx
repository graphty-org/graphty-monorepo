/**
 * The layer tree's behavior with real input in Chromium: the WAI-ARIA tree-view keyboard model
 * (design/figma-spec.md 10.1), the Alt+Arrow keyboard move, pointer selection, the caret, rename,
 * drag and drop, and virtualization. Every key here is a real key press through Playwright.
 */
import { screen, within } from "@testing-library/react";
import { userEvent } from "@vitest/browser/context";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InlineRename, PageList, ResultRow, Tree, type TreeMove, type TreeNodeData } from "../../../src/components/tree";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const ITEMS: TreeNodeData[] = [
    {
        id: "frame",
        name: "Frame",
        children: [
            { id: "rect", name: "Rect" },
            {
                id: "group",
                name: "Group",
                children: [
                    { id: "text", name: "Text" },
                    { id: "vector", name: "Vector" },
                ],
            },
        ],
    },
    { id: "other", name: "Other", children: [{ id: "star", name: "Star" }] },
    { id: "leaf", name: "Leaf" },
];

const row = (name: string): HTMLElement => screen.getByRole("treeitem", { name });
const focused = (): string | null => document.activeElement?.getAttribute("data-id") ?? null;

/**
 * Tab into the tree and return once a row has focus.
 */
async function tabIn(): Promise<void> {
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();
}

describe("Tree: semantics", () => {
    it("is a named tree of treeitems with level, position, expansion and selection", async () => {
        await renderThemed(<Tree items={ITEMS} defaultExpanded={["frame"]} defaultSelected={["rect"]} />);

        const tree = screen.getByRole("tree", { name: "Layers" });
        expect(tree).toHaveAttribute("aria-multiselectable", "true");
        expect(row("Frame")).toHaveAttribute("aria-level", "1");
        expect(row("Frame")).toHaveAttribute("aria-expanded", "true");
        expect(row("Frame")).toHaveAttribute("aria-setsize", "3");
        expect(row("Group")).toHaveAttribute("aria-level", "2");
        expect(row("Group")).toHaveAttribute("aria-posinset", "2");
        expect(row("Group")).toHaveAttribute("aria-expanded", "false");
        expect(row("Rect")).not.toHaveAttribute("aria-expanded");
        expect(row("Rect")).toHaveAttribute("aria-selected", "true");
        expect(row("Leaf")).toHaveAttribute("aria-selected", "false");
    });

    it("has one Tab stop, on the selected row", async () => {
        await renderThemed(
            <>
                <button type="button">before</button>
                <Tree items={ITEMS} defaultExpanded={["frame"]} defaultSelected={["rect"]} />
                <button type="button">after</button>
            </>,
        );
        const stops = within(screen.getByRole("tree"))
            .getAllByRole("treeitem")
            .filter((r) => r.tabIndex === 0);
        expect(stops.map((r) => r.getAttribute("data-id"))).toEqual(["rect"]);

        screen.getByRole("button", { name: "before" }).focus();
        await userEvent.tab();
        expect(focused()).toBe("rect");
        await userEvent.tab();
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "after" }));
    });
});

describe("Tree: keyboard", () => {
    it("moves with ArrowDown / ArrowUp / Home / End, without selecting", async () => {
        const onSelect = vi.fn();
        await renderThemed(<Tree items={ITEMS} defaultExpanded={["frame"]} onSelect={onSelect} />);
        await tabIn();
        expect(focused()).toBe("frame");

        await userEvent.keyboard("{ArrowDown}");
        expect(focused()).toBe("rect");
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        expect(focused()).toBe("other");
        await userEvent.keyboard("{ArrowUp}");
        expect(focused()).toBe("group");
        await userEvent.keyboard("{End}");
        expect(focused()).toBe("leaf");
        await userEvent.keyboard("{Home}");
        expect(focused()).toBe("frame");
        expect(onSelect).not.toHaveBeenCalled();
    });

    it("opens a closed parent with ArrowRight, then moves to its first child", async () => {
        const onExpandedChange = vi.fn();
        await renderThemed(<Tree items={ITEMS} onExpandedChange={onExpandedChange} />);
        await tabIn();

        await userEvent.keyboard("{ArrowRight}");
        expect(onExpandedChange).toHaveBeenLastCalledWith(["frame"]);
        expect(row("Frame")).toHaveAttribute("aria-expanded", "true");
        expect(focused()).toBe("frame");

        await userEvent.keyboard("{ArrowRight}");
        expect(focused()).toBe("rect");
        // A leaf: ArrowRight does nothing.
        await userEvent.keyboard("{ArrowRight}");
        expect(focused()).toBe("rect");
    });

    it("closes an open parent with ArrowLeft, and from a child moves to the parent", async () => {
        await renderThemed(<Tree items={ITEMS} defaultExpanded={["frame", "group"]} />);
        await tabIn();
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
        expect(focused()).toBe("text");

        await userEvent.keyboard("{ArrowLeft}");
        expect(focused()).toBe("group");
        await userEvent.keyboard("{ArrowLeft}");
        expect(row("Group")).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("treeitem", { name: "Text" })).toBeNull();
        expect(focused()).toBe("group");
    });

    it("selects with Enter and Space; Shift extends a range, Control toggles", async () => {
        const onSelect = vi.fn();
        await renderThemed(<Tree items={ITEMS} defaultExpanded={["frame"]} onSelect={onSelect} />);
        await tabIn();

        await userEvent.keyboard("{ArrowDown}{Enter}");
        expect(onSelect).toHaveBeenLastCalledWith(["rect"], expect.anything());
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{Shift>}{Enter}{/Shift}");
        expect(onSelect).toHaveBeenLastCalledWith(["rect", "group", "other"], expect.anything());
        await userEvent.keyboard("{ArrowDown}{Control>} {/Control}");
        expect(onSelect).toHaveBeenLastCalledWith(["rect", "group", "other", "leaf"], expect.anything());
        await userEvent.keyboard("{Control>} {/Control}");
        expect(onSelect).toHaveBeenLastCalledWith(["rect", "group", "other"], expect.anything());
        await userEvent.keyboard(" ");
        expect(onSelect).toHaveBeenLastCalledWith(["leaf"], expect.anything());
        expect(row("Leaf")).toHaveAttribute("aria-selected", "true");
    });

    it("keeps one selected row when multiselect is off", async () => {
        const onSelect = vi.fn();
        await renderThemed(<Tree items={ITEMS} multiselect={false} onSelect={onSelect} />);
        expect(screen.getByRole("tree")).not.toHaveAttribute("aria-multiselectable");
        await tabIn();
        await userEvent.keyboard("{Enter}{ArrowDown}{Shift>}{Enter}{/Shift}");
        expect(onSelect).toHaveBeenLastCalledWith(["other"], expect.anything());
    });

    it("jumps by type-ahead, and a quick run of keys matches a longer prefix", async () => {
        await renderThemed(<Tree items={ITEMS} defaultExpanded={["frame"]} />);
        await tabIn();
        await userEvent.keyboard("l");
        expect(focused()).toBe("leaf");
        // A new run starts once the 500ms type-ahead window has passed.
        await new Promise((resolve) => setTimeout(resolve, 600));
        await userEvent.keyboard("g");
        expect(focused()).toBe("group");
        await new Promise((resolve) => setTimeout(resolve, 600));
        await userEvent.keyboard("{Home}ot");
        expect(focused()).toBe("other");
    });

    it("opens every sibling with *", async () => {
        await renderThemed(<Tree items={ITEMS} />);
        await tabIn();
        await userEvent.keyboard("*");
        expect(row("Frame")).toHaveAttribute("aria-expanded", "true");
        expect(row("Other")).toHaveAttribute("aria-expanded", "true");
        expect(row("Group")).toHaveAttribute("aria-expanded", "false");
    });

    it("closes everything with Alt+L and keeps focus on the top-level row", async () => {
        await renderThemed(<Tree items={ITEMS} defaultExpanded={["frame", "group", "other"]} />);
        await tabIn();
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
        expect(focused()).toBe("text");
        await userEvent.keyboard("{Alt>}l{/Alt}");
        expect(screen.getAllByRole("treeitem").map((r) => r.getAttribute("data-id"))).toEqual([
            "frame",
            "other",
            "leaf",
        ]);
        expect(focused()).toBe("frame");
    });

    it("renames with F2: the name is selected, Enter commits and focus returns to the row", async () => {
        const onRename = vi.fn();
        await renderThemed(<Tree items={ITEMS} onRename={onRename} />);
        await tabIn();
        await userEvent.keyboard("{F2}");

        const field = screen.getByRole("textbox", { name: "Layer name" });
        expect(document.activeElement).toBe(field);
        expect((field as HTMLInputElement).selectionStart).toBe(0);
        expect((field as HTMLInputElement).selectionEnd).toBe("Frame".length);

        await userEvent.keyboard("Board{Enter}");
        expect(onRename).toHaveBeenCalledWith("frame", "Board");
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(focused()).toBe("frame");
    });

    it("cancels a rename with Escape", async () => {
        const onRename = vi.fn();
        await renderThemed(<Tree items={ITEMS} onRename={onRename} />);
        await tabIn();
        await userEvent.keyboard("{F2}Nope{Escape}");
        expect(onRename).not.toHaveBeenCalled();
        expect(screen.queryByRole("textbox")).toBeNull();
        expect(focused()).toBe("frame");
    });

    it("does not rename without onRename", async () => {
        await renderThemed(<Tree items={ITEMS} />);
        await tabIn();
        await userEvent.keyboard("{F2}");
        expect(screen.queryByRole("textbox")).toBeNull();
    });
});

describe("Tree: keyboard move", () => {
    const FLAT: TreeNodeData[] = [
        { id: "a", name: "Alpha" },
        { id: "b", name: "Bravo" },
        { id: "c", name: "Charlie" },
    ];

    /**
     * A caller that applies each move to its own flat list, the way a consumer owns the data.
     * @param props - Component props
     * @param props.onMove - Spy told of every move before it is applied
     * @returns The tree over the caller's list
     */
    function Reorderable({ onMove }: { onMove: (move: TreeMove) => void }): React.JSX.Element {
        const [items, setItems] = React.useState(FLAT);
        return (
            <Tree
                items={items}
                onMove={(move) => {
                    onMove(move);
                    setItems((prev) => {
                        const rest = prev.filter((item) => item.id !== move.id);
                        const moved = prev.find((item) => item.id === move.id);
                        return moved ? [...rest.slice(0, move.index), moved, ...rest.slice(move.index)] : prev;
                    });
                }}
            />
        );
    }

    const order = (): (string | null)[] =>
        screen.getAllByRole("treeitem").map((item) => item.getAttribute("data-id"));

    it("moves the focused item one place with Alt+ArrowDown / Alt+ArrowUp, focus following", async () => {
        const onMove = vi.fn();
        await renderThemed(<Reorderable onMove={onMove} />);
        await tabIn();
        await userEvent.keyboard("{ArrowDown}");
        expect(focused()).toBe("b");

        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        expect(onMove).toHaveBeenLastCalledWith({ id: "b", parentId: null, index: 2 });
        expect(order()).toEqual(["a", "c", "b"]);
        expect(focused()).toBe("b");

        await userEvent.keyboard("{Alt>}{ArrowUp}{ArrowUp}{/Alt}");
        expect(onMove).toHaveBeenLastCalledWith({ id: "b", parentId: null, index: 0 });
        expect(order()).toEqual(["b", "a", "c"]);
        expect(focused()).toBe("b");
        expect(row("Bravo")).toHaveAttribute("aria-posinset", "1");
    });

    it("does nothing past either end, and neither moves focus", async () => {
        const onMove = vi.fn();
        await renderThemed(<Reorderable onMove={onMove} />);
        await tabIn();

        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
        await userEvent.keyboard("{End}{Alt>}{ArrowDown}{/Alt}");
        expect(onMove).not.toHaveBeenCalled();
        expect(focused()).toBe("c");
        expect(order()).toEqual(["a", "b", "c"]);
    });

    it("moves among siblings only, reporting the parent", async () => {
        const onMove = vi.fn();
        await renderThemed(<Tree items={ITEMS} defaultExpanded={["frame"]} onMove={onMove} />);
        await tabIn();
        await userEvent.keyboard("{ArrowDown}");
        expect(focused()).toBe("rect");

        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        expect(onMove).toHaveBeenCalledWith({ id: "rect", parentId: "frame", index: 1 });

        // Group is the last child of Frame: Alt+ArrowDown does not carry it out of its parent.
        onMove.mockClear();
        await userEvent.keyboard("{ArrowDown}{Alt>}{ArrowDown}{/Alt}");
        expect(focused()).toBe("group");
        expect(onMove).not.toHaveBeenCalled();
    });

    it("leaves Alt+Arrow as plain focus movement without onMove", async () => {
        await renderThemed(<Tree items={FLAT} />);
        await tabIn();
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        expect(focused()).toBe("b");
        expect(order()).toEqual(["a", "b", "c"]);
    });
});

describe("Tree: pointer", () => {
    it("selects on click; Shift+click selects a range; Control+click toggles", async () => {
        const onSelect = vi.fn();
        await renderThemed(<Tree items={ITEMS} defaultExpanded={["frame"]} onSelect={onSelect} />);

        await userEvent.click(row("Rect"));
        expect(onSelect).toHaveBeenLastCalledWith(["rect"], expect.anything());
        await userEvent.click(row("Other"), { modifiers: ["Shift"] });
        expect(onSelect).toHaveBeenLastCalledWith(["rect", "group", "other"], expect.anything());
        await userEvent.click(row("Group"), { modifiers: ["Control"] });
        expect(onSelect).toHaveBeenLastCalledWith(["rect", "other"], expect.anything());
    });

    it("opens and closes one row from the caret without selecting it", async () => {
        const onSelect = vi.fn();
        await renderThemed(<Tree items={ITEMS} onSelect={onSelect} />);
        // The caret is drawn only while the pointer is over the tree.
        expect(getComputedStyle(within(row("Frame")).getByTestId("tree-caret")).visibility).toBe("hidden");
        await userEvent.hover(row("Frame"));
        await userEvent.click(within(row("Frame")).getByTestId("tree-caret"));
        expect(row("Frame")).toHaveAttribute("aria-expanded", "true");
        await userEvent.click(within(row("Frame")).getByTestId("tree-caret"));
        expect(row("Frame")).toHaveAttribute("aria-expanded", "false");
        expect(onSelect).not.toHaveBeenCalled();
    });

    it("renames on double-click", async () => {
        const onRename = vi.fn();
        await renderThemed(<Tree items={ITEMS} onRename={onRename} />);
        await userEvent.dblClick(row("Leaf"));
        await userEvent.keyboard("Twig{Enter}");
        expect(onRename).toHaveBeenCalledWith("leaf", "Twig");
    });

    it("keeps clicks on the row's toggles from selecting the row", async () => {
        const onSelect = vi.fn();
        const onLock = vi.fn();
        const items: TreeNodeData[] = [
            {
                id: "a",
                name: "A",
                actions: (
                    <button type="button" aria-label="Lock" onClick={onLock}>
                        L
                    </button>
                ),
            },
        ];
        await renderThemed(<Tree items={items} onSelect={onSelect} />);
        await userEvent.hover(row("A"));
        await userEvent.click(screen.getByRole("button", { name: "Lock" }));
        expect(onLock).toHaveBeenCalled();
        expect(onSelect).not.toHaveBeenCalled();
    });

    it("reports a drop into a container through onMove, and moves nothing itself", async () => {
        const onMove = vi.fn();
        await renderThemed(<Tree items={ITEMS} onMove={onMove} />);
        await userEvent.dragAndDrop(row("Leaf"), row("Other"));
        expect(onMove).toHaveBeenCalledWith({ id: "leaf", parentId: "other", index: 0 });
        expect(screen.getAllByRole("treeitem").map((r) => r.getAttribute("data-id"))).toEqual([
            "frame",
            "other",
            "leaf",
        ]);
    });
});

describe("Tree: virtualization", () => {
    const many: TreeNodeData[] = Array.from({ length: 2000 }, (_, i) => ({ id: `n${String(i)}`, name: `Node ${String(i)}` }));

    it("draws only the rows on screen above 200 rows, and End still reaches the last", async () => {
        await renderThemed(<Tree items={many} height={320} />);
        expect(screen.getAllByRole("treeitem").length).toBeLessThan(40);
        await tabIn();
        expect(focused()).toBe("n0");
        await userEvent.keyboard("{End}");
        await vi.waitFor(() => {
            expect(focused()).toBe("n1999");
        });
        expect(row("Node 1999")).toHaveAttribute("aria-posinset", "2000");
    });
});

describe("PageList: keyboard and pointer", () => {
    const PAGES = [
        { id: "p1", name: "Page 1" },
        { id: "p2", name: "Page 2" },
        { id: "d", name: "---", divider: true },
        { id: "p3", name: "Page 3" },
    ];

    it("is a grid with one Tab stop; arrows move focus without switching, skipping dividers", async () => {
        const onCurrentChange = vi.fn();
        await renderThemed(<PageList items={PAGES} defaultCurrent="p1" onCurrentChange={onCurrentChange} />);
        expect(screen.getByRole("grid", { name: "Pages" })).toBeInTheDocument();
        const cells = screen.getAllByRole("gridcell");
        expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);
        expect(cells[0]).toHaveAttribute("aria-current", "page");

        await tabIn();
        expect(document.activeElement).toBe(cells[0]);
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        expect(document.activeElement).toBe(cells[3]);
        expect(onCurrentChange).not.toHaveBeenCalled();
        await userEvent.keyboard("{Enter}");
        expect(onCurrentChange).toHaveBeenLastCalledWith("p3", expect.anything());
        expect(cells[3]).toHaveAttribute("aria-current", "page");
        await userEvent.keyboard("{Home} ");
        expect(onCurrentChange).toHaveBeenLastCalledWith("p1", expect.anything());
    });

    it("switches on click and renames with F2", async () => {
        const onRename = vi.fn();
        await renderThemed(<PageList items={PAGES} onRename={onRename} />);
        await userEvent.click(screen.getByText("Page 2"));
        expect(screen.getAllByRole("gridcell")[1]).toHaveAttribute("aria-current", "page");
        await userEvent.keyboard("{F2}Two{Enter}");
        expect(onRename).toHaveBeenCalledWith("p2", "Two");
        expect(document.activeElement).toBe(screen.getAllByRole("gridcell")[1]);
    });
});

describe("InlineRename", () => {
    it("commits on blur without taking focus back", async () => {
        const onCommit = vi.fn();
        await renderThemed(
            <>
                <InlineRename value="Name" onCommit={onCommit} />
                <button type="button">elsewhere</button>
            </>,
        );
        await userEvent.keyboard("New");
        await userEvent.click(screen.getByRole("button", { name: "elsewhere" }));
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledWith("New");
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "elsewhere" }));
    });
});

describe("ResultRow", () => {
    it("is an option that keeps focus in the search field when pressed", async () => {
        const onClick = vi.fn();
        await renderThemed(
            <>
                <input aria-label="Find" />
                <div role="listbox" aria-label="Results">
                    <ResultRow id="r1" name="Deepest rect" match="rect" path="left-sidebar" onClick={onClick} />
                </div>
            </>,
        );
        const field = screen.getByRole("textbox", { name: "Find" });
        field.focus();
        await userEvent.click(screen.getByRole("option", { name: /Deepest rect/ }));
        expect(onClick).toHaveBeenCalled();
        expect(document.activeElement).toBe(field);
        expect(screen.getByText("rect")).toHaveClass("cm-result-match");
    });
});
