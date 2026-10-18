import { Code, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { formatValueForClipboard } from "./clipboard";
import { CopyButton } from "./CopyButton";

const meta: Meta<typeof CopyButton> = {
    title: "Components/DataView/CopyButton",
    tags: ["regression", "!dev", "!autodocs"],
    component: CopyButton,
    parameters: {
        layout: "centered",
    },
    // The button is an icon alone, so every story looked the same: each now shows, beside the
    // button, exactly what a click copies (and what Shift+click copies, when it has a path).
    render: (args) => (
        <Group gap="xs" align="flex-start">
            <CopyButton {...args} />
            <Stack gap={4}>
                <Text size="xs" c="dimmed">
                    Click copies
                </Text>
                <Code block>{formatValueForClipboard(args.value)}</Code>
                {args.path !== undefined && (
                    <>
                        <Text size="xs" c="dimmed">
                            Shift+click copies
                        </Text>
                        <Code block>{args.path}</Code>
                    </>
                )}
            </Stack>
        </Group>
    ),
    decorators: [
        (Story) => (
            <div style={{ padding: "2rem", backgroundColor: "var(--mantine-color-body)" }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Default copy button with string value */
export const Default: Story = {
    args: {
        value: "Hello, World!",
    },
};

/** Copy button with path for shift+click to copy JMESPath */
export const WithPath: Story = {
    args: {
        value: "test value",
        path: "nodes[0].label",
    },
};

/** Copy button with object value - shows JSON stringified */
export const ObjectValue: Story = {
    args: {
        value: { name: "John", age: 30, roles: ["admin", "user"] },
    },
};

/** Copy button with array value */
export const ArrayValue: Story = {
    args: {
        value: [1, 2, 3, 4, 5],
    },
};

/** Copy button with number value */
export const NumberValue: Story = {
    args: {
        value: 42,
    },
};

/** Copy button with boolean value */
export const BooleanValue: Story = {
    args: {
        value: true,
    },
};

/** Extra small size variant */
export const ExtraSmallSize: Story = {
    args: {
        value: "test",
        size: "xs",
    },
};

/** Large size variant */
export const LargeSize: Story = {
    args: {
        value: "test",
        size: "lg",
    },
};
