import type { Meta, StoryObj } from "@storybook/react";

import { FeedbackModal } from "../components/FeedbackModal";

const meta: Meta<typeof FeedbackModal> = {
    title: "Components/Sentry",
    // The old title's component id, so every story id (and its approved image) stays the same.
    id: "sentry",
    tags: ["internal", "!dev", "!autodocs"],
    component: FeedbackModal,
    parameters: {
        layout: "fullscreen",
    },
    argTypes: {
        opened: { control: "boolean" },
        onClose: { action: "onClose" },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FeedbackModalStory: Story = {
    name: "Feedback Modal",
    args: {
        opened: true,
    },
};
