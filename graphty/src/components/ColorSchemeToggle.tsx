import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { Moon, Sun } from "lucide-react";
import React from "react";

/**
 * A toggle button to switch between light and dark color schemes.
 * Uses Mantine's useMantineColorScheme hook for color scheme management.
 * @returns A toggle button component for switching color schemes
 */
export function ColorSchemeToggle(): React.JSX.Element {
    const { colorScheme, toggleColorScheme } = useMantineColorScheme();

    return (
        <ActionIcon
            variant="subtle"
            size="md"
            onClick={() => {
                toggleColorScheme();
            }}
            aria-label={`Switch to ${colorScheme === "dark" ? "light" : "dark"} mode`}
        >
            {colorScheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </ActionIcon>
    );
}
