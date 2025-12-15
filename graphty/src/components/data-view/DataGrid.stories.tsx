import type {Meta, StoryObj} from "@storybook/react";

import {DataGrid} from "./DataGrid";

const meta: Meta<typeof DataGrid> = {
    title: "Components/DataView/DataGrid",
    component: DataGrid,
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <div style={{maxWidth: "600px", padding: "1rem"}}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FlatObject: Story = {
    args: {
        data: {name: "Test", count: 42, active: true},
    },
};

export const NestedObject: Story = {
    args: {
        data: {user: {name: "John", profile: {age: 30, email: "john@example.com"}}},
        defaultExpandDepth: 2,
    },
};

export const ArrayOfObjects: Story = {
    args: {
        data: [
            {id: 1, name: "Alice", role: "Admin"},
            {id: 2, name: "Bob", role: "User"},
            {id: 3, name: "Charlie", role: "User"},
        ],
        defaultExpandDepth: 1,
    },
};

export const WithSearch: Story = {
    args: {
        data: {name: "searchable", description: "This contains searchable text"},
        searchText: "search",
        defaultExpandDepth: 1,
    },
};

export const GraphNodeData: Story = {
    args: {
        data: {
            id: "node-1",
            label: "Start Node",
            metadata: {
                x: 100,
                y: 200,
                color: "#ff5500",
                tags: ["important", "start"],
            },
        },
        defaultExpandDepth: 2,
    },
};

export const LargeDataset: Story = {
    args: {
        data: Array.from({length: 50}, (_, i) => ({
            id: `item-${i}`,
            value: Math.random() * 100,
            nested: {a: i * 2, b: i * 3},
        })),
        defaultExpandDepth: 0,
    },
};

export const NarrowWidth: Story = {
    decorators: [
        (Story) => (
            <div style={{width: "300px", padding: "1rem"}}>
                <Story />
            </div>
        ),
    ],
    args: {
        data: {
            id: "narrow-test",
            longPropertyName: "value",
            nested: {deeply: {value: "test"}},
        },
        defaultExpandDepth: 2,
    },
};
