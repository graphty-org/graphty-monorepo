import type { Meta, StoryObj } from "@storybook/react";

import { DataAccordion } from "./DataAccordion";

const meta: Meta<typeof DataAccordion> = {
    title: "Components/DataView/DataAccordion",
    component: DataAccordion,
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <div style={{ width: "300px", backgroundColor: "var(--mantine-color-dark-7)" }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Accordion with node data */
export const WithNodeData: Story = {
    args: {
        data: { id: "1", label: "Node", x: 100, y: 200 },
    },
};

/** Accordion with no selection */
export const NoSelection: Story = {
    args: {
        data: null,
    },
};

/** Accordion at narrow width with deeply nested data */
export const NarrowWidth: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: "300px", backgroundColor: "var(--mantine-color-dark-7)" }}>
                <Story />
            </div>
        ),
    ],
    args: {
        data: { nested: { deeply: { value: "test" } } },
    },
};

/** Accordion with custom title */
export const CustomTitle: Story = {
    args: {
        data: { id: "edge-1", src: "a", dst: "b", weight: 1.5 },
        title: "Edge Properties",
    },
};

/** Accordion with complex graph node data */
export const ComplexNodeData: Story = {
    args: {
        data: {
            id: "person-1",
            label: "Alice Smith",
            type: "person",
            attributes: {
                age: 32,
                email: "alice@example.com",
                roles: ["admin", "developer"],
                settings: {
                    notifications: true,
                    theme: "dark",
                },
            },
        },
    },
};
