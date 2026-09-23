// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
// A stand-in element must never be registered under the tag: whichever story file loads first
// would own it, and the real element would then find its name taken.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";

import { Graphty } from "../components/Graphty";

const meta: Meta<typeof Graphty> = {
    title: "Components/Graphty",
    component: Graphty,
    parameters: {
        layout: "centered",
    },
    args: {
        // Provide default empty layers array to prevent "e is not iterable" error
        layers: [],
    },
    decorators: [
        (Story) => (
            <div style={{ width: "800px", height: "600px" }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: "400px", height: "300px" }}>
                <Story />
            </div>
        ),
    ],
};

export const Large: Story = {
    decorators: [
        (Story) => (
            <div style={{ width: "1200px", height: "800px" }}>
                <Story />
            </div>
        ),
    ],
};
