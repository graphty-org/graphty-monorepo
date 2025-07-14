import {Box, Group, Text} from "@mantine/core";
import {Settings} from "lucide-react";
import React from "react";

interface RightSidebarProps {
    className?: string;
    style?: React.CSSProperties;
}

export function RightSidebar({className, style}: RightSidebarProps): React.JSX.Element {
    return (
        <Box
            component="aside"
            className={className}
            style={{
                backgroundColor: "var(--mantine-color-dark-7)",
                borderLeft: "1px solid var(--mantine-color-dark-5)",
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
                    <Settings size={16} />
                    <Text size="sm" fw={500} c="gray.1">
                        Design Properties
                    </Text>
                </Group>
            </Box>

            {/* Sidebar Content */}
            <Box style={{flex: 1, padding: "16px"}}>
                <Box style={{textAlign: "center", paddingTop: "32px", paddingBottom: "32px"}}>
                    <Box style={{display: "flex", justifyContent: "center", marginBottom: "8px"}}>
                        <Settings size={32} style={{color: "var(--mantine-color-dark-3)"}} />
                    </Box>
                    <Text size="sm" c="gray.5">
                        Property panels
                    </Text>
                    <Text size="sm" c="gray.5">
                        coming soon...
                    </Text>
                </Box>
            </Box>
        </Box>
    );
}
