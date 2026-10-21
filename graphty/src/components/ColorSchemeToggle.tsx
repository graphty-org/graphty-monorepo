import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { Moon, Sun } from "lucide-react";
import React from "react";

/**
 * A toggle button to switch between light and dark color schemes.
 * Reads the scheme in force (an "auto" setting resolves to the system's), so the icon and the
 * label name the scheme a press switches to.
 * @returns A toggle button component for switching color schemes
 */
export function ColorSchemeToggle(): React.JSX.Element {
    const { toggleColorScheme } = useMantineColorScheme();
    const scheme = useComputedColorScheme("dark");

    return (
        <ActionIcon
            variant="subtle"
            size="md"
            onClick={() => {
                toggleColorScheme();
            }}
            aria-label={`Switch to ${scheme === "dark" ? "light" : "dark"} mode`}
        >
            {scheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </ActionIcon>
    );
}
