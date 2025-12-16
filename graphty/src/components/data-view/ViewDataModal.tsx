import {Group, Modal, SegmentedControl, Stack, Text, TextInput} from "@mantine/core";
import {useDebouncedValue} from "@mantine/hooks";
import {Search} from "lucide-react";
import {useState} from "react";

import {DataGrid} from "./DataGrid";

export interface ViewDataModalProps {
    /** Whether the modal is open */
    opened: boolean;
    /** Callback when the modal is closed */
    onClose: () => void;
    /** The graph data to display */
    data: {
        nodes: Record<string, unknown>[];
        edges: Record<string, unknown>[];
    };
}

type TabValue = "nodes" | "edges";

/**
 * Modal component for viewing all graph data in a tabbed interface.
 * Displays nodes and edges in separate tabs with a search input.
 */
export function ViewDataModal({opened, onClose, data}: ViewDataModalProps): React.JSX.Element {
    const [activeTab, setActiveTab] = useState<TabValue>("nodes");
    const [searchText, setSearchText] = useState("");
    const [debouncedSearch] = useDebouncedValue(searchText, 300);

    const currentData = activeTab === "nodes" ? data.nodes : data.edges;

    const nodeCount = data.nodes.length;
    const edgeCount = data.edges.length;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="View Data"
            size="xl"
            centered
            styles={{
                header: {
                    backgroundColor: "var(--mantine-color-dark-7)",
                    borderBottom: "1px solid var(--mantine-color-dark-5)",
                },
                body: {
                    backgroundColor: "var(--mantine-color-dark-7)",
                    padding: "20px",
                },
                content: {
                    backgroundColor: "var(--mantine-color-dark-7)",
                },
                title: {
                    color: "var(--mantine-color-gray-1)",
                    fontWeight: 500,
                },
            }}
        >
            <Stack gap="md">
                {/* Tabs for Nodes/Edges */}
                <SegmentedControl
                    value={activeTab}
                    onChange={(value) => {
                        setActiveTab(value as TabValue);
                    }}
                    data={[
                        {value: "nodes", label: "Nodes"},
                        {value: "edges", label: "Edges"},
                    ]}
                    fullWidth
                    styles={{
                        root: {
                            backgroundColor: "var(--mantine-color-dark-6)",
                        },
                    }}
                />

                {/* Search Input */}
                <TextInput
                    placeholder="Search..."
                    value={searchText}
                    onChange={(e) => {
                        setSearchText(e.currentTarget.value);
                    }}
                    leftSection={<Search size={14} />}
                    styles={{
                        input: {
                            backgroundColor: "var(--mantine-color-dark-6)",
                            borderColor: "var(--mantine-color-dark-5)",
                        },
                    }}
                />

                {/* Data Grid */}
                <div
                    style={{
                        maxHeight: "400px",
                        overflow: "auto",
                        border: "1px solid var(--mantine-color-dark-5)",
                        borderRadius: "4px",
                    }}
                >
                    {currentData.length > 0 ? (
                        <DataGrid
                            data={currentData}
                            defaultExpandDepth={1}
                            searchText={debouncedSearch || undefined}
                        />
                    ) : (
                        <Text c="gray.5" ta="center" py="xl">
                            No {activeTab} to display
                        </Text>
                    )}
                </div>

                {/* Footer with item counts */}
                <Group justify="space-between">
                    <Text size="sm" c="gray.5">
                        {nodeCount} {nodeCount === 1 ? "node" : "nodes"} ·{" "}
                        {edgeCount} {edgeCount === 1 ? "edge" : "edges"}
                    </Text>
                </Group>
            </Stack>
        </Modal>
    );
}
