import {ActionIcon, Box, Collapse, Group, Text, Tooltip} from "@mantine/core";
import {Check, ChevronDown, ChevronRight, Clipboard, Database} from "lucide-react";
import React, {useCallback, useEffect, useState} from "react";

import {DataGrid} from "./DataGrid";

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
export const DataAccordion = React.memo(function DataAccordion({data, title = "Data"}: DataAccordionProps): React.JSX.Element {
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
                borderTop: "1px solid var(--mantine-color-dark-5)",
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
                    padding: "12px 16px",
                    cursor: "pointer",
                    userSelect: "none",
                    backgroundColor: "var(--mantine-color-dark-6)",
                }}
            >
                <Group gap="xs">
                    {isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                    <Database size={16} aria-hidden="true" />
                    <Text size="sm" fw={500} c="gray.1">
                        {title}
                    </Text>
                </Group>

                {/* Copy All Button */}
                {data && (
                    <Tooltip label={copied ? "Copied!" : "Copy all data"} position="left" withArrow>
                        <ActionIcon
                            variant="subtle"
                            color={copied ? "green" : "gray"}
                            size="sm"
                            onClick={handleCopyAll}
                            aria-label="Copy all data"
                        >
                            {copied ? <Check size={14} /> : <Clipboard size={14} />}
                        </ActionIcon>
                    </Tooltip>
                )}
            </Box>

            {/* Accordion Content */}
            <Collapse in={isExpanded}>
                <Box
                    style={{
                        padding: "12px 16px",
                        maxHeight: "400px",
                        overflowY: "auto",
                    }}
                >
                    {data ? (
                        <DataGrid
                            data={data}
                            defaultExpandDepth={1}
                            showCopyButton={true}
                        />
                    ) : (
                        <Box
                            style={{
                                textAlign: "center",
                                padding: "24px 16px",
                            }}
                        >
                            <Box style={{display: "flex", justifyContent: "center", marginBottom: "8px"}}>
                                <Database size={24} style={{color: "var(--mantine-color-dark-3)"}} aria-hidden="true" />
                            </Box>
                            <Text size="sm" c="gray.5">
                                No element selected
                            </Text>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
});
