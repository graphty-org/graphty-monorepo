import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { UiGlyph } from "../../../src";
import { SearchInput } from "../../../src/components/inputs";
import { StateGrid } from "./StateGrid";

/**
 * The search field (design/figma-spec.md 6.2): filled, 24 tall, a 16px magnifier in a 24px slot, a
 * 16px clear button once there is text, and a 1px focus ring drawn flush with the field that
 * lingers 100ms after blur. `size="lg"` is the 32px quick-actions field.
 */
const meta: Meta<typeof SearchInput> = {
    title: "Figma/Inputs/SearchInput",
    component: SearchInput,
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {
    args: { placeholder: "Search all libraries", w: 180 },
};

/** Every state side by side; switch light / dark and the contrast mode in the toolbar. */
export const States: Story = {
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <SearchInput placeholder="Search all libraries" w={180} /> },
                { state: "hover", node: <SearchInput placeholder="Search all libraries" w={180} data-state="hover" /> },
                { state: "focus", node: <SearchInput placeholder="Search all libraries" w={180} data-state="focus" /> },
                { state: "with text", node: <SearchInput defaultValue="Frame" w={180} /> },
                { state: "disabled", node: <SearchInput placeholder="Search" w={180} disabled /> },
                { state: "lg (quick actions)", node: <SearchInput size="lg" placeholder="Search actions" w={320} /> },
                {
                    state: "joined",
                    node: (
                        <div style={{ width: 200 }}>
                            <SearchInput placeholder="Search" rightSection={<UiGlyph name="settings" />} />
                        </div>
                    ),
                },
            ]}
        />
    ),
};

/** Typing shows the clear button; Escape clears; the field keeps focus. */
export const TypeAndClear: Story = {
    args: { placeholder: "Search", w: 180 },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const box = canvas.getByRole("searchbox");
        await userEvent.click(box);
        await userEvent.keyboard("frame");
        await expect(canvas.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
        await userEvent.keyboard("{Escape}");
        await expect(box).toHaveValue("");
        await expect(box).toHaveFocus();
        // Type again, so the story rests on a typed search with its clear button.
        await userEvent.keyboard("sp");
        await expect(canvas.getByRole("button", { name: "Clear search" })).toBeVisible();
    },
};
