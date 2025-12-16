import type {Meta, StoryObj} from "@storybook/react";

import {ViewDataModal} from "./ViewDataModal";

const meta: Meta<typeof ViewDataModal> = {
    title: "Components/DataView/ViewDataModal",
    component: ViewDataModal,
    parameters: {
        layout: "fullscreen",
    },
    decorators: [
        (Story) => (
            <div style={{minHeight: "100vh", backgroundColor: "var(--mantine-color-dark-8)"}}>
                <Story />
            </div>
        ),
    ],
    args: {
        opened: true,
    },
    argTypes: {
        onClose: {action: "onClose"},
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSampleData: Story = {
    args: {
        data: {
            nodes: [
                {id: "1", label: "Start", metadata: {x: 0, y: 0}},
                {id: "2", label: "End", metadata: {x: 100, y: 100}},
            ],
            edges: [{src: "1", dst: "2", weight: 1.5}],
        },
    },
};

export const EmptyData: Story = {
    args: {
        data: {nodes: [], edges: []},
    },
};

export const LargeDataset: Story = {
    args: {
        data: {
            nodes: Array.from({length: 100}, (_, i) => ({
                id: `${i}`,
                label: `Node ${i}`,
                group: i % 5,
                metadata: {
                    x: Math.random() * 1000,
                    y: Math.random() * 1000,
                },
            })),
            edges: Array.from({length: 150}, (_, i) => ({
                src: `${i % 100}`,
                dst: `${(i + 1) % 100}`,
                weight: Math.random(),
            })),
        },
    },
};

export const RichMetadata: Story = {
    args: {
        data: {
            nodes: [
                {
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
                {
                    id: "person-2",
                    label: "Bob Johnson",
                    type: "person",
                    attributes: {
                        age: 28,
                        email: "bob@example.com",
                        roles: ["developer"],
                        settings: {
                            notifications: false,
                            theme: "light",
                        },
                    },
                },
            ],
            edges: [
                {
                    src: "person-1",
                    dst: "person-2",
                    type: "works_with",
                    since: "2022-01-15",
                    strength: 0.85,
                },
            ],
        },
    },
};

export const NodesOnly: Story = {
    args: {
        data: {
            nodes: [
                {id: "1", label: "Node A"},
                {id: "2", label: "Node B"},
                {id: "3", label: "Node C"},
            ],
            edges: [],
        },
    },
};

export const EdgesOnly: Story = {
    args: {
        data: {
            nodes: [],
            edges: [
                {src: "a", dst: "b", weight: 1},
                {src: "b", dst: "c", weight: 2},
            ],
        },
    },
};
