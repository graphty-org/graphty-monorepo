import {Box, Tooltip, useMantineColorScheme} from "@mantine/core";
import JSONGrid, {type keyPathNode} from "@redheadphone/react-json-grid";
import React, {useCallback, useEffect, useRef, useState} from "react";

import {CopyButton} from "./CopyButton";
import {mantineJsonGridDarkTheme, mantineJsonGridLightTheme} from "./mantineTheme";
import {getValueAtPath, keyPathToJMESPath} from "./pathUtils";

/**
 * Formats a value for copying to clipboard.
 */
function formatValueForClipboard(value: unknown): string {
    if (value === null) {
        return "null";
    }

    if (value === undefined) {
        return "undefined";
    }

    if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
        return value.toString();
    }

    if (typeof value === "symbol") {
        return value.toString();
    }

    return typeof value === "function" ? "[Function]" : "[Unknown]";
}

export type {keyPathNode};

/**
 * Gets the color scheme from the DOM data-mantine-color-scheme attribute.
 */
function getSchemeFromDOM(): "light" | "dark" | null {
    if (typeof document === "undefined") {
        return null;
    }

    const scheme = document.documentElement.getAttribute("data-mantine-color-scheme");
    if (scheme === "light" || scheme === "dark") {
        return scheme;
    }

    return null;
}

/**
 * Hook that detects the actual Mantine color scheme.
 * Uses the Mantine hook first, then falls back to reading DOM attribute.
 */
function useActualColorScheme(fallback: "light" | "dark" = "dark"): "light" | "dark" {
    const {colorScheme: mantineScheme} = useMantineColorScheme();
    const [domScheme, setDomScheme] = useState<"light" | "dark" | null>(() => getSchemeFromDOM());

    useEffect(() => {
        // Update immediately
        setDomScheme(getSchemeFromDOM());

        // Observe changes to the attribute
        const observer = new MutationObserver(() => {
            setDomScheme(getSchemeFromDOM());
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-mantine-color-scheme"],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    // Prefer DOM attribute (set by forceColorScheme), then Mantine hook, then fallback
    if (domScheme) {
        return domScheme;
    }

    if (mantineScheme === "light" || mantineScheme === "dark") {
        return mantineScheme;
    }

    return fallback;
}

export interface DataGridProps {
    /** The JSON data to display in the grid */
    data: object;
    /** How many levels deep to expand by default (0 = collapsed, 1 = first level, etc.) */
    defaultExpandDepth?: number;
    /** Text to search for and highlight in the grid */
    searchText?: string;
    /** Callback fired when a cell is selected, receives the key path to the value */
    onSelect?: (keyPath: keyPathNode[]) => void;
    /** Whether to show a copy button when a cell is selected */
    showCopyButton?: boolean;
}

interface Selection {
    keyPath: keyPathNode[];
    value: unknown;
    jmesPath: string;
}

/**
 * DataGrid wraps @redheadphone/react-json-grid with Mantine-themed styling.
 * It provides a table-based view of JSON data with expand/collapse, search, and selection.
 * Automatically adapts to the current Mantine color scheme (light/dark).
 *
 * When `showCopyButton` is true, selecting a cell will display a sticky copy button
 * that allows copying the value or JMESPath to the clipboard.
 * Users can also press Ctrl+C (Cmd+C on Mac) to copy the selected value.
 *
 * This component is wrapped with React.memo for performance optimization.
 */
export const DataGrid = React.memo(function DataGrid({
    data,
    defaultExpandDepth = 0,
    searchText,
    onSelect,
    showCopyButton = false,
}: DataGridProps): React.JSX.Element {
    const colorScheme = useActualColorScheme("dark");
    const theme = colorScheme === "light" ? mantineJsonGridLightTheme : mantineJsonGridDarkTheme;

    const [selection, setSelection] = useState<Selection | null>(null);
    const [keyboardCopyFeedback, setKeyboardCopyFeedback] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSelect = useCallback(
        (keyPath: keyPathNode[]) => {
            if (showCopyButton) {
                const value = getValueAtPath(data, keyPath);
                const jmesPath = keyPathToJMESPath(keyPath);
                setSelection({keyPath, value, jmesPath});
            }

            onSelect?.(keyPath);
        },
        [data, onSelect, showCopyButton],
    );

    // Clear selection when data changes
    useEffect(() => {
        setSelection(null);
    }, [data]);

    // Keyboard shortcut handler for Ctrl+C / Cmd+C
    useEffect(() => {
        if (!showCopyButton || !selection) {
            return undefined;
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            const isCopyShortcut =
                (event.ctrlKey || event.metaKey) && event.key === "c" && !event.shiftKey;

            if (isCopyShortcut) {
                // Don't prevent default - allow normal copy if text is selected
                // But also copy our value
                const textToCopy = formatValueForClipboard(selection.value);
                void navigator.clipboard.writeText(textToCopy).then(() => {
                    setKeyboardCopyFeedback(true);
                    setTimeout(() => {
                        setKeyboardCopyFeedback(false);
                    }, 1500);
                });
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener("keydown", handleKeyDown);

            return () => {
                container.removeEventListener("keydown", handleKeyDown);
            };
        }

        return undefined;
    }, [showCopyButton, selection]);

    return (
        <Box
            ref={containerRef}
            tabIndex={0}
            role="grid"
            aria-label="JSON data viewer"
            style={{outline: "none"}}
        >
            {/* Sticky copy button container - placed before JSONGrid for proper sticky behavior */}
            {showCopyButton && selection && (
                <Box
                    style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                        display: "flex",
                        justifyContent: "flex-end",
                        pointerEvents: "none",
                        height: 0,
                        overflow: "visible",
                    }}
                >
                    <Tooltip
                        label="Copied!"
                        opened={keyboardCopyFeedback}
                        position="left"
                        withArrow
                        color="green"
                    >
                        <Box
                            style={{
                                pointerEvents: "auto",
                                backgroundColor: "var(--mantine-color-dark-7)",
                                borderRadius: "4px",
                                padding: "2px",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
                                marginTop: 4,
                                marginRight: 4,
                            }}
                        >
                            <CopyButton value={selection.value} path={selection.jmesPath} />
                        </Box>
                    </Tooltip>
                </Box>
            )}
            <JSONGrid
                data={data}
                defaultExpandDepth={defaultExpandDepth}
                searchText={searchText}
                onSelect={handleSelect}
                highlightSelected={true}
                customTheme={theme}
            />
        </Box>
    );
});
