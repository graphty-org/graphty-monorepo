import { ActionIcon, Box, Collapse, Group, Text, Tooltip } from "@mantine/core";
import { Check, ChevronDown, ChevronRight, Clipboard, Database } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { DataGrid } from "./DataGrid";

export interface DataAccordionProps {
    /** The data to display in the accordion. When null, shows placeholder text. */
    data: Record<string, unknown> | null;
    /** Custom title for the accordion header. Defaults to "Data". */
    title?: string;
}

/**
 * DataAccordion is a collapsible accordion component that displays JSON data.
 * It wraps the DataGrid component and provides:
 * - Expandable/collapsible header
 * - "Copy All" button to copy entire JSON to clipboard
 * - Placeholder state when no data is selected
 *
 * Designed to fit in narrow sidebars (300px width).
 *
 * This component is wrapped with React.memo for performance optimization.
 */
export const DataAccordion = React.memo(function DataAccordion({
    data,
    title = "Data",
}: DataAccordionProps): React.JSX.Element {
    const [isExpanded, setIsExpanded] = useState(true);
    const [copied, setCopied] = useState(false);

    // Reset copied state after a delay
    useEffect(() => {
        if (!copied) {
            return undefined;
        }

        const timer = setTimeout(() => {
            setCopied(false);
        }, 1500);

        return () => {
            clearTimeout(timer);
        };
    }, [copied]);

    const handleToggle = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const handleCopyAll = useCallback(
        (event: React.MouseEvent) => {
            event.stopPropagation();
            if (!data) {
                return;
            }

            const jsonString = JSON.stringify(data, null, 2);
            void navigator.clipboard.writeText(jsonString).then(() => {
                setCopied(true);
            });
        },
        [data],
    );

    return (
        <Box
            style={{
                borderTop: "1px solid var(--mantine-color-default-border)",
            }}
        >
            {/* Accordion Header */}
            <Box
                onClick={handleToggle}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleToggle();
                    }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`${title} section, ${isExpanded ? "expanded" : "collapsed"}`}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    cursor: "pointer",
                    userSelect: "none",
                    backgroundColor: "var(--mantine-color-default-hover)",
                }}
            >
                <Group gap={4}>
                    {isExpanded ? (
                        <ChevronDown size={12} aria-hidden="true" />
                    ) : (
                        <ChevronRight size={12} aria-hidden="true" />
                    )}
                    <Database size={12} aria-hidden="true" />
                    <Text size="xs" fw={500}>
                        {title}
                    </Text>
                </Group>

                {/* Copy All Button */}
                {data && (
                    <Tooltip label={copied ? "Copied!" : "Copy all data"} position="left" withArrow>
                        <ActionIcon
                            variant="subtle"
                            color={copied ? "green" : "gray"}
                            size="compact"
                            onClick={handleCopyAll}
                            aria-label="Copy all data"
                        >
                            {copied ? <Check size={12} /> : <Clipboard size={12} />}
                        </ActionIcon>
                    </Tooltip>
                )}
            </Box>

            {/* Accordion Content */}
            <Collapse in={isExpanded}>
                <Box
                    style={{
                        padding: "8px 12px",
                        maxHeight: "300px",
                        overflowY: "auto",
                    }}
                >
                    {data ? (
                        <DataGrid data={data} defaultExpandDepth={1} showCopyButton={true} />
                    ) : (
                        <Box
                            style={{
                                textAlign: "center",
                                padding: "16px 12px",
                            }}
                        >
                            <Box style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
                                <Database
                                    size={18}
                                    style={{ color: "var(--mantine-color-dimmed)" }}
                                    aria-hidden="true"
                                />
                            </Box>
                            <Text size="xs" c="dimmed">
                                No element selected
                            </Text>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
});
