import { Text } from "@mantine/core";
import type React from "react";

/**
 * The one gray line that holds a later package's place in the Frame, so the frame renders whole
 * before that package lands. The package replaces the file that renders it.
 * @param props - Component props
 * @param props.children - What goes here
 * @returns The line
 */
export function Stub({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
    return (
        <Text size="xs" c="dimmed" p="xs" data-stub="">
            {children}
        </Text>
    );
}
