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

/** Flat object without nesting - displays simple key/value pairs */
export const FlatObject: Story = {
    args: {
        data: {name: "Test", count: 42, active: true},
        defaultExpandDepth: 1,
    },
};

/** Default nested object view with expand/collapse */
export const NestedObject: Story = {
    args: {
        data: {user: {name: "John", profile: {age: 30, email: "john@example.com"}}},
        defaultExpandDepth: 2,
    },
};

/** Search and highlight functionality */
export const WithSearch: Story = {
    args: {
        data: {
            name: "searchable",
            description: "This contains searchable text",
            nested: {also: "searchable here"},
        },
        searchText: "search",
        defaultExpandDepth: 2,
    },
};

/** Array of objects rendering */
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

/** DataGrid with copy button enabled - click a cell to show the copy button */
export const WithCopyButton: Story = {
    args: {
        data: {
            id: "node-1",
            label: "Example Node",
            metadata: {
                created: "2024-01-15",
                tags: ["important", "active"],
            },
        },
        defaultExpandDepth: 2,
        showCopyButton: true,
    },
};

/** Large dataset for performance testing */
export const LargeDataset: Story = {
    args: {
        data: Array.from({length: 100}, (_, i) => ({
            id: `item-${i}`,
            name: `Item ${i}`,
            value: Math.round(Math.random() * 1000),
        })),
        defaultExpandDepth: 0,
    },
};
