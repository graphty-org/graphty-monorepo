import type { Meta, StoryObj } from "@storybook/react";

import { ViewDataModal } from "./ViewDataModal";

const meta: Meta<typeof ViewDataModal> = {
    title: "Components/DataView/ViewDataModal",
    component: ViewDataModal,
    parameters: {
        layout: "fullscreen",
    },
    decorators: [
        (Story) => (
            <div style={{ minHeight: "100vh", backgroundColor: "var(--mantine-color-dark-8)" }}>
                <Story />
            </div>
        ),
    ],
    args: {
        opened: true,
    },
    argTypes: {
        onClose: { action: "onClose" },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Full-featured modal with rich metadata */
export const Default: Story = {
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

/** Empty state handling */
export const Empty: Story = {
    args: {
        data: { nodes: [], edges: [] },
    },
};
