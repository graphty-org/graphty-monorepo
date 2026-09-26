import { ActionIcon, Stack, Tabs, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { QuickActions, type QuickActionsProps } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { actions, visualSearchIcon } from "./fixtures";

/**
 * The palette as Figma draws it: pill scope tabs under the search, a trailing visual-search
 * button in the field, and the rows filtered by the chosen scope.
 * @param props - QuickActions props
 * @returns The palette with its scope tabs
 */
function Palette(props: QuickActionsProps): React.JSX.Element {
    const [scope, setScope] = useState<string | null>("all");
    const scopes: Record<string, QuickActionsProps["actions"]> = {
        all: props.actions,
        assets: [],
        plugins: props.actions.filter((a) => a.section === "Plugins & widgets"),
    };
    const shown = scopes[scope ?? "all"];
    return (
        <QuickActions
            {...props}
            actions={shown}
            searchAction={
                <ActionIcon aria-label="Visual search" onClick={fn()}>
                    {visualSearchIcon}
                </ActionIcon>
            }
            header={
                <Tabs value={scope} onChange={setScope}>
                    <Tabs.List aria-label="Search in">
                        <Tabs.Tab value="all">All</Tabs.Tab>
                        <Tabs.Tab value="assets">Assets</Tabs.Tab>
                        <Tabs.Tab value="plugins">Plugins &amp; widgets</Tabs.Tab>
                    </Tabs.List>
                </Tabs>
            }
        />
    );
}

/**
 * The quick actions palette: a search field over a list of every command, filtered as the reader
 * types, run with Enter.
 *
 * ## When to use it
 *
 * Reach for `QuickActions` for a command palette (Ctrl+K): many commands, found by name rather
 * than by where they live in the menus. Reach for `SearchInput` to filter a list that stays on
 * screen, and for the `Select` page's searchable Select to pick one value for a field.
 *
 * ## Usage
 *
 * ```tsx
 * import { QuickActions, type QuickAction } from "@graphty/compact-mantine";
 *
 * const actions: QuickAction[] = [
 *     { value: "rename", label: "Rename layers...", section: "Design tools", shortcut: "Ctrl+R" },
 *     { value: "align-left", label: "Align left", section: "Design tools", disabled: true },
 * ];
 *
 * {open && <QuickActions actions={actions} onRun={run} onClose={() => setOpen(false)} />}
 * ```
 *
 * An action is `{ value, label, icon?, shortcut?, section?, keywords?, disabled? }`. Sections
 * appear in the order of their first action; a search lists its results flat. `filter` replaces
 * the default match (a case-insensitive substring of the name or a keyword); `query` and
 * `onQueryChange` control the search text. `header` takes a row under the search, such as scope
 * `Tabs`; `searchAction` takes an `ActionIcon` for the end of the field. The caller positions the
 * palette and decides when it is open (mount it to open it).
 *
 * ## Keyboard and accessibility
 *
 * - Focus goes to the search field on open. Typing filters; the first match is highlighted.
 * - ArrowUp / ArrowDown move the highlight, skipping disabled rows, while focus stays in the
 *   field: the field is a `role="combobox"` whose `aria-activedescendant` names the highlighted
 *   `role="option"` of a `role="listbox"`.
 * - Enter runs the highlighted action (`onRun`); a click runs a row; Escape calls `onClose`.
 * - The panel is a `role="dialog"` named "Quick actions" by default. While there is search text
 *   the field's trailing button is a "Clear search" button.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Panel | 529 x 354 by default (`width`, `height`), radius 13, elevation 200 |
 * | Search field | 32 tall, 8px inset, 13/24 text |
 * | Section heading | 11/16 450, secondary text, inset 16 |
 * | Row | 32 tall, padding 0 4, radius 5, 32 x 32 icon slot, 13/24 label, 11/24 shortcut |
 */
const meta: Meta<typeof QuickActions> = {
    title: "Components/App shell/QuickActions",
    component: QuickActions,
    tags: ["autodocs"],
    args: { actions, onRun: fn(), onClose: fn() },
    argTypes: { actions: { control: false } },
    render: (args) => <Palette {...args} />,
};

export default meta;
type Story = StoryObj<typeof QuickActions>;

/** Open: the first row highlighted, focus in the search, the All scope chosen. */
export const Default: Story = {};

/** Open, searching (results listed flat), disabled rows, and nothing matching. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: (args) => (
        <Stack gap={16}>
            {(
                [
                    ["open", undefined],
                    ["searching", "image"],
                    ["disabled rows", "align"],
                    ["no results", "zzz"],
                ] as const
            ).map(([name, query]) => (
                <Stack key={name} gap={4}>
                    <Text size="xs">{name}</Text>
                    <QuickActions {...args} query={query} height={name === "open" ? undefined : 160} />
                </Stack>
            ))}
        </Stack>
    ),
};

/** A search with results: the field's trailing button becomes the clear button. */
export const Results: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByRole("combobox"), "align");
        await expect(canvas.getByRole("button", { name: "Clear search" })).toBeVisible();
    },
};

/** The Plugins & widgets scope, chosen from the header's tabs. */
export const PluginsScope: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("tab", { name: "Plugins & widgets" }));
        await expect(canvas.getByRole("option", { name: "Browse plugins" })).toBeVisible();
    },
};

/** Nothing matches the search. */
export const Empty: Story = {
    args: { query: "zzz" },
};

/** Keyboard: typing filters, ArrowDown moves the highlight past the disabled rows, Enter runs. */
export const Keyboard: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole("combobox");
        await userEvent.type(input, "e");
        await userEvent.keyboard("{ArrowDown}");
        const highlighted = canvasElement.querySelector(`#${CSS.escape(input.getAttribute("aria-activedescendant") ?? "")}`);
        await expect(highlighted).not.toHaveAttribute("aria-disabled");
        await userEvent.keyboard("{Enter}");
        await expect(args.onRun).toHaveBeenCalled();
    },
};
