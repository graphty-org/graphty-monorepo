import { Button, Stack, Text } from "@mantine/core";
import * as Sentry from "@sentry/react";
import React from "react";

/**
 * Keeps one panel's failure inside that panel: the rest of the workspace stays usable, the panel
 * says "This panel could not be shown", and Reload panel draws it again. The error still reaches
 * Sentry, so a defect behind it is reported rather than hidden.
 * @param props - Component props
 * @param props.name - the panel's name, for the fallback's accessible name
 * @param props.children - the panel
 * @returns The panel, or its fallback
 */
export function PanelBoundary({
    name,
    children,
}: Readonly<{ name: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <Sentry.ErrorBoundary
            fallback={(props) => (
                <Stack gap={8} p="md" role="alert" aria-label={`${name} failed`}>
                    <Text size="sm">This panel could not be shown</Text>
                    <Button
                        size="xs"
                        variant="default"
                        onClick={() => {
                            props.resetError();
                        }}
                        style={{ alignSelf: "flex-start" }}
                    >
                        Reload panel
                    </Button>
                </Stack>
            )}
        >
            {children}
        </Sentry.ErrorBoundary>
    );
}
