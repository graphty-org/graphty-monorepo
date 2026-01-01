import type { Meta, StoryObj } from "@storybook/react";

import { CopyButton } from "./CopyButton";

const meta: Meta<typeof CopyButton> = {
    title: "Components/DataView/CopyButton",
    component: CopyButton,
    parameters: {
        layout: "centered",
    },
    decorators: [
        (Story) => (
            <div style={{ padding: "2rem", backgroundColor: "var(--mantine-color-dark-7)" }}>
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
