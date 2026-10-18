import { NativeSelect, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Mantine's `NativeSelect` under the compact theme: the browser's own drop-down, drawn as the same
 * outlined 24px trigger as `Select`. These stories sit on the Select page; its description says
 * when to use which.
 *
 * The file is named SelectNative so that it sorts after Select.stories.tsx: stories that share a
 * title appear in the order their files are read, and the Select page opens with Select's Default.
 */
const meta: Meta<typeof NativeSelect> = {
    title: "Components/Inputs/Select",
    // The component id from before this file moved under Select, so every story id (and its
    // approved screenshot) stays the same.
    id: "compact-theme-mantine-components-nativeselect",
    component: NativeSelect,
    // The Select page is the one Docs page for this title (Select.stories.tsx declares it).
    tags: ["!autodocs"],
    args: {
        w: 200,
        data: ["Force-directed", "Circular", "Grid"],
    },
};

export default meta;
type Story = StoryObj<typeof NativeSelect>;

// The plain and disabled native select are already on the Select page (its Native and States
// stories), so these two are kept as regression stories: captured and tested, not in the sidebar.
export const Default: Story = {
    name: "Native select",
    tags: ["regression", "!dev", "!autodocs"],
    args: {
        label: "Layout",
    },
};

export const Disabled: Story = {
    name: "Native select, disabled",
    tags: ["regression", "!dev", "!autodocs"],
    args: {
        label: "Layout",
        disabled: true,
    },
};

/** Every size token, so each row visibly steps up: 20, 24, 30, 36, 44px. */
export const Sizes: Story = {
    name: "Native select sizes",
    render: (args) => (
        <Stack gap={8}>
            {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                <NativeSelect key={size} {...args} size={size} label={size} />
            ))}
        </Stack>
    ),
};
