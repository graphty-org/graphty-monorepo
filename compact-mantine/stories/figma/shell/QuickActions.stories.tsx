import { ActionIcon, Tabs } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { QuickActions,type QuickActionsProps } from "../../../src";
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

const meta: Meta<typeof QuickActions> = {
    title: "Figma/Shell/QuickActions",
    component: QuickActions,
    args: { actions, onRun: fn(), onClose: fn() },
    render: (args) => <Palette {...args} />,
};

export default meta;
type Story = StoryObj<typeof QuickActions>;

/** Open: the first row highlighted, focus in the search, the All scope chosen. */
export const Default: Story = {};

/** States: typing filters, ArrowDown moves the highlight (skipping the disabled rows), Enter runs. */
export const States: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole("combobox");
        await userEvent.type(input, "e");
        await userEvent.keyboard("{ArrowDown}");
        await userEvent.keyboard("{Enter}");
        await expect(args.onRun).toHaveBeenCalled();
    },
};

/** A search with results: the field's trailing button becomes the clear button. */
export const Results: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getByRole("combobox"), "align");
        await expect(canvas.getByRole("button", { name: "Clear search" })).toBeVisible();
    },
};

/** The Plugins & widgets scope. */
export const PluginsScope: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole("tab", { name: "Plugins & widgets" }));
    },
};

/** Nothing matches the search. */
export const Empty: Story = {
    args: { query: "zzz" },
};
