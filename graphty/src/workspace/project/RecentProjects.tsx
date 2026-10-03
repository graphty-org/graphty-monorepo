import { Text } from "@mantine/core";
import type React from "react";

/**
 * The start screen's Recent projects list (tier1-design.md section 2.11): each project's name,
 * size and time; Locate... for a file the browser can no longer read.
 *
 * A stub until the Project package replaces this file: the list's empty line, which is what a
 * first launch shows.
 * @returns The list
 */
export function RecentProjects(): React.JSX.Element {
    return (
        <Text size="xs" c="dimmed">
            Projects you open or create appear here. They are kept in this browser.
        </Text>
    );
}
