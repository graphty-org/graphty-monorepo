import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import { QuickActions } from "../../../src";
import { actions } from "./fixtures";

const meta: Meta<typeof QuickActions> = {
    title: "Figma/Shell/QuickActions",
    component: QuickActions,
    args: { actions, onRun: fn(), onClose: fn() },
};

export default meta;
type Story = StoryObj<typeof QuickActions>;

/** Open: the first row highlighted, focus in the search. */
export const Default: Story = {};

/** States: typing filters, ArrowDown moves the highlight (skipping the disabled row), Enter runs. */
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

/** Nothing matches the search. */
export const Empty: Story = {
    args: { query: "zzz" },
};
