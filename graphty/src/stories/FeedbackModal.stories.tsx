import type {Meta, StoryObj} from "@storybook/react";

import {FeedbackModal} from "../components/FeedbackModal";

const meta: Meta<typeof FeedbackModal> = {
    title: "Sentry",
    component: FeedbackModal,
    parameters: {
        layout: "fullscreen",
    },
    argTypes: {
        opened: {control: "boolean"},
        onClose: {action: "onClose"},
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
