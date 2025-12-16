import {Button} from "@mantine/core";
import type {Meta, StoryObj} from "@storybook/react";
import {useState} from "react";

import {ErrorBoundary, ErrorFallback} from "../components/ErrorBoundary";

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
    name: "Trigger Error",
    render: () => (
        <ErrorBoundary>
            <TriggerErrorContent />
        </ErrorBoundary>
    ),
};
