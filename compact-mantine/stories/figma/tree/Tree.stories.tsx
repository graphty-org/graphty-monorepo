import { Group, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import React, { useState } from "react";

import { ToggleIconButton, UiGlyph } from "../../../src";
import { Tree, TreeItem, type TreeNodeData } from "../../../src/components/tree";
import { applyMove, LAYERS, Panel, renameItem } from "./fixtures";

/**
 * The layer tree (design/figma-spec.md 10.1): Figma's 32px rows with pseudo-element fills, and
 * the WAI-ARIA tree-view keyboard model Figma lacks. Switch light and dark (and the WCAG AA
 * contrast) with the toolbar.
 */
const meta: Meta<typeof Tree> = {
    title: "Figma/Tree/Tree",
    component: Tree,
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Tree>;

const frame = <UiGlyph name="frame" size={16} />;
const rect = <UiGlyph name="rectangle" size={10} />;
const text = <UiGlyph name="text" size={16} />;
const component = <UiGlyph name="component" size={16} />;

/**
 * A lock or eye toggle for a layer row: the package's ToggleIconButton, which flips on pointer
 * down as Figma's does and on Enter / Space from the keyboard. The tree only reveals it.
 * @param props - Component props
 * @param props.kind - Lock or eye
 * @param props.on - Whether it is on (locked / hidden)
 * @param props.onChange - Called with the new value
 * @returns The toggle
 */
function LayerToggle({ kind, on, onChange }: { kind: "lock" | "eye"; on: boolean; onChange?: (on: boolean) => void }): React.JSX.Element {
    return kind === "lock" ? (
        <ToggleIconButton
            variant="swap"
            label="Lock layer"
            checked={on}
            onChange={onChange}
            withTooltip={false}
            icon={<UiGlyph name="unlock" size={16} />}
            checkedIcon={<UiGlyph name="lock" size={16} />}
        />
    ) : (
        <ToggleIconButton
            variant="swap"
            label="Hide layer"
            checked={on}
            onChange={onChange}
            withTooltip={false}
            icon={<UiGlyph name="eye" size={16} />}
            checkedIcon={<UiGlyph name="eyeClosed" size={16} />}
        />
    );
}

/** Every row state of the tree, side by side. */
export const States: Story = {
    render: () => (
        <Group align="flex-start" gap={24}>
            <Stack gap={16}>
                <Panel label="rest: top-level frame, nested rows">
                    <TreeItem name="Checkout" icon={frame} hasChildren expanded />
                    <TreeItem name="Card" icon={frame} level={2} hasChildren />
                    <TreeItem name="Background" icon={rect} level={2} />
                    <TreeItem name="Title" icon={text} level={3} />
                </Panel>
                <Panel label="hover (caret shown), keyboard focus">
                    <TreeItem name="Card" icon={frame} level={2} hasChildren data-state="hover" />
                    <TreeItem name="Background" icon={rect} level={2} data-state="focus" />
                </Panel>
                <Panel label="selected, selected + hover">
                    <TreeItem name="Background" icon={rect} level={2} selected />
                    <TreeItem name="Title" icon={text} level={2} selected data-state="hover" />
                </Panel>
                <Panel label="a run of selected rows">
                    <TreeItem name="Title" icon={text} level={2} selected tint="first" />
                    <TreeItem name="Price" icon={text} level={2} selected tint="middle" />
                    <TreeItem name="Tax" icon={text} level={2} selected tint="last" />
                </Panel>
            </Stack>
            <Stack gap={16}>
                <Panel label="selected parent, its children, hover on a child">
                    <TreeItem name="Card" icon={frame} level={1} hasChildren expanded selected tint="parent" />
                    <TreeItem name="Title" icon={text} level={2} tint="child" />
                    <TreeItem name="Price" icon={text} level={2} tint="child" data-state="hover" />
                    <TreeItem name="Shadow" icon={rect} level={2} tint="child-last" />
                </Panel>
                <Panel label="component, component selected, hidden">
                    <TreeItem name="Button" icon={component} level={2} tone="component" />
                    <TreeItem name="Button" icon={component} level={2} tone="component" selected />
                    <TreeItem
                        name="Hidden layer"
                        icon={rect}
                        level={2}
                        dimmed
                        actions={<LayerToggle kind="eye" on />}
                    />
                </Panel>
                <Panel label="toggles: revealed on hover; a toggle that is on stays">
                    <TreeItem
                        name="Hovered"
                        icon={rect}
                        level={2}
                        data-state="hover"
                        actions={
                            <>
                                <LayerToggle kind="lock" on={false} />
                                <LayerToggle kind="eye" on={false} />
                            </>
                        }
                    />
                    <TreeItem
                        name="Locked"
                        icon={rect}
                        level={2}
                        actions={
                            <>
                                <LayerToggle kind="lock" on />
                                <LayerToggle kind="eye" on={false} />
                            </>
                        }
                    />
                </Panel>
            </Stack>
        </Group>
    ),
};

/**
 * A working tree: select (Shift / Control), open with the caret or the arrows, rename with F2 or
 * a double-click, drag a row to move it, lock and hide with the toggles.
 */
export const Playground: Story = {
    render: function Render() {
        const [items, setItems] = useState<TreeNodeData[]>(LAYERS);
        const [locked, setLocked] = useState<Set<string>>(new Set());
        const [hidden, setHidden] = useState<Set<string>>(new Set());
        const flip = (set: Set<string>, id: string): Set<string> => {
            const next = new Set(set);
            if (!next.delete(id)) {
                next.add(id);
            }
            return next;
        };
        const decorate = (list: readonly TreeNodeData[]): TreeNodeData[] =>
            list.map((n) => ({
                ...n,
                dimmed: hidden.has(n.id),
                actions: (
                    <>
                        <LayerToggle kind="lock" on={locked.has(n.id)} onChange={() => setLocked((s) => flip(s, n.id))} />
                        <LayerToggle kind="eye" on={hidden.has(n.id)} onChange={() => setHidden((s) => flip(s, n.id))} />
                    </>
                ),
                children: n.children ? decorate(n.children) : undefined,
            }));
        return (
            <Panel>
                <Tree
                    items={decorate(items)}
                    defaultExpanded={["frame", "card"]}
                    defaultSelected={["card"]}
                    onRename={(id, name) => setItems((list) => renameItem(list, id, name))}
                    onMove={(move) => setItems((list) => applyMove(list, move))}
                />
            </Panel>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const card = canvas.getByRole("treeitem", { name: "Card" });
        card.focus();
        await userEvent.keyboard("{ArrowDown}");
        await expect(canvas.getByRole("treeitem", { name: "Title" })).toHaveFocus();
        await userEvent.keyboard("{ArrowLeft}");
        await expect(card).toHaveFocus();
        await userEvent.keyboard("{ArrowLeft}");
        await expect(card).toHaveAttribute("aria-expanded", "false");
        await userEvent.keyboard("{ArrowRight}");
        await expect(card).toHaveAttribute("aria-expanded", "true");
        // The row toggles work from the keyboard too.
        const lock = within(card).getByRole("button", { name: "Lock layer" });
        lock.focus();
        await userEvent.keyboard("{Enter}");
        await expect(within(card).getByRole("button", { name: "Lock layer" })).toHaveAttribute("aria-pressed", "true");
        await userEvent.keyboard(" ");
        await expect(within(card).getByRole("button", { name: "Lock layer" })).toHaveAttribute("aria-pressed", "false");
    },
};

/**
 * Expanded top-level rows stay pinned while their children scroll under them. The play function
 * scrolls into the Body frame, so its row is shown stuck over its children.
 */
export const StickyRoots: Story = {
    render: () => {
        const many: TreeNodeData[] = ["Header", "Body", "Footer"].map((name) => ({
            id: name,
            name,
            icon: frame,
            children: Array.from({ length: 12 }, (_, i) => ({ id: `${name}-${String(i)}`, name: `${name} layer ${String(i + 1)}`, icon: rect })),
        }));
        return (
            <Panel>
                <div data-testid="sticky-scroller" style={{ height: 320, overflow: "auto" }}>
                    <Tree items={many} defaultExpanded={["Header", "Body", "Footer"]} stickyRoots />
                </div>
            </Panel>
        );
    },
    play: async ({ canvasElement }) => {
        const scroller = within(canvasElement).getByTestId("sticky-scroller");
        // Header's block is 13 rows of 32: 560 is five rows into Body.
        scroller.scrollTop = 560;
        const body = within(canvasElement).getByRole("treeitem", { name: "Body" });
        await waitFor(() => expect(Math.round(body.getBoundingClientRect().top)).toBe(Math.round(scroller.getBoundingClientRect().top)));
    },
};

/** Five thousand rows: over 200 visible rows the tree draws only the rows on screen. */
export const Virtualized: Story = {
    render: () => {
        const many: TreeNodeData[] = Array.from({ length: 5000 }, (_, i) => ({
            id: String(i),
            name: `Rectangle ${String(i + 1)}`,
            icon: rect,
        }));
        return (
            <Panel>
                <Tree items={many} height={400} />
            </Panel>
        );
    },
};

/**
 * Dragging: the target container is boxed; between rows, a 2px line at the insertion depth. The
 * dragged row is selected, as it is in Figma (a press selects before the drag starts).
 */
export const Dragging: Story = {
    render: () => (
        <Group align="flex-start" gap={24}>
            <Panel label="drop into a frame">
                <Tree items={LAYERS} defaultExpanded={["frame"]} defaultSelected={["note"]} onMove={() => undefined} label="Into" />
            </Panel>
            <Panel label="drop between rows">
                <Tree items={LAYERS} defaultExpanded={["frame"]} defaultSelected={["note"]} onMove={() => undefined} label="Between" />
            </Panel>
        </Group>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const hover = (tree: string, source: string, target: string, fraction: number): void => {
            const scope = within(canvas.getByRole("tree", { name: tree }));
            const data = new DataTransfer();
            scope.getByRole("treeitem", { name: source }).dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: data }));
            const row = scope.getByRole("treeitem", { name: target });
            const box = row.getBoundingClientRect();
            row.dispatchEvent(
                new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: data, clientY: box.top + box.height * fraction }),
            );
        };
        hover("Into", "Sticky note", "Card", 0.5);
        hover("Between", "Sticky note", "Background", 0.1);
        await expect(await within(canvas.getByRole("tree", { name: "Into" })).findByTestId("tree-drop-box")).toBeVisible();
        await expect(await within(canvas.getByRole("tree", { name: "Between" })).findByTestId("tree-drop-line")).toBeVisible();
    },
};
