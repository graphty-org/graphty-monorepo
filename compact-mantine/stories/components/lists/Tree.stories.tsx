import { Group, Kbd, Stack, Table, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import React, { useState } from "react";

import {
    moveTreeItem,
    renameTreeItem,
    ToggleIconButton,
    Tree,
    TreeItem,
    type TreeNodeData,
    UiGlyph,
} from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { LAYERS, Panel, STYLE_LAYERS } from "./fixtures";

/**
 * A tree of objects the reader selects, opens, renames and moves: Figma's layer panel, with the
 * WAI-ARIA tree-view keyboard model Figma lacks. The tree renders; your code owns the data.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | `Tree` | The rows are objects the reader selects, renames or reorders, and they may nest (layers, style layers, a scene graph). A flat list with no children is still a Tree. |
 * | `PageList` | The reader switches between a handful of flat pages or collections; one is current, none is "selected". |
 * | `ResultRow` | The rows are search results driven from a search field. |
 * | `DataRow` | The row is a reading (a name and a number), not an object the reader can select, rename or move. |
 *
 * `TreeItem` is the row on its own, for a static preview; `Tree` draws it with the keyboard model.
 *
 * ## Usage
 *
 * ```tsx
 * import { moveTreeItem, renameTreeItem, Tree, type TreeNodeData } from "@graphty/compact-mantine";
 *
 * const [items, setItems] = useState<TreeNodeData[]>(layers);
 * const [selected, setSelected] = useState<string[]>([]);
 *
 * <Tree
 *     items={items}
 *     label="Layers"
 *     selected={selected}
 *     onSelect={setSelected}
 *     onRename={(id, name) => setItems(renameTreeItem(items, id, name))}
 *     onMove={(move) => setItems(moveTreeItem(items, move))}
 * />
 * ```
 *
 * `onMove` reports `{ id, parentId, index }`, where `index` counts the new parent's children with
 * the moved item already removed. The tree never moves data itself: `moveTreeItem` and
 * `renameTreeItem` apply a reported move or rename to your list, whatever else its items carry,
 * and return a new list.
 *
 * ## Keyboard and accessibility
 *
 * - One Tab stop with roving focus. ArrowUp / ArrowDown move; ArrowRight opens a closed parent
 *   or moves to its first child; ArrowLeft closes an open parent or moves to the parent;
 *   Home / End; type-ahead on the names.
 * - Enter or Space selects; Shift extends a range and Control / Command toggles (turn this off
 *   with `multiselect={false}`). `*` opens every sibling; Alt+L closes everything.
 * - F2 or a double-click renames, while `onRename` is given. Enter commits, Escape cancels.
 * - Alt+ArrowUp / Alt+ArrowDown move the focused item one place among its siblings, while
 *   `onMove` is given. Focus stays on the item. Drag and drop is the pointer equivalent.
 * - `role="tree"` named by `label`, rows `role="treeitem"` with `aria-level`, `aria-posinset`,
 *   `aria-setsize`, `aria-expanded` and `aria-selected`. A row is named by its name alone, not
 *   by the toggles inside it.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | 32px tall, the full 240px panel width |
 * | Indent | top-level icon at x+16; each level adds 24px |
 * | Caret and icon | 16 x 32 slots; the caret shows on hover or when open |
 * | Name | 11px on a 32px line; 600 for a top-level parent, 400 nested |
 * | Hover and selected fill | a 24px pill inset 4 8 4 12, radius 5 |
 * | Row toggles | 48 x 24, gap 4, end margin 12; hidden until hover or focus, unless on |
 * | Virtualization | above 200 visible rows |
 */
const meta: Meta<typeof Tree> = {
    title: "Components/Lists and trees/Tree",
    component: Tree,
    subcomponents: { TreeItem },
    tags: ["autodocs"],
    parameters: { layout: "padded" },
    argTypes: {
        items: { control: false },
        // TreeItem, in the same file, has boolean `selected` and `expanded` props whose `false`
        // defaults would otherwise be shown for the Tree's id lists.
        selected: { table: { defaultValue: { summary: "uncontrolled" } } },
        expanded: { table: { defaultValue: { summary: "uncontrolled" } } },
    },
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

/**
 * A panel of static TreeItem rows, inside a `role="tree"` so each row has the parent its role
 * needs.
 * @param props - Component props
 * @param props.label - The caption, also the tree's name
 * @param props.children - The rows
 * @returns The panel
 */
function RowPanel({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <Panel label={label}>
            <div role="tree" aria-label={label}>
                {children}
            </div>
        </Panel>
    );
}

/** A nested layer tree with its first frame open. Every prop is in the Controls table. */
export const Default: Story = {
    args: {
        items: LAYERS,
        label: "Layers",
        defaultExpanded: ["frame"],
        multiselect: true,
        stickyRoots: false,
        onSelect: fn(),
        onExpandedChange: fn(),
    },
    render: (args) => (
        <Panel>
            <Tree {...args} />
        </Panel>
    ),
};

/** Every row state, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group align="flex-start" gap={24}>
            <Stack gap={16}>
                <RowPanel label="rest: top-level frame, nested rows">
                    <TreeItem name="Checkout" icon={frame} hasChildren expanded />
                    <TreeItem name="Card" icon={frame} level={2} hasChildren />
                    <TreeItem name="Background" icon={rect} level={2} />
                    <TreeItem name="Title" icon={text} level={3} />
                </RowPanel>
                <RowPanel label="hover (caret shown), keyboard focus">
                    <TreeItem name="Card" icon={frame} level={2} hasChildren data-state="hover" />
                    <TreeItem name="Background" icon={rect} level={2} data-state="focus" />
                </RowPanel>
                <RowPanel label="selected, selected + hover">
                    <TreeItem name="Background" icon={rect} level={2} selected />
                    <TreeItem name="Title" icon={text} level={2} selected data-state="hover" />
                </RowPanel>
                <RowPanel label="a run of selected rows">
                    <TreeItem name="Title" icon={text} level={2} selected tint="first" />
                    <TreeItem name="Price" icon={text} level={2} selected tint="middle" />
                    <TreeItem name="Tax" icon={text} level={2} selected tint="last" />
                </RowPanel>
            </Stack>
            <Stack gap={16}>
                <RowPanel label="selected parent, its children, hover on a child">
                    <TreeItem name="Card" icon={frame} level={1} hasChildren expanded selected tint="parent" />
                    <TreeItem name="Title" icon={text} level={2} tint="child" />
                    <TreeItem name="Price" icon={text} level={2} tint="child" data-state="hover" />
                    <TreeItem name="Shadow" icon={rect} level={2} tint="child-last" />
                </RowPanel>
                <RowPanel label="component, component selected, hidden">
                    <TreeItem name="Button" icon={component} level={2} tone="component" />
                    <TreeItem name="Button" icon={component} level={2} tone="component" selected />
                    <TreeItem name="Hidden layer" icon={rect} level={2} dimmed actions={<LayerToggle kind="eye" on />} />
                </RowPanel>
                <RowPanel label="toggles: revealed on hover; a toggle that is on stays">
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
                </RowPanel>
            </Stack>
        </Group>
    ),
};

/**
 * A working layer tree: select (Shift / Control), open with the caret or the arrows, rename with
 * F2 or a double-click, move by drag or Alt+ArrowUp / Alt+ArrowDown, lock and hide with the
 * row toggles.
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
                    onRename={(id, name) => setItems((list) => renameTreeItem(list, id, name))}
                    onMove={(move) => setItems((list) => moveTreeItem(list, move))}
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
 * A flat, renameable, reorderable list: the graphty app's style layer list. The items have no
 * `children`, so a drop can only reorder, never nest. One layer is selected at a time
 * (`multiselect={false}`), an empty name is refused, and a layer moves by drag or by
 * Alt+ArrowUp / Alt+ArrowDown. Light and dark side by side.
 */
export const FlatReorderableList: Story = {
    parameters: BOTH_SCHEMES,
    render: function Render() {
        const [layers, setLayers] = useState<TreeNodeData[]>(STYLE_LAYERS);
        const [selected, setSelected] = useState<string[]>(["degree"]);
        return (
            <Panel>
                <Tree
                    items={layers}
                    label="Style layers"
                    renameLabel="Layer name"
                    multiselect={false}
                    selected={selected}
                    onSelect={setSelected}
                    onRename={(id, name) => {
                        const trimmed = name.trim();
                        if (trimmed !== "") {
                            setLayers((list) => renameTreeItem(list, id, trimmed));
                        }
                    }}
                    onMove={(move) => setLayers((list) => moveTreeItem(list, move))}
                />
            </Panel>
        );
    },
    play: async ({ canvasElement }) => {
        // Both halves hold their own list; drive the first.
        const tree = within(within(canvasElement).getAllByRole("tree", { name: "Style layers" })[0]);
        const names = (): string[] => tree.getAllByRole("treeitem").map((row) => row.getAttribute("aria-label") ?? "");
        const degree = tree.getByRole("treeitem", { name: "Degree colour" });
        degree.focus();
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        await waitFor(() => expect(names()).toEqual(["Selection highlight", "Node labels", "Degree colour", "Base style"]));
        await expect(tree.getByRole("treeitem", { name: "Degree colour" })).toHaveFocus();
        await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
        await waitFor(() => expect(names()).toEqual(["Selection highlight", "Degree colour", "Node labels", "Base style"]));
        // Rename, then try to empty the name: the empty name is refused.
        await userEvent.keyboard("{F2}");
        const field = tree.getByRole("textbox", { name: "Layer name" });
        await userEvent.clear(field);
        await userEvent.type(field, "Degree{Enter}");
        await expect(tree.getByRole("treeitem", { name: "Degree" })).toBeVisible();
        await userEvent.keyboard("{F2}");
        await userEvent.clear(tree.getByRole("textbox", { name: "Layer name" }));
        await userEvent.keyboard("{Enter}");
        await expect(tree.getByRole("treeitem", { name: "Degree" })).toBeVisible();
    },
};

const KEYS: [string[], string][] = [
    [["ArrowUp", "ArrowDown"], "Move focus to the row above or below"],
    [["ArrowRight"], "Open a closed parent, or move to its first child"],
    [["ArrowLeft"], "Close an open parent, or move to the parent"],
    [["Home", "End"], "First or last visible row"],
    [["a-z"], "Type-ahead: the next row whose name starts with the letters"],
    [["Enter", "Space"], "Select; with Shift extend a range, with Control / Command toggle"],
    [["*"], "Open every sibling of the focused row"],
    [["Alt+L"], "Close everything"],
    [["F2"], "Rename the focused row (with onRename)"],
    [["Alt+ArrowUp", "Alt+ArrowDown"], "Move the focused row one place among its siblings (with onMove)"],
];

/**
 * Every key the tree answers, beside a tree that answers all of them. Try the arrows, Home / End, Alt+ArrowDown to move a row, and F2 then Escape.
 */
export const Keyboard: Story = {
    render: function Render() {
        const [items, setItems] = useState<TreeNodeData[]>(LAYERS);
        return (
            <Group align="flex-start" gap={24} wrap="nowrap">
                <Panel>
                    <Tree
                        items={items}
                        defaultExpanded={["frame"]}
                        onRename={(id, name) => setItems((list) => renameTreeItem(list, id, name))}
                        onMove={(move) => setItems((list) => moveTreeItem(list, move))}
                    />
                </Panel>
                <Table withRowBorders={false} verticalSpacing={2} style={{ width: "auto" }}>
                    <Table.Tbody>
                        {KEYS.map(([keys, what]) => (
                            <Table.Tr key={what}>
                                <Table.Td style={{ whiteSpace: "nowrap" }}>
                                    {keys.map((k, i) => (
                                        <React.Fragment key={k}>
                                            {i > 0 && " "}
                                            <Kbd>{k}</Kbd>
                                        </React.Fragment>
                                    ))}
                                </Table.Td>
                                <Table.Td>
                                    <Text size="xs">{what}</Text>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Group>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const checkout = canvas.getByRole("treeitem", { name: "Checkout" });
        checkout.focus();
        await userEvent.keyboard("{End}");
        await expect(canvas.getByRole("treeitem", { name: "Sticky note" })).toHaveFocus();
        await userEvent.keyboard("{Home}");
        await expect(checkout).toHaveFocus();
        await userEvent.keyboard("{ArrowDown}");
        const button = canvas.getByRole("treeitem", { name: "Button" });
        await expect(button).toHaveFocus();
        await expect(button).toHaveAttribute("aria-posinset", "1");
        // Alt+ArrowDown moves Button below Card, inside the same frame, and focus follows it.
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}");
        await waitFor(() => expect(canvas.getByRole("treeitem", { name: "Button" })).toHaveAttribute("aria-posinset", "2"));
        await expect(canvas.getByRole("treeitem", { name: "Button" })).toHaveFocus();
        await userEvent.keyboard("{F2}");
        await expect(canvas.getByRole("textbox", { name: "Layer name" })).toHaveFocus();
        await userEvent.keyboard("{Escape}");
        await expect(canvas.getByRole("treeitem", { name: "Button" })).toHaveFocus();
    },
};

/**
 * Expanded top-level rows stay pinned while their children scroll under them. The story opens scrolled into the Body frame, so its row is shown stuck over its children.
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
