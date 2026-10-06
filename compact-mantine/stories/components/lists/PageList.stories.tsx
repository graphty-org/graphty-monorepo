import { ActionIcon, Group, Menu, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { PageList, PageRow, UiGlyph } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { Panel } from "./fixtures";

const PAGES = [
    { id: "p1", name: "Page 1" },
    { id: "p2", name: "LS second page" },
    { id: "d", name: "---", divider: true },
    { id: "p3", name: "LS third page" },
];

/**
 * A flat list of pages with one current page: Figma's page list. The same rows with
 * `tone="group"` are a collection list, where one group is selected.
 *
 * ## When to use it
 *
 * Reach for `PageList` when the reader switches between a handful of flat, named places (pages,
 * collections, saved views) and exactly one is on screen. Reach for `Tree` when the rows nest,
 * when several can be selected, or when the reader reorders them; a flat, reorderable list is a
 * Tree with no children. Reach for `DataRow` when the row is a reading rather than a place.
 *
 * `PageRow` is one row on its own, for a static preview; `PageList` draws the rows with the
 * keyboard model.
 *
 * ## Usage
 *
 * ```tsx
 * import { PageList } from "@graphty/compact-mantine";
 *
 * <PageList
 *     items={[
 *         { id: "p1", name: "Page 1" },
 *         { id: "d", name: "---", divider: true },
 *         { id: "p2", name: "Page 2" },
 *     ]}
 *     current={page}
 *     onCurrentChange={setPage}
 *     onRename={(id, name) => renamePage(id, name)}
 * />
 * ```
 *
 * ## A second line, a value and a row menu
 *
 * An item can carry a `value` at the end of its name's line (a size, a count), a `description`
 * on a second line (a time, a hint, or with `descriptionTone="danger"` an error), and a `menu`:
 * the row's own control, drawn in a cell after the row so a click on it never switches. The
 * row is named by its visible text; name the menu button after the row.
 *
 * ```tsx
 * {
 *     id: "les",
 *     name: "Les Miserables",
 *     value: "77 nodes",
 *     description: "This file can no longer be read",
 *     descriptionTone: "danger",
 *     menu: <RecentMenu file={file} />,
 * }
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - A one-column `grid` with one Tab stop, named by `label` (default "Pages").
 * - ArrowUp / ArrowDown / Home / End move focus without switching; dividers are skipped.
 * - Enter, Space or a click switches; the current page carries `aria-current="page"`. In the
 *   group look the selected group carries `aria-selected`.
 * - F2 or a double-click renames while `onRename` is given (field named by `renameLabel`,
 *   default "Page name"). Enter commits, Escape cancels.
 * - ArrowRight moves into a row's `menu`, ArrowLeft back to the row.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Cell | 240 x 32, padding 4 8 |
 * | Pill | 224 x 24, radius 5, text 16px in at 11px on a 24px line |
 * | Current | gray fill, weight 550 (no blue) |
 * | Group selected | blue fill, weight 600 |
 * | Divider | a 208 x 1 line |
 * | Focus ring | 1px on the whole 240 x 32 cell, radius 5 |
 */
const meta: Meta<typeof PageList> = {
    title: "Components/Lists and trees/PageList",
    component: PageList,
    subcomponents: { PageRow },
    tags: ["autodocs"],
    parameters: { layout: "padded" },
    argTypes: {
        items: { control: false },
    },
};

export default meta;
type Story = StoryObj<typeof PageList>;

/** Four pages and a divider, the first current. Every prop is in the Controls table. */
export const Default: Story = {
    args: {
        items: PAGES,
        defaultCurrent: "p1",
        label: "Pages",
        tone: "page",
        onCurrentChange: fn(),
    },
    render: (args) => (
        <Panel>
            <PageList {...args} />
        </Panel>
    ),
};

/** Rest, hover, current, hover on current, keyboard focus, a divider, and the group look, light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group align="flex-start" gap={24}>
            <Stack gap={16}>
                <Panel label="rest, hover">
                    <div role="grid" aria-label="Rest and hover">
                        <PageRow name="LS second page" tabIndex={-1} />
                        <PageRow name="LS third page" tabIndex={-1} data-state="hover" />
                    </div>
                </Panel>
                <Panel label="current, current + hover">
                    <div role="grid" aria-label="Current">
                        <PageRow name="Page 1" current tabIndex={-1} />
                        <PageRow name="Page 1" current tabIndex={-1} data-state="hover" />
                    </div>
                </Panel>
            </Stack>
            <Stack gap={16}>
                <Panel label="keyboard focus, divider">
                    <div role="grid" aria-label="Focus and divider">
                        <PageRow name="Page 1" current tabIndex={-1} data-state="focus" />
                        <PageRow name="---" divider tabIndex={-1} />
                    </div>
                </Panel>
                <Panel label="group (collections): rest, selected">
                    <div role="grid" aria-label="Groups">
                        <PageRow name="brand" tone="group" tabIndex={-1} />
                        <PageRow name="neutrals" tone="group" selected tabIndex={-1} />
                    </div>
                </Panel>
            </Stack>
        </Group>
    ),
    // Figma hovers the current page in the same #f5f5f5 it rests in.
    play: ({ canvasElement }) =>
        expectStatesApply(canvasElement, { unchanged: ['.cm-page-cell[aria-current="page"][data-state="hover"]'] }),
};

/** A working list: arrows move focus, Enter switches, F2 or a double-click renames. */
export const Playground: Story = {
    render: function Render() {
        const [pages, setPages] = useState(PAGES);
        return (
            <Panel>
                <PageList
                    items={pages}
                    defaultCurrent="p1"
                    onRename={(id, name) => setPages((list) => list.map((p) => (p.id === id ? { ...p, name } : p)))}
                />
            </Panel>
        );
    },
    play: async ({ canvasElement }) => {
        const cells = within(canvasElement).getAllByRole("gridcell");
        cells[0].focus();
        await userEvent.keyboard("{ArrowDown}");
        await expect(cells[1]).toHaveFocus();
        await expect(cells[0]).toHaveAttribute("aria-current", "page");
        await userEvent.keyboard("{Enter}");
        await expect(cells[1]).toHaveAttribute("aria-current", "page");
    },
};

/** `tone="group"`: a collection list, where the current entry is drawn as a selected group. */
export const CollectionGroups: Story = {
    render: () => (
        <Panel>
            <PageList
                tone="group"
                label="Collections"
                defaultCurrent="neutrals"
                items={[
                    { id: "brand", name: "brand" },
                    { id: "neutrals", name: "neutrals" },
                    { id: "spacing", name: "spacing" },
                ]}
            />
        </Panel>
    ),
};

/**
 * A recent-files list: each row has a size, a second line (one an error, in the danger ink) and
 * a "More" menu of its own.
 */
export const SecondLineValueAndMenu: Story = {
    render: () => {
        const more = (name: string): React.JSX.Element => (
            <Menu position="bottom-end">
                <Menu.Target>
                    <ActionIcon variant="subtle" aria-label={`More for ${name}`}>
                        <UiGlyph name="more" />
                    </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item>Locate...</Menu.Item>
                    <Menu.Item>Remove from list</Menu.Item>
                </Menu.Dropdown>
            </Menu>
        );
        return (
            <Panel>
                <PageList
                    label="Recent projects"
                    items={[
                        {
                            id: "les",
                            name: "Les Miserables",
                            value: "77 nodes",
                            description: "Saved 2 minutes ago",
                            menu: more("Les Miserables"),
                        },
                        {
                            id: "karate",
                            name: "Karate club",
                            value: "34 nodes",
                            description: "This file can no longer be read",
                            descriptionTone: "danger",
                            menu: more("Karate club"),
                        },
                    ]}
                />
            </Panel>
        );
    },
};
