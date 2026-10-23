/**
 * Moving rows into and out of folders from the keyboard and from a row menu, the live
 * announcement of where a row went, and the size of the row's action buttons. Every key and
 * pointer move is real input through Playwright.
 */
import { Menu } from "@mantine/core";
import { screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { ToggleIconButton } from "../../../src/components/buttons/ToggleIconButton";
import { moveTreeItem, Tree, type TreeNodeData, type TreeProps } from "../../../src/components/tree";
import { UiGlyph } from "../../../src/icons";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const ITEMS: TreeNodeData[] = [
    { id: "a", name: "Alpha" },
    {
        id: "f",
        name: "Folder",
        children: [
            { id: "x", name: "Xray" },
            { id: "y", name: "Yankee" },
        ],
    },
    { id: "z", name: "Zulu" },
];

const row = (name: string): HTMLElement => screen.getByRole("treeitem", { name });
const focused = (): string | null => document.activeElement?.getAttribute("data-id") ?? null;
const order = (): string[] =>
    screen.getAllByRole("treeitem").map((item) => `${item.getAttribute("aria-level") ?? ""}:${item.dataset.id ?? ""}`);
const status = (): HTMLElement => screen.getByRole("status");

/**
 * A caller that owns its items and applies every move with moveTreeItem.
 * @param props - Tree props other than items and onMove
 * @returns the tree
 */
function Owned(props: Omit<TreeProps, "items" | "onMove">): React.JSX.Element {
    const [items, setItems] = React.useState(ITEMS);
    return (
        <Tree
            {...props}
            items={items}
            onMove={(move) => {
                setItems((prev) => moveTreeItem(prev, move));
            }}
        />
    );
}

/**
 * Tab into the tree and return once a row has focus.
 */
async function tabIn(): Promise<void> {
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();
}

describe("Tree: moving into and out of folders", () => {
    it("Alt+ArrowDown on a row above a folder puts it inside, first, and says so", async () => {
        await renderThemed(<Owned />);
        await tabIn();
        expect(focused()).toBe("a");

        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        // The folder opens so the row stays in view, with focus on it.
        expect(order()).toEqual(["1:f", "2:a", "2:x", "2:y", "1:z"]);
        expect(focused()).toBe("a");
        expect(row("Alpha")).toHaveAttribute("aria-level", "2");
        expect(status()).toHaveTextContent("Alpha moved into Folder, 1 of 3");
    });

    it("Alt+ArrowUp on a row below a folder puts it inside, last", async () => {
        await renderThemed(<Owned />);
        await tabIn();
        await userEvent.keyboard("{End}");
        expect(focused()).toBe("z");

        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
        expect(order()).toEqual(["1:a", "1:f", "2:x", "2:y", "2:z"]);
        expect(focused()).toBe("z");
        expect(status()).toHaveTextContent("Zulu moved into Folder, 3 of 3");
    });

    it("Alt+ArrowLeft on a child moves it to the folder's level, just after the folder", async () => {
        await renderThemed(<Owned defaultExpanded={["f"]} />);
        await tabIn();
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        expect(focused()).toBe("x");

        await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}");
        expect(order()).toEqual(["1:a", "1:f", "2:y", "1:x", "1:z"]);
        expect(focused()).toBe("x");
        expect(row("Xray")).toHaveAttribute("aria-level", "1");
        expect(status()).toHaveTextContent("Xray moved to the top level, 3 of 4");

        // A top-level row has no folder to leave: nothing moves and focus stays.
        await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}");
        expect(order()).toEqual(["1:a", "1:f", "2:y", "1:x", "1:z"]);
        expect(focused()).toBe("x");
    });

    it("steps past a folder canDrop keeps closed", async () => {
        const onMove = vi.fn();
        await renderThemed(<Tree items={ITEMS} onMove={onMove} canDrop={(move) => move.parentId === null} />);
        await tabIn();
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        expect(onMove).toHaveBeenCalledWith({ id: "a", parentId: null, index: 1 });
    });

    it("moves a row into a folder from its row menu", async () => {
        await renderThemed(
            <Owned
                rowMenu={(node, actions) =>
                    node.children ? null : (
                        <Menu.Item
                            onClick={() => {
                                actions.moveTo("f");
                            }}
                        >
                            Move to Folder
                        </Menu.Item>
                    )
                }
            />,
        );
        await tabIn();
        await userEvent.keyboard("{End}{Shift>}{F10}{/Shift}");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Move to Folder" }));
        await vi.waitFor(() => {
            expect(order()).toEqual(["1:a", "1:f", "2:z", "2:x", "2:y"]);
        });
        expect(status()).toHaveTextContent("Zulu moved into Folder, 1 of 3");
    });
});

describe("Tree: row action targets", () => {
    it("draws each row action at least 24 x 24, side by side, none covering another", async () => {
        const toggle = (label: string, glyph: "lock" | "eye" | "pin"): React.JSX.Element => (
            <ToggleIconButton
                key={label}
                variant="swap"
                label={label}
                checked={false}
                withTooltip={false}
                icon={<UiGlyph name={glyph} size={16} />}
                checkedIcon={<UiGlyph name={glyph} size={16} />}
            />
        );
        await renderThemed(
            <div style={{ width: 240 }}>
                <Tree
                    items={[
                        {
                            id: "l",
                            name: "Layer",
                            actions: [toggle("Lock", "lock"), toggle("Hide", "eye"), toggle("Pin", "pin")],
                        },
                    ]}
                />
            </div>,
        );
        await userEvent.hover(row("Layer"));
        const buttons = ["Lock", "Hide", "Pin"].map((name) => screen.getByRole("button", { name }));
        const boxes = buttons.map((button) => button.getBoundingClientRect());
        boxes.forEach((box, i) => {
            expect(box.width).toBeGreaterThanOrEqual(24);
            expect(box.height).toBeGreaterThanOrEqual(24);
            const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            expect(hit?.closest("button")).toBe(buttons[i]);
            if (i > 0) {
                expect(box.left).toBeGreaterThanOrEqual(boxes[i - 1].right);
            }
        });
    });
});
