import { Box } from "@mantine/core";
import type { JSX } from "react";

import type { PopoutContentProps } from "../../types/popout";

/**
 * Container for popout panel content.
 * Provides consistent padding and styling for panel content.
 * @param props - Component props
 * @param props.children - Content to display in the panel
 * @returns The PopoutContent component
 */
export function PopoutContent({ children }: PopoutContentProps): JSX.Element {
    return <Box p="sm">{children}</Box>;
}
