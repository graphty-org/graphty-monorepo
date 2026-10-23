import { Button, Stack, Text } from "@mantine/core";
import * as Sentry from "@sentry/react";
import React from "react";

/**
 * The panel's fallback: says it could not be shown, with Reload panel to draw it again.
 * @param props - Component props
 * @param props.name - the panel's name, for the fallback's accessible name
 * @param props.resetError - draws the panel again
 * @returns The fallback
 */
function PanelFallback({ name, resetError }: Readonly<{ name: string; resetError: () => void }>): React.JSX.Element {
    return (
        <Stack gap={8} p="md" role="alert" aria-label={`${name} failed`}>
            <Text size="sm">This panel could not be shown</Text>
            <Button
                size="xs"
                variant="default"
                onClick={() => {
                    resetError();
                }}
                style={{ alignSelf: "flex-start" }}
            >
                Reload panel
            </Button>
        </Stack>
    );
}

/**
 * The error boundary's fallback for one panel.
 * @param name - the panel's name
 * @returns A function that draws the fallback with the boundary's reset
 */
function fallbackFor(name: string): (props: { resetError: () => void }) => React.JSX.Element {
    return ({ resetError }) => <PanelFallback name={name} resetError={resetError} />;
}

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
    return <Sentry.ErrorBoundary fallback={fallbackFor(name)}>{children}</Sentry.ErrorBoundary>;
}
