import {Alert, Button, Stack, Text, Title} from "@mantine/core";
import type {Meta, StoryObj} from "@storybook/react";
import {useState} from "react";

import {ErrorBoundary} from "../components/ErrorBoundary";
import {ErrorFallback} from "../components/ErrorFallback";
import {isSentryEnabled, testCaptureError} from "../lib/sentry";

const meta: Meta<typeof ErrorFallback> = {
    title: "Sentry",
    component: ErrorFallback,
    parameters: {
        layout: "fullscreen",
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

function TriggerErrorContent(): React.JSX.Element {
    const [shouldError, setShouldError] = useState(false);
    if (shouldError) {
        throw new Error("Triggered error");
    }

    return (
        <div style={{padding: "20px"}}>
            <Button onClick={() => {
                setShouldError(true);
            }}>
                Click to Trigger Render Error
            </Button>
        </div>
    );
}

export const TriggerError: Story = {
    render: () => (
        <ErrorBoundary>
            <TriggerErrorContent />
        </ErrorBoundary>
    ),
};

export function SourceMapTestContent(): React.JSX.Element {
    const sentryConfigured = isSentryEnabled();

    return (
        <Stack p="md">
            <Title order={2}>Source Map Verification Test</Title>
            {!sentryConfigured && (
                <Alert color="yellow" title="Sentry Not Configured">
                    <Text>Set VITE_SENTRY_DSN environment variable to enable Sentry.</Text>
                </Alert>
            )}
            <Button
                disabled={!sentryConfigured}
                onClick={() => {
                    testCaptureError();
                }}
            >
                Send Test Error to Sentry
            </Button>
        </Stack>
    );
}

export const SourceMapTest: Story = {
    render: () => <SourceMapTestContent />,
};
