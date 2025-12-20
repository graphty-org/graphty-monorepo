import {Group, Modal, SegmentedControl, Stack, Text, TextInput} from "@mantine/core";
import {useDebouncedValue} from "@mantine/hooks";
import {Search} from "lucide-react";
import {useState} from "react";

import {standardModalStyles} from "../../utils/modal-styles";
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
    /** Whether to show copy button when a cell is selected. Defaults to true. */
    showCopyButton?: boolean;
}

type TabValue = "nodes" | "edges";

/**
 * Modal component for viewing all graph data in a tabbed interface.
 * Displays nodes and edges in separate tabs with a search input.
 */
export function ViewDataModal({
    opened,
    onClose,
    data,
    showCopyButton = true,
}: ViewDataModalProps): React.JSX.Element {
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
            styles={standardModalStyles}
        >
            <Stack gap="xs">
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
                    size="xs"
                    aria-label="Select data type to view"
                    styles={{
                        root: {
                            backgroundColor: "var(--mantine-color-default)",
                        },
                    }}
                />

                {/* Search Input */}
                <TextInput
                    placeholder="Search..."
                    aria-label="Search data"
                    size="xs"
                    value={searchText}
                    onChange={(e) => {
                        setSearchText(e.currentTarget.value);
                    }}
                    leftSection={<Search size={12} aria-hidden="true" />}
                    styles={{
                        input: {
                            backgroundColor: "var(--mantine-color-default)",
                            borderColor: "var(--mantine-color-default-border)",
                        },
                    }}
                />

                {/* Data Grid */}
                <div
                    style={{
                        maxHeight: "400px",
                        overflow: "auto",
                        border: "1px solid var(--mantine-color-default-border)",
                        borderRadius: "2px",
                    }}
                >
                    {currentData.length > 0 ? (
                        <DataGrid
                            data={currentData}
                            defaultExpandDepth={1}
                            searchText={debouncedSearch || undefined}
                            showCopyButton={showCopyButton}
                        />
                    ) : (
                        <Text c="dimmed" ta="center" py="xl">
                            No {activeTab} to display
                        </Text>
                    )}
                </div>

                {/* Footer with item counts */}
                <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                        {nodeCount} {nodeCount === 1 ? "node" : "nodes"} ·{" "}
                        {edgeCount} {edgeCount === 1 ? "edge" : "edges"}
                    </Text>
                </Group>
            </Stack>
        </Modal>
    );
}
