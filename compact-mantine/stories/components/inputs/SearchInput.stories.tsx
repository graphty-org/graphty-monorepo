import { ActionIcon, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import { SearchInput, UiGlyph } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * A search field: a filled 24px text box with a magnifier, a clear button once there is text,
 * and Escape to clear.
 *
 * ## When to use it
 *
 * Reach for `SearchInput` for a field that filters or finds something -- layers, a library, a
 * list of actions. Reach for Mantine's `TextInput` for any other free text: `SearchInput` is a
 * `TextInput` that adds the leading magnifier, the clear button, Escape-to-clear, a
 * `type="search"` input and a default accessible name. `size="lg"` is the 32px field at the top
 * of a quick-actions palette.
 *
 * ## Usage
 *
 * ```tsx
 * import { SearchInput } from "@graphty/compact-mantine";
 *
 * const [query, setQuery] = useState("");
 * <SearchInput value={query} onChange={setQuery} placeholder="Search layers" />
 * ```
 *
 * `onChange(text, event?)` fires on every keystroke and on clear. `rightSection` joins one 24px
 * control to the field's end (a filter or settings button). `autoFocus` is off by default; turn
 * it on when the field is the first thing a panel is opened for.
 *
 * ## Keyboard and accessibility
 *
 * - Escape with text clears it and keeps focus; Escape on an empty field is left to bubble, so an
 *   enclosing popover or dialog can close.
 * - The input is `role="searchbox"`. Without a `label` or `aria-label` it is named from the
 *   `search` label ("Search"); the clear button is named from `clearSearch` ("Clear search", or
 *   `clearLabel`). Both are translatable through `LabelsProvider`.
 * - The clear button does not take focus from the field when pressed.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px (`size="lg"`: 32px with 13/24 text) |
 * | Radius | 5px (joined: `5px 0 0 5px` on the field, `0 5px 5px 0` on the control, 1px apart) |
 * | Magnifier | 16px in a 24px leading slot |
 * | Clear button | 16px in a 24px trailing slot |
 * | Focus ring | 1px at offset 0, lingering 100ms after blur |
 */
const meta: Meta<typeof SearchInput> = {
    title: "Components/Inputs/SearchInput",
    component: SearchInput,
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

/** A search field at rest with its placeholder. */
export const Default: Story = {
    args: { placeholder: "Search all libraries", w: 180 },
};

/**
 * Every state, light and dark side by side: rest, hover and focus (forced with `data-state`),
 * with text and its clear button, disabled, the 32px quick-actions size, and the joined form.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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
                            <SearchInput
                                placeholder="Search"
                                rightSection={
                                    <ActionIcon variant="subtle" aria-label="Search settings">
                                        <UiGlyph name="settings" />
                                    </ActionIcon>
                                }
                            />
                        </div>
                    ),
                },
            ]}
        />
    ),
    // Figma's search field draws no hover (design/figma-spec.md 6.2).
    play: ({ canvasElement }) => expectStatesApply(canvasElement, { unchanged: ['input[data-state="hover"]'] }),
};

/** Driven from your own state: the text below the field is what `onChange` reported. */
export const Controlled: Story = {
    render: function ControlledStory() {
        const [query, setQuery] = useState("");
        return (
            <Stack gap="xs" w={180}>
                <SearchInput value={query} onChange={setQuery} placeholder="Search layers" />
                <Text size="xs" c="dimmed">{`query: "${query}"`}</Text>
            </Stack>
        );
    },
};

/**
 * Keyboard: typing shows the clear button, Escape clears and the field keeps focus. The play
 * function checks each step and leaves a typed search on screen.
 */
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
