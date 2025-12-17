import {Box, Button, Stack, Text, Title} from "@mantine/core";
import * as Sentry from "@sentry/react";
import {AlertTriangle, RefreshCw} from "lucide-react";
import React from "react";

export interface FallbackProps {
    error: unknown;
    resetError: () => void;
}

export function ErrorFallback({resetError}: FallbackProps): React.JSX.Element {
    return (
        <Box
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                backgroundColor: "var(--mantine-color-dark-8)",
            }}
        >
            <Stack align="center" gap="lg">
                <AlertTriangle size={48} color="var(--mantine-color-red-5)" />
                <Title order={2} c="gray.1">
                    Something went wrong
                </Title>
                <Text c="gray.4" size="sm" maw={400} ta="center">
                    An unexpected error occurred. The error has been reported.
                </Text>
                <Button leftSection={<RefreshCw size={16} />} onClick={resetError}>
                    Try again
                </Button>
            </Stack>
        </Box>
    );
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

function ErrorBoundaryContent({children}: ErrorBoundaryProps): React.JSX.Element {
    return <>{children}</>;
}

export const ErrorBoundary = Sentry.withErrorBoundary(ErrorBoundaryContent, {
    fallback: (props) => <ErrorFallback {...props} />,
});
