import type {Meta, StoryObj} from "@storybook/react";

import {DataGrid} from "./DataGrid";
import {ViewDataModal} from "./ViewDataModal";

// =============================================================================
// DataGrid Stories
// =============================================================================

const dataGridMeta: Meta<typeof DataGrid> = {
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

export default dataGridMeta;
type DataGridStory = StoryObj<typeof dataGridMeta>;

/** Default nested object view with expand/collapse */
export const Default: DataGridStory = {
    args: {
        data: {user: {name: "John", profile: {age: 30, email: "john@example.com"}}},
        defaultExpandDepth: 2,
    },
};

/** Search and highlight functionality */
export const WithSearch: DataGridStory = {
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
export const ArrayOfObjects: DataGridStory = {
    args: {
        data: [
            {id: 1, name: "Alice", role: "Admin"},
            {id: 2, name: "Bob", role: "User"},
            {id: 3, name: "Charlie", role: "User"},
        ],
        defaultExpandDepth: 1,
    },
};

// =============================================================================
// ViewDataModal Stories
// =============================================================================

const viewDataModalMeta: Meta<typeof ViewDataModal> = {
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

type ViewDataModalStory = StoryObj<typeof viewDataModalMeta>;

/** Full-featured modal with rich metadata */
export const ModalDefault: ViewDataModalStory = {
    ... viewDataModalMeta,
    args: {
        ... viewDataModalMeta.args,
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
export const ModalEmpty: ViewDataModalStory = {
    ... viewDataModalMeta,
    args: {
        ... viewDataModalMeta.args,
        data: {nodes: [], edges: []},
    },
};
