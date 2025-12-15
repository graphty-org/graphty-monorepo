import {useMantineColorScheme} from "@mantine/core";
import JSONGrid, {type keyPathNode} from "@redheadphone/react-json-grid";
import {useEffect, useState} from "react";

import {mantineJsonGridDarkTheme, mantineJsonGridLightTheme} from "./mantineTheme";

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
}

/**
 * DataGrid wraps @redheadphone/react-json-grid with Mantine-themed styling.
 * It provides a table-based view of JSON data with expand/collapse, search, and selection.
 * Automatically adapts to the current Mantine color scheme (light/dark).
 */
export function DataGrid({
    data,
    defaultExpandDepth = 0,
    searchText,
    onSelect,
}: DataGridProps): React.JSX.Element {
    const colorScheme = useActualColorScheme("dark");
    const theme = colorScheme === "light" ? mantineJsonGridLightTheme : mantineJsonGridDarkTheme;

    return (
        <JSONGrid
            data={data}
            defaultExpandDepth={defaultExpandDepth}
            searchText={searchText}
            onSelect={onSelect}
            highlightSelected={true}
            customTheme={theme}
        />
    );
}
