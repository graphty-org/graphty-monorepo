import {Box, Group, Text} from "@mantine/core";
import {Folder, Layers} from "lucide-react";
import React from "react";

interface LeftSidebarProps {
    className?: string;
    style?: React.CSSProperties;
}

export function LeftSidebar({className, style}: LeftSidebarProps): React.JSX.Element {
    return (
        <Box
            component="aside"
            className={className}
            style={{
                backgroundColor: "var(--mantine-color-dark-7)",
                borderRight: "1px solid var(--mantine-color-dark-5)",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                color: "var(--mantine-color-gray-1)",
                ... style,
            }}
        >
            {/* Sidebar Header */}
            <Box
                style={{
                    padding: "16px",
                    borderBottom: "1px solid var(--mantine-color-dark-5)",
                }}
            >
                <Group gap="xs">
                    <Layers size={16} />
                    <Text size="sm" fw={500} c="gray.1">
                        Layers
                    </Text>
                </Group>
            </Box>

            {/* Sidebar Content */}
            <Box style={{flex: 1, padding: "16px"}}>
                <Box style={{textAlign: "center", paddingTop: "32px", paddingBottom: "32px"}}>
                    <Box style={{display: "flex", justifyContent: "center", marginBottom: "8px"}}>
                        <Folder size={32} style={{color: "var(--mantine-color-dark-3)"}} />
                    </Box>
                    <Text size="sm" c="gray.5">
                        Layer management
                    </Text>
                    <Text size="sm" c="gray.5">
                        coming soon...
                    </Text>
                </Box>
            </Box>
        </Box>
    );
}
